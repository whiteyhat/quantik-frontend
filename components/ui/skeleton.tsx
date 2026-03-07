"use client";

import React from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Skeleton shimmer loader for data fields.
 * Renders a pulsing placeholder until real content loads.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
  className,
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.8s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** Skeleton styled as a metric value (large number) */
export function SkeletonMetric({ width = 120 }: { width?: number | string }) {
  return <Skeleton width={width} height={28} borderRadius={8} />;
}

/** Skeleton styled as a text line */
export function SkeletonText({ width = "80%", lines = 1 }: { width?: number | string; lines?: number }) {
  if (lines === 1) return <Skeleton width={width} height={14} borderRadius={4} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "60%" : width}
          height={14}
          borderRadius={4}
        />
      ))}
    </div>
  );
}

/** Skeleton row for list items (signal rows, position rows, etc.) */
export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 9,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Skeleton width={48} height={20} borderRadius={5} />
      <Skeleton width="60%" height={14} borderRadius={4} />
      <Skeleton width={40} height={14} borderRadius={4} style={{ marginLeft: "auto" }} />
    </div>
  );
}

/** Skeleton for a card/panel */
export function SkeletonCard({ height = 140 }: { height?: number }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: 20,
        height,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Skeleton width={100} height={12} borderRadius={4} />
      <Skeleton width={140} height={24} borderRadius={6} />
      <Skeleton width="90%" height={14} borderRadius={4} />
    </div>
  );
}

/** Skeleton for table rows */
export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: "12px 12px" }}>
              <Skeleton
                width={c === 0 ? "70%" : c === cols - 1 ? 60 : 80}
                height={14}
                borderRadius={4}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
