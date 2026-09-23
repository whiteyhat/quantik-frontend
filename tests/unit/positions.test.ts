import { describe, expect, it } from "vitest";
import { positionShares, positionValue } from "@/lib/positions";

// A position's `size` is the USD stake (demo fixtures and the backend's wallet
// route alike), not a share count: shares = stake / entry price.
describe("position shares and current value", () => {
  const btc = { size: 120, entryPrice: 0.45, currentPrice: 0.52, pnl: 18.67 };

  it("turns the USD stake into shares at the entry price", () => {
    expect(positionShares(btc)).toBeCloseTo(266.67, 2);
  });

  it("values the shares at the current price (above cost when P&L is positive)", () => {
    expect(positionValue(btc)).toBeCloseTo(138.67, 2);
    expect(positionValue(btc)).toBeGreaterThan(btc.size);
  });

  it("is below cost for a losing position", () => {
    const eth = { size: 60, entryPrice: 0.55, currentPrice: 0.49, pnl: -6.55 };
    expect(positionValue(eth)).toBeCloseTo(53.45, 2);
  });

  it("falls back to stake + P&L when the entry price is missing", () => {
    const odd = { size: 50, entryPrice: 0, currentPrice: 0.4, pnl: 5 };
    expect(positionShares(odd)).toBe(0);
    expect(positionValue(odd)).toBe(55);
  });
});
