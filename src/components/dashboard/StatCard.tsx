import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlashOnChange } from "@/hooks/useFlashOnChange";
import type { PriceChangeDirection } from "@/contexts/tradeStreamContext";

interface StatCardProps {
  label: string;
  value: number | string;
  numericValue?: number;
  format?: (n: number) => string;
  delta?: number;
  deltaSuffix?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "fuchsia";
  priceDirectionFlash?: PriceChangeDirection | null;
}

export function StatCard({
  label,
  value,
  numericValue,
  format,
  delta,
  deltaSuffix = "%",
  icon: Icon,
  accent = "primary",
  priceDirectionFlash,
}: StatCardProps) {
  const flashClass = useFlashOnChange(numericValue ?? 0);
  const directionClass =
    priceDirectionFlash === "up"
      ? "bg-green-500/10"
      : priceDirectionFlash === "down"
        ? "bg-red-500/10"
        : "";
  const display = typeof value === "number" && format ? format(value) : value;

  const accentBg =
    accent === "success"
      ? "bg-success/10 text-success"
      : accent === "fuchsia"
        ? "bg-fuchsia-accent/10 text-fuchsia-accent"
        : "bg-primary/10 text-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight rounded-sm px-1 -mx-1",
              flashClass,
              directionClass,
            )}
          >
            {display}
          </p>
        </div>
        <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", accentBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              delta >= 0 ? "text-success" : "text-fuchsia-accent",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
            {deltaSuffix}
          </span>
          <span className="text-xs text-muted-foreground">vs. 24h</span>
        </div>
      )}
    </div>
  );
}
