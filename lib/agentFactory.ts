import type { ByoOnboardingSession, GeneratedWalletCredentials } from "./api";

export function buildWalletDownloadContent(
  agentName: string,
  wallet: GeneratedWalletCredentials,
  generatedAtIso: string = new Date().toISOString()
): string {
  return [
    "# Quantik Agent Wallet — KEEP THIS FILE SECURE",
    `# Agent: ${agentName}`,
    `# Generated: ${generatedAtIso}`,
    "# WARNING: This is your only copy. Quantik does NOT store your private key.",
    "",
    `Wallet Address: ${wallet.address}`,
    `Private Key: ${wallet.privateKey}`,
    `Seed Phrase: ${wallet.seedPhrase}`,
  ].join("\n");
}

export function createPendingByoSession(data: {
  session_id: string;
  expires_at: number;
}): ByoOnboardingSession {
  return {
    session_id: data.session_id,
    status: "pending_claim",
    expires_at: data.expires_at,
    claimed_at: null,
    agent_id: null,
    identity: null,
    agent_url: null,
    endpoint_url: null,
    webhook_events: ["*"],
    api_key_prefix: null,
    wallet_address: null,
    connection_status: null,
    wallet_download_ready: false,
    wallet_downloaded_at: null,
    policy_setup_completed: false,
    policy_setup_completed_at: null,
    last_error: null,
  };
}
