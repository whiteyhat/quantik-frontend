"use client";

import Link from "next/link";
import { ArrowRight, Bot, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDashboardAgentHealthScoreQuery } from "@/components/dashboard/dashboardQueries";
import {
  CommandCenterCard,
  CommandCenterHeader,
  MetricBlock,
  PanelEmptyState,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummarySnapshot } from "@/lib/dashboard";
import type { MyAgent } from "@/store/useQuantikStore";

function statusTone(status: string | null | undefined) {
  if (status === "connected" || status === "active") return "good" as const;
  if (status === "pending" || status === "paused") return "warn" as const;
  return "bad" as const;
}

export function DashboardPilotDeck({
  agent,
  agentLoading,
  summary,
}: {
  agent: MyAgent | null;
  agentLoading: boolean;
  summary: DashboardSummarySnapshot | null;
}) {
  const t = useTranslations("dashboard.pilotDeck");
  const isByo = agent?.agent_type === "byo";
  const healthScoreQuery = useDashboardAgentHealthScoreQuery(agent?.id, isByo);

  if (agentLoading) {
    return (
      <CommandCenterCard accent="neutral">
        <div className="space-y-4">
          <Skeleton width="45%" height={12} borderRadius={999} />
          <Skeleton width="65%" height={28} borderRadius={10} />
          <Skeleton width="100%" height={120} borderRadius={20} />
        </div>
      </CommandCenterCard>
    );
  }

  if (!agent) {
    return (
      <CommandCenterCard accent="neutral">
        <CommandCenterHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitleEmpty")}
        />
        <PanelEmptyState
          title={t("emptyTitle")}
          detail={t("emptyDetail")}
          action={
            <Link href="/agent-factory" className="mission-rail-link">
              {t("openAgentFactory")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
        />
      </CommandCenterCard>
    );
  }

  const fundingTone =
    summary?.fundingStatus === "ready"
      ? "good"
      : summary?.fundingStatus === "funding_required"
        ? "warn"
        : "neutral";
  const healthScore = healthScoreQuery.data;

  return (
    <CommandCenterCard accent="neutral" data-testid="dashboard-pilot-deck-card">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <button
            type="button"
            className="mission-rail-link pilot-deck-chat-cta"
            aria-label={t("chatWith", { name: agent.name || "Agent" })}
            title={t("chatWith", { name: agent.name || "Agent" })}
            onClick={() => window.dispatchEvent(new CustomEvent("open-agent-chat"))}
          >
            <MessageSquare className="size-3.5 shrink-0" />
          </button>
        }
      />

      <div className="pilot-deck-identity">
        <div className="pilot-deck-avatar">{agent.avatar_emoji ?? "🤖"}</div>
        <div className="min-w-0">
          <div className="pilot-deck-name">{agent.name}</div>
          <div className="pilot-deck-code">{agent.agent_code}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBlock
          label={t("autopilot")}
          value={agent.autopilot_enabled ? t("engaged") : t("manual")}
          hint={agent.autopilot_enabled ? t("automationCanDeployCapital") : t("tradesRequireManualAction")}
          tone={agent.autopilot_enabled ? "good" : "neutral"}
        />
        <MetricBlock
          label={isByo ? t("connection") : t("funding")}
          value={
            isByo
              ? (agent.connection_status ?? t("pending"))
              : summary?.fundingStatus === "ready"
                ? t("ready")
                : summary?.fundingStatus === "funding_required"
                  ? t("needsFunds")
                  : t("pending")
          }
          hint={
            isByo
              ? (agent.description ?? "External runtime linked into Quantik.")
              : (summary?.fundingMessage ?? summary?.balanceMessage ?? t("walletTelemetryPending"))
          }
          tone={isByo ? statusTone(agent.connection_status) : fundingTone}
        />
      </div>

      <div className="pilot-deck-panel">
        {isByo ? (
          <>
            <div className="pilot-deck-health">
              <div className="pilot-deck-health-score">
                {healthScoreQuery.isLoading ? "..." : healthScore?.score ?? "ND"}
              </div>
              <div>
                <div className="pilot-deck-panel-title">{t("runtimeHealth")}</div>
                <div className="pilot-deck-panel-copy">
                  {healthScore?.message ?? t("waitingForByoTelemetry")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={statusTone(agent.connection_status)} label={agent.connection_status ?? t("pending")} />
              <StatusBadge tone={healthScore?.status === "healthy" ? "good" : healthScore?.status === "degraded" ? "warn" : "bad"} label={healthScore?.status?.replace(/_/g, " ") ?? t("healthPending")} />
            </div>
          </>
        ) : (
          <>
            <div className="pilot-deck-panel-title">{t("createdAgentPosture")}</div>
            <div className="pilot-deck-panel-copy">
              {t("createdAgentCopy")}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="info" label={agent.status || "active"} />
              <StatusBadge tone="neutral" label={t("architectureLinked")} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={agent.autopilot_enabled ? "good" : "neutral"} label={agent.autopilot_enabled ? t("autopilotEngaged") : t("autopilotIdle")} />
        <StatusBadge tone={fundingTone} label={summary?.fundingStatus?.replace(/_/g, " ") ?? t("fundingPending")} />
      </div>

      <div className="pilot-deck-actions">
        <Link href="/manage-agent?tab=world" className="pilot-deck-action">
          <Bot className="size-4" />
          {t("viewAgentsWorld")}
          <ArrowRight className="ml-auto size-4" />
        </Link>
      </div>
    </CommandCenterCard>
  );
}
