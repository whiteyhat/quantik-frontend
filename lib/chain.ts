export type ChainMode = "stellar_testnet" | "polymarket" | "bridge";

export function getChainMode(): ChainMode {
  const mode = process.env.NEXT_PUBLIC_CHAIN_MODE;
  if (mode === "polymarket") return "polymarket";
  if (mode === "bridge") return "bridge";
  return "stellar_testnet";
}

export function isStellarMode(): boolean {
  return getChainMode() === "stellar_testnet";
}

export function isBridgeMode(): boolean {
  return getChainMode() === "bridge";
}

/** True when Stellar chain is active (stellar_testnet or bridge) */
export function isStellarActive(): boolean {
  const mode = getChainMode();
  return mode === "stellar_testnet" || mode === "bridge";
}

/** True when Polygon chain is active (polymarket or bridge) */
export function isPolygonActive(): boolean {
  const mode = getChainMode();
  return mode === "polymarket" || mode === "bridge";
}
