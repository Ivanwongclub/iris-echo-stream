import { Bell, BellRing, Clock, Search } from "lucide-react";
import { useTradeStream } from "@/hooks/useTradeStream";
import { Button } from "@/components/ui/button";

export function Header() {
  const {
    status,
    isNotificationEnabled,
    setIsNotificationEnabled,
    activeStrategy,
    cooldownRemainingMs,
  } = useTradeStream();

  const cooldownMinutes = Math.floor(cooldownRemainingMs / 60000);
  const cooldownSeconds = Math.floor((cooldownRemainingMs % 60000) / 1000);
  const cooldownLabel =
    cooldownRemainingMs > 0
      ? `Cooldown Active • ${cooldownMinutes.toString().padStart(2, "0")}:${cooldownSeconds
          .toString()
          .padStart(2, "0")}`
      : null;

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

          <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-card text-xs text-muted-foreground">
            <span>Strategy:</span>
            <span
              className={
                activeStrategy === "LONG_ONLY"
                  ? "font-semibold text-success"
                  : "font-semibold text-fuchsia-accent"
              }
            >
              {activeStrategy === "LONG_ONLY" ? "LONG-ONLY (Bullish)" : "WAITING (Bearish Filter Active)"}
            </span>
            {cooldownLabel ? (
              <span className="ml-2 inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 px-2 py-0.5 gap-1">
                <Clock className="h-3 w-3" />
                {cooldownLabel}
              </span>
            ) : null}
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

          <Button
            onClick={() => setIsNotificationEnabled(!isNotificationEnabled)}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={isNotificationEnabled ? "Disable Telegram notifications" : "Enable Telegram notifications"}
            title={isNotificationEnabled ? "Mute Telegram" : "Unmute Telegram"}
          >
            {isNotificationEnabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </Button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-fuchsia-accent" />
        </div>
      </div>
    </header>
  );
}
