import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  subscribeLatestKline,
  stopBinanceStream,
  type KlineUpdate,
} from "../../services/binanceStream";
import { analyzeCurrentMarket } from "../../services/tradingAlgo";
import { sendSignalAlert } from "../../services/telegramService";
import type { PriceTick, SystemStatus, TradeSignal } from "@/services/types";

export type PriceChangeDirection = "up" | "down";

interface TradeStreamContextValue {
  ethPrice: number;
  priceChangeDirection: PriceChangeDirection;
  latestSignal: TradeSignal | null;
  signalHistory: TradeSignal[];
  activeStrategy: "LONG_ONLY" | "WAITING";
  cooldownRemainingMs: number;
  signals: TradeSignal[];
  ethTick: PriceTick;
  profit24h: number;
  status: SystemStatus;
  isLive: boolean;
  isNotificationEnabled: boolean;
  setIsNotificationEnabled: (enabled: boolean) => void;
  clearSignalHistory: () => void;
}

const TradeStreamContext = createContext<TradeStreamContextValue | null>(null);

const SIGNAL_HISTORY_STORAGE_KEY = "iris-echo-stream:signal-history";
const MAX_SIGNAL_HISTORY = 20;
const SIGNAL_LOCK_MS = 15 * 60 * 1000;
const ETH_USDT_PAIR = "ETH/USDT";

function normalizePair(symbol: string): string {
  if (symbol.includes("/")) {
    return symbol;
  }
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol || ETH_USDT_PAIR;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function toSignal(value: unknown): TradeSignal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : null;
  const timestamp =
    typeof item.timestamp === "number" && Number.isFinite(item.timestamp) ? item.timestamp : null;
  const pair = typeof item.pair === "string" ? item.pair : null;
  const action = item.action === "LONG" || item.action === "SHORT" ? item.action : "LONG";
  const entryPrice =
    typeof item.entryPrice === "number" && Number.isFinite(item.entryPrice) ? item.entryPrice : null;
  const stopLoss =
    typeof item.stopLoss === "number" && Number.isFinite(item.stopLoss) ? item.stopLoss : null;
  const takeProfit1 =
    typeof item.takeProfit1 === "number" && Number.isFinite(item.takeProfit1)
      ? item.takeProfit1
      : null;
  const rawStatus = item.status;
  const status =
    rawStatus === "ACTIVE" ||
    rawStatus === "TP1_HIT" ||
    rawStatus === "SL_HIT" ||
    rawStatus === "CLOSED" ||
    rawStatus === "PENDING"
      ? rawStatus
      : "ACTIVE";

  if (
    !id ||
    timestamp === null ||
    !pair ||
    entryPrice === null ||
    stopLoss === null ||
    takeProfit1 === null
  ) {
    return null;
  }

  return {
    id,
    timestamp,
    pair,
    action,
    entryPrice,
    stopLoss,
    takeProfit1,
    status,
  };
}

function loadSignalHistory(): TradeSignal[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SIGNAL_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(toSignal)
      .filter((signal): signal is TradeSignal => signal !== null)
      .slice(0, MAX_SIGNAL_HISTORY);
  } catch {
    return [];
  }
}

function normalizeSignalFromMarket(market: ReturnType<typeof analyzeCurrentMarket>): TradeSignal {
  const atr =
    typeof market.atr14 === "number" && Number.isFinite(market.atr14)
      ? market.atr14
      : Math.max(market.currentPrice * 0.01, 0.01);

  return {
    id: `${market.symbol}-${market.timestamp}`,
    timestamp: market.timestamp,
    pair: normalizePair(market.symbol),
    action: "LONG",
    entryPrice: round2(market.currentPrice),
    stopLoss: round2(market.currentPrice - atr * 1.2),
    takeProfit1: round2(market.currentPrice + atr * 2.4),
    status: "ACTIVE",
  };
}

function buildSignalAlertPayload(market: ReturnType<typeof analyzeCurrentMarket>): Parameters<
  typeof sendSignalAlert
>[0] {
  const tradeSignal = normalizeSignalFromMarket(market);

  return {
    ...market,
    pair: tradeSignal.pair,
    symbol: tradeSignal.pair,
    currentPrice: tradeSignal.entryPrice,
    timestamp: tradeSignal.timestamp,
    entryPrice: tradeSignal.entryPrice,
    stopLoss: tradeSignal.stopLoss,
    takeProfit1: tradeSignal.takeProfit1,
    status: tradeSignal.status,
  };
}

