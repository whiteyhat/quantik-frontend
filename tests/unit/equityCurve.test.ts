import { describe, expect, it } from "vitest";
import { buildEquityCurve, equityYAxis, formatEquityAxisLabel, formatEquityTick } from "../../lib/equityCurve";
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

describe("equityYAxis", () => {
  it("pads around the data instead of starting at zero, on round $100 ticks", () => {
    const axis = equityYAxis([10_296.7, 10_350, 10_480]);
    expect(axis).not.toBeNull();
    const { domain, ticks } = axis!;
    expect(domain[0]).toBeGreaterThan(9_000);
    expect(domain[0]).toBeLessThan(10_296.7);
    expect(domain[1]).toBeGreaterThan(10_480);
    expect(domain).toEqual([ticks[0], ticks[ticks.length - 1]]);
    expect(ticks.every((tick) => tick % 100 === 0)).toBe(true);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(7);
  });

  it("gives a flat line some headroom", () => {
    const { domain } = equityYAxis([900, 900, 900])!;
    expect(domain[0]).toBeLessThan(900);
    expect(domain[1]).toBeGreaterThan(900);
    expect(domain[0]).toBeGreaterThanOrEqual(0);
  });

  it("never goes below zero for positive balances", () => {
    const { domain } = equityYAxis([0, 20, 100])!;
    expect(domain[0]).toBe(0);
  });

  it("returns null without data", () => {
    expect(equityYAxis([])).toBeNull();
    expect(equityYAxis([Number.NaN])).toBeNull();
  });
});

describe("formatEquityTick", () => {
  it("uses one decimal for thousands and millions", () => {
    expect(formatEquityTick(10_400)).toBe("$10.4k");
    expect(formatEquityTick(10_000)).toBe("$10.0k");
    expect(formatEquityTick(1_250_000)).toBe("$1.3M");
    expect(formatEquityTick(950)).toBe("$950");
  });
});

describe("formatEquityAxisLabel", () => {
  it("uses the viewer's language for weekday labels", () => {
    const monday = Date.UTC(2026, 8, 21, 12);
    expect(formatEquityAxisLabel(monday, "7D", "en")).toBe("Mon");
    expect(formatEquityAxisLabel(monday, "7D", "es")).toBe("lun");
    expect(formatEquityAxisLabel(monday, "7D", "de")).toBe("Mo");
  });
});
