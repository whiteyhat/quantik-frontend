"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useInView } from "react-intersection-observer";
import { agentStatusTone, healthSeverityTone, serviceStatusTone, toWalletBalance } from "@/lib/dashboard";
import { EquityCurveChart } from "@/components/ManageAgent/EquityCurveChart";
import {
  ArrowRight,
  Copy,
  CopyCheck,
  ExternalLink,
  Radar,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { fmtPrice, fmtUSDC, fmtDate, fmtTimeShort, fmtNumber, streamPrices, type Position, type Signal } from "@/lib/api";
import {
  formatRelativeTime,
  type DashboardAgentRow,
  type DashboardHealthSnapshot,
  type DashboardSummarySnapshot,
} from "@/lib/dashboard";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
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
  useDashboardTradesQuery,
  useTriggerOrchestratorScan,
} from "@/components/dashboard/dashboardQueries";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useSignInGate } from "@/hooks/useSignInGate";
import {
  collapseList,
  isNearSettled,
  marketLabel,
  metricValueChars,
  yesNoGrow,
  yesNoSplit,
} from "@/components/dashboard/dashboardFit";
import { useStatusLabel } from "@/components/dashboard/useStatusLabel";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function numberTone(value: number, warnAt: number, badAt: number): "good" | "warn" | "bad" {
  if (value >= badAt) return "bad";
  if (value >= warnAt) return "warn";
  return "good";
}

