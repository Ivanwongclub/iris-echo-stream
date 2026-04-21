import { Bell, Search } from "lucide-react";
import { useTradeStream } from "@/hooks/useTradeStream";
import { Button } from "@/components/ui/button";

export function Header() {
  const { status } = useTradeStream();
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Trading Dashboard</h1>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            Real-time market & signals
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md bg-muted text-muted-foreground text-sm">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search pairs…</span>
          </div>

          <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-card">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success animate-pulse-dot" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs font-medium">
              {status.connected ? "Live" : "Offline"}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {status.latencyMs}ms
            </span>
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-fuchsia-accent" />
        </div>
      </div>
    </header>
  );
}
