import { describe, expect, it } from "vitest";
import {
  getWalletDisplayName,
  getWalletFoundryCopy,
  getWalletInlinePrefix,
  getWalletLinks,
} from "../../lib/walletPresentation";

describe("wallet presentation helpers", () => {
  it("returns Stellar-specific labels for stellar mode", () => {
    expect(getWalletDisplayName("stellar_testnet")).toBe("Stellar Wallet");
    expect(getWalletInlinePrefix("stellar_testnet")).toBe("Stellar Wallet: ");
    expect(getWalletFoundryCopy("stellar_testnet")).toEqual({
      label: "Assigned Stellar Wallet",
      title: "Preparing your Stellar wallet",
      orbitLabels: ["Stellar", "Wallet", "Launch"],
    });
  });

  it("returns legacy WDK labels for polymarket mode", () => {
    expect(getWalletDisplayName("polymarket")).toBe("WDK Wallet");
    expect(getWalletInlinePrefix("polymarket")).toBe("WDK Wallet: ");
    expect(getWalletFoundryCopy("polymarket")).toEqual({
      label: "Assigned WDK Wallet",
      title: "Forging your WDK vault",
      orbitLabels: ["WDK", "Vault", "Launch"],
    });
  });

  it("returns Stellar explorer links without a polymarket profile in stellar mode", () => {
    expect(getWalletLinks("stellar_testnet", "GTEST123")).toEqual({
      primary: {
        href: "https://stellar.expert/explorer/testnet/account/GTEST123",
        label: "Stellar Expert",
      },
    });
  });

  it("returns Polygon and Polymarket links in polymarket mode", () => {
    expect(getWalletLinks("polymarket", "0xabc")).toEqual({
      primary: {
        href: "https://polygonscan.com/address/0xabc",
        label: "Polygonscan",
      },
      secondary: {
        href: "https://polymarket.com/profile/0xabc",
        label: "Polymarket",
      },
    });
  });
});
