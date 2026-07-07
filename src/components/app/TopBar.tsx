import { Bell, Menu } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calendar": "Calendar",
  "/bookings": "Bookings",
  "/courts": "Courts",
  "/customers": "Customers",
  "/payments": "Payments",
  "/reports": "Reports",
};

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? "Dashboard";
  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line-soft bg-canvas/85 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenNav}
        className="grid h-9 w-9 place-items-center rounded-md text-ink-soft hover:bg-secondary lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <span className="text-sm text-ink-mute">Baseline</span>
        <span className="text-ink-mute">/</span>
        <span className="text-sm font-medium text-ink">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden text-right text-xs text-ink-mute md:block">
          <div className="tabular">{today}</div>
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-md text-ink-soft hover:bg-secondary">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
