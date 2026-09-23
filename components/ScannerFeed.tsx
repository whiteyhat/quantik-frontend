"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { HelpTooltip } from "./ui/HelpTooltip";
import { api, type AutopilotDecision } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { useNow } from "@/hooks/useNow";
import { marketLabel } from "@/components/dashboard/dashboardFit";
import { useStatusLabel } from "@/components/dashboard/useStatusLabel";

function resolveQuestion(decision: AutopilotDecision): string {
  const snapshot = decision.signal_snapshot;
  const question = snapshot && typeof snapshot.question === "string" ? snapshot.question : null;
  return marketLabel(question, decision.slug);
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

function decisionBadge(decision: AutopilotDecision): { status: string; color: string; bg: string } {
  if (decision.decision === "executed") {
    return { status: "executed", color: "#30d158", bg: "rgba(48,209,88,0.15)" };
  }

  if (decision.decision === "failed") {
    return { status: "failed", color: "#ff453a", bg: "rgba(255,69,58,0.15)" };
  }

  if (decision.reason_code === "funding" || decision.reason_code === "wallet" || decision.reason_code === "polymarket_prep") {
    return { status: "blocked", color: "#ff9f0a", bg: "rgba(255,159,10,0.15)" };
  }

  return { status: "skipped", color: "rgba(255,255,255,0.62)", bg: "rgba(255,255,255,0.08)" };
}

interface ScannerFeedProps {
  agentId: string;
}

export function ScannerFeed({ agentId }: ScannerFeedProps) {
  const t = useTranslations("scannerFeed");
  const tCommon = useTranslations("common");
  const statusLabel = useStatusLabel();
  const now = useNow(30_000);
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
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "4px 10px",
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
        <div className="feed-list">
          {decisions.slice(0, 3).map((decision) => {
            const badge = decisionBadge(decision);
            const question = resolveQuestion(decision);
            const reason = statusLabel(decision.reason_code);
            const isNew = animatingIds.has(decision.id);
            const errorText = decision.error ? (() => {
              const raw = decision.error;
              try {
                const parsed = JSON.parse(raw);
                return parsed.message ?? parsed.error ?? parsed.msg ?? raw;
              } catch {
                return raw;
              }
            })() : null;
            return (
              <div
                key={decision.id}
                data-testid="scanner-row"
                role="button"
                tabIndex={0}
                className={isNew ? "feed-row feed-row--new" : "feed-row"}
                onClick={() => router.push(`/market/${decision.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/market/${decision.slug}`);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="feed-row-badges">
                  <span
                    className="feed-row-pill"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    {statusLabel(badge.status)}
                  </span>
                </div>

                <div className="feed-row-body">
                  <div className="feed-row-title" title={question}>
                    {question}
                  </div>
                  <div className="feed-row-meta">
                    <span>{decision.direction}</span>
                    <span title={reason}>{reason}</span>
                    <span>{t("conf")} {resolveSigma(decision)}</span>
                    <span>{t("kelly")} {resolveKelly(decision)}</span>
                    {decision.size_usdc != null ? <span>${decision.size_usdc.toFixed(2)}</span> : null}
                  </div>
                  {errorText ? (
                    <div className="feed-row-note">{errorText}</div>
                  ) : null}
                </div>

                <span className="feed-row-time">
                  {now > 0 ? formatRelativeTime(decision.scanned_at, now, tCommon) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
