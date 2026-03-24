import type { ChainMode } from "./chain";

export function getWalletDisplayName(chainMode: ChainMode): string {
  return chainMode === "stellar_testnet" ? "Stellar Wallet" : "WDK Wallet";
}

export function getWalletInlinePrefix(chainMode: ChainMode): string {
  return `${getWalletDisplayName(chainMode)}: `;
}

export function getWalletFoundryCopy(chainMode: ChainMode): {
  label: string;
  title: string;
  orbitLabels: [string, string, string];
} {
  if (chainMode === "stellar_testnet") {
    return {
      label: "Assigned Stellar Wallet",
      title: "Preparing your Stellar wallet",
      orbitLabels: ["Stellar", "Wallet", "Launch"],
    };
  }

  return {
    label: "Assigned WDK Wallet",
    title: "Forging your WDK vault",
    orbitLabels: ["WDK", "Vault", "Launch"],
  };
}

export function getWalletLinks(
  chainMode: ChainMode,
  walletAddress: string
): {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
} {
  if (chainMode === "stellar_testnet") {
    return {
      primary: {
        href: `https://stellar.expert/explorer/testnet/account/${walletAddress}`,
        label: "Stellar Expert",
      },
    };
  }

  return {
    primary: {
      href: `https://polygonscan.com/address/${walletAddress}`,
      label: "Polygonscan",
    },
    secondary: {
      href: `https://polymarket.com/profile/${walletAddress}`,
      label: "Polymarket",
    },
  };
}
