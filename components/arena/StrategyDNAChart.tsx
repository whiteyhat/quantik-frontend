"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { type AgentDNA } from "@/lib/api";
import { cn } from "@/lib/utils";

const AXES: (keyof AgentDNA)[] = ["volume", "diversity", "speed", "streak", "riskAppetite", "timing"];
const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 78;
const RINGS = [0.33, 0.66, 1.0];
const LABEL_OFFSET = 16;

function polarToCartesian(axis: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * axis) / AXES.length - Math.PI / 2;
  const r = RADIUS * value;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function polygonPoints(values: number[]): string {
  return values
    .map((value, index) => polarToCartesian(index, value).join(","))
    .join(" ");
}

function ringPoints(scale: number): string {
  return AXES.map((_, index) => polarToCartesian(index, scale).join(",")).join(" ");
}

export function StrategyDNAChart({
  dna,
  comparison,
  className,
  size = SIZE,
}: {
  dna: AgentDNA;
  comparison?: AgentDNA;
  className?: string;
  size?: number;
}) {
  const t = useTranslations("arena");
  const reducedMotion = useReducedMotion();
  const values = AXES.map((key) => Math.min(1, Math.max(0, dna[key])));
  const compValues = comparison ? AXES.map((key) => Math.min(1, Math.max(0, comparison[key]))) : null;
  const zeroValues = AXES.map(() => 0);

  const [animated, setAnimated] = useState(!!reducedMotion);
  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const displayValues = animated ? values : zeroValues;
  const displayCompValues = animated ? compValues : compValues ? zeroValues : null;

  const labelKeys: Record<keyof AgentDNA, string> = {
    volume: "dnaVolume",
    diversity: "dnaDiversity",
    speed: "dnaSpeed",
    streak: "dnaStreak",
    riskAppetite: "dnaRisk",
    timing: "dnaTiming",
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      className={cn("arena-dna-chart", className)}
      role="img"
      aria-label={t("dnaChartLabel")}
    >
      {/* Grid rings */}
      {RINGS.map((scale) => (
        <polygon
          key={scale}
          points={ringPoints(scale)}
          className="arena-dna-ring"
        />
      ))}

      {/* Axis lines */}
      {AXES.map((_, index) => {
        const [x, y] = polarToCartesian(index, 1);
        return (
          <line
            key={index}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            className="arena-dna-axis"
          />
        );
      })}

      {/* Comparison polygon (behind primary) */}
      {displayCompValues && (
        <polygon
          points={polygonPoints(displayCompValues)}
          className="arena-dna-polygon arena-dna-polygon--comparison"
          style={{ transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      )}

      {/* Primary polygon */}
      <polygon
        points={polygonPoints(displayValues)}
        className="arena-dna-polygon arena-dna-polygon--primary"
        style={{ transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
      />

      {/* Vertex dots */}
      {displayValues.map((value, index) => {
        const [x, y] = polarToCartesian(index, value);
        return (
          <motion.circle
            key={index}
            cx={x}
            cy={y}
            r={3}
            className="arena-dna-vertex arena-dna-vertex--primary"
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 + index * 0.08, type: "spring", stiffness: 300, damping: 15 }}
          />
        );
      })}

      {/* Labels */}
      {AXES.map((key, index) => {
        const [x, y] = polarToCartesian(index, 1);
        const dx = x - CX;
        const dy = y - CY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const labelX = CX + (dx / len) * (RADIUS + LABEL_OFFSET);
        const labelY = CY + (dy / len) * (RADIUS + LABEL_OFFSET);
        const anchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
        const baseline = Math.abs(dy) < 1 ? "middle" : dy > 0 ? "hanging" : "auto";
        return (
          <text
            key={key}
            x={labelX}
            y={labelY}
            textAnchor={anchor}
            dominantBaseline={baseline}
            className="arena-dna-label"
          >
            {t(labelKeys[key] as Parameters<typeof t>[0])}
          </text>
        );
      })}
    </svg>
  );
}
