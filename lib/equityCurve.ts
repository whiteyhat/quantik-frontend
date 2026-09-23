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

import { getCachedDateFmt } from "./formatters";

export function formatEquityAxisLabel(
  timestamp: number,
  period: EquityCurvePeriod,
  locale = "en-US"
) {
  const opts = period === "7D"
    ? { weekday: "short" as const }
    : { month: "short" as const, day: "numeric" as const };
  return getCachedDateFmt(locale, opts).format(timestamp);
}

/** Y-axis tick: one decimal for thousands and millions ("$10.4k", "$1.3M"). */
export function formatEquityTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return factor * magnitude;
}

/**
 * Y domain and ticks for the equity curve: padded around the data (not zero-based, so a +2%
 * week is visible) and on round steps that stay distinct once formatted by formatEquityTick.
 */
export function equityYAxis(values: number[]): { domain: [number, number]; ticks: number[] } | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  const pad = span > 0 ? span * 0.15 : Math.max(Math.abs(max) * 0.01, 1);
  let rawLo = min - pad;
  const rawHi = max + pad;
  if (min >= 0) rawLo = Math.max(0, rawLo);

  const peak = Math.max(Math.abs(min), Math.abs(max));
  const minStep = peak >= 1_000_000 ? 100_000 : peak >= 1_000 ? 100 : 1;
  const step = Math.max(niceStep((rawHi - rawLo) / 4), minStep);
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const ticks: number[] = [];
  for (let tick = lo; tick <= hi + step / 2; tick += step) ticks.push(Math.round(tick * 100) / 100);
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}

export function formatEquityTooltipLabel(timestamp: number, locale = "en-US") {
  return getCachedDateFmt(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
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
