import { describe, expect, it } from "vitest";
import {
  STELLAR_HERO_MARKET_SLUG,
  formatStellarExecutionSuccessMessage,
  getFreighterHelperCopy,
  getStellarExecutionRefreshKeys,
  getStellarHeroMarketHref,
} from "../../lib/stellarSubmission";

describe("stellar submission helpers", () => {
  it("returns the canonical hero market path with autorun enabled", () => {
    expect(STELLAR_HERO_MARKET_SLUG).toBe("soroswap-xlm-usdc");
    expect(getStellarHeroMarketHref()).toBe("/market/soroswap-xlm-usdc?autorun=1");
  });

  it("describes Freighter as an optional browser wallet check", () => {
    expect(getFreighterHelperCopy()).toContain("Optional browser wallet check");
    expect(getFreighterHelperCopy()).toContain("does not control the agent wallet");
  });

  it("builds a stellar swap success message with a visible tx hash", () => {
    expect(
      formatStellarExecutionSuccessMessage({
        paper: false,
        action: "SWAP",
        protocol: "soroswap",
        txHash: "abcdef1234567890fedcba",
      })
    ).toBe("Swap submitted on Soroswap | tx abcdef12...fedcba");
  });

  it("returns the dashboard and market queries that must refresh after a live swap", () => {
    expect(getStellarExecutionRefreshKeys("soroswap-xlm-usdc")).toEqual([
      ["dashboard", "summary"],
      ["dashboard", "positions"],
      ["dashboard", "trades"],
      ["dashboard", "performance"],
      ["dashboard", "wallet"],
      ["market", "soroswap-xlm-usdc"],
    ]);
  });
});
