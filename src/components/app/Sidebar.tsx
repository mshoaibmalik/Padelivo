import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Avatar } from "./Avatar";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/courts", label: "Maintenance", icon: LayoutGrid },
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { manager, signOut } = useAuth();
  const { settings } = useSettings();

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <span className="font-display text-lg leading-none">P</span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base text-white/95">Padelivo</div>
          <div className="truncate text-[11px] text-white/50">{settings.clubName}</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3">
        <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
          Operations
        </div>
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-white/70 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <Avatar name={manager?.name ?? "Club Manager"} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white/90">{manager?.name}</div>
            <div className="truncate text-[11px] text-white/50">{manager?.email}</div>
          </div>
          <button
            onClick={signOut}
            className="rounded p-1.5 text-white/50 transition-colors hover:bg-sidebar-accent hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
