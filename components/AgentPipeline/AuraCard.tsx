"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { AuraResult } from "@/lib/api";

interface AuraCardProps {
  state: AgentCardState;
}

function SentimentGauge({ score }: { score: number }) {
  // score: -1 to +1
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.2 ? '#00ff88' : score < -0.2 ? '#ff4444' : '#ffaa00';

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs q-mono mb-1" style={{ color: '#606080' }}>
        <span>−1</span>
        <span style={{ color }}>{score > 0 ? '+' : ''}{score.toFixed(2)}</span>
        <span>+1</span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: '#0a0a0f' }}>
        {/* Track segments */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          <div className="h-full" style={{ width: '50%', background: 'rgba(255,68,68,0.15)' }} />
          <div className="h-full" style={{ width: '50%', background: 'rgba(0,255,136,0.15)' }} />
        </div>
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{
            left: `calc(${pct}% - 5px)`,
            borderColor: color,
            background: '#14141f',
            transition: 'left 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export function AuraCard({ state }: AuraCardProps) {
  const data = state.data as AuraResult | undefined;

  return (
    <AgentCard title="Sentiment" agent="AURA" status={state.status}>
      <SentimentGauge score={data?.sentiment_score ?? 0} />
      <div className="space-y-1">
        {data?.echo_chamber ? (
          <div
            className="text-xs px-2 py-1 rounded flex items-center gap-2"
            style={{ background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)' }}
          >
            <span style={{ color: '#ffaa00' }}>⚠</span>
            <span style={{ color: '#ffaa00' }}>
              Echo chamber detected {data.echo_chamber_strength
                ? `(${(data.echo_chamber_strength * 100).toFixed(0)}% strength)`
                : ''}
            </span>
          </div>
        ) : data ? (
          <div className="text-xs" style={{ color: '#606080' }}>
            No echo chamber bias detected
          </div>
        ) : (
          <div className="text-xs" style={{ color: '#606080' }}>—</div>
        )}
      </div>
    </AgentCard>
  );
}
