"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import { SigmaDecision } from "./SigmaDecision";
import { SignalValidator } from "./SignalValidator";
import {
  getAuthToken,
  type SigmaResult,
  type EdgeResult,
  type AuraResult,
  type FluxResult,
  type OracleResult,
  type ClauseResult,
  type LuciferResult,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Sanitize HTML to only allow safe inline tags (strong, em, br)
function sanitizeInlineHtml(text: string): string {
  return text.replace(/<(?!\/?(?:strong|em|br)\b)[^>]*>/gi, "").trim();
}

/* ── Shared primitives ──────────────────────────────────────────────────────── */

function CardBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 6,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function AgentTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          cursor: "help",
          flexShrink: 0,
          transition: "border-color 150ms, color 150ms",
          ...(show ? { borderColor: "rgba(255,255,255,0.35)", color: "var(--text-secondary)" } : {}),
        }}
      >
        ?
      </span>
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14,14,22,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.5,
            width: 220,
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "normal",
            boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

function CardHeader({
  emoji,
  name,
  badge,
  tooltip,
}: {
  emoji: string;
  name: string;
  badge?: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {name}
        </span>
        {tooltip && <AgentTooltip text={tooltip} />}
      </div>
      {badge}
    </div>
  );
}

function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
      <span
        className="font-mono-data"
        style={{ fontSize: 12, fontWeight: 600, color: valueColor ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Sentiment Gauge ─────────────────────────────────────────────────────────── */

function SentimentGauge({ score }: { score: number }) {
  const r = 36;
  const circumference = Math.PI * r;
  const normalized = Math.max(0, Math.min(1, (score + 1) / 2));
  const fillLength = circumference * normalized;
  const color =
    score >= 0.3 ? "var(--ios-green)" : score <= -0.3 ? "var(--ios-red)" : "var(--ios-orange)";

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg viewBox="0 0 100 54" style={{ width: "100%", maxWidth: 110, display: "block", margin: "0 auto 4px" }}>
      <path d="M 14 50 A 36 36 0 0 1 86 50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M 14 50 A 36 36 0 0 1 86 50"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={animated ? `${fillLength} ${circumference}` : `0 ${circumference}`}
        style={{ transition: "stroke-dasharray 900ms ease" }}
      />
    </svg>
  );
}

/* ── Oracle probability ring ─────────────────────────────────────────────────── */

function ProbabilityRing({ prob, market }: { prob: number; market: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  // SVG dimensions
  const size = 96;
  const cx = size / 2;
  const cy = size / 2;

  // Outer ring: oracle prob (purple)
  const R_OUTER = 38;
  const STROKE_OUTER = 7;
  const circOuter = 2 * Math.PI * R_OUTER;
  const fillOuter = animated ? circOuter * Math.max(prob, 0.02) : 0;

  // Inner ring: market implied (dim white)
  const R_INNER = 27;
  const STROKE_INNER = 5;
  const circInner = 2 * Math.PI * R_INNER;
  const fillInner = animated ? circInner * Math.max(market, 0.02) : 0;

  // Rotate so arcs start from top (-90deg)
  const rotate = "rotate(-90 48 48)";

  const delta = prob - market;
  const deltaColor = delta > 0.02 ? "var(--ios-green)" : delta < -0.02 ? "var(--ios-red)" : "var(--text-tertiary)";
  const deltaSign = delta >= 0 ? "+" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "6px 0 2px" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer track */}
        <circle cx={cx} cy={cy} r={R_OUTER} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE_OUTER} />
        {/* Outer fill — oracle */}
        <circle
          cx={cx} cy={cy} r={R_OUTER}
          fill="none"
          stroke="var(--ios-purple)"
          strokeWidth={STROKE_OUTER}
          strokeLinecap="round"
          strokeDasharray={`${fillOuter} ${circOuter}`}
          transform={rotate}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.34,1.56,0.64,1)" }}
        />
        {/* Inner track */}
        <circle cx={cx} cy={cy} r={R_INNER} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE_INNER} />
        {/* Inner fill — market */}
        <circle
          cx={cx} cy={cy} r={R_INNER}
          fill="none"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth={STROKE_INNER}
          strokeLinecap="round"
          strokeDasharray={`${fillInner} ${circInner}`}
          transform={rotate}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.34,1.56,0.64,1) 100ms" }}
        />
        {/* Center: delta label */}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill={deltaColor} fontFamily="'SF Mono','JetBrains Mono',monospace">
          {deltaSign}{Math.round(delta * 100)}%
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="'SF Mono','JetBrains Mono',monospace" letterSpacing="0.04em">
          EDGE
        </text>
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ios-purple)" }} />
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>MODEL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.30)" }} />
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>MARKET</span>
        </div>
      </div>
    </div>
  );
}

