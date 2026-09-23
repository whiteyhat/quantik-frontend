import { describe, expect, it } from "vitest";
import {
  collapseList,
  isNearSettled,
  marketLabel,
  metricValueChars,
  statusKey,
  yesNoGrow,
  yesNoSplit,
} from "@/components/dashboard/dashboardFit";

describe("metricValueChars", () => {
  it("floors short values at 10 so sibling tiles share one figure size", () => {
    expect(metricValueChars("+3")).toBe(10);
    expect(metricValueChars("$5,610.00")).toBe(10);
    expect(metricValueChars(7)).toBe(10);
  });

  it("uses the real length for long values so they shrink to fit", () => {
    expect(metricValueChars("-$1,234,567.89")).toBe(14);
    expect(metricValueChars("Beeintrachtigt")).toBe(14);
  });

  it("falls back to the default for rich nodes, empty and missing values", () => {
    expect(metricValueChars(null)).toBe(10);
    expect(metricValueChars(undefined)).toBe(10);
    expect(metricValueChars({ type: "span" })).toBe(10);
    expect(metricValueChars("")).toBe(10);
  });

  it("ignores surrounding whitespace", () => {
    expect(metricValueChars("   Degradado with spaces   ")).toBe("Degradado with spaces".length);
  });
});

describe("yesNoSplit", () => {
  it("prefers a finite live price over the snapshot price", () => {
    expect(yesNoSplit(0.62, 0.4)).toEqual({ yes: 62, no: 38 });
  });

  it("falls back to the snapshot price when the live price is missing or not a number", () => {
    expect(yesNoSplit(undefined, 0.4)).toEqual({ yes: 40, no: 60 });
    expect(yesNoSplit(Number.NaN, 0.4)).toEqual({ yes: 40, no: 60 });
    expect(yesNoSplit(null, 0.4)).toEqual({ yes: 40, no: 60 });
  });

  it("returns null when no finite price exists (never renders NaN)", () => {
    expect(yesNoSplit(Number.NaN, Number.NaN)).toBeNull();
    expect(yesNoSplit(undefined, undefined)).toBeNull();
    expect(yesNoSplit(Infinity, null)).toBeNull();
  });

  it("clamps out-of-range prices into 0..100", () => {
    expect(yesNoSplit(1.4, null)).toEqual({ yes: 100, no: 0 });
    expect(yesNoSplit(-0.2, null)).toEqual({ yes: 0, no: 100 });
  });
});

describe("isNearSettled", () => {
  it("flags markets whose YES price is 2¢ or less, or 98¢ or more", () => {
    expect(isNearSettled({ yes: 0, no: 100 })).toBe(true);
    expect(isNearSettled({ yes: 2, no: 98 })).toBe(true);
    expect(isNearSettled({ yes: 98, no: 2 })).toBe(true);
    expect(isNearSettled({ yes: 100, no: 0 })).toBe(true);
  });

  it("keeps live markets and markets with no price", () => {
    expect(isNearSettled({ yes: 3, no: 97 })).toBe(false);
    expect(isNearSettled({ yes: 50, no: 50 })).toBe(false);
    expect(isNearSettled({ yes: 97, no: 3 })).toBe(false);
    expect(isNearSettled(null)).toBe(false);
  });
});

describe("yesNoGrow", () => {
  it("shrinks a 0¢ side to its label (grow 0) and keeps a readable minimum otherwise", () => {
    expect(yesNoGrow({ yes: 100, no: 0 })).toEqual({ yes: 100, no: 0 });
    expect(yesNoGrow({ yes: 0, no: 100 })).toEqual({ yes: 0, no: 100 });
    expect(yesNoGrow({ yes: 5, no: 95 })).toEqual({ yes: 28, no: 95 });
    expect(yesNoGrow({ yes: 62, no: 38 })).toEqual({ yes: 62, no: 38 });
  });

  it("splits evenly when there is no price", () => {
    expect(yesNoGrow(null)).toEqual({ yes: 1, no: 1 });
  });
});

describe("collapseList", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it("shows the first 6 and counts the rest while collapsed", () => {
    expect(collapseList(items, false)).toEqual({ visible: items.slice(0, 6), hiddenCount: 14 });
  });

  it("shows everything when expanded", () => {
    expect(collapseList(items, true)).toEqual({ visible: items, hiddenCount: 0 });
  });

  it("never reports hidden items for short lists", () => {
    expect(collapseList([1, 2, 3], false)).toEqual({ visible: [1, 2, 3], hiddenCount: 0 });
  });
});

describe("marketLabel", () => {
  it("prefers the market question", () => {
    expect(marketLabel("  Will the Fed cut rates in December? ", "fed-cut-december")).toBe(
      "Will the Fed cut rates in December?",
    );
  });

  it("humanises the slug only when there is no question", () => {
    expect(marketLabel(null, "fed-cut-december")).toBe("Fed cut december");
    expect(marketLabel("", "will-btc-close-above-150k-in-2026")).toBe("Will btc close above 150k in 2026");
    expect(marketLabel(undefined, "us_cpi_below_3")).toBe("Us cpi below 3");
  });

  it("returns an empty string when neither exists", () => {
    expect(marketLabel(null, "")).toBe("");
    expect(marketLabel(undefined, undefined)).toBe("");
  });
});

describe("statusKey", () => {
  it("normalises server status enums into message keys", () => {
    expect(statusKey("ARMED")).toBe("armed");
    expect(statusKey("Funding required")).toBe("funding_required");
    expect(statusKey(" polymarket-prep ")).toBe("polymarket_prep");
    expect(statusKey("edge_below_threshold")).toBe("edge_below_threshold");
  });
});
