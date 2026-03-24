export const STELLAR_HERO_MARKET_SLUG = "soroswap-xlm-usdc";

function shortTxHash(txHash: string): string {
  if (txHash.length <= 14) return txHash;
  return `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
}

export function getStellarHeroMarketHref(): string {
  return `/market/${STELLAR_HERO_MARKET_SLUG}?autorun=1`;
}

export function getFreighterHelperCopy(): string {
  return "Optional browser wallet check. Connect Freighter only to compare your browser wallet with the agent wallet for the Stellar demo. It does not control the agent wallet or custody.";
}

export function formatStellarExecutionSuccessMessage(input: {
  paper?: boolean;
  action?: string | null;
  protocol?: string | null;
  txHash?: string | null;
}): string {
  const protocol = input.protocol ? input.protocol.charAt(0).toUpperCase() + input.protocol.slice(1) : "Stellar";
  if (input.paper) {
    return `${input.action === "SWAP" ? "Paper swap" : "Paper trade"} recorded on ${protocol}`;
  }
  if (input.txHash) {
    return `Swap submitted on ${protocol} | tx ${shortTxHash(input.txHash)}`;
  }
  return `Swap submitted on ${protocol}`;
}

export function getStellarExecutionRefreshKeys(slug: string): Array<readonly [string, string] | readonly [string, string, string]> {
  return [
    ["dashboard", "summary"],
    ["dashboard", "positions"],
    ["dashboard", "trades"],
    ["dashboard", "performance"],
    ["dashboard", "wallet"],
    ["market", slug],
  ];
}
