import { getLatestKlines, type Kline } from "./binanceStream";
import { DEBUG_MODE } from "../src/config/debug";
import { logger } from "../src/lib/logger";

export type TrendDirection = "UP" | "DOWN" | "NEUTRAL";

export interface BollingerBand {
  middle: number;
  upper: number;
  lower: number;
}

export interface MarketSignal {
  isReady: boolean;
  symbol: string;
  timestamp: number;
  currentPrice: number;
  trend: TrendDirection;
  ema200: number | null;
  atr14: number | null;
  rsi14: number | null;
  rsi14Previous: number | null;
  bollinger20_2: BollingerBand | null;
  momentumCrossAbove40: boolean;
  volatilityOk: boolean;
  longSignal: boolean;
  reasons: string[];
  candleCount: number;
  pair?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  status?: string;
  rsi?: number | null;
  atr?: number | null;
  signalLocked: boolean;
}

interface AlgoConfig {
  emaPeriod: number;
  atrPeriod: number;
  rsiPeriod: number;
  bbPeriod: number;
  bbMultiplier: number;
  atrMinRatio: number;
  atrMaxRatio: number;
  signalCooldownMs: number;
}

const DEFAULT_CONFIG: AlgoConfig = {
  emaPeriod: 200,
  atrPeriod: 14,
  rsiPeriod: 14,
  bbPeriod: 20,
  bbMultiplier: 2,
  atrMinRatio: 0.001,
  atrMaxRatio: 0.06,
  signalCooldownMs: 15 * 60 * 1000,
};

function round2(value: number): number {
  return Number(value.toFixed(2));
}

const EPSILON = 1e-8;

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function gt(a: number, b: number): boolean {
  return round4(a) - round4(b) > EPSILON;
}

function gte(a: number, b: number): boolean {
  return round4(a) + EPSILON >= round4(b);
}

function hasEnoughCandles(candles: Kline[], need: number): boolean {
  return candles.length >= need;
}

function clampDecimal(value: number): number {
  return Number.isFinite(value) ? round2(value) : value;
}

function calculateEMA(
  closes: number[],
  period: number,
): { current: number; values: number[] } | null {
  if (closes.length < period) return null;

  const closesRounded = closes.map(round2);
  const firstSlice = closesRounded.slice(0, period);
  let ema = firstSlice.reduce((acc, value) => acc + value, 0) / period;
  const multiplier = 2 / (period + 1);

  const values: number[] = [];
  for (let i = period; i < closesRounded.length; i += 1) {
    ema = (closesRounded[i] - ema) * multiplier + ema;
    values.push(ema);
  }

  return {
    current: clampDecimal(ema),
    values,
  };
}

function calculateATR(candles: Kline[], period: number): number | null {
  if (candles.length < period + 1) return null;

  const rounded = candles.map((c) => ({
    high: round2(c.high),
    low: round2(c.low),
    close: round2(c.close),
  }));

  const trs: number[] = [];
  for (let i = 1; i < rounded.length; i += 1) {
    const curr = rounded[i];
    const prev = rounded[i - 1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close),
    );
    trs.push(tr);
  }
  if (trs.length < period) return null;
  const recent = trs.slice(-period);
  const avg = recent.reduce((acc, val) => acc + val, 0) / period;

  return clampDecimal(avg);
}

