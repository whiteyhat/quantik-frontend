"use client";

import { useQuantikStore, type AgentCardState } from "@/store/useQuantikStore";
import { AgentStep, AgentDataView } from "./AgentStep";
import { SigmaDecision } from "./SigmaDecision";
import {
  type SigmaResult,
  type EdgeResult,
  type AuraResult,
  type FluxResult,
  type OracleResult,
  type ClauseResult,
  type LuciferResult,
} from "@/lib/api";

const AGENTS: { key: string; emoji: string; name: string }[] = [
  { key: "aura", emoji: "🌊", name: "Aura" },
  { key: "flux", emoji: "⚡", name: "Flux" },
  { key: "oracle", emoji: "🔮", name: "Oracle" },
  { key: "edge", emoji: "📐", name: "Edge" },
  { key: "clause", emoji: "⚖️", name: "Clause" },
  { key: "lucifer", emoji: "😈", name: "Lucifer" },
  { key: "sigma", emoji: "🧩", name: "Sigma" },
];

function agentSummary(key: string, data: unknown): string | undefined {
  if (!data) return undefined;
  switch (key) {
    case "aura": {
      const d = data as AuraResult;
      return `Sentiment: ${d.sentiment_score > 0 ? "+" : ""}${d.sentiment_score.toFixed(2)}  Echo: ${d.echo_chamber ? "⚠" : "✓"}`;
    }
    case "flux": {
      const d = data as FluxResult;
      return `Liq: ${d.liquidity_grade}  Spread: ${d.spread.toFixed(1)}¢`;
    }
    case "oracle": {
      const d = data as OracleResult;
      return `Estimate: ${Math.round(d.prob_estimate * 100)}%  Market: ${Math.round(d.market_implied * 100)}%`;
    }
    case "edge": {
      const d = data as EdgeResult;
      return `EV Grade: ${d.ev_grade}  Net EV: ${d.net_ev > 0 ? "+" : ""}${d.net_ev.toFixed(1)}%`;
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
      return `${d.decision.replace("_", " ")}  Confidence: ${d.confidence}%`;
    }
    default:
      return undefined;
  }
}

interface AgentPipelineProps {
  market?: {
    slug: string;
    tokenId: string;
    question: string;
    yesPrice: number;
    noPrice: number;
  };
}

export function AgentPipeline({ market }: AgentPipelineProps) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const agents = pipeline.agents;

  // Calculate how far the blue fill line should go
  const completedCount = AGENTS.filter((a) => agents[a.key]?.status === "done").length;
  const runningIdx = AGENTS.findIndex((a) => agents[a.key]?.status === "running");
  const fillPct =
    completedCount === AGENTS.length
      ? 100
      : runningIdx >= 0
      ? ((runningIdx + 0.5) / AGENTS.length) * 100
      : (completedCount / AGENTS.length) * 100;

  const sigmaData = agents.sigma?.data as SigmaResult | undefined;
  const edgeData = agents.edge?.data as EdgeResult | undefined;

  return (
    <div style={{ position: "relative" }}>
      <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}>
        Agent Pipeline
      </h2>

      <div className="glass-card" style={{ padding: 16, position: "relative" }}>
        {/* Vertical connector line (background) */}
        <div
          style={{
            position: "absolute",
            left: 27,
            top: 24,
            bottom: 24,
            width: 1,
            background: "rgba(255,255,255,0.12)",
          }}
        />

        {/* Vertical connector line (blue fill) */}
        <div
          style={{
            position: "absolute",
            left: 27,
            top: 24,
            width: 1,
            height: `calc(${fillPct}% - 48px)`,
            background: "var(--ios-blue)",
            transition: "height 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            minHeight: 0,
          }}
        />

        {/* Shimmer overlay on running segment */}
        {runningIdx >= 0 && (
          <div
            className="shimmer-line"
            style={{
              position: "absolute",
              left: 26,
              top: `calc(${(runningIdx / AGENTS.length) * 100}% + 24px)`,
              width: 3,
              height: `calc(${(1 / AGENTS.length) * 100}%)`,
              borderRadius: 2,
            }}
          />
        )}

        {/* Agent steps */}
        {AGENTS.map((agent) => {
          const state: AgentCardState = agents[agent.key] || { status: "idle" };
          return (
            <AgentStep
              key={agent.key}
              emoji={agent.emoji}
              name={agent.name}
              status={state.status}
              summary={agentSummary(agent.key, state.data)}
            >
              <AgentDataView data={state.data || state.error} />
            </AgentStep>
          );
        })}
      </div>

      {/* Sigma Decision Card */}
      {sigmaData && market && (
        <SigmaDecision sigma={sigmaData} edge={edgeData} market={market} />
      )}
    </div>
  );
}
