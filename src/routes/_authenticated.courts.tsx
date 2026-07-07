import { createFileRoute } from "@tanstack/react-router";
import { Wrench, MapPin, Plus, X, Calendar } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { PKR, todayISO, addDaysISO } from "@/lib/format";
import { HOURS_OF_DAY } from "@/data/seed";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/courts")({
  head: () => ({
    meta: [
      { title: "Courts — Baseline" },
      { name: "description", content: "Court roster, status and utilisation." },
    ],
  }),
  component: CourtsPage,
});

function CourtsPage() {
  const { state, dispatch } = useClub();
  const today = todayISO();
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(state.courts[0]?.id ?? "");
  const [maintenanceDate, setMaintenanceDate] = useState(today);
  const [maintenanceStart, setMaintenanceStart] = useState("08:00");
  const [maintenanceEnd, setMaintenanceEnd] = useState("10:00");
  const [maintenanceReason, setMaintenanceReason] = useState("");

  const handleScheduleMaintenance = () => {
    if (!selectedCourt || !maintenanceDate || !maintenanceStart || !maintenanceEnd) return;
    
    const slot = {
      id: `M-${Date.now()}`,
      courtId: selectedCourt,
      date: maintenanceDate,
      startTime: maintenanceStart,
      endTime: maintenanceEnd,
      reason: maintenanceReason || undefined,
    };
    
    dispatch({ type: "create_maintenance_slot", slot });
    setShowMaintenanceForm(false);
    setMaintenanceReason("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Courts"
        title="Four courts, one club"
        description="Toggle maintenance, check today's flow, review capacity per court."
      />

      {showMaintenanceForm && (
        <div className="mt-6 rounded-lg border border-line-soft bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-ink">
              Schedule Maintenance - {state.courts.find(c => c.id === selectedCourt)?.name}
            </h3>
            <button
              onClick={() => setShowMaintenanceForm(false)}
              className="text-ink-mute hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Court is pre-selected from the court card, so we don't show the selector */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Date *
              </label>
              <input
                type="date"
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)}
                min={today}
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Start Time *
              </label>
              <select
                value={maintenanceStart}
                onChange={(e) => setMaintenanceStart(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {HOURS_OF_DAY.slice(0, -1).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                End Time *
              </label>
              <select
                value={maintenanceEnd}
                onChange={(e) => setMaintenanceEnd(e.target.value)}
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {HOURS_OF_DAY.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
                Reason (optional)
              </label>
              <input
                type="text"
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="e.g., Court resurfacing, equipment repair"
                className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowMaintenanceForm(false);
                setMaintenanceReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="clay"
              onClick={handleScheduleMaintenance}
              disabled={!selectedCourt || !maintenanceDate || maintenanceEnd <= maintenanceStart}
            >
              Schedule Maintenance
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {state.courts.map((c) => {
          const todays = state.bookings.filter(
            (b) => b.date === today && b.courtId === c.id && b.status !== "cancelled"
          );
          const revenue = todays
            .filter((b) => b.status !== "reserved")
            .reduce((s, b) => s + b.amount, 0);
          const available = HOURS_OF_DAY.length - todays.length;
          const maint = c.status === "maintenance";
          return (
            <Card key={c.id} className="overflow-hidden">
              <div
                className={cn(
                  "h-24 border-b border-line-soft",
                  c.surface === "Indoor"
                    ? "bg-[linear-gradient(135deg,oklch(0.32_0.02_60),oklch(0.22_0.02_60))]"
                    : "bg-[linear-gradient(135deg,oklch(0.55_0.13_40),oklch(0.4_0.1_40))]"
                )}
              >
                <div className="flex h-full flex-col justify-between p-4 text-white/90">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-white/60">
                    <MapPin className="h-3 w-3" /> {c.surface}
                  </div>
                  <div className="font-display text-2xl tracking-tight text-white">{c.name}</div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      maint
                        ? "bg-status-cancelled text-status-cancelled-fg"
                        : "bg-status-available text-status-available-fg"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        maint ? "bg-status-cancelled-fg" : "bg-status-available-fg"
                      )}
                    />
                    {maint ? "Maintenance" : "Active"}
                  </span>
                  <span className="font-mono text-xs text-ink">{PKR(c.hourlyRate)}/hr</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4">
                  <Stat label="Bookings" value={todays.length} />
                  <Stat label="Available" value={available} />
                  <Stat label="Revenue" value={PKR(revenue).replace("Rs ", "")} mono />
                </div>
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => {
                    setSelectedCourt(c.id);
                    setShowMaintenanceForm(!showMaintenanceForm);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule Maintenance
                </Button>
                
                {/* Show upcoming maintenance for this court */}
                {state.maintenanceSlots
                  .filter((s) => s.courtId === c.id)
                  .slice(0, 3)
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="mt-2 rounded-md border border-status-cancelled/30 bg-status-cancelled/5 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-status-cancelled">Scheduled Maintenance</span>
                        <button
                          onClick={() => dispatch({ type: "delete_maintenance_slot", slotId: slot.id })}
                          className="text-ink-mute hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="mt-1 text-ink-mute">
                        {slot.date} · {slot.startTime} - {slot.endTime}
                      </div>
                      {slot.reason && <div className="mt-0.5 text-ink-mute">{slot.reason}</div>}
                    </div>
                  ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className={cn("text-lg text-ink tabular", mono ? "font-mono" : "font-display")}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-mute">{label}</div>
    </div>
  );
}