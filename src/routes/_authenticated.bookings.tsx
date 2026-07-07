import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/app/Button";
import { SearchInput } from "@/components/app/SearchInput";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { EmptyState } from "@/components/app/EmptyState";
import { PKR, fmtDate, fmtTime } from "@/lib/format";
import { STATUS_META, type BookingStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { type PaymentMethod } from "@/data/seed";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Baseline" },
      { name: "description", content: "Every booking, filterable and actionable." },
    ],
  }),
  component: BookingsPage,
});

const FILTERS: { label: string; value: "all" | BookingStatus }[] = [
  { label: "All", value: "all" },
  { label: "Reserved", value: "reserved" },
  { label: "Payment", value: "payment_submitted" },
  { label: "Booked", value: "booked" },
  { label: "Checked in", value: "checked_in" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function BookingsPage() {
  const { state, dispatch } = useClub();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const rows = useMemo(() => {
    return state.bookings
      .filter((b) => (filter === "all" ? true : b.status === filter))
      .filter((b) => (courtFilter === "all" ? true : b.courtId === courtFilter))
      .filter((b) => {
        if (!q) return true;
        const c = state.customers.find((x) => x.id === b.customerId);
        const s = `${b.id} ${c?.name ?? ""} ${c?.phone ?? ""}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [state, q, filter, courtFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.bookings.length };
    for (const s of Object.keys(STATUS_META)) {
      c[s] = state.bookings.filter((b) => b.status === (s as BookingStatus)).length;
    }
    return c;
  }, [state.bookings]);

  return (
    <>
      <PageHeader
        eyebrow="Bookings"
        title="What needs your attention"
        description="Filter by status, court, or search by ID / customer. Click a row to open."
        actions={
          <Button variant="clay" onClick={() => setDrawer({ open: true, id: null })}>
            <Plus className="h-4 w-4" /> New reservation
          </Button>
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-line-soft bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                filter === f.value
                  ? "bg-ink text-primary-foreground"
                  : "text-ink-mute hover:bg-secondary hover:text-ink"
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-60 tabular">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <select
          value={courtFilter}
          onChange={(e) => setCourtFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-card px-2 text-sm text-ink"
        >
          <option value="all">All courts</option>
          {state.courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Search ID, customer, phone…" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line-soft bg-card">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-soft text-left text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                <th className="px-4 py-2.5">Booking</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Court</th>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const cust = state.customers.find((c) => c.id === b.customerId);
                const court = state.courts.find((c) => c.id === b.courtId);
                return (
                  <tr
                    key={b.id}
                    onClick={() => setDrawer({ open: true, id: b.id })}
                    className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-secondary"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink">{b.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={cust?.name ?? ""} size={26} />
                        <div className="min-w-0">
                          <div className="truncate text-ink">{cust?.name}</div>
                          <div className="text-[11px] text-ink-mute">{cust?.membership}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">{court?.name}</td>
                    <td className="px-4 py-3 text-ink-soft tabular">
                      <div>{fmtDate(b.date)}</div>
                      <div className="text-[11px] text-ink-mute">
                        {fmtTime(b.startTime)} → {fmtTime(b.endTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{PKR(b.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* mobile stacked */}
        <div className="divide-y divide-line-soft md:hidden">
          {rows.map((b) => {
            const cust = state.customers.find((c) => c.id === b.customerId);
            const court = state.courts.find((c) => c.id === b.courtId);
            return (
              <button
                key={b.id}
                onClick={() => setDrawer({ open: true, id: b.id })}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
              >
                <Avatar name={cust?.name ?? ""} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{cust?.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mute tabular">
                    {b.id} · {court?.name} · {fmtDate(b.date)} {fmtTime(b.startTime)}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </button>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No bookings match"
              description="Adjust your filters or clear the search."
            />
          </div>
        )}
      </div>

      <BookingDrawer
        open={drawer.open}
        bookingId={drawer.id}
        onClose={() => setDrawer({ open: false, id: null })}
      />

      {/* Payment Verification Section */}
      {state.payments.filter(p => p.status === "pending").length > 0 && (
        <div className="mt-6 rounded-lg border border-line-soft bg-card p-6">
          <h3 className="text-base font-medium text-ink mb-4">Pending Payment Verifications</h3>
          <div className="space-y-3">
            {state.payments.filter(p => p.status === "pending").map((payment) => {
              const booking = state.bookings.find(b => b.id === payment.bookingId);
              const customer = booking ? state.customers.find(c => c.id === booking.customerId) : null;
              return (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border border-line-soft bg-canvas p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={customer?.name ?? ""} size={40} />
                    <div>
                      <div className="text-sm text-ink">{customer?.name ?? "Unknown"}</div>
                      <div className="text-xs text-ink-mute">
                        {payment.id} · {payment.method} · {payment.transactionId}
                      </div>
                      <div className="text-xs text-ink-mute">
                        Booking: {payment.bookingId} · Amount: {PKR(payment.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => dispatch({ type: "reject_payment", paymentId: payment.id })}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      variant="clay"
                      size="sm"
                      onClick={() => dispatch({ type: "verify_payment", paymentId: payment.id })}
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
