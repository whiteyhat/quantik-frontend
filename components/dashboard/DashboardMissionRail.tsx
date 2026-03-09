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
  const liveAgents = agents.filter((agent) => agent.status === "live").length;
  const degradedAgents = agents.filter((agent) => agent.status === "degraded").length;
  const downAgents = agents.filter((agent) => agent.status === "down").length;
  const fundingTone =
    summary?.fundingStatus === "ready"
      ? "ready"
      : summary?.fundingStatus === "funding_required"
        ? "degraded"
        : "idle";

  return (
    <section className="mission-rail" data-testid="dashboard-command-strip">
      <article className="mission-rail-tile mission-rail-tile--neutral">
        <div className="mission-rail-icon-wrap">
          <RefreshCw className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">Refresh cadence</div>
          <div className="mission-rail-value">
            {updatedAt > 0 && now > 0 ? formatRelativeTime(updatedAt, now) : "Live sync"}
          </div>
          <div className="mission-rail-subtle">
            {health?.checkedAt ? `Health snapshot ${formatRelativeTime(health.checkedAt, now)}` : "Queries share one refresh cycle"}
          </div>
        </div>
      </article>

      <article className={cn("mission-rail-tile", `mission-rail-tile--${tileTone(fundingTone)}`)}>
        <div className="mission-rail-icon-wrap">
          <Wallet className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">Capital posture</div>
          <div className="mission-rail-value">
            {summary?.fundingStatus === "ready"
              ? "Autopilot armed"
              : summary?.fundingStatus === "funding_required"
                ? "Funding required"
                : "Telemetry only"}
          </div>
          <div className="mission-rail-subtle">
            {summary?.fundingStatus === "ready" && summary.cashBalance != null
              ? `${fmtUSDC(summary.cashBalance)} ready to deploy`
              : summary?.fundingMessage ?? summary?.balanceMessage ?? "Waiting for wallet telemetry"}
          </div>
        </div>
        {summary?.fundingStatus === "funding_required" ? (
          <Link href="/manage-agent" className="mission-rail-link">
            Resolve
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </article>

      <article className={cn("mission-rail-tile", `mission-rail-tile--${runtimeTone(health)}`)}>
        <div className="mission-rail-icon-wrap">
          <Cpu className="size-4" />
        </div>
        <div className="mission-rail-copy">
          <div className="mission-rail-label">Runtime fabric</div>
          <div className="mission-rail-value">
            {health ? `${health.label} · ${health.latencyMs}ms` : "Heartbeat pending"}
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
          <div className="mission-rail-label">Agent traffic</div>
          <div className="mission-rail-value">
            {agents.length > 0 ? `${liveAgents} live / ${agents.length}` : "No telemetry"}
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
            {agents.length > 0
              ? `${degradedAgents} degraded · ${downAgents} down`
              : "Pipeline agents will light up after live runs"}
          </div>
        </div>
      </article>

      <article className="mission-rail-banner">
        <div className="mission-rail-banner-copy">
          <span className="mission-rail-banner-kicker">
            <Activity className="size-3.5" />
            Mission control
          </span>
          <span className="mission-rail-banner-text">
            Real backend telemetry now powers funding, runtime, and pipeline status across the whole surface.
          </span>
        </div>
      </article>
    </section>
  );
}
