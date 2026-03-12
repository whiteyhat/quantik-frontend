"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { HelpTooltip } from "./ui/HelpTooltip";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Recommendation = "BET_YES" | "BET_NO" | "VETO" | "SKIP";

export interface ScannerResult {
  id?: string;
  slug: string;
  question: string;
  recommendation: Recommendation;
  confidence: number;    // 0–1
  kellyFraction: number; // 0–1
  scannedAt?: string;
}

const REC_CONFIG: Record<Recommendation, { labelKey: string; color: string; bg: string }> = {
  BET_YES: { labelKey: "betYes", color: "#30d158", bg: "rgba(48,209,88,0.15)"   },
  BET_NO:  { labelKey: "betNo",  color: "#ff453a", bg: "rgba(255,69,58,0.15)"   },
  VETO:    { labelKey: "veto",    color: "#FF9F0A", bg: "rgba(255,159,10,0.12)"  },
  SKIP:    { labelKey: "skip",    color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.05)" },
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
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

export function ScannerFeed() {
  const t = useTranslations("scannerFeed");
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {results.map((r, i) => {
            const id = r.id ?? r.slug ?? String(i);
            const cfg = REC_CONFIG[r.recommendation] ?? REC_CONFIG.SKIP;
            const isNew = animatingIds.has(id);
            const q = r.question ?? r.slug ?? "";
            const shortQ = q.length > 50 ? q.slice(0, 50) + "…" : q;
            return (
              <div
                key={id}
                data-testid="scanner-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animation: isNew ? "slide-in-top 0.35s ease-out" : "none",
                  transition: "background 200ms ease",
                }}
              >
                {/* Recommendation badge */}
                <span
                  data-testid={`badge-${r.recommendation}`}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}44`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: cfg.color,
                    letterSpacing: "0.06em",
                    fontFamily: "\"SF Mono\", monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(cfg.labelKey as any)}
                </span>

                {/* Question */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {shortQ}
                </span>

                {/* Confidence + Kelly */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
                    {Math.round(r.confidence * 100)}% {t("conf")}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                    {(r.kellyFraction * 100).toFixed(1)}% {t("kelly")}
                  </span>
                  {r.scannedAt && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: "monospace" }}>
                      {timeAgo(r.scannedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