function calculateRSI(closes: number[], period: number): { current: number; previous: number } | null {
  if (closes.length < period + 1) return null;

  const rounded = closes.map(round2);
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < rounded.length; i += 1) {
    const change = rounded[i] - rounded[i - 1];
    if (change >= 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  if (gains.length < period) return null;

  let avgGain = gains.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  const rsis: number[] = [];

  for (let i = period; i < gains.length; i += 1) {
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsis.push(rsi);

    const change = gains[i] - losses[i];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + 0) / period;
    } else {
      avgGain = (avgGain * (period - 1) + 0) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (rsis.length < 2) return null;
  const current = rsis[rsis.length - 1];
  const previous = rsis[rsis.length - 2];

  return {
    current,
    previous,
  };
}

function calculateBollinger(closes: number[], period: number, multiplier: number): BollingerBand | null {
  if (closes.length < period) return null;

  const rounded = closes.map(round2);
  const recent = rounded.slice(-period);
  const middle = recent.reduce((acc, value) => acc + value, 0) / period;
  const variance = recent.reduce((acc, value) => acc + Math.pow(value - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    middle: clampDecimal(middle),
    upper: clampDecimal(middle + multiplier * stdDev),
    lower: clampDecimal(middle - multiplier * stdDev),
  };
}

export class TradingAlgo {
  private readonly signalHistoryBySymbol = new Map<string, number>();

  constructor(private readonly config: AlgoConfig = DEFAULT_CONFIG) {}

  private normalizeSymbol(symbol: string): string {
    if (symbol.includes("/")) {
      return symbol.replace("/", "");
    }

    return symbol || "ETHUSDT";
  }

  private canEmitSignalForSymbol(symbol: string, timestamp: number): boolean {
    const normalized = this.normalizeSymbol(symbol);
    const lastEmitted = this.signalHistoryBySymbol.get(normalized);
    if (lastEmitted === undefined) {
      return true;
    }

    return timestamp - lastEmitted >= this.config.signalCooldownMs;
  }

  private setLastSignalForSymbol(symbol: string, timestamp: number): void {
    const normalized = this.normalizeSymbol(symbol);
    this.signalHistoryBySymbol.set(normalized, timestamp);
  }

  analyzeCurrentMarket(): MarketSignal {
    const now = Date.now();
    const candles = getLatestKlines().sort((a, b) => a.openTime - b.openTime);
    const count = candles.length;
    const symbols = candles.map((c) => c.symbol);
    const latestSymbol = symbols.length > 0 ? symbols[symbols.length - 1] : "ETHUSDT";

    const closes = candles.map((candle) => round2(candle.close));
    const has200 = hasEnoughCandles(candles, this.config.emaPeriod);

    if (!has200 || closes.length === 0) {
      return {
        isReady: false,
        symbol: latestSymbol,
        timestamp: now,
        currentPrice: 0,
        trend: "NEUTRAL",
        ema200: null,
        atr14: null,
        rsi14: null,
        rsi14Previous: null,
        bollinger20_2: null,
        momentumCrossAbove40: false,
        volatilityOk: false,
        longSignal: false,
        signalLocked: false,
        reasons: [
          candles.length === 0
            ? "Waiting for candle data"
            : `Insufficient candles for EMA ${this.config.emaPeriod}`,
        ],
        candleCount: count,
      };
    }

    const latest = candles[candles.length - 1];
    const currentPrice = round2(latest.close);
    const emaResult = calculateEMA(closes, this.config.emaPeriod);
    const atr14 = calculateATR(candles, this.config.atrPeriod);
    const rsiResult = calculateRSI(closes, this.config.rsiPeriod);
    const bollinger = calculateBollinger(closes, this.config.bbPeriod, this.config.bbMultiplier);
    const ema200 = emaResult?.current ?? null;

    const trend: TrendDirection =
      ema200 !== null && gt(currentPrice, ema200) ? "UP" : "DOWN";
    const rsiCurrent =
      rsiResult === null || rsiResult.current === null || rsiResult.current === undefined
        ? null
        : clampDecimal(rsiResult.current);
    const rsiPrevious =
      rsiResult === null || rsiResult.previous === null || rsiResult.previous === undefined
        ? null
        : clampDecimal(rsiResult.previous);

    const momentumCrossAbove40 =
      rsiResult !== null &&
      gt(rsiResult.current, 40) &&
      !gt(rsiResult.previous, 40);
    const entryZone = bollinger !== null && gt(currentPrice, bollinger.middle);

    const volatilityOk =
      atr14 !== null &&
      gte(atr14, round2(currentPrice * this.config.atrMinRatio)) &&
      !gt(atr14, round2(currentPrice * this.config.atrMaxRatio));

    const reasons: string[] = [];
    if (!hasEnoughCandles(candles, this.config.atrPeriod + 1)) reasons.push("Not enough candles for ATR");
    if (!hasEnoughCandles(candles, this.config.rsiPeriod + 1)) reasons.push("Not enough candles for RSI");
    if (!hasEnoughCandles(candles, this.config.bbPeriod)) reasons.push("Not enough candles for Bollinger");
    if (trend !== "UP") reasons.push("Price below EMA200");
    if (!momentumCrossAbove40) reasons.push("RSI has not crossed above 40");
    if (!entryZone) reasons.push("Price is not above BB middle");
    if (!volatilityOk) reasons.push("ATR volatility check failed");

    const cooldownActive = !this.canEmitSignalForSymbol(latestSymbol, latest.closeTime);
    if (cooldownActive) {
      reasons.push("Signal lock active for pair (15m cooldown)");
    }

    const longSignalCandidate = trend === "UP" && momentumCrossAbove40 && entryZone && volatilityOk;
    const longSignal = longSignalCandidate && !cooldownActive;

    if (cooldownActive && longSignalCandidate) {
      reasons.push("Signal suppressed by cooldown");
    }

    if (longSignal) {
      this.setLastSignalForSymbol(latestSymbol, latest.closeTime);
    }

    if (ema200 !== null && atr14 !== null && rsiResult !== null && bollinger !== null) {
      if (DEBUG_MODE) {
        logger.debug([
          {
            Price: currentPrice,
            EMA200: ema200,
            RSI: rsiCurrent,
            BB_Middle: bollinger.middle,
            symbol: latestSymbol,
            timestamp: latest.closeTime,
            signalLocked: cooldownActive,
          },
        ]);
      }
    }

    return {
      isReady: ema200 !== null && atr14 !== null && rsiResult !== null && bollinger !== null,
      symbol: latestSymbol,
      timestamp: latest.closeTime,
      currentPrice,
      trend,
      ema200,
      atr14,
      rsi14: rsiCurrent,
      rsi14Previous: rsiPrevious,
      bollinger20_2: bollinger,
      momentumCrossAbove40,
      volatilityOk,
      longSignal,
      signalLocked: cooldownActive,
      reasons,
      candleCount: count,
      rsi: rsiCurrent,
      atr: atr14,
      pair: normalizePair(latestSymbol),
    };
  }
}

function normalizePair(symbol: string): string {
  if (symbol.includes("/")) {
    return symbol;
  }
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol || "ETH/USDT";
}

const tradingAlgo = new TradingAlgo();

export function analyzeCurrentMarket(): MarketSignal {
  return tradingAlgo.analyzeCurrentMarket();
}
