import { useTradeStream } from "@/hooks/useTradeStream";
import { cn } from "@/lib/utils";
import type { SignalStatus } from "@/services/types";

const fmtPrice = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(2);

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const statusStyles: Record<SignalStatus, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  PENDING: "bg-muted text-muted-foreground border-border",
  TP1_HIT: "bg-success/10 text-success border-success/20",
  SL_HIT: "bg-fuchsia-accent/10 text-fuchsia-accent border-fuchsia-accent/20",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<SignalStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  TP1_HIT: "TP1 Hit",
  SL_HIT: "SL Hit",
  CLOSED: "Closed",
};

export function SignalTable() {
  const { signalHistory, latestSignal } = useTradeStream();
  const latestSignalId = latestSignal?.id;

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Real-time Signals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live ETHUSDT Strategy · 1m Candles</p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {signalHistory.length} signals
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <th className="font-medium px-5 py-3">Time</th>
              <th className="font-medium px-3 py-3">Pair</th>
              <th className="font-medium px-3 py-3">Action</th>
              <th className="font-medium px-3 py-3 text-right">Entry</th>
              <th className="font-medium px-3 py-3 text-right">SL</th>
              <th className="font-medium px-3 py-3 text-right">TP1</th>
              <th className="font-medium px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {signalHistory.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors animate-fade-in"
              >
                <td className="px-5 py-3 text-muted-foreground tabular-nums text-xs">
                  {fmtTime(s.timestamp)}
                </td>
                <td className="px-3 py-3 font-medium">{s.pair}</td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold",
                      s.action === "LONG"
                        ? "bg-success/10 text-success"
                        : "bg-fuchsia-accent/10 text-fuchsia-accent",
                    )}
                  >
                    {s.action}
                    {s.id === latestSignalId ? (
                      <span className="ml-1 inline-flex items-center rounded border border-success/30 bg-success/20 text-success px-1 py-0.5 text-[9px] font-bold animate-pulse">
                        NEW
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{fmtPrice(s.entryPrice)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPrice(s.stopLoss)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPrice(s.takeProfit1)}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium",
                      statusStyles[s.status],
                    )}
                  >
                    {statusLabel[s.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
