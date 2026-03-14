const DAY_MS = 86_400_000;

export type EquityCurvePeriod = "7D" | "30D" | "All";

export interface EquityCurveTrade {
  timestamp: number;
  outcome: "WIN" | "LOSS" | "OPEN" | "PENDING";
  pnl?: number;
}

export interface EquityCurvePoint {
  label: string;
  timestamp: number;
  value: number;
}

interface BuildEquityCurveOptions {
  locale?: string;
  now?: number;
}

function toFinitePnl(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampCapitalValue(value: number): number {
  return value > 0 ? value : 0;
}

function getPeriodDuration(period: EquityCurvePeriod) {
  if (period === "7D") return 7 * DAY_MS;
  if (period === "30D") return 30 * DAY_MS;
  return 365 * DAY_MS;
}

function getFallbackPointCount(period: EquityCurvePeriod) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  return 90;
}

function isClosedTrade(trade: EquityCurveTrade) {
  return trade.outcome === "WIN" || trade.outcome === "LOSS";
}

function isOpenTrade(trade: EquityCurveTrade) {
  return trade.outcome === "OPEN";
}

export function formatEquityAxisLabel(
  timestamp: number,
  period: EquityCurvePeriod,
  locale = "en-US"
) {
  const date = new Date(timestamp);
  if (period === "7D") {
    return date.toLocaleDateString(locale, { weekday: "short" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function formatEquityTooltipLabel(timestamp: number, locale = "en-US") {
  return new Date(timestamp).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildEquityCurve(
  currentBalance: number | null,
  trades: EquityCurveTrade[],
  period: EquityCurvePeriod,
  options: BuildEquityCurveOptions = {}
): EquityCurvePoint[] {
  if (currentBalance == null) return [];

  const locale = options.locale ?? "en-US";
  const now = options.now ?? Date.now();
  const startTime = now - getPeriodDuration(period);
  const periodTrades = [...trades]
    .filter((trade) => trade.timestamp >= startTime)
    .sort((left, right) => left.timestamp - right.timestamp);
  const normalizedTrades = periodTrades.filter((trade): trade is EquityCurveTrade => Boolean(trade));

  if (normalizedTrades.length === 0) {
    const points = getFallbackPointCount(period);
    return Array.from({ length: points }, (_, index) => {
      const timestamp = now - (points - 1 - index) * DAY_MS;
      return {
        label: formatEquityAxisLabel(timestamp, period, locale),
        timestamp,
        value: clampCapitalValue(currentBalance),
      };
    });
  }

  let realizedPnl = 0;
  let unrealizedPnl = 0;

  for (let index = 0; index < normalizedTrades.length; index += 1) {
    const trade = normalizedTrades[index];
    if (!trade) continue;
    const currentTrade: EquityCurveTrade = trade;

    if (isClosedTrade(currentTrade)) {
      realizedPnl += toFinitePnl(currentTrade.pnl);
      continue;
    }

    if (isOpenTrade(currentTrade)) {
      unrealizedPnl += toFinitePnl(currentTrade.pnl);
    }
  }

  let runningBalance = clampCapitalValue(currentBalance - realizedPnl - unrealizedPnl);

  const points: EquityCurvePoint[] = [
    {
      label: formatEquityAxisLabel(startTime, period, locale),
      timestamp: startTime,
      value: clampCapitalValue(runningBalance),
    },
  ];

  for (let index = 0; index < normalizedTrades.length; index += 1) {
    const trade = normalizedTrades[index];
    if (!trade) continue;
    const currentTrade: EquityCurveTrade = trade;

    if (isClosedTrade(currentTrade)) {
      runningBalance = clampCapitalValue(runningBalance + toFinitePnl(currentTrade.pnl));
    }

    points.push({
      label: formatEquityAxisLabel(currentTrade.timestamp, period, locale),
      timestamp: currentTrade.timestamp,
      value: clampCapitalValue(runningBalance),
    });
  }

  points.push({
    label: formatEquityAxisLabel(now, period, locale),
    timestamp: now,
    value: clampCapitalValue(currentBalance),
  });

  return points;
}
