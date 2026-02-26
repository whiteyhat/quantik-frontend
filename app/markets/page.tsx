"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, fmtUSDC, streamPrices, type Market } from "@/lib/api";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 20,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;

const CATEGORIES = ["All", "Crypto", "Politics", "Sports", "Pop Culture", "Science", "World Events", "Business"] as const;
type Category = (typeof CATEGORIES)[number];



// ─── Market card ──────────────────────────────────────────────────────────────

function MarketCard({
  market,
  livePrice,
}: {
  market: Market;
  livePrice?: { yes: number; no: number };
}) {
  const yes = livePrice?.yes ?? market.yesPrice ?? 0;
  const no = livePrice?.no ?? market.noPrice ?? 0;
  const yesPct = Math.round(yes * 100);
  const noPct = Math.round(no * 100) || 100 - yesPct;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/market/${market.slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          ...panelStyle,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "100%",
          transition: "border-color 200ms, background 200ms",
          borderColor: hovered ? "rgba(10,132,255,0.35)" : "rgba(255,255,255,0.09)",
          background: hovered ? "rgba(10,132,255,0.04)" : "rgba(255,255,255,0.05)",
          cursor: "pointer",
        }}
      >
        {/* Question */}
        <h3
          style={{
            margin: 0,
            fontSize: BODY_SIZE,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.45,
            minHeight: "2.8em",
          }}
        >
          {market.question}
        </h3>

        {/* YES / NO bar */}
        <div style={{ display: "flex", gap: 2, borderRadius: 6, overflow: "hidden", height: 26 }}>
          <div
            style={{
              width: `${yesPct}%`,
              background: "rgba(48,209,88,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 38,
              transition: "width 300ms ease",
            }}
          >
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                color: "#30d158",
                fontFamily: "monospace",
              }}
            >
              YES {yesPct}¢
            </span>
          </div>
          <div
            style={{
              width: `${noPct}%`,
              background: "rgba(255,69,58,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 38,
              transition: "width 300ms ease",
            }}
          >
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                color: "#ff453a",
                fontFamily: "monospace",
              }}
            >
              {noPct}¢ NO
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Vol: {fmtUSDC(market.volume)}
          </span>
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Liq: {market.liquidityGrade}
          </span>
        </div>

        {/* Hover CTA */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: hovered ? 28 : 0,
            opacity: hovered ? 1 : 0,
            transition: "all 240ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <span style={{ fontSize: META_SIZE, fontWeight: 600, color: "#0a84ff" }}>
            View market →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Markets Page ─────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [livePrices, setLivePrices] = useState<Record<string, { yes: number; no: number }>>({});
  const [loading, setLoading] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    api.getMarkets(search || undefined)
      .then(res => setMarkets(res.markets))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  // Category filtering — markets don't have a "category" field in the API type yet,
  // so we match against the question text as a best-effort until backend wires it.
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    Crypto: ["bitcoin", "btc", "eth", "ethereum", "crypto", "sol", "defi", "token"],
    Politics: ["election", "president", "congress", "senate", "vote", "democrat", "republican", "trump", "biden", "political"],
    Sports: ["nfl", "nba", "mlb", "nhl", "super bowl", "championship", "team", "game", "sport", "cup", "league"],
    "Pop Culture": ["oscars", "grammy", "celebrity", "movie", "show", "album", "award", "film"],
    Science: ["nasa", "space", "science", "climate", "research", "discovery", "ai", "model"],
    "World Events": ["war", "conflict", "ceasefire", "united nations", "global", "international", "country"],
    Business: ["earnings", "ipo", "merger", "acquisition", "revenue", "market cap", "stock"],
  };

  const filtered = markets.filter((m) => {
    if (activeCategory === "All") return true;
    const keywords = CATEGORY_KEYWORDS[activeCategory] ?? [];
    const q = m.question.toLowerCase();
    return keywords.some((kw) => q.includes(kw));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          Markets
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>
          Live CLOB prediction markets — click to analyze
        </p>
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text"
          placeholder="Search markets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "11px 16px",
            fontSize: BODY_SIZE,
            width: "100%",
            maxWidth: 420,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.85)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />

        {/* Category pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 100,
                  border: isActive
                    ? "1px solid rgba(10,132,255,0.60)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: isActive ? "rgba(10,132,255,0.18)" : "rgba(255,255,255,0.04)",
                  color: isActive ? "#0a84ff" : "rgba(255,255,255,0.45)",
                  fontSize: META_SIZE,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 160ms ease",
                  fontFamily: "inherit",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          fontSize: META_SIZE,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "monospace",
        }}
      >
        <span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{filtered.length}</span>
          {" "}markets
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
        <span>
          Total vol:{" "}
          <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
            {fmtUSDC(filtered.reduce((acc, m) => acc + (m.volume ?? 0), 0))}
          </span>
        </span>
        {activeCategory !== "All" && (
          <>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <span>
              Filter:{" "}
              <span style={{ color: "#0a84ff", fontWeight: 600 }}>{activeCategory}</span>
            </span>
          </>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            ...panelStyle,
            padding: 40,
            textAlign: "center",
            fontSize: BODY_SIZE,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          Loading markets…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            ...panelStyle,
            padding: 40,
            textAlign: "center",
            fontSize: BODY_SIZE,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          No markets found
          {activeCategory !== "All" && (
            <span>
              {" "}in <strong style={{ color: "#0a84ff" }}>{activeCategory}</strong>
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((m) => (
            <MarketCard key={m.slug} market={m} livePrice={livePrices[m.tokenId]} />
          ))}
        </div>
      )}

      {/* Footer label */}
      <div
        style={{
          textAlign: "center",
          fontSize: LABEL_SIZE,
          color: "rgba(255,255,255,0.15)",
          fontFamily: "monospace",
          letterSpacing: "0.06em",
          padding: "8px 0",
        }}
      >
        LIVE · CLOB · POLYMARKET
      </div>
    </div>
  );
}