function ClickToOpen() {
  const t = useTranslations("agentPipeline");
  return (
    <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "var(--ios-blue)", opacity: 0.7 }}>
      {t("clickToOpen")}
    </span>
  );
}

/* ── Source Pill with tooltip ────────────────────────────────────────────────── */

function SourcePill({ article }: { article: { title: string; url: string; source: string } }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <a
        href={article.url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-block",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 6,
          color: "var(--ios-blue)",
          background: "rgba(10,132,255,0.10)",
          border: "1px solid rgba(10,132,255,0.20)",
          textDecoration: "none",
          cursor: article.url ? "pointer" : "default",
          transition: "background 150ms",
          whiteSpace: "nowrap",
          letterSpacing: "0.04em",
          fontFamily: '"SF Mono","JetBrains Mono",monospace',
        }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        {article.source || "Source"}
      </a>
      {show && article.title && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14,14,22,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.45,
            width: 210,
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "normal",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          {article.title}
          {article.url && (
            <ClickToOpen />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Aura Card ───────────────────────────────────────────────────────────────── */

function AuraCard({ data, status }: { data?: AuraResult; status: string }) {
  const t = useTranslations("agentPipeline");
  const isIdle = status === "idle";
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const score = num(data?.sentiment_score);
  const sentimentLabel =
    score >= 0.5 ? t("sentimentBullish") : score >= 0.1 ? t("sentimentPositive") : score <= -0.5 ? t("sentimentBearish") : score <= -0.1 ? t("sentimentNegative") : t("sentimentNeutral");
  const badgeColor =
    score >= 0.1 ? "var(--ios-purple)" : score <= -0.1 ? "var(--ios-red)" : "var(--ios-orange)";
  const scoreColor = score >= 0 ? "var(--ios-green)" : "var(--ios-red)";
  const articles = data?.newsArticles?.slice(0, 5) ?? [];
  const visibleArticles = articles.slice(0, 3);
  const overflowArticles = articles.slice(3);
  const sourceStatus = data?.sourceStatus ?? {};
  const allSources = Object.keys(sourceStatus).filter((s) => s !== "news" && s !== "telegram");
  const hasCollapsible = overflowArticles.length > 0 || allSources.length > 0;

  return (
    <div className="glass-card" style={{ padding: 16, opacity: isIdle ? 0.5 : 1, transition: "opacity 300ms" }}>
      <CardHeader
        emoji="🌊"
        name="Aura"
        badge={data ? <CardBadge label={sentimentLabel} color={badgeColor} /> : undefined}
        tooltip={t("auraTooltip")}
      />
      {data ? (
        <>
          <SentimentGauge score={score} />
          <div
            className="font-mono-data"
            style={{ fontSize: 22, fontWeight: 800, color: scoreColor, textAlign: "center", marginBottom: 10 }}
          >
            {score >= 0 ? "+" : ""}{score.toFixed(2)}
          </div>

          {/* Summary */}
          {data.summary && (
            <p style={{
              fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5,
              margin: "0 0 8px", padding: 0,
            }}>
              {data.summary}
            </p>
          )}

          {/* News article pills */}
          {articles.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {visibleArticles.map((a, i) => (
                  <SourcePill key={i} article={a} />
                ))}
                {hasCollapsible && !sourcesExpanded && (
                  <button
                    onClick={() => setSourcesExpanded(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      color: "var(--text-tertiary)",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      fontFamily: '"SF Mono","JetBrains Mono",monospace',
                      letterSpacing: "0.04em",
                      transition: "all 150ms",
                    }}
                  >
                    +{overflowArticles.length + allSources.length}
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transition: "transform 200ms ease" }}>
                      <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              {hasCollapsible && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: sourcesExpanded ? "1fr" : "0fr",
                    transition: "grid-template-rows 250ms ease",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    {overflowArticles.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 5 }}>
                        {overflowArticles.map((a, i) => (
                          <SourcePill key={i + 3} article={a} />
                        ))}
                      </div>
                    )}
                    {allSources.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 6 }}>
                        {allSources.map((s) => {
                          const st = sourceStatus[s];
                          const isOk = st === "ok";
                          const isTimeout = st === "timeout";
                          return (
                            <span
                              key={s}
                              title={`${s}: ${st}`}
                              style={{
                                fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                                padding: "1px 6px", borderRadius: 4,
                                fontFamily: '"SF Mono","JetBrains Mono",monospace',
                                color: isOk ? "var(--ios-green)" : isTimeout ? "var(--ios-orange)" : "var(--text-tertiary)",
                                background: isOk ? "rgba(48,209,88,0.10)" : isTimeout ? "rgba(255,160,0,0.08)" : "rgba(255,255,255,0.05)",
                                border: `1px solid ${isOk ? "rgba(48,209,88,0.20)" : isTimeout ? "rgba(255,160,0,0.15)" : "rgba(255,255,255,0.08)"}`,
                              }}
                            >
                              {isOk ? "●" : isTimeout ? "◌" : "○"} {s}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ paddingTop: 5 }}>
                      <button
                        onClick={() => setSourcesExpanded(false)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          color: "var(--text-tertiary)",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          fontFamily: '"SF Mono","JetBrains Mono",monospace',
                          letterSpacing: "0.04em",
                          transition: "all 150ms",
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transform: "rotate(180deg)" }}>
                          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <IdlePlaceholder status={status} />
      )}
    </div>
  );
}

/* ── Flux Card ───────────────────────────────────────────────────────────────── */

function FluxCard({ data, status }: { data?: FluxResult; status: string }) {
  const t = useTranslations("agentPipeline");
  const isIdle = status === "idle";
  const gradeColors: Record<string, string> = {
    A: "var(--ios-green)", B: "var(--ios-blue)", C: "var(--ios-orange)", D: "var(--ios-red)",
  };
  const gradeColor = gradeColors[data?.liquidity_grade ?? ""] ?? "var(--text-tertiary)";
  const spread = num(data?.spread);
  const depth = num(data?.depth_score);
  const depthLabel = depth > 0.7 ? `${t("depthHigh")} (K)` : depth > 0.4 ? t("validator.medium") : depth > 0 ? t("validator.low") : "—";

  return (
    <div className="glass-card" style={{ padding: 16, opacity: isIdle ? 0.5 : 1, transition: "opacity 300ms" }}>
      <CardHeader
        emoji="⚡"
        name="Flux"
        badge={data ? <CardBadge label={`GRADE ${data.liquidity_grade}`} color={gradeColor} /> : undefined}
        tooltip={t("fluxTooltip")}
      />
      {data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <SpreadRow label={t("spread")} value={`${spread.toFixed(1)}¢`} fill={Math.min(spread / 5, 1)} color="var(--ios-blue)" />
          <MetricRow label={t("depth")} value={depthLabel} />
          <MetricRow label={t("slippage")} value={spread > 0 ? `${(spread * 0.15).toFixed(1)}¢` : "—"} />
          {(data.whale_signals ?? 0) > 0 && (
            <MetricRow label={t("whaleSignals")} value={String(data.whale_signals)} valueColor="var(--ios-purple)" />
          )}
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.45, margin: "8px 0 0" }}>
            {data.liquidity_grade === "A" || data.liquidity_grade === "B"
              ? depth > 0.7 ? t("fluxDescABPlenty") : t("fluxDescABEnough")
              : data.liquidity_grade === "C"
                ? t("fluxDescC")
                : t("fluxDescD")}
          </p>
        </div>
      ) : (
        <IdlePlaceholder status={status} />
      )}
    </div>
  );
}

