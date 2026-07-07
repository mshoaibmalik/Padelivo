import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  CalendarCheck,
  CircleDashed,
  AlertCircle,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card, CardHeader } from "@/components/app/Card";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/app/Button";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { PKR, PKRShort, fmtDate, fmtTime, relativeTime, todayISO } from "@/lib/format";
import { HOURS_OF_DAY } from "@/data/seed";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Baseline" },
      { name: "description", content: "Today's revenue, bookings, and pending actions." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { state } = useClub();
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const today = todayISO();
  const stats = useMemo(() => {
    const todays = state.bookings.filter((b) => b.date === today);
    const revenue = todays
      .filter((b) => b.status !== "cancelled" && b.status !== "reserved")
      .reduce((s, b) => s + b.amount, 0);
    const bookedCount = todays.filter((b) => b.status !== "cancelled").length;
    const totalSlots = state.courts.filter((c) => c.status === "active").length * HOURS_OF_DAY.length;
    const usedSlots = todays.filter((b) => b.status !== "cancelled").length;
    const availableSlots = Math.max(0, totalSlots - usedSlots);
    const reserved = todays.filter((b) => b.status === "reserved").length;
    const booked = todays.filter((b) => b.status === "booked" || b.status === "checked_in").length;
    const pendingPayments = state.payments.filter((p) => p.status === "pending").length;
    return { revenue, bookedCount, availableSlots, reserved, booked, pendingPayments };
  }, [state, today]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return state.bookings
      .filter(
        (b) =>
          (b.date > today || (b.date === today && b.startTime > `${String(now.getHours()).padStart(2, "0")}:00`)) &&
          b.status !== "cancelled" &&
          b.status !== "completed"
      )
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 6);
  }, [state.bookings, today]);

  const utilization = useMemo(() => {
    return state.courts.map((c) => {
      const todays = state.bookings.filter(
        (b) => b.date === today && b.courtId === c.id && b.status !== "cancelled"
      );
      const pct = Math.min(100, Math.round((todays.length / HOURS_OF_DAY.length) * 100));
      return { court: c, pct, bookings: todays.length };
    });
  }, [state, today]);

  const revenueChart = state.revenueHistory.slice(-14).map((r) => ({
    date: r.date.slice(5),
    revenue: r.revenue,
  }));

  return (
    <>
      <PageHeader
        eyebrow={fmtDate(today)}
        title="What's happening today"
        description="Live snapshot of revenue, court flow and things that need your attention."
        actions={
          <Button variant="clay" onClick={() => setDrawer({ open: true, id: null })}>
            <Plus className="h-4 w-4" /> New reservation
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's revenue"
          value={PKRShort(stats.revenue)}
          sub={`${stats.bookedCount} bookings settled`}
          trend={{ value: "12.4%", positive: true }}
          icon={<Wallet className="h-4 w-4" />}
          emphasis
        />
        <StatCard
          label="Today's bookings"
          value={stats.bookedCount}
          sub={`${stats.reserved} reserved · ${stats.booked} confirmed`}
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Available slots"
          value={stats.availableSlots}
          sub={`across ${state.courts.filter((c) => c.status === "active").length} active courts`}
          icon={<CircleDashed className="h-4 w-4" />}
        />
        <StatCard
          label="Pending payments"
          value={stats.pendingPayments}
          sub="awaiting verification"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue"
            subtitle="Last 14 days"
            action={
              <span className="text-xs text-ink-mute">
                <span className="font-mono text-ink">
                  {PKR(revenueChart.reduce((s, r) => s + r.revenue, 0))}
                </span>{" "}
                total
              </span>
            }
          />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.14 40)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.6 0.14 40)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.94 0.006 70)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="oklch(0.55 0.008 60)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.55 0.008 60)"
                  fontSize={11}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.9 0.008 70)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [PKR(v), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.6 0.14 40)"
                  strokeWidth={1.75}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Court utilization" subtitle="Today" />
          <div className="space-y-4 p-5">
            {utilization.map((u) => (
              <div key={u.court.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-ink">{u.court.name}</div>
                    <div className="text-[11px] text-ink-mute">
                      {u.court.surface} · {u.bookings} bookings
                    </div>
                  </div>
                  <span className="font-mono text-xs text-ink">{u.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${u.pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className={
                      u.court.status === "maintenance" ? "h-full bg-ink-mute" : "h-full bg-clay"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Upcoming reservations"
            subtitle="Next 6 that need attention"
            action={
              <a
                href="/bookings"
                className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink"
              >
                All bookings <ArrowUpRight className="h-3 w-3" />
              </a>
            }
          />
          <div className="divide-y divide-line-soft">
            {upcoming.map((b) => {
              const cust = state.customers.find((c) => c.id === b.customerId);
              const court = state.courts.find((c) => c.id === b.courtId);
              return (
                <button
                  key={b.id}
                  onClick={() => setDrawer({ open: true, id: b.id })}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <Avatar name={cust?.name ?? ""} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{cust?.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-mute">
                      <span className="font-mono">{b.id}</span>
                      <span>·</span>
                      <span>{court?.name}</span>
                      <span>·</span>
                      <span className="tabular">
                        {fmtDate(b.date)} · {fmtTime(b.startTime)}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" subtitle="Live log" />
          <ol className="max-h-[380px] space-y-3 overflow-y-auto p-5">
            {state.activity.slice(0, 12).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.kind === "cancel"
                      ? "bg-destructive"
                      : a.kind === "payment"
                        ? "bg-status-payment-fg"
                        : a.kind === "checkin"
                          ? "bg-status-checkedin-fg"
                          : "bg-status-booked-fg"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-ink">{a.message}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mute tabular">{relativeTime(a.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <BookingDrawer
        open={drawer.open}
        bookingId={drawer.id}
        onClose={() => setDrawer({ open: false, id: null })}
      />
    </>
  );
}