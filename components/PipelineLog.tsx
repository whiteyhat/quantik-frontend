"use client";

import { useEffect, useRef, useState } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";

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

function getAgentSummary(key: string, data: unknown): string {
  if (!data) return "Complete";
  const d = data as Record<string, unknown>;
  const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  switch (key) {
    case "aura":    return `Sentiment ${num(d.sentiment_score) >= 0 ? "+" : ""}${num(d.sentiment_score).toFixed(2)}  Confidence ${Math.round(num(d.confidence)*100)}%`;
    case "flux":    return `Liquidity ${d.liquidity_grade ?? "C"}  Spread ${num(d.spread).toFixed(3)}  Whale signals: ${d.whale_signals ?? 0}`;
    case "oracle":  return `Est. ${Math.round(num(d.prob_estimate)*100)}%  Market ${Math.round(num(d.market_implied)*100)}%  Conf ${Math.round(num(d.confidence)*100)}%`;
    case "edge":    return `Grade ${d.ev_grade}  Net EV +${num(d.net_ev).toFixed(1)}%  Kelly ${num(d.kelly ?? d.kelly_fraction)*100 > 1 ? num(d.kelly ?? d.kelly_fraction).toFixed(0) : (num(d.kelly ?? d.kelly_fraction)*100).toFixed(0)}%`;
    case "clause":  return `Risk ${d.resolution_risk}  Issues: ${(d.technicality_risks as string[] ?? []).length}  ${d.recommendation ?? ""}`;
    case "lucifer": return `DA Score ${num(d.devils_advocate_score).toFixed(2)}  Flags: ${(d.bias_flags as string[] ?? []).length}  ${(d.pass) ? "✓ PASS" : "✗ FAIL"}`;
    case "sigma":   return `${String(d.decision ?? "").replace("_"," ")}  Confidence ${num(d.confidence).toFixed(1)}%  EV +${num(d.net_ev).toFixed(1)}%`;
    default:        return "Complete";
  }
}

export function PipelineLog() {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [expanded, setExpanded] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const pendingQueue = useRef<LogEntry[]>([]);
  const draining = useRef(false);
  const startTime = useRef<number | null>(null);
  const prevStatuses = useRef<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

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
        summary: `Pipeline complete — ${elapsed}s total`,
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
          summary: "Analyzing...",
        });
      } else if (state.status === "done" && prev !== "done") {
        enqueue({
          id: `${key}-done-${Date.now()}`,
          time: ts(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "complete",
          summary: getAgentSummary(key, state.data),
        });
      } else if (state.status === "error" && prev !== "error") {
        enqueue({
          id: `${key}-error-${Date.now()}`,
          time: ts(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "error",
          summary: state.error ?? "Failed",
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

  if (visibleLogs.length === 0 && !pipeline.running) return null;

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
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--ios-green)",
            boxShadow: "0 0 8px var(--ios-green)",
            flexShrink: 0,
            display: "inline-block",
          }} />
        )}
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          \u26A1 Live Pipeline Feed
        </span>
        <span className="font-mono-data" style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {visibleLogs.length} events
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
              Waiting for next agent...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
