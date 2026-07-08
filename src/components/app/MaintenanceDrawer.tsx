import { useState, useMemo } from "react";
import { X, Wrench } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { Button } from "@/components/app/Button";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  date: string;
  startTime: string;
  onClose: () => void;
};

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const minsToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export function MaintenanceDrawer({ open, date, startTime, onClose }: Props) {
  const { state, dispatch } = useClub();
  const [durationMins, setDurationMins] = useState(30);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const endTime = useMemo(() => {
    const startMins = timeToMins(startTime);
    return minsToTime(startMins + durationMins);
  }, [startTime, durationMins]);

  // Check for overlaps with bookings and other maintenance
  const hasConflict = useMemo(() => {
    const startMins = timeToMins(startTime);
    const endMins = timeToMins(endTime);

    // Check bookings
    const bookingConflict = state.bookings.some((b) => {
      if (b.date !== date || b.status === "cancelled") return false;
      const bStart = timeToMins(b.startTime);
      const bEnd = timeToMins(b.endTime);
      return !(endMins <= bStart || startMins >= bEnd);
    });

    // Check other maintenance
    const maintConflict = state.maintenanceSlots.some((m) => {
      if (m.date !== date) return false;
      const mStart = timeToMins(m.startTime);
      const mEnd = timeToMins(m.endTime);
      return !(endMins <= mStart || startMins >= mEnd);
    });

    return bookingConflict || maintConflict;
  }, [date, startTime, endTime, state.bookings, state.maintenanceSlots]);

  const handleSave = async () => {
    if (hasConflict) return;

    setSaving(true);
    try {
      const newMaintenance = {
        id: `M-${Date.now()}`,
        courtId: "C-01",
        date,
        startTime,
        endTime,
        reason: reason || "Court Maintenance",
      };

      dispatch({ type: "add_maintenance", maintenance: newMaintenance });
      onClose();
      setReason("");
      setDurationMins(30);
    } finally {
      setSaving(false);
    }
  };

  const durationOptions = [
    { label: "30 min", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "1.5 hours", value: 90 },
    { label: "2 hours", value: 120 },
    { label: "3 hours", value: 180 },
    { label: "4 hours", value: 240 },
    { label: "5 hours", value: 300 },
    { label: "6 hours", value: 360 },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-card border-2 border-line-soft shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-linear-to-r from-canvas to-secondary border-b border-line-soft px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-status-cancelled/10 p-2">
              <Wrench className="h-5 w-5 text-status-cancelled-fg" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Schedule Maintenance</h2>
              <p className="text-xs text-ink-mute">Court downtime booking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-mute hover:text-ink transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Maintenance Window */}
          <div className="rounded-lg bg-secondary/50 border border-line-soft p-4">
            <h3 className="text-xs font-semibold text-ink-mute uppercase mb-3">Maintenance Window</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">Date</span>
                <span className="font-semibold text-ink">{fmtDate(date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">Start Time</span>
                <span className="font-semibold text-ink">{fmtTime(startTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">End Time</span>
                <span className="font-semibold text-ink">{fmtTime(endTime)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-line-soft pt-2 mt-2">
                <span className="text-ink-mute">Duration</span>
                <span className="font-semibold text-ink">{durationMins} minutes</span>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDurationMins(opt.value)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                    durationMins === opt.value
                      ? "bg-clay text-white border-clay"
                      : "bg-card border-line-soft text-ink hover:bg-secondary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Court cleaning, repairs, inspection"
              className="w-full px-3 py-2 rounded-lg border border-line-soft bg-canvas text-ink placeholder-ink-mute focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>

          {/* Conflict Alert */}
          {hasConflict && (
            <div className="rounded-lg bg-status-cancelled/10 border border-status-cancelled-fg/20 p-3">
              <p className="text-sm text-status-cancelled-fg font-medium">
                ⚠️ This time slot conflicts with existing bookings or maintenance. Please select a different time.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-line-soft bg-canvas/50 px-6 py-4">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            size="md"
            onClick={handleSave}
            disabled={hasConflict || saving}
            className="flex-1"
          >
            {saving ? "Scheduling..." : "Schedule Maintenance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
