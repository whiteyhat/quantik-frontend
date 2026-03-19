"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HelpTooltip } from "./ui/HelpTooltip";
import { api, type AutopilotDecision } from "@/lib/api";

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    + "?";
}

function resolveQuestion(decision: AutopilotDecision): string {
  const snapshot = decision.signal_snapshot;
  const question = snapshot && typeof snapshot.question === "string"
    ? snapshot.question
    : humanizeSlug(decision.slug);
  return question.length > 64 ? `${question.slice(0, 64)}…` : question;
}

function resolveSigma(decision: AutopilotDecision): string {
  const value = decision.signal_snapshot && typeof decision.signal_snapshot.sigmaConfidence === "number"
    ? decision.signal_snapshot.sigmaConfidence
    : null;
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function resolveKelly(decision: AutopilotDecision): string {
  const value = decision.signal_snapshot && typeof decision.signal_snapshot.kellyFraction === "number"
    ? decision.signal_snapshot.kellyFraction
    : null;
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function humanizeReason(reasonCode: string): string {
  return reasonCode.replace(/_/g, " ").toUpperCase();
}

function decisionBadge(decision: AutopilotDecision): { label: string; color: string; bg: string } {
  if (decision.decision === "executed") {
    return { label: "EXECUTED", color: "#30d158", bg: "rgba(48,209,88,0.15)" };
  }

  if (decision.decision === "failed") {
    return { label: "FAILED", color: "#ff453a", bg: "rgba(255,69,58,0.15)" };
  }

  if (decision.reason_code === "funding" || decision.reason_code === "wallet" || decision.reason_code === "polymarket_prep") {
    return { label: "BLOCKED", color: "#ff9f0a", bg: "rgba(255,159,10,0.15)" };
  }

  return { label: "SKIPPED", color: "rgba(255,255,255,0.62)", bg: "rgba(255,255,255,0.08)" };
}

interface ScannerFeedProps {
  agentId: string;
}

export function ScannerFeed({ agentId }: ScannerFeedProps) {
  const t = useTranslations("scannerFeed");
  const router = useRouter();
  const [decisions, setDecisions] = useState<AutopilotDecision[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const fetchDecisions = async () => {
      try {
        const next = await api.getAutopilotDecisions(agentId, 12);
        if (!active) return;

        const nextIds = new Set(next.map((entry) => entry.id));
        const incoming = new Set<string>();
        nextIds.forEach((id) => {
          if (!prevIdsRef.current.has(id)) incoming.add(id);
        });

        if (incoming.size > 0) {
          setAnimatingIds(incoming);
          window.setTimeout(() => setAnimatingIds(new Set()), 600);
        }

        prevIdsRef.current = nextIds;
        setDecisions(next);
      } catch {
        if (active) setDecisions([]);
      }
    };

    fetchDecisions();
    const interval = window.setInterval(fetchDecisions, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [agentId]);

  return (
    <div data-testid="scanner-feed" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
          <HelpTooltip text={t("agentDesc")} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {decisions.length} {t("signals")}
        </span>
      </div>

      {decisions.length === 0 ? (
        <div
          data-testid="scanner-feed-empty"
          style={{
            padding: "28px 0",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.32)",
            fontFamily: "\"SF Mono\", monospace",
            letterSpacing: "0.05em",
          }}
        >
          {t("noDecisions")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {decisions.slice(0, 8).map((decision) => {
            const badge = decisionBadge(decision);
            const question = resolveQuestion(decision);
            const isNew = animatingIds.has(decision.id);
            return (
              <div
                key={decision.id}
                data-testid="scanner-row"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/market/${decision.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/market/${decision.slug}`);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: "8px 10px",
                  padding: "9px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animation: isNew ? "slide-in-top 0.35s ease-out" : "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: badge.color,
                    background: badge.bg,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "4px 8px",
                    fontFamily: "\"SF Mono\", monospace",
                  }}
                >
                  {badge.label}
                </span>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.72)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {question}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.34)",
                      fontFamily: "\"SF Mono\", monospace",
                    }}
                  >
                    <span>{decision.direction}</span>
                    <span>{humanizeReason(decision.reason_code)}</span>
                    <span>{t("conf")} {resolveSigma(decision)}</span>
                    <span>{t("kelly")} {resolveKelly(decision)}</span>
                    {decision.size_usdc != null ? <span>${decision.size_usdc.toFixed(2)}</span> : null}
                  </div>
                  {decision.error ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "rgba(255,159,10,0.82)",
                        lineHeight: 1.4,
                      }}
                    >
                      {decision.error}
                    </div>
                  ) : null}
                </div>

                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: "\"SF Mono\", monospace",
                  }}
                >
                  {timeAgo(decision.scanned_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
