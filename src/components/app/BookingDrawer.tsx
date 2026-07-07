import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Search,
  Plus,
  Wrench,
  Upload,
  User,
  Smartphone,
  Users,
  DollarSign,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { useSettings } from "@/context/SettingsContext";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { PKR, fmtDate, fmtTime } from "@/lib/format";
import { nextStatus, nextStatusLabel, type BookingStatus } from "@/lib/status";
import {
  HOURS_OF_DAY,
  type Booking,
  type Customer,
  type CustomerType,
  type PaymentMethod,
  type Payment,
} from "@/data/seed";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId?: string | null;
  prefill?: { courtId?: string; date?: string; startTime?: string };
};

// Wizard Steps:
// 1: Customer Search & Info
// 2: Booking Details (Date, Start Time, Duration)
// 3: Players Section
// 4: Pricing Breakdown
// 5: Payment Method
// 6: Review & Finalize
const STEPS = [
  { number: 1, name: "Customer" },
  { number: 2, name: "Details" },
  { number: 3, name: "Players" },
  { number: 4, name: "Pricing" },
  { number: 5, name: "Payment" },
  { number: 6, name: "Review" },
];

export function BookingDrawer({ open, onClose, bookingId, prefill }: Props): React.ReactNode {
  const { state, dispatch } = useClub();
  const { settings } = useSettings();

  const existing = useMemo(
    () => (bookingId ? (state.bookings.find((b) => b.id === bookingId) ?? null) : null),
    [state.bookings, bookingId],
  );

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Customer search & selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    customerType: "Resident" as CustomerType,
    notes: "",
  });

  // Booking details state
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number>(1.0); // Minimum 1 hour

  // Players state
  const [totalPlayers, setTotalPlayers] = useState<number>(4);
  const [residents, setResidents] = useState<number>(4);
  const [outsiders, setOutsiders] = useState<number>(0);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [transactionId, setTransactionId] = useState("");

  // Initialize fields on open/existing load
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setSelectedCustomerId(existing.customerId);
      setDate(existing.date);
      setStartTime(existing.startTime);
      setDurationHours(existing.durationHours);
      setTotalPlayers(existing.totalPlayers);
      setResidents(existing.residents);
      setOutsiders(existing.outsiders);

      const payment = state.payments.find((p) => p.bookingId === existing.id);
      if (payment) {
        setPaymentMethod(payment.method);
        setTransactionId(payment.transactionId);
      }

      // Default existing bookings to step 6 (Review / Actions)
      setCurrentStep(6);
    } else {
      setSelectedCustomerId("");
      setSearchQuery("");
      setDate(prefill?.date ?? new Date().toISOString().slice(0, 10));
      setStartTime(prefill?.startTime ?? "18:00");
      setDurationHours(1.0);
      setTotalPlayers(4);
      setResidents(4);
      setOutsiders(0);
      setPaymentMethod("Cash");
      setTransactionId("");

      // New bookings start at step 1
      setCurrentStep(1);
    }
    setShowAddCustomerForm(false);
  }, [existing, prefill, open]);

  // Selected customer object
  const customer = useMemo(() => {
    return state.customers.find((c) => c.id === selectedCustomerId) || null;
  }, [state.customers, selectedCustomerId]);

  // Handle searching customers
  const matchingCustomers = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return state.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [state.customers, searchQuery]);

  // Validate players constraint: residents + outsiders === totalPlayers
  const isPlayersCountValid = useMemo(() => {
    return residents + outsiders === totalPlayers;
  }, [residents, outsiders, totalPlayers]);

  // Auto-calculate end time based on duration
  const endTime = useMemo(() => {
    if (!startTime) return "08:00";
    const startMins = timeToMins(startTime);
    const endMins = startMins + durationHours * 60;
    return minsToTime(endMins);
  }, [startTime, durationHours]);

  // Auto-calculate costs
  const pricingBreakdown = useMemo(() => {
    const resRate = settings.residentRate;
    const outRate = settings.outsiderRate;
    const residentTotal = residents * resRate * durationHours;
    const outsiderTotal = outsiders * outRate * durationHours;
    const grandTotal = residentTotal + outsiderTotal;
    return {
      residentTotal,
      outsiderTotal,
      grandTotal,
      resRate,
      outRate,
    };
  }, [residents, outsiders, durationHours, settings.residentRate, settings.outsiderRate]);

  // Overlap verification with other bookings
  const isOverlapping = useMemo(() => {
    return state.bookings.some((b) => {
      if (b.status === "cancelled") return false;
      if (existing && b.id === existing.id) return false;
      if (b.date !== date) return false;

      // time overlaps
      const startA = timeToMins(startTime);
      const endA = startA + durationHours * 60;
      const startB = timeToMins(b.startTime);
      const endB = timeToMins(b.endTime);
      return startA < endB && endA > startB;
    });
  }, [state.bookings, existing, date, startTime, durationHours]);

  // Overlap verification with maintenance slots
  const isInMaintenance = useMemo(() => {
    return state.maintenanceSlots.some((m) => {
      if (m.date !== date) return false;

      const startA = timeToMins(startTime);
      const endA = startA + durationHours * 60;
      const startB = timeToMins(m.startTime);
      const endB = timeToMins(m.endTime);
      return startA < endB && endA > startB;
    });
  }, [state.maintenanceSlots, date, startTime, durationHours]);

  const save = () => {
    if (!customer) return;
    if (isOverlapping) {
      alert("This time block overlaps with an existing booking. Please select a different time.");
      return;
    }
    if (isInMaintenance) {
      alert("Main Court is scheduled for maintenance during this block.");
      return;
    }
    if (!isPlayersCountValid) {
      alert("Resident players + Outsider players must equal Total Players.");
      return;
    }

    if (existing) {
      dispatch({
        type: "update_booking",
        booking: {
          ...existing,
          customerId: customer.id,
          date,
          startTime,
          endTime,
          residents,
          outsiders,
          totalPlayers,
          durationHours,
          amount: pricingBreakdown.grandTotal,
        },
      });
    } else {
      const bId = `B-${Math.floor(20000 + Math.random() * 9999)}`;
      const booking: Booking = {
        id: bId,
        customerId: customer.id,
        courtId: "C-01",
        date,
        startTime,
        endTime,
        residents,
        outsiders,
        totalPlayers,
        durationHours,
        amount: pricingBreakdown.grandTotal,
        status: "reserved",
        createdISO: new Date().toISOString(),
      };

      dispatch({ type: "create_booking", booking });

      // Create initial payment if submitted
      if (paymentMethod !== "Cash" || transactionId) {
        const paymentId = `P-${Date.now()}`;
        const payment: Payment = {
          id: paymentId,
          bookingId: bId,
          method: paymentMethod,
          amount: pricingBreakdown.grandTotal,
          transactionId: transactionId || `TXN-${Date.now()}`,
          screenshotColor: "#274060",
          submittedISO: new Date().toISOString(),
          status: "pending",
        };
        dispatch({ type: "create_payment", payment });
        dispatch({
          type: "create_booking",
          booking: { ...booking, status: "payment_submitted", paymentId },
        });
      }
    }
    onClose();
  };

  const addCustomerInline = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    const newCustObj: Customer = {
      id: `U-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email || `${newCustomer.name.toLowerCase().replace(/\s/g, ".")}@mail.pk`,
      customerType: newCustomer.customerType,
      totalBookings: 0,
      totalSpend: 0,
      notes: newCustomer.notes || undefined,
      joinedISO: new Date().toISOString(),
    };
    dispatch({ type: "create_customer", customer: newCustObj });
    setSelectedCustomerId(newCustObj.id);
    setShowAddCustomerForm(false);
    setNewCustomer({ name: "", phone: "", email: "", customerType: "Resident", notes: "" });
  };

  const advance = () => {
    if (!existing) return;
    const next = nextStatus(existing.status);
    if (next) dispatch({ type: "set_booking_status", id: existing.id, status: next });
  };

  // Helper lists for durations (1h to 8h in 30min steps)
  const durationOptions = useMemo(() => {
    const list: { label: string; value: number }[] = [];
    for (let h = 1.0; h <= 8.0; h += 0.5) {
      const hours = Math.floor(h);
      const mins = (h - hours) * 60;
      const label = mins > 0 ? `${hours} Hr 30 Min` : `${hours} Hr${hours > 1 ? "s" : ""}`;
      list.push({ label, value: h });
    }
    return list;
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-2xl border-l border-line-soft"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line-soft px-6 py-4 bg-canvas/30">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-clay">
                  {existing ? "Manage Booking" : "New Reservation"}
                </span>
                <h2 className="text-lg font-display font-semibold text-ink mt-0.5 flex items-center gap-2">
                  <span>{existing?.id ?? "Reservation Wizard"}</span>
                  {existing && <StatusBadge status={existing.status} />}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-md border border-line bg-card text-ink-mute hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper Timeline - Hidden if editing/existing */}
            {!existing && (
              <div className="border-b border-line-soft bg-canvas/10 px-6 py-3 flex items-center justify-between">
                {STEPS.map((s, idx) => (
                  <div key={s.number} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => {
                        // Allow hopping to any completed steps
                        if (
                          s.number < currentStep ||
                          (s.number > currentStep && selectedCustomerId)
                        ) {
                          setCurrentStep(s.number);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors",
                        currentStep === s.number
                          ? "bg-ink text-white"
                          : s.number < currentStep
                            ? "text-status-completed-fg hover:bg-secondary"
                            : "text-ink-mute hover:bg-secondary",
                      )}
                    >
                      <span className="font-mono text-[10px] opacity-75">{s.number}</span>
                      <span className="hidden sm:inline">{s.name}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 mx-auto text-ink-mute/50" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* STEP 1: Customer Lookup */}
              {currentStep === 1 && !existing && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-1.5">Customer Search</h3>
                    <p className="text-xs text-ink-mute mb-3">
                      Search using customer name or WhatsApp phone number.
                    </p>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-mute" />
                      <input
                        type="text"
                        placeholder="Type name or WhatsApp phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-full rounded-md border border-line bg-card pl-9 pr-3 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Matching results */}
                  {searchQuery && (
                    <div className="max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line-soft bg-card shadow-inner">
                      {matchingCustomers.length > 0 ? (
                        matchingCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setSearchQuery("");
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-ink">{c.name}</div>
                              <div className="text-[11px] text-ink-mute">{c.phone}</div>
                            </div>
                            <span className="text-xs bg-clay-soft text-clay px-2 py-0.5 rounded-full font-medium">
                              {c.customerType}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-ink-mute mb-2">No customer found.</p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAddCustomerForm(true)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Create New Customer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Customer details */}
                  {customer ? (
                    <div className="rounded-xl border border-clay/20 bg-clay-soft/10 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} size={40} />
                          <div>
                            <h4 className="font-display font-semibold text-base text-ink">
                              {customer.name}
                            </h4>
                            <div className="text-xs text-ink-mute flex items-center gap-1.5">
                              <Smartphone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                        <span className="rounded-full bg-clay text-white px-2.5 py-0.5 text-xs font-semibold">
                          {customer.customerType}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line-soft grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-ink-mute block">Previous Bookings</span>
                          <span className="font-semibold text-sm text-ink tabular">
                            {customer.totalBookings}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-mute block">Total Spend</span>
                          <span className="font-semibold text-sm text-ink font-mono">
                            {PKR(customer.totalSpend)}
                          </span>
                        </div>
                        {customer.notes && (
                          <div className="col-span-2 mt-1 bg-card rounded p-2 text-ink-soft text-[11px]">
                            <strong>Notes: </strong>
                            {customer.notes}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setSelectedCustomerId("")}
                          className="text-xs text-destructive hover:underline"
                        >
                          Clear selection
                        </button>
                      </div>
                    </div>
                  ) : (
                    !showAddCustomerForm && (
                      <div className="border border-dashed border-line rounded-lg p-6 text-center text-ink-mute text-xs">
                        No customer selected. Search for an existing customer or click below.
                        <div className="mt-3">
                          <Button variant="secondary" onClick={() => setShowAddCustomerForm(true)}>
                            <Plus className="h-3.5 w-3.5" /> Add New Customer
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Add Customer Form */}
                  {showAddCustomerForm && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-line rounded-lg bg-canvas p-4 space-y-3"
                    >
                      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                        New Customer Registration
                      </h4>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Usman Malik"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. +92 321 4567890"
                          value={newCustomer.phone}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, phone: e.target.value })
                          }
                          className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. usman@mail.pk"
                          value={newCustomer.email}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, email: e.target.value })
                          }
                          className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Customer Category
                        </label>
                        <select
                          value={newCustomer.customerType}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              customerType: e.target.value as CustomerType,
                            })
                          }
                          className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                        >
                          <option value="Resident">Resident (Rs {settings.residentRate}/hr)</option>
                          <option value="Outsider">Outsider (Rs {settings.outsiderRate}/hr)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Notes
                        </label>
                        <textarea
                          placeholder="Preferences, racquet requirements, etc."
                          value={newCustomer.notes}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, notes: e.target.value })
                          }
                          className="h-16 w-full rounded border border-line bg-card px-2 py-1 text-sm text-ink focus:border-clay focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setShowAddCustomerForm(false);
                            setNewCustomer({
                              name: "",
                              phone: "",
                              email: "",
                              customerType: "Resident",
                              notes: "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="clay"
                          size="sm"
                          className="flex-1"
                          onClick={addCustomerInline}
                          disabled={!newCustomer.name || !newCustomer.phone}
                        >
                          Save Customer
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* STEP 2: Booking Details */}
              {(currentStep === 2 || existing) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-clay" />
                    <span>Booking Schedule</span>
                  </h3>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                        Start Time
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-10 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      >
                        {HOURS_OF_DAY.slice(0, -1).map((h) => (
                          <option key={h} value={h}>
                            {fmtTime(h)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                        Duration
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                        className="h-10 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      >
                        {durationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-canvas p-3 rounded-lg flex items-center justify-between text-xs border border-line-soft">
                    <span className="text-ink-mute">Calculated Slot:</span>
                    <span className="font-semibold text-ink font-mono">
                      {startTime} → {endTime} ({durationHours} Hrs)
                    </span>
                  </div>

                  {isOverlapping && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span>Overlap Alert: Main Court is occupied at this time.</span>
                    </div>
                  )}

                  {isInMaintenance && (
                    <div className="flex items-center gap-2 rounded-md border border-status-cancelled-fg/20 bg-status-cancelled/10 p-3 text-xs text-status-cancelled-fg">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span>Maintenance Alert: Court offline at this time.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Players Section */}
              {(currentStep === 3 || existing) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <Users className="h-4 w-4 text-clay" />
                    <span>Players Details</span>
                  </h3>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                      Total Players
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={totalPlayers}
                      onChange={(e) => setTotalPlayers(parseInt(e.target.value) || 0)}
                      className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                        Residents
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={totalPlayers}
                        value={residents}
                        onChange={(e) => setResidents(parseInt(e.target.value) || 0)}
                        className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                        Outsiders
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={totalPlayers}
                        value={outsiders}
                        onChange={(e) => setOutsiders(parseInt(e.target.value) || 0)}
                        className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </div>
                  </div>

                  {!isPlayersCountValid && (
                    <div className="rounded-md border border-status-cancelled-fg/20 bg-status-cancelled/10 p-3 text-xs text-status-cancelled-fg font-medium">
                      Validation Error: Residents ({residents}) + Outsiders ({outsiders}) must sum
                      to Total Players ({totalPlayers}).
                    </div>
                  )}

                  {isPlayersCountValid && (
                    <div className="rounded-md bg-status-available/20 text-status-available-fg p-3 text-xs flex items-center gap-1.5">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>Ratios sum correctly to {totalPlayers} players.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Pricing Breakdown */}
              {(currentStep === 4 || existing) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-clay" />
                    <span>Price Calculation</span>
                  </h3>

                  <div className="rounded-xl border border-line-soft bg-canvas p-4 space-y-3.5">
                    <div className="flex justify-between items-center text-xs border-b border-line-soft pb-2">
                      <span className="text-ink-mute">Hourly Rates</span>
                      <span className="font-semibold text-ink">
                        Res: Rs {pricingBreakdown.resRate} · Out: Rs {pricingBreakdown.outRate}
                      </span>
                    </div>

                    {residents > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-semibold text-ink">Residents Cost</span>
                          <span className="text-[10px] text-ink-mute block">
                            {residents} Player(s) × Rs {pricingBreakdown.resRate} × {durationHours}{" "}
                            Hr
                          </span>
                        </div>
                        <span className="font-mono text-sm text-ink font-semibold">
                          Rs {pricingBreakdown.residentTotal.toLocaleString("en-PK")}
                        </span>
                      </div>
                    )}

                    {outsiders > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-semibold text-ink">Outsiders Cost</span>
                          <span className="text-[10px] text-ink-mute block">
                            {outsiders} Player(s) × Rs {pricingBreakdown.outRate} × {durationHours}{" "}
                            Hr
                          </span>
                        </div>
                        <span className="font-mono text-sm text-ink font-semibold">
                          Rs {pricingBreakdown.outsiderTotal.toLocaleString("en-PK")}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-line pt-3 flex justify-between items-center text-sm font-semibold bg-white/20 dark:bg-black/10 px-2 py-1.5 rounded">
                      <span className="text-ink uppercase tracking-wider text-xs">Grand Total</span>
                      <span className="font-mono text-base text-clay font-bold">
                        Rs {pricingBreakdown.grandTotal.toLocaleString("en-PK")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Payment details */}
              {(currentStep === 5 || existing) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink mb-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-clay" />
                    <span>Wallet & Transaction</span>
                  </h3>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="h-10 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  {(paymentMethod === "JazzCash" ||
                    paymentMethod === "EasyPaisa" ||
                    paymentMethod === "Bank Transfer") && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Transaction ID *
                        </label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. TXN-10826372"
                          className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                          Submit Screenshot
                        </label>
                        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-line-soft bg-canvas/30 p-6 cursor-pointer hover:bg-secondary/40 transition-colors">
                          <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-ink-mute" />
                            <div className="mt-2 text-xs text-ink-mute">
                              Drop transaction screenshot here
                            </div>
                            <div className="mt-1 text-[10px] text-ink-mute">PNG, JPG up to 5MB</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Review & Finalize */}
              {(currentStep === 6 || existing) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink mb-1.5">Review Summary</h3>

                  {customer ? (
                    <div className="rounded-xl border border-line-soft bg-canvas p-4 space-y-3.5 text-xs text-ink shadow-sm">
                      <Row
                        k="Main Court Reservation"
                        v={<span className="font-semibold">{existing?.id || "Draft"}</span>}
                      />
                      <Row k="Customer" v={customer.name} />
                      <Row k="WhatsApp" v={customer.phone} />
                      <Row k="Customer Category" v={customer.customerType} />
                      <Row k="Date" v={fmtDate(date)} />
                      <Row k="Time Slot" v={`${startTime} - ${endTime}`} />
                      <Row k="Duration" v={`${durationHours} Hr(s)`} />
                      <Row k="Residents" v={residents} />
                      <Row k="Outsiders" v={outsiders} />
                      <Row k="Total Players" v={totalPlayers} />
                      <Row k="Payment Method" v={paymentMethod} />
                      {transactionId && (
                        <Row
                          k="Transaction ID"
                          v={<span className="font-mono">{transactionId}</span>}
                        />
                      )}
                      <div className="border-t border-line-soft pt-3 flex justify-between text-sm font-semibold">
                        <span className="text-clay uppercase">Total Cost</span>
                        <span className="font-mono text-clay">
                          Rs {pricingBreakdown.grandTotal.toLocaleString("en-PK")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-destructive bg-destructive/10 p-3 rounded">
                      Please select a customer before reviewing.
                    </div>
                  )}

                  {/* Operational details if existing booking is loaded */}
                  {existing && (
                    <div className="pt-4 border-t border-line-soft space-y-3">
                      <div className="text-xs uppercase tracking-wider text-ink-mute font-semibold">
                        Administrative Actions
                      </div>
                      <div className="flex gap-2">
                        {existing.status === "reserved" && (
                          <button
                            onClick={() => {
                              dispatch({
                                type: "set_booking_status",
                                id: existing.id,
                                status: "payment_submitted",
                              });
                              onClose();
                            }}
                            className="flex-1 h-9 rounded bg-clay text-xs font-semibold text-white hover:bg-clay/90 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        {nextStatusLabel(existing.status) && existing.status !== "reserved" && (
                          <button
                            onClick={() => {
                              advance();
                              onClose();
                            }}
                            className="flex-1 h-9 rounded bg-ink text-xs font-semibold text-white hover:bg-ink/90 transition-colors"
                          >
                            {nextStatusLabel(existing.status)}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            dispatch({
                              type: "set_booking_status",
                              id: existing.id,
                              status: "cancelled",
                            });
                            onClose();
                          }}
                          className="flex-1 h-9 rounded border border-status-cancelled-fg/40 text-status-cancelled-fg text-xs font-semibold hover:bg-status-cancelled/15 transition-colors"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Pricing Summary Sticky Panel */}
            <div className="border-t border-line-soft bg-canvas px-6 py-4 flex items-center justify-between shadow-inner">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-ink-mute block">
                  Main Court Reservation
                </span>
                <span className="text-sm font-semibold text-ink block truncate">
                  {date} · {startTime} ({durationHours} Hrs)
                </span>
                <span className="text-xs font-bold text-clay font-mono block mt-0.5">
                  Rs {pricingBreakdown.grandTotal.toLocaleString("en-PK")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentStep > 1 && !existing && (
                  <button
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-card px-3 text-xs text-ink hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                )}

                {currentStep < 6 && !existing ? (
                  <button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    disabled={
                      !selectedCustomerId ||
                      (currentStep === 3 && !isPlayersCountValid) ||
                      isOverlapping ||
                      isInMaintenance
                    }
                    className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-ink px-4 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={save}
                    disabled={
                      !selectedCustomerId ||
                      !isPlayersCountValid ||
                      isOverlapping ||
                      isInMaintenance
                    }
                    className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-clay px-5 text-xs font-semibold text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
                  >
                    {existing ? "Save Changes" : "Confirm Booking"}
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-line-soft last:border-b-0">
      <span className="text-ink-mute">{k}</span>
      <span className="text-ink font-semibold">{v}</span>
    </div>
  );
}
