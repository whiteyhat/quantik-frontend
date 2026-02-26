"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, streamPrices, fmtUSDC, type Market } from "@/lib/api";

// ─── Category filter pills ────────────────────────────────────────────────────

const SCANNER_CATEGORIES = [
  "All",
  "Crypto",
  "Politics",
  "Sports",
  "Pop Culture",
  "Science",
  "World Events",
  "Business",
] as const;

type ScannerCategory = (typeof SCANNER_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Crypto: ["bitcoin", "btc", "eth", "ethereum", "crypto", "sol", "defi", "token"],
  Politics: ["election", "president", "congress", "senate", "vote", "democrat", "republican", "trump", "biden", "political"],
  Sports: ["nfl", "nba", "mlb", "nhl", "super bowl", "championship", "team", "game", "sport", "cup", "league"],
  "Pop Culture": ["oscars", "grammy", "celebrity", "movie", "show", "album", "award", "film"],
  Science: ["nasa", "space", "science", "climate", "research", "discovery", "ai", "model"],
  "World Events": ["war", "conflict", "ceasefire", "united nations", "global", "international", "country"],
  Business: ["earnings", "ipo", "merger", "acquisition", "revenue", "market cap", "stock"],
};

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

interface MarketScannerProps {
  showFilterPills?: boolean;
}

export function MarketScanner({ showFilterPills = false }: MarketScannerProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ScannerCategory>("All");
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

  const filtered =
    activeCategory === "All"
      ? markets
      : markets.filter((m) => {
          const keywords = CATEGORY_KEYWORDS[activeCategory] ?? [];
          const q = m.question.toLowerCase();
          return keywords.some((kw) => q.includes(kw));
        });

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

      {/* Category filter pills */}
      {showFilterPills && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SCANNER_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 100,
                  border: isActive
                    ? "1px solid rgba(10,132,255,0.55)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: isActive ? "rgba(10,132,255,0.16)" : "rgba(255,255,255,0.04)",
                  color: isActive ? "#0a84ff" : "rgba(255,255,255,0.40)",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 160ms ease",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Market grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {filtered.map((m) => (
          <MarketCard key={m.slug} market={m} livePrice={livePrices[m.tokenId]} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <span className="text-body" style={{ color: "var(--text-tertiary)" }}>
            {activeCategory !== "All" ? `No markets in "${activeCategory}"` : "No markets found"}
          </span>
        </div>
      )}
    </div>
  );
}
