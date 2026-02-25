"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { OracleResult } from "@/lib/api";

interface OracleCardProps {
  state: AgentCardState;
}

function ProbBar({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: '#606080' }}>{label}</span>
        <span className="text-sm font-semibold q-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="q-mono text-xs" style={{ color, letterSpacing: '2px' }}>
        {'█'.repeat(filled)}{'░'.repeat(empty)}
      </div>
    </div>
  );
}

export function OracleCard({ state }: OracleCardProps) {
  const data = state.data as OracleResult | undefined;

  return (
    <AgentCard title="Probability" agent="ORACLE" status={state.status}>
      <div className="space-y-2">
        <ProbBar
          value={data?.prob_estimate ?? 0}
          label="AI Estimate"
          color="#4488ff"
        />
        <ProbBar
          value={data?.market_implied ?? 0}
          label="Market Implied"
          color="#606080"
        />
        {data && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#606080' }}>Confidence</span>
            <span className="text-xs q-mono" style={{ color: '#e0e0e0' }}>
              {(data.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </AgentCard>
  );
}
