import { createFileRoute } from "@tanstack/react-router";
import { AppPageShell } from "@/components/dashboard/AppPageShell";
import { SignalTable } from "@/components/dashboard/SignalTable";
import { useTradeStream } from "@/hooks/useTradeStream";

function HistoryPage() {
  const { ethPrice, ethTick, signalHistory, priceChangeDirection, profit24h } = useTradeStream();
  const activeSignals = signalHistory.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="flex-1 flex flex-col min-w-0 p-6 space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h1 className="text-lg font-semibold">Signal History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All active and closed strategy signals for the current session.
        </p>
      </div>
      <SignalTable />
      <p className="text-xs text-muted-foreground">
        Live price: {ethPrice.toFixed(2)} · {priceChangeDirection} · active signals: {activeSignals} ·
        24h change: {ethTick.changePct24h.toFixed(2)}% · profit: {profit24h.toFixed(2)}
      </p>
    </div>
  );
}

export const Route = createFileRoute("/history")({
  component: () => (
    <AppPageShell>
      <HistoryPage />
    </AppPageShell>
  ),
});
