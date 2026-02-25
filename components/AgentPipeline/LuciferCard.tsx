"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { LuciferResult } from "@/lib/api";

interface LuciferCardProps {
  state: AgentCardState;
}

function DevilGauge({ score }: { score: number }) {
  const pct = score * 100;
  const color = score < 0.3 ? '#00ff88' : score < 0.7 ? '#ffaa00' : '#ff4444';
  const isPulsing = score >= 0.7;

  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs q-mono mb-1" style={{ color: '#606080' }}>
        <span>0</span>
        <span
          className={isPulsing ? 'devil-pulse rounded px-1' : ''}
          style={{ color }}
        >
          {score.toFixed(2)}
        </span>
        <span>1</span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: '#0a0a0f' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export function LuciferCard({ state }: LuciferCardProps) {
  const data = state.data as LuciferResult | undefined;

  return (
    <AgentCard title="Devil's Advocate" agent="LUCIFER" status={state.status}>
      <div className="space-y-2">
        <DevilGauge score={data?.devils_advocate_score ?? 0} />

        {data?.bias_flags && data.bias_flags.length > 0 && (
          <div>
            <span className="text-xs" style={{ color: '#606080' }}>Bias Flags:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.bias_flags.map((flag, i) => (
                <span
                  key={i}
                  className="text-xs px-1.5 py-0.5 rounded q-mono"
                  style={{
                    background: 'rgba(255,68,68,0.1)',
                    color: '#ff4444',
                    border: '1px solid rgba(255,68,68,0.2)',
                  }}
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {data?.counter_thesis && (
          <div>
            <span className="text-xs" style={{ color: '#606080' }}>Counter-thesis:</span>
            <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: '#e0e0e0' }}>
              {data.counter_thesis}
            </p>
          </div>
        )}
      </div>
    </AgentCard>
  );
}
