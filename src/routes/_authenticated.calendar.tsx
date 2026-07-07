import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wrench, Calendar, CheckCircle, Clock } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { BookingDrawer } from "@/components/app/BookingDrawer";
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

// Helper functions for time conversion
const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

function CalendarPage() {
  const { state, dispatch } = useClub();
  const { settings } = useSettings();
  const [date, setDate] = useState(todayISO());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    id: string | null;
    prefill?: { courtId?: string; date?: string; startTime?: string };
  }>({ open: false, id: null });

  const dayBookings = useMemo(
    () => state.bookings.filter((b) => b.date === date && b.status !== "cancelled"),
    [state.bookings, date],
  );

  const dayMaintenance = useMemo(
    () => state.maintenanceSlots.filter((m) => m.date === date),
    [state.maintenanceSlots, date],
  );

  // Generate 30-minute slots based on settings opening/closing times
  const timeSlots = useMemo(() => {
    const startMins = timeToMins(settings.openingTime || "07:00");
    const endMins = timeToMins(settings.closingTime || "23:00");
    const list: string[] = [];
    for (let m = startMins; m < endMins; m += 30) {
      list.push(minsToTime(m));
    }
    return list;
  }, [settings.openingTime, settings.closingTime]);

  const lookupBooking = (time: string) => {
    return dayBookings.find((b) => {
      return time >= b.startTime && time < b.endTime;
    });
  };

  const lookupMaintenance = (time: string) => {
    return dayMaintenance.find((m) => {
      return time >= m.startTime && time < m.endTime;
    });
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = date === todayISO();

  return (
    <>
      <PageHeader
        eyebrow="Court Scheduler"
        title="Main Court Availability"
        description="View the vertical timeline for the Main Court. Click any time block to reserve or view booking details."
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
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  date === todayISO()
                    ? "bg-clay text-white"
                    : "border border-line bg-card text-ink hover:bg-secondary",
                )}
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
                      <span className="ml-1.5 text-status-cancelled-fg font-medium">
                        · {dayMaintenance.length} Maintenance
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <div className="mt-6 max-w-4xl overflow-hidden rounded-xl border border-line-soft bg-card shadow-sm">
        <div className="border-b border-line-soft bg-canvas px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-ink font-semibold">Main Court Timeline</span>
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
              Indoor
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-mute">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Residents: Rs {settings.residentRate}/hr</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Outsiders: Rs {settings.outsiderRate}/hr</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-line-soft">
          {timeSlots.map((time) => {
            const b = lookupBooking(time);
            const maintenance = lookupMaintenance(time);
            const [hh, mm] = time.split(":").map(Number);
            const rowMins = hh * 60 + mm;
            const showNowLine = isToday && rowMins <= nowMinutes && nowMinutes < rowMins + 30;
            const isHourStart = mm === 0;

            if (maintenance) {
              return (
                <div key={time} className="flex min-h-[64px] relative">
                  {showNowLine && (
                    <span className="absolute left-0 right-0 top-0 h-0.5 bg-clay z-10 shadow-sm shadow-clay/50 animate-pulse" />
                  )}
                  <div className="w-20 shrink-0 border-r border-line-soft p-3 text-right text-xs tabular text-ink-mute font-medium bg-canvas/30">
                    {isHourStart ? fmtTime(time) : <span className="opacity-40">{time}</span>}
                  </div>
                  <div className="flex-1 bg-status-cancelled/10 px-4 py-3 flex items-start justify-between">
                    <div className="flex items-center gap-2 text-status-cancelled-fg">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs uppercase tracking-wider">
                          Court Maintenance
                        </span>
                        {maintenance.reason && (
                          <p className="text-[11px] text-ink-mute mt-0.5">{maintenance.reason}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] bg-status-cancelled/20 text-status-cancelled-fg px-2 py-0.5 rounded font-mono font-medium">
                      {maintenance.startTime} - {maintenance.endTime}
                    </span>
                  </div>
                </div>
              );
            }

            if (b) {
              const meta = STATUS_META[b.status];
              const cust = state.customers.find((c) => c.id === b.customerId);

              // Only render details if this slot matches the start of the booking,
              // otherwise render a continuation block to make the Google Calendar aesthetic.
              const isStartSlot = b.startTime === time;

              return (
                <div key={time} className="flex min-h-[64px] relative">
                  {showNowLine && (
                    <span className="absolute left-0 right-0 top-0 h-0.5 bg-clay z-10 shadow-sm shadow-clay/50 animate-pulse" />
                  )}
                  <div className="w-20 shrink-0 border-r border-line-soft p-3 text-right text-xs tabular text-ink-mute font-medium bg-canvas/30">
                    {isHourStart ? fmtTime(time) : <span className="opacity-40">{time}</span>}
                  </div>
                  <button
                    onClick={() => setDrawer({ open: true, id: b.id })}
                    className={cn(
                      "flex-1 px-4 py-3 text-left transition-colors border-l-4 flex items-center justify-between group",
                      meta?.bg,
                      meta?.fg,
                      b.status === "completed" && "border-l-status-completed-fg",
                      b.status === "checked_in" && "border-l-status-checkedin-fg",
                      b.status === "booked" && "border-l-status-booked-fg",
                      b.status === "payment_submitted" && "border-l-status-payment-fg",
                      b.status === "reserved" && "border-l-status-reserved-fg",
                    )}
                  >
                    {isStartSlot ? (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", meta?.dot)} />
                          <span className="font-semibold text-sm text-ink">
                            {cust?.name || "Customer"}
                          </span>
                          <span className="text-xs opacity-75">({cust?.customerType})</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] opacity-80">
                          <span className="font-mono">{b.id}</span>
                          <span>·</span>
                          <span>
                            {b.totalPlayers} Players ({b.residents} Res / {b.outsiders} Out)
                          </span>
                          <span>·</span>
                          <span className="font-mono font-medium">
                            Rs {b.amount.toLocaleString("en-PK")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] opacity-50 italic">
                        Continuation of booking {b.id} ({cust?.name})
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-white/40 dark:bg-black/20 text-ink">
                        {meta?.label}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>
                  </button>
                </div>
              );
            }

            return (
              <div key={time} className="flex min-h-[64px] relative group">
                {showNowLine && (
                  <span className="absolute left-0 right-0 top-0 h-0.5 bg-clay z-10 shadow-sm shadow-clay/50 animate-pulse" />
                )}
                <div className="w-20 shrink-0 border-r border-line-soft p-3 text-right text-xs tabular text-ink-mute font-medium bg-canvas/30">
                  {isHourStart ? fmtTime(time) : <span className="opacity-40">{time}</span>}
                </div>
                <button
                  onClick={() =>
                    setDrawer({
                      open: true,
                      id: null,
                      prefill: { courtId: "C-01", date, startTime: time },
                    })
                  }
                  className="flex-1 px-4 py-3 text-left transition-colors hover:bg-secondary/40 flex items-center justify-between text-ink-mute"
                >
                  <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-available-fg" />
                    <span className="text-xs font-medium">Available for Booking</span>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity border border-line px-2 py-0.5 rounded bg-card hover:bg-secondary hover:text-ink">
                    + Reserve Time
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 max-w-4xl flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-lg border border-line-soft bg-card/50 p-3 text-[11px] text-ink-mute">
        {(["reserved", "payment_submitted", "booked", "checked_in", "completed"] as const).map(
          (s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
              <span className="font-medium">{STATUS_META[s].label}</span>
            </div>
          ),
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-cancelled-fg" />
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