function pnlTone(value: number): "good" | "bad" {
  return value >= 0 ? "good" : "bad";
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

function trimWalletAddress(wallet: string) {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function PolymarketGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 15V9h4.3a2.7 2.7 0 0 1 0 5.4H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.2 12.1 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MissionWalletBadge({ walletAddress }: { walletAddress: string }) {
  const t = useTranslations("dashboard.hero");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mission-wallet-card">
      <div className="mission-wallet-clip">
        <div className="mission-wallet-orb" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="mission-wallet-kicker">{t("walletKicker")}</div>
          <div className="mission-wallet-address-row">
            <div className="mission-wallet-address">
              {trimWalletAddress(walletAddress)}
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mission-wallet-action mission-wallet-action--copy"
              data-tooltip={copied ? t("walletCopied") : t("walletCopy")}
              aria-label={copied ? t("walletCopied") : t("walletCopy")}
            >
              {copied ? <CopyCheck className="size-4 text-[#34d399]" /> : <Copy className="size-4" />}
            </button>
          </div>
          <div className="mission-wallet-caption">{t("walletCaption")}</div>
        </div>

        <div className="mission-wallet-actions">
          <a
            href={`https://polygonscan.com/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mission-wallet-action"
            data-tooltip="Polygonscan"
            aria-label={t("walletOpenOn", { site: "Polygonscan" })}
          >
            <ExternalLink className="size-4 transition-transform duration-200 group-hover:rotate-6" />
          </a>
          <a
            href={`https://polymarket.com/profile/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mission-wallet-action"
            data-tooltip="Polymarket"
            aria-label={t("walletOpenOn", { site: "Polymarket" })}
          >
            <PolymarketGlyph />
          </a>
        </div>
      </div>
    </div>
  );
}

function MissionControlHero({
  summary,
  riskStatus,
  health,
  orchestrator,
  updatedAt,
  now,
  walletAddress,
}: {
  summary: DashboardSummarySnapshot | null;
  riskStatus: ReturnType<typeof useDashboardRiskStatusQuery>["data"];
  health: (ReturnType<typeof useDashboardHealthQuery>["data"] & { latencyMs: number }) | null;
  orchestrator: ReturnType<typeof useDashboardOrchestratorQuery>["data"];
  updatedAt: number;
  now: number;
  walletAddress: string | null | undefined;
}) {
  const t = useTranslations("dashboard.hero");
  const tRel = useTranslations("common");
  const statusLabel = useStatusLabel();

  const statusText = summary?.fundingStatus === "ready"
    ? t("capitalArmed")
    : summary?.fundingStatus === "funding_required"
      ? t("fundingNeeded")
      : t("telemetryOnly");

  return (
    <CommandCenterCard accent="blue" className="command-center-hero overflow-hidden" id="tour-mission-control">
      <div className="command-center-hero-grid">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={summary?.fundingStatus === "ready" ? "good" : "warn"}
              label={statusText}
            />
            <StatusBadge
              tone={healthSeverityTone(health)}
              label={health ? t(`apiHealth_${health.label}` as any) : t("apiChecking")}
            />
            <StatusBadge
              tone={orchestrator?.status.status === "scanning" ? "info" : "neutral"}
              label={orchestrator?.status.status === "scanning" ? t("scannerRunning") : t("scannerIdle")}
            />
          </div>

          <div className="space-y-3">
            <div className="command-center-eyebrow">{t("eyebrow")}</div>
            <h1 className="command-center-hero-title">{t("title")}</h1>
            <p className="command-center-hero-copy">
              {t("copy")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-[rgba(255,255,255,0.58)]">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-[#7dd3fc]" />
              <span>{summary?.liveBalanceAvailable ? t("liveBalanceSynced") : t("balanceFeedWarmingUp")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-[#facc15]" />
              <span>
                {t("circuit", { status: statusLabel(summary?.circuitBreakerStatus ?? riskStatus?.circuitBreaker ?? "ARMED") })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-[rgba(255,255,255,0.35)]" />
              <span>
                {t("updated", { time: updatedAt > 0 && now > 0 ? formatRelativeTime(updatedAt, now, tRel) : t("syncing") })}
              </span>
            </div>
          </div>
        </div>

        <div className="command-center-kpi-grid">
          <MetricBlock
            label={t("totalValue")}
            value={summary?.totalValue != null ? fmtUSDC(summary.totalValue) : "—"}
            hint={summary?.cashBalance != null ? t("cashLiquid", { amount: fmtUSDC(summary.cashBalance) }) : t("waitingForBalance")}
            tone="info"
          />
          <MetricBlock
            label={t("dailyPnl")}
            value={
              summary
                ? `${summary.pnlToday >= 0 ? "+" : ""}${fmtUSDC(summary.pnlToday)}`
                : "—"
            }
            hint={summary?.pnlTodayPct != null ? t("pnlToday", { pct: (summary.pnlTodayPct * 100).toFixed(1) }) : t("noDailyDelta")}
            tone={summary ? pnlTone(summary.pnlToday) : "neutral"}
          />
          {walletAddress ? (
            <MissionWalletBadge walletAddress={walletAddress} />
          ) : (
            <MetricBlock
              label={t("candidates")}
              value={orchestrator ? orchestrator.candidates.length : "—"}
              hint={
                orchestrator?.status.lastScanAt
                  ? t("scanned", { time: formatRelativeTime(orchestrator.status.lastScanAt, now, tRel) })
                  : t("noRecentScan")
              }
              tone={orchestrator && orchestrator.candidates.length > 0 ? "good" : "neutral"}
            />
          )}
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
  const t = useTranslations("dashboard.portfolio");
  const statusLabel = useStatusLabel();

  if (error) {
    return (
      <CommandCenterCard accent="blue">
        <PanelErrorState
          title={t("errorTitle")}
          detail={t("errorDetail")}
          onRetry={onRetry}
        />
      </CommandCenterCard>
    );
  }

  return (
    <CommandCenterCard accent="blue" data-testid="dashboard-portfolio-card">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {loading || !summary ? (
        <div className="space-y-4">
          <Skeleton width="60%" height={34} borderRadius={10} />
          <div className="command-center-metric-grid">
            <Skeleton width="100%" height={72} borderRadius={16} />
            <Skeleton width="100%" height={72} borderRadius={16} />
          </div>
          <Skeleton width="100%" height={10} borderRadius={99} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="command-center-metric-label">{t("netLiquidationValue")}</div>
            <div
              className="command-center-figure"
              style={{ "--metric-chars": metricValueChars(summary.totalValue != null ? fmtUSDC(summary.totalValue) : "—") } as CSSProperties}
            >
              {summary.totalValue != null ? fmtUSDC(summary.totalValue) : "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                tone={summary.pnlToday >= 0 ? "good" : "bad"}
                label={t("todayPnl", { pnl: `${summary.pnlToday >= 0 ? "+" : ""}${fmtUSDC(summary.pnlToday)}` })}
              />
              <StatusBadge
                tone={summary.circuitBreakerStatus === "ARMED" ? "good" : summary.circuitBreakerStatus === "WARNING" ? "warn" : "bad"}
                label={t("circuit", { status: statusLabel(summary.circuitBreakerStatus) })}
              />
            </div>
          </div>

          <div className="command-center-metric-grid">
            <MetricBlock
              label={t("availableCash")}
              value={summary.cashBalance != null ? fmtUSDC(summary.cashBalance) : "—"}
              hint={summary.balanceMessage ?? t("readyForNextDeployment")}
              tone="neutral"
            />
            <MetricBlock
              label={t("capitalInPlay")}
              value={summary.positionsValue != null ? fmtUSDC(summary.positionsValue) : "—"}
              hint={t("kellyUtilizationPct", { pct: Math.round(summary.kellyUtilization * 100) })}
              tone={numberTone(summary.kellyUtilization * 100, 60, 85)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[rgba(255,255,255,0.45)]">
              <span>{t("kellyUtilization")}</span>
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
  const t = useTranslations("dashboard.positions");

  return (
    <CommandCenterCard accent="neutral">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {error ? (
        <PanelErrorState
          title={t("errorTitle")}
          detail={t("errorDetail")}
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
          title={t("emptyTitle")}
          detail={t("emptyDetail")}
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
                    <div className="truncate text-sm font-medium text-white" title={position.market}>{position.market}</div>
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

function RiskArcGauge({
  value,
  maxValue,
  label,
  hint,
  tone,
}: {
  value: number;
  maxValue: number;
  label: string;
  hint: string;
  tone: "good" | "warn" | "bad";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const R = 32;
  const arcLen = Math.PI * R;
  const pct = Math.min(Math.abs(value) / maxValue, 1);
  const dashOffset = mounted ? arcLen * (1 - pct) : arcLen;

  const angle = -Math.PI + pct * Math.PI;
  const dotX = 40 + R * Math.cos(angle);
  const dotY = 44 + R * Math.sin(angle);

  const color =
    tone === "good" ? "#7ef0b1" :
    tone === "warn" ? "#ffd07a" :
    "#ffb4ac";

  return (
    <div className="risk-arc">
      <div className="risk-arc-ring">
        <svg viewBox="0 0 80 48" fill="none" aria-hidden="true">
          <path
            d="M 8 44 A 32 32 0 0 1 72 44"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 8 44 A 32 32 0 0 1 72 44"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
          {pct > 0.01 && (
            <circle
              cx={dotX}
              cy={dotY}
              r="3.5"
              fill={color}
              className="risk-arc-dot"
              style={{
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s 1.1s ease-out",
                filter: `drop-shadow(0 0 5px ${color}90)`,
              }}
            />
          )}
        </svg>
        <div className="risk-arc-val" style={{ color }}>
          {Math.abs(value).toFixed(1)}%
        </div>
      </div>
      <div className="risk-arc-label">{label}</div>
      <div className="risk-arc-hint">{hint}</div>
    </div>
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
  const t = useTranslations("dashboard.riskPosture");
  const statusLabel = useStatusLabel();

  if (error) {
    return (
      <div className="risk-posture-zone">
        <CommandCenterCard accent="orange" className="risk-posture-sticky">
          <PanelErrorState
            title={t("errorTitle")}
            detail={t("errorDetail")}
            onRetry={onRetry}
          />
        </CommandCenterCard>
      </div>
    );
  }

  return (
    <div className="risk-posture-zone">
      <CommandCenterCard accent="orange" className="risk-posture-sticky">
        <CommandCenterHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {loading || !riskStatus || !riskConfig ? (
          <div className="grid gap-3">
            <Skeleton width="100%" height={120} borderRadius={16} />
            <Skeleton width="100%" height={54} borderRadius={16} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <RiskArcGauge
                value={riskStatus.exposurePct}
                maxValue={100}
                label={t("exposure")}
                hint={t("available", { amount: fmtUSDC(riskStatus.availableCapital) })}
                tone={numberTone(riskStatus.exposurePct, 45, 75)}
              />
              <RiskArcGauge
                value={Math.abs(riskStatus.dailyPnlPct)}
                maxValue={Math.round(riskConfig.drawdownLimit * 100)}
                label={t("drawdown")}
                hint={t("drawdownLimit", { pct: Math.round(riskConfig.drawdownLimit * 100) })}
                tone={numberTone(Math.abs(riskStatus.dailyPnlPct), riskConfig.drawdownLimit * 50, riskConfig.drawdownLimit * 100)}
              />
            </div>

            <div className="command-center-stat-strip risk-posture-stats">
              <div>
                <div className="command-center-stat-label">{t("circuit")}</div>
                <div className="command-center-stat-value">{statusLabel(riskStatus.circuitBreaker)}</div>
              </div>
              <div>
                <div className="command-center-stat-label">{t("maxPosition")}</div>
                <div className="command-center-stat-value">{Math.round(riskConfig.maxPositionSize * 100)}%</div>
              </div>
              <div>
                <div className="command-center-stat-label">{t("kelly")}</div>
                <div className="command-center-stat-value">{riskConfig.kellyMultiplier}×</div>
              </div>
            </div>
          </div>
        )}
      </CommandCenterCard>
    </div>
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
  const t = useTranslations("dashboard.performance");
  const tradesQuery = useDashboardTradesQuery();
  // The summary names the best trade by slug; show its market question instead
  const bestSlug = summary?.metrics.bestTrade ?? null;
  const bestTradeLabel = bestSlug
    ? marketLabel((tradesQuery.data ?? []).find((trade) => trade.slug === bestSlug)?.market, bestSlug)
    : null;

  return (
    <CommandCenterCard accent="green">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {error ? (
        <PanelErrorState
          title={t("errorTitle")}
          detail={t("errorDetail")}
          onRetry={onRetry}
        />
      ) : loading || !summary ? (
        <div className="space-y-3">
          <Skeleton width="45%" height={28} borderRadius={10} />
          <div className="command-center-metric-grid">
            <Skeleton width="100%" height={80} borderRadius={16} />
            <Skeleton width="100%" height={80} borderRadius={16} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="command-center-metric-grid">
            <MetricBlock
              label={t("winRate")}
              value={`${(summary.winRate * 100).toFixed(1)}%`}
              hint={t("totalTrades", { count: summary.totalTrades })}
              tone={numberTone(summary.winRate * 100, 45, 60)}
            />
            <MetricBlock
              label={t("currentStreak")}
              value={summary.metrics.currentStreak > 0 ? `+${summary.metrics.currentStreak}` : summary.metrics.currentStreak}
              hint={bestTradeLabel ? t("bestTrade", { trade: bestTradeLabel }) : t("noStandoutTrade")}
              tone={summary.metrics.currentStreak >= 0 ? "good" : "bad"}
            />
          </div>

          <div className="command-center-stat-strip">
            <div>
              <div className="command-center-stat-label">{t("bestPnl")}</div>
              <div className="command-center-stat-value">{fmtUSDC(summary.metrics.bestPnl)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">{t("totalVolume")}</div>
              <div className="command-center-stat-value">{fmtUSDC(summary.metrics.totalVolume)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">{t("alphaDecay")}</div>
              <div className="command-center-stat-value">
                {summary.alphaDecay?.detected ? t("detected") : t("clear")}
              </div>
            </div>
          </div>

          {summary.alphaDecay ? (
            <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[rgba(255,255,255,0.68)]">
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-[rgba(255,255,255,0.38)]">{t("alphaDecayRecommendation")}</div>
              <div>{t(`recommendation_${summary.alphaDecay.recommendation || "none"}` as any)}</div>
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
  const t = useTranslations("dashboard.orchestrator");
  const tRel = useTranslations("common");
  const locale = useLocale();
  const statusLabel = useStatusLabel();

  return (
    <CommandCenterCard accent="blue" data-testid="dashboard-orchestrator-card" id="tour-orchestrator">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button size="sm" onClick={onScan} disabled={isScanning}>
            <Radar className="size-4" />
            {isScanning ? t("scanning") : t("scanNow")}
          </Button>
        }
      />

      {error ? (
        <PanelErrorState
          title={t("errorTitle")}
          detail={t("errorDetail")}
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
              <div className="command-center-stat-label">{t("lastScan")}</div>
              <div className="command-center-stat-value">{formatRelativeTime(orchestrator.status.lastScanAt, now, tRel)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">{t("marketsScanned")}</div>
              <div className="command-center-stat-value">{fmtNumber(orchestrator.status.marketsScanned, locale)}</div>
            </div>
            <div>
              <div className="command-center-stat-label">{t("candidates")}</div>
              <div className="command-center-stat-value">{orchestrator.status.candidatesFound}</div>
            </div>
          </div>

          {orchestrator.candidates.length === 0 ? (
            <PanelEmptyState
              title={t("emptyTitle")}
              detail={t("emptyDetail")}
              action={
                <Button size="sm" variant="secondary" onClick={onScan} disabled={isScanning}>
                  <Sparkles className="size-4" />
                  {t("forceScan")}
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
                      <div className="truncate text-sm font-medium text-white" title={candidate.question}>{candidate.question}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.triggers.length > 0 ? (
                          candidate.triggers.slice(0, 2).map((trigger) => (
                            <span key={trigger} className="command-center-tag">
                              {statusLabel(trigger)}
                            </span>
                          ))
                        ) : (
                          <span className="command-center-tag">{t("queued")}</span>
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
  const t = useTranslations("dashboard.systemStatus");
  const tRel = useTranslations("common");
  const locale = useLocale();
  const statusLabel = useStatusLabel();
  const services = health?.services ?? [];
  // Server-written health text is English: other languages get a translated line per status
  const serviceDetail = (service: (typeof services)[number]) =>
    locale === "en" ? service.detail ?? t("noAdditionalDetail") : t(`serviceDetail_${service.status}`);

  return (
    <CommandCenterCard accent="neutral" data-testid="dashboard-system-status-card">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {healthError ? (
        <PanelErrorState
          title={t("errorTitle")}
          detail={t("errorDetail")}
          onRetry={onRetryHealth}
        />
      ) : (
        <div className="space-y-4">
          <div className="command-center-metric-grid">
            <MetricBlock
              label={t("apiHealth")}
              value={health ? t(`healthLabel_${health.label}` as any) : healthLoading ? t("checking") : t("unknown")}
              hint={
                health
                  ? t("latency", { ms: health.latencyMs })
                  : t("awaitingServiceHeartbeat")
              }
              tone={healthSeverityTone(health)}
            />
            <MetricBlock
              label={t("serviceMap")}
              value={health && isLiveHealth(health.services) ? <span className="inline-flex items-center gap-1.5"><Tooltip text={t("serviceChecks", { count: health.services.length })}><ShieldCheck className="size-[0.7em]" /></Tooltip>{health.services.length}</span> : "—"}
              hint={health ? t(`healthMessage_${health.severity}`) : t("waitingForServiceTelemetry")}
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
                      <div className="command-center-service-detail" title={service.detail ?? undefined}>
                        {serviceDetail(service)}
                      </div>
                    </div>
                  </div>
                  <div className="command-center-service-badge">
                    <StatusBadge tone={serviceStatusTone(service.status)} label={statusLabel(service.status)} />
                  </div>
                </div>
              ))
            ) : (
              <PanelEmptyState
                title={t("serviceMapWarmingUp")}
                detail={t("serviceMapDetail")}
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
                title={t("pipelineTelemetryUnavailable")}
                detail={t("pipelineTelemetryDetail")}
                onRetry={onRetryAgents}
              />
            ) : agents.length === 0 ? (
              <PanelEmptyState
                title={t("noAgentTrafficTitle")}
                detail={t("noAgentTrafficDetail")}
              />
            ) : (
              agents.map((agent) => {
                const detail = t(`agentDetail_${agent.detailKey}` as any, agent.detailParams as any);
                return (
                  <div key={agent.id} className="command-center-list-row">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className={`command-center-status-dot command-center-status-dot--${agent.status}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white" title={agent.name}>{agent.name}</div>
                        <div className="text-xs text-[rgba(255,255,255,0.45)]">
                          {agent.lastActiveAt
                            ? t("lastActive", { time: formatRelativeTime(agent.lastActiveAt, now, tRel) })
                            : t("noRecentTraffic")}
                        </div>
                        <div className="mt-1 truncate text-xs text-[rgba(255,255,255,0.38)]" title={detail}>{detail}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-[rgba(255,255,255,0.58)]">{agent.latencyMs}ms</div>
                      <StatusBadge
                        tone={agent.status === "idle" ? "neutral" : agentStatusTone(agent.status) as "good" | "warn" | "bad" | "neutral"}
                        label={statusLabel(agent.status)}
                      />
                    </div>
                  </div>
                );
              })
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
  const t = useTranslations("dashboard.recentSignals");
  const tRel = useTranslations("common");
  const statusLabel = useStatusLabel();
  const signalsQuery = useDashboardSignalsQuery();

  return (
    <CommandCenterCard accent="neutral">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="recent-signals">
        {signalsQuery.isError ? (
          <PanelErrorState
            title={t("errorTitle")}
            detail={t("errorDetail")}
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
            title={t("emptyTitle")}
            detail={t("emptyDetail")}
          />
        ) : (
          signalsQuery.data.map((signal) => {
            const question = signal.question || marketLabel(null, signal.slug) || t("unknownMarket");
            return (
              <Link
                key={signal.id}
                href={signal.slug ? `/market/${signal.slug}` : "#"}
                className="command-center-list-row no-underline"
                data-testid="signal-row"
              >
                {/* Stacked: badge + edge, then the market on its own line, then confidence + time,
                    so the question stays readable in the narrow right rail */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge tone={signalTone(signal.status)} label={statusLabel(signal.status)} />
                    <span className={signal.edge > 0 ? "font-mono text-sm text-[#34d399]" : "font-mono text-sm text-[rgba(255,255,255,0.45)]"}>
                      {signal.edge > 0 ? "+" : ""}
                      {(signal.edge * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="line-clamp-2 text-sm text-[rgba(255,255,255,0.78)]" title={question}>
                    {question}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-[rgba(255,255,255,0.4)]">
                    <span className="font-mono">{t("confidence", { pct: Math.round(signal.confidence ?? 0) })}</span>
                    <span>{formatRelativeTime(signal.timestamp ?? 0, now, tRel)}</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </CommandCenterCard>
  );
}

const SCANNER_CATEGORY_KEYS = {
  "Trending 🔥": "catTrending",
  All: "catAll",
  Crypto: "catCrypto",
  Politics: "catPolitics",
  Sports: "catSports",
  "Pop Culture": "catPopCulture",
  Science: "catScience",
  "World Events": "catWorldEvents",
  Business: "catBusiness",
} as const satisfies Record<ScannerCategory, string>;

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

function MarketScannerCard() {
  const t = useTranslations("dashboard.marketScanner");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [activeCategory, setActiveCategory] = useState<ScannerCategory>("Trending 🔥");
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scannerQuery = useDashboardScannerQuery(activeCategory, debouncedSearch, 20);
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: "240px" });
  const [livePrices, setLivePrices] = useState<Record<string, { yes: number; no: number }>>({});
  const { markets: displayedMarkets } = scannerQuery;
  // Markets at 2¢/98¢ or beyond are effectively settled: they read as broken in a live scanner.
  // Judged on the listed price (not the live stream) so the list does not reshuffle while open.
  const openMarkets = useMemo(
    () => displayedMarkets.filter((market) => !isNearSettled(yesNoSplit(undefined, market.yesPrice))),
    [displayedMarkets],
  );
  const { visible: visibleMarkets, hiddenCount } = collapseList(openMarkets, expanded);
  const subscribedMarkets = useMemo(() => openMarkets.slice(0, 12), [openMarkets]);
  const {
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isTrending,
    refetch,
  } = scannerQuery;

  useEffect(() => {
    if (!expanded || !inView || !hasNextPage || isFetchingNextPage || isTrending) {
      return;
    }

    void fetchNextPage();
  }, [expanded, fetchNextPage, hasNextPage, inView, isFetchingNextPage, isTrending]);

  useEffect(() => {
    if (subscribedMarkets.length === 0) return;
    const tokenIds = subscribedMarkets.map((market) => market.tokenId).filter(Boolean);
    if (tokenIds.length === 0) return;

    const unsubscribe = streamPrices(tokenIds, (prices) => {
      setLivePrices((current) => {
        let changed = false;
        for (const key of Object.keys(prices)) {
          const prev = current[key];
          const next = prices[key];
          if (!prev || prev.yes !== next.yes || prev.no !== next.no) {
            changed = true;
            break;
          }
        }
        return changed ? { ...current, ...prices } : current;
      });
    });

    return () => unsubscribe();
  }, [subscribedMarkets]);

  const showTrendingCta =
    isTrending &&
    !isLoading &&
    openMarkets.length === 0;

  const renderMarket = (market: (typeof openMarkets)[number]) => {
    const split = yesNoSplit(livePrices[market.tokenId]?.yes, market.yesPrice);
    const grow = yesNoGrow(split);

    return (
      <Link
        href={`/market/${market.slug}`}
        className="command-center-market-card h-full no-underline"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="line-clamp-3 text-sm font-medium text-white" title={market.question}>{market.question}</div>
          </div>
          <StatusBadge tone="info" label={market.liquidityGrade} />
        </div>

        <div className="command-center-yesno">
          <div className="command-center-yesno-yes" style={{ flexGrow: grow.yes }}>
            YES {split ? `${split.yes}¢` : "—"}
          </div>
          <div className="command-center-yesno-no" style={{ flexGrow: grow.no }}>
            {split ? `${split.no}¢` : "—"} NO
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[rgba(255,255,255,0.46)]">
          <span>{t("vol", { amount: fmtUSDC(market.volume) })}</span>
          <span>
            {Number.isNaN(new Date(market.resolutionDate).getTime())
              ? t("tbd")
              : fmtDate(new Date(market.resolutionDate).getTime(), locale)}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <CommandCenterCard accent="blue">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="space-y-4">
        <label className="command-center-search">
          <Search className="size-4 text-[rgba(255,255,255,0.4)]" />
          <input
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value;
              setExpanded(false);
              startTransition(() => setSearch(nextValue));
            }}
            placeholder={t("searchPlaceholder")}
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
                setExpanded(false);
                startTransition(() => setActiveCategory(category));
              }}
            >
              {t(SCANNER_CATEGORY_KEYS[category])}
            </button>
          ))}
        </div>

        {isError ? (
          <PanelErrorState
            title={t("errorTitle")}
            detail={t("errorDetail")}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="command-center-market-grid" data-testid="scanner-loading">
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
            title={debouncedSearch ? t("noTrendingMatchesTitle") : t("noTrendingMarketsTitle")}
            detail={
              debouncedSearch
                ? t("noTrendingMatchesDetail", { search: debouncedSearch })
                : t("noTrendingMarketsDetail")
            }
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  startTransition(() => setActiveCategory("All"));
                }}
              >
                {t("browseAllMarkets")}
              </Button>
            }
          />
        ) : openMarkets.length === 0 ? (
          <PanelEmptyState
            title={t("noMarketsFound")}
            detail={debouncedSearch
              ? t("noResultsMatched", { search: debouncedSearch })
              : t("noMarketsInCategory", { category: t(SCANNER_CATEGORY_KEYS[activeCategory]) })}
          />
        ) : (
          <div className="command-center-market-grid" data-testid="scanner-markets">
            <AnimatePresence initial={false}>
              {visibleMarkets.map((market, index) =>
                index < 6 ? (
                  <div key={market.slug} className="min-w-0">{renderMarket(market)}</div>
                ) : (
                  // Revealed by "Show more": rise in with a short cascade (instant with reduced motion)
                  <motion.div
                    key={market.slug}
                    className="min-w-0"
                    initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
                    transition={{ duration: 0.42, ease: SPRING_EASE, delay: reduceMotion ? 0 : Math.min(index - 6, 8) * 0.03 }}
                  >
                    {renderMarket(market)}
                  </motion.div>
                ),
              )}
            </AnimatePresence>
          </div>
        )}

        {!isError && !isLoading && (hiddenCount > 0 || expanded) ? (
          <div className="flex justify-center">
            <motion.button
              type="button"
              className="command-center-pill command-center-more"
              aria-expanded={expanded}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.34, 1.2, 0.64, 1] }}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? t("showFewer") : t("showMore", { count: hiddenCount })}
            </motion.button>
          </div>
        ) : null}

        {expanded && !isTrending && hasNextPage && (
          <div ref={ref} data-testid="load-more-sentinel" className="h-4" />
        )}
      </div>
    </CommandCenterCard>
  );
}

const TIME_PERIODS = ["7D", "30D", "All"] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

function EquityChartCard() {
  const t = useTranslations("dashboard.equity");
  const tc = useTranslations("common");
  const [period, setPeriod] = useState<TimePeriod>("7D");
  const wallet = useQuantikStore((state) => state.wallet);
  const tradesQuery = useDashboardTradesQuery();

  return (
    <CommandCenterCard accent="green">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex gap-1">
            {TIME_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={period === p ? "command-center-pill command-center-pill--active" : "command-center-pill"}
                style={{ fontSize: 11 }}
              >
                {tc(`period${p}`)}
              </button>
            ))}
          </div>
        }
      />
      {tradesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton width="40%" height={28} borderRadius={8} />
          <Skeleton width="100%" height={240} borderRadius={12} />
        </div>
      ) : (
        <EquityCurveChart
          wallet={wallet}
          trades={tradesQuery.data ?? []}
          timePeriod={period}
        />
      )}
    </CommandCenterCard>
  );
}

function RecentTradesCard() {
  const t = useTranslations("dashboard.recentTrades");
  const locale = useLocale();
  const statusLabel = useStatusLabel();
  const tradesQuery = useDashboardTradesQuery();

  const recentTrades = useMemo(() => {
    const trades = tradesQuery.data ?? [];
    return [...trades].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [tradesQuery.data]);

  return (
    <CommandCenterCard accent="neutral">
      <CommandCenterHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/reports"
            className="text-xs font-medium text-[rgba(255,255,255,0.45)] hover:text-white transition-colors no-underline"
          >
            {t("viewAll")} →
          </Link>
        }
      />

      {tradesQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="command-center-list-row">
              <Skeleton width="55%" height={14} borderRadius={5} />
              <Skeleton width={84} height={14} borderRadius={5} />
            </div>
          ))}
        </div>
      ) : recentTrades.length === 0 ? (
        <PanelEmptyState
          title={t("emptyTitle")}
          detail={t("emptyDetail")}
        />
      ) : (
        <div className="space-y-3">
          {recentTrades.map((trade) => {
            const pnl = trade.pnl ?? 0;
            const dateStr = fmtDate(trade.timestamp, locale);
            const timeStr = fmtTimeShort(trade.timestamp, locale);

            return (
              <Link
                key={trade.id}
                href={trade.slug ? `/market/${trade.slug}` : "#"}
                className="command-center-list-row block no-underline"
              >
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white" title={trade.market}>{trade.market}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[rgba(255,255,255,0.45)]">
                      <StatusBadge tone={trade.direction === "YES" ? "good" : "bad"} label={trade.direction} />
                      <span title={statusLabel(trade.source ?? "manual")}>
                        {trade.source === "autopilot" ? "\u{1F916}" : "\u{1F9D1}"}
                      </span>
                      <span className="font-mono">{dateStr} {timeStr}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-sm font-semibold">
                    <div className={pnl >= 0 ? "text-[#30d158]" : "text-[#ff453a]"}>
                      {pnl >= 0 ? "+" : ""}{fmtUSDC(pnl)}
                    </div>
                    <div className="mt-1 text-xs text-[rgba(255,255,255,0.35)]">{fmtUSDC(trade.size)}</div>
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

export function DashboardPageClient() {
  const now = useNow(5_000);
  const myAgent = useQuantikStore((state) => state.myAgent);
  const myAgentLoading = useQuantikStore((state) => state.myAgentLoading);
  const setWallet = useQuantikStore((state) => state.setWallet);
  const summaryQuery = useDashboardSummaryQuery();

  // Sync summary → global wallet store so ManageAgent and other pages stay fresh
  useEffect(() => {
    if (summaryQuery.data) setWallet(toWalletBalance(summaryQuery.data));
  }, [summaryQuery.data, setWallet]);
  const riskStatusQuery = useDashboardRiskStatusQuery();
  const riskConfigQuery = useDashboardRiskConfigQuery();
  const orchestratorQuery = useDashboardOrchestratorQuery();
  const positionsQuery = useDashboardPositionsQuery();
  const healthQuery = useDashboardHealthQuery();
  const agentsQuery = useDashboardSystemAgentsQuery();
  const scanMutation = useTriggerOrchestratorScan();
  const gate = useSignInGate();

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
        walletAddress={myAgent?.wallet_address}
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
          <RecentTradesCard />
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
          <EquityChartCard />
          <OrchestratorCard
            orchestrator={orchestratorQuery.data}
            loading={orchestratorQuery.isLoading}
            error={orchestratorQuery.isError}
            onRetry={() => void orchestratorQuery.refetch()}
            onScan={() => gate(() => void scanMutation.mutateAsync())}
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
