"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { SigmaResult } from "@/lib/api";

interface SigmaCardProps {
  state: AgentCardState;
}

export function SigmaCard({ state }: SigmaCardProps) {
  const data = state.data as SigmaResult | undefined;

  const decisionColor = !data ? '#606080'
    : data.decision === "BET_YES" ? '#00ff88'
    : data.decision === "BET_NO" ? '#ff4444'
    : '#ffaa00';

  const decisionBg = !data ? 'transparent'
    : data.decision === "BET_YES" ? 'rgba(0,255,136,0.05)'
    : data.decision === "BET_NO" ? 'rgba(255,68,68,0.05)'
    : 'rgba(255,170,0,0.05)';

  return (
    <AgentCard title="Final Decision" agent="SIGMA" status={state.status} fullWidth>
      {!data ? (
        <div
          className="rounded p-4 text-center text-xs"
          style={{ background: '#0a0a0f', border: '1px dashed #1e1e2e', color: '#606080' }}
        >
          Awaiting Sigma analysis...
        </div>
      ) : (
        <div
          className="rounded p-4"
          style={{
            background: decisionBg,
            border: `1px solid ${decisionColor}30`,
          }}
        >
          {/* Decision header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold q-mono px-3 py-1 rounded"
                style={{ color: decisionColor, background: `${decisionColor}20` }}
              >
                {data.decision}
              </span>
              <span className="text-xs" style={{ color: '#606080' }}>confidence:</span>
              <span className="text-sm font-semibold q-mono" style={{ color: decisionColor }}>
                {data.confidence}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full" style={{ background: '#0a0a0f' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${data.confidence}%`,
                    background: decisionColor,
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Thesis */}
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#e0e0e0' }}>
            {data.thesis}
          </p>

          {/* Size info */}
          <div
            className="flex items-center gap-4 pt-2 border-t text-xs q-mono"
            style={{ borderColor: `${decisionColor}20` }}
          >
            <span style={{ color: '#606080' }}>Size:</span>
            <span style={{ color: '#e0e0e0' }}>
              {data.size_pct.toFixed(1)}% bankroll
            </span>
            <span style={{ color: decisionColor }}>
              (${data.size_usd.toFixed(2)})
            </span>
            <span style={{ color: '#606080' }}>at</span>
            <span style={{ color: '#4488ff' }}>
              {Math.round(data.entry_price * 100)}¢
            </span>
          </div>
        </div>
      )}
    </AgentCard>
  );
}
