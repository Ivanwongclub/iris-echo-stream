import type { MarketSignal } from "./tradingAlgo";
import { logger } from "../src/lib/logger";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

function toNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "N/A" : value.toFixed(2);
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function buildPayload(signal: MarketSignal) {
  const message = [
    `🚀 ${signal.pair ?? "ETH/USDT"} LONG SIGNAL`,
    "",
    `📍 Entry: ${toNumber(signal.entryPrice)}`,
    `🛡️ Stop Loss: ${toNumber(signal.stopLoss)}`,
    `🎯 Target (TP1): ${toNumber(signal.takeProfit1)}`,
    `📊 Indicators: RSI: ${toNumber(signal.rsi)}, ATR: ${toNumber(signal.atr)}`,
    `🕒 Time: ${formatTime(signal.timestamp)}`,
  ].join("\n");

  return JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown",
  });
}

export async function sendSignalAlert(signal: MarketSignal): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("Telegram notification skipped: missing bot token or chat id");
    return;
  }

  const endpoint = `${TELEGRAM_API}${TELEGRAM_TOKEN}/sendMessage`;
  const payload = buildPayload(signal);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(`Telegram send failed (${res.status}): ${body}`);
    }
  } catch (error) {
    logger.error("Telegram send failed", error);
  }
}
