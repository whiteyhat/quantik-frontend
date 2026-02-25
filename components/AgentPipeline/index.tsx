"use client";

import { useQuantikStore } from "@/store/useQuantikStore";
import { AuraCard } from "./AuraCard";
import { FluxCard } from "./FluxCard";
import { OracleCard } from "./OracleCard";
import { EdgeCard } from "./EdgeCard";
import { ClauseCard } from "./ClauseCard";
import { LuciferCard } from "./LuciferCard";
import { SigmaCard } from "./SigmaCard";

export function AgentPipeline() {
  const pipeline = useQuantikStore((s) => s.pipeline);
  const { agents } = pipeline;

  return (
    <div className="q-card mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e1e2e' }}>
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
          Agent Pipeline
        </span>
        <div className="flex items-center gap-3">
          {pipeline.running && (
            <span className="text-xs agent-running q-mono" style={{ color: '#ffaa00' }}>
              Agents running...
            </span>
          )}
          {!pipeline.running && pipeline.result && (
            <span className="text-xs q-mono" style={{ color: '#00ff88' }}>
              ✓ Analysis complete
            </span>
          )}
          {!pipeline.running && !pipeline.result && (
            <span className="text-xs q-mono" style={{ color: '#606080' }}>
              Ready to run
            </span>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <AuraCard state={agents.aura ?? { status: 'idle' }} />
        <FluxCard state={agents.flux ?? { status: 'idle' }} />
        <OracleCard state={agents.oracle ?? { status: 'idle' }} />
        <EdgeCard state={agents.edge ?? { status: 'idle' }} />
        <ClauseCard state={agents.clause ?? { status: 'idle' }} />
        <LuciferCard state={agents.lucifer ?? { status: 'idle' }} />
        <SigmaCard state={agents.sigma ?? { status: 'idle' }} />
      </div>
    </div>
  );
}
