"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Cpu,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fmtUSDC } from "@/lib/api";
import {
  formatRelativeTime,
  type DashboardAgentRow,
  type DashboardHealthSnapshot,
  type DashboardSummarySnapshot,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

function tileTone(status: "healthy" | "degraded" | "down" | "ready" | "idle") {
  if (status === "healthy" || status === "ready") return "good";
  if (status === "degraded") return "warn";
  if (status === "down") return "bad";
  return "neutral";
}

function runtimeTone(health: DashboardHealthSnapshot | null) {
  if (!health) return "neutral";
  if (health.severity === "good") return "good";
  if (health.severity === "bad") return "bad";
  return "warn";
}

export function DashboardMissionRail({
  summary,
  health,
  agents,
  updatedAt,
  now,
}: {
  summary: DashboardSummarySnapshot | null;
  health: (DashboardHealthSnapshot & { latencyMs: number }) | null;
  agents: DashboardAgentRow[];
  updatedAt: number;
  now: number;
}) {
  const t = useTranslations("dashboard.missionRail");
  const tRel = useTranslations("common");
  const liveAgents = agents.filter((agent) => agent.status === "live").length;
  const idleAgents = agents.filter((agent) => agent.status === "idle").length;
  const degradedAgents = agents.filter((agent) => agent.status === "degraded").length;
  const downAgents = agents.filter((agent) => agent.status === "down").length;
  const hasTraffic = agents.some((agent) => agent.lastActiveAt);
  const fundingTone =
    summary?.fundingStatus === "ready"
      ? "ready"
      : summary?.fundingStatus === "funding_required"
        ? "degraded"
        : "idle";

  return (
    <section className="mission-rail" data-testid="dashboard-command-strip" data-tutorial="mission-rail">
      <article className="mission-rail-tile mission-rail-tile--neutral">
        <div className="mission-rail-icon-wrap">
          <RefreshCw className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">{t("refreshCadence")}</div>
          <div className="mission-rail-value">
            {updatedAt > 0 && now > 0 ? formatRelativeTime(updatedAt, now, tRel) : t("liveSync")}
          </div>
          <div className="mission-rail-subtle">
            {health?.checkedAt ? t("healthSnapshot", { time: formatRelativeTime(health.checkedAt, now, tRel) }) : t("queriesShareRefresh")}
          </div>
        </div>
      </article>

      <article className={cn("mission-rail-tile", `mission-rail-tile--${tileTone(fundingTone)}`)}>
        <div className="mission-rail-icon-wrap">
          <Wallet className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">{t("capitalPosture")}</div>
          <div className="mission-rail-value">
            {summary?.fundingStatus === "ready"
              ? t("autopilotArmed")
              : summary?.fundingStatus === "funding_required"
                ? t("fundingRequired")
                : t("telemetryOnly")}
          </div>
          <div className="mission-rail-subtle">
            {summary?.fundingStatus === "ready" && summary.cashBalance != null
              ? t("readyToDeploy", { amount: fmtUSDC(summary.cashBalance) })
              : summary?.fundingMessage ?? summary?.balanceMessage ?? t("waitingForWalletTelemetry")}
          </div>
        </div>
        {summary?.fundingStatus === "funding_required" ? (
          <Link href="/manage-agent" className="mission-rail-link">
            {t("resolve")}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </article>

      <article className={cn("mission-rail-tile", `mission-rail-tile--${runtimeTone(health)}`)}>
        <div className="mission-rail-icon-wrap">
          <Cpu className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">{t("runtimeFabric")}</div>
          <div className="mission-rail-value">
            {health ? `${health.label} · ${health.latencyMs}ms` : t("heartbeatPending")}
          </div>
          <div className="mission-rail-chip-row">
            {(health?.services ?? []).slice(0, 5).map((service) => (
              <span
                key={service.name}
                className={cn("mission-rail-chip", `mission-rail-chip--${service.status}`)}
              >
                {service.name}
              </span>
            ))}
          </div>
        </div>
      </article>

      <article className="mission-rail-tile mission-rail-tile--info">
        <div className="mission-rail-icon-wrap">
          <Bot className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">{t("agentTraffic")}</div>
          <div className="mission-rail-value">
            {agents.length === 0
              ? t("noTelemetry")
              : liveAgents > 0
                ? t("liveAgents", { live: liveAgents, total: agents.length })
                : t("allAgentsIdle")}
          </div>
          <div className="mission-rail-dots" aria-hidden="true">
            {agents.slice(0, 7).map((agent) => (
              <span
                key={agent.id}
                className={cn("mission-rail-dot", `mission-rail-dot--${agent.status}`)}
              />
            ))}
          </div>
          <div className="mission-rail-subtle">
            {agents.length === 0
              ? t("pipelineAgentsLightUp")
              : !hasTraffic
                ? t("awaitingFirstLiveRun")
                : t("agentSummary", { idle: idleAgents, degraded: degradedAgents, down: downAgents })}
          </div>
        </div>
      </article>

      <article className="mission-rail-banner">
        <div className="mission-rail-banner-copy">
          <span className="mission-rail-banner-kicker">
            <Activity className="size-3.5" />
            {t("missionControlBanner")}
          </span>
          <span className="mission-rail-banner-text">
            {t("bannerText")}
          </span>
        </div>
      </article>
    </section>
  );
}
