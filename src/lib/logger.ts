const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "development";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

type Logger = {
  setLevel: (level: LogLevel) => void;
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const noop = () => {
  // intentionally empty for production silence
};

const noopLogger: Logger = {
  setLevel: () => {},
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};

const order: LogLevel[] = ["trace", "debug", "info", "warn", "error"];
let activeLevel: LogLevel = isDev ? "debug" : "error";

function isEnabled(level: LogLevel) {
  return order.indexOf(level) >= order.indexOf(activeLevel);
}

const browserLogger: Logger = {
  setLevel(level: LogLevel) {
    activeLevel = level;
  },
  trace(...args) {
    if (isEnabled("trace") && typeof console !== "undefined") {
      console.log(...args);
    }
  },
  debug(...args) {
    if (isEnabled("debug") && typeof console !== "undefined") {
      console.debug(...args);
    }
  },
  info(...args) {
    if (isEnabled("info") && typeof console !== "undefined") {
      console.info(...args);
    }
  },
  warn(...args) {
    if (isEnabled("warn") && typeof console !== "undefined") {
      console.warn(...args);
    }
  },
  error(...args) {
    if (isEnabled("error") && typeof console !== "undefined") {
      console.error(...args);
    }
  },
};

export const logger: Logger = typeof window === "undefined" || typeof console === "undefined" ? noopLogger : browserLogger;
