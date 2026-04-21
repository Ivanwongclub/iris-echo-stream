import { Activity, DollarSign, TrendingUp } from "lucide-react";
import { Header } from "./Header";
import { StatCard } from "./StatCard";
import { SignalTable } from "./SignalTable";
import { useTradeStream } from "@/hooks/useTradeStream";
import { AppPageShell } from "./AppPageShell";

function DashboardContent() {
  const {
    ethPrice,
    ethTick,
    profit24h,
    signalHistory,
    priceChangeDirection,
    trendStrengthPercent,
    trendStrengthDirection,
    trendStrengthReady,
  } = useTradeStream();
  const activeSignals = signalHistory.filter((s) => s.status === "ACTIVE").length;
  const trendStrengthLabel = trendStrengthReady
    ? trendStrengthDirection === "UP"
      ? `上方 ${trendStrengthPercent.toFixed(2)}%`
      : trendStrengthDirection === "DOWN"
        ? `下方 ${trendStrengthPercent.toFixed(2)}%`
        : `平盤 ${trendStrengthPercent.toFixed(2)}%`
    : "EMA 未就緒";
  const trendBarClass =
    trendStrengthDirection === "UP"
      ? "bg-success"
      : trendStrengthDirection === "DOWN"
        ? "bg-fuchsia-accent"
        : "bg-muted";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="ETH Price"
            value={ethPrice}
            numericValue={ethPrice}
            format={(n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            delta={ethTick.changePct24h}
            icon={TrendingUp}
            accent="primary"
            priceDirectionFlash={priceChangeDirection}
          />
          <StatCard
            label="24h Profit"
            value={profit24h}
            numericValue={profit24h}
            format={(n) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            delta={(profit24h / 10000) * 100}
            icon={DollarSign}
            accent="success"
          />
          <StatCard
            label="Active Signals"
            value={activeSignals}
            numericValue={activeSignals}
            format={(n) => String(n)}
            icon={Activity}
            accent="fuchsia"
          />
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trend Strength</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight mt-2">
              {trendStrengthLabel}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${trendBarClass}`}
                style={{ width: `${Math.min(trendStrengthPercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Price distance from EMA200</p>
          </div>
        </div>

        <SignalTable />
      </main>
    </div>
  );
}

export function DashboardPage() {
  return <AppPageShell><DashboardContent /></AppPageShell>;
}
