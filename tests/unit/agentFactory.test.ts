import { describe, expect, it } from "vitest";
import { buildWalletDownloadContent, createPendingByoSession } from "../../lib/agentFactory";

describe("agent factory helpers", () => {
  it("builds the wallet download payload with all sensitive fields", () => {
    const content = buildWalletDownloadContent(
      "Signal Scout",
      {
        address: "0x1111111111111111111111111111111111111111",
        privateKey: "0xabcdef",
        seedPhrase: "alpha beta gamma delta",
      },
      "2026-03-08T12:00:00.000Z"
    );

    expect(content).toContain("# Agent: Signal Scout");
    expect(content).toContain("Wallet Address: 0x1111111111111111111111111111111111111111");
    expect(content).toContain("Private Key: 0xabcdef");
    expect(content).toContain("Seed Phrase: alpha beta gamma delta");
  });

  it("creates the default pending BYO session shape", () => {
    expect(createPendingByoSession({
      session_id: "session-123",
      expires_at: 1234567890,
    })).toEqual({
      session_id: "session-123",
      status: "pending_claim",
      expires_at: 1234567890,
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
      last_error: null,
      policy_setup_completed: false,
      policy_setup_completed_at: null,
    });
  });
});
