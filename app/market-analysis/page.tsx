"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  api,
  fmtUSDC,
  runPipeline,
  type Market,
  type PipelineEvent,
  type PipelineResult,
  type AuraResult,
  type FluxResult,
  type OracleResult,
  type EdgeResult,
  type ClauseResult,
  type LuciferResult,
  type SigmaResult,
} from "@/lib/api";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;

// ─── Agent config ─────────────────────────────────────────────────────────────

const AGENTS: { key: string; emoji: string; name: string; role: string; color: string }[] = [
  { key: "aura", emoji: "🌊", name: "Aura", role: "Sentiment", color: "#0a84ff" },
  { key: "flux", emoji: "⚡", name: "Flux", role: "Liquidity", color: "#0a84ff" },
  { key: "oracle", emoji: "🔮", name: "Oracle", role: "Forecasting", color: "#0a84ff" },
  { key: "edge", emoji: "📐", name: "Edge", role: "Calibration", color: "#ff9f0a" },
  { key: "clause", emoji: "⚖️", name: "Clause", role: "Resolution", color: "#30d158" },
  { key: "lucifer", emoji: "😈", name: "Lucifer", role: "Devil's Advocate", color: "#bf5af2" },
  { key: "sigma", emoji: "🧩", name: "Sigma", role: "Synthesis", color: "#0a84ff" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "idle" | "running" | "done" | "error";

interface AgentState {
  status: AgentStatus;
  data?: unknown;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

// ─── Agent summary lines ──────────────────────────────────────────────────────

function agentSummary(key: string, data: unknown): string | null {
  if (!data) return null;
  switch (key) {
    case "aura": {
      const d = data as AuraResult;
      return `Score: ${d.sentiment_score > 0 ? "+" : ""}${d.sentiment_score.toFixed(2)}  Echo: ${d.echo_chamber ? "⚠ YES" : "✓ NO"}`;
    }
    case "flux": {
      const d = data as FluxResult;
      return `Grade: ${d.liquidity_grade}  Spread: ${d.spread.toFixed(1)}¢  Whales: ${d.whale_signals}`;
    }
    case "oracle": {
      const d = data as OracleResult;
      return `Estimate: ${Math.round(d.prob_estimate * 100)}%  Market: ${Math.round(d.market_implied * 100)}%  Confidence: ${(d.confidence * 100).toFixed(0)}%`;
    }
    case "edge": {
      const d = data as EdgeResult;
      return `Grade: ${d.ev_grade}  EV: ${d.net_ev > 0 ? "+" : ""}${d.net_ev.toFixed(1)}%  Kelly: ${d.kelly.toFixed(1)}%`;
    }
    case "clause": {
      const d = data as ClauseResult;
      return `Resolution Risk: ${d.resolution_risk}  Issues: ${d.technicality_risks.length}`;
    }
    case "lucifer": {
      const d = data as LuciferResult;
      return `DA Score: ${d.devils_advocate_score.toFixed(2)}  Biases: ${d.bias_flags.length}`;
    }
    case "sigma": {
      const d = data as SigmaResult;
      return `${d.decision.replace("_", " ")}  Confidence: ${d.confidence}%  Size: $${d.size_usd.toFixed(0)}`;
    }
    default:
      return null;
  }
}

// ─── Agent Step Row ───────────────────────────────────────────────────────────

function AgentRow({ agentCfg, state }: { agentCfg: (typeof AGENTS)[0]; state: AgentState }) {
  const { status, data, error, startedAt, finishedAt } = state;
  const elapsed =
    finishedAt && startedAt ? `${((finishedAt - startedAt) / 1000).toFixed(1)}s` : null;

  const dotColor =
    status === "done"
      ? "#30d158"
      : status === "running"
      ? "#ff9f0a"
      : status === "error"
      ? "#ff453a"
      : "rgba(255,255,255,0.15)";

  const dotPulse = status === "running";

  const summary = agentSummary(agentCfg.key, data);

  // For Lucifer, show counter-thesis if available
  const luciferData = agentCfg.key === "lucifer" ? (data as LuciferResult | undefined) : undefined;
  // For Sigma, show thesis
  const sigmaData = agentCfg.key === "sigma" ? (data as SigmaResult | undefined) : undefined;

  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        transition: "background 200ms",
        background: status === "running" ? "rgba(255,159,10,0.04)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            boxShadow: dotPulse ? `0 0 8px ${dotColor}` : undefined,
            animation: dotPulse ? "pulse 1.2s ease-in-out infinite" : undefined,
          }}
        />

        {/* Emoji + name + role */}
        <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{agentCfg.emoji}</span>
        <span
          style={{
            fontSize: BODY_SIZE,
            fontWeight: 700,
            color: agentCfg.color,
            fontFamily: "monospace",
            width: 56,
            flexShrink: 0,
          }}
        >
          {agentCfg.name}
        </span>
        <span
          style={{
            fontSize: META_SIZE,
            color: "rgba(255,255,255,0.30)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status === "running"
            ? `${agentCfg.role} — running…`
            : status === "error"
            ? `Error: ${error ?? "unknown"}`
            : summary ?? agentCfg.role}
        </span>

        {/* Elapsed */}
        {elapsed && (
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.20)",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {elapsed}
          </span>
        )}

        {/* Status badge */}
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "0.06em",
            color: dotColor,
            flexShrink: 0,
            width: 50,
            textAlign: "right",
          }}
        >
          {status === "done"
            ? "DONE"
            : status === "running"
            ? "RUNNING"
            : status === "error"
            ? "ERR"
            : "IDLE"}
        </span>
      </div>

      {/* Counter thesis (Lucifer) */}
      {luciferData?.counter_thesis && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 34,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(191,90,242,0.08)",
            border: "1px solid rgba(191,90,242,0.15)",
            fontSize: META_SIZE,
            color: "rgba(255,255,255,0.55)",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          &quot;{luciferData.counter_thesis}&quot;
        </div>
      )}

      {/* Sigma thesis */}
      {sigmaData?.thesis && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 34,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(10,132,255,0.07)",
            border: "1px solid rgba(10,132,255,0.15)",
            fontSize: META_SIZE,
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.5,
          }}
        >
          {sigmaData.thesis}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline progress bar ────────────────────────────────────────────────────