function SpreadRow({ label, value, fill, color }: { label: string; value: string; fill: number; color: string }) {
  const [animatedFill, setAnimatedFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedFill(fill), 80);
    return () => clearTimeout(t);
  }, [fill]);

  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
        <span className="font-mono-data" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${animatedFill * 100}%`, background: color, borderRadius: 2, transition: "width 700ms ease" }} />
      </div>
    </div>
  );
}

/* ── Oracle Card ─────────────────────────────────────────────────────────────── */

function OracleCard({ data, status }: { data?: OracleResult; status: string }) {
  const t = useTranslations("pipelineLog");
  const tAgent = useTranslations("agentPipeline");
  const isIdle = status === "idle";
  const prob = num(data?.prob_estimate);
  const conf = num(data?.confidence);
  const market = num(data?.market_implied);

  const delta = prob - market;
  const insightText =
    delta > 0.02
      ? t("oracleBullish")
      : delta < -0.02
        ? t("oracleBearish")
        : t("oracleNeutral");

  return (
    <div
      className="glass-card"
      style={{ padding: 16, opacity: isIdle ? 0.5 : 1, transition: "opacity 300ms" }}
    >
      <CardHeader emoji="🔮" name="Oracle" tooltip={tAgent("oracleTooltip")} />
      {data ? (
        <>
          <div
            className="font-mono-data"
            style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", textAlign: "center", lineHeight: 1, marginBottom: 2 }}
          >
            {Math.round(prob * 100)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--ios-purple)", textAlign: "center", marginBottom: 2 }}>
            {"±"}{conf.toFixed(1)}% {t("oracleConfidence")}
          </div>
          <ProbabilityRing prob={prob} market={market} />
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              textAlign: "center",
              lineHeight: 1.5,
              marginTop: 6,
              padding: "0 4px",
            }}
          >
            {insightText}
          </div>
        </>
      ) : (
        <IdlePlaceholder status={status} />
      )}
    </div>
  );
}

/* ── Clause Card ─────────────────────────────────────────────────────────────── */

function ClauseCard({ data, status }: { data?: ClauseResult; status: string }) {
  const t = useTranslations("agentPipeline");
  const isIdle = status === "idle";
  const riskColors: Record<string, string> = {
    LOW: "var(--ios-green)", MED: "var(--ios-orange)", HIGH: "var(--ios-red)",
  };
  const isClear = data?.resolution_risk === "LOW" || !data?.technicality_risks?.length;
  const riskColor = riskColors[data?.resolution_risk ?? ""] ?? "var(--ios-green)";

  return (
    <div className="glass-card" style={{ padding: 16, opacity: isIdle ? 0.5 : 1, transition: "opacity 300ms" }}>
      <CardHeader
        emoji="⚖️"
        name="Clause"
        badge={data ? <CardBadge label={isClear ? t("panels.echoChamberClear") : data.resolution_risk} color={riskColor} /> : undefined}
        tooltip={t("clauseTooltip")}
      />
      {data ? (
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: `color-mix(in srgb, ${riskColor} 15%, transparent)`,
              border: `2px solid color-mix(in srgb, ${riskColor} 30%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <span style={{ fontSize: 20, color: riskColor }}>{isClear ? "✓" : "⚠"}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {isClear ? t("clauseClear") : t("clauseRisks", { count: data.technicality_risks?.length })}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {isClear ? t("clauseCompliant") : data.technicality_risks?.[0] ?? t("clauseReviewRequired")}
          </div>
        </div>
      ) : (
        <IdlePlaceholder status={status} />
      )}
    </div>
  );
}

