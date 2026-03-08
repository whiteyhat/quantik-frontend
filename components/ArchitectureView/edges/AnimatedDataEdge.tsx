"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function AnimatedDataEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const intensity = (data?.intensity as string) || "low";

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 20,
  });

  const baseStroke =
    intensity === "high"
      ? "rgba(0,122,255,0.25)"
      : intensity === "medium"
      ? "rgba(191,90,242,0.20)"
      : "rgba(255,255,255,0.06)";

  const particleColor =
    intensity === "high"
      ? "#007AFF"
      : intensity === "medium"
      ? "#BF5AF2"
      : "rgba(255,255,255,0.30)";

  const animDuration =
    intensity === "high" ? "2s" : intensity === "medium" ? "3s" : "4s";

  const particleRadius = intensity === "high" ? 3 : 2;

  return (
    <>
      {/* Base edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: baseStroke,
          strokeWidth: intensity === "high" ? 1.5 : 1,
          fill: "none",
          ...(intensity === "high"
            ? { animation: "edge-pulse 2s ease-in-out infinite" }
            : intensity === "medium"
            ? { animation: "edge-pulse 3s ease-in-out infinite" }
            : {}),
        }}
      />

      {/* Animated particle traveling along the edge */}
      <circle r={particleRadius} fill={particleColor} filter={intensity === "high" ? "url(#glow)" : undefined}>
        <animateMotion
          dur={animDuration}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>

      {/* Second particle for high-intensity edges */}
      {intensity === "high" && (
        <circle r={2} fill={particleColor} opacity={0.5}>
          <animateMotion
            dur={animDuration}
            repeatCount="indefinite"
            path={edgePath}
            begin="1s"
          />
        </circle>
      )}
    </>
  );
}

export const AnimatedDataEdge = memo(AnimatedDataEdgeComponent);
