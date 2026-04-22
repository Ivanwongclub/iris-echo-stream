import {
  TradeStreamProvider,
  useTradeStreamContext,
} from "@/contexts/tradeStreamContext";

export { TradeStreamProvider };

export function useTradeStream() {
  return useTradeStreamContext();
}
