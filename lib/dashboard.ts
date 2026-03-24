import type {
  PerformanceSummary,
  SystemAgentHealthEntry,
  WalletBalance,
} from "@/lib/api";

type CircuitBreakerState = "ARMED" | "WARNING" | "TRIGGERED";
export type DashboardRuntimeStatus = "live" | "idle" | "degraded" | "down";
export type DashboardServiceStatus = "healthy" | "degraded" | "down";

export interface DashboardSummarySnapshot {
  totalValue: number | null;
  cashBalance: number | null;
  pol: number;
  xlm: number;
  positionsValue: number | null;
  pnlToday: number;
  pnlTodayPct: number | null;
  totalPnl: number;
  totalPnlPct: number | null;
  winRate: number;
  totalTrades: number;
  kellyUtilization: number;
  circuitBreakerStatus: CircuitBreakerState;
  drawdown: number | null;
  drawdownLimit: number | null;
  balanceStatus: WalletBalance["balanceStatus"];
  balanceMessage: string | null;
  liveBalanceAvailable: boolean;
  fundingStatus: WalletBalance["fundingStatus"];
  fundingMessage: string | null;
  trustlineEstablished: boolean;
  stellarReady: boolean;
  stellarStatus: string | null;
  walletNetwork: string | null;
  metrics: PerformanceSummary["metrics"];
  alphaDecay: PerformanceSummary["alphaDecay"];
}

export interface DashboardHealthService {
  name: string;
  status: DashboardServiceStatus;
  detail: string | null;
  checkedAt: number | null;
  meta: Record<string, unknown> | null;
}

export interface DashboardHealthSnapshot {
  status: string;
  label: string;
  severity: "good" | "warn" | "bad";
  message: string | null;
  checkedAt: number | null;
  services: DashboardHealthService[];
}

export interface DashboardAgentRow {
  id: string;
  name: string;
  status: DashboardRuntimeStatus;
  latencyMs: number;
  errorRate: number;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  lastActiveAt: number | null;
}

function coerceNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function coerceNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function coerceString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeServiceStatus(value: unknown): DashboardServiceStatus {
  const status = String(value ?? "unknown").toLowerCase();

  if (status === "ok" || status === "healthy" || status === "live") return "healthy";
  if (status === "warning" || status === "warn" || status === "degraded") return "degraded";
  return "down";
}

function normalizeCircuitBreakerState(value: unknown): CircuitBreakerState {
  if (typeof value === "string") {
    if (value === "WARNING" || value === "TRIGGERED") return value;
    return "ARMED";
  }

  if (value && typeof value === "object" && "state" in value) {
    return normalizeCircuitBreakerState((value as { state?: unknown }).state);
  }

  return "ARMED";
}

export function normalizeDashboardSummary(raw: Record<string, unknown> | null | undefined): DashboardSummarySnapshot {
  const metricsSource = raw?.metrics && typeof raw.metrics === "object"
    ? (raw.metrics as Record<string, unknown>)
    : {};

  const totalValue = coerceNullableNumber(raw?.totalValue ?? raw?.portfolioValue ?? raw?.equity);
  const cashBalance = coerceNullableNumber(
    raw?.cashBalance ??
    raw?.onChainUsdc ??
    raw?.usdc ??
    raw?.availableCapital
  );

  const positionsValue = coerceNullableNumber(
    raw?.positionsValue ??
    (totalValue !== null && cashBalance !== null ? totalValue - cashBalance : null)
  );

  return {
    totalValue,
    cashBalance,
    pol: coerceNumber(raw?.pol),
    xlm: coerceNumber(raw?.xlm ?? raw?.pol),
    positionsValue,
    pnlToday: coerceNumber(raw?.pnlToday ?? raw?.dailyPnl),
    pnlTodayPct: coerceNullableNumber(raw?.pnlTodayPct ?? raw?.dailyPnlPct),
    totalPnl: coerceNumber(raw?.pnl ?? raw?.totalPnl),
    totalPnlPct: coerceNullableNumber(raw?.pnlPct ?? raw?.totalPnlPct),
    winRate: coerceNumber(raw?.winRate),
    totalTrades: coerceNumber(raw?.totalTrades ?? raw?.tradesToday),
    kellyUtilization: coerceNumber(raw?.kellyUtilization),
    circuitBreakerStatus: normalizeCircuitBreakerState(raw?.circuitBreakerStatus ?? raw?.circuitBreaker),
    drawdown: coerceNullableNumber(raw?.drawdown ?? raw?.dailyPnlPct),
    drawdownLimit: coerceNullableNumber(raw?.drawdownLimit),
    balanceStatus: (coerceString(raw?.balanceStatus ?? raw?.balance_status) as WalletBalance["balanceStatus"]) ?? "unavailable",
    balanceMessage: coerceString(raw?.balanceMessage ?? raw?.balance_message),
    liveBalanceAvailable: Boolean(raw?.liveBalanceAvailable ?? raw?.live_balance_available),
    fundingStatus: (coerceString(raw?.fundingStatus ?? raw?.funding_status) as WalletBalance["fundingStatus"]) ?? "unavailable",
    fundingMessage: coerceString(raw?.fundingMessage ?? raw?.funding_message),
    trustlineEstablished: Boolean(raw?.trustlineEstablished),
    stellarReady: Boolean(raw?.stellarReady),
    stellarStatus: coerceString(raw?.stellarStatus),
    walletNetwork: coerceString(raw?.walletNetwork),
    metrics: {
      currentStreak: coerceNumber(metricsSource.currentStreak),
      bestTrade: String(metricsSource.bestTrade ?? ""),
      bestPnl: coerceNumber(metricsSource.bestPnl),
      totalVolume: coerceNumber(metricsSource.totalVolume),
    },
    alphaDecay:
      raw?.alphaDecay && typeof raw.alphaDecay === "object"
        ? {
            detected: Boolean((raw.alphaDecay as Record<string, unknown>).detected),
            rollingHitRate: coerceNumber((raw.alphaDecay as Record<string, unknown>).rollingHitRate),
            recommendation: String((raw.alphaDecay as Record<string, unknown>).recommendation ?? ""),
          }
        : null,
  };
}