export function TradeStreamProvider({ children }: { children: ReactNode }) {
  const initialSignalHistory = loadSignalHistory();
  const [ethPrice, setEthPrice] = useState(0);
  const [priceChangeDirection, setPriceChangeDirection] =
    useState<PriceChangeDirection>("up");
  const [latestSignal, setLatestSignal] = useState<TradeSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradeSignal[]>(initialSignalHistory);
  const [activeStrategy, setActiveStrategy] = useState<"LONG_ONLY" | "WAITING">("WAITING");
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [profit24h, setProfit24h] = useState(0);
  const [status, setStatus] = useState<SystemStatus>({
    connected: false,
    latencyMs: 0,
    lastTickAt: null,
  });
  const [ethTick, setEthTick] = useState<PriceTick>({
    symbol: ETH_USDT_PAIR,
    price: 0,
    prevPrice: 0,
    changePct24h: 0,
    timestamp: 0,
  });
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);

  const isNotificationEnabledRef = useRef(true);
  const previousPriceRef = useRef(0);
  const lastSignalByPairRef = useRef<Map<string, number>>(new Map());
  const marketPairRef = useRef(ETH_USDT_PAIR);

  const getCooldownRemainingMs = useCallback((pair: string, at = Date.now()): number => {
    const normalizedPair = normalizePair(pair);
    const lastSignalAt = lastSignalByPairRef.current.get(normalizedPair);
    if (!lastSignalAt) return 0;

    const remaining = SIGNAL_LOCK_MS - (at - lastSignalAt);
    return remaining > 0 ? remaining : 0;
  }, []);

  const canTriggerSignal = useCallback(
    (pair: string, at: number) => getCooldownRemainingMs(pair, at) === 0,
    [getCooldownRemainingMs],
  );

  const getStrategyForMarket = (market: ReturnType<typeof analyzeCurrentMarket>) => {
    if (!market.isReady || market.ema200 === null) {
      return "WAITING";
    }

    return market.currentPrice > market.ema200 ? "LONG_ONLY" : "WAITING";
  };

  useEffect(() => {
    initialSignalHistory.forEach((signal) => {
      const normalizedPair = normalizePair(signal.pair);
      const existing = lastSignalByPairRef.current.get(normalizedPair);
      if (existing === undefined || existing < signal.timestamp) {
        lastSignalByPairRef.current.set(normalizedPair, signal.timestamp);
      }
    });
  }, [initialSignalHistory]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getCooldownRemainingMs(marketPairRef.current);
      setCooldownRemainingMs(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [getCooldownRemainingMs]);

  useEffect(() => {
    isNotificationEnabledRef.current = isNotificationEnabled;
  }, [isNotificationEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const capped = signalHistory.slice(0, MAX_SIGNAL_HISTORY);
    window.localStorage.setItem(SIGNAL_HISTORY_STORAGE_KEY, JSON.stringify(capped));
  }, [signalHistory]);

  const playSignalPing = useCallback(() => {
    if (typeof window === "undefined") return;

    const AudioContextConstructor =
      window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    try {
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 940;

      const now = context.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.35);

      oscillator.onended = () => {
        void context.close();
      };
    } catch {
      // Ignore audio failures and autoplay restrictions.
    }
  }, []);

  const clearSignalHistory = useCallback(() => {
    lastSignalByPairRef.current.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem(SIGNAL_HISTORY_STORAGE_KEY);
    }
    setSignalHistory([]);
    setLatestSignal(null);
  }, []);

  const analyzeAndDispatch = useCallback(
    (update: KlineUpdate) => {
      const market = analyzeCurrentMarket();
      const nextPrice = round2(update.price);
      const previousPrice = previousPriceRef.current;
      const direction: PriceChangeDirection =
        previousPrice === 0 || nextPrice >= previousPrice ? "up" : "down";
      const normalizedPair = normalizePair(market.pair || market.symbol || ETH_USDT_PAIR);

      previousPriceRef.current = nextPrice;
      marketPairRef.current = normalizedPair;
      setEthPrice(nextPrice);
      setPriceChangeDirection(direction);
      setActiveStrategy(getStrategyForMarket(market));
      setCooldownRemainingMs(getCooldownRemainingMs(normalizedPair, market.timestamp || Date.now()));

      setEthTick((prev) => {
        const previous = prev.price || nextPrice;
        const changePct24h = previous === 0 ? 0 : round2(((nextPrice - previous) / previous) * 100);
        return {
          symbol: normalizePair(market.symbol),
          price: nextPrice,
          prevPrice: previous,
          changePct24h,
          timestamp: market.timestamp || update.timestamp,
        };
      });

      setStatus({
        connected: true,
        latencyMs: Math.max(0, Date.now() - update.timestamp),
        lastTickAt: Date.now(),
      });

      if (market.longSignal) {
        const signalAttemptTs = market.timestamp || update.timestamp || Date.now();

        if (market.trend !== "UP") {
          return;
        }

        if (market.signalLocked || !canTriggerSignal(normalizedPair, signalAttemptTs)) {
          return;
        }

        const signal = normalizeSignalFromMarket(market);
        lastSignalByPairRef.current.set(normalizedPair, signalAttemptTs);
        setLatestSignal(signal);
        setSignalHistory((prev) => [signal, ...prev].slice(0, MAX_SIGNAL_HISTORY));
        setCooldownRemainingMs(SIGNAL_LOCK_MS);

        if (isNotificationEnabledRef.current) {
          void sendSignalAlert(buildSignalAlertPayload(market));
          playSignalPing();
        }
      }

      setProfit24h((prev) =>
        previousPrice === 0 ? prev : round2(prev + (nextPrice - previousPrice) * 0.01),
      );
    },
    [canTriggerSignal, getCooldownRemainingMs, playSignalPing],
  );

  useEffect(() => {
    const unsubscribe = subscribeLatestKline(analyzeAndDispatch);

    return () => {
      unsubscribe();
      stopBinanceStream();
    };
  }, [analyzeAndDispatch]);

  const value = useMemo<TradeStreamContextValue>(
    () => ({
      ethPrice,
      priceChangeDirection,
      latestSignal,
      signalHistory,
      activeStrategy,
      cooldownRemainingMs,
      signals: signalHistory,
      ethTick,
      profit24h,
      status,
      isLive: status.connected,
      isNotificationEnabled,
      setIsNotificationEnabled,
      clearSignalHistory,
    }),
    [
      ethPrice,
      priceChangeDirection,
      latestSignal,
      signalHistory,
      activeStrategy,
      cooldownRemainingMs,
      ethTick,
      profit24h,
      status,
      isNotificationEnabled,
      clearSignalHistory,
    ],
  );

  return <TradeStreamContext.Provider value={value}>{children}</TradeStreamContext.Provider>;
}

export function useTradeStreamContext() {
  const ctx = useContext(TradeStreamContext);
  if (!ctx) {
    throw new Error("useTradeStreamContext must be used within TradeStreamProvider");
  }
  return ctx;
}
