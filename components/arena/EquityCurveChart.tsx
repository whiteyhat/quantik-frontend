"use client";

import { useRef, useState, useCallback } from "react";
import { type ArenaSparklinePoint } from "@/lib/api";
import { formatSignedCurrency } from "@/components/arena/arenaHelpers";

interface EquityCurveChartProps {
  data: ArenaSparklinePoint[];
  width?: number;
  height?: number;
}

export function EquityCurveChart({ data, width = 600, height = 120 }: EquityCurveChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; pnl: number; ts: number } | null>(null);

  if (data.length < 2) return null;

  const pnls = data.map((d) => d.pnl);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const range = max - min || 1;
  const padX = 0;
  const padY = 4;

  const coords = pnls.map((pnl, i) => ({
    x: padX + (i / (pnls.length - 1)) * (width - padX * 2),
    y: padY + (1 - (pnl - min) / range) * (height - padY * 2),
  }));

  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const lastPnl = pnls[pnls.length - 1];
  const firstPnl = pnls[0];
  const trend = lastPnl >= firstPnl;
  const strokeColor = trend ? "#34d399" : "#f87171";

  const areaPath = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ${coords.slice(1).map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(1)},${height} Z`;

  // Approximate path length for draw animation
  let pathLength = 0;
  for (let i = 1; i < coords.length; i++) {
    pathLength += Math.sqrt((coords[i].x - coords[i - 1].x) ** 2 + (coords[i].y - coords[i - 1].y) ** 2);
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    // Find closest data point
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setHover({
      x: coords[closest].x,
      y: coords[closest].y,
      pnl: data[closest].pnl,
      ts: data[closest].timestamp,
    });
  }, [data, coords, width]);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="arena-equity-curve" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", display: "block" }}
      >
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#equity-fill)"
          style={{ opacity: 0, animation: "arena-sparkline-fill 0.8s ease 0.6s forwards" }}
        />
        <polyline
          points={polyline}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
            animation: "arena-sparkline-draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />

        {/* Hover crosshair */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={0}
              x2={hover.x}
              y2={height}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="4"
              fill={strokeColor}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* End dot (only when not hovering) */}
        {!hover && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="2.5"
            fill={strokeColor}
            style={{ opacity: 0, animation: "arena-sparkline-fill 0.3s ease 1s forwards" }}
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div
          style={{
            position: "absolute",
            left: `${(hover.x / width) * 100}%`,
            top: -4,
            transform: "translateX(-50%) translateY(-100%)",
            padding: "4px 8px",
            borderRadius: 8,
            background: "rgba(8,10,18,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            display: "flex",
            gap: 8,
            alignItems: "baseline",
          }}
        >
          <span style={{ color: strokeColor, fontWeight: 700 }}>
            {formatSignedCurrency(hover.pnl)}
          </span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>
            {formatDate(hover.ts)}
          </span>
        </div>
      )}
    </div>
  );
}
