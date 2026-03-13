"use client";

import { useState } from "react";
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
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { api } from "@/lib/api";
import type { DashboardSummarySnapshot } from "@/lib/dashboard";
import type { MyAgent } from "@/store/useQuantikStore";
import { useQuantikStore } from "@/store/useQuantikStore";

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
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const [isSaving, setIsSaving] = useState(false);

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

  const autopilotEnabled = Boolean(agent.autopilot_enabled);

  const handleAutopilotToggle = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const result = await api.updateAutopilot(agent.id, enabled);
      setMyAgent({
        ...agent,
        autopilot_enabled: result.autopilot_enabled,
        autopilot_updated_at: result.autopilot_updated_at,
      });
    } catch {
      // revert silently on error
    } finally {
      setIsSaving(false);
    }
  };

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

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
          }}>
            {t("autopilot")}
          </span>
          <span style={{
            fontSize: 11,
            color: autopilotEnabled ? "rgba(48,209,88,0.85)" : "rgba(255,255,255,0.45)",
            lineHeight: 1.4,
          }}>
            {autopilotEnabled ? t("automationCanDeployCapital") : t("tradesRequireManualAction")}
          </span>
        </div>
        <ToggleSwitch
          checked={autopilotEnabled}
          onChange={handleAutopilotToggle}
          disabled={isSaving || agent.status === "terminated"}
          loading={isSaving}
        />
      </div>

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
        <StatusBadge tone={autopilotEnabled ? "good" : "neutral"} label={autopilotEnabled ? t("autopilotEngaged") : t("autopilotIdle")} />
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
