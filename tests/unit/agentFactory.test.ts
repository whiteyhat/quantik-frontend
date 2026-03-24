import { describe, expect, it } from "vitest";
import { buildWalletDownloadContent, buildLegacyWalletDownloadContent, createPendingByoSession } from "../../lib/agentFactory";

describe("agent factory helpers", () => {
  it("builds the dual wallet download payload with both private keys and no seed phrase", () => {
    const content = buildWalletDownloadContent(
      "Signal Scout",
      {
        evm: {
          address: "0x1111111111111111111111111111111111111111",
          privateKey: "0xabcdef",
        },
        stellar: {
          address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
          privateKey: "SABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
        },
      },
      "2026-03-08T12:00:00.000Z"
    );

    expect(content).toContain("# Agent: Signal Scout");
    expect(content).toContain("EVM / Polygon Wallet");
    expect(content).toContain("Address:     0x1111111111111111111111111111111111111111");
    expect(content).toContain("Private Key: 0xabcdef");
    expect(content).toContain("Stellar Wallet");
    expect(content).toContain("Address:     GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV");
    expect(content).toContain("Private Key: SABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
    // Must NOT contain seed phrase
    expect(content).not.toContain("Seed Phrase");
  });

  it("builds the legacy download payload for BYO with seed phrase", () => {
    const content = buildLegacyWalletDownloadContent(
      "BYO Agent",
      {
        address: "0x2222222222222222222222222222222222222222",
        privateKey: "0xdef",
        seedPhrase: "alpha beta gamma delta",
      },
      "2026-03-08T12:00:00.000Z"
    );

    expect(content).toContain("Wallet Address: 0x2222222222222222222222222222222222222222");
    expect(content).toContain("Private Key: 0xdef");
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
      policy_setup_completed: false,
      policy_setup_completed_at: null,
      last_error: null,
    });
  });
});
