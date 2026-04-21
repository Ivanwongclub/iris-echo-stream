import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { useTradeStream } from "@/hooks/useTradeStream";

interface PricePoint {
  timestamp: number;
  price: number;
}

const MAX_POINTS = 60;
const WINDOW_MS = 60_000;
const IRIS_COLOR = "#5D5CDE";
const ONYX_COLOR = "#1A1C1E";

function toMinutesSeconds(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function LivePriceChart() {
  const { ethPrice, ema200, recentKlines } = useTradeStream();
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const latestPoint = chartData.at(-1);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0];
    const price = Number(point.value);
    const timeLabel = typeof label === "number" ? toMinutesSeconds(label) : String(label ?? "");
    if (Number.isNaN(price)) return null;

    return (
      <div className="rounded-md border border-border px-2.5 py-1.5 shadow-sm" style={{ backgroundColor: "#fff" }}>
        <p className="text-xs" style={{ color: "#6B7280" }}>
          {timeLabel}
        </p>
        <p className="text-sm font-semibold" style={{ color: ONYX_COLOR }}>
          ${price.toFixed(2)}
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
    const text = chartData.at(-1)?.price.toFixed(2) ?? "0.00";
    const width = Math.max(44, text.length * 7 + 10);
    const x = cx + 12;
    const y = cy - 14;

    return (
      <g>
        <circle cx={cx} cy={cy} r={3.5} fill={IRIS_COLOR} stroke="white" strokeWidth={2} />
        <rect
          x={x}
          y={y}
          width={width}
          height={18}
          rx={9}
          fill={IRIS_COLOR}
          opacity={0.95}
        />
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

  useEffect(() => {
    if (recentKlines.length === 0 || chartData.length > 0) {
      return;
    }

    const seeded = recentKlines
      .filter((candle) => candle.close > 0)
      .slice(-50)
      .map((candle) => ({
        timestamp: candle.closeTime,
        price: Number(candle.close.toFixed(2)),
      }));

    if (seeded.length === 0) {
      return;
    }

    const now = Date.now();
    const pruned = seeded.filter((item) => now - item.timestamp <= WINDOW_MS);
    setChartData(pruned.slice(-MAX_POINTS));
  }, [chartData.length, recentKlines]);

  useEffect(() => {
    if (ethPrice <= 0) return;

    const next = {
      timestamp: Date.now(),
      price: Number(ethPrice.toFixed(2)),
    };

    setChartData((prev) => {
      const merged = [...prev, next].filter((item) => Date.now() - item.timestamp <= WINDOW_MS);
      return merged.slice(-MAX_POINTS);
    });
  }, [ethPrice]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live ETH Price</p>
        <p className="text-sm text-muted-foreground mt-2">Loading live price stream...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Live ETH Price (60s window)
      </p>
      <p className="text-2xl font-semibold tabular-nums mt-2">${chartData.at(-1)?.price.toFixed(2)}</p>
      <div className="mt-4 h-[300px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 12, bottom: 0 }}>
            <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={IRIS_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={IRIS_COLOR} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
              tickFormatter={(value) => toMinutesSeconds(Number(value))}
            />
            <YAxis
              type="number"
              domain={["auto", "auto"]}
              width={56}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(0,0,0,0.2)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            {ema200 !== null && (
              <ReferenceLine
                y={ema200}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{
                  value: "EMA 200",
                  position: "insideLeft",
                  fill: "#6B7280",
                  fontSize: 11,
                  dy: -4,
                }}
              />
            )}
            {latestPoint && (
              <ReferenceDot
                x={latestPoint.timestamp}
                y={latestPoint.price}
                ifOverflow="visible"
                shape={<LatestPriceShape />}
              />
            )}
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Iris line: ETH/USDT • Dashed line: EMA200</p>
    </div>
  );
}
