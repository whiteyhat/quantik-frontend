import { describe, expect, it } from "vitest";
import { buildEquityCurve } from "../../lib/equityCurve";
import type { Trade } from "../../lib/api";

describe("buildEquityCurve", () => {
  const now = Date.UTC(2026, 2, 14, 12, 0, 0);

  it("keeps open-trade unrealized pnl at the current point instead of backdating it", () => {
    const trades: Trade[] = [
      {
        id: "open-1",
        market: "Market 1",
        slug: "market-1",
        direction: "YES",
        size: 100,
        price: 0.5,
        outcome: "OPEN",
        timestamp: Date.UTC(2026, 2, 13, 10, 0, 0),
        pnl: 40,
      },
      {
        id: "open-2",
        market: "Market 2",
        slug: "market-2",
        direction: "NO",
        size: 80,
        price: 0.4,
        outcome: "OPEN",
        timestamp: Date.UTC(2026, 2, 14, 8, 0, 0),
        pnl: 60,
      },
    ];

    const curve = buildEquityCurve(1_100, trades, "7D", { now });

    expect(curve.map((point) => point.value)).toEqual([1_000, 1_000, 1_000, 1_100]);
    expect(curve.at(-1)?.timestamp).toBe(now);
  });

  it("applies realized pnl at trade timestamps and leaves open positions for the current point", () => {
    const trades: Trade[] = [
      {
        id: "win-1",
        market: "Market 1",
        slug: "market-1",
        direction: "YES",
        size: 100,
        price: 0.5,
        outcome: "WIN",
        timestamp: Date.UTC(2026, 2, 10, 9, 0, 0),
        pnl: 50,
      },
      {
        id: "open-1",
        market: "Market 2",
        slug: "market-2",
        direction: "YES",
        size: 120,
        price: 0.55,
        outcome: "OPEN",
        timestamp: Date.UTC(2026, 2, 13, 15, 0, 0),
        pnl: 100,
      },
    ];

    const curve = buildEquityCurve(1_150, trades, "7D", { now });

    expect(curve.map((point) => point.value)).toEqual([1_000, 1_050, 1_050, 1_150]);
  });

  it("falls back to a flat line when there are no trades in range", () => {
    const curve = buildEquityCurve(900, [], "7D", { now });

    expect(curve).toHaveLength(7);
    expect(curve.every((point) => point.value === 900)).toBe(true);
  });

  it("never lets reconstructed historical capital drop below zero", () => {
    const trades: Trade[] = [
      {
        id: "loss-1",
        market: "Market 1",
        slug: "market-1",
        direction: "YES",
        size: 100,
        price: 0.5,
        outcome: "LOSS",
        timestamp: Date.UTC(2026, 2, 10, 9, 0, 0),
        pnl: -80,
      },
      {
        id: "win-1",
        market: "Market 2",
        slug: "market-2",
        direction: "YES",
        size: 100,
        price: 0.5,
        outcome: "WIN",
        timestamp: Date.UTC(2026, 2, 12, 9, 0, 0),
        pnl: 100,
      },
    ];

    const curve = buildEquityCurve(20, trades, "7D", { now });

    expect(curve.map((point) => point.value)).toEqual([0, 0, 100, 20]);
    expect(curve.every((point) => point.value >= 0)).toBe(true);
  });
});
