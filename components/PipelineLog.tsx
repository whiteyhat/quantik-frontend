"use client";

import { useEffect, useRef, useState } from "react";
import { useQuantikStore, type AgentStatus } from "@/store/useQuantikStore";

const AGENT_META: Record<string, { emoji: string; name: string }> = {
  aura: { emoji: "\u{1F30A}", name: "Aura" },
  oracle: { emoji: "\u{1F52E}", name: "Oracle" },
  edge: { emoji: "\u{1F4D0}", name: "Edge" },
  clause: { emoji: "\u2696\uFE0F", name: "Clause" },
  flux: { emoji: "\u26A1", name: "Flux" },
  lucifer: { emoji: "\u{1F608}", name: "Lucifer" },
  sigma: { emoji: "\u{1F9E9}", name: "Sigma" },
};

interface LogEntry {
  time: string;
  agentKey: string;
  agentName: string;
  emoji: string;
  status: "running" | "complete" | "error";
  summary: string;
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function PipelineLog() {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const [logQueue, setLogQueue] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevAgents = useRef<Record<string, AgentStatus>>({});

  // Auto-expand when pipeline starts, track start time
  useEffect(() => {
    if (pipeline.running) {
      setExpanded(true);
      setStartTime(Date.now());
      setLogs([]);
      setVisibleLogs([]);
      setLogQueue([]);
      prevAgents.current = {};
    }
  }, [pipeline.running]);

  // Watch agent state changes and append log entries
  useEffect(() => {
    const agents = pipeline.agents;
    const newLogs: LogEntry[] = [];

    for (const [key, state] of Object.entries(agents)) {
      const prevStatus = prevAgents.current[key];
      const meta = AGENT_META[key] || { emoji: "\u{1F916}", name: key };

      if (state.status === "running" && prevStatus !== "running") {
        newLogs.push({
          time: formatTime(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "running",
          summary: "RUNNING...",
        });
      } else if (state.status === "done" && prevStatus !== "done") {
        newLogs.push({
          time: formatTime(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "complete",
          summary: getAgentSummary(key, state.data),
        });
      } else if (state.status === "error" && prevStatus !== "error") {
        newLogs.push({
          time: formatTime(),
          agentKey: key,
          agentName: meta.name,
          emoji: meta.emoji,
          status: "error",
          summary: state.error || "Failed",
        });
      }

      prevAgents.current[key] = state.status;
    }

    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs]);
    }
  }, [pipeline.agents]);

  // Append pipeline complete log
  useEffect(() => {
    if (!pipeline.running && startTime && logs.length > 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setLogs((prev) => [
        ...prev,
        {
          time: formatTime(),
          agentKey: "_done",
          agentName: "Pipeline",
          emoji: "\u2705",
          status: "complete",
          summary: `Pipeline complete \u2014 ${elapsed}s`,
        },
      ]);
      setStartTime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.running]);

  // Queue new entries and drain with stagger (200ms each) for streaming effect
  useEffect(() => {
    setLogQueue(prev => [...prev, ...logs.slice(visibleLogs.length + prev.length)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLogs]);

  useEffect(() => {
    if (logQueue.length === 0) return;
    const timer = setTimeout(() => {
      setVisibleLogs(prev => [...prev, logQueue[0]]);
      setLogQueue(prev => prev.slice(1));
    }, 220);
    return () => clearTimeout(timer);
  }, [logQueue]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const hasLogs = logs.length > 0 || pipeline.running;
  if (!hasLogs && !expanded) return null;

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
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
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
        {/* Pulsing green dot when running */}
        {pipeline.running && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--ios-green)",
              boxShadow: "0 0 6px var(--ios-green)",
              animation: "pulse-ring 1.5s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.2px" }}>
          {"\u26A1"} Live Pipeline Feed
        </span>
        {logs.length > 0 && (
          <span
            className="font-mono-data"
            style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}
          >
            {logs.length} events
          </span>
        )}
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: 12,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            flexShrink: 0,
            marginLeft: logs.length > 0 ? 8 : "auto",
          }}
        >
          &#x25BE;
        </span>
      </button>

      {/* Log container */}
      <div
        style={{
          maxHeight: expanded ? 300 : 0,
          overflow: "hidden",
          transition: "max-height 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <div
          ref={scrollRef}
          style={{
            maxHeight: 280,
            overflowY: "auto",
            padding: "0 18px 14px",
          }}
        >
          {logs.length === 0 && pipeline.running && (
            <div
              className="font-mono-data"
              style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}
            >
              Waiting for agent events...
            </div>
          )}

          {visibleLogs.map((entry, i) => (
            <div
              key={`${entry.agentKey}-${entry.status}-${i}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "5px 0",
                fontSize: 12,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                lineHeight: 1.5,
              }}
            >
              {/* Timestamp */}
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0, fontSize: 11 }}>
                [{entry.time}]
              </span>

              {/* Emoji + Agent name */}
              <span style={{ flexShrink: 0, minWidth: 90 }}>
                {entry.emoji} <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{entry.agentName}</span>
              </span>

              {/* Arrow */}
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{"\u2192"}</span>

              {/* Status + Summary */}
              <span
                style={{
                  color:
                    entry.status === "running"
                      ? "var(--ios-blue)"
                      : entry.status === "complete"
                      ? "#30d158"
                      : "#ff453a",
                  fontWeight: entry.status === "running" ? 400 : 500,
                }}
              >
                {entry.status === "running" ? (
                  <span className="pipeline-log-dots">{entry.summary}</span>
                ) : entry.status === "complete" ? (
                  <span>{"\u2713"} {entry.summary}</span>
                ) : (
                  <span>{"\u2717"} {entry.summary}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Extract a short summary from agent result data */
function getAgentSummary(key: string, data: unknown): string {
  if (!data) return "Done";
  const d = data as Record<string, unknown>;
  const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  switch (key) {
    case "aura":
      return `Sentiment: ${num(d.sentiment_score) > 0 ? "+" : ""}${num(d.sentiment_score).toFixed(2)}  Echo: ${d.echo_chamber ? "\u26A0" : "\u2713"}`;
    case "oracle":
      return `Estimate: ${Math.round(num(d.prob_estimate) * 100)}%  Market: ${Math.round(num(d.market_implied) * 100)}%`;
    case "edge":
      return `EV Grade: ${d.ev_grade}  Net EV: ${num(d.net_ev) > 0 ? "+" : ""}${num(d.net_ev).toFixed(1)}%`;
    case "clause":
      return `Resolution Risk: ${d.resolution_risk}  Issues: ${(d.technicality_risks as string[] ?? []).length}`;
    case "flux":
      return `Liq: ${d.liquidity_grade}  Spread: ${num(d.spread).toFixed(1)}\u00A2`;
    case "lucifer":
      return `DA Score: ${num(d.devils_advocate_score).toFixed(2)}  Biases: ${(d.bias_flags as string[] ?? []).length}`;
    case "sigma":
      return `${String(d.decision ?? "").replace("_", " ")}  Confidence: ${num(d.confidence)}%`;
    default:
      return "Done";
  }
}
