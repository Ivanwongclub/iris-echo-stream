export type SignalAction = "LONG" | "SHORT";
export type SignalStatus = "ACTIVE" | "TP1_HIT" | "SL_HIT" | "CLOSED" | "PENDING";

export interface TradeSignal {
  id: string;
  timestamp: number;
  pair: string;
  action: SignalAction;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  status: SignalStatus;
}

export interface PriceTick {
  symbol: string;
  price: number;
  prevPrice: number;
  changePct24h: number;
  timestamp: number;
}

export interface SystemStatus {
  connected: boolean;
  latencyMs: number;
  lastTickAt: number | null;
  connectionState: "connected" | "disconnected" | "reconnecting";
}

export interface DashboardState {
  ethTick: PriceTick;
  signals: TradeSignal[];
  profit24h: number;
  status: SystemStatus;
}
