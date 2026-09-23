// ─── Centralized locale-aware formatting with cached Intl constructors ───────
//
// Currency defaults to "en-US" (financial standard — $1,234.56 regardless of UI locale).
// Dates, times, and plain numbers default to "en-US" but accept an explicit locale
// so components can pass `useLocale()` for locale-aware output.

const DEFAULT_LOCALE = "en-US";

// ─── Caches ──────────────────────────────────────────────────────────────────

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
const numFmtCache = new Map<string, Intl.NumberFormat>();

export function getCachedDateFmt(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    dateFmtCache.set(key, fmt);
  }
  return fmt;
}

function getCachedNumFmt(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let fmt = numFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options);
    numFmtCache.set(key, fmt);
  }
  return fmt;
}

// ─── Currency formatters (default "en-US") ───────────────────────────────────

export function fmtUSDC(n: number | null | undefined, locale = DEFAULT_LOCALE): string {
  if (n == null || isNaN(n)) return "$0.00";
  // Sign before the dollar ("-$6.55", not "$-6.55"); an amount that rounds to zero has no sign
  const digits = getCachedNumFmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  const negative = n < 0 && /[1-9]/.test(digits);
  return `${negative ? "-" : ""}$${digits}`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${n.toFixed(0)}`;
}

export function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return "0¢";
  return `${Math.round(p * 100)}¢`;
}

export function fmtDollar(n: number, locale = DEFAULT_LOCALE): string {
  return `$${getCachedNumFmt(locale, { maximumFractionDigits: 0 }).format(n)}`;
}

// ─── Number formatter ────────────────────────────────────────────────────────

export function fmtNumber(n: number, locale = DEFAULT_LOCALE): string {
  return getCachedNumFmt(locale, {}).format(n);
}

/**
 * Whole-number count with the thousands separator always shown, so "1.240"
 * and "48.500" read alike (Spanish and a few other locales skip it on
 * four-digit numbers by default).
 */
export function fmtCount(n: number, locale = DEFAULT_LOCALE): string {
  return getCachedNumFmt(locale, { maximumFractionDigits: 0, useGrouping: "always" }).format(n);
}

// ─── Date/Time formatters ────────────────────────────────────────────────────

/** Short date: "Mar 21" */
export function fmtDate(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, { month: "short", day: "numeric" }).format(ts);
}

/** Full date: "March 21, 2026" */
export function fmtDateFull(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(ts);
}

/** Date with year, short month: "Mar 21, 2026" */
export function fmtDateShort(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ts);
}

/** 24h time: "14:32:05" */
export function fmtTime(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ts);
}

/** Short time: "2:32 PM" or "14:32" depending on locale */
export function fmtTimeShort(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}

/** Combined date + time */
export function fmtDateTime(ts: number, locale = DEFAULT_LOCALE): string {
  return getCachedDateFmt(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}