export function toWalletBalance(summary: DashboardSummarySnapshot): WalletBalance {
  return {
    address: "",
    usdc: summary.cashBalance,
    onChainUsdc: summary.cashBalance,
    pol: summary.pol,
    xlm: summary.xlm,
    pnl: summary.totalPnl,
    pnlPct: summary.totalPnlPct,
    winRate: summary.winRate,
    totalTrades: summary.totalTrades,
    pnlToday: summary.pnlToday,
    pnlTodayPct: summary.pnlTodayPct,
    totalValue: summary.totalValue,
    circuitBreakerStatus: summary.circuitBreakerStatus,
    kellyUtilization: summary.kellyUtilization,
    drawdown: summary.drawdown ?? undefined,
    drawdownLimit: summary.drawdownLimit ?? undefined,
    balanceStatus: summary.balanceStatus,
    balanceMessage: summary.balanceMessage,
    liveBalanceAvailable: summary.liveBalanceAvailable,
    fundingStatus: summary.fundingStatus,
    fundingMessage: summary.fundingMessage,
    trustlineEstablished: summary.trustlineEstablished,
    stellarReady: summary.stellarReady,
    stellarStatus: summary.stellarStatus,
    walletNetwork: summary.walletNetwork,
    network: summary.walletNetwork,
  };
}

export function toPerformanceSummary(summary: DashboardSummarySnapshot): PerformanceSummary {
  return {
    winRate: summary.winRate,
    pnlToday: summary.pnlToday,
    metrics: summary.metrics,
    alphaDecay: summary.alphaDecay,
  };
}

export function normalizeDashboardHealth(raw: {
  status?: unknown;
  message?: unknown;
  detail?: unknown;
  checkedAt?: unknown;
  checked_at?: unknown;
  timestamp?: unknown;
  updatedAt?: unknown;
  services?: Record<string, unknown>;
  checks?: Record<string, unknown>;
} | null | undefined): DashboardHealthSnapshot {
  const status = String(raw?.status ?? "unknown").toLowerCase();
  const checkedAt = coerceNullableNumber(raw?.checkedAt ?? raw?.checked_at ?? raw?.timestamp ?? raw?.updatedAt);

  let severity: DashboardHealthSnapshot["severity"] = "warn";
  let label = "checking";

  if (status === "ok" || status === "healthy") {
    severity = "good";
    label = "healthy";
  } else if (status === "degraded" || status === "warning") {
    severity = "warn";
    label = "degraded";
  } else if (status === "critical" || status === "down" || status === "error") {
    severity = "bad";
    label = "critical";
  }

  const rawServices =
    raw?.services && typeof raw.services === "object"
      ? (raw.services as Record<string, unknown>)
      : raw?.checks && typeof raw.checks === "object"
        ? (raw.checks as Record<string, unknown>)
        : {};

  return {
    status,
    label,
    severity,
    message: coerceString(raw?.message ?? raw?.detail),
    checkedAt,
    services: Object.entries(rawServices).map(([name, value]) => ({
      name: humanizeKey(name),
      status: normalizeServiceStatus(
        typeof value === "string"
          ? value
          : value && typeof value === "object" && "status" in value
            ? (value as { status?: unknown }).status
            : "down"
      ),
      detail:
        value && typeof value === "object" && "detail" in value
          ? coerceString((value as { detail?: unknown }).detail)
          : null,
      checkedAt:
        value && typeof value === "object"
          ? coerceNullableNumber((value as { checkedAt?: unknown; checked_at?: unknown }).checkedAt ?? (value as { checked_at?: unknown }).checked_at)
          : null,
      meta:
        value && typeof value === "object" && "meta" in value && (value as { meta?: unknown }).meta && typeof (value as { meta?: unknown }).meta === "object"
          ? ((value as { meta?: Record<string, unknown> }).meta ?? {})
          : null,
    })),
  };
}

