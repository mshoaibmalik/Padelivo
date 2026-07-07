import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { value: string; positive: boolean };
  icon?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-5 transition-colors",
        emphasis ? "border-clay/30 bg-clay-soft/40" : "border-line-soft hover:border-line"
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-mute">
          {label}
        </span>
        {icon && <div className="text-ink-mute">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl tracking-tight text-ink tabular">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium tabular",
              trend.positive ? "text-status-available-fg" : "text-destructive"
            )}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-mute">{sub}</div>}
    </div>
  );
}