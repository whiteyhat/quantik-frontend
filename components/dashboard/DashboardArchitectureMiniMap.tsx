"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AGENT_ANGLES, AGENT_META } from "@/components/ArchitectureView/data/architectureData";
import {
  CommandCenterCard,
  CommandCenterHeader,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import { agentStatusTone, countAgentStatuses, type DashboardAgentRow } from "@/lib/dashboard";
import type { MyAgent } from "@/store/useQuantikStore";


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

  const { live: liveAgents, idle: idleAgents, degraded: degradedAgents, down: downAgents, hasTraffic, hasActive: hasActiveAgents, allIdle } = countAgentStatuses(agents);
  const t = useTranslations("dashboard.architectureMiniMap");

  return (
    <CommandCenterCard accent="blue">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/manage-agent?tab=architecture" className="mission-rail-link">
            {t("openFullMap")}
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
            <div className="dashboard-mini-map-ambient" />
            <div className="dashboard-mini-map-ring dashboard-mini-map-ring--outer" />
            <div className="dashboard-mini-map-ring dashboard-mini-map-ring--inner" />
            {hasActiveAgents ? (
              <>
                <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--outer" />
                <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--inner" />
                <div className="dashboard-mini-map-sweep" />
              </>
            ) : allIdle ? (
              <div className="dashboard-mini-map-sweep dashboard-mini-map-sweep--slow" />
            ) : null}

            <div className="dashboard-mini-map-core">
              <div className="dashboard-mini-map-core-emoji">{myAgent?.avatar_emoji ?? "◆"}</div>
              <div className="dashboard-mini-map-core-label">{myAgent?.name ?? "Quantik Core"}</div>
              <div className="dashboard-mini-map-core-subtitle">
                {hasActiveAgents
                  ? t("pipelineActive")
                  : allIdle
                    ? t("standbyMode")
                    : myAgent?.agent_code ?? t("missionControl")}
              </div>
            </div>

            {Object.entries(AGENT_ANGLES).map(([agentKey, angle]) => {
              const meta = AGENT_META[agentKey];
              const agentRow = statusMap.get(agentKey);
              const radians = (angle * Math.PI) / 180;
              const left = 50 + Math.cos(radians) * 36;
              const top = 50 + Math.sin(radians) * 36;

              return (
                <div
                  key={agentKey}
                  className={`dashboard-mini-map-node dashboard-mini-map-node--${agentStatusTone(agentRow?.status)}`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    ["--mini-map-accent" as string]: meta.color,
                  }}
                  title={`${meta.label} — ${agentRow?.status ?? "unknown"}`}
                >
                  <span className="dashboard-mini-map-node-emoji">{meta.emoji}</span>
                  <span className="dashboard-mini-map-node-label">{meta.label}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("live")}</div>
              <div className="dashboard-mini-map-stat-value dashboard-mini-map-stat-value--good">{liveAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("idle")}</div>
              <div className="dashboard-mini-map-stat-value">{idleAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("degraded")}</div>
              <div className="dashboard-mini-map-stat-value dashboard-mini-map-stat-value--warn">{degradedAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("down")}</div>
              <div className="dashboard-mini-map-stat-value dashboard-mini-map-stat-value--bad">{downAgents}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge
              tone={hasActiveAgents ? "good" : allIdle ? "neutral" : "warn"}
              label={`${agents.length} ${t("specialistAgents")}`}
            />
            <StatusBadge
              tone={hasActiveAgents ? "good" : allIdle ? "neutral" : "warn"}
              label={
                hasActiveAgents
                  ? t("pipelineActive")
                  : allIdle
                    ? t("agentsStandby")
                    : downAgents > 0
                      ? t("agentsNeedAttention")
                      : t("agentsStandby")
              }
            />
            {hasTraffic ? (
              <StatusBadge tone="info" label={t("telemetryRecorded")} />
            ) : null}
          </div>
        </>
      )}
    </CommandCenterCard>
  );
}
