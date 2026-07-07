import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line-soft bg-card", className)} {...rest} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-line-soft px-5 py-4">
      <div>
        <div className="font-display text-base text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-ink-mute">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
