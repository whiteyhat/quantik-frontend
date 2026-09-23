import type { Position } from "@/lib/api";

type PositionAmounts = Pick<Position, "size" | "entryPrice" | "currentPrice" | "pnl">;

/**
 * Shares held. A position's `size` is the USD stake (the backend's wallet route
 * sends `size: amount`), so shares = stake / entry price.
 */
export function positionShares(pos: PositionAmounts): number {
  return pos.entryPrice > 0 ? pos.size / pos.entryPrice : 0;
}

/** What the position is worth now: shares at the current price (stake + P&L without an entry price). */
export function positionValue(pos: PositionAmounts): number {
  return pos.entryPrice > 0 ? positionShares(pos) * pos.currentPrice : pos.size + pos.pnl;
}
