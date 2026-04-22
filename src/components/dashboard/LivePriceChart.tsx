import {
  Area,
  ComposedChart,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTradeStream } from "@/hooks/useTradeStream";

const IRIS_COLOR = "#5D5CDE";
const ONYX_COLOR = "#1A1C1E";
const AMBER_COLOR = "#FFBF00";
const RSI_GREEN = "#10B981";
const RSI_RED = "#F43F5E";
const BB_COLOR = "#94A3B8";

function toMinutesSeconds(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LivePriceChart() {
  const { chartSeries, signalHistory } = useTradeStream();
  const latestPoint = chartSeries.at(-1);
  const chartStart = chartSeries[0]?.timestamp ?? 0;
  const chartEnd = latestPoint?.timestamp ?? 0;
  const visibleSignals = signalHistory
    .filter((signal) => signal.timestamp >= chartStart && signal.timestamp <= chartEnd)
    .map((signal) => {
      const anchorPoint =
        [...chartSeries].reverse().find((point) => point.timestamp <= signal.timestamp) ?? latestPoint;
      return {
        id: signal.id,
        action: signal.action,
        timestamp: anchorPoint?.timestamp ?? signal.timestamp,
        price: anchorPoint?.price ?? signal.entryPrice,
      };
    });

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey?: string; value: number | null }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const priceItem = payload.find((item) => item.dataKey === "price") ?? payload[0];
    const price = Number(priceItem?.value);
    const timeLabel = typeof label === "number" ? toMinutesSeconds(label) : String(label ?? "");

    return (
      <div
        className="rounded-md border border-border px-2.5 py-1.5 shadow-sm"
        style={{ backgroundColor: "#fff" }}
      >
        <p className="text-xs" style={{ color: "#6B7280" }}>
          {timeLabel}
        </p>
        <p className="text-sm font-semibold" style={{ color: ONYX_COLOR }}>
          ${Number.isNaN(price) ? "0.00" : price.toFixed(2)}
        </p>
      </div>
    );
  };

  const LatestPriceShape = ({
    cx = 0,
    cy = 0,
  }: {
    cx?: number;
    cy?: number;
  }) => {
    const text = latestPoint?.price.toFixed(2) ?? "0.00";
    const width = Math.max(52, text.length * 7 + 16);
    const x = cx + 12;
    const y = cy - 14;

    return (
      <g>
        <circle cx={cx} cy={cy} r={3.5} fill={IRIS_COLOR} stroke="white" strokeWidth={2} />
        <rect x={x} y={y} width={width} height={18} rx={9} fill={IRIS_COLOR} opacity={0.96} />
        <text
          x={x + width / 2}
          y={y + 12}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={11}
          fontWeight={600}
        >
          ${text}
        </text>
      </g>
    );
  };

  const SignalShape = ({
    cx = 0,
    cy = 0,
    action,
  }: {
    cx?: number;
    cy?: number;
    action: "LONG" | "SHORT";
  }) => {
    const isLong = action === "LONG";
    const fill = isLong ? RSI_GREEN : RSI_RED;
    const label = isLong ? "LONG" : "SHORT";
    const arrow = isLong ? "▲" : "▼";

    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill={fill} opacity={0.16} />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill={fill}
          fontSize={10}
          fontWeight={700}
        >
          {arrow} {label}
        </text>
      </g>
    );
  };

  if (chartSeries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Live ETH Price
        </p>
        <p className="text-sm text-muted-foreground mt-2">Loading live price stream...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Live ETH Price (5s sampled, 10m window)
      </p>
      <p className="text-2xl font-semibold tabular-nums mt-2">
        ${latestPoint?.price.toFixed(2)}
      </p>

      <div className="mt-4 h-[300px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartSeries} syncId="eth-live-chart" margin={{ left: 4, right: 8, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={IRIS_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={IRIS_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              tickFormatter={(value) => toMinutesSeconds(Number(value))}
            />
            <YAxis
              type="number"
              domain={["auto", "auto"]}
              width={56}
              padding={{ top: 20, bottom: 20 }}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(0,0,0,0.18)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="ema200"
              stroke={AMBER_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbUpper"
              stroke={BB_COLOR}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bbLower"
              stroke={BB_COLOR}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            {latestPoint?.ema200 !== null ? (
              <ReferenceLine
                y={latestPoint.ema200}
                ifOverflow="extendDomain"
                stroke="transparent"
                label={{
                  value: "EMA 200",
                  position: "insideLeft",
                  fill: "#6B7280",
                  fontSize: 11,
                  dy: -4,
                }}
              />
            ) : null}
            {visibleSignals.map((signal) => (
              <ReferenceDot
                key={signal.id}
                x={signal.timestamp}
                y={signal.price}
                ifOverflow="visible"
                shape={<SignalShape action={signal.action} />}
              />
            ))}
            {latestPoint ? (
              <ReferenceDot
                x={latestPoint.timestamp}
                y={latestPoint.price}
                ifOverflow="visible"
                shape={<LatestPriceShape />}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="price"
              stroke={IRIS_COLOR}
              strokeWidth={2}
              fill="url(#chartGradient)"
              fillOpacity={1}
              isAnimationActive={false}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} syncId="eth-live-chart" margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
            <XAxis dataKey="timestamp" hide />
            <YAxis
              domain={[0, 100]}
              width={36}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(0,0,0,0.18)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <ReferenceLine y={40} stroke="#9CA3AF" strokeDasharray="4 4" />
            <ReferenceLine y={70} stroke="#9CA3AF" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke={latestPoint?.rsi !== null && (latestPoint?.rsi ?? 0) >= 40 ? RSI_GREEN : RSI_RED}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Iris: price · Amber: EMA 200 · Dashed: Bollinger Bands · Lower pane: RSI with 40/70 guides
      </p>
    </div>
  );
}
