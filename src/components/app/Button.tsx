import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "clay";
type Size = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-clay/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
        variant === "primary" && "bg-ink text-primary-foreground hover:bg-ink/90",
        variant === "secondary" && "border border-line bg-card text-ink hover:bg-secondary",
        variant === "ghost" && "text-ink-soft hover:bg-secondary hover:text-ink",
        variant === "danger" &&
          "border border-destructive/30 bg-card text-destructive hover:bg-destructive/10",
        variant === "clay" && "bg-clay text-white hover:bg-clay/90",
        className,
      )}
      {...rest}
    />
  );
}
