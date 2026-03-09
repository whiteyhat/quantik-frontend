import type {
  AgentStatusEntry,
  PerformanceSummary,
  WalletBalance,
} from "@/lib/api";

type CircuitBreakerState = "ARMED" | "WARNING" | "TRIGGERED";

export interface DashboardSummarySnapshot {
  totalValue: number | null;
  cashBalance: number | null;
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
  metrics: PerformanceSummary["metrics"];
  alphaDecay: PerformanceSummary["alphaDecay"];
}

export interface DashboardHealthSnapshot {
  status: string;
  label: string;
  severity: "good" | "warn" | "bad";
  message: string | null;
  checkedAt: number | null;
  services: { name: string; status: string }[];
}

export interface DashboardAgentRow {
  id: string;
  name: string;
  subtitle: string;
  status: AgentStatusEntry["status"];
  latencyMs: number;
  confidence: number;
  lastAction: string;
  lastActionAt: string | null;
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
  services?: Record<string, unknown> | Record<string, string>;
  checks?: Record<string, unknown>;
} | null | undefined): DashboardHealthSnapshot {
  const status = String(raw?.status ?? "unknown").toLowerCase();
  const checkedAt = coerceNullableNumber(raw?.checkedAt ?? raw?.checked_at ?? raw?.timestamp ?? raw?.updatedAt);

  let severity: DashboardHealthSnapshot["severity"] = "warn";
  let label = "Checking";

  if (status === "ok" || status === "healthy") {
    severity = "good";
    label = "Healthy";
  } else if (status === "degraded" || status === "warning") {
    severity = "warn";
    label = "Degraded";
  } else if (status === "critical" || status === "down" || status === "error") {
    severity = "bad";
    label = "Critical";
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
      name,
      status: typeof value === "string"
        ? value
        : value && typeof value === "object" && "status" in value
          ? String((value as { status?: unknown }).status ?? "unknown")
          : "unknown",
    })),
  };
}

export function selectAgentRows(entries: AgentStatusEntry[]) {
  return [...entries]
    .sort((left, right) => {
      const order = { active: 0, idle: 1, error: 2 } as const;
      return order[left.status] - order[right.status];
    })
    .map<DashboardAgentRow>((entry, index) => ({
      id: entry.id || `${entry.name || "agent"}-${index}`,
      name: entry.name?.trim() ? entry.name : `Agent ${index + 1}`,
      subtitle: entry.name?.trim() ? "Specialist agent" : "Live agent runtime",
      status: entry.status,
      latencyMs: coerceNumber(entry.latencyMs),
      confidence: coerceNumber(entry.confidence),
      lastAction: entry.lastAction?.trim() ? entry.lastAction : "Waiting for next cycle",
      lastActionAt: entry.lastActionAt || null,
    }));
}

export function formatRelativeTime(timestamp: number | null | undefined, now: number) {
  if (!timestamp) return "Never";
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1_000);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}
