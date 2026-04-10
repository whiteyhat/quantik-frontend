"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, type AgentTokenStatus } from "@/lib/api";
import { TokenInfoCard } from "@/components/TokenDetail/TokenInfoCard";
import { TradingPanel } from "@/components/TokenDetail/TradingPanel";

export default function TokenPage() {
  const params = useParams<{ mint: string }>();
  const router = useRouter();
  const mint = params?.mint;

  const [tokenStatus, setTokenStatus] = useState<AgentTokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mint) return;
    // Fetch token by mint address using the by-mint endpoint
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/solana/tokens/by-mint/${encodeURIComponent(mint)}`,
      { headers: { "Content-Type": "application/json" } }
    )
      .then((r) => r.ok ? r.json() as Promise<AgentTokenStatus> : Promise.reject(new Error(`${r.status}`)))
      .then((data) => { setTokenStatus(data); setLoading(false); })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Token not found");
        setLoading(false);
      });
  }, [mint]);

  if (loading) {
    return (
      <div style={{ padding: 24, color: "rgba(255,255,255,0.60)", fontSize: 15 }}>
        Loading token...
      </div>
    );
  }

  if (error || !tokenStatus?.token) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#FF453A", fontSize: 15, marginBottom: 12 }}>
          {error ?? "Token not found"}
        </div>
        <button
          onClick={() => router.back()}
          style={{
            color: "#007AFF", background: "none", border: "none",
            cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const { token } = tokenStatus;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", color: "rgba(255,255,255,0.60)",
            cursor: "pointer", fontSize: 15,
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
        <TokenInfoCard token={token} />

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
