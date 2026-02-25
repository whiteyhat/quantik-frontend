"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtUSDC, gradeColor } from "@/lib/api";

interface MarketHeaderProps {
  slug: string;
}

export function MarketHeader({ slug }: MarketHeaderProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="q-card p-4 mb-4 animate-pulse">
        <div className="h-5 w-3/4 rounded mb-3" style={{ background: '#1e1e2e' }} />
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded" style={{ background: '#1e1e2e' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="q-card p-4 mb-4">
        <span className="text-xs" style={{ color: '#606080' }}>
          Market not found or backend offline
        </span>
      </div>
    );
  }

  const resDate = data.resolutionDate
    ? new Date(data.resolutionDate).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";

  return (
    <div className="q-card p-4 mb-4">
      <h1 className="text-sm font-medium leading-relaxed mb-3" style={{ color: '#e0e0e0' }}>
        {data.question}
      </h1>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: '#606080' }}>Resolution</span>
          <span className="text-xs q-mono" style={{ color: '#e0e0e0' }}>{resDate}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: '#606080' }}>YES Price</span>
          <span className="text-lg font-semibold q-mono" style={{ color: '#00ff88' }}>
            {Math.round(data.yesPrice * 100)}¢
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: '#606080' }}>NO Price</span>
          <span className="text-lg font-semibold q-mono" style={{ color: '#ff4444' }}>
            {Math.round(data.noPrice * 100)}¢
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: '#606080' }}>Volume</span>
          <span className="text-sm q-mono" style={{ color: '#4488ff' }}>
            {fmtUSDC(data.volume)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: '#606080' }}>Liq Grade</span>
          <span className="text-lg font-bold q-mono" style={{ color: gradeColor(data.liquidityGrade) }}>
            {data.liquidityGrade}
          </span>
        </div>

        {data.spread !== undefined && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: '#606080' }}>Spread</span>
            <span className="text-sm q-mono" style={{ color: '#606080' }}>
              {(data.spread * 100).toFixed(1)}¢
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
