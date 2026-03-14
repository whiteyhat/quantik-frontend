"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api, type AlertEntry } from "@/lib/api";

const AGENT_META: Record<string, { emoji: string; name: string }> = {
  aura:   { emoji: "\u{1F30A}", name: "Aura" },
  oracle: { emoji: "\u{1F52E}", name: "Oracle" },
  edge:   { emoji: "\u{1F4D0}", name: "Edge" },
  clause: { emoji: "\u2696\uFE0F", name: "Clause" },
  flux:   { emoji: "\u26A1", name: "Flux" },
  lucifer:{ emoji: "\u{1F608}", name: "Lucifer" },
  sigma:  { emoji: "\u{1F9E9}", name: "Sigma" },
};

interface LogEntry {
  id: string;
  time: string;
  agentKey: string;
  agentName: string;
  emoji: string;
  status: "running" | "complete" | "error";
  summary: string;
}

function ts(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAgentSummary(key: string, data: unknown, t: any): string {
  if (!data) return t("complete");
  const d = data as Record<string, unknown>;
  const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  switch (key) {
    case "aura":    return typeof d.summary === "string" && d.summary
      ? d.summary
      : `${t("sentiment")} ${num(d.sentiment_score) >= 0 ? "+" : ""}${num(d.sentiment_score).toFixed(2)}  ${t("conf")} ${Math.round(num(d.confidence)*100)}%`;
    case "flux":    return `${t("liquidityLabel")} ${d.liquidity_grade ?? "C"}  ${t("spread")} ${num(d.spread).toFixed(3)}  ${t("whaleSignals")} ${d.whale_signals ?? 0}`;
    case "oracle":  return `${t("est")} ${Math.round(num(d.prob_estimate)*100)}%  ${t("market")} ${Math.round(num(d.market_implied)*100)}%  ${t("conf")} ${Math.round(num(d.confidence)*100)}%`;
    case "edge":    return `${t("grade")} ${d.ev_grade}  ${t("netEv")} +${num(d.net_ev).toFixed(1)}%  ${t("kelly")} ${num(d.kelly ?? d.kelly_fraction)*100 > 1 ? num(d.kelly ?? d.kelly_fraction).toFixed(0) : (num(d.kelly ?? d.kelly_fraction)*100).toFixed(0)}%`;
    case "clause":  return `${t("risk")} ${d.resolution_risk}  ${t("issues")} ${(d.technicality_risks as string[] ?? []).length}  ${d.recommendation ?? ""}`;
    case "lucifer": return `${t("daScore")} ${num(d.devils_advocate_score).toFixed(2)}  ${t("flags")} ${(d.bias_flags as string[] ?? []).length}  ${(d.pass) ? `✓ ${t("pass")}` : `✗ ${t("fail")}`}`;
    case "sigma":   return `${String(d.decision ?? "").replace("_"," ")}  ${t("conf")} ${num(d.confidence).toFixed(1)}%  ${t("netEv")} +${num(d.net_ev).toFixed(1)}%`;
    default:        return t("complete");
  }
}

export function PipelineLog({ slug }: { slug?: string } = {}) {
  const t = useTranslations("pipelineLog");
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [expanded, setExpanded] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const pendingQueue = useRef<LogEntry[]>([]);
  const draining = useRef(false);
  const startTime = useRef<number | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [lastTelegramAlert, setLastTelegramAlert] = useState<AlertEntry | null>(null);

  // Drain queue one entry every 220ms
  function drainQueue() {
    if (draining.current) return;
    draining.current = true;
    const tick = () => {
      if (pendingQueue.current.length === 0) {
        draining.current = false;
        return;
      }
      const next = pendingQueue.current.shift()!;
      setVisibleLogs(prev => [...prev, next]);
      setTimeout(tick, 220);
    };
    setTimeout(tick, 120);
  }

  function enqueue(entry: LogEntry) {
    pendingQueue.current.push(entry);
    drainQueue();
  }

  // Reset on pipeline start
  useEffect(() => {
    if (pipeline.running && !startTime.current) {
      setExpanded(true);
      setVisibleLogs([]);
      pendingQueue.current = [];
      draining.current = false;
      startTime.current = Date.now();
      prevStatuses.current = {};
    }
    if (!pipeline.running && startTime.current) {
      // Pipeline completed — add final entry
      const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(1);
      enqueue({
        id: "done",
        time: ts(),
        agentKey: "_done",
        agentName: "Pipeline",
        emoji: "✅",
        status: "complete",
        summary: t("pipelineComplete", { seconds: elapsed }),
      });
      startTime.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.running]);

  // Watch agent state changes
  useEffect(() => {
    const agents = pipeline.agents;
    for (const [key, state] of Object.entries(agents)) {
      const prev = prevStatuses.current[key];
      const meta = AGENT_META[key] ?? { emoji: "\u{1F916}", name: key };

      if (state.status === "running" && prev !== "running") {
        enqueue({
          id: `${key}-running-${Date.now()}`,
          time: ts(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "running",
          summary: t("analyzing"),
        });
      } else if (state.status === "done" && prev !== "done") {
        enqueue({
          id: `${key}-done-${Date.now()}`,
          time: ts(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "complete",
          summary: getAgentSummary(key, state.data, t),
        });
      } else if (state.status === "error" && prev !== "error") {
        enqueue({
          id: `${key}-error-${Date.now()}`,
          time: ts(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "error",
          summary: state.error ?? t("fail"),
        });
      }

      prevStatuses.current[key] = state.status;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.agents]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  // Fetch last Telegram alert for this market (only when slug is provided)
  useEffect(() => {
    if (!slug) return;
    api.getLastMarketAlert(slug).then((data) => {
      setTelegramConfigured(Boolean(data.telegramConfigured));
      const alert = data.alerts[0] ?? null;
      setLastTelegramAlert(alert);
      // Auto-expand when there's a telegram alert and no pipeline logs
      if (alert && data.telegramConfigured && visibleLogs.length === 0) {
        setExpanded(true);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, pipeline.running]);

  const hasTelegramEntry = telegramConfigured && !!lastTelegramAlert;
  if (visibleLogs.length === 0 && !pipeline.running && !hasTelegramEntry) return null;

  return (
    <div
      data-testid="pipeline-log"
      style={{
        marginBottom: 20,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          textAlign: "left",
        }}
      >
        {pipeline.running && (
          <>
            <style>{`@keyframes pipelinePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--ios-green)",
              boxShadow: "0 0 8px var(--ios-green)",
              flexShrink: 0,
              display: "inline-block",
              animation: "pipelinePulse 1.2s ease-in-out infinite",
            }} />
          </>
        )}
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {"\u26A1"} {t("liveFeed")}
        </span>
        <span className="font-mono-data" style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {visibleLogs.length} {t("events")}
        </span>
        <span style={{
          color: "var(--text-tertiary)", fontSize: 12,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 200ms ease", flexShrink: 0, marginLeft: 8,
        }}>
          &#x25BE;
        </span>
      </button>

      <div style={{
        maxHeight: expanded ? 320 : 0,
        overflow: "hidden",
        transition: "max-height 350ms cubic-bezier(0.25,0.46,0.45,0.94)",
      }}>
        <div ref={scrollRef} style={{ maxHeight: 300, overflowY: "auto", padding: "0 18px 14px" }}>
          {visibleLogs.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "4px 0",
                fontSize: 12,
                fontFamily: '"\"SF Mono\", \"JetBrains Mono\", monospace',
                lineHeight: 1.6,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0, fontSize: 10, paddingTop: 1 }}>
                {entry.time}
              </span>
              <span style={{ flexShrink: 0, minWidth: 80, fontWeight: 600, color: "var(--text-secondary)" }}>
                {entry.emoji} {entry.agentName}
              </span>
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>→</span>
              <span style={{
                color: entry.status === "running" ? "var(--ios-blue)"
                     : entry.status === "complete" ? "#30d158"
                     : "#ff453a",
                fontWeight: entry.status === "complete" ? 500 : 400,
                flex: 1,
                wordBreak: "break-word",
              }}>
                {entry.status === "complete" && "\u2713 "}
                {entry.status === "error" && "\u2717 "}
                {entry.summary}
              </span>
            </div>
          ))}
          {pipeline.running && pendingQueue.current.length === 0 && visibleLogs.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "6px 0", fontStyle: "italic" }}>
              {t("waitingForAgent")}
            </div>
          )}
          {/* Last Telegram notification — only when configured */}
          {telegramConfigured && lastTelegramAlert && !pipeline.running && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 0",
                fontSize: 12,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                lineHeight: 1.6,
                borderTop: "1px solid rgba(0,136,255,0.15)",
                marginTop: 4,
              }}
            >
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0, fontSize: 10, paddingTop: 1 }}>
                {new Date(lastTelegramAlert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span style={{ flexShrink: 0, minWidth: 80, fontWeight: 600, color: "var(--text-secondary)" }}>
                {"\u{1F4E9}"} Telegram
              </span>
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{"\u2192"}</span>
              <span style={{
                color: lastTelegramAlert.alert_sent === 2 ? "#30d158"
                     : lastTelegramAlert.alert_sent === -1 ? "#ff453a"
                     : "var(--ios-blue)",
                fontWeight: 500,
                flex: 1,
                wordBreak: "break-word",
              }}>
                {lastTelegramAlert.alert_sent === 2
                  ? `\u2713 ${t("telegramApproved", { confidence: Math.round(lastTelegramAlert.confidence * 100) })}`
                  : lastTelegramAlert.alert_sent === -1
                    ? `\u2717 ${t("telegramVetoed")}`
                    : `\u2713 ${t("telegramSent", { confidence: Math.round(lastTelegramAlert.confidence * 100) })}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
