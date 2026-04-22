import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppPageShell } from "@/components/dashboard/AppPageShell";
import { Button } from "@/components/ui/button";
import { runBacktestFor7Days } from "@/services/backtestEngine";
import { useTradeStream } from "@/hooks/useTradeStream";

interface BacktestResultState {
  totalSignals: number;
  winRatePercent: number;
  potentialPnLPercent: number;
  potentialPnLAbsolute: number;
  totalTrades: number;
}

function BacktestPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResultState | null>(null);
  const { isNotificationEnabled, atrMultiplier } = useTradeStream();

  const runBacktest = async () => {
    setRunning(true);
    try {
      const payload = await runBacktestFor7Days({ atrMultiplier, symbol: "ETHUSDT" });
      setResult({
        totalSignals: payload.totalSignals,
        winRatePercent: payload.winRatePercent,
        potentialPnLPercent: payload.potentialPnLPercent,
        potentialPnLAbsolute: payload.potentialPnLAbsolute,
        totalTrades: payload.totalTrades,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h1 className="text-lg font-semibold">Backtest Simulator (7 Days)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runs TradingAlgo against historical ETHUSDT 1m candles.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Telegram Alerts: {isNotificationEnabled ? "enabled" : "disabled"}
          </p>
          <Button size="sm" onClick={runBacktest} disabled={running}>
            {running ? "Running..." : "Run Backtest"}
          </Button>
        </div>

        {result ? (
          <div className="grid gap-1 text-sm text-muted-foreground">
            <p>Total Signals Generated: {result.totalSignals}</p>
            <p>Total Trades: {result.totalTrades}</p>
            <p>Win Rate: {result.winRatePercent.toFixed(2)}%</p>
            <p>Potential P/L: {result.potentialPnLPercent.toFixed(2)}%</p>
            <p>Absolute P/L: {result.potentialPnLAbsolute.toFixed(2)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/backtest")({
  component: () => (
    <AppPageShell>
      <BacktestPage />
    </AppPageShell>
  ),
});
