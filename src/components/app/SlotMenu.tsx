import { motion } from "framer-motion";
import { Calendar, Wrench } from "lucide-react";

type Props = {
  open: boolean;
  position: { x: number; y: number } | null;
  onReservation: () => void;
  onMaintenance: () => void;
  onClose: () => void;
};

export function SlotMenu({ open, position, onReservation, onMaintenance, onClose }: Props) {
  if (!open || !position) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />
      
      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed z-40 bg-card border border-line-soft rounded-lg shadow-2xl overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <button
          onClick={() => {
            onReservation();
            onClose();
          }}
          className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 border-b border-line-soft"
        >
          <Calendar className="h-4 w-4 text-clay shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">Reservation</div>
            <div className="text-xs text-ink-mute">Book court slot</div>
          </div>
        </button>

        <button
          onClick={() => {
            onMaintenance();
            onClose();
          }}
          className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
        >
          <Wrench className="h-4 w-4 text-status-cancelled-fg shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">Maintenance</div>
            <div className="text-xs text-ink-mute">Schedule downtime</div>
          </div>
        </button>
      </motion.div>
    </>
  );
}
