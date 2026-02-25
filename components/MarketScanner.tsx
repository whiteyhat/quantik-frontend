"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, fmtUSDC, gradeColor, streamPrices, type Market } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";

export function MarketScanner() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const updatePrices = useQuantikStore((s) => s.updatePrices);
  const livePrices = useQuantikStore((s) => s.livePrices);
  const stopRef = useRef<(() => void) | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: markets, isLoading, isError } = useQuery({
    queryKey: ["markets", debouncedSearch],
    queryFn: () => api.getMarkets(debouncedSearch || undefined),
    refetchInterval: 30000,
  });

  // SSE price stream
  useEffect(() => {
    if (!markets?.length) return;

    const tokens = markets.map((m) => m.tokenId).filter(Boolean);
    if (!tokens.length) return;

    // Clean up previous stream
    stopRef.current?.();

    stopRef.current = streamPrices(
      tokens,
      (prices) => updatePrices(prices),
    );

    return () => {
      stopRef.current?.();
    };
  }, [markets, updatePrices]);

  function getDisplayPrice(market: Market): { yes: number; no: number } {
    const live = livePrices[market.tokenId];
    if (live) return live;
    return { yes: market.yesPrice, no: market.noPrice };
  }

  return (
    <div className="q-card mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e2e' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
            Market Scanner
          </span>
          {markets && (
            <span className="text-xs q-mono" style={{ color: '#606080' }}>
              {markets.length} markets
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 rounded outline-none w-56"
            style={{
              background: '#0a0a0f',
              border: '1px solid #1e1e2e',
              color: '#e0e0e0',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: '#606080' }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#0f0f1a' }}>
              <th className="text-left px-4 py-2 font-medium" style={{ color: '#606080' }}>Question</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>YES</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>NO</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: '#606080' }}>Volume</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: '#606080' }}>Liq</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t" style={{ borderColor: '#1e1e2e' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse" style={{ background: '#1e1e2e', width: j === 0 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#606080' }}>
                  Backend offline — cannot fetch markets
                </td>
              </tr>
            )}
            {!isLoading && !isError && markets?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#606080' }}>
                  No markets found
                </td>
              </tr>
            )}
            {markets?.map((market) => {
              const prices = getDisplayPrice(market);
              return (
                <tr
                  key={market.slug}
                  className="q-table-row border-t cursor-pointer"
                  style={{ borderColor: '#1e1e2e' }}
                  onClick={() => router.push(`/market/${market.slug}`)}
                >
                  <td className="px-4 py-2.5 max-w-xs">
                    <span className="line-clamp-2 leading-relaxed" style={{ color: '#e0e0e0' }}>
                      {market.question}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="q-mono font-medium" style={{ color: '#00ff88' }}>
                      {Math.round(prices.yes * 100)}¢
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="q-mono font-medium" style={{ color: '#ff4444' }}>
                      {Math.round(prices.no * 100)}¢
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="q-mono" style={{ color: '#e0e0e0' }}>
                      {fmtUSDC(market.volume)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="q-mono font-bold text-sm"
                      style={{ color: gradeColor(market.liquidityGrade) }}
                    >
                      {market.liquidityGrade}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/market/${market.slug}`);
                      }}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{
                        background: 'rgba(68, 136, 255, 0.1)',
                        color: '#4488ff',
                        border: '1px solid rgba(68, 136, 255, 0.3)',
                      }}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