function PipelineProgress({
  agents,
}: {
  agents: Record<string, AgentState>;
}) {
  const total = AGENTS.length;
  const done = AGENTS.filter((a) => agents[a.key]?.status === "done").length;
  const running = AGENTS.filter((a) => agents[a.key]?.status === "running").length;
  const pct = ((done + running * 0.5) / total) * 100;

  return (
    <div style={{ marginBottom: 16, padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}
        >
          PIPELINE PROGRESS
        </span>
        <span
          style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}
        >
          {done} / {total} agents
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: done === total ? "#30d158" : "#0a84ff",
            borderRadius: 2,
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Sigma Decision Card ──────────────────────────────────────────────────────

function SigmaDecisionCard({
  sigma,
  market,
}: {
  sigma: SigmaResult;
  market: Market;
}) {
  const isBet = sigma.decision !== "PASS";
  const isYes = sigma.decision === "BET_YES";
  const accentColor = !isBet ? "rgba(255,255,255,0.35)" : isYes ? "#30d158" : "#ff453a";
  const label = !isBet ? "PASS" : isYes ? "BET YES" : "BET NO";

  return (
    <div
      style={{
        margin: "12px 16px 16px",
        padding: "16px 20px",
        borderRadius: 12,
        background: isBet
          ? isYes
            ? "rgba(48,209,88,0.08)"
            : "rgba(255,69,58,0.08)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${isBet ? (isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)") : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            fontFamily: "monospace",
          }}
        >
          Sigma Decision
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: accentColor,
            fontFamily: '"SF Mono", monospace',
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          fontSize: BODY_SIZE,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {sigma.thesis}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Confidence", value: `${sigma.confidence}%` },
          { label: "Position Size", value: fmtUSDC(sigma.size_usd) },
          { label: "Entry Target", value: `${Math.round(sigma.entry_price * 100)}¢` },
        ].map((m) => (
          <div key={m.label}>
            <span
              style={{
                fontSize: LABEL_SIZE,
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 2,
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: BODY_SIZE,
                fontWeight: 700,
                color: isBet ? accentColor : "rgba(255,255,255,0.60)",
              }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Market list item ─────────────────────────────────────────────────────────

function MarketListItem({
  market,
  isSelected,
  isRunning,
  onClick,
}: {
  market: Market;
  isSelected: boolean;
  isRunning: boolean;
  onClick: () => void;
}) {
  const yesPct = Math.round((market.yesPrice ?? 0) * 100);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 16px",
        background: isSelected
          ? "rgba(10,132,255,0.12)"
          : "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        borderLeft: isSelected ? "3px solid #0a84ff" : "3px solid transparent",
        cursor: "pointer",
        transition: "background 150ms",
      }}
    >
      <div
        style={{
          fontSize: BODY_SIZE,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.65)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.4,
          marginBottom: 6,
        }}
      >
        {market.question}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "#30d158",
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          {yesPct}¢
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            fontFamily: "monospace",
          }}
        >
          {fmtUSDC(market.volume)}
        </span>
        {isRunning && isSelected && (
          <>
            <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
            <span style={{ fontSize: LABEL_SIZE, color: "#ff9f0a", fontFamily: "monospace" }}>
              ⏳ analyzing…
            </span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── Market Analysis Page ─────────────────────────────────────────────────────

function defaultAgentStates(): Record<string, AgentState> {
  return Object.fromEntries(AGENTS.map((a) => [a.key, { status: "idle" as const }]));
}

export default function MarketAnalysisPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(defaultAgentStates());
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getMarkets(search || undefined).then(setMarkets).catch(() => {});
  }, [search]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const selectMarket = useCallback(
    (market: Market) => {
      // Cancel any running pipeline
      cancelRef.current?.();
      cancelRef.current = null;

      setSelectedMarket(market);
      setAgentStates(defaultAgentStates());
      setPipelineResult(null);
      setPipelineError(null);
      setLog([]);
      setPipelineRunning(true);

      const startTs = Date.now();
      const agentStartTimes: Record<string, number> = {};

      const cancel = runPipeline(
        market.slug,
        (event: PipelineEvent) => {
          const key = event.agent;
          const now = Date.now();

          if (event.status === "running") {
            agentStartTimes[key] = now;
            setAgentStates((prev) => ({
              ...prev,
              [key]: { status: "running", startedAt: now },
            }));
            setLog((prev) => [...prev, `[${((now - startTs) / 1000).toFixed(1)}s] ${key.toUpperCase()} started`]);
          } else if (event.status === "done") {
            const started = agentStartTimes[key] ?? now;
            setAgentStates((prev) => ({
              ...prev,
              [key]: {
                status: "done",
                data: event.data,
                startedAt: started,
                finishedAt: now,
              },
            }));
            const summary = event.data
              ? `  → ${JSON.stringify(event.data).slice(0, 80)}…`
              : "";
            setLog((prev) => [
              ...prev,
              `[${((now - startTs) / 1000).toFixed(1)}s] ${key.toUpperCase()} done${summary}`,
            ]);
          } else if (event.status === "error") {
            setAgentStates((prev) => ({
              ...prev,
              [key]: { status: "error", error: event.error ?? "unknown error" },
            }));
            setLog((prev) => [...prev, `[${((now - startTs) / 1000).toFixed(1)}s] ${key.toUpperCase()} ERROR: ${event.error}`]);
          }
        },
        (result: PipelineResult) => {
          setPipelineResult(result);
          setPipelineRunning(false);
          const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
          setLog((prev) => [...prev, `[${elapsed}s] Pipeline complete ✓`]);
        },
        (err: Error) => {
          setPipelineError(err.message);
          setPipelineRunning(false);
          setLog((prev) => [...prev, `Pipeline error: ${err.message}`]);
        }
      );

      cancelRef.current = cancel;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelRef.current?.();
  }, []);

  const sigmaResult = pipelineResult?.sigma;
  const totalDone = AGENTS.filter((a) => agentStates[a.key]?.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 92px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
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
          Market Analysis
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>
          Select a market to run the 7-agent analysis pipeline
        </p>
      </div>

      {/* Two-panel layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── LEFT: Market list ──────────────────────────────────────────── */}
        <div
          style={{
            ...panelStyle,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              type="text"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: BODY_SIZE,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.80)",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Market list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {markets.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: BODY_SIZE,
                  color: "rgba(255,255,255,0.20)",
                }}
              >
                No markets found
              </div>
            ) : (
              markets.map((m) => (
                <MarketListItem
                  key={m.slug}
                  market={m}
                  isSelected={selectedMarket?.slug === m.slug}
                  isRunning={pipelineRunning && selectedMarket?.slug === m.slug}
                  onClick={() => selectMarket(m)}
                />
              ))
            )}
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.15)",
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}
          >
            {markets.length} markets · click to analyze
          </div>
        </div>

        {/* ── RIGHT: Pipeline output ─────────────────────────────────────── */}
        <div
          style={{
            ...panelStyle,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {!selectedMarket ? (
            /* Empty state */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 40,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 48, opacity: 0.25 }}>🔮</span>
              <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)" }}>
                Select a market from the left panel to start the 7-agent analysis pipeline
              </div>
              <div
                style={{
                  fontSize: LABEL_SIZE,
                  color: "rgba(255,255,255,0.15)",
                  fontFamily: "monospace",
                }}
              >
                Aura → Flux → Oracle → Edge → Clause → Lucifer → Sigma
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              {/* Selected market header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: BODY_SIZE,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {selectedMarket.question}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: LABEL_SIZE,
                      fontFamily: "monospace",
                      color: "#30d158",
                      fontWeight: 600,
                    }}
                  >
                    YES {Math.round((selectedMarket.yesPrice ?? 0) * 100)}¢
                  </span>
                  <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
                  <span
                    style={{
                      fontSize: LABEL_SIZE,
                      fontFamily: "monospace",
                      color: "#ff453a",
                      fontWeight: 600,
                    }}
                  >
                    NO {Math.round((selectedMarket.noPrice ?? 0) * 100)}¢
                  </span>
                  <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
                  <span
                    style={{
                      fontSize: LABEL_SIZE,
                      fontFamily: "monospace",
                      color: "rgba(255,255,255,0.30)",
                    }}
                  >
                    Vol: {fmtUSDC(selectedMarket.volume)}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    {pipelineRunning ? (
                      <span style={{ fontSize: LABEL_SIZE, color: "#ff9f0a", fontFamily: "monospace" }}>
                        ⏳ {AGENTS.filter((a) => agentStates[a.key]?.status === "done").length} / 7 done
                      </span>
                    ) : pipelineResult ? (
                      <span style={{ fontSize: LABEL_SIZE, color: "#30d158", fontFamily: "monospace" }}>
                        ✓ COMPLETE ({totalDone} / 7)
                      </span>
                    ) : pipelineError ? (
                      <span style={{ fontSize: LABEL_SIZE, color: "#ff453a", fontFamily: "monospace" }}>
                        ✗ ERROR
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {(pipelineRunning || pipelineResult) && (
                <div style={{ paddingTop: 12, flexShrink: 0 }}>
                  <PipelineProgress agents={agentStates} />
                </div>
              )}

              {/* Agent rows */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {AGENTS.map((agentCfg) => (
                  <AgentRow
                    key={agentCfg.key}
                    agentCfg={agentCfg}
                    state={agentStates[agentCfg.key] ?? { status: "idle" }}
                  />
                ))}

                {/* Sigma Decision Card */}
                {sigmaResult && <SigmaDecisionCard sigma={sigmaResult} market={selectedMarket} />}

                {/* Error */}
                {pipelineError && (
                  <div
                    style={{
                      margin: "12px 16px",
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "rgba(255,69,58,0.08)",
                      border: "1px solid rgba(255,69,58,0.20)",
                      fontSize: BODY_SIZE,
                      color: "#ff453a",
                      fontFamily: "monospace",
                    }}
                  >
                    ✗ Pipeline error: {pipelineError}
                  </div>
                )}
              </div>

              {/* SSE Log */}
              <div
                style={{
                  flexShrink: 0,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(0,0,0,0.20)",
                  maxHeight: 110,
                  overflowY: "auto",
                  padding: "8px 14px",
                }}
              >
                {log.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: LABEL_SIZE,
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      color: line.includes("ERROR")
                        ? "#ff453a"
                        : line.includes("complete")
                        ? "#30d158"
                        : "rgba(255,255,255,0.30)",
                      lineHeight: 1.6,
                    }}
                  >
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