/* ── Edge Card ───────────────────────────────────────────────────────────────── */

function EdgeCard({ data, status }: { data?: EdgeResult; status: string }) {
  const t = useTranslations("agentPipeline");
  const isIdle = status === "idle";
  const ev = num(data?.net_ev);
  const kelly = num(data?.kelly);
  const pMkt = num(data?.["p_mkt" as keyof EdgeResult] as unknown);

  return (
    <div className="glass-card" style={{ padding: 16, opacity: isIdle ? 0.5 : 1, transition: "opacity 300ms" }}>
      <CardHeader
        emoji="📐"
        name="Edge"
        badge={data ? <CardBadge label="EVA" color="var(--ios-purple)" /> : undefined}
        tooltip={t("edgeTooltip")}
      />
      {data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {pMkt > 0 && <MetricRow label={t("edgePMkt")} value={pMkt.toFixed(3)} />}
          <MetricRow
            label={t("edgeLabel")}
            value={`${ev > 0 ? "+" : ""}${ev.toFixed(1)}%`}
            valueColor={ev > 0 ? "var(--ios-green)" : "var(--ios-red)"}
          />
          <MetricRow
            label={t("evGrade")}
            value={data.ev_grade}
            valueColor={data.ev_grade === "A" ? "var(--ios-green)" : data.ev_grade === "B" ? "var(--ios-blue)" : "var(--ios-orange)"}
          />
          <MetricRow
            label={t("kellyLabel")}
            value={`${(kelly * 100).toFixed(1)}%`}
            valueColor="var(--ios-green)"
          />
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.45, margin: "8px 0 0" }}>
            {ev > 3 ? t("edgeDescStrong") : ev > 0 ? t("edgeDescModest") : t("edgeDescWeak")}
          </p>
        </div>
      ) : (
        <IdlePlaceholder status={status} />
      )}
    </div>
  );
}