export function selectSystemAgentRows(entries: SystemAgentHealthEntry[]) {
  return [...entries]
    .sort((left, right) => {
      const order = { live: 0, degraded: 1, idle: 2, down: 3 } as const;
      return order[left.status] - order[right.status];
    })
    .map<DashboardAgentRow>((entry, index) => ({
      id: entry.name?.trim().toLowerCase() || `agent-${index + 1}`,
      name: entry.name?.trim() ? humanizeKey(entry.name.trim()) : `Agent ${index + 1}`,
      status: entry.status,
      latencyMs: coerceNumber(entry.latencyMs),
      errorRate: coerceNumber(entry.errorRate),
      detailKey:
        coerceNumber(entry.lastActiveAt) <= 0
          ? "awaitingFirstRun"
          : entry.status === "idle"
            ? "standingBy"
            : "errorRate",
      detailParams:
        coerceNumber(entry.lastActiveAt) > 0 && entry.status !== "idle"
          ? { rate: Math.round(coerceNumber(entry.errorRate) * 100) }
          : undefined,
      lastActiveAt: coerceNumber(entry.lastActiveAt) > 0 ? coerceNumber(entry.lastActiveAt) : null,
    }));
}

export type Tone = "good" | "warn" | "bad" | "neutral" | "info" | "idle";

export function healthSeverityTone(health: DashboardHealthSnapshot | null | undefined): "good" | "warn" | "bad" {
  if (!health) return "warn";
  if (health.severity === "good") return "good";
  if (health.severity === "bad") return "bad";
  return "warn";
}

export function agentStatusTone(status: DashboardRuntimeStatus | undefined): "good" | "warn" | "bad" | "neutral" | "idle" {
  if (status === "live") return "good";
  if (status === "degraded") return "warn";
  if (status === "down") return "bad";
  if (status === "idle") return "idle";
  return "neutral";
}

export function serviceStatusTone(status: DashboardServiceStatus): "good" | "warn" | "bad" {
  if (status === "healthy") return "good";
  if (status === "degraded") return "warn";
  return "bad";
}

export interface AgentStatusCounts {
  live: number;
  idle: number;
  degraded: number;
  down: number;
  hasTraffic: boolean;
  hasActive: boolean;
  allIdle: boolean;
}

export function countAgentStatuses(agents: DashboardAgentRow[]): AgentStatusCounts {
  let live = 0;
  let idle = 0;
  let degraded = 0;
  let down = 0;
  let hasTraffic = false;

  for (const agent of agents) {
    if (agent.status === "live") live++;
    else if (agent.status === "idle") idle++;
    else if (agent.status === "degraded") degraded++;
    else if (agent.status === "down") down++;
    if (agent.lastActiveAt) hasTraffic = true;
  }

  return {
    live,
    idle,
    degraded,
    down,
    hasTraffic,
    hasActive: live > 0 || degraded > 0,
    allIdle: agents.length > 0 && idle === agents.length,
  };
}

/**
 * Localized relative time formatter.
 * Pass a translator bound to `common` (with keys: justNow, sAgo, mAgo, hAgo, dAgo, never).
 * Without a translator, falls back to English.
 */
export function formatRelativeTime(
  timestamp: number | null | undefined,
  now: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t?: (key: any, params?: any) => string,
) {
  if (!timestamp) return t ? t("never") : "Never";
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1_000);

  if (seconds < 10) return t ? t("justNow") : "Just now";
  if (seconds < 60) return t ? t("sAgo", { s: seconds }) : `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t ? t("mAgo", { m: minutes }) : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t ? t("hAgo", { h: hours }) : `${hours}h ago`;

  return t ? t("dAgo", { d: Math.floor(hours / 24) }) : `${Math.floor(hours / 24)}d ago`;
}
