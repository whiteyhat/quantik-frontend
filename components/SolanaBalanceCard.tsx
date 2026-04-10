"use client";

import { fmtCompact } from "@/lib/formatters";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SolanaTokenBalance {
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;          // UI amount (already divided by decimals)
  logoUri: string | null;
}

export interface SolanaBalanceCardProps {
  /** SOL balance in SOL units (not lamports) */
  solBalance: number | null;
  tokens: SolanaTokenBalance[];
  loading: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format token amount for display (no dollar prefix).
 * Uses fmtCompact logic for large numbers but strips the "$" prefix,
 * since these are token quantities not USD values.
 */
function fmtTokenAmount(n: number): string {
  // fmtCompact returns "$1.5M" etc — strip the "$" for token amounts
  return fmtCompact(n).replace(/^\$/, "");
}

// ─── SolanaBalanceCard ────────────────────────────────────────────────────────

export function SolanaBalanceCard({ solBalance, tokens, loading, error }: SolanaBalanceCardProps) {
  const glassCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "16px 20px",
    marginBottom: 12,
  };

  if (loading) {
    return (
      <div style={glassCard}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 48,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...glassCard, border: "1px solid rgba(255,69,58,0.25)" }}>
        <p style={{ fontSize: 13, color: "#ff453a", margin: 0 }}>{error}</p>
      </div>
    );
  }

  const nonZeroTokens = tokens.filter((t) => t.amount > 0);

  return (
    <div>
      {/* SOL Balance */}
      <div style={glassCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Solana logo placeholder */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(153,69,255,0.18)",
              border: "1px solid rgba(153,69,255,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 16,
            }}
          >
            &#9678;
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>
              Solana
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>SOL</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {solBalance != null ? `${solBalance.toFixed(4)} SOL` : "\u2014"}
            </div>
          </div>
        </div>
      </div>

      {/* SPL Tokens */}
      {nonZeroTokens.length === 0 ? (
        <div
          style={{
            ...glassCard,
            textAlign: "center",
            padding: "32px 20px",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.60)", marginBottom: 6 }}>
            No tokens yet
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>
            Once you tokenize an agent, token balances will appear here.
          </div>
        </div>
      ) : (
        nonZeroTokens.map((token) => (
          <div key={token.mint} style={glassCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Token icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(10,132,255,0.12)",
                  border: "1px solid rgba(10,132,255,0.20)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {token.logoUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token.logoUri} alt={token.symbol ?? "token"} style={{ width: 36, height: 36, objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.50)" }}>
                    {(token.symbol ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>
                  {token.name ?? token.symbol ?? token.mint.slice(0, 8) + "\u2026"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                  {token.symbol ?? token.mint.slice(0, 8) + "\u2026"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {fmtTokenAmount(token.amount)}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
