"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { sparklineTrend } from "@/components/arena/arenaHelpers";

interface SparklineProps {
  /** Points in time order: a running total or P&L snapshots */
  values: number[];
  width?: number;
  height?: number;
  animated?: boolean;
}

export function PnlSparkline({ values, width = 80, height = 24, animated = false }: SparklineProps) {
  const t = useTranslations("arena");
  const gradientId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 1;

  const coords = values.map((value, i) => ({
    x: padding + (i / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (value - min) / range) * (height - padding * 2),
  }));
  const points = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`);

  // Green when the line ends at or above zero: a winner never reads as falling
  const trend = sparklineTrend(values) === "up";
  const strokeColor = trend ? "#34d399" : "#f87171";
  const last = coords[coords.length - 1];

  const areaPath = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(" ")} L${last.x.toFixed(1)},${height} L${padding},${height} Z`;

  // Approximate path length for draw animation
  let pathLength = 0;
  if (animated) {
    for (let i = 1; i < coords.length; i++) {
      pathLength += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`arena-sparkline ${animated ? "arena-sparkline--animated" : ""}`}
      role="img"
      aria-label={trend ? t("pnlTrendUp") : t("pnlTrendDown")}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
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
        cx={last.x.toFixed(1)}
        cy={last.y.toFixed(1)}
        r="2"
        fill={strokeColor}
        style={animated ? { opacity: 0, animation: "arena-sparkline-fill 0.3s ease 1s forwards" } : undefined}
      />
    </svg>
  );
}
