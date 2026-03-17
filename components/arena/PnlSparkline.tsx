"use client";

import { useTranslations } from "next-intl";
import { type ArenaMarketBreakdown } from "@/lib/api";

interface SparklineProps {
  data: ArenaMarketBreakdown[];
  width?: number;
  height?: number;
  animated?: boolean;
}

export function PnlSparkline({ data, width = 80, height = 24, animated = false }: SparklineProps) {
  const t = useTranslations("arena");
  if (data.length < 2) return null;

  const pnls = data.map((d) => d.pnl);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const range = max - min || 1;
  const padding = 1;

  const points = pnls.map((pnl, i) => {
    const x = padding + (i / (pnls.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (pnl - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastPnl = pnls[pnls.length - 1];
  const firstPnl = pnls[0];
  const trend = lastPnl >= firstPnl;
  const strokeColor = trend ? "#34d399" : "#f87171";

  // Area fill path
  const areaPath = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(" ")} L${(padding + ((pnls.length - 1) / (pnls.length - 1)) * (width - padding * 2)).toFixed(1)},${height} L${padding},${height} Z`;

  // Approximate path length for draw animation
  let pathLength = 0;
  if (animated) {
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1].split(",").map(Number);
      const [x2, y2] = points[i].split(",").map(Number);
      pathLength += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`arena-sparkline ${animated ? "arena-sparkline--animated" : ""}`}
      aria-label={trend ? t("pnlTrendUp") : t("pnlTrendDown")}
    >
      <defs>
        <linearGradient id={`spark-fill-${trend ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#spark-fill-${trend ? "up" : "down"})`}
        style={animated ? { opacity: 0, animation: "arena-sparkline-fill 0.8s ease 0.6s forwards" } : undefined}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animated ? {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
          animation: "arena-sparkline-draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        } : undefined}
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="2"
        fill={strokeColor}
        style={animated ? { opacity: 0, animation: "arena-sparkline-fill 0.3s ease 1s forwards" } : undefined}
      />
    </svg>
  );
}
