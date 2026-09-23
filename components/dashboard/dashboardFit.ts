/**
 * Small pure helpers that keep dashboard text inside its tiles.
 */

/** Minimum "design length" of a metric figure: shorter values render at the same size as a
 *  typical money value, so sibling tiles share one figure size. */
const METRIC_MIN_CHARS = 10;

/**
 * Character count that drives the fluid figure size of a <MetricBlock> value
 * (CSS var --metric-chars). Rich nodes (icons + numbers) use the default length.
 */
export function metricValueChars(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return METRIC_MIN_CHARS;
  const length = String(value).trim().length;
  return Math.max(METRIC_MIN_CHARS, length);
}

/**
 * YES/NO split in whole percent for a market tile. Uses the live price when it is a finite
 * number, otherwise the snapshot price; returns null when neither is usable so the UI can show
 * a placeholder instead of "NaN".
 */
export function yesNoSplit(
  livePrice: number | null | undefined,
  snapshotPrice: number | null | undefined,
): { yes: number; no: number } | null {
  const price = Number.isFinite(livePrice) ? (livePrice as number)
    : Number.isFinite(snapshotPrice) ? (snapshotPrice as number)
      : null;
  if (price === null) return null;
  const yes = Math.min(100, Math.max(0, Math.round(price * 100)));
  return { yes, no: 100 - yes };
}

/** A market priced at 2¢ or less, or 98¢ or more, is effectively settled: the scanner hides it. */
export function isNearSettled(split: { yes: number; no: number } | null): boolean {
  if (!split) return false;
  return split.yes <= 2 || split.yes >= 98;
}

/** Minimum share of the YES/NO bar for a side that still has a price, so "3¢" stays readable. */
const YES_NO_MIN_GROW = 28;

/**
 * flex-grow for the two halves of a YES/NO bar. A 0¢ side gets 0, so it shrinks to the width
 * of its own label instead of taking a quarter of the bar.
 */
export function yesNoGrow(split: { yes: number; no: number } | null): { yes: number; no: number } {
  if (!split) return { yes: 1, no: 1 };
  const grow = (value: number) => (value <= 0 ? 0 : Math.max(YES_NO_MIN_GROW, value));
  return { yes: grow(split.yes), no: grow(split.no) };
}

/** How many rows a collapsible dashboard list shows before its "Show N more" button. */
export const COLLAPSED_LIST_COUNT = 6;

export function collapseList<T>(items: T[], expanded: boolean, count = COLLAPSED_LIST_COUNT) {
  if (expanded || items.length <= count) return { visible: items, hiddenCount: 0 };
  return { visible: items.slice(0, count), hiddenCount: items.length - count };
}

/**
 * What to call a market on screen: its question, or (last resort) a readable version of the
 * slug ("fed-cut-december" -> "Fed cut december"), never the raw slug.
 */
export function marketLabel(question: string | null | undefined, slug: string | null | undefined): string {
  const trimmed = question?.trim();
  if (trimmed) return trimmed;
  const words = (slug ?? "").replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

/** Message key for a server status enum: "FUNDING REQUIRED" / "funding-required" -> "funding_required". */
export function statusKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
