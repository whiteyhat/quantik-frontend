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
  background: "rgba(255,255,255,0.06)",
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
  streamText?: string; // live streaming text
}

// ─── Safe number guard ────────────────────────────────────────────────────────

const safeFixed = (n: unknown, digits = 2) =>
  ((n as number) ?? 0).toFixed(digits);

// ─── Agent summary lines ──────────────────────────────────────────────────────

function agentSummary(key: string, data: unknown): string | null {
  if (!data) return null;
  try {
    switch (key) {
      case "aura": {
        const d = data as AuraResult;
        const score = (d.sentiment_score ?? 0) as number;
        return `Score: ${score > 0 ? "+" : ""}${safeFixed(score)}  Echo: ${d.echo_chamber ? "⚠ YES" : "✓ NO"}`;
      }
      case "flux": {
        const d = data as FluxResult;
        return `Grade: ${d.liquidity_grade ?? "—"}  Spread: ${safeFixed(d.spread, 1)}¢  Whales: ${d.whale_signals ?? 0}`;
      }
      case "oracle": {
        const d = data as OracleResult;
        return `Estimate: ${Math.round(((d.prob_estimate ?? 0) as number) * 100)}%  Market: ${Math.round(((d.market_implied ?? 0) as number) * 100)}%  Confidence: ${safeFixed((d.confidence ?? 0) as number * 100, 0)}%`;
      }
      case "edge": {
        const d = data as EdgeResult;
        const ev = (d.net_ev ?? 0) as number;
        return `Grade: ${d.ev_grade ?? "—"}  EV: ${ev > 0 ? "+" : ""}${safeFixed(ev, 1)}%  Kelly: ${safeFixed(d.kelly, 1)}%`;
      }
      case "clause": {
        const d = data as ClauseResult;
        return `Resolution Risk: ${d.resolution_risk ?? "—"}  Issues: ${Array.isArray(d.technicality_risks) ? d.technicality_risks.length : 0}`;
      }
      case "lucifer": {
        const d = data as LuciferResult;
        return `DA Score: ${safeFixed(d.devils_advocate_score)}  Biases: ${Array.isArray(d.bias_flags) ? d.bias_flags.length : 0}`;
      }
      case "sigma": {
        const d = data as SigmaResult;
        return `${(d.decision ?? "PASS").replace("_", " ")}  Confidence: ${d.confidence ?? 0}%  Size: $${safeFixed(d.size_usd, 0)}`;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ agentKey, data }: { agentKey: string; data: unknown }) {
  if (!data) return null;
  let confidence: number | null = null;

  try {
    switch (agentKey) {
      case "oracle":
        confidence = Math.round(((data as OracleResult).confidence ?? 0) * 100);
        break;
      case "sigma":
        confidence = (data as SigmaResult).confidence ?? null;
        break;
      default:
        return null;
    }
  } catch {
    return null;
  }

  if (confidence === null) return null;

  const color =
    confidence >= 70 ? "#30d158" : confidence >= 40 ? "#ff9f0a" : "#ff453a";

  return (
    <span
      style={{
        fontSize: LABEL_SIZE,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 5,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        fontFamily: "monospace",
        flexShrink: 0,
      }}
    >
      {confidence}%
    </span>
  );
}

// ─── Agent Step Row ───────────────────────────────────────────────────────────

function AgentRow({ agentCfg, state }: { agentCfg: (typeof AGENTS)[0]; state: AgentState }) {
  const { status, data, error, startedAt, finishedAt, streamText } = state;
  const elapsed =
    finishedAt && startedAt
      ? `${(((finishedAt - startedAt) / 1000) as number).toFixed(1)}s`
      : null;

  const dotColor =
    status === "done"
      ? "#30d158"
      : status === "running"
      ? "#ff9f0a"
      : status === "error"
      ? "#ff453a"
      : "rgba(255,255,255,0.15)";

  const dotPulse = status === "running";
  const summary = status === "done" ? agentSummary(agentCfg.key, data) : null;

  const luciferData =
    agentCfg.key === "lucifer" && status === "done" ? (data as LuciferResult | undefined) : undefined;
  const sigmaData =
    agentCfg.key === "sigma" && status === "done" ? (data as SigmaResult | undefined) : undefined;

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
        {/* Status dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            boxShadow: dotPulse ? `0 0 8px ${dotColor}` : undefined,
            animation: dotPulse ? "relayPulse 1.2s ease-in-out infinite" : undefined,
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
            ? streamText ?? `${agentCfg.role} — running…`
            : status === "error"
            ? `Error: ${error ?? "unknown"}`
            : summary ?? agentCfg.role}
        </span>

        {/* Confidence badge (shown when done) */}
        {status === "done" && (
          <ConfidenceBadge agentKey={agentCfg.key} data={data} />
        )}

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
            ? "RUN"
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

function PipelineProgress({ agents }: { agents: Record<string, AgentState> }) {
  const total = AGENTS.length;
  const done = AGENTS.filter((a) => agents[a.key]?.status === "done").length;
  const running = AGENTS.filter((a) => agents[a.key]?.status === "running").length;
  const pct = ((done + running * 0.5) / total) * 100;

  return (
    <div style={{ marginBottom: 16, padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
          PIPELINE PROGRESS
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
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

function SigmaDecisionCard({ sigma }: { sigma: SigmaResult }) {
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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

      <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 10 }}>
        {sigma.thesis}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Confidence", value: `${sigma.confidence ?? 0}%` },
          { label: "Position Size", value: fmtUSDC(sigma.size_usd ?? 0) },
          { label: "Entry Target", value: `${Math.round(((sigma.entry_price ?? 0) as number) * 100)}¢` },
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

// ─── Liquidity grade badge ────────────────────────────────────────────────────

function LiquidityBadge({ grade }: { grade: string }) {
  const color =
    grade === "A"
      ? "#30d158"
      : grade === "B"
      ? "#0a84ff"
      : grade === "C"
      ? "#ff9f0a"
      : "#ff453a";

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 4,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        fontFamily: "monospace",
        letterSpacing: "0.06em",
        flexShrink: 0,
      }}
    >
      {grade}
    </span>
  );
}

// ─── Market card (left panel) ─────────────────────────────────────────────────

function MarketCard({
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
  const yesPct = Math.round(((market.yesPrice ?? 0) as number) * 100);
  const noPct = Math.round(((market.noPrice ?? 0) as number) * 100);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        background: isSelected ? "rgba(10,132,255,0.10)" : "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        borderLeft: isSelected ? "3px solid #0a84ff" : "3px solid transparent",
        cursor: "pointer",
        transition: "background 150ms",
      }}
    >
      {/* Market title */}
      <div
        style={{
          fontSize: BODY_SIZE,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.70)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.4,
          marginBottom: 8,
        }}
      >
        {market.question}
      </div>

      {/* Price row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "#30d158",
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          YES {yesPct}¢
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "#ff453a",
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          NO {noPct}¢
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "monospace",
          }}
        >
          Vol: {fmtUSDC(market.volume ?? 0)}
        </span>
      </div>

      {/* Bottom row: category badge + running indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <LiquidityBadge grade={market.liquidityGrade ?? "C"} />
        {isRunning && isSelected && (
          <span style={{ fontSize: LABEL_SIZE, color: "#ff9f0a", fontFamily: "monospace" }}>
            ⏳ analyzing…
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Default agent states ─────────────────────────────────────────────────────

function defaultAgentStates(): Record<string, AgentState> {
  return Object.fromEntries(AGENTS.map((a) => [a.key, { status: "idle" as const }]));
}

// ─── Market Analysis Page ─────────────────────────────────────────────────────

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
    api.getMarkets(search || undefined).then(res => setMarkets(res.markets)).catch(() => {});
  }, [search]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const selectMarket = useCallback((market: Market) => {
    // Cancel any running pipeline
    cancelRef.current?.();
    cancelRef.current = null;

    // Guard: ensure slug is defined before running pipeline
    if (!market.slug) {
      console.error("[Quantik] Market missing slug, cannot run pipeline:", market);
      setPipelineError("Market slug is missing — cannot run analysis");
      return;
    }

    setSelectedMarket(market);
    setAgentStates(defaultAgentStates());
    setPipelineResult(null);
    setPipelineError(null);
    setLog([]);
    setPipelineRunning(true);

    // Verify what body is being sent (temporary debug log as requested)
    const pipelineBody = { slug: market.slug };
    console.log("[Quantik] Pipeline request body:", pipelineBody);

    const startTs = Date.now();
    const agentStartTimes: Record<string, number> = {};

    const cancel = runPipeline(
      market.slug,
      (event: PipelineEvent) => {
        if (event.type === "pipeline:start") return;
        if (!("agent" in event)) return;
        const key = event.agent;
        const now = Date.now();

        if (event.type === "agent:start") {
          agentStartTimes[key] = now;
          setAgentStates((prev) => ({
            ...prev,
            [key]: { status: "running", startedAt: now },
          }));
          setLog((prev) => [
            ...prev,
            `[${((now - startTs) / 1000).toFixed(1)}s] ${key.toUpperCase()} started`,
          ]);
        } else if (event.type === "agent:complete") {
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
        } else if (event.type === "agent:error") {
          const errMsg = typeof event.error === "string" ? event.error : JSON.stringify(event.error) ?? "unknown error";
          setAgentStates((prev) => ({
            ...prev,
            [key]: { status: "error", error: errMsg },
          }));
          setLog((prev) => [
            ...prev,
            `[${((now - startTs) / 1000).toFixed(1)}s] ${key.toUpperCase()} ERROR: ${errMsg}`,
          ]);
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelRef.current?.();
  }, []);

  const sigmaResult = pipelineResult?.sigma;
  const totalDone = AGENTS.filter((a) => agentStates[a.key]?.status === "done").length;

  return (
    // suppressHydrationWarning prevents React error #418 caused by server/client
    // HTML mismatches from dynamic market data and agent state rendering
    <div suppressHydrationWarning style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 92px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1 }}>
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
            {selectedMarket ? (
              <>
                <strong style={{ color: "rgba(255,255,255,0.60)" }}>{selectedMarket.question}</strong>
                {" "}
                {pipelineRunning ? (
                  <span style={{ color: "#ff9f0a" }}>— Running analysis…</span>
                ) : pipelineResult ? (
                  <span style={{ color: "#30d158" }}>— Analysis complete ✓</span>
                ) : null}
              </>
            ) : (
              "Select a market to run the 7-agent analysis pipeline"
            )}
          </p>
        </div>
      </div>

      {/* Two-panel layout: 40% left / 60% right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40% 60%",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── LEFT: Market list (40%) ──────────────────────────────────────── */}
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

          {/* Scrollable market list */}
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
                <MarketCard
                  key={m.slug}
                  market={m}
                  isSelected={selectedMarket?.slug === m.slug}
                  isRunning={pipelineRunning && selectedMarket?.slug === m.slug}
                  onClick={() => selectMarket(m)}
                />
              ))
            )}
          </div>

          {/* Footer count */}
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

        {/* ── RIGHT: Pipeline output (60%) ─────────────────────────────────── */}
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
                  <span style={{ fontSize: LABEL_SIZE, fontFamily: "monospace", color: "#30d158", fontWeight: 600 }}>
                    YES {Math.round(((selectedMarket.yesPrice ?? 0) as number) * 100)}¢
                  </span>
                  <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
                  <span style={{ fontSize: LABEL_SIZE, fontFamily: "monospace", color: "#ff453a", fontWeight: 600 }}>
                    NO {Math.round(((selectedMarket.noPrice ?? 0) as number) * 100)}¢
                  </span>
                  <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>·</span>
                  <span style={{ fontSize: LABEL_SIZE, fontFamily: "monospace", color: "rgba(255,255,255,0.30)" }}>
                    Vol: {fmtUSDC(selectedMarket.volume ?? 0)}
                  </span>
                  <LiquidityBadge grade={selectedMarket.liquidityGrade ?? "C"} />
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    {pipelineRunning ? (
                      <span style={{ fontSize: LABEL_SIZE, color: "#ff9f0a", fontFamily: "monospace" }}>
                        ⏳ {totalDone} / 7 done
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

              {/* Agent timeline rows */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {AGENTS.map((agentCfg) => (
                  <AgentRow
                    key={agentCfg.key}
                    agentCfg={agentCfg}
                    state={agentStates[agentCfg.key] ?? { status: "idle" }}
                  />
                ))}

                {/* Sigma Decision Card */}
                {sigmaResult && <SigmaDecisionCard sigma={sigmaResult} />}

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
                {log.length === 0 && !pipelineRunning && (
                  <div
                    style={{
                      fontSize: LABEL_SIZE,
                      color: "rgba(255,255,255,0.15)",
                      fontFamily: "monospace",
                    }}
                  >
                    Waiting for pipeline events…
                  </div>
                )}
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
