const WS_URL = "wss://fstream.binance.com/ws/ethusdt@kline_1m";
const MAX_CANDLES = 200;
const HEARTBEAT_TIMEOUT_MS = 30_000;
const HEARTBEAT_CHECK_INTERVAL_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 20_000;

export interface Kline {
  symbol: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
}

export interface KlineUpdate {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  isFinal: boolean;
  kline: Kline;
}

type KlineListener = (update: KlineUpdate) => void;

const klineBuffer: Kline[] = [];

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;
let lastMessageAt = 0;

const latestKlineEvent = "latest-kline";
const broadcaster = new EventTarget();

function startHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const now = Date.now();
    if (lastMessageAt && now - lastMessageAt > HEARTBEAT_TIMEOUT_MS) {
      restart("heartbeat timeout");
    }
  }, HEARTBEAT_CHECK_INTERVAL_MS);
}

function stopHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function parseKline(raw: unknown): Kline | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const event = raw as {
    e?: string;
    k?: {
      t?: number | string;
      T?: number | string;
      s?: string;
      o?: string;
      h?: string;
      l?: string;
      c?: string;
      v?: string;
      x?: boolean;
    };
  };

  if (event.e !== "kline" || !event.k) {
    return null;
  }

  const k = event.k;
  const symbol = typeof k.s === "string" ? k.s : "ETHUSDT";

  return {
    symbol,
    openTime: Number(k.t ?? 0),
    closeTime: Number(k.T ?? 0),
    open: Number(k.o ?? 0),
    high: Number(k.h ?? 0),
    low: Number(k.l ?? 0),
    close: Number(k.c ?? 0),
    volume: Number(k.v ?? 0),
    isFinal: Boolean(k.x),
  };
}

function upsertKline(kline: Kline) {
  const index = klineBuffer.findIndex((item) => item.openTime === kline.openTime);
  if (index >= 0) {
    klineBuffer[index] = kline;
    return;
  }

  klineBuffer.push(kline);
  while (klineBuffer.length > MAX_CANDLES) {
    klineBuffer.shift();
  }
}

function publishLatest(kline: Kline) {
  const update: KlineUpdate = {
    symbol: kline.symbol,
    price: kline.close,
    volume: kline.volume,
    timestamp: kline.closeTime,
    isFinal: kline.isFinal,
    kline,
  };
  broadcaster.dispatchEvent(new CustomEvent(latestKlineEvent, { detail: update }));
}

function handleMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    const candle = parseKline(data);
    if (!candle) {
      return;
    }

    lastMessageAt = Date.now();
    upsertKline(candle);
    publishLatest(candle);
  } catch (error) {
    console.error("Unable to parse Binance message", error);
  }
}

function attachSocketHandlers() {
  if (!socket) return;

  socket.onopen = () => {
    reconnectAttempts = 0;
    lastMessageAt = Date.now();
    startHeartbeatCheck();
  };

  socket.onmessage = handleMessage;

  socket.onerror = () => {
    restart("websocket error");
  };

  socket.onclose = () => {
    stopHeartbeatCheck();
    restart("websocket close");
  };
}

function cleanupSocket() {
  stopHeartbeatCheck();

  if (!socket) return;
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close();
  }
  socket = null;
}

function getReconnectDelay(attempt: number) {
  const factor = Math.min(attempt, 6);
  const delay = RECONNECT_BASE_DELAY_MS * 2 ** factor;
  const jitter = Math.random() * 250;
  return Math.min(delay + jitter, RECONNECT_MAX_DELAY_MS);
}

function restart(reason: string) {
  if (stopped) {
    return;
  }
  cleanupSocket();

  if (reconnectTimer) {
    return;
  }

  const delay = getReconnectDelay(reconnectAttempts);
  console.warn(`Restarting Binance stream (${reason}). Reconnect in ${Math.round(delay)}ms`);
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function connect() {
  if (stopped) return;
  if (typeof WebSocket === "undefined") {
    return;
  }
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  cleanupSocket();
  socket = new WebSocket(WS_URL);
  attachSocketHandlers();
}

function ensureStarted() {
  if (typeof WebSocket === "undefined") {
    return;
  }
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    connect();
  }
}

export function subscribeLatestKline(listener: KlineListener): () => void {
  ensureStarted();
  const wrappedListener = (event: Event) => {
    const detail = (event as CustomEvent<KlineUpdate>).detail;
    if (detail) {
      listener(detail);
    }
  };

  const eventListener = wrappedListener as EventListener;
  broadcaster.addEventListener(latestKlineEvent, eventListener);

  return () => broadcaster.removeEventListener(latestKlineEvent, eventListener);
}

export function getLatestKlines(): Kline[] {
  ensureStarted();
  return [...klineBuffer];
}

export function stopBinanceStream() {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  cleanupSocket();
}

// Start automatically for applications that rely on a hot stream.
if (typeof WebSocket !== "undefined") {
  ensureStarted();
}
