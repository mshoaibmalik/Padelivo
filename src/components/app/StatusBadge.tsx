import { STATUS_META, type BookingStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: BookingStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        meta.bg,
        meta.fg,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}