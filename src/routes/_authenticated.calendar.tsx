import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wrench, Calendar, Plus } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { SlotMenu } from "@/components/app/SlotMenu";
import { MaintenanceDrawer } from "@/components/app/MaintenanceDrawer";
import { STATUS_META } from "@/lib/status";
import { addDaysISO, fmtDate, fmtTime, todayISO, getWeekStart } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Baseline" },
      { name: "description", content: "Weekly court schedule at a glance." },
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
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayISO()));
  const [drawer, setDrawer] = useState<{
    open: boolean;
    id: string | null;
    prefill?: { courtId?: string; date?: string; startTime?: string };
  }>({ open: false, id: null });
  
  // Slot menu state
  const [slotMenu, setSlotMenu] = useState<{
    open: boolean;
    position: { x: number; y: number } | null;
    date: string;
    startTime: string;
  }>({ open: false, position: null, date: "", startTime: "" });

  // Maintenance drawer state
  const [maintenance, setMaintenance] = useState<{
    open: boolean;
    date: string;
    startTime: string;
  }>({ open: false, date: "", startTime: "" });

  // Generate 7 days of the week (Monday to Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  }, [weekStart]);

  // Generate 30-minute time slots based on settings
  const timeSlots = useMemo(() => {
    const startMins = timeToMins(settings.openingTime || "07:00");
    const endMins = timeToMins(settings.closingTime || "23:00");
    const list: string[] = [];
    for (let m = startMins; m < endMins; m += 30) {
      list.push(minsToTime(m));
    }
    return list;
  }, [settings.openingTime, settings.closingTime]);

  // Get bookings for a specific date and time slot
  const getBookingAt = (date: string, time: string) => {
    return state.bookings.find((b) => {
      if (b.date !== date || b.status === "cancelled") return false;
      const timeMins = timeToMins(time);
      const startMins = timeToMins(b.startTime);
      const endMins = timeToMins(b.endTime);
      return timeMins >= startMins && timeMins < endMins;
    });
  };

  // Get maintenance at a specific date and time slot
  const getMaintenanceAt = (date: string, time: string) => {
    return state.maintenanceSlots.find((m) => {
      if (m.date !== date) return false;
      const timeMins = timeToMins(time);
      const startMins = timeToMins(m.startTime);
      const endMins = timeToMins(m.endTime);
      return timeMins >= startMins && timeMins < endMins;
    });
  };

  // Check if a time slot is the start of a booking
  const isBookingStart = (booking: any, time: string) => {
    return booking.startTime === time;
  };

  // Calculate how many 30-min slots a booking spans
  const getBookingSpan = (booking: any) => {
    const startMins = timeToMins(booking.startTime);
    const endMins = timeToMins(booking.endTime);
    return Math.ceil((endMins - startMins) / 30);
  };

  const today = todayISO();
  const isCurrentWeek = (date: string) => {
    const d = new Date(date);
    const start = new Date(weekStart);
    const end = new Date(addDaysISO(weekStart, 6));
    return d >= start && d <= end;
  };

  return (
    <>
      <PageHeader
        eyebrow="Court Scheduler"
        title="Weekly Court Schedule"
        description="View the weekly matrix for the Main Court. Time slots are columns, dates are rows. Click any cell to reserve or view booking details."
        actions={
          <div className="flex flex-col gap-2">
            {/* Week navigation */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setWeekStart(getWeekStart(todayISO()))}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  weekStart === getWeekStart(todayISO())
                    ? "bg-clay text-white"
                    : "border border-line bg-card text-ink hover:bg-secondary",
                )}
              >
                This Week
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Week date range display */}
            <div className="flex items-center justify-between rounded-lg border border-line-soft bg-card px-3 py-2">
              <div className="text-sm font-medium text-ink">
                {fmtDate(weekStart)} — {fmtDate(addDaysISO(weekStart, 6))}
              </div>
            </div>
          </div>
        }
      />

      {/* Weekly Matrix Calendar - Giant Chart Style */}
      <div className="mt-6 overflow-hidden rounded-2xl border-2 border-line-soft bg-card shadow-xl">
        {/* Enhanced Header */}
        <div className="border-b-2 border-line-soft bg-gradient-to-r from-canvas to-secondary px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-clay/10 p-2">
                <Calendar className="h-6 w-6 text-clay" />
              </div>
              <div>
                <span className="font-display text-2xl text-ink font-bold">Main Court Schedule</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    Indoor
                  </span>
                  <span className="text-xs text-ink-mute">
                    {timeSlots.length} time slots available
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2 rounded-lg bg-status-available/10 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-status-available-fg" />
                <span className="font-medium text-ink">Residents: Rs {settings.residentRate}/hr</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-status-booked/10 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-status-booked-fg" />
                <span className="font-medium text-ink">Outsiders: Rs {settings.outsiderRate}/hr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Compact with Sticky Headers */}
        <div className="overflow-x-auto bg-gradient-to-b from-card to-canvas/30">
          <div className="inline-block min-w-full">
            {/* Time slot headers row - Sticky Top with solid background */}
            <div className="flex sticky top-0 z-20 border-b-2 border-line-soft bg-card">
              <div className="w-20 shrink-0 border-r-2 border-line-soft p-2 sticky left-0 z-30 bg-card" />
              {timeSlots.map((time, idx) => {
                const isHourStart = time.endsWith(":00");
                return (
                  <div
                    key={time}
                    className="w-20 shrink-0 border-r border-line-soft p-1.5 text-center last:border-r-0 bg-card"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-ink font-bold">
                      {isHourStart ? fmtTime(time) : <span className="font-mono opacity-60">{time}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Date rows */}
            {weekDays.map((day, dayIdx) => {
              const dayDate = new Date(day);
              const dayName = dayDate.toLocaleDateString('en-PK', { weekday: 'short' });
              const dayNum = dayDate.getDate();
              const isToday = day === today;
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const dayBookings = state.bookings.filter(
                (b) => b.date === day && b.status !== "cancelled"
              );
              const dayMaintenance = state.maintenanceSlots.filter((m) => m.date === day);

              return (
                <div
                  key={day}
                  className={cn(
                    "flex border-b border-line-soft last:border-b-0",
                    isToday && "bg-clay-soft/20",
                    isWeekend && !isToday && "bg-secondary/20"
                  )}
                >
                  {/* Date label - Compact - Sticky Left with solid background */}
                  <div
                    className={cn(
                      "w-20 shrink-0 border-r-2 border-line-soft p-2 sticky left-0 z-10 bg-card",
                      isToday && "bg-clay-soft/30"
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">
                      {dayName}
                    </div>
                    <div
                      className={cn(
                        "text-xl font-bold tabular mt-0.5",
                        isToday ? "text-clay" : "text-ink"
                      )}
                    >
                      {dayNum}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {dayBookings.length > 0 && (
                        <div className="text-[9px] font-semibold text-ink-mute">
                          {dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time slot cells - Compact with spanning bookings */}
                  {timeSlots.map((time, timeIdx) => {
                    const booking = getBookingAt(day, time);
                    const maintenance = getMaintenanceAt(day, time);

                    // Skip if this slot is part of a booking that's already been rendered (not the start)
                    if (booking && !isBookingStart(booking, time)) {
                      return null;
                    }

                    // Skip if this slot is part of maintenance that's already been rendered (not the start)
                    if (maintenance && maintenance.startTime !== time) {
                      return null;
                    }

                    // If there's a booking starting at this time, render the full booking block spanning multiple slots
                    if (booking && isBookingStart(booking, time)) {
                      const meta = STATUS_META[booking.status];
                      const cust = state.customers.find((c) => c.id === booking.customerId);
                      const span = getBookingSpan(booking);

                      return (
                        <div
                          key={time}
                          className={cn(
                            "shrink-0 border-r border-line-soft p-1 last:border-r-0",
                            meta?.bg
                          )}
                          style={{ width: `${span * 80}px` }} // 80px = w-20 (compact)
                        >
                          <button
                            onClick={() => setDrawer({ open: true, id: booking.id })}
                            className={cn(
                              "w-full h-full min-h-[40px] rounded border-l-4 p-1.5 text-left transition-all hover:shadow-md relative",
                              meta?.fg,
                              booking.status === 'completed' ? 'border-l-status-completed-fg' : 
                                booking.status === 'checked_in' ? 'border-l-status-checkedin-fg' :
                                booking.status === 'booked' ? 'border-l-status-booked-fg' :
                                booking.status === 'payment_submitted' ? 'border-l-status-payment-fg' :
                                booking.status === 'reserved' ? 'border-l-status-reserved-fg' : 'border-transparent'
                            )}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta?.dot)} />
                                <span className="text-[10px] font-bold truncate">
                                  {cust?.name || "Customer"}
                                </span>
                              </div>
                              <div className="text-[8px] opacity-75 truncate">
                                {booking.totalPlayers}p · Rs {booking.amount.toLocaleString("en-PK")}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    }

                    // If there's maintenance at this time, render it spanning multiple slots
                    if (maintenance && maintenance.startTime === time) {
                      const maintSpan = Math.ceil(
                        (timeToMins(maintenance.endTime) - timeToMins(maintenance.startTime)) / 30
                      );

                      return (
                        <div
                          key={time}
                          className="shrink-0 border-r border-line-soft p-1 last:border-r-0 bg-status-cancelled/10"
                          style={{ width: `${maintSpan * 80}px` }}
                        >
                          <div className="w-full min-h-[40px] rounded border-l-4 border-status-cancelled-fg bg-status-cancelled/5 p-1.5">
                            <div className="flex items-center gap-1 text-status-cancelled-fg">
                              <Wrench className="h-3 w-3 shrink-0" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">
                                Maint
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Empty cell - available for booking (white/clean)
                    return (
                      <div
                        key={time}
                        className="w-20 shrink-0 border-r border-line-soft last:border-r-0"
                      >
                        <button
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setSlotMenu({
                              open: true,
                              position: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                              date: day,
                              startTime: time,
                            });
                          }}
                          className="w-full h-full min-h-[40px] transition-all group"
                        >
                          <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-all">
                            <Plus className="h-3 w-3 text-status-available-fg" />
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-lg border border-line-soft bg-card/50 p-3 text-[11px] text-ink-mute">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-available-fg" />
          <span className="font-medium">Available</span>
        </div>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            <span className="font-medium">{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-cancelled-fg" />
          <span className="font-medium">Maintenance</span>
        </div>
      </div>

      <BookingDrawer
        open={drawer.open}
        bookingId={drawer.id}
        prefill={drawer.prefill}
        onClose={() => setDrawer({ open: false, id: null })}
      />

      <SlotMenu
        open={slotMenu.open}
        position={slotMenu.position}
        onReservation={() => {
          setDrawer({
            open: true,
            id: null,
            prefill: { courtId: "C-01", date: slotMenu.date, startTime: slotMenu.startTime },
          });
          setSlotMenu({ open: false, position: null, date: "", startTime: "" });
        }}
        onMaintenance={() => {
          setMaintenance({
            open: true,
            date: slotMenu.date,
            startTime: slotMenu.startTime,
          });
          setSlotMenu({ open: false, position: null, date: "", startTime: "" });
        }}
        onClose={() => setSlotMenu({ open: false, position: null, date: "", startTime: "" })}
      />

      <MaintenanceDrawer
        open={maintenance.open}
        date={maintenance.date}
        startTime={maintenance.startTime}
        onClose={() => setMaintenance({ open: false, date: "", startTime: "" })}
      />
    </>
  );
}