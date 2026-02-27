"use client";

import React from "react";
import { useQuantikStore, type AgentCardState } from "@/store/useQuantikStore";
import { AgentStep, AgentDataView } from "./AgentStep";
import { SigmaDecision } from "./SigmaDecision";
import { SignalValidator } from "./SignalValidator";
import {
  AuraPanel,
  OraclePanel,
  EdgePanel,
  ClausePanel,
  FluxPanel,
  LuciferPanel,
} from "./AgentDetailPanels";
import {
  type SigmaResult,
  type EdgeResult,
  type AuraResult,
  type FluxResult,
  type OracleResult,
  type ClauseResult,
  type LuciferResult,
} from "@/lib/api";

const AGENTS: { key: string; emoji: string; name: string; role: string; color: string }[] = [
  { key: "aura", emoji: "\u{1F30A}", name: "Aura", role: "Sentiment", color: "#0a84ff" },
  { key: "oracle", emoji: "\u{1F52E}", name: "Oracle", role: "Forecasting", color: "#0a84ff" },
  { key: "edge", emoji: "\u{1F4D0}", name: "Edge", role: "Calibration", color: "#ff9f0a" },
  { key: "clause", emoji: "\u2696\uFE0F", name: "Clause", role: "Resolution", color: "#30d158" },
  { key: "flux", emoji: "\u26A1", name: "Flux", role: "Liquidity", color: "#0a84ff" },
  { key: "lucifer", emoji: "\u{1F608}", name: "Lucifer", role: "Devil's Advocate", color: "#bf5af2" },
  { key: "sigma", emoji: "\u{1F9E9}", name: "Sigma", role: "Synthesis", color: "#0a84ff" },
];

/** Safe numeric coercion — prevents toFixed crash when API returns strings */
function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function agentSummary(key: string, data: unknown): string | undefined {
  if (!data) return undefined;
  switch (key) {
    case "aura": {
      const d = data as AuraResult;
      const s = num(d.sentiment_score);
      return `Sentiment: ${s > 0 ? "+" : ""}${s.toFixed(2)}  Echo: ${d.echo_chamber ? "\u26A0" : "\u2713"}`;
    }
    case "flux": {
      const d = data as FluxResult;
      return `Liq: ${d.liquidity_grade}  Spread: ${num(d.spread).toFixed(1)}\u00A2`;
    }
    case "oracle": {
      const d = data as OracleResult;
      return `Estimate: ${Math.round(num(d.prob_estimate) * 100)}%  Market: ${Math.round(num(d.market_implied) * 100)}%`;
    }
    case "edge": {
      const d = data as EdgeResult;
      const ev = num(d.net_ev);
      return `EV Grade: ${d.ev_grade}  Net EV: ${ev > 0 ? "+" : ""}${ev.toFixed(1)}%`;
    }
    case "clause": {
      const d = data as ClauseResult;
      return `Resolution Risk: ${d.resolution_risk}  Issues: ${(d.technicality_risks ?? []).length}`;
    }
    case "lucifer": {
      const d = data as LuciferResult;
      return `DA Score: ${num(d.devils_advocate_score).toFixed(2)}  Biases: ${(d.bias_flags ?? []).length}`;
    }
    case "sigma": {
      const d = data as SigmaResult;
      return `${(d.decision ?? "").replace("_", " ")}  Confidence: ${num(d.confidence)}%`;
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

function renderAgentDetail(key: string, data: unknown, error?: string): React.ReactNode {
  if (error) return <AgentDataView data={error} />;
  if (!data) return null;

  switch (key) {
    case "aura":
      return <AuraPanel data={data as AuraResult} />;
    case "oracle":
      return <OraclePanel data={data as OracleResult} />;
    case "edge":
      return <EdgePanel data={data as EdgeResult} />;
    case "clause":
      return <ClausePanel data={data as ClauseResult} />;
    case "flux":
      return <FluxPanel data={data as FluxResult} />;
    case "lucifer":
      return <LuciferPanel data={data as LuciferResult} />;
    default:
      return <AgentDataView data={data} />;
  }
}

export function AgentPipeline({ market }: AgentPipelineProps) {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const agents = pipeline.agents;

  const sigmaData = agents.sigma?.data as SigmaResult | undefined;
  const edgeData = agents.edge?.data as EdgeResult | undefined;
  const auraData = agents.aura?.data as AuraResult | undefined;
  const fluxData = agents.flux?.data as FluxResult | undefined;
  const luciferData = agents.lucifer?.data as LuciferResult | undefined;

  return (
    <div style={{ position: "relative" }}>
      <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}>
        Agent Pipeline
      </h2>

      {/* Agent steps — each as individual glass card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {AGENTS.map((agent) => {
          const state: AgentCardState = agents[agent.key] || { status: "idle" };
          return (
            <AgentStep
              key={agent.key}
              emoji={agent.emoji}
              name={agent.name}
              role={agent.role}
              status={state.status}
              agentColor={agent.color}
              summary={agentSummary(agent.key, state.data)}
            >
              {renderAgentDetail(agent.key, state.data, state.error)}
            </AgentStep>
          );
        })}
      </div>

      {/* Sigma Decision Card */}
      {sigmaData && market && (
        <SigmaDecision sigma={sigmaData} edge={edgeData} market={market} />
      )}

      {/* Signal Validator — 5-gate checklist */}
      {sigmaData && (
        <SignalValidator
          edge={edgeData}
          sigma={sigmaData}
          aura={auraData}
          flux={fluxData}
          lucifer={luciferData}
        />
      )}
    </div>
  );
}
