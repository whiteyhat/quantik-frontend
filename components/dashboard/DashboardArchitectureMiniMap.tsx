"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AGENT_ANGLES, AGENT_META } from "@/components/ArchitectureView/data/architectureData";
import {
  CommandCenterCard,
  CommandCenterHeader,
  PanelEmptyState,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardAgentRow } from "@/lib/dashboard";
import type { MyAgent } from "@/store/useQuantikStore";

function nodeTone(status: DashboardAgentRow["status"] | undefined) {
  if (status === "live") return "good";
  if (status === "degraded") return "warn";
  if (status === "down") return "bad";
  return "neutral";
}

export function DashboardArchitectureMiniMap({
  agents,
  myAgent,
  loading,
}: {
  agents: DashboardAgentRow[];
  myAgent: MyAgent | null;
  loading: boolean;
}) {
  const statusMap = new Map(
    agents.map((agent) => [agent.id.toLowerCase(), agent])
  );

  const liveAgents = agents.filter((agent) => agent.status === "live").length;
  const degradedAgents = agents.filter((agent) => agent.status === "degraded").length;
  const downAgents = agents.filter((agent) => agent.status === "down").length;
  const hasTraffic = agents.some((agent) => agent.lastActiveAt);

  return (
    <CommandCenterCard accent="blue">
      <CommandCenterHeader
        eyebrow="Architecture"
        title="Neural Web Mini-Map"
        subtitle="A compact live view of the full Quantik topology."
        action={
          <Link href="/manage-agent?tab=architecture" className="mission-rail-link">
            Open full map
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton width="100%" height={280} borderRadius={24} />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} width="100%" height={54} borderRadius={16} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-mini-map">
            <div className="dashboard-mini-map-grid" />
            <div className="dashboard-mini-map-ring dashboard-mini-map-ring--outer" />
            <div className="dashboard-mini-map-ring dashboard-mini-map-ring--inner" />

            <div className="dashboard-mini-map-core">
              <div className="dashboard-mini-map-core-emoji">{myAgent?.avatar_emoji ?? "◆"}</div>
              <div className="dashboard-mini-map-core-label">{myAgent?.name ?? "Quantik Core"}</div>
              <div className="dashboard-mini-map-core-subtitle">
                {myAgent?.agent_code ?? "MISSION CONTROL"}
              </div>
            </div>

            {Object.entries(AGENT_ANGLES).map(([agentKey, angle]) => {
              const meta = AGENT_META[agentKey];
              const status = statusMap.get(agentKey);
              const radians = (angle * Math.PI) / 180;
              const left = 50 + Math.cos(radians) * 36;
              const top = 50 + Math.sin(radians) * 36;

              return (
                <div
                  key={agentKey}
                  className={`dashboard-mini-map-node dashboard-mini-map-node--${nodeTone(status?.status)}`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    ["--mini-map-accent" as string]: meta.color,
                  }}
                >
                  <span className="dashboard-mini-map-node-emoji">{meta.emoji}</span>
                  <span className="dashboard-mini-map-node-label">{meta.label}</span>
                </div>
              );
            })}

            {!hasTraffic ? (
              <div className="dashboard-mini-map-overlay">
                <PanelEmptyState
                  title="No agent traffic yet"
                  detail="The topology is armed and waiting for the next live pipeline cycle."
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">Live</div>
              <div className="dashboard-mini-map-stat-value">{liveAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">Degraded</div>
              <div className="dashboard-mini-map-stat-value">{degradedAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">Down</div>
              <div className="dashboard-mini-map-stat-value">{downAgents}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info" label="7 specialist agents" />
            <StatusBadge tone={hasTraffic ? "good" : "warn"} label={hasTraffic ? "Live runtime traffic" : "Awaiting runtime traffic"} />
            <StatusBadge tone="neutral" label="Tap through for full architecture" />
          </div>
        </>
      )}
    </CommandCenterCard>
  );
}
