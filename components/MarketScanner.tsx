"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, streamPrices, fmtUSDC, type Market } from "@/lib/api";

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

function MarketCard({ market, livePrice }: { market: Market; livePrice?: { yes: number; no: number } }) {
  const yes = livePrice?.yes ?? market.yesPrice ?? 0;
  const yesPct = Math.round(yes * 100);
  const noPct = 100 - yesPct;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/market/${market.slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="glass-card-interactive"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, height: "100%" }}
      >
        {/* Question */}
        <h3
          className="text-headline"
          style={{
            color: "var(--text-primary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            margin: 0,
            minHeight: "2.8em",
          }}
        >
          {market.question}
        </h3>

        {/* YES / NO opposing bars */}
        <div style={{ display: "flex", gap: 2, borderRadius: 6, overflow: "hidden", height: 28 }}>
          <div
            style={{
              width: `${yesPct}%`,
              background: "var(--ios-green-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              transition: "width 300ms ease",
            }}
          >
            <span
              className="font-mono-data"
              style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--ios-green)" }}
            >
              YES {yesPct}¢
            </span>
          </div>
          <div
            style={{
              width: `${noPct}%`,
              background: "var(--ios-red-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              transition: "width 300ms ease",
            }}
          >
            <span
              className="font-mono-data"
              style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--ios-red)" }}
            >
              {noPct}¢ NO
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-caption)",
              color: "var(--text-secondary)",
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Vol: {fmtUSDC(market.volume)}
          </span>
          <LiqGradeChip grade={market.liquidityGrade} />
        </div>

        {/* Hover CTA */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: hovered ? 32 : 0,
            opacity: hovered ? 1 : 0,
            transition: "all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-subhead)",
              fontWeight: 600,
              color: "var(--ios-blue)",
            }}
          >
            Analyze →
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MarketScanner() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, { yes: number; no: number }>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    api.getMarkets(search || undefined).then(setMarkets).catch(() => {});
  }, [search]);

  useEffect(() => {
    if (markets.length === 0) return;
    cleanupRef.current?.();
    const tokens = markets.map((m) => m.tokenId).filter(Boolean);
    if (tokens.length === 0) return;
    const unsub = streamPrices(tokens, (prices) => {
      setLivePrices((prev) => ({ ...prev, ...prices }));
    });
    cleanupRef.current = unsub;
    return () => unsub();
  }, [markets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search input */}
      <input
        className="glass-input"
        type="text"
        placeholder="Search markets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px 24px",
          fontSize: "var(--text-body)",
          width: "100%",
          maxWidth: 480,
        }}
      />

      {/* Market grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {markets.map((m) => (
          <MarketCard key={m.slug} market={m} livePrice={livePrices[m.tokenId]} />
        ))}
      </div>

      {markets.length === 0 && (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <span className="text-body" style={{ color: "var(--text-tertiary)" }}>
            No markets found
          </span>
        </div>
      )}
    </div>
  );
}
