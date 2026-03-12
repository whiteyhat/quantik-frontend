"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const idleAgents = agents.filter((agent) => agent.status === "idle").length;
  const degradedAgents = agents.filter((agent) => agent.status === "degraded").length;
  const downAgents = agents.filter((agent) => agent.status === "down").length;
  const hasTraffic = agents.some((agent) => agent.lastActiveAt);
  const hasRecentRuntime = agents.some((agent) => agent.status !== "idle" && agent.lastActiveAt);
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
            {hasTraffic ? (
              <>
                <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--outer" />
                <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--inner" />
                <div className="dashboard-mini-map-sweep" />
              </>
            ) : null}

            <div className="dashboard-mini-map-core">
              <div className="dashboard-mini-map-core-emoji">{myAgent?.avatar_emoji ?? "◆"}</div>
              <div className="dashboard-mini-map-core-label">{myAgent?.name ?? "Quantik Core"}</div>
              <div className="dashboard-mini-map-core-subtitle">
                {myAgent?.agent_code ?? t("missionControl")}
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
                  title={t("noTrafficTitle")}
                  detail={t("noTrafficDetail")}
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("live")}</div>
              <div className="dashboard-mini-map-stat-value">{liveAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("idle")}</div>
              <div className="dashboard-mini-map-stat-value">{idleAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("degraded")}</div>
              <div className="dashboard-mini-map-stat-value">{degradedAgents}</div>
            </div>
            <div className="dashboard-mini-map-stat">
              <div className="dashboard-mini-map-stat-label">{t("down")}</div>
              <div className="dashboard-mini-map-stat-value">{downAgents}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info" label={t("specialistAgents")} />
            <StatusBadge
              tone={hasTraffic ? (hasRecentRuntime ? "good" : "neutral") : "warn"}
              label={
                hasTraffic
                  ? (hasRecentRuntime ? t("runtimeTelemetryLive") : t("agentsCurrentlyIdle"))
                  : t("awaitingRuntimeTraffic")
              }
            />
            <StatusBadge tone="neutral" label={t("tapThroughForFullArchitecture")} />
          </div>
        </>
      )}
    </CommandCenterCard>
  );
}
