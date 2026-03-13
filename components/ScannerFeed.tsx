"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { HelpTooltip } from "./ui/HelpTooltip";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Recommendation = "BET_YES" | "BET_NO" | "VETO" | "SKIP";

export interface ScannerResult {
  id?: string;
  slug: string;
  question?: string;
  recommendation: Recommendation;
  confidence?: number;      // frontend-only alias
  sigmaConfidence?: number; // backend field name
  kellyFraction?: number;
  kelly_fraction?: number;  // backend alias
  probability?: number;     // oracle true prob
  scannedAt?: string | number;
  pipelineResult?: {
    oracle?: { yes_price?: number; market_implied?: number; estimated_true_prob?: number; calibrated_prob?: number };
    sigma?: { thesis?: string };
  } | null;
}

const REC_CONFIG: Record<Recommendation, { labelKey: string; color: string; bg: string }> = {
  BET_YES: { labelKey: "betYes", color: "#30d158", bg: "rgba(48,209,88,0.15)"   },
  BET_NO:  { labelKey: "betNo",  color: "#ff453a", bg: "rgba(255,69,58,0.15)"   },
  VETO:    { labelKey: "veto",    color: "#FF9F0A", bg: "rgba(255,159,10,0.12)"  },
  SKIP:    { labelKey: "skip",    color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.05)" },
};

function timeAgo(val?: string | number): string {
  if (val == null) return "";
  const ts = typeof val === "number" ? val : new Date(val).getTime();
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function resolveConf(r: ScannerResult): number {
  const raw = r.sigmaConfidence ?? r.confidence ?? 0;
  return Number.isFinite(raw) ? raw : 0;
}

function resolveKelly(r: ScannerResult): number {
  const raw = r.kellyFraction ?? r.kelly_fraction ?? 0;
  return Number.isFinite(raw) ? raw : 0;
}

function resolveProb(r: ScannerResult): number | null {
  const raw = r.probability
    ?? r.pipelineResult?.oracle?.calibrated_prob
    ?? r.pipelineResult?.oracle?.estimated_true_prob;
  if (raw == null || !Number.isFinite(raw)) return null;
  return raw;
}

function resolveMarketPrice(r: ScannerResult): number | null {
  const raw = r.pipelineResult?.oracle?.market_implied ?? r.pipelineResult?.oracle?.yes_price;
  if (raw == null || !Number.isFinite(raw) || raw === 0) return null;
  return raw;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    + "?";
}

function resolveQuestion(r: ScannerResult, i: number): string {
  const q = r.question
    ?? (r.slug ? humanizeSlug(r.slug) : `Market #${i + 1}`);
  return q.length > 60 ? q.slice(0, 60) + "…" : q;
}

function RadarPulse({ scanningText }: { scanningText: string }) {
  return (
    <div
      data-testid="scanner-radar-pulse"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}
    >
      <div style={{ position: "relative", width: 56, height: 56 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid rgba(10,132,255,0.4)",
              animation: `radar-ring 2.4s ease-out ${i * 0.8}s infinite`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: "30%",
            borderRadius: "50%",
            background: "rgba(10,132,255,0.6)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "\"SF Mono\", monospace",
          letterSpacing: "0.06em",
        }}
      >
        {scanningText}
      </span>
    </div>
  );
}

const VISIBLE_DEFAULT = 3;
const VISIBLE_MAX = 10;

