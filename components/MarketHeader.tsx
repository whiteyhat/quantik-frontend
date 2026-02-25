"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtUSDC, type Market } from "@/lib/api";

function LiqGradeChip({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "var(--ios-green)",
    B: "var(--ios-blue)",
    C: "var(--ios-orange)",
    D: "var(--ios-red)",
  };
  const c = colors[grade] || "var(--text-tertiary)";
  return (
    <span
      style={{
        fontSize: "var(--text-caption)",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        background: `color-mix(in srgb, ${c} 15%, transparent)`,
        color: c,
      }}
    >
      Liq: {grade}
    </span>
  );
}

export function MarketHeader({ slug }: { slug: string }) {
  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

  if (!market) {
    return (
      <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
        <div style={{ height: 28, width: 300, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }

  const yesPct = Math.round((market.yesPrice ?? 0) * 100);
  const noPct = 100 - yesPct;

  return (
    <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
      {/* Question */}
      <h1 className="text-title-lg" style={{ color: "var(--text-primary)", margin: "0 0 12px 0" }}>
        {market.question}
      </h1>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>
          Resolution: {market.resolutionDate
            ? new Date(market.resolutionDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "TBD"}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span className="font-mono-data text-subhead" style={{ color: "var(--text-secondary)" }}>
          {fmtUSDC(market.volume)} volume
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <LiqGradeChip grade={market.liquidityGrade} />
      </div>

      {/* YES / NO opposing bars — full width iOS style */}
      <div style={{ display: "flex", gap: 3, borderRadius: 10, overflow: "hidden", height: 40 }}>
        <div
          style={{
            width: `${yesPct}%`,
            background: "var(--ios-green-glow)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            gap: 8,
            minWidth: 60,
            transition: "width 300ms ease",
          }}
        >
          <span className="text-subhead" style={{ fontWeight: 600, color: "var(--ios-green)" }}>
            YES
          </span>
          <span className="font-mono-data" style={{ fontSize: "var(--text-headline)", fontWeight: 700, color: "var(--ios-green)" }}>
            {yesPct}¢
          </span>
          <span className="text-caption" style={{ color: "var(--ios-green)", opacity: 0.7 }}>
            {yesPct}%
          </span>
        </div>
        <div
          style={{
            width: `${noPct}%`,
            background: "var(--ios-red-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 16,
            gap: 8,
            minWidth: 60,
            transition: "width 300ms ease",
          }}
        >
          <span className="text-caption" style={{ color: "var(--ios-red)", opacity: 0.7 }}>
            {noPct}%
          </span>
          <span className="font-mono-data" style={{ fontSize: "var(--text-headline)", fontWeight: 700, color: "var(--ios-red)" }}>
            {noPct}¢
          </span>
          <span className="text-subhead" style={{ fontWeight: 600, color: "var(--ios-red)" }}>
            NO
          </span>
        </div>
      </div>
    </div>
  );
}
