import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X, Check } from "lucide-react";
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
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const rows = useMemo(() => {
    return state.bookings
      .filter((b) => (filter === "all" ? true : b.status === filter))
      .filter((b) => {
        if (!q) return true;
        const c = state.customers.find((x) => x.id === b.customerId);
        const s = `${b.id} ${c?.name ?? ""} ${c?.phone ?? ""}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [state, q, filter]);

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
        eyebrow="Reservations Log"
        title="Manage All Bookings"
        description="Search by booking ID, customer name or WhatsApp number. Click any row to review details or advance stages."
        actions={
          <Button variant="clay" onClick={() => setDrawer({ open: true, id: null })}>
            <Plus className="h-4 w-4" /> New Reservation
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-line-soft bg-card p-1 overflow-x-auto max-w-full">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                filter === f.value
                  ? "bg-ink text-primary-foreground"
                  : "text-ink-mute hover:bg-secondary hover:text-ink",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-60 tabular">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className="shrink-0">
          <SearchInput value={q} onChange={setQ} placeholder="Search ID, Name, WhatsApp..." />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line-soft bg-card shadow-xs">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-soft text-left text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute bg-canvas/20">
                <th className="px-4 py-2.5">Booking</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Court</th>
                <th className="px-4 py-2.5">Schedule</th>
                <th className="px-4 py-2.5">Duration</th>
                <th className="px-4 py-2.5 text-center">Residents</th>
                <th className="px-4 py-2.5 text-center">Outsiders</th>
                <th className="px-4 py-2.5 text-center">Players</th>
                <th className="px-4 py-2.5 text-right">Grand Total</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const cust = state.customers.find((c) => c.id === b.customerId);
                return (
                  <tr
                    key={b.id}
                    onClick={() => setDrawer({ open: true, id: b.id })}
                    className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-secondary transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink font-semibold">{b.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={cust?.name ?? ""} size={26} />
                        <div className="min-w-0">
                          <div className="truncate text-ink font-medium">{cust?.name}</div>
                          <div className="text-[11px] text-ink-mute font-mono">{cust?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink text-xs">
                      {state.courts.find(c => c.id === b.courtId)?.name || b.courtId}
                    </td>
                    <td className="px-4 py-3 text-ink-soft tabular">
                      <div>{fmtDate(b.date)}</div>
                      <div className="text-[11px] text-ink-mute font-mono mt-0.5">
                        {b.startTime} - {b.endTime}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">{b.durationHours} Hr(s)</td>
                    <td className="px-4 py-3 text-center text-ink tabular">{b.residents}</td>
                    <td className="px-4 py-3 text-center text-ink tabular">{b.outsiders}</td>
                    <td className="px-4 py-3 text-center text-ink tabular font-semibold">
                      {b.totalPlayers}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink font-semibold">
                      Rs {b.amount.toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="divide-y divide-line-soft md:hidden">
          {rows.map((b) => {
            const cust = state.customers.find((c) => c.id === b.customerId);
            return (
              <button
                key={b.id}
                onClick={() => setDrawer({ open: true, id: b.id })}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left hover:bg-secondary/40"
              >
                <Avatar name={cust?.name ?? ""} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink font-semibold">{cust?.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mute font-mono">
                    {b.id} · {state.courts.find(c => c.id === b.courtId)?.name} · {b.durationHours} hrs
                  </div>
                  <div className="text-[10px] text-ink-mute font-mono">
                    {fmtDate(b.date)} · {b.startTime} - {b.endTime}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <div className="text-xs font-mono font-bold text-clay mt-1">
                    Rs {b.amount.toLocaleString("en-PK")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No Bookings Match"
              description="Adjust your status filters or clear the search criteria."
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
      {state.payments.filter((p) => p.status === "pending").length > 0 && (
        <div className="mt-6 rounded-lg border border-line-soft bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold text-ink mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-payment-fg animate-pulse" />
            <span>Pending Wallet Verifications</span>
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {state.payments
              .filter((p) => p.status === "pending")
              .map((payment) => {
                const booking = state.bookings.find((b) => b.id === payment.bookingId);
                const customer = booking
                  ? state.customers.find((c) => c.id === booking.customerId)
                  : null;
                return (
                  <div
                    key={payment.id}
                    className="flex flex-col justify-between rounded-lg border border-line-soft bg-canvas/30 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={customer?.name ?? ""} size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">
                          {customer?.name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-ink-mute">
                          Wallet: <span className="font-semibold text-ink">{payment.method}</span> ·
                          ID: <span className="font-mono text-ink">{payment.transactionId}</span>
                        </div>
                        <div className="text-xs text-ink-mute">
                          Ref: <span className="font-mono">{payment.bookingId}</span> · Duration:{" "}
                          {booking?.durationHours} hrs
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-line-soft pt-2.5">
                      <span className="text-sm font-bold text-clay font-mono">
                        Rs {payment.amount.toLocaleString("en-PK")}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            dispatch({ type: "reject_payment", paymentId: payment.id })
                          }
                          className="h-8 py-0 px-3 text-[11px]"
                        >
                          <X className="h-3 w-3" /> Reject
                        </Button>
                        <Button
                          variant="clay"
                          size="sm"
                          onClick={() =>
                            dispatch({ type: "verify_payment", paymentId: payment.id })
                          }
                          className="h-8 py-0 px-3 text-[11px]"
                        >
                          <Check className="h-3 w-3" /> Confirm
                        </Button>
                      </div>
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
