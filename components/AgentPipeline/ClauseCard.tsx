"use client";

import { AgentCard } from "./AgentCard";
import { AgentCardState } from "@/store/useQuantikStore";
import { ClauseResult } from "@/lib/api";

interface ClauseCardProps {
  state: AgentCardState;
}

function RiskBadge({ risk }: { risk: "LOW" | "MED" | "HIGH" }) {
  const config = {
    LOW: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
    MED: { color: '#ffaa00', bg: 'rgba(255,170,0,0.1)' },
    HIGH: { color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
  };
  const { color, bg } = config[risk];

  return (
    <span
      className="text-sm font-bold q-mono px-2 py-0.5 rounded"
      style={{ color, background: bg }}
    >
      {risk}
    </span>
  );
}

export function ClauseCard({ state }: ClauseCardProps) {
  const data = state.data as ClauseResult | undefined;

  return (
    <AgentCard title="Resolution Risk" agent="CLAUSE" status={state.status}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#606080' }}>Risk Level</span>
          {data ? (
            <RiskBadge risk={data.resolution_risk} />
          ) : (
            <span className="text-xs q-mono" style={{ color: '#606080' }}>—</span>
          )}
        </div>

        {data?.technicality_risks && data.technicality_risks.length > 0 && (
          <div>
            <span className="text-xs" style={{ color: '#606080' }}>Technicality Risks:</span>
            <ul className="mt-1 space-y-0.5">
              {data.technicality_risks.slice(0, 3).map((risk, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#ffaa00' }}>
                  <span>•</span>
                  <span className="leading-relaxed">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && (!data.technicality_risks || data.technicality_risks.length === 0) && (
          <div className="text-xs" style={{ color: '#606080' }}>No technicality risks identified</div>
        )}
      </div>
    </AgentCard>
  );
}
