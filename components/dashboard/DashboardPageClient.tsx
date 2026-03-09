"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useInView } from "react-intersection-observer";
import {
  ArrowRight,
  Radar,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { fmtPrice, fmtUSDC, streamPrices, type Position, type Signal } from "@/lib/api";
import {
  formatRelativeTime,
  type DashboardAgentRow,
  type DashboardHealthSnapshot,
  type DashboardSummarySnapshot,
} from "@/lib/dashboard";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardArchitectureMiniMap } from "@/components/dashboard/DashboardArchitectureMiniMap";
import { DashboardMissionRail } from "@/components/dashboard/DashboardMissionRail";
import { DashboardPilotDeck } from "@/components/dashboard/DashboardPilotDeck";
import {
  CommandCenterCard,
  CommandCenterHeader,
  MetricBlock,
  PanelEmptyState,
  PanelErrorState,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import {
  SCANNER_CATEGORIES,
  type ScannerCategory,
  useDashboardSystemAgentsQuery,
  useDashboardHealthQuery,
  useDashboardOrchestratorQuery,
  useDashboardPositionsQuery,
  useDashboardRiskConfigQuery,
  useDashboardRiskStatusQuery,
  useDashboardScannerQuery,
  useDashboardSignalsQuery,
  useDashboardSummaryQuery,
  useTriggerOrchestratorScan,
} from "@/components/dashboard/dashboardQueries";
import { useQuantikStore } from "@/store/useQuantikStore";

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

function numberTone(value: number, warnAt: number, badAt: number): "good" | "warn" | "bad" {
  if (value >= badAt) return "bad";
  if (value >= warnAt) return "warn";
  return "good";
}

function pnlTone(value: number): "good" | "bad" {
  return value >= 0 ? "good" : "bad";
}

function healthTone(health: DashboardHealthSnapshot | null | undefined) {
  if (!health) return "warn" as const;
  return health.severity === "good"
    ? "good"
    : health.severity === "bad"
      ? "bad"
      : "warn";
}

function serviceTone(status: DashboardHealthSnapshot["services"][number]["status"]) {
  if (status === "healthy") return "good" as const;
  if (status === "degraded") return "warn" as const;
  return "bad" as const;
}

function runtimeStatusTone(status: DashboardAgentRow["status"]) {
  if (status === "live") return "good" as const;
  if (status === "degraded") return "warn" as const;
  if (status === "idle") return "neutral" as const;
  return "bad" as const;
}

function signalTone(signal: Signal["status"]) {
  if (signal === "TRADE") return "good" as const;
  if (signal === "WATCH") return "warn" as const;
  return "bad" as const;
}

function orchestratorScoreTone(score: number) {
  if (score >= 75) return "good" as const;
  if (score >= 50) return "warn" as const;
  return "neutral" as const;
}

function isLiveHealth(services: DashboardHealthSnapshot["services"]) {
  return services.length > 0;
}

function MissionControlHero({
  summary,
  riskStatus,
  health,
  orchestrator,
  updatedAt,
  now,
}: {
  summary: DashboardSummarySnapshot | null;
  riskStatus: ReturnType<typeof useDashboardRiskStatusQuery>["data"];
  health: (ReturnType<typeof useDashboardHealthQuery>["data"] & { latencyMs: number }) | null;
  orchestrator: ReturnType<typeof useDashboardOrchestratorQuery>["data"];
  updatedAt: number;
  now: number;
}) {
  const statusText = summary?.fundingStatus === "ready"
    ? "Capital armed"
    : summary?.fundingStatus === "funding_required"
      ? "Funding needed"
      : "Telemetry only";

  return (
    <CommandCenterCard accent="blue" className="command-center-hero overflow-hidden">
      <div className="command-center-hero-grid">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={summary?.fundingStatus === "ready" ? "good" : "warn"}
              label={statusText}
            />
            <StatusBadge
              tone={healthTone(health)}
              label={health ? `API ${health.label}` : "API checking"}
            />
            <StatusBadge
              tone={orchestrator?.status.status === "scanning" ? "info" : "neutral"}
              label={orchestrator?.status.status === "scanning" ? "Scanner running" : "Scanner idle"}
            />
          </div>

          <div className="space-y-3">
            <div className="command-center-eyebrow">Mission Control</div>
            <h1 className="command-center-hero-title">Operate the whole trading stack from one live surface.</h1>
            <p className="command-center-hero-copy">
              Shared telemetry now drives portfolio, risk, orchestration, and market discovery from the same refresh cycle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-[rgba(255,255,255,0.58)]">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-[#7dd3fc]" />
              <span>{summary?.liveBalanceAvailable ? "Live balance synced" : "Balance feed warming up"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-[#facc15]" />
              <span>
                Circuit {summary?.circuitBreakerStatus ?? riskStatus?.circuitBreaker ?? "ARMED"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-[rgba(255,255,255,0.35)]" />
              <span>
                Updated {updatedAt > 0 && now > 0 ? formatRelativeTime(updatedAt, now) : "syncing"}
              </span>
            </div>
          </div>
        </div>

        <div className="command-center-kpi-grid">
          <MetricBlock
            label="Total Value"
            value={summary?.totalValue != null ? fmtUSDC(summary.totalValue) : "—"}
            hint={summary?.cashBalance != null ? `${fmtUSDC(summary.cashBalance)} liquid` : "Waiting for balance"}
            tone="info"
          />
          <MetricBlock
            label="Daily P&L"
            value={
              summary
                ? `${summary.pnlToday >= 0 ? "+" : ""}${fmtUSDC(summary.pnlToday)}`
                : "—"
            }
            hint={summary?.pnlTodayPct != null ? `${summary.pnlTodayPct.toFixed(1)}% today` : "No daily delta"}
            tone={summary ? pnlTone(summary.pnlToday) : "neutral"}
          />
          <MetricBlock
            label="Exposure"
            value={riskStatus ? `${riskStatus.exposurePct.toFixed(1)}%` : "—"}
            hint={riskStatus ? `${fmtUSDC(riskStatus.availableCapital)} deployable` : "Risk feed offline"}
            tone={riskStatus ? numberTone(riskStatus.exposurePct, 45, 75) : "neutral"}
          />
          <MetricBlock
            label="Candidates"
            value={orchestrator ? orchestrator.candidates.length : "—"}
            hint={
              orchestrator?.status.lastScanAt
                ? `Scanned ${formatRelativeTime(orchestrator.status.lastScanAt, now)}`
                : "No recent scan"
            }
            tone={orchestrator && orchestrator.candidates.length > 0 ? "good" : "neutral"}
          />
        </div>
      </div>
    </CommandCenterCard>
  );
}

function SummaryCard({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: DashboardSummarySnapshot | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <CommandCenterCard accent="blue">
        <PanelErrorState
          title="Portfolio feed unavailable"
          detail="The balance and P&L summary did not arrive. Retry the portfolio snapshot."
          onRetry={onRetry}
        />
      </CommandCenterCard>
    );
  }

  return (
    <CommandCenterCard accent="blue" data-testid="dashboard-portfolio-card">
      <CommandCenterHeader
        eyebrow="Capital"
        title="Portfolio"
        subtitle="One bankroll snapshot reused across every summary widget."
      />

      {loading || !summary ? (
        <div className="space-y-4">
          <Skeleton width="60%" height={34} borderRadius={10} />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton width="100%" height={72} borderRadius={16} />
            <Skeleton width="100%" height={72} borderRadius={16} />
          </div>
          <Skeleton width="100%" height={10} borderRadius={99} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="command-center-metric-label">Net liquidation value</div>
            <div className="text-[2rem] font-semibold tracking-[-0.04em] text-white">
              {summary.totalValue != null ? fmtUSDC(summary.totalValue) : "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                tone={summary.pnlToday >= 0 ? "good" : "bad"}
                label={`${summary.pnlToday >= 0 ? "+" : ""}${fmtUSDC(summary.pnlToday)} today`}
              />
              <StatusBadge
                tone={summary.circuitBreakerStatus === "ARMED" ? "good" : summary.circuitBreakerStatus === "WARNING" ? "warn" : "bad"}
                label={`Circuit ${summary.circuitBreakerStatus}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricBlock
              label="Available Cash"
              value={summary.cashBalance != null ? fmtUSDC(summary.cashBalance) : "—"}
              hint={summary.balanceMessage ?? "Ready for next deployment"}
              tone="neutral"
            />
            <MetricBlock
              label="Capital in Play"
              value={summary.positionsValue != null ? fmtUSDC(summary.positionsValue) : "—"}
              hint={`${Math.round(summary.kellyUtilization * 100)}% Kelly utilization`}
              tone={numberTone(summary.kellyUtilization * 100, 60, 85)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[rgba(255,255,255,0.45)]">
              <span>Kelly utilization</span>
              <span>{Math.round(summary.kellyUtilization * 100)}%</span>
            </div>
            <div className="command-center-progress">
              <div
                className="command-center-progress-fill"
                style={{ width: `${Math.min(100, Math.round(summary.kellyUtilization * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </CommandCenterCard>
  );
}

function PositionsCard({
  positions,
  loading,
  error,
  onRetry,
}: {
  positions: Position[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <CommandCenterCard accent="neutral">
      <CommandCenterHeader
        eyebrow="Execution"
        title="Active Positions"
        subtitle="Open exposure ranked by deployed capital."
      />

      {error ? (
        <PanelErrorState
          title="Positions unavailable"
          detail="Open exposure could not be loaded from the wallet service."
          onRetry={onRetry}
        />
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="command-center-list-row">
              <Skeleton width="55%" height={14} borderRadius={5} />
              <Skeleton width={84} height={14} borderRadius={5} />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <PanelEmptyState
          title="No open positions"
          detail="The wallet is flat right now. Fresh opportunities will surface in the scanner and orchestrator panels."
        />
      ) : (
        <div className="space-y-3">
          {positions.slice(0, 5).map((position) => {
            const pnl = position.pnl ?? 0;
            return (
              <Link
                key={position.id || `${position.slug}-${position.direction}`}
                href={position.slug ? `/market/${position.slug}` : "#"}
                className="command-center-list-row block no-underline"
              >
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{position.market}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[rgba(255,255,255,0.45)]">
                      <StatusBadge tone={position.direction === "YES" ? "good" : "bad"} label={position.direction} />
                      <span>{fmtPrice(position.entryPrice)} → {fmtPrice(position.currentPrice)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm text-[rgba(255,255,255,0.72)]">{fmtUSDC(position.size)}</div>
                    <div className={pnl >= 0 ? "text-[#34d399]" : "text-[#ff9b8c]"}>
                      {pnl >= 0 ? "+" : ""}
                      {fmtUSDC(pnl)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </CommandCenterCard>
  );
}

function RiskPostureCard({
  riskStatus,
  riskConfig,
  loading,
  error,
  onRetry,
}: {
  riskStatus: ReturnType<typeof useDashboardRiskStatusQuery>["data"];
  riskConfig: ReturnType<typeof useDashboardRiskConfigQuery>["data"];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <CommandCenterCard accent="orange">
        <PanelErrorState
          title="Risk telemetry unavailable"
          detail="Risk status or guardrails failed to load. Retry the shared risk feed."
          onRetry={onRetry}
        />
      </CommandCenterCard>
    );
  }

  return (
    <CommandCenterCard accent="orange">
      <CommandCenterHeader
        eyebrow="Guardrails"
        title="Risk Posture"
        subtitle="Live utilization and hard limits from the shared risk engine."
      />

      {loading || !riskStatus || !riskConfig ? (
        <div className="grid gap-3">
          <Skeleton width="100%" height={82} borderRadius={16} />
          <Skeleton width="100%" height={82} borderRadius={16} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricBlock
              label="Exposure"
              value={`${riskStatus.exposurePct.toFixed(1)}%`}
              hint={`${fmtUSDC(riskStatus.availableCapital)} available`}
              tone={numberTone(riskStatus.exposurePct, 45, 75)}
            />
            <MetricBlock
              label="Drawdown"
              value={`${riskStatus.dailyPnlPct.toFixed(1)}%`}
              hint={`Limit ${Math.round(riskConfig.drawdownLimit * 100)}%`}
              tone={numberTone(Math.abs(riskStatus.dailyPnlPct), riskConfig.drawdownLimit * 50, riskConfig.drawdownLimit * 100)}
            />
          </div>

          <div className="command-center-stat-strip">
            <div>
              <div className="command-center-stat-label">Circuit</div>
              <div className="command-center-stat-value">{riskStatus.circuitBreaker}</div>
            </div>
            <div>
              <div className="command-center-stat-label">Max Position</div>
              <div className="command-center-stat-value">{Math.round(riskConfig.maxPositionSize * 100)}%</div>
            </div>
            <div>
              <div className="command-center-stat-label">Kelly</div>
              <div className="command-center-stat-value">{riskConfig.kellyMultiplier}×</div>
            </div>
          </div>
        </div>
      )}
    </CommandCenterCard>
  );
}

function PerformanceCard({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: DashboardSummarySnapshot | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <CommandCenterCard accent="green">
      <CommandCenterHeader
        eyebrow="Signal Quality"
        title="Performance Pulse"
        subtitle="The same summary snapshot drives win rate, streak, and decay messaging."
      />

      {error ? (
        <PanelErrorState
          title="Performance summary unavailable"
          detail="P&L and hit-rate telemetry could not be refreshed."
          onRetry={onRetry}
        />
      ) : loading || !summary ? (
        <div className="space-y-3">
          <Skeleton width="45%" height={28} borderRadius={10} />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton width="100%" height={80} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={16} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricBlock
              label="Win Rate"
              value={`${(summary.winRate * 100).toFixed(1)}%`}
              hint={`${summary.totalTrades} total trades`}
              tone={numberTone(summary.winRate * 100, 45, 60)}
            />
            <MetricBlock
              label="Current Streak"
              value={summary.metrics.currentStreak > 0 ? `+${summary.metrics.currentStreak}` : summary.metrics.currentStreak}
              hint={summary.metrics.bestTrade ? `Best ${summary.metrics.bestTrade}` : "No standout trade yet"}
              tone={summary.metrics.currentStreak >= 0 ? "good" : "bad"}
            />
          </div>

          <div className="command-center-stat-strip">
            <div>
              <div className="command-center-stat-label">Best P&L</div>
              <div className="command-center-stat-value">{fmtUSDC(summary.metrics.bestPnl)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">Total Volume</div>
              <div className="command-center-stat-value">{fmtUSDC(summary.metrics.totalVolume)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">Alpha Decay</div>
              <div className="command-center-stat-value">
                {summary.alphaDecay?.detected ? "Detected" : "Clear"}
              </div>
            </div>
          </div>

          {summary.alphaDecay ? (
            <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[rgba(255,255,255,0.68)]">
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-[rgba(255,255,255,0.38)]">Alpha Decay Recommendation</div>
              <div>{summary.alphaDecay.recommendation || "No recommendation yet."}</div>
            </div>
          ) : null}
        </div>
      )}
    </CommandCenterCard>
  );
}

function OrchestratorCard({
  orchestrator,
  loading,
  error,
  onRetry,
  onScan,
  isScanning,
  now,
}: {
  orchestrator: ReturnType<typeof useDashboardOrchestratorQuery>["data"];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onScan: () => void;
  isScanning: boolean;
  now: number;
}) {
  return (
    <CommandCenterCard accent="blue" data-testid="dashboard-orchestrator-card">
      <CommandCenterHeader
        eyebrow="Scanner Control"
        title="Orchestrator"
        subtitle="Tier 0 scanner routing high-conviction markets into the review lane."
        action={
          <Button size="sm" onClick={onScan} disabled={isScanning}>
            <Radar className="size-4" />
            {isScanning ? "Scanning…" : "Scan now"}
          </Button>
        }
      />

      {error ? (
        <PanelErrorState
          title="Orchestrator offline"
          detail="Scanner status and candidates could not be refreshed."
          onRetry={onRetry}
        />
      ) : loading || !orchestrator ? (
        <div className="space-y-3">
          <Skeleton width="100%" height={70} borderRadius={16} />
          <Skeleton width="100%" height={54} borderRadius={16} />
          <Skeleton width="100%" height={54} borderRadius={16} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="command-center-stat-strip">
            <div>
              <div className="command-center-stat-label">Last Scan</div>
              <div className="command-center-stat-value">{formatRelativeTime(orchestrator.status.lastScanAt, now)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">Markets Scanned</div>
              <div className="command-center-stat-value">{orchestrator.status.marketsScanned.toLocaleString()}</div>
            </div>
            <div>
              <div className="command-center-stat-label">Candidates</div>
              <div className="command-center-stat-value">{orchestrator.status.candidatesFound}</div>
            </div>
          </div>

          {orchestrator.candidates.length === 0 ? (
            <PanelEmptyState
              title="No fresh candidates"
              detail="Run a manual scan to repopulate the queue or wait for the next orchestrator cycle."
              action={
                <Button size="sm" variant="secondary" onClick={onScan} disabled={isScanning}>
                  <Sparkles className="size-4" />
                  Force scan
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {orchestrator.candidates.slice(0, 5).map((candidate) => (
                <Link
                  key={candidate.slug}
                  href={`/market/${candidate.slug}`}
                  className="command-center-list-row block no-underline"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <StatusBadge
                      tone={orchestratorScoreTone(candidate.opportunityScore)}
                      label={candidate.opportunityScore.toFixed(0)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{candidate.question}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.triggers.length > 0 ? (
                          candidate.triggers.slice(0, 2).map((trigger) => (
                            <span key={trigger} className="command-center-tag">
                              {trigger.replace(/_/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span className="command-center-tag">queued</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-[rgba(255,255,255,0.35)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </CommandCenterCard>
  );
}

function SystemStatusCard({
  health,
  healthLoading,
  healthError,
  onRetryHealth,
  agents,
  agentsLoading,
  agentsError,
  onRetryAgents,
  now,
}: {
  health: (ReturnType<typeof useDashboardHealthQuery>["data"] & { latencyMs: number }) | null;
  healthLoading: boolean;
  healthError: boolean;
  onRetryHealth: () => void;
  agents: DashboardAgentRow[];
  agentsLoading: boolean;
  agentsError: boolean;
  onRetryAgents: () => void;
  now: number;
}) {
  const services = health?.services ?? [];

  return (
    <CommandCenterCard accent="neutral" data-testid="dashboard-system-status-card">
      <CommandCenterHeader
        eyebrow="Operations"
        title="System Status"
        subtitle="Real backend heartbeat, service-map telemetry, and pipeline agent health."
      />

      {healthError ? (
        <PanelErrorState
          title="Health checks unavailable"
          detail="The dashboard could not read `/api/health`. Retry the runtime heartbeat."
          onRetry={onRetryHealth}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricBlock
              label="API Health"
              value={health ? health.label : healthLoading ? "Checking" : "Unknown"}
              hint={
                health
                  ? `${health.latencyMs}ms latency`
                  : "Awaiting service heartbeat"
              }
              tone={healthTone(health)}
            />
            <MetricBlock
              label="Service Map"
              value={health && isLiveHealth(health.services) ? `${health.services.length} checks` : "—"}
              hint={health?.message ?? "Waiting for detailed service telemetry"}
              tone={health && isLiveHealth(health.services) ? "good" : "neutral"}
            />
          </div>

          <div className="command-center-service-grid">
            {services.length > 0 ? (
              services.map((service) => (
                <div key={service.name} className="command-center-service-row">
                  <div className="command-center-service-main">
                    <span className={`command-center-status-dot command-center-status-dot--${service.status}`} />
                    <div className="command-center-service-copy">
                      <div className="command-center-service-name">{service.name}</div>
                      <div className="command-center-service-detail">
                        {service.detail ?? "No additional detail"}
                      </div>
                    </div>
                  </div>
                  <div className="command-center-service-badge">
                    <StatusBadge tone={serviceTone(service.status)} label={service.status} />
                  </div>
                </div>
              ))
            ) : (
              <PanelEmptyState
                title="Service map warming up"
                detail="Structured service telemetry will appear here as soon as the backend reports it."
              />
            )}
          </div>

          <div className="space-y-3">
            {agentsLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="command-center-list-row">
                  <Skeleton width="55%" height={14} borderRadius={5} />
                  <Skeleton width={74} height={14} borderRadius={5} />
                </div>
              ))
            ) : agentsError ? (
              <PanelErrorState
                title="Pipeline telemetry unavailable"
                detail="The dashboard could not read `/api/agents/health`. Retry the runtime lane."
                onRetry={onRetryAgents}
              />
            ) : agents.length === 0 ? (
              <PanelEmptyState
                title="No agent traffic yet"
                detail="Pipeline agents will appear here after the next live execution cycle."
              />
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="command-center-list-row">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`command-center-status-dot command-center-status-dot--${agent.status}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{agent.name}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.45)]">
                        {agent.lastActiveAt
                          ? `Last active ${formatRelativeTime(agent.lastActiveAt, now)}`
                          : "No recent runtime traffic"}
                      </div>
                      <div className="mt-1 truncate text-xs text-[rgba(255,255,255,0.38)]">{agent.detail}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs text-[rgba(255,255,255,0.58)]">{agent.latencyMs}ms</div>
                    <StatusBadge
                      tone={runtimeStatusTone(agent.status)}
                      label={agent.status}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </CommandCenterCard>
  );
}

function RecentSignalsCard({
  now,
}: {
  now: number;
}) {
  const signalsQuery = useDashboardSignalsQuery();

  return (
    <CommandCenterCard accent="neutral">
      <CommandCenterHeader
        eyebrow="Decision Feed"
        title="Recent Signals"
        subtitle="The latest trade/watch/skip decisions with confidence and edge."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="recent-signals">
        {signalsQuery.isError ? (
          <PanelErrorState
            title="Signal feed unavailable"
            detail="The dashboard could not refresh the latest decisions."
            onRetry={() => void signalsQuery.refetch()}
          />
        ) : signalsQuery.isLoading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="command-center-list-row" data-testid="signals-loading">
              <Skeleton width={52} height={20} borderRadius={999} />
              <Skeleton width="60%" height={14} borderRadius={5} />
              <Skeleton width={64} height={14} borderRadius={5} />
            </div>
          ))
        ) : !signalsQuery.data || signalsQuery.data.length === 0 ? (
          <PanelEmptyState
            title="No recent signals"
            detail="Once the pipeline makes decisions, they will stack here in order of recency."
          />
        ) : (
          signalsQuery.data.map((signal) => (
            <Link
              key={signal.id}
              href={signal.slug ? `/market/${signal.slug}` : "#"}
              className="command-center-list-row no-underline"
              data-testid="signal-row"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <StatusBadge tone={signalTone(signal.status)} label={signal.status} />
                <div className="min-w-0 flex-1 truncate text-sm text-[rgba(255,255,255,0.74)]">
                  {signal.question || signal.slug || "Unknown market"}
                </div>
                <div className="hidden font-mono text-xs text-[rgba(255,255,255,0.52)] md:block">
                  {Math.round((signal.confidence ?? 0) * 100)}%
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={signal.edge > 0 ? "text-[#34d399]" : "text-[rgba(255,255,255,0.45)]"}>
                  {signal.edge > 0 ? "+" : ""}
                  {(signal.edge * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.32)]">
                  {formatRelativeTime(signal.timestamp ?? 0, now)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </CommandCenterCard>
  );
}

function MarketScannerCard() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [activeCategory, setActiveCategory] = useState<ScannerCategory>("Trending 🔥");
  const [isPending, startTransition] = useTransition();
  const scannerQuery = useDashboardScannerQuery(activeCategory, debouncedSearch, 20);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: "240px" });
  const [livePrices, setLivePrices] = useState<Record<string, { yes: number; no: number }>>({});
  const displayedMarkets = useMemo(() => scannerQuery.markets, [scannerQuery.markets]);
  const subscribedMarkets = useMemo(() => displayedMarkets.slice(0, 12), [displayedMarkets]);
  const {
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isTrending,
    markets,
    refetch,
  } = scannerQuery;

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage || isTrending) {
      return;
    }

    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage, isTrending]);

  useEffect(() => {
    if (subscribedMarkets.length === 0) return;
    const tokenIds = subscribedMarkets.map((market) => market.tokenId).filter(Boolean);
    if (tokenIds.length === 0) return;

    const unsubscribe = streamPrices(tokenIds, (prices) => {
      setLivePrices((current) => ({ ...current, ...prices }));
    });

    return () => unsubscribe();
  }, [subscribedMarkets]);

  const showTrendingCta =
    isTrending &&
    !isLoading &&
    markets.length === 0;

  return (
    <CommandCenterCard accent="blue">
      <CommandCenterHeader
        eyebrow="Market Discovery"
        title="Live Market Scanner"
        subtitle="Trending stays explicit. Search and category browsing share one cancellable query path."
      />

      <div className="space-y-4">
        <label className="command-center-search">
          <Search className="size-4 text-[rgba(255,255,255,0.4)]" />
          <input
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => setSearch(nextValue));
            }}
            placeholder="Search active markets"
          />
          {(isFetching || isPending) && <RefreshCw className="size-4 animate-spin text-[rgba(255,255,255,0.35)]" />}
        </label>

        <div className="flex flex-wrap gap-2">
          {SCANNER_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? "command-center-pill command-center-pill--active" : "command-center-pill"}
              onClick={() => {
                startTransition(() => setActiveCategory(category));
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {isError ? (
          <PanelErrorState
            title="Scanner unavailable"
            detail="Market discovery failed to load. Retry the scanner feed."
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="scanner-loading">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="command-center-market-card">
                <Skeleton width="75%" height={18} borderRadius={6} />
                <Skeleton width="100%" height={30} borderRadius={8} />
                <Skeleton width="60%" height={12} borderRadius={4} />
              </div>
            ))}
          </div>
        ) : showTrendingCta ? (
          <PanelEmptyState
            title={debouncedSearch ? "No trending matches" : "No trending markets"}
            detail={
              debouncedSearch
                ? `Nothing in the trending feed matches "${debouncedSearch}".`
                : "The trending feed returned no markets right now."
            }
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  startTransition(() => setActiveCategory("All"));
                }}
              >
                Browse all markets
              </Button>
            }
          />
        ) : displayedMarkets.length === 0 ? (
          <PanelEmptyState
            title="No markets found"
            detail={debouncedSearch ? `No results matched "${debouncedSearch}".` : `No markets are available in ${activeCategory}.`}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {displayedMarkets.map((market) => {
              const livePrice = livePrices[market.tokenId];
              const yes = livePrice?.yes ?? market.yesPrice ?? 0;
              const yesPct = Math.round(yes * 100);
              const noPct = 100 - yesPct;

              return (
                <Link
                  key={market.slug}
                  href={`/market/${market.slug}`}
                  className="command-center-market-card no-underline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-3 text-sm font-medium text-white">{market.question}</div>
                    </div>
                    <StatusBadge tone="info" label={market.liquidityGrade} />
                  </div>

                  <div className="command-center-yesno">
                    <div className="command-center-yesno-yes" style={{ width: `${Math.max(28, yesPct)}%` }}>
                      YES {yesPct}¢
                    </div>
                    <div className="command-center-yesno-no" style={{ width: `${Math.max(28, noPct)}%` }}>
                      {noPct}¢ NO
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[rgba(255,255,255,0.46)]">
                    <span>Vol {fmtUSDC(market.volume)}</span>
                    <span>
                      {Number.isNaN(new Date(market.resolutionDate).getTime())
                        ? "TBD"
                        : new Date(market.resolutionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!isTrending && hasNextPage && (
          <div ref={ref} data-testid="load-more-sentinel" className="h-4" />
        )}
      </div>
    </CommandCenterCard>
  );
}

export function DashboardPageClient() {
  const now = useNow(5_000);
  const myAgent = useQuantikStore((state) => state.myAgent);
  const myAgentLoading = useQuantikStore((state) => state.myAgentLoading);
  const summaryQuery = useDashboardSummaryQuery();
  const riskStatusQuery = useDashboardRiskStatusQuery();
  const riskConfigQuery = useDashboardRiskConfigQuery();
  const orchestratorQuery = useDashboardOrchestratorQuery();
  const positionsQuery = useDashboardPositionsQuery();
  const healthQuery = useDashboardHealthQuery();
  const agentsQuery = useDashboardSystemAgentsQuery();
  const scanMutation = useTriggerOrchestratorScan();

  const lastUpdatedAt = Math.max(
    summaryQuery.dataUpdatedAt,
    riskStatusQuery.dataUpdatedAt,
    orchestratorQuery.dataUpdatedAt,
    healthQuery.dataUpdatedAt
  );

  return (
    <div className="command-center-shell">
      <MissionControlHero
        summary={summaryQuery.data ?? null}
        riskStatus={riskStatusQuery.data}
        health={healthQuery.data ?? null}
        orchestrator={orchestratorQuery.data}
        updatedAt={lastUpdatedAt}
        now={now}
      />

      <DashboardMissionRail
        summary={summaryQuery.data ?? null}
        health={healthQuery.data ?? null}
        agents={agentsQuery.data ?? []}
        updatedAt={lastUpdatedAt}
        now={now}
      />

      <div data-testid="dashboard-grid" className="command-center-grid">
        <div className="command-center-column">
          <SummaryCard
            summary={summaryQuery.data ?? null}
            loading={summaryQuery.isLoading}
            error={summaryQuery.isError}
            onRetry={() => void summaryQuery.refetch()}
          />
          <PositionsCard
            positions={positionsQuery.data ?? []}
            loading={positionsQuery.isLoading}
            error={positionsQuery.isError}
            onRetry={() => void positionsQuery.refetch()}
          />
          <RiskPostureCard
            riskStatus={riskStatusQuery.data}
            riskConfig={riskConfigQuery.data}
            loading={riskStatusQuery.isLoading || riskConfigQuery.isLoading}
            error={riskStatusQuery.isError || riskConfigQuery.isError}
            onRetry={() => {
              void riskStatusQuery.refetch();
              void riskConfigQuery.refetch();
            }}
          />
        </div>

        <div className="command-center-column">
          <OrchestratorCard
            orchestrator={orchestratorQuery.data}
            loading={orchestratorQuery.isLoading}
            error={orchestratorQuery.isError}
            onRetry={() => void orchestratorQuery.refetch()}
            onScan={() => void scanMutation.mutateAsync()}
            isScanning={scanMutation.isPending}
            now={now}
          />
          <PerformanceCard
            summary={summaryQuery.data ?? null}
            loading={summaryQuery.isLoading}
            error={summaryQuery.isError}
            onRetry={() => void summaryQuery.refetch()}
          />
          <DashboardArchitectureMiniMap
            agents={agentsQuery.data ?? []}
            myAgent={myAgent}
            loading={agentsQuery.isLoading || myAgentLoading}
          />
          <MarketScannerCard />
        </div>

        <div className="command-center-column command-center-rail">
          <DashboardPilotDeck
            agent={myAgent}
            agentLoading={myAgentLoading}
            summary={summaryQuery.data ?? null}
          />
          <SystemStatusCard
            health={healthQuery.data ?? null}
            healthLoading={healthQuery.isLoading}
            healthError={healthQuery.isError}
            onRetryHealth={() => void healthQuery.refetch()}
            agents={agentsQuery.data ?? []}
            agentsLoading={agentsQuery.isLoading}
            agentsError={agentsQuery.isError}
            onRetryAgents={() => void agentsQuery.refetch()}
            now={now}
          />
          <RecentSignalsCard now={now} />
        </div>
      </div>
    </div>
  );
}
