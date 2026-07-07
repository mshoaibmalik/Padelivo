import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { HOURS_OF_DAY } from "@/data/seed";
import { STATUS_META } from "@/lib/status";
import { addDaysISO, fmtDate, fmtTime, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Baseline" },
      { name: "description", content: "Court schedule at a glance." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { state } = useClub();
  const [date, setDate] = useState(todayISO());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    id: string | null;
    prefill?: { courtId?: string; date?: string; startTime?: string };
  }>({ open: false, id: null });

  const dayBookings = useMemo(
    () => state.bookings.filter((b) => b.date === date),
    [state.bookings, date]
  );

  const dayMaintenance = useMemo(
    () => state.maintenanceSlots.filter((m) => m.date === date),
    [state.maintenanceSlots, date]
  );

  const lookup = useMemo(() => {
    const m = new Map<string, (typeof state.bookings)[number]>();
    for (const b of dayBookings) {
      m.set(`${b.courtId}|${b.startTime}`, b);
    }
    return m;
  }, [dayBookings, state.bookings]);

  const isInMaintenance = (courtId: string, time: string): boolean => {
    return dayMaintenance.some((m) => {
      if (m.courtId !== courtId) return false;
      return time >= m.startTime && time < m.endTime;
    });
  };

  const getMaintenanceSlot = (courtId: string, time: string): typeof dayMaintenance[number] | undefined => {
    return dayMaintenance.find((m) => {
      if (m.courtId !== courtId) return false;
      return time >= m.startTime && time < m.endTime;
    });
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = date === todayISO();

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Which courts are available"
        description="Columns are courts, rows are hourly slots. Click any cell to reserve or edit."
        actions={
          <div className="flex flex-col gap-2">
            {/* Quick filters */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(addDaysISO(date, -1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setDate(todayISO())}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  date === todayISO()
                    ? "bg-clay text-white"
                    : "border border-line bg-card text-ink hover:bg-secondary"
                }`}
              >
                Today
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(addDaysISO(date, 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date display with booking count */}
            <div className="flex items-center justify-between rounded-lg border border-line-soft bg-card px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-ink-mute">
                    {new Date(date).toLocaleDateString("en-PK", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-semibold text-ink tabular">
                    {new Date(date).getDate()}
                  </div>
                </div>
                <div className="h-8 w-px bg-line-soft" />
                <div>
                  <div className="text-sm font-medium text-ink">
                    {new Date(date).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-ink-mute">
                    {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                    {dayMaintenance.length > 0 && (
                      <span className="ml-1.5 text-status-cancelled-fg">
                        · {dayMaintenance.length} maintenance
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDate(addDaysISO(date, -7))}
                  className="rounded px-2 py-1 text-[11px] text-ink-mute hover:bg-secondary hover:text-ink"
                  title="Previous week"
                >
                  ‹‹
                </button>
                <button
                  onClick={() => setDate(addDaysISO(date, 7))}
                  className="rounded px-2 py-1 text-[11px] text-ink-mute hover:bg-secondary hover:text-ink"
                  title="Next week"
                >
                  ››
                </button>
              </div>
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDate(addDaysISO(todayISO(), -1))}
                className="rounded-md border border-line bg-card px-2 py-1 text-[11px] text-ink-mute hover:bg-secondary hover:text-ink"
              >
                Yesterday
              </button>
              <button
                onClick={() => setDate(addDaysISO(todayISO(), 1))}
                className="rounded-md border border-line bg-card px-2 py-1 text-[11px] text-ink-mute hover:bg-secondary hover:text-ink"
              >
                Tomorrow
              </button>
            </div>
          </div>
        }
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-line-soft bg-card">
        <div
          className="grid min-w-[720px]"
          style={{
            gridTemplateColumns: `72px repeat(${state.courts.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-10 border-b border-line-soft bg-card p-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
            Time
          </div>
          {state.courts.map((c) => (
            <div
              key={c.id}
              className="border-b border-l border-line-soft bg-gradient-to-b from-card to-card/80 p-3"
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                {c.surface === "Indoor" ? (
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    Indoor
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Outdoor
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-mute">
                <span className="font-mono">Rs {c.hourlyRate.toLocaleString("en-PK")}/hr</span>
                {c.status === "maintenance" && (
                  <span className="flex items-center gap-1 rounded bg-status-cancelled/20 px-1.5 py-0.5 text-[10px] font-medium text-status-cancelled-fg">
                    <Wrench className="h-2.5 w-2.5" />
                    Maintenance
                  </span>
                )}
              </div>
            </div>
          ))}

          {HOURS_OF_DAY.slice(0, -1).map((h) => {
            const [hh] = h.split(":").map(Number);
            const rowMins = hh * 60;
            const showNowLine = isToday && rowMins <= nowMinutes && nowMinutes < rowMins + 60;
            const isPeakHour = hh >= 17 && hh <= 21;
            return (
              <div key={h} className="contents">
                <div className={`sticky left-0 z-10 border-b border-line-soft bg-card px-3 py-2 text-xs tabular ${
                  isPeakHour ? "font-semibold text-clay" : "font-medium text-ink-mute"
                }`}>
                  {fmtTime(h)}
                  {isPeakHour && (
                    <span className="ml-1.5 text-[9px] text-clay/70">peak</span>
                  )}
                </div>
                {state.courts.map((c) => {
                  const b = lookup.get(`${c.id}|${h}`);
                  const maintenance = getMaintenanceSlot(c.id, h);
                  const inMaintenance = isInMaintenance(c.id, h);
                  
                  if (inMaintenance && maintenance) {
                    return (
                      <button
                        key={c.id + h}
                        disabled
                        className="relative border-b border-l border-line-soft bg-status-cancelled/15 px-2 py-2 text-left text-[11px] backdrop-blur-sm"
                      >
                        {showNowLine && (
                          <span className="absolute left-0 right-0 top-0 h-0.5 bg-clay shadow-sm shadow-clay/50" />
                        )}
                        <div className="flex items-center gap-1.5 text-status-cancelled">
                          <div className="rounded bg-status-cancelled/20 p-0.5">
                            <Wrench className="h-3 w-3" />
                          </div>
                          <span className="font-semibold">Maintenance</span>
                        </div>
                        {maintenance.reason && (
                          <div className="mt-1 line-clamp-2 text-[10px] text-ink-mute">{maintenance.reason}</div>
                        )}
                      </button>
                    );
                  }
                  
                  const meta = b ? STATUS_META[b.status] : null;
                  const isDisabled = c.status === "maintenance" && !b;
                  
                  return (
                    <button
                      key={c.id + h}
                      onClick={() =>
                        setDrawer({
                          open: true,
                          id: b?.id ?? null,
                          prefill: b ? undefined : { courtId: c.id, date, startTime: h },
                        })
                      }
                      disabled={isDisabled}
                      className={cn(
                        "group relative border-b border-l border-line-soft px-2 py-2 text-left text-[11px] transition-all",
                        b
                          ? `${meta?.bg} ${meta?.fg} hover:shadow-sm`
                          : "bg-card text-ink-mute hover:bg-secondary/80 hover:shadow-sm",
                        isDisabled && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {showNowLine && (
                        <span className="absolute left-0 right-0 top-0 h-0.5 bg-clay shadow-sm shadow-clay/50" />
                      )}
                      {b ? (
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${meta?.dot}`} />
                            <div className="truncate font-semibold">
                              {state.customers.find((cu) => cu.id === b.customerId)?.name}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] opacity-80">{b.id}</span>
                            <span className="text-[9px] opacity-60">
                              {b.startTime}–{b.endTime}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                          <div className="h-1 w-1 rounded-full bg-current opacity-50" />
                          <span>Available</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-lg border border-line-soft bg-card/50 p-3 text-[11px] text-ink-mute">
        {(
          [
            "reserved",
            "payment_submitted",
            "booked",
            "checked_in",
            "completed",
            "cancelled",
          ] as const
        ).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
            <span className="font-medium">{STATUS_META[s].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-cancelled/50" />
          <span className="font-medium">Maintenance</span>
        </div>
      </div>

      <BookingDrawer
        open={drawer.open}
        bookingId={drawer.id}
        prefill={drawer.prefill}
        onClose={() => setDrawer({ open: false, id: null })}
      />
    </>
  );
}