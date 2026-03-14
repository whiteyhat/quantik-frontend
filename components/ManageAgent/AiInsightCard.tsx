"use client";

import { type KeyboardEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSocketEvent, type AgentAlertEvent } from "@/context/SocketContext";
import { useNow } from "@/hooks/useNow";
import type { Signal } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const panelStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(48,209,88,0.10) 0%, rgba(10,132,255,0.08) 100%)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(48,209,88,0.20)",
  borderRadius: 12,
  padding: 20,
};

function confidenceColor(c: number): string {
  if (c >= 70) return "#30d158";
  if (c >= 50) return "#ff9f0a";
  return "#ff453a";
}

function statusBadge(status: Signal["status"]): { labelKey: "trade" | "watch" | "skip"; bg: string; color: string } {
  switch (status) {
    case "TRADE":
      return { labelKey: "trade", bg: "rgba(48,209,88,0.15)", color: "#30d158" };
    case "WATCH":
      return { labelKey: "watch", bg: "rgba(255,159,10,0.15)", color: "#ff9f0a" };
    default:
      return { labelKey: "skip", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" };
  }
}

function decisionLabel(decision: string): { textKey: "yes" | "no" | "pass" | null; fallback: string; color: string } {
  const d = decision.toUpperCase();
  if (d === "BET_YES" || d === "BUY_YES" || d === "YES") return { textKey: "yes", fallback: "", color: "#30d158" };
  if (d === "BET_NO" || d === "BUY_NO" || d === "NO") return { textKey: "no", fallback: "", color: "#ff453a" };
  if (d === "PASS" || d === "SKIP") return { textKey: "pass", fallback: "", color: "rgba(255,255,255,0.40)" };
  return { textKey: null, fallback: d || "—", color: "rgba(255,255,255,0.40)" };
}

function arrowStyle(active: boolean): React.CSSProperties {
  return {
    width: 14,
    flexShrink: 0,
    display: "inline-flex",
    justifyContent: "flex-end",
    fontSize: 14,
    color: "rgba(255,255,255,0.50)",
    opacity: active ? 1 : 0,
    transition: "opacity 180ms ease",
    animation: active ? "aiInsightArrowDrift 0.8s ease-in-out infinite" : "none",
  };
}

interface AiInsightCardProps {
  signals: Signal[];
  loading: boolean;
}

export function AiInsightCard({ signals, loading }: AiInsightCardProps) {
  const t = useTranslations("insights");
  const router = useRouter();
  const now = useNow(60_000);
  const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);

  useSocketEvent<AgentAlertEvent>("agent:alert", () => {});

  const timeAgo = (ts: number): string => {
    if (!ts) return "";
    const diff = now - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("mAgo", { m: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("hAgo", { h: hrs });
    const days = Math.floor(hrs / 24);
    return t("dAgo", { d: days });
  };

  const latestSignal = signals.length > 0 ? signals[0] : null;
  const confidence = latestSignal?.confidence ?? 0;
  const confColor = confidenceColor(confidence);
  const remaining = signals.slice(1, 4);

  const openSignal = (signal: Signal) => {
    if (!signal.slug) return;
    router.push(`/market/${encodeURIComponent(signal.slug)}`);
  };

  const handleSignalKeyDown = (event: KeyboardEvent<HTMLDivElement>, signal: Signal) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openSignal(signal);
  };

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes aiInsightArrowDrift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#30d158",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {t("title")}
          </span>
        </div>
        {signals.length > 0 && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: '"SF Mono", monospace' }}>
            {signals.length} {signals.length !== 1 ? t("signals") : t("signal")}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="100%" height={40} borderRadius={6} />
          <Skeleton width="60%" height={16} borderRadius={4} />
        </div>
      ) : latestSignal ? (
        <>
          <div
            data-testid={`ai-insight-link-${latestSignal.id}`}
            role={latestSignal.slug ? "link" : undefined}
            tabIndex={latestSignal.slug ? 0 : undefined}
            onClick={latestSignal.slug ? () => openSignal(latestSignal) : undefined}
            onKeyDown={latestSignal.slug ? (event) => handleSignalKeyDown(event, latestSignal) : undefined}
            onMouseEnter={latestSignal.slug ? () => setHoveredSignalId(latestSignal.id) : undefined}
            onMouseLeave={latestSignal.slug ? () => setHoveredSignalId((current) => (current === latestSignal.id ? null : current)) : undefined}
            onFocus={latestSignal.slug ? () => setHoveredSignalId(latestSignal.id) : undefined}
            onBlur={latestSignal.slug ? () => setHoveredSignalId((current) => (current === latestSignal.id ? null : current)) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
              padding: latestSignal.slug ? "10px 12px" : 0,
              borderRadius: 10,
              border: latestSignal.slug
                ? `1px solid ${hoveredSignalId === latestSignal.id ? "rgba(255,255,255,0.12)" : "transparent"}`
                : "none",
              background: hoveredSignalId === latestSignal.id ? "rgba(255,255,255,0.04)" : "transparent",
              cursor: latestSignal.slug ? "pointer" : "default",
              transform: hoveredSignalId === latestSignal.id ? "translateX(2px)" : "translateX(0)",
              transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {(() => {
                  const badge = statusBadge(latestSignal.status);
                  return (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: badge.bg,
                        color: badge.color,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {t(badge.labelKey)}
                    </span>
                  );
                })()}
                {(() => {
                  const dec = decisionLabel(latestSignal.decision);
                  return (
                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: 11,
                        fontWeight: 700,
                        color: dec.color,
                      }}
                    >
                      {dec.textKey ? t(dec.textKey) : dec.fallback}
                    </span>
                  );
                })()}
                {latestSignal.edge !== 0 && (
                  <span
                    style={{
                      fontFamily: '"SF Mono", monospace',
                      fontSize: 10,
                      color: latestSignal.edge > 0 ? "#30d158" : "#ff453a",
                    }}
                  >
                    {latestSignal.edge > 0 ? "+" : ""}{latestSignal.edge.toFixed(1)}% {t("edge")}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: '"SF Mono", monospace' }}>
                  {timeAgo(latestSignal.timestamp)}
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                &ldquo;{latestSignal.question}&rdquo;
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.04em" }}>
                  {t("confidence")}
                </span>
                <span
                  style={{
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    fontSize: 16,
                    fontWeight: 700,
                    color: confColor,
                  }}
                >
                  {Math.round(confidence)}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(confidence, 100)}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${confColor}, #0a84ff)`,
                    transition: "width 500ms ease",
                  }}
                />
              </div>
            </div>

            {latestSignal.slug && (
              <span data-arrow aria-hidden="true" style={arrowStyle(hoveredSignalId === latestSignal.id)}>
                →
              </span>
            )}
          </div>

          {remaining.length > 0 && (
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {remaining.map((s) => {
                const badge = statusBadge(s.status);
                const dec = decisionLabel(s.decision);
                const cc = confidenceColor(s.confidence);
                const isHovered = hoveredSignalId === s.id;
                return (
                  <div
                    key={s.id}
                    data-testid={`ai-insight-link-${s.id}`}
                    role={s.slug ? "link" : undefined}
                    tabIndex={s.slug ? 0 : undefined}
                    onClick={s.slug ? () => openSignal(s) : undefined}
                    onKeyDown={s.slug ? (event) => handleSignalKeyDown(event, s) : undefined}
                    onMouseEnter={s.slug ? () => setHoveredSignalId(s.id) : undefined}
                    onMouseLeave={s.slug ? () => setHoveredSignalId((current) => (current === s.id ? null : current)) : undefined}
                    onFocus={s.slug ? () => setHoveredSignalId(s.id) : undefined}
                    onBlur={s.slug ? () => setHoveredSignalId((current) => (current === s.id ? null : current)) : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: s.slug ? "6px 8px" : "6px 0",
                      borderRadius: 8,
                      border: s.slug ? `1px solid ${isHovered ? "rgba(255,255,255,0.10)" : "transparent"}` : "none",
                      background: isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                      cursor: s.slug ? "pointer" : "default",
                      transform: isHovered ? "translateX(2px)" : "translateX(0)",
                      transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: badge.bg,
                        color: badge.color,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      {t(badge.labelKey)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: dec.color,
                        fontFamily: '"SF Mono", monospace',
                        flexShrink: 0,
                        width: 28,
                      }}
                    >
                      {dec.textKey ? t(dec.textKey) : dec.fallback}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.55)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.question}
                    </span>
                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: 11,
                        fontWeight: 700,
                        color: cc,
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(s.confidence)}%
                    </span>
                    {s.slug && (
                      <span data-arrow aria-hidden="true" style={arrowStyle(isHovered)}>
                        →
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
          {t("noInsights")}
        </div>
      )}
    </div>
  );
}
