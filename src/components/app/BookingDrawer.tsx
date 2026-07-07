import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Wrench, Upload } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { StatusBadge } from "./StatusBadge";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { PKR, fmtDate, fmtTime } from "@/lib/format";
import { nextStatus, nextStatusLabel, type BookingStatus } from "@/lib/status";
import { HOURS_OF_DAY, type Booking, type Customer, type Membership, type PaymentMethod, type Payment } from "@/data/seed";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId?: string | null;
  prefill?: { courtId?: string; date?: string; startTime?: string };
};

export function BookingDrawer({ open, onClose, bookingId, prefill }: Props): React.ReactNode {
  const { state, dispatch } = useClub();
  const existing = useMemo(
    () => (bookingId ? (state.bookings.find((b) => b.id === bookingId) ?? null) : null),
    [state.bookings, bookingId]
  );

  const [customerId, setCustomerId] = useState<string>("");
  const [courtId, setCourtId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    membership: "Regular" as Membership,
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setCustomerId(existing.customerId);
      setCourtId(existing.courtId);
      setDate(existing.date);
      setStartTime(existing.startTime);
    } else {
      setCustomerId(state.customers[0]?.id ?? "");
      setCourtId(prefill?.courtId ?? state.courts[0]?.id ?? "");
      setDate(prefill?.date ?? new Date().toISOString().slice(0, 10));
      setStartTime(prefill?.startTime ?? "18:00");
    }
  }, [existing, prefill, state.customers, state.courts, open]);

  const court = state.courts.find((c) => c.id === courtId);
  const customer = state.customers.find((c) => c.id === customerId);
  const endTime = useMemo(() => {
    const i = HOURS_OF_DAY.indexOf(startTime);
    return HOURS_OF_DAY[Math.min(i + 1, HOURS_OF_DAY.length - 1)];
  }, [startTime]);
  const amount = court?.hourlyRate ?? 0;

  const isInMaintenance = useMemo(() => {
    return state.maintenanceSlots.some((m) => {
      if (m.courtId !== courtId || m.date !== date) return false;
      return startTime >= m.startTime && startTime < m.endTime;
    });
  }, [state.maintenanceSlots, courtId, date, startTime]);

  const save = () => {
    if (!customer || !court) return;
    if (isInMaintenance) {
      alert("Cannot create booking during maintenance slot. Please select a different time.");
      return;
    }
    if (existing) {
      dispatch({
        type: "update_booking",
        booking: { ...existing, customerId, courtId, date, startTime, endTime, amount },
      });
    } else {
      const b: Booking = {
        id: `B-${Math.floor(20000 + Math.random() * 9999)}`,
        customerId,
        courtId,
        date,
        startTime,
        endTime,
        amount,
        status: "reserved",
        createdISO: new Date().toISOString(),
      };
      dispatch({ type: "create_booking", booking: b });
    }
    onClose();
  };

  const addCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) return;
    
    const customer: Customer = {
      id: `U-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      membership: newCustomer.membership,
      totalBookings: 0,
      totalSpend: 0,
      joinedISO: new Date().toISOString(),
    };
    
    dispatch({ type: "create_customer", customer });
    setCustomerId(customer.id);
    setShowAddCustomer(false);
    setNewCustomer({ name: "", phone: "", email: "", membership: "Regular" });
  };

  const advance = () => {
    if (!existing) return;
    const next = nextStatus(existing.status);
    if (next) dispatch({ type: "set_booking_status", id: existing.id, status: next });
  };

  const submitPayment = () => {
    if (!existing) return;
    
    const paymentId = `P-${Date.now()}`;
    const payment: Payment = {
      id: paymentId,
      bookingId: existing.id,
      method: paymentMethod,
      amount: existing.amount,
      transactionId: transactionId || `TXN-${Date.now()}`,
      screenshotColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      submittedISO: new Date().toISOString(),
      status: "pending",
    };
    
    dispatch({ type: "create_payment", payment });
    dispatch({
      type: "create_booking",
      booking: {
        ...existing,
        status: "payment_submitted" as BookingStatus,
        paymentId,
      },
    });
    
    setShowPaymentForm(false);
    setPaymentMethod("Cash");
    setTransactionId("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-mute">
                  {existing ? "Booking" : "New Reservation"}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">
                    {existing?.id ?? "Draft"}
                  </span>
                  {existing && <StatusBadge status={existing.status} />}
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-md text-ink-mute hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <Field label="Customer">
                <div className="flex items-center gap-2">
                  <Avatar name={customer?.name ?? ""} size={28} />
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                  >
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.membership}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    title="Add new customer"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showAddCustomer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 rounded-lg border border-line-soft bg-canvas p-3"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Customer name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className="h-9 rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="Phone number *"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="h-9 rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email address *"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                    />
                    <select
                      value={newCustomer.membership}
                      onChange={(e) => setNewCustomer({ ...newCustomer, membership: e.target.value as Membership })}
                      className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Regular">Regular</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowAddCustomer(false);
                          setNewCustomer({ name: "", phone: "", email: "", membership: "Regular" });
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="clay"
                        size="sm"
                        onClick={addCustomer}
                        disabled={!newCustomer.name || !newCustomer.phone || !newCustomer.email}
                        className="flex-1"
                      >
                        Add Customer
                      </Button>
                    </div>
                  </motion.div>
                )}
              </Field>

              <Field label="Court">
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                >
                  {state.courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.surface}
                    </option>
                  ))}
                </select>
                {isInMaintenance && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-status-cancelled/30 bg-status-cancelled/5 px-2 py-1.5 text-xs text-status-cancelled">
                    <Wrench className="h-3 w-3" />
                    <span>This time slot is under maintenance</span>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                  />
                </Field>
                <Field label="Start">
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                  >
                    {HOURS_OF_DAY.slice(0, -1).map((h) => (
                      <option key={h} value={h}>
                        {fmtTime(h)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rounded-lg border border-line-soft bg-canvas p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-mute">
                  Summary
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <Row k="When" v={`${fmtDate(date)} · ${fmtTime(startTime)} → ${fmtTime(endTime)}`} />
                  <Row k="Court" v={court?.name ?? "—"} />
                  <Row k="Amount" v={<span className="font-mono">{PKR(amount)}</span>} />
                </div>
              </div>

              {/* Payment Details - Show for all statuses except reserved */}
              {existing && existing.paymentId && existing.status !== "reserved" && (() => {
                const payment = state.payments.find(p => p.id === existing.paymentId);
                if (!payment) return null;
                return (
                  <div className="rounded-lg border border-line-soft bg-canvas p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-mute">
                      Payment Details
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <Row k="Method" v={payment.method} />
                      {(payment.method === "JazzCash" || payment.method === "EasyPaisa" || payment.method === "Bank Transfer") && (
                        <Row k="Transaction ID" v={<span className="font-mono">{payment.transactionId}</span>} />
                      )}
                      <Row k="Submitted" v={fmtDate(payment.submittedISO)} />
                      {(payment.method === "JazzCash" || payment.method === "EasyPaisa" || payment.method === "Bank Transfer") && (
                        <div className="pt-2">
                          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute mb-2">
                            Screenshot
                          </div>
                          <div 
                            className="flex h-32 w-full items-center justify-center rounded-md border border-line-soft bg-card cursor-pointer hover:opacity-80"
                            style={{ background: payment.screenshotColor }}
                          >
                            <div className="text-center text-white/70">
                              <ImageIcon className="mx-auto h-8 w-8" />
                              <div className="mt-1 text-xs">Payment Screenshot</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line-soft px-6 py-4">
              {existing ? (
                <>
                  <button
                    onClick={() => {
                      dispatch({ type: "set_booking_status", id: existing.id, status: "cancelled" });
                      onClose();
                    }}
                    className="text-sm text-destructive hover:underline"
                  >
                    Cancel booking
                  </button>
                  <div className="flex items-center gap-2">
                    {existing.status === "reserved" && !showPaymentForm && (
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        className="h-9 rounded-md bg-clay px-3 text-sm text-white hover:bg-clay/90"
                      >
                        Submit Payment
                      </button>
                    )}
                    {nextStatusLabel(existing.status) && existing.status !== "reserved" && (
                      <button
                        onClick={advance}
                        className="h-9 rounded-md bg-ink px-3 text-sm text-primary-foreground hover:bg-ink/90"
                      >
                        {nextStatusLabel(existing.status)}
                      </button>
                    )}
                    <button
                      onClick={save}
                      className="h-9 rounded-md border border-line px-3 text-sm text-ink hover:bg-secondary"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="h-9 rounded-md border border-line px-3 text-sm text-ink hover:bg-secondary"
                  >
                    Discard
                  </button>
                  <button
                    onClick={save}
                    className="h-9 rounded-md bg-clay px-3 text-sm text-white hover:bg-clay/90"
                  >
                    Create reservation
                  </button>
                </>
              )}
            </div>

            {/* Payment Form */}
            {showPaymentForm && existing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-line-soft bg-canvas p-6"
              >
                <h3 className="text-base font-medium text-ink mb-4">Submit Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                  {(paymentMethod === "JazzCash" || paymentMethod === "EasyPaisa" || paymentMethod === "Bank Transfer") && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                        Transaction ID *
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter transaction ID"
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </div>
                  )}
                  {(paymentMethod === "JazzCash" || paymentMethod === "EasyPaisa" || paymentMethod === "Bank Transfer") && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                        Screenshot *
                      </label>
                      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-line-soft bg-card p-6">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-ink-mute" />
                          <div className="mt-2 text-xs text-ink-mute">Click to upload payment screenshot</div>
                          <div className="mt-1 text-[10px] text-ink-mute">PNG, JPG up to 5MB</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowPaymentForm(false);
                        setPaymentMethod("Cash");
                        setTransactionId("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="clay"
                      onClick={submitPayment}
                    >
                      Submit Payment
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
        {label}
      </div>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-mute">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}