import { Activity, DollarSign, TrendingUp } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { StatCard } from "./StatCard";
import { SignalTable } from "./SignalTable";
import { TradeStreamProvider, useTradeStream } from "@/hooks/useTradeStream";

function DashboardContent() {
  const { ethTick, profit24h, signals } = useTradeStream();
  const activeSignals = signals.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="ETH Price"
            value={ethTick.price}
            numericValue={ethTick.price}
            format={(n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            delta={ethTick.changePct24h}
            icon={TrendingUp}
            accent="primary"
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
        </div>

        <SignalTable />
      </main>
    </div>
  );
}

export function DashboardPage() {
  return (
    <TradeStreamProvider>
      <div className="min-h-screen flex bg-background text-foreground">
        <AppSidebar />
        <DashboardContent />
      </div>
    </TradeStreamProvider>
  );
}