/* ── Idle placeholder ─────────────────────────────────────────────────────────── */

function IdlePlaceholder({ status }: { status: string }) {
  const t = useTranslations("agentPipeline");
  const isRunning = status === "running";
  return (
    <div style={{ textAlign: "center", padding: "16px 0", color: isRunning ? "var(--ios-blue)" : "var(--text-tertiary)", fontSize: 12 }}>
      {isRunning ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ios-blue)", display: "inline-block", animation: "pipelinePulse 1.2s ease-in-out infinite" }} />
          {t("analyzing")}
        </span>
      ) : (
        t("awaitingPipeline")
      )}
    </div>
  );
}

function buildReplayInsightText({
  sigma,
  oracle,
  aura,
  clause,
  marketYesPrice,
}: {
  sigma?: SigmaResult;
  oracle?: OracleResult;
  aura?: AuraResult;
  clause?: ClauseResult;
  marketYesPrice?: number;
}): string {
  const storedPlainSummary =
    typeof sigma?.plain_summary === "string" ? sigma.plain_summary.trim() : "";
  if (storedPlainSummary) return storedPlainSummary;

  const decision = sigma?.decision ?? "SKIP";
  const confidence = num(sigma?.confidence);
  const modelProb = num(oracle?.prob_estimate);
  const marketProb = num(oracle?.market_implied) || num(marketYesPrice);
  const sentiment = num(aura?.sentiment_score);
  const resolutionRisk = clause?.resolution_risk ?? "MED";
  const riskPhrase =
    resolutionRisk === "HIGH"
      ? "Contract risk was high."
      : resolutionRisk === "LOW"
        ? "Contract risk stayed low."
        : "Contract risk was moderate.";
  const sentimentPhrase =
    sentiment > 0.15
      ? "Sentiment also leaned positive."
      : sentiment < -0.15
        ? "Sentiment leaned negative."
        : "";

  if (decision === "PASS" || decision === "SKIP") {
    if (modelProb > 0 && marketProb > 0) {
      return `The model did not see a strong enough pricing gap to justify a trade. It estimated about ${Math.round(modelProb * 100)}% odds versus the market near ${Math.round(marketProb * 100)}%. ${riskPhrase}`;
    }
    return `The historical run ended without a trade because the setup was not strong enough. ${riskPhrase}`;
  }

  if (decision === "VETO") {
    return `The setup was rejected before execution because the contract or risk checks looked too fragile. ${riskPhrase}`;
  }

  const side = decision === "BET_NO" ? "NO" : "YES";
  if (modelProb > 0 && marketProb > 0) {
    return `The model leaned ${side} at ${confidence.toFixed(0)}% confidence because it estimated about ${Math.round(modelProb * 100)}% odds while the market was near ${Math.round(marketProb * 100)}%. ${riskPhrase} ${sentimentPhrase}`.trim();
  }

  return `The model leaned ${side} at ${confidence.toFixed(0)}% confidence based on the stored agent outputs from this run. ${riskPhrase} ${sentimentPhrase}`.trim();
}

/* ── Synthesized Insight ──────────────────────────────────────────────────────── */

