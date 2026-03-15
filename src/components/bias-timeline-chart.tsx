"use client";

interface DataPoint {
  date: string;
  direction: string;
  confidence: number;
  summary: string;
}

interface BiasTimelineChartProps {
  data: DataPoint[];
  instrument: string;
  timeframe: string;
}

const DIRECTION_COLOR: Record<string, string> = {
  bullish: "#4ade80",
  bearish: "#f87171",
  neutral: "#6b7280",
};

export function BiasTimelineChart({ data, instrument, timeframe }: BiasTimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-8 text-center text-white/30">
        No historical data available
      </div>
    );
  }

  const maxConfidence = 100;
  const chartHeight = 200;
  const chartWidth = Math.max(data.length * 12, 600);
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
  const yScale = (v: number) => padding.top + innerHeight - (v / maxConfidence) * innerHeight;

  // Build SVG path
  const pathPoints = data.map((d, i) => `${xScale(i)},${yScale(d.confidence)}`).join(" L ");
  const linePath = `M ${pathPoints}`;

  // Area path
  const areaPath = `M ${xScale(0)},${yScale(0)} L ${pathPoints} L ${xScale(data.length - 1)},${yScale(0)} Z`;

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60">
          {instrument} — {timeframe} Bias Confidence Over Time
        </h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Bullish</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Bearish</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Neutral</span>
        </div>
      </div>

      <svg width={chartWidth} height={chartHeight} className="text-white min-w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={yScale(v)}
              x2={chartWidth - padding.right}
              y2={yScale(v)}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4,4"
            />
            <text x={padding.left - 6} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={10}>
              {v}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" opacity={0.15} />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.confidence)}
            r={3}
            fill={DIRECTION_COLOR[d.direction] || "#6b7280"}
            stroke="#09090b"
            strokeWidth={1.5}
          >
            <title>{`${d.date}: ${d.direction} (${d.confidence}%)`}</title>
          </circle>
        ))}

        {/* X-axis labels (every 7th point) */}
        {data.map((d, i) => {
          if (i % Math.max(Math.floor(data.length / 8), 1) !== 0) return null;
          const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <text
              key={`label-${i}`}
              x={xScale(i)}
              y={chartHeight - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={9}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
