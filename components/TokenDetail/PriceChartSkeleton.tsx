"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PriceChartSkeleton() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Skeleton width={120} height={20} borderRadius={6} />
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={32} height={28} borderRadius={6} />
          ))}
        </div>
      </div>
      {/* Chart area */}
      <Skeleton width="100%" height={280} borderRadius={8} />
    </div>
  );
}
