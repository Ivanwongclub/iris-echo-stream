import { LayoutDashboard, Activity, LineChart, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Signal History", icon: Activity, to: "/history" },
  { label: "Backtest", icon: LineChart, to: "/backtest" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path;
  };

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Kairos</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Trading System
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                onClick={() => {
                  onNavigate?.();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none",
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive(item.to) &&
                    "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="rounded-md bg-accent/50 p-3">
          <p className="text-xs font-medium text-foreground">Strategy v2.4</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Mean-reversion · ETH</p>
        </div>
      </div>
    </aside>
  );
}
