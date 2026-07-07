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
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardHeader } from "@/components/app/Card";
import { StatCard } from "@/components/app/StatCard";
import { Avatar } from "@/components/app/Avatar";
import { PKR, PKRShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Baseline" },
      { name: "description", content: "Revenue, occupancy, peak hours and performance metrics." },
    ],
  }),
  component: ReportsPage,
});

const CHART_COLORS = ["oklch(0.6 0.14 40)", "oklch(0.45 0.09 210)"];

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function ReportsPage() {
  const { state } = useClub();
  const { settings } = useSettings();

  const activeBookings = useMemo(() => {
    return state.bookings.filter((b) => b.status !== "cancelled");
  }, [state.bookings]);

  // Daily revenue data from the history
  const revenueChart = useMemo(() => {
    return state.revenueHistory.map((r) => ({
      date: r.date.slice(5),
      revenue: r.revenue,
    }));
  }, [state.revenueHistory]);

  // Monthly Revenue (sum of last 30 days)
  const monthlyRevenue = useMemo(() => {
    return state.revenueHistory.reduce((sum, r) => sum + r.revenue, 0);
  }, [state.revenueHistory]);

  // Average Daily Revenue
  const avgDailyRevenue = useMemo(() => {
    return state.revenueHistory.length
      ? Math.round(monthlyRevenue / state.revenueHistory.length)
      : 0;
  }, [state.revenueHistory, monthlyRevenue]);

  // Occupancy %: ratio of booked hours to total operational capacity over 30 days
  const occupancyPct = useMemo(() => {
    const daysCount = state.revenueHistory.length || 30;
    const startMins = timeToMins(settings.openingTime || "07:00");
    const endMins = timeToMins(settings.closingTime || "23:00");
    const operatingHoursPerDay = (endMins - startMins) / 60;
    const totalCapacityHours = daysCount * operatingHoursPerDay;

    // Sum booked hours in the 30-day range
    const dates = new Set(state.revenueHistory.map((r) => r.date));
    const bookedHours = state.bookings
      .filter((b) => b.status !== "cancelled" && dates.has(b.date))
      .reduce((sum, b) => sum + b.durationHours, 0);

    return Math.min(100, Math.round((bookedHours / (totalCapacityHours || 1)) * 100));
  }, [state.bookings, state.revenueHistory, settings.openingTime, settings.closingTime]);

  // Average Booking Duration
  const avgBookingDuration = useMemo(() => {
    return activeBookings.length
      ? (
          activeBookings.reduce((sum, b) => sum + b.durationHours, 0) / activeBookings.length
        ).toFixed(1)
      : "0";
  }, [activeBookings]);

  // Average Players per Booking
  const avgPlayersPerBooking = useMemo(() => {
    return activeBookings.length
      ? (
          activeBookings.reduce((sum, b) => sum + b.totalPlayers, 0) / activeBookings.length
        ).toFixed(1)
      : "0";
  }, [activeBookings]);

  // Revenue by Customer Type (Residents vs Outsiders)
  const customerTypeRevenue = useMemo(() => {
    let residentTotal = 0;
    let outsiderTotal = 0;
    const resRate = settings.residentRate;
    const outRate = settings.outsiderRate;

    for (const b of activeBookings) {
      if (b.status !== "reserved") {
        residentTotal += b.residents * resRate * b.durationHours;
        outsiderTotal += b.outsiders * outRate * b.durationHours;
      }
    }

    return [
      { name: "Residents", value: residentTotal },
      { name: "Outsiders", value: outsiderTotal },
    ];
  }, [activeBookings, settings.residentRate, settings.outsiderRate]);

  // Peak hours log
  const peakData = useMemo(() => {
    const list = Array.from({ length: 24 }, (_, i) => {
      const hStr = `${String(i).padStart(2, "0")}:00`;
      return {
        hour: hStr,
        bookings: activeBookings.filter((b) => b.startTime === hStr).length,
      };
    });
    // Filter to only display hours within operating bounds
    const startH = Number(settings.openingTime.split(":")[0]);
    const endH = Number(settings.closingTime.split(":")[0]);
    return list.filter((item) => {
      const h = Number(item.hour.split(":")[0]);
      return h >= startH && h <= endH;
    });
  }, [activeBookings, settings.openingTime, settings.closingTime]);

  const topCustomers = useMemo(() => {
    return [...state.customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 6);
  }, [state.customers]);

  return (
    <>
      <PageHeader
        eyebrow="Business Intelligence"
        title="Main Court Performance"
        description="Analytics overview on revenue, average session lengths, occupancy splits, and peak hours."
      />

      {/* Row 1 Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly Revenue (30d)" value={PKRShort(monthlyRevenue)} emphasis />
        <StatCard label="Daily Avg Revenue" value={PKR(avgDailyRevenue)} />
        <StatCard label="Court Occupancy Rate" value={`${occupancyPct}%`} />
        <StatCard label="Avg Booking Duration" value={`${avgBookingDuration} Hrs`} />
      </div>

      {/* Row 2 Stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg Players / Session" value={`${avgPlayersPerBooking} players`} />
        <StatCard
          label="Resident Share"
          value={PKRShort(customerTypeRevenue[0].value)}
          sub="of overall verified revenue"
        />
        <StatCard
          label="Outsider Share"
          value={PKRShort(customerTypeRevenue[1].value)}
          sub="of overall verified revenue"
        />
        <StatCard label="Total Active Bookings" value={activeBookings.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Daily Revenue Trend"
            subtitle="Performance across the rolling 30 days"
          />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart}>
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.6 0.14 40)"
                  strokeWidth={1.75}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Customer Type split (Pie Chart) */}
        <Card>
          <CardHeader title="Revenue by Customer Type" subtitle="Residents vs. Outsiders" />
          <div className="h-64 p-4 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerTypeRevenue}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {customerTypeRevenue.map((_, i) => (
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
        {/* Peak Hours distribution */}
        <Card className="lg:col-span-2">
          <CardHeader title="Peak operating Hours" subtitle="Bookings based on start hours" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakData}>
                <CartesianGrid stroke="oklch(0.94 0.006 70)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="oklch(0.55 0.008 60)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.55 0.008 60)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.9 0.008 70)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="bookings" fill="oklch(0.6 0.14 40)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top customers card */}
        <Card>
          <CardHeader title="Top Playing customers" subtitle="Lifetime spent split" />
          <div className="divide-y divide-line-soft max-h-64 overflow-y-auto">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-ink-mute font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Avatar name={c.name} size={24} />
                  <div className="min-w-0">
                    <div className="truncate text-ink font-semibold">{c.name}</div>
                    <div className="text-[10px] text-ink-mute font-medium">{c.customerType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-ink font-mono">
                    Rs {c.totalSpend.toLocaleString("en-PK")}
                  </div>
                  <div className="text-[9px] text-ink-mute">{c.totalBookings} bookings</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