export function ScannerFeed() {
  const t = useTranslations("scannerFeed");
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchResults = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/scanner/results`);
      if (!res.ok) return;
      const json = await res.json();
      const data: ScannerResult[] = Array.isArray(json) ? json : json.results ?? [];
      const newIds = new Set<string>();
      data.forEach((r, i) => {
        const id = r.id ?? r.slug ?? String(i);
        newIds.add(id);
      });
      // Detect truly new rows
      const incoming = new Set<string>();
      newIds.forEach((id) => {
        if (!prevIdsRef.current.has(id)) incoming.add(id);
      });
      if (incoming.size > 0) {
        setAnimatingIds(incoming);
        setTimeout(() => setAnimatingIds(new Set()), 600);
      }
      prevIdsRef.current = newIds;
      setResults(data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchResults();
    const iv = setInterval(fetchResults, 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div data-testid="scanner-feed" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "\"SF Mono\", monospace",
            }}
          >
            {t("title")}
          </span>
          <HelpTooltip text={t("desc")} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {results.length} {t("signals")}
        </span>
      </div>

      {results.length === 0 ? (
        <RadarPulse scanningText={t("scanning")} />
      ) : (() => {
        const capped = results.filter(r => r.recommendation === "BET_YES" || r.recommendation === "BET_NO").slice(0, VISIBLE_MAX);
        const above = capped.slice(0, VISIBLE_DEFAULT);
        const below = capped.slice(VISIBLE_DEFAULT);
        const hiddenCount = below.length;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {above.map((r, i) => {
              const id = r.id ?? r.slug ?? String(i);
              const cfg = REC_CONFIG[r.recommendation] ?? REC_CONFIG.SKIP;
              const isNew = animatingIds.has(id);
              const shortQ = resolveQuestion(r, i);
              const conf = resolveConf(r);
              const kelly = resolveKelly(r);
              const oracleProb = resolveProb(r);
              const marketPrice = resolveMarketPrice(r);
              const edge = oracleProb != null && marketPrice != null
                ? oracleProb - marketPrice
                : null;
              return (
                <div
                  key={id}
                  data-testid="scanner-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: "8px 10px",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    animation: isNew ? "slide-in-top 0.35s ease-out" : "none",
                  }}
                >
                  {/* Recommendation badge */}
                  <span
                    data-testid={`badge-${r.recommendation}`}
                    style={{
                      padding: "2px 7px",
                      borderRadius: 100,
                      background: cfg.bg,
                      border: `1px solid ${cfg.color}44`,
                      fontSize: 9,
                      fontWeight: 700,
                      color: cfg.color,
                      letterSpacing: "0.07em",
                      fontFamily: "\"SF Mono\", monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t(cfg.labelKey as any)}
                  </span>

                  {/* Question */}
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.78)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shortQ}
                  </span>

                  {/* Confidence + time */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: conf >= 0.7 ? "#30d158" : conf >= 0.5 ? "#ff9f0a" : "rgba(255,255,255,0.35)",
                        fontFamily: '"SF Mono", monospace',
                      }}
                    >
                      {Math.round(conf * 100)}% sure
                    </span>
                    {r.scannedAt && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
                        {timeAgo(r.scannedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {hiddenCount > 0 && (
              <>
                {/* Animated extra rows */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    overflow: "hidden",
                    maxHeight: expanded ? `${hiddenCount * 56}px` : "0px",
                    opacity: expanded ? 1 : 0,
                    transition: "max-height 320ms cubic-bezier(0.4,0,0.2,1), opacity 240ms ease",
                  }}
                >
                  {below.map((r, i) => {
                    const id = r.id ?? r.slug ?? String(VISIBLE_DEFAULT + i);
                    const cfg = REC_CONFIG[r.recommendation] ?? REC_CONFIG.SKIP;
                    const isNew = animatingIds.has(id);
                    const shortQ = resolveQuestion(r, VISIBLE_DEFAULT + i);
                    const conf = resolveConf(r);
                    return (
                      <div
                        key={id}
                        data-testid="scanner-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          alignItems: "center",
                          gap: "8px 10px",
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          animation: isNew ? "slide-in-top 0.35s ease-out" : "none",
                        }}
                      >
                        <span
                          data-testid={`badge-${r.recommendation}`}
                          style={{
                            padding: "2px 7px",
                            borderRadius: 100,
                            background: cfg.bg,
                            border: `1px solid ${cfg.color}44`,
                            fontSize: 9,
                            fontWeight: 700,
                            color: cfg.color,
                            letterSpacing: "0.07em",
                            fontFamily: '"SF Mono", monospace',
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t(cfg.labelKey as any)}
                        </span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shortQ}
                        </span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: conf >= 0.7 ? "#30d158" : conf >= 0.5 ? "#ff9f0a" : "rgba(255,255,255,0.35)", fontFamily: '"SF Mono", monospace' }}>
                            {Math.round(conf * 100)}% sure
                          </span>
                          {r.scannedAt && (
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
                              {timeAgo(r.scannedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  style={{
                    marginTop: 2,
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.40)",
                    fontSize: 11,
                    fontFamily: '"SF Mono", monospace',
                    letterSpacing: "0.06em",
                    transition: "background 150ms ease, color 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.40)";
                  }}
                >
                  <span style={{ fontSize: 9, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)", display: "inline-block" }}>▼</span>
                  {expanded ? "SHOW LESS" : `+${hiddenCount} MORE SIGNALS`}
                </button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
