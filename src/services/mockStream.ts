import type { DashboardState, TradeSignal, SignalAction, SignalStatus } from "./types";

const PAIRS = ["ETH/USDT", "BTC/USDT", "SOL/USDT", "ARB/USDT", "LINK/USDT"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomSignal(now: number): TradeSignal {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const action: SignalAction = Math.random() > 0.5 ? "LONG" : "SHORT";
  const entry = pair.startsWith("ETH")
    ? rand(3200, 3600)
    : pair.startsWith("BTC")
      ? rand(60000, 70000)
      : rand(20, 250);
  const slPct = 0.015;
  const tpPct = 0.025;
  const stopLoss = action === "LONG" ? entry * (1 - slPct) : entry * (1 + slPct);
  const takeProfit1 = action === "LONG" ? entry * (1 + tpPct) : entry * (1 - tpPct);
  const statuses: SignalStatus[] = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING", "TP1_HIT", "SL_HIT"];
  return {
    id: `sig_${now}_${Math.floor(Math.random() * 9999)}`,
    timestamp: now,
    pair,
    action,
    entryPrice: entry,
    stopLoss,
    takeProfit1,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  };
}

export function createInitialState(): DashboardState {
  const now = Date.now();
  const ethPrice = 3450.25;
  const seedSignals: TradeSignal[] = Array.from({ length: 6 }, (_, i) =>
    randomSignal(now - i * 60_000),
  );
  return {
    ethTick: {
      symbol: "ETH/USDT",
      price: ethPrice,
      prevPrice: ethPrice,
      changePct24h: 2.34,
      timestamp: now,
    },
    signals: seedSignals,
    profit24h: 1284.52,
    status: { connected: true, latencyMs: 42, lastTickAt: now },
  };
}

export function nextState(state: DashboardState): DashboardState {
  const now = Date.now();
  const drift = rand(-0.004, 0.004);
  const newPrice = +(state.ethTick.price * (1 + drift)).toFixed(2);
  const profitDelta = rand(-25, 35);
  const shouldAddSignal = Math.random() < 0.35;
  const signals = shouldAddSignal
    ? [randomSignal(now), ...state.signals].slice(0, 12)
    : state.signals;

  return {
    ethTick: {
      symbol: "ETH/USDT",
      price: newPrice,
      prevPrice: state.ethTick.price,
      changePct24h: +(state.ethTick.changePct24h + rand(-0.05, 0.05)).toFixed(2),
      timestamp: now,
    },
    signals,
    profit24h: +(state.profit24h + profitDelta).toFixed(2),
    status: {
      connected: true,
      latencyMs: Math.round(rand(28, 88)),
      lastTickAt: now,
    },
  };
}
