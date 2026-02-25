"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { FluxResult, gradeColor } from "@/lib/api";

interface FluxCardProps {
  state: AgentCardState;
}

export function FluxCard({ state }: FluxCardProps) {
  const data = state.data as FluxResult | undefined;

  return (
    <AgentCard title="Liquidity" agent="FLUX" status={state.status}>
      <div className="space-y-2">
        {/* Grade badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>Liq Grade</span>
          {data ? (
            <span
              className="text-xl font-bold q-mono"
              style={{ color: gradeColor(data.liquidity_grade) }}
            >
              {data.liquidity_grade}
            </span>
          ) : (
            <span className="text-xl font-bold q-mono" style={{ color: '#1e1e2e' }}>—</span>
          )}
        </div>

        {/* Spread */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>Spread</span>
          <span className="text-xs q-mono" style={{ color: '#e0e0e0' }}>
            {data ? `${(data.spread * 100).toFixed(1)}¢` : '—'}
          </span>
        </div>

        {/* Whale signals */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>Whale Signals</span>
          <span
            className="text-xs q-mono font-semibold"
            style={{ color: data && data.whale_signals > 0 ? '#ffaa00' : '#606080' }}
          >
            {data ? `${data.whale_signals} detected` : '—'}
          </span>
        </div>
      </div>
    </AgentCard>
  );
}
