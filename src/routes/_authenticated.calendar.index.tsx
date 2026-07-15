import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Plus } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { STATUS_META } from "@/lib/status";
import { addDaysISO, fmtDate, fmtTime, todayISO, getWeekStart } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Court } from "@/data/seed";
import { BookingDrawer } from "@/components/app/BookingDrawer";
import { MaintenanceDrawer } from "@/components/app/MaintenanceDrawer";
import { SlotMenu } from "@/components/app/SlotMenu";

export const Route = createFileRoute("/_authenticated/calendar/")({
  head: () => ({
    meta: [
      { title: "Daily Calendar — Baseline" },
      { name: "description", content: "Daily multi-court overview." },
    ],
  }),
  component: MultiCourtCalendarPage,
});

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

function MultiCourtCalendarPage() {
  const { state } = useClub();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState<{ courtId?: string; date?: string; startTime?: string }>({});
  const [isMaintenanceDrawerOpen, setIsMaintenanceDrawerOpen] = useState(false);
  const [maintenancePrefill, setMaintenancePrefill] = useState<{ courtId?: string; date?: string; startTime?: string }>({});
  
  // Slot menu state - matching single court view pattern
  const [slotMenu, setSlotMenu] = useState<{
    open: boolean;
    position: { x: number; y: number } | null;
    courtId: string;
    date: string;
    startTime: string;
  }>({ open: false, position: null, courtId: "", date: "", startTime: "" });

  const courts = state.courts.filter(c => c.status !== "disabled").sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const timeSlots = useMemo(() => {
    const startMins = timeToMins(settings.openingTime || "07:00");
    const endMins = timeToMins(settings.closingTime || "23:00");
    const list: string[] = [];
    for (let m = startMins; m < endMins; m += 30) {
      list.push(minsToTime(m));
    }
    return list;
  }, [settings.openingTime, settings.closingTime]);

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(addDaysISO(currentDate, direction === "prev" ? -1 : 1));
  };

  const getBookingAt = (courtId: string, time: string) => {
    return state.bookings.find((b) => {
      if (b.courtId !== courtId || b.date !== currentDate || b.status === "cancelled") return false;
      const timeMins = timeToMins(time);
      const startMins = timeToMins(b.startTime);
      const endMins = timeToMins(b.endTime);
      return timeMins >= startMins && timeMins < endMins;
    });
  };

  const getMaintenanceAt = (courtId: string, time: string) => {
    return state.maintenanceSlots.find((m) => {
      if (m.courtId !== courtId || m.date !== currentDate) return false;
      const timeMins = timeToMins(time);
      const startMins = timeToMins(m.startTime);
      const endMins = timeToMins(m.endTime);
      return timeMins >= startMins && timeMins < endMins;
    });
  };

  const isBookingStart = (booking: any, time: string) => booking.startTime === time;
  const getBookingSpan = (booking: any) => {
    const startMins = timeToMins(booking.startTime);
    const endMins = timeToMins(booking.endTime);
    return Math.ceil((endMins - startMins) / 30);
  };

  return (
    <>
      <PageHeader
        eyebrow="Court Scheduler"
        title="Daily Multi-Court Overview"
        description="View all courts side-by-side for a specific day."
        actions={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate("prev")}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setCurrentDate(todayISO())}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  "border border-line bg-card text-ink hover:bg-secondary"
                )}
              >
                Today
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate("next")}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line-soft bg-card px-3 py-2">
              <div className="text-sm font-medium text-ink">
                {fmtDate(currentDate)}
              </div>
            </div>
          </div>
        }
      />

      <div className="mt-6 overflow-hidden rounded-2xl border-2 border-line-soft bg-card shadow-xl">
        <div className="overflow-x-auto bg-gradient-to-b from-card to-canvas/30">
          <div className="inline-block min-w-full">
            {/* Headers: Times (left) + Courts */}
            <div className="flex sticky top-0 z-20 border-b-2 border-line-soft bg-card">
              <div className="w-20 shrink-0 border-r-2 border-line-soft p-2 sticky left-0 z-30 bg-card flex flex-col justify-end items-center pb-2">
                <span className="text-[10px] font-bold text-ink-mute uppercase">Time</span>
              </div>
              
              {courts.map(court => (
                <div 
                  key={court.id} 
                  className="w-48 shrink-0 border-r border-line-soft p-3 last:border-r-0 cursor-pointer hover:bg-clay-soft/10 transition-colors"
                  onClick={() => navigate({ to: `/calendar/${court.id}` })}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-semibold text-ink line-clamp-1">{court.name}</span>
                    <div 
                      className="w-2.5 h-2.5 rounded-full border border-line"
                      style={{ backgroundColor: court.courtColor || '#ccc' }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-mute">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded font-medium",
                      court.surface === "Indoor" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    )}>
                      {court.surface}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-ink-mute flex justify-between">
                    <span>Res: {court.residentPrice}</span>
                    <span>Out: {court.outsiderPrice}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots rows */}
            {timeSlots.map(time => {
              const isHourStart = time.endsWith(":00");
              return (
                <div key={time} className="flex border-b border-line-soft last:border-b-0 h-12">
                  {/* Time label */}
                  <div className={cn(
                    "w-20 shrink-0 border-r-2 border-line-soft p-2 sticky left-0 z-10 bg-card flex items-start justify-center pt-1.5",
                    isHourStart ? "" : "text-ink-mute/50"
                  )}>
                    <span className={cn("text-[10px] font-bold", isHourStart ? "text-ink" : "")}>
                      {isHourStart ? fmtTime(time) : <span className="font-mono">{time}</span>}
                    </span>
                  </div>

                  {/* Courts slots */}
                  {courts.map(court => {
                    const booking = getBookingAt(court.id, time);
                    const maintenance = getMaintenanceAt(court.id, time);

                    if (booking && !isBookingStart(booking, time)) return null;
                    if (maintenance && maintenance.startTime !== time) return null;

                    if (booking && isBookingStart(booking, time)) {
                      const meta = STATUS_META[booking.status];
                      const cust = state.customers.find((c) => c.id === booking.customerId);
                      const span = getBookingSpan(booking);
                      
                      return (
                        <div
                          key={`${court.id}-${time}`}
                          className={cn("w-48 shrink-0 border-r border-line-soft p-1 last:border-r-0 relative z-10", meta?.bg)}
                          style={{ height: `${span * 48}px` }} // 48px is row height (h-12)
                        >
                          <div className={cn(
                              "w-full h-full rounded border-l-4 p-1.5 flex flex-col gap-0.5",
                              meta?.fg,
                              booking.status === 'completed' ? 'border-l-status-completed-fg' : 
                                booking.status === 'checked_in' ? 'border-l-status-checkedin-fg' :
                                booking.status === 'booked' ? 'border-l-status-booked-fg' :
                                booking.status === 'payment_submitted' ? 'border-l-status-payment-fg' :
                                booking.status === 'reserved' ? 'border-l-status-reserved-fg' : 'border-transparent'
                            )}>
                            <div className="flex items-center gap-1">
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta?.dot)} />
                              <span className="text-[10px] font-bold truncate">{cust?.name || "Customer"}</span>
                            </div>
                            <div className="text-[9px] opacity-75 truncate">
                              {booking.totalPlayers}p · Rs {booking.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (maintenance && maintenance.startTime === time) {
                      const span = Math.ceil((timeToMins(maintenance.endTime) - timeToMins(maintenance.startTime)) / 30);
                      return (
                        <div
                          key={`${court.id}-${time}`}
                          className="w-48 shrink-0 border-r border-line-soft p-1 last:border-r-0 bg-status-cancelled/10 relative z-10"
                          style={{ height: `${span * 48}px` }}
                        >
                          <div className="w-full h-full rounded border-l-4 border-status-cancelled-fg bg-status-cancelled/5 p-1.5">
                            <span className="text-[10px] font-bold text-status-cancelled-fg uppercase">Maint</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={`${court.id}-${time}`} 
                        className="w-48 shrink-0 border-r border-line-soft last:border-r-0 hover:bg-clay-soft/20 transition-colors cursor-pointer relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          setSlotMenu({
                            open: true,
                            position: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                            courtId: court.id,
                            date: currentDate,
                            startTime: time,
                          });
                        }}
                      >
                        {/* Show + icon on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="h-8 w-8 rounded-full bg-clay text-white flex items-center justify-center shadow-lg">
                            <Plus className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Drawer */}
      <BookingDrawer
        open={isBookingDrawerOpen}
        onClose={() => {
          setIsBookingDrawerOpen(false);
          setBookingPrefill({});
        }}
        prefill={bookingPrefill}
      />

      {/* Maintenance Drawer */}
      {isMaintenanceDrawerOpen && maintenancePrefill.courtId && (
        <MaintenanceDrawer
          open={isMaintenanceDrawerOpen}
          courtId={maintenancePrefill.courtId}
          date={maintenancePrefill.date || todayISO()}
          startTime={maintenancePrefill.startTime || "18:00"}
          onClose={() => {
            setIsMaintenanceDrawerOpen(false);
            setMaintenancePrefill({});
          }}
        />
      )}

      {/* Slot Menu - matching single court view pattern */}
      <SlotMenu
        open={slotMenu.open}
        position={slotMenu.position}
        onReservation={() => {
          setBookingPrefill({
            courtId: slotMenu.courtId,
            date: slotMenu.date,
            startTime: slotMenu.startTime,
          });
          setIsBookingDrawerOpen(true);
          setSlotMenu({ open: false, position: null, courtId: "", date: "", startTime: "" });
        }}
        onMaintenance={() => {
          setMaintenancePrefill({
            courtId: slotMenu.courtId,
            date: slotMenu.date,
            startTime: slotMenu.startTime,
          });
          setIsMaintenanceDrawerOpen(true);
          setSlotMenu({ open: false, position: null, courtId: "", date: "", startTime: "" });
        }}
        onClose={() => setSlotMenu({ open: false, position: null, courtId: "", date: "", startTime: "" })}
      />
    </>
  );
}
