import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState, nextState } from "@/services/mockStream";
import type { DashboardState } from "@/services/types";

interface TradeStreamContextValue extends DashboardState {
  /** Future: swap mock interval for a real WebSocket subscription. */
  isLive: boolean;
}

const TradeStreamContext = createContext<TradeStreamContextValue | null>(null);

const TICK_INTERVAL = 5000;

export function TradeStreamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(() => createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => nextState(s));
    }, TICK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<TradeStreamContextValue>(
    () => ({ ...state, isLive: state.status.connected }),
    [state],
  );

  return <TradeStreamContext.Provider value={value}>{children}</TradeStreamContext.Provider>;
}

export function useTradeStream() {
  const ctx = useContext(TradeStreamContext);
  if (!ctx) throw new Error("useTradeStream must be used within TradeStreamProvider");
  return ctx;
}
