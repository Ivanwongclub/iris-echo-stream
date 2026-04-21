import { getKlineSeriesFromHistory, TradingAlgo, type MarketSignal } from "./tradingAlgo";
import { logger } from "../src/lib/logger";

export interface BacktestCandle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestResult {
  totalSignals: number;
  totalTrades: number;
  winRatePercent: number;
  potentialPnLPercent: number;
  potentialPnLAbsolute: number;
  atrMultiplier: number;
  startTimestamp: number;
  endTimestamp: number;
}

const FAPI_KLINES_URL = "https://fapi.binance.com/fapi/v1/klines";
const ONE_MINUTE_MS = 60_000;
const SEVEN_DAYS_MS = 7 * 24 * ONE_MINUTE_MS * 60;
const MAX_LIMIT = 1000;

function parseHistoryKline(raw: unknown[]): BacktestCandle {
  const openTime = Number(raw[0] ?? 0);
  const open = Number(raw[1] ?? 0);
  const high = Number(raw[2] ?? 0);
  const low = Number(raw[3] ?? 0);
  const close = Number(raw[4] ?? 0);
  const volume = Number(raw[5] ?? 0);
  const closeTime = Number(raw[6] ?? openTime);

  return {
    openTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
  };
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function toDateMs(timestamp: number) {
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function fetchHistoricalCandlesWindow(
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<BacktestCandle[]> {
  const params = new URLSearchParams({
    symbol,
    interval: "1m",
    startTime: String(startTime),
    endTime: String(endTime),
    limit: String(MAX_LIMIT),
  });

  const response = await fetch(`${FAPI_KLINES_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch historical candles (${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => (Array.isArray(entry) ? parseHistoryKline(entry) : null))
    .filter((item): item is BacktestCandle => item !== null);
}

async function fetchHistoricalCandles(symbol: string, days = 7): Promise<BacktestCandle[]> {
  const now = Date.now();
  const targetWindowMs = days * 24 * 60 * 60 * 1000;
  let end = now;
  const start = now - targetWindowMs;
  const candles: BacktestCandle[] = [];

  let cursor = start;
  const windowInOneMinute = 60_000;

  while (cursor < end && candles.length < 20000) {
    const batchEnd = Math.min(end, cursor + MAX_LIMIT * windowInOneMinute);
    const batch = await fetchHistoricalCandlesWindow(symbol, cursor, batchEnd);
    candles.push(...batch);

    if (batch.length < MAX_LIMIT) {
      break;
    }

    const lastOpen = batch[batch.length - 1]?.openTime ?? cursor;
    if (lastOpen <= cursor) {
      break;
    }
    cursor = lastOpen + ONE_MINUTE_MS;
  }

  return candles
    .sort((a, b) => a.openTime - b.openTime)
    .filter((item, index, list) => index === 0 || item.openTime !== list[index - 1].openTime)
    .map((item) => ({
      ...item,
      open: round2(item.open),
      high: round2(item.high),
      low: round2(item.low),
      close: round2(item.close),
      volume: round2(item.volume),
    }))
    .filter((item) => item.openTime >= toDateMs(start) && item.closeTime <= toDateMs(now));
}

function estimateExit(signal: MarketSignal, futureCandles: BacktestCandle[]): { exitPrice: number; pnl: number } {
  const stopLoss = signal.stopLoss ?? 0;
  const takeProfit1 = signal.takeProfit1 ?? signal.currentPrice;

  for (let i = 0; i < futureCandles.length; i += 1) {
    const candle = futureCandles[i];
    if (candle.low <= stopLoss) {
      return {
        exitPrice: stopLoss,
        pnl: round2((stopLoss - signal.currentPrice) / signal.currentPrice),
      };
    }

    if (candle.high >= takeProfit1) {
      return {
        exitPrice: takeProfit1,
        pnl: round2((takeProfit1 - signal.currentPrice) / signal.currentPrice),
      };
    }
  }

  const finalClose = futureCandles[futureCandles.length - 1]?.close ?? signal.currentPrice;
  return {
    exitPrice: finalClose,
    pnl: round2((finalClose - signal.currentPrice) / signal.currentPrice),
  };
}

export async function runBacktestFor7Days(
  options: { symbol?: string; atrMultiplier?: number } = {},
): Promise<BacktestResult> {
  const symbol = options.symbol ?? "ETHUSDT";
  const atrMultiplier = options.atrMultiplier ?? 2.5;

  const candles = await fetchHistoricalCandles(symbol, 7);
  if (candles.length === 0) {
    return {
      totalSignals: 0,
      totalTrades: 0,
      winRatePercent: 0,
      potentialPnLPercent: 0,
      potentialPnLAbsolute: 0,
      atrMultiplier,
      startTimestamp: Date.now(),
      endTimestamp: Date.now(),
    };
  }

  const algo = new TradingAlgo();
  const signalSeries = getKlineSeriesFromHistory(candles);
  let totalSignals = 0;
  let winningSignals = 0;
  let pnlSumPercent = 0;

  for (let i = 0; i < signalSeries.length; i += 1) {
    const slice = signalSeries.slice(0, i + 1);
    const market = algo.analyzeFromCandles(slice, { atrMultiplier });
    if (!market.longSignal || !market.isReady) {
      continue;
    }

    const exit = estimateExit(market, signalSeries.slice(i + 1));
    totalSignals += 1;
    pnlSumPercent += exit.pnl;

    if (exit.pnl > 0) {
      winningSignals += 1;
    }

    logger.debug(
      `Backtest signal at ${new Date(market.timestamp).toISOString()} entry ${market.currentPrice} pnl=${exit.pnl}`,
    );
  }

  const last = signalSeries[signalSeries.length - 1];
  const first = signalSeries[0];
  const winRate = totalSignals === 0 ? 0 : round2((winningSignals / totalSignals) * 100);
  const absolutePnL = last ? round2(pnlSumPercent * last.close) : 0;

  return {
    totalSignals,
    totalTrades: totalSignals,
    winRatePercent: winRate,
    potentialPnLPercent: round2(pnlSumPercent * 100),
    potentialPnLAbsolute: absolutePnL,
    atrMultiplier,
    startTimestamp: first?.openTime ?? Date.now(),
    endTimestamp: last?.closeTime ?? Date.now(),
  };
}
