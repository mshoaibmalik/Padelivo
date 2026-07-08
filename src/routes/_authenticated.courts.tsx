import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wrench, MapPin, Layers, Plus } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { HOURS } from "@/data/seed";
import { fmtTime, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/courts")({
  head: () => ({
    meta: [
      { title: "Courts — Baseline" },
      { name: "description", content: "Manage club courts and facilities." },
    ],
  }),
  component: CourtsPage,
});

function CourtsPage() {
  const { state, dispatch } = useClub();
  const { settings } = useSettings();
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintDate, setMaintDate] = useState(todayISO());
  const [maintStart, setMaintStart] = useState(settings.openingTime || "07:00");
  const [maintEnd, setMaintEnd] = useState("08:00");
  const [maintReason, setMaintReason] = useState("");

  const courts = state.courts;
  const selected = courts.find((c) => c.id === selectedCourt) ?? courts[0];

  const courtBookings = useMemo(() => {
    if (!selected) return [];
    return state.bookings.filter(
      (b) => b.courtId === selected.id && b.status !== "cancelled",
    );
  }, [state.bookings, selected]);

  const courtMaintenance = useMemo(() => {
    if (!selected) return [];
    return state.maintenanceSlots.filter((m) => m.courtId === selected.id);
  }, [state.maintenanceSlots, selected]);

  const scheduleMaintenance = () => {
    if (!selected) return;
    if (maintStart >= maintEnd) {
      alert("End time must be after start time.");
      return;
    }
    dispatch({
      type: "create_maintenance_slot",
      slot: {
        id: `M-${Date.now()}`,
        courtId: selected.id,
        date: maintDate,
        startTime: maintStart,
        endTime: maintEnd,
        reason: maintReason || undefined,
      },
    });
    setShowMaintForm(false);
    setMaintReason("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="Court Management"
        description="View and manage all courts, their status, and scheduled maintenance."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Court list */}
        <div className="space-y-3">
          {courts.map((court) => {
            const isActive = court.status === "active";
            const bookings = state.bookings.filter(
              (b) => b.courtId === court.id && b.status !== "cancelled",
            );
            return (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court.id)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  selectedCourt === court.id || (!selectedCourt && court.id === courts[0].id)
                    ? "border-clay bg-clay-soft/10 shadow-sm"
                    : "border-line-soft bg-card hover:border-line",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-clay" />
                    <span className="font-display text-base font-semibold text-ink">
                      {court.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      isActive
                        ? "bg-status-available/20 text-status-available-fg"
                        : "bg-status-cancelled/20 text-status-cancelled-fg",
                    )}
                  >
                    {isActive ? "Active" : "Maintenance"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-ink-mute">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {court.surface}
                  </span>
                  <span>Rs {court.hourlyRate}/hr</span>
                </div>
                <div className="mt-2 text-[11px] text-ink-mute">
                  {bookings.length} active booking{bookings.length !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </div>

        {/* Court detail */}
        {selected && (
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-line-soft bg-card p-5 shadow-sm">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">{selected.name}</h2>
                <p className="text-sm text-ink-mute mt-0.5">
                  {selected.surface} court · Rs {selected.hourlyRate}/hr
                </p>
              </div>
            </div>

            {/* Maintenance slots */}
            <div className="rounded-xl border border-line-soft bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-status-cancelled-fg" />
                  Scheduled Maintenance
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMaintForm(!showMaintForm)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              </div>

              {showMaintForm && (
                <div className="mb-4 rounded-lg border border-line-soft bg-canvas/50 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                        Date
                      </div>
                      <input
                        type="date"
                        value={maintDate}
                        onChange={(e) => setMaintDate(e.target.value)}
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                        Reason (optional)
                      </div>
                      <input
                        value={maintReason}
                        onChange={(e) => setMaintReason(e.target.value)}
                        placeholder="e.g. Court resurfacing"
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                        Start Time
                      </div>
                      <select
                        value={maintStart}
                        onChange={(e) => setMaintStart(e.target.value)}
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {fmtTime(h)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                        End Time
                      </div>
                      <select
                        value={maintEnd}
                        onChange={(e) => setMaintEnd(e.target.value)}
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm text-ink focus:border-clay focus:outline-none"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {fmtTime(h)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowMaintForm(false)}>
                      Cancel
                    </Button>
                    <Button variant="clay" size="sm" onClick={scheduleMaintenance}>
                      Schedule Maintenance
                    </Button>
                  </div>
                </div>
              )}

              {courtMaintenance.length === 0 ? (
                <p className="text-sm text-ink-mute">No maintenance scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {courtMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-line-soft bg-status-cancelled/5 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-ink">{m.date}</div>
                        <div className="text-xs text-ink-mute">
                          {m.startTime} - {m.endTime}
                        </div>
                      </div>
                      {m.reason && (
                        <span className="text-xs text-ink-mute truncate max-w-[200px]">
                          {m.reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}