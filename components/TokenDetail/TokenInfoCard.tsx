"use client";

import { useState, useEffect } from "react";
import type { AgentTokenStatus, DistributionStatusResponse } from "@/lib/api";

interface TokenInfoCardProps {
  token: NonNullable<AgentTokenStatus["token"]>;
  agentEmoji?: string;
  distributionStatus?: DistributionStatusResponse | null;
}

function formatCountdown(targetMs: number, currentMs: number): string {
  const diff = targetMs - currentMs;
  if (diff <= 0) return "Soon";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function TokenInfoCard({ token, agentEmoji = "🤖", distributionStatus }: TokenInfoCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const treasuryUsdc = distributionStatus?.current_distribution?.buyback_amount_usdc ?? null;
  const nextDistAt = distributionStatus?.next_distribution_at ?? null;

  const statusColor = token.status === "migrated" ? "#30D158" : "#FF9F0A";
  const statusLabel = token.status === "migrated" ? "Live on DAMM" : "Bonding";

  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 16,
    }}>
      {/* Top row: avatar + name/symbol + status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        {/* Token avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg, #7B61FF, #00D1FF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
        }}>
          {agentEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
            {token.token_name}
          </div>
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.50)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}>
            ${token.token_symbol}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
          background: token.status === "migrated" ? "rgba(48,209,88,0.18)" : "rgba(255,159,10,0.18)",
          color: statusColor, border: `1px solid ${statusColor}50`,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Supply", value: "1,000,000" },
          { label: "Status", value: token.status === "bonding" ? "Bonding" : "Migrated" },
          { label: "Network", value: "Solana" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Token mint address */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 4 }}>Mint Address</div>
        <a
          href={`https://solscan.io/token/${token.token_mint}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace', fontSize: 11,
            color: "#007AFF", wordBreak: "break-all", textDecoration: "none",
          }}
        >
          {token.token_mint}
        </a>
      </div>

      {/* Treasury + Distribution stats (Phase 5 — DASH-02) */}
      {(treasuryUsdc !== null || nextDistAt !== null) && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {/* Est. Treasury */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>
              Est. Treasury
              <span
                title="USDC available for buyback"
                style={{ marginLeft: 4, cursor: "help", color: "rgba(255,255,255,0.25)" }}
              >
                &#x24D8;
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>
              {treasuryUsdc !== null
                ? `${treasuryUsdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
                : "\u2014"}
            </div>
          </div>

          {/* Next Distribution */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>
              Next Distribution
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>
              {nextDistAt !== null
                ? formatCountdown(nextDistAt, now)
                : "No distributions yet"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
