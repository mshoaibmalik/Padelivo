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
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-line bg-card">
              <button
                onClick={() => setDate(addDaysISO(date, -1))}
                className="grid h-9 w-9 place-items-center text-ink-mute hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="w-40 border-x border-line px-3 text-center text-sm text-ink tabular">
                {fmtDate(date)}
              </div>
              <button
                onClick={() => setDate(addDaysISO(date, 1))}
                className="grid h-9 w-9 place-items-center text-ink-mute hover:text-ink"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setDate(todayISO())}>Today</Button>
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
              className="border-b border-l border-line-soft p-3 text-sm"
            >
              <div className="text-ink">{c.name}</div>
              <div className="text-[11px] text-ink-mute">
                {c.surface} · Rs {c.hourlyRate.toLocaleString("en-PK")}/hr
                {c.status === "maintenance" && (
                  <span className="ml-2 rounded bg-status-cancelled px-1.5 py-0.5 text-[10px] text-status-cancelled-fg">
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
            return (
              <div key={h} className="contents">
                <div className="sticky left-0 z-10 border-b border-line-soft bg-card px-3 py-2 text-xs text-ink-mute tabular">
                  {fmtTime(h)}
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
                        className="relative border-b border-l border-line-soft bg-status-cancelled/10 px-2 py-2 text-left text-[11px]"
                      >
                        {showNowLine && (
                          <span className="absolute left-0 right-0 top-0 h-px bg-clay" />
                        )}
                        <div className="flex items-center gap-1 text-status-cancelled">
                          <Wrench className="h-3 w-3" />
                          <span className="font-medium">Maintenance</span>
                        </div>
                        {maintenance.reason && (
                          <div className="mt-0.5 text-[10px] text-ink-mute">{maintenance.reason}</div>
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
                        "relative border-b border-l border-line-soft px-2 py-2 text-left text-[11px] transition-colors",
                        b
                          ? `${meta?.bg} ${meta?.fg} hover:brightness-95`
                          : "bg-card text-ink-mute hover:bg-secondary",
                        isDisabled && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {showNowLine && (
                        <span className="absolute left-0 right-0 top-0 h-px bg-clay" />
                      )}
                      {b ? (
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {state.customers.find((cu) => cu.id === b.customerId)?.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] opacity-70">
                            {b.id}
                          </div>
                        </div>
                      ) : (
                        <span className="opacity-60">Available</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-mute">
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
            <span className={cn("h-2 w-2 rounded-sm", STATUS_META[s].bg)} />
            {STATUS_META[s].label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-status-cancelled/30" />
          Maintenance
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