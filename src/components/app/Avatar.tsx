import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const hues = [15, 45, 90, 150, 200, 260, 320];
function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % hues.length;
  return hues[h];
}

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hue = hueFor(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `oklch(0.94 0.04 ${hue})`,
        color: `oklch(0.35 0.09 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}