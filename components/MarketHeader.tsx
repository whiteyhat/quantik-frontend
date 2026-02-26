"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmtUSDC } from "@/lib/api";

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
        fontSize: 12,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 8,
        background: `color-mix(in srgb, ${c} 15%, transparent)`,
        color: c,
        border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`,
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        letterSpacing: "0.05em",
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
      <div className="glass-card-elevated" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ height: 24, width: 200, borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
        <div style={{ height: 32, width: "70%", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 20 }} />
        <div style={{ height: 40, borderRadius: 10, background: "rgba(255,255,255,0.03)" }} />
      </div>
    );
  }

  const yesPct = Math.round((market.yesPrice ?? 0) * 100);
  const noPct = 100 - yesPct;
  const volume = market.volume ?? 0;
  const liquidity = market.liquidity ?? 0;

  const resolutionLabel = market.resolutionDate && !isNaN(new Date(market.resolutionDate).getTime())
    ? new Date(market.resolutionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "TBD";

  return (
    <div className="glass-card-elevated" style={{ padding: 24, marginBottom: 24 }}>
      {/* Top badge row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <LiqGradeChip grade={market.liquidityGrade ?? "D"} />
        <span
          className="font-mono-data"
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            padding: "3px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          Vol: {fmtUSDC(volume)}
        </span>
      </div>

      {/* Market question */}
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 20px 0",
          lineHeight: 1.3,
          letterSpacing: "-0.3px",
        }}
      >
        {market.question}
      </h1>

      {/* YES / NO price bars — tinted glass per L004 */}
      <div style={{ display: "flex", gap: 3, borderRadius: 10, overflow: "hidden", height: 44, marginBottom: 20 }}>
        <div
          style={{
            width: `${Math.max(yesPct, 10)}%`,
            background: "rgba(48,209,88,0.15)",
            border: "1px solid rgba(48,209,88,0.25)",
            borderRadius: "10px 0 0 10px",
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            gap: 10,
            minWidth: 70,
            transition: "width 300ms ease",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ios-green)" }}>YES</span>
          <span className="font-mono-data" style={{ fontSize: 18, fontWeight: 700, color: "var(--ios-green)" }}>
            {yesPct}¢
          </span>
        </div>
        <div
          style={{
            width: `${Math.max(noPct, 10)}%`,
            background: "rgba(255,69,58,0.15)",
            border: "1px solid rgba(255,69,58,0.25)",
            borderRadius: "0 10px 10px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 16,
            gap: 10,
            minWidth: 70,
            transition: "width 300ms ease",
          }}
        >
          <span className="font-mono-data" style={{ fontSize: 18, fontWeight: 700, color: "var(--ios-red)" }}>
            {noPct}¢
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ios-red)" }}>NO</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span className="font-mono-data" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          24h Volume: {fmtUSDC(volume)}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span className="font-mono-data" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Liquidity: {fmtUSDC(liquidity)}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>·</span>
        <span className="font-mono-data" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Ends: {resolutionLabel}
        </span>
      </div>
    </div>
  );
}
