import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  CalendarCheck,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Timer,
  UserCheck,
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
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card, CardHeader } from "@/components/app/Card";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/app/Button";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { PKR, PKRShort, fmtDate, fmtTime, relativeTime, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Baseline" },
      { name: "description", content: "Today's revenue, bookings, and pending actions." },
    ],
  }),
  component: DashboardPage,
});

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function DashboardPage() {
  const { state } = useClub();
  const { settings } = useSettings();
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const today = todayISO();

  const stats = useMemo(() => {
    const todays = state.bookings.filter((b) => b.date === today && b.status !== "cancelled");
    const revenue = todays.filter((b) => b.status !== "reserved").reduce((s, b) => s + b.amount, 0);

    const bookedCount = todays.length;

    // Total operational hours today
    const startMins = timeToMins(settings.openingTime || "07:00");
    const endMins = timeToMins(settings.closingTime || "23:00");
    const totalOperatingHours = (endMins - startMins) / 60;

    // Occupied hours
    const occupiedHours = todays.reduce((s, b) => s + b.durationHours, 0);
    const availableHours = Math.max(0, totalOperatingHours - occupiedHours);

    // Reserved hours (unpaid/holding status)
    const reservedHours = todays
      .filter((b) => b.status === "reserved")
      .reduce((s, b) => s + b.durationHours, 0);

    const pendingPayments = state.payments.filter((p) => p.status === "pending").length;

    // Occupancy percentage
    const occupancyPct = Math.min(
      100,
      Math.round((occupiedHours / (totalOperatingHours || 1)) * 100),
    );

    // Average booking duration across all non-cancelled bookings in the system
    const allActive = state.bookings.filter((b) => b.status !== "cancelled");
    const avgDuration = allActive.length
      ? (allActive.reduce((s, b) => s + b.durationHours, 0) / allActive.length).toFixed(1)
      : "0";

    return {
      revenue,
      bookedCount,
      availableHours,
      reservedHours,
      pendingPayments,
      occupancyPct,
      avgDuration,
      occupiedHours,
    };
  }, [state, today, settings.openingTime, settings.closingTime]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return state.bookings
      .filter(
        (b) =>
          (b.date > today ||
            (b.date === today && b.startTime > `${String(now.getHours()).padStart(2, "0")}:00`)) &&
          b.status !== "cancelled" &&
          b.status !== "completed",
      )
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 6);
  }, [state.bookings, today]);

  const revenueChart = state.revenueHistory.slice(-14).map((r) => ({
    date: r.date.slice(5),
    revenue: r.revenue,
  }));

  return (
    <>
      <PageHeader
        eyebrow={fmtDate(today)}
        title="Main Court Dashboard"
        description="Live snapshot of the single-court availability, revenue stats, and customer traffic."
        actions={undefined}
      />

      {/* Row 1 Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={PKRShort(stats.revenue)}
          sub={`${stats.bookedCount} active bookings`}
          trend={{ value: "14.2%", positive: true }}
          icon={<Wallet className="h-4 w-4" />}
          emphasis
        />
        <StatCard
          label="Today's Bookings"
          value={`${stats.bookedCount} slots`}
          sub={`${stats.occupiedHours} hours reserved/played`}
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Available Hours Today"
          value={`${stats.availableHours} hrs`}
          sub={`from ${settings.openingTime} to ${settings.closingTime}`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Reserved Hours (Unpaid)"
          value={`${stats.reservedHours} hrs`}
          sub="awaiting payment actions"
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      {/* Row 2 Stats (New PRD additions) */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's Occupancy %"
          value={`${stats.occupancyPct}%`}
          sub="of total operating time"
          icon={<Percent className="h-4 w-4 text-clay" />}
        />
        <StatCard
          label="Average Booking Duration"
          value={`${stats.avgDuration} hrs`}
          sub="lifetime average duration"
          icon={<Timer className="h-4 w-4" />}
        />
        <StatCard
          label="Pending Payments"
          value={stats.pendingPayments}
          sub="wallet verifications due"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Upcoming Bookings"
          value={upcoming.length}
          sub="scheduled next in queue"
          icon={<UserCheck className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue Trend"
            subtitle="Last 14 days performance"
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

        {/* Occupancy Card (Single Court visual summary) */}
        <Card>
          <CardHeader title="Today's Court Status" subtitle="Main Court" />
          <div className="space-y-4 p-5 flex flex-col justify-between h-[230px]">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-ink font-semibold">Timeline Allocation</span>
                <span className="font-mono text-xs text-ink font-bold">
                  {stats.occupancyPct}% Occupied
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line-soft">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.occupancyPct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full bg-clay"
                />
              </div>
            </div>

            <div className="bg-canvas p-3.5 rounded-lg border border-line-soft space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-mute">Operating Limit</span>
                <span className="text-ink font-semibold">
                  {(timeToMins(settings.closingTime || "23:00") -
                    timeToMins(settings.openingTime || "07:00")) /
                    60}{" "}
                  hours
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Time Booked Today</span>
                <span className="text-ink font-semibold">{stats.occupiedHours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Time Available Today</span>
                <span className="text-ink font-semibold text-status-available-fg">
                  {stats.availableHours} hours
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3 layout: Upcoming reservations & live audit log */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Upcoming Bookings"
            subtitle="Next active scheduled players"
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
                      <span className="text-clay font-medium">{cust?.customerType}</span>
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
          <CardHeader title="Recent Activity" subtitle="Live club log" />
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
                  <div className="mt-0.5 text-[11px] text-ink-mute tabular">
                    {relativeTime(a.at)}
                  </div>
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
