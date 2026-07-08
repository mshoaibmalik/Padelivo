import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Search,
  Plus,
  Wrench,
  Upload,
  Smartphone,
  Users,
  DollarSign,
  CreditCard,
  Check,
  FileText,
  AlertCircle,
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
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId?: string | null;
  prefill?: { courtId?: string; date?: string; startTime?: string };
};

export function BookingDrawer({ open, onClose, bookingId, prefill }: Props): React.ReactNode {
  const { state, dispatch } = useClub();
  const { settings } = useSettings();

  const existing = useMemo(
    () => (bookingId ? (state.bookings.find((b) => b.id === bookingId) ?? null) : null),
    [state.bookings, bookingId],
  );

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
  const [durationHours, setDurationHours] = useState<number>(1.0);

  // Players state
  const [totalPlayers, setTotalPlayers] = useState<number>(4);
  const [residents, setResidents] = useState<number>(4);
  const [outsiders, setOutsiders] = useState<number>(0);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [transactionId, setTransactionId] = useState("");

  // Notes state
  const [notes, setNotes] = useState<string>("");

  // Draft tracking
  const [draftId, setDraftId] = useState<string | null>(null);

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
      setNotes(existing.notes || "");

      const payment = state.payments.find((p) => p.bookingId === existing.id);
      if (payment) {
        setPaymentMethod(payment.method);
        setTransactionId(payment.transactionId);
      }
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
      setNotes("");
      setDraftId(null);
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

  // Validate players constraint
  const isPlayersCountValid = useMemo(() => {
    return residents + outsiders === totalPlayers;
  }, [residents, outsiders, totalPlayers]);

  // Auto-calculate end time
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

  // Check for overlaps
  const isOverlapping = useMemo(() => {
    return state.bookings.some((b) => {
      if (b.status === "cancelled") return false;
      if (existing && b.id === existing.id) return false;
      if (draftId && b.id === draftId) return false;
      if (b.date !== date) return false;

      const startA = timeToMins(startTime);
      const endA = startA + durationHours * 60;
      const startB = timeToMins(b.startTime);
      const endB = timeToMins(b.endTime);
      return startA < endB && endA > startB;
    });
  }, [state.bookings, existing, draftId, date, startTime, durationHours]);

  // Check for maintenance
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

  // Auto-save draft
  useEffect(() => {
    if (!selectedCustomerId || !date || !startTime || existing) return;

    const timer = setTimeout(() => {
      if (draftId) {
        // Update existing draft
        const draft = state.bookings.find((b) => b.id === draftId);
        if (draft) {
          dispatch({
            type: "update_booking",
            booking: {
              ...draft,
              customerId: selectedCustomerId,
              date,
              startTime,
              endTime,
              residents,
              outsiders,
              totalPlayers,
              durationHours,
              amount: pricingBreakdown.grandTotal,
              notes: notes || undefined,
            },
          });
        }
      } else {
        // Create new draft
        const newDraftId = `B-${Math.floor(20000 + Math.random() * 9999)}`;
        const booking: Booking = {
          id: newDraftId,
          customerId: selectedCustomerId,
          courtId: "C-01",
          date,
          startTime,
          endTime,
          residents,
          outsiders,
          totalPlayers,
          durationHours,
          amount: pricingBreakdown.grandTotal,
          status: "draft",
          createdISO: new Date().toISOString(),
          notes: notes || undefined,
        };
        dispatch({ type: "create_booking", booking });
        setDraftId(newDraftId);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedCustomerId, date, startTime, durationHours, residents, outsiders, totalPlayers, notes]);

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
          notes: notes || undefined,
        },
      });
    } else {
      // Delete draft if exists and create final booking
      if (draftId) {
        const draft = state.bookings.find((b) => b.id === draftId);
        if (draft && draft.status === "draft") {
          dispatch({ type: "delete_booking", id: draftId });
        }
      }

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
        notes: notes || undefined,
      };

      dispatch({ type: "create_booking", booking });

      // Create payment if method is not cash
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
          type: "update_booking",
          booking: { ...booking, status: "payment_submitted", paymentId },
        });
      }
    }
    onClose();
  };

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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-6xl flex-col bg-card shadow-2xl border-l border-line-soft"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line-soft px-6 py-4 bg-canvas/30">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-clay">
                  {existing ? "Manage Booking" : "New Reservation"}
                </span>
                <h2 className="text-lg font-display font-semibold text-ink mt-0.5 flex items-center gap-2">
                  <span>{existing?.id ?? "Court Reservation"}</span>
                  {existing && <StatusBadge status={existing.status} />}
                  {draftId && !existing && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      Draft
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-md border border-line bg-card text-ink-mute hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Two-Column Layout */}
            <div className="flex-1 overflow-hidden flex gap-6">
              {/* Left Column: Form */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-6 max-w-2xl">
                  {/* Customer Section */}
                  <FormSection title="Customer Information" icon={<Users className="h-4 w-4" />}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-2">
                          Search Customer
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-mute" />
                          <input
                            type="text"
                            placeholder="Type name or WhatsApp phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-md border border-line bg-card pl-9 pr-3 text-sm text-ink focus:border-clay focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Search Results */}
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
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary flex items-center justify-between transition-colors"
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
                                <Plus className="h-3.5 w-3.5" /> Create New
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Customer */}
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

                          <div className="mt-3 pt-3 border-t border-line-soft grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-ink-mute block">Bookings</span>
                              <span className="font-semibold text-sm text-ink">
                                {customer.totalBookings}
                              </span>
                            </div>
                            <div>
                              <span className="text-ink-mute block">Total Spend</span>
                              <span className="font-semibold text-sm text-ink font-mono">
                                {PKR(customer.totalSpend)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => setSelectedCustomerId("")}
                              className="text-xs text-destructive hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : !showAddCustomerForm ? (
                        <div className="border border-dashed border-line rounded-lg p-4 text-center text-ink-mute text-xs">
                          Search or create a customer
                          <div className="mt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowAddCustomerForm(true)}
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Customer
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* Add Customer Form */}
                      {showAddCustomerForm && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-line rounded-lg bg-canvas p-4 space-y-3"
                        >
                          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                            New Customer
                          </h4>

                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                          />

                          <input
                            type="tel"
                            placeholder="WhatsApp Number"
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                          />

                          <input
                            type="email"
                            placeholder="Email (optional)"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            className="h-9 w-full rounded border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                          />

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

                          <textarea
                            placeholder="Notes"
                            value={newCustomer.notes}
                            onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                            className="h-16 w-full rounded border border-line bg-card px-2 py-1 text-sm text-ink focus:border-clay focus:outline-none resize-none"
                          />

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
                              Save
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </FormSection>

                  {/* Booking Details Section */}
                  <FormSection title="Booking Details" icon={<FileText className="h-4 w-4" />}>
                    <div className="space-y-4">
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
                        <span className="text-ink-mute">Slot:</span>
                        <span className="font-semibold text-ink font-mono">
                          {startTime} → {endTime} ({durationHours} Hrs)
                        </span>
                      </div>

                      {isOverlapping && (
                        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Time slot overlaps with another booking</span>
                        </div>
                      )}

                      {isInMaintenance && (
                        <div className="flex items-center gap-2 rounded-md border border-status-cancelled-fg/20 bg-status-cancelled/10 p-3 text-xs text-status-cancelled-fg">
                          <Wrench className="h-4 w-4 shrink-0" />
                          <span>Court is under maintenance during this time</span>
                        </div>
                      )}
                    </div>
                  </FormSection>

                  {/* Players Section */}
                  <FormSection title="Players" icon={<Users className="h-4 w-4" />}>
                    <div className="space-y-4">
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
                          Residents ({residents}) + Outsiders ({outsiders}) must equal {totalPlayers}
                        </div>
                      )}

                      {isPlayersCountValid && (
                        <div className="rounded-md bg-status-available/20 text-status-available-fg p-3 text-xs flex items-center gap-1.5">
                          <Check className="h-4 w-4 shrink-0" />
                          <span>Player count validated</span>
                        </div>
                      )}
                    </div>
                  </FormSection>

                  {/* Payment Section */}
                  <FormSection title="Payment" icon={<CreditCard className="h-4 w-4" />}>
                    <div className="space-y-4">
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
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-ink-mute block mb-1">
                            Transaction ID
                          </label>
                          <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g. TXN-10826372"
                            className="h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus:border-clay focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </FormSection>

                  {/* Notes Section */}
                  <FormSection title="Notes" icon={<FileText className="h-4 w-4" />}>
                    <textarea
                      placeholder="Add any special requests or notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-20 w-full rounded border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none resize-none"
                    />
                  </FormSection>

                  {/* Admin Actions for Existing */}
                  {existing && (
                    <FormSection title="Administrative Actions" icon={<Wrench className="h-4 w-4" />}>
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
                          Cancel
                        </button>
                      </div>
                    </FormSection>
                  )}
                </div>
              </div>

              {/* Right Column: Live Summary */}
              <div className="w-80 border-l border-line-soft bg-canvas/30 p-5 overflow-y-auto">
                <div className="sticky top-0 space-y-4">
                  <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">
                    Reservation Summary
                  </h3>

                  {customer && date && startTime ? (
                    <div className="space-y-4">
                      {/* Quick Info */}
                      <div className="bg-card rounded-lg border border-line-soft p-4 space-y-2 text-xs">
                        <Row k="Customer" v={customer.name} />
                        <Row k="Category" v={customer.customerType} />
                        <Row k="Date" v={fmtDate(date)} />
                        <Row k="Time" v={`${startTime} - ${endTime}`} />
                        <Row k="Duration" v={`${durationHours} Hr(s)`} />
                      </div>

                      {/* Players Breakdown */}
                      <div className="bg-card rounded-lg border border-line-soft p-4 space-y-2 text-xs">
                        <h4 className="font-semibold text-ink mb-2">Players</h4>
                        <Row k="Total" v={totalPlayers} />
                        <Row k="Residents" v={residents} />
                        <Row k="Outsiders" v={outsiders} />
                        {!isPlayersCountValid && (
                          <div className="text-destructive text-[11px] mt-2">
                            ⚠ Count mismatch
                          </div>
                        )}
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="bg-card rounded-lg border border-line-soft p-4 space-y-3 text-xs">
                        <h4 className="font-semibold text-ink">Pricing</h4>

                        <div className="space-y-2 pb-3 border-b border-line-soft">
                          <Row
                            k="Resident Rate"
                            v={`Rs ${pricingBreakdown.resRate}/hr`}
                          />
                          <Row
                            k="Outsider Rate"
                            v={`Rs ${pricingBreakdown.outRate}/hr`}
                          />
                        </div>

                        {residents > 0 && (
                          <Row
                            k="Residents"
                            v={
                              <span className="font-mono">
                                Rs {pricingBreakdown.residentTotal.toLocaleString("en-PK")}
                              </span>
                            }
                          />
                        )}

                        {outsiders > 0 && (
                          <Row
                            k="Outsiders"
                            v={
                              <span className="font-mono">
                                Rs {pricingBreakdown.outsiderTotal.toLocaleString("en-PK")}
                              </span>
                            }
                          />
                        )}

                        <div className="border-t border-line-soft pt-3 flex justify-between font-semibold bg-white/20 dark:bg-black/10 px-2 py-2 rounded">
                          <span className="text-ink">Total</span>
                          <span className="font-mono text-clay text-sm">
                            Rs {pricingBreakdown.grandTotal.toLocaleString("en-PK")}
                          </span>
                        </div>
                      </div>

                      {/* Alerts */}
                      {(isOverlapping || isInMaintenance) && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive space-y-1">
                          {isOverlapping && <div>⚠ Time slot conflict</div>}
                          {isInMaintenance && <div>⚠ Maintenance scheduled</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-ink-mute py-8">
                      <p>Fill in customer, date, and time to see summary</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-line-soft bg-canvas px-6 py-4 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>

              {draftId && !existing && (
                <div className="text-[10px] text-ink-mute font-medium">
                  ✓ Draft saved
                </div>
              )}

              <Button
                variant={existing ? "secondary" : "clay"}
                onClick={save}
                disabled={
                  !selectedCustomerId ||
                  !isPlayersCountValid ||
                  isOverlapping ||
                  isInMaintenance
                }
              >
                {existing ? "Save Changes" : "Confirm Booking"}
              </Button>
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
    <div className="flex items-center justify-between py-1 border-b border-line-soft last:border-b-0">
      <span className="text-ink-mute">{k}</span>
      <span className="text-ink font-semibold">{v}</span>
    </div>
  );
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      <div className="pl-6">{children}</div>
    </div>
  );
}
