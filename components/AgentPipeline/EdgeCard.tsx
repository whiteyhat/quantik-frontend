"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { EdgeResult, gradeColor } from "@/lib/api";

interface EdgeCardProps {
  state: AgentCardState;
}

export function EdgeCard({ state }: EdgeCardProps) {
  const data = state.data as EdgeResult | undefined;
  const grade = data?.ev_grade ?? "—";
  const gradeC = data ? gradeColor(data.ev_grade === "PASS" ? "D" : data.ev_grade) : '#606080';

  return (
    <AgentCard title="Expected Value" agent="EDGE" status={state.status}>
      <div className="space-y-2">
        {/* EV Grade */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>EV Grade</span>
          <span
            className="text-xl font-bold q-mono"
            style={{ color: gradeC }}
          >
            {grade}
          </span>
        </div>

        {/* Net EV */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>Net EV</span>
          <span
            className="text-sm font-semibold q-mono"
            style={{ color: data && data.net_ev > 0 ? '#00ff88' : '#ff4444' }}
          >
            {data ? `${data.net_ev > 0 ? '+' : ''}${data.net_ev.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Kelly & Rec */}
        {data && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#606080' }}>Kelly → Rec</span>
            <span className="text-xs q-mono" style={{ color: '#e0e0e0' }}>
              {data.kelly.toFixed(1)}% → {data.recommended_size.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </AgentCard>
  );
}
