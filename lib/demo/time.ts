/** Timestamps relative to "now" so demo charts and "x ago" labels stay fresh. */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const ago = (ms: number) => Date.now() - ms;
