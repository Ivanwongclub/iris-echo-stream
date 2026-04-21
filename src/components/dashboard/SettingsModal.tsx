import { useMemo, useState } from "react";
import { Bolt, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useTradeStream } from "@/hooks/useTradeStream";
import { runBacktestFor7Days } from "../../services/backtestEngine";

interface BacktestResultState {
  totalSignals: number;
  totalTrades: number;
  winRatePercent: number;
  potentialPnLPercent: number;
  potentialPnLAbsolute: number;
  startTimestamp: number;
  endTimestamp: number;
}

export function SettingsModal() {
  const {
    status,
    isNotificationEnabled,
    clearSignalHistory,
    signalHistory,
    setAtrMultiplier,
    atrMultiplier,
    latestSignal,
  } = useTradeStream();
  const [backtestResult, setBacktestResult] = useState<BacktestResultState | null>(null);
  const [runningBacktest, setRunningBacktest] = useState(false);

  const memoryUsageMb = useMemo(() => {
    const memory = (window as { performance?: { memory?: { usedJSHeapSize: number } } }).performance?.memory;
    if (!memory) {
      return "N/A";
    }
    return `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`;
  }, []);

  const runBacktest = async () => {
    setRunningBacktest(true);
    try {
      const result = await runBacktestFor7Days({ atrMultiplier: atrMultiplier ?? 2.5, symbol: "ETHUSDT" });
      setBacktestResult(result);
    } finally {
      setRunningBacktest(false);
    }
  };

  const formattedLastSignal = latestSignal
    ? new Date(latestSignal.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "none";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Diagnostics, recovery controls, and backtest simulation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">System Diagnostics</CardTitle>
              <CardDescription>Operational visibility for live trading stream.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">WebSocket Latency:</span> {status.latencyMs}ms
              </p>
              <p>
                <span className="font-medium">Memory Usage:</span> {memoryUsageMb}
              </p>
              <p>
                <span className="font-medium">Last Signal Sent:</span> {formattedLastSignal}
              </p>
              <p>
                <span className="font-medium">Signals Cached:</span> {signalHistory.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signal Controls</CardTitle>
              <CardDescription>Tune stop/target behavior for stop alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="atr-multiplier" className="font-medium text-xs uppercase tracking-wide">
                    ATR Multiplier: {(atrMultiplier ?? 2.5).toFixed(2)}
                  </Label>
                  <span className="text-muted-foreground">(current)</span>
                </div>
                <Slider
                  id="atr-multiplier"
                  min={1}
                  max={4.5}
                  step={0.1}
                  value={[(atrMultiplier ?? 2.5)]}
                  onValueChange={(values) => {
                    if (!values[0]) return;
                    setAtrMultiplier(values[0]);
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant={isNotificationEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // keep compatibility for quick notification awareness
                  }}
                >
                  <Bolt className="h-4 w-4 mr-1" />
                  Notifications {isNotificationEnabled ? "Enabled" : "Disabled"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => clearSignalHistory()}
                  className="ml-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Backtest Simulator (7 Days)</CardTitle>
            <CardDescription>Runs TradingAlgo over historical 1m futures candles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button disabled={runningBacktest} onClick={runBacktest} size="sm">
              {runningBacktest ? "Running..." : "Run Backtest"}
            </Button>
            {backtestResult ? (
              <div className="grid gap-1 text-sm text-muted-foreground">
                <p>Total Signals Generated: {backtestResult.totalSignals}</p>
                <p>Potential P/L: {backtestResult.potentialPnLPercent.toFixed(2)}%</p>
                <p>Absolute P/L: {backtestResult.potentialPnLAbsolute.toFixed(2)}</p>
                <p>Win Rate: {backtestResult.winRatePercent.toFixed(2)}%</p>
                <p>
                  Window: {new Date(backtestResult.startTimestamp).toLocaleString()} —{' '}
                  {new Date(backtestResult.endTimestamp).toLocaleString()}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
