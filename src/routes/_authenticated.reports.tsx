import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardHeader } from "@/components/app/Card";
import { StatCard } from "@/components/app/StatCard";
import { Avatar } from "@/components/app/Avatar";
import { PKR, PKRShort } from "@/lib/format";
import { HOURS_OF_DAY } from "@/data/seed";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Baseline" },
      { name: "description", content: "Revenue, occupancy, peak hours and top members." },
    ],
  }),
  component: ReportsPage,
});

const CHART_COLORS = [
  "oklch(0.6 0.14 40)",
  "oklch(0.45 0.09 210)",
  "oklch(0.65 0.11 155)",
  "oklch(0.72 0.13 80)",
  "oklch(0.5 0.14 300)",
];

function ReportsPage() {
  const { state } = useClub();

  const revenueChart = state.revenueHistory.map((r) => ({
    date: r.date.slice(5),
    revenue: r.revenue,
  }));
  const totalRevenue = revenueChart.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = state.bookings.filter((b) => b.status !== "cancelled").length;
  const occupancy = Math.round(
    (totalBookings /
      (state.courts.length * HOURS_OF_DAY.length * revenueChart.length || 1)) *
      100
  );

  const peakData = useMemo(() => {
    return HOURS_OF_DAY.map((h) => ({
      hour: h.slice(0, 2),
      bookings: state.bookings.filter((b) => b.startTime === h && b.status !== "cancelled").length,
    }));
  }, [state.bookings]);

  const paymentBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of state.payments.filter((x) => x.status === "verified")) {
      m.set(p.method, (m.get(p.method) ?? 0) + p.amount);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [state.payments]);

  const topCustomers = useMemo(() => {
    return [...state.customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6);
  }, [state.customers]);

  const courtRevenue = useMemo(() => {
    return state.courts.map((c) => ({
      name: c.name.split(" — ")[0],
      revenue: state.bookings
        .filter((b) => b.courtId === c.id && b.status !== "cancelled" && b.status !== "reserved")
        .reduce((s, b) => s + b.amount, 0),
    }));
  }, [state]);

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="How the business is performing"
        description="Rolling 30 days across revenue, occupancy, peak hours and members."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue (30d)" value={PKRShort(totalRevenue)} emphasis />
        <StatCard label="Bookings" value={totalBookings} />
        <StatCard label="Occupancy" value={`${occupancy}%`} />
        <StatCard
          label="Avg. session"
          value={PKR(Math.round(totalRevenue / Math.max(1, totalBookings))).replace("Rs ", "Rs ")}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue trend" subtitle="Rolling 30 days" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart}>
                <CartesianGrid stroke="oklch(0.94 0.006 70)" vertical={false} />
                <XAxis dataKey="date" stroke="oklch(0.55 0.008 60)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="oklch(0.55 0.008 60)"
                  fontSize={11}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid oklch(0.9 0.008 70)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [PKR(v), "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.6 0.14 40)" strokeWidth={1.75} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment methods" subtitle="Verified only" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {paymentBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => PKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Peak hours" subtitle="Bookings by start time" />
          <div className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakData}>
                <CartesianGrid stroke="oklch(0.94 0.006 70)" vertical={false} />
                <XAxis dataKey="hour" stroke="oklch(0.55 0.008 60)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.008 60)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.9 0.008 70)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="bookings" fill="oklch(0.6 0.14 40)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue by court" />
          <div className="space-y-3 p-5">
            {courtRevenue.map((r) => {
              const max = Math.max(...courtRevenue.map((x) => x.revenue), 1);
              return (
                <div key={r.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink">{r.name}</span>
                    <span className="font-mono text-xs text-ink">{PKR(r.revenue)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full bg-clay"
                      style={{ width: `${(r.revenue / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Top customers" subtitle="By lifetime spend" />
        <div className="divide-y divide-line-soft">
          {topCustomers.map((c, i) => (
            <div key={c.id} className="grid grid-cols-[24px_auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3">
              <span className="font-mono text-xs text-ink-mute tabular">{String(i + 1).padStart(2, "0")}</span>
              <Avatar name={c.name} size={32} />
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{c.name}</div>
                <div className="text-[11px] text-ink-mute">{c.membership}</div>
              </div>
              <div className="text-xs text-ink-mute tabular">{c.totalBookings} bookings</div>
              <div className="font-mono text-sm text-ink">{PKR(c.totalSpend)}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}