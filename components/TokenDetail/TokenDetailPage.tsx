"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AgentTokenStatus } from "@/lib/api";
import { TokenInfoCard } from "./TokenInfoCard";
import { TradingPanel } from "./TradingPanel";

interface TokenDetailPageProps {
  tokenStatus: AgentTokenStatus;
  agentEmoji?: string;
}

export function TokenDetailPage({ tokenStatus, agentEmoji }: TokenDetailPageProps) {
  const router = useRouter();

  if (!tokenStatus.token) {
    return (
      <div style={{ padding: 24, color: "rgba(255,255,255,0.60)", fontSize: 15 }}>
        Token not found.{" "}
        <button
          onClick={() => router.back()}
          style={{ color: "#007AFF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Go back
        </button>
      </div>
    );
  }

  const { token } = tokenStatus;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header with back button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            color: "rgba(255,255,255,0.60)", cursor: "pointer", fontSize: 15, padding: "4px 0",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
          {token.token_name}{" "}
          <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 400 }}>
            (${token.token_symbol})
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Token info card */}
        <TokenInfoCard token={token} agentEmoji={agentEmoji} />

        {/* Price chart placeholder (Phase 5) */}
        <div style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 16, height: 200,
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.40)", marginBottom: 8 }}>
            Price History
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>
            Price chart coming in Phase 5 — Showing buy/sell data after first trades
          </div>
        </div>

        {/* Trading panel */}
        <TradingPanel token={token} />

        {/* Top holders placeholder (Phase 4) */}
        <div style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: 8 }}>
            Top Holders
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Holder leaderboard coming in Phase 4
          </div>
        </div>
      </div>
    </div>
  );
}
