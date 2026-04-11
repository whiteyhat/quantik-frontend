"use client";

import { useState, useCallback } from "react";

const mono = '"SF Mono", "JetBrains Mono", monospace';

interface ERC8004StatusCardProps {
  agentId: string;
  tokenId: string | null;
  registeredAt: number | null;
  reputationScore: number | null;
  validationCount: number;
  onRegistered?: (tokenId: string) => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: mono }}>{label}</span>
      <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600, fontFamily: mono }}>{value}</span>
    </div>
  );
}

export function ERC8004StatusCard({
  agentId,
  tokenId,
  registeredAt,
  reputationScore,
  validationCount,
  onRegistered,
}: ERC8004StatusCardProps) {
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegistered = !!tokenId;

  const handleRegister = useCallback(async () => {
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch("/api/erc8004/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Registration failed (${res.status})`);
      }
      const data = await res.json();
      if (data.tokenId && onRegistered) {
        onRegistered(data.tokenId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }, [agentId, onRegistered]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${isRegistered ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: 20,
        transition: "border-color 300ms ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>&#x26D3;</span>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              fontFamily: mono,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            On-Chain Identity
          </h3>
        </div>
        {isRegistered ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 6,
              background: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              fontFamily: mono,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Registered
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 6,
              background: "rgba(251,191,36,0.15)",
              color: "#fbbf24",
              fontFamily: mono,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Not Registered
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          fontFamily: mono,
          marginBottom: 12,
        }}
      >
        ERC-8004 Sepolia Testnet
      </div>

      {isRegistered ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <StatRow label="Token ID" value={`#${tokenId}`} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <StatRow label="Reputation" value={reputationScore != null ? `${reputationScore}/100` : "\u2014"} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <StatRow label="Validations" value={String(validationCount)} />
          {registeredAt && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <StatRow
                label="Registered"
                value={new Date(registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              />
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5,
              fontFamily: mono,
            }}
          >
            Register your agent on the ERC-8004 Identity Registry to build verifiable on-chain reputation.
          </div>
          <button
            onClick={handleRegister}
            disabled={registering}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: registering
                ? "rgba(99,102,241,0.3)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: mono,
              cursor: registering ? "wait" : "pointer",
              opacity: registering ? 0.6 : 1,
              transition: "opacity 200ms ease",
              letterSpacing: "0.02em",
            }}
          >
            {registering ? "Registering..." : "Register On-Chain"}
          </button>
          {error && (
            <div
              style={{
                fontSize: 11,
                color: "#ef4444",
                fontFamily: mono,
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