function SynthesizedInsight({
  sigma,
  edge,
  insightText,
  insightLoading,
}: {
  sigma: SigmaResult;
  edge?: EdgeResult;
  insightText: string;
  insightLoading: boolean;
}) {
  const t = useTranslations("agentPipeline");
  const fallback = (() => {
    const conf = num(sigma.confidence);
    const ev = num(edge?.net_ev);
    if (typeof sigma.plain_summary === "string" && sigma.plain_summary.trim()) {
      return sigma.plain_summary.trim();
    }
    if (sigma.thesis) return sigma.thesis;
    if (conf > 0 && ev > 0)
      return t("insightFallbackEdge", { conf: conf.toFixed(0) });
    if (conf > 0)
      return t("insightFallbackProb", { conf: conf.toFixed(0) });
    return t("insightFallbackDefault");
  })();

  const displayText = insightText || fallback;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        background: "rgba(191,90,242,0.06)",
        border: "1px solid rgba(191,90,242,0.15)",
        borderLeft: "3px solid var(--ios-purple)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{"✨"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {t("synthesizedInsight")}
        </div>
        {insightLoading && !insightText ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "var(--ios-purple)",
                    opacity: 0.6,
                    animation: `relayPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t("relaySynthesizing")}</span>
            <style>{`@keyframes relayPulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {displayText}
            {insightLoading && (
              <span className="animate-pulse" style={{ marginLeft: 2, color: "var(--ios-purple)" }}>▌</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Alpha Signal Card ────────────────────────────────────────────────────────── */

function AlphaSignalCard({ sigma, edge }: { sigma: SigmaResult; edge?: EdgeResult }) {
  const t = useTranslations("agentPipeline");
  const wallet = useQuantikStore((s) => s.wallet);
  const bankroll = wallet?.onChainUsdc ?? wallet?.usdc ?? 0;
  const sizeUsd = num(sigma.size_usd) || (edge && bankroll > 0 ? bankroll * num(edge.recommended_size) / 100 : 0);
  const ev = num(edge?.net_ev);
  const expectedValue = sizeUsd * (ev / 100);
  const kellySize = edge && bankroll > 0 ? bankroll * num(edge.kelly) : 0;

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>{"⚡"}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{t("alphaSignal")}</span>
        <AgentTooltip text={t("alphaSignalTooltip")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {t("expectedValue")}
          </div>
          <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 800, color: expectedValue >= 0 ? "var(--ios-green)" : "var(--ios-red)" }}>
            {expectedValue >= 0 ? "+" : ""}${Math.abs(expectedValue).toFixed(0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {t("kellySize")}
          </div>
          <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 800, color: "var(--ios-blue)" }}>
            ${kellySize > 0 ? kellySize.toFixed(0) : sizeUsd.toFixed(0)}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
        {bankroll > 0
          ? t("bankrollDesc", { amount: (bankroll / 1000).toFixed(0) })
          : t("noBankroll")}
      </div>
    </div>
  );
}

/* ── Lucifer Critic Card ──────────────────────────────────────────────────────── */

function LuciferCriticCard({ data }: { data?: LuciferResult }) {
  const t = useTranslations("agentPipeline");
  const daScore = num(data?.devils_advocate_score);
  const isVeto = daScore > 0.7;
  const isAccept = daScore <= 0.5;
  const badgeColor = isVeto ? "var(--ios-red)" : isAccept ? "var(--ios-green)" : "var(--ios-orange)";
  const badgeLabel = isVeto ? t("verdictVeto") : isAccept ? t("verdictAccept") : t("verdictReview");

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>{"😈"}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{t("luciferTitle")}</span>
          <AgentTooltip text={t("luciferTooltip")} />
        </div>
      </div>
      {data ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {t("adversarialScore")}
              </div>
              <span className="font-mono-data" style={{ fontSize: 22, fontWeight: 800, color: badgeColor }}>
                {daScore.toFixed(2)}
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 400 }}>/1.00</span>
              </span>
            </div>
            <CardBadge label={badgeLabel} color={badgeColor} />
          </div>
          {data.counter_thesis && (
            <p
              style={{
                fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0, fontStyle: "italic",
                borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
              }}
              dangerouslySetInnerHTML={{
                __html: `\u201C${sanitizeInlineHtml(data.counter_thesis)}\u201D`,
              }}
            />
          )}
        </>
      ) : (
        <IdlePlaceholder status="idle" />
      )}
    </div>
  );
}

/* ── AgentPipeline ────────────────────────────────────────────────────────────── */

interface AgentPipelineProps {
  market?: {
    slug: string;
    tokenId: string;
    yesTokenId?: string;
    noTokenId?: string;
    question: string;
    yesPrice: number;
    noPrice: number;
  };
}

export function AgentPipeline({ market }: AgentPipelineProps) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const agents = pipeline.agents;

  const sigmaData = agents.sigma?.data as SigmaResult | undefined;
  const edgeData = agents.edge?.data as EdgeResult | undefined;
  const auraData = agents.aura?.data as AuraResult | undefined;
  const fluxData = agents.flux?.data as FluxResult | undefined;
  const luciferData = agents.lucifer?.data as LuciferResult | undefined;
  const oracleData = agents.oracle?.data as OracleResult | undefined;
  const clauseData = agents.clause?.data as ClauseResult | undefined;
  const replayInsightText =
    pipeline.source === "replay"
      ? buildReplayInsightText({
          sigma: sigmaData,
          oracle: oracleData,
          aura: auraData,
          clause: clauseData,
          marketYesPrice: market?.yesPrice,
        })
      : "";

  // Relay-generated synthesized insight
  const [insightText, setInsightText] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const insightFiredRef = useRef(false);

  useEffect(() => {
    setInsightText("");
    setInsightLoading(false);
    insightFiredRef.current = false;
  }, [pipeline.version]);

  useEffect(() => {
    if (!sigmaData || insightFiredRef.current || pipeline.source !== "live") return;
    insightFiredRef.current = true;
    const token = getAuthToken();
    const sessionId = `pipeline-${crypto.randomUUID()}`;

    const pipelineData = {
      sigma: sigmaData,
      edge: edgeData,
      aura: auraData,
      flux: fluxData,
    };

    setInsightLoading(true);

    fetch(`${API_URL}/api/v1/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: `Given this trading pipeline analysis, write exactly 1 sentence (under 35 words) for someone with no finance background. Say something like: "Our model thinks there's a 58% chance this happens, but the market only says 45% — that gap means it might be underpriced right now." Use plain English, no jargon.`,
        sessionId,
        pipelineData,
      }),
    })
      .then(async (res) => {
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/event-stream")) {
          const data = await res.json();
          setInsightText(data.reply ?? "");
          setInsightLoading(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6).trim()) as {
                type: string;
                token?: string;
                reply?: string;
              };
              if (event.type === "token" && event.token) {
                accumulated += event.token;
                setInsightText(accumulated);
              } else if (event.type === "done") {
                if (event.reply) setInsightText(event.reply);
                setInsightLoading(false);
              }
            } catch {
              // skip
            }
          }
        }
        setInsightLoading(false);
      })
      .catch(() => {
        setInsightLoading(false);
      });
  }, [pipeline.source, sigmaData, edgeData, auraData, fluxData]);

  return (
    <div style={{ position: "relative" }}>
      {/* 5-column compact agent card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
        <AuraCard data={auraData} status={agents.aura?.status ?? "idle"} />
        <FluxCard data={fluxData} status={agents.flux?.status ?? "idle"} />
        <OracleCard data={oracleData} status={agents.oracle?.status ?? "idle"} />
        <ClauseCard data={clauseData} status={agents.clause?.status ?? "idle"} />
        <EdgeCard data={edgeData} status={agents.edge?.status ?? "idle"} />
      </div>

      {/* Synthesized Insight — LLM via relay */}
      {(sigmaData || insightLoading) && (
        <SynthesizedInsight
          sigma={sigmaData ?? ({} as SigmaResult)}
          edge={edgeData}
          insightText={pipeline.source === "replay" ? replayInsightText : insightText}
          insightLoading={pipeline.source === "live" ? insightLoading : false}
        />
      )}

      {/* 3-column: Alpha Signal | Lucifer | Validator */}
      {sigmaData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <AlphaSignalCard sigma={sigmaData} edge={edgeData} />
          <LuciferCriticCard data={luciferData} />
          <SignalValidator
            edge={edgeData}
            sigma={sigmaData}
            aura={auraData}
            flux={fluxData}
            lucifer={luciferData}
          />
        </div>
      )}

      {/* Bottom execute bar */}
      {sigmaData && market && (
        <SigmaDecision sigma={sigmaData} edge={edgeData} market={market} />
      )}
    </div>
  );
}
