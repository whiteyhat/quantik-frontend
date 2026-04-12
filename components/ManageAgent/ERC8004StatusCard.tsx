"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, Link2 } from "lucide-react";

const mono = '"SF Mono", "JetBrains Mono", monospace';

// ── CSS keyframes injected once ──────────────────────────────────────────────

const STYLE_ID = "erc8004-keyframes";
let _keyframesInjected = false;
function ensureKeyframes() {
  if (typeof document === "undefined" || _keyframesInjected) return;
  _keyframesInjected = true;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes erc-pulse-border {
      0%, 100% { border-color: rgba(99,102,241,0.25); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
      50% { border-color: rgba(139,92,246,0.45); box-shadow: 0 0 20px 3px rgba(139,92,246,0.08); }
    }
    @keyframes erc-glow-dot {
      0%, 100% { box-shadow: 0 0 4px 1px rgba(34,197,94,0.3); }
      50% { box-shadow: 0 0 10px 3px rgba(34,197,94,0.5); }
    }
    @keyframes erc-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes erc-check-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes erc-fade-in {
      0% { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes erc-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes erc-registered-glow {
      0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      50% { box-shadow: 0 0 16px 4px rgba(34,197,94,0.15); }
      100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }
  `;
  document.head.appendChild(style);
}

interface ERC8004StatusCardProps {
  agentId: string;
  tokenId: string | null;
  registeredAt: number | null;
  reputationScore: number | null;
  validationCount: number;
  onRegistered?: (tokenId: string) => void;
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{
        color: "rgba(255,255,255,0.45)",
        fontSize: 11,
        fontFamily: mono,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>{label}</span>
      <span style={{
        color: highlight ? "#22c55e" : "rgba(255,255,255,0.9)",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: mono,
      }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "2px solid rgba(255,255,255,0.2)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "erc-spin 0.6s linear infinite",
      marginRight: 8,
      verticalAlign: "middle",
    }} />
  );
}

function ChainIcon({ registered }: { registered: boolean }) {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: registered ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.12)",
      border: `1px solid ${registered ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.25)"}`,
      transition: "all 300ms ease",
    }}>
      {registered ? (
        <CheckCircle2 size={14} color="#22c55e" style={{ animation: "erc-check-pop 0.4s ease forwards" }} />
      ) : (
        <Link2 size={14} color="#8b5cf6" />
      )}
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
  const [isHovering, setIsHovering] = useState(false);
  const isRegistered = !!tokenId;

  // Detect when tokenId transitions from null → value (celebration glow)
  const prevTokenId = useRef(tokenId);
  const [showGlow, setShowGlow] = useState(false);
  useEffect(() => {
    if (!prevTokenId.current && tokenId) {
      setShowGlow(true);
      const t = setTimeout(() => setShowGlow(false), 3000);
      return () => clearTimeout(t);
    }
    prevTokenId.current = tokenId;
  }, [tokenId]);

  useEffect(() => { ensureKeyframes(); }, []);

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
      if (data.tokenId) onRegistered?.(data.tokenId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }, [agentId, onRegistered]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${isRegistered ? "rgba(34,197,94,0.20)" : "rgba(99,102,241,0.15)"}`,
        borderRadius: 16,
        padding: "18px 20px",
        transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        animation: isRegistered
          ? (showGlow ? "erc-registered-glow 1.5s ease 1" : "none")
          : "erc-pulse-border 4s ease-in-out infinite",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Shimmer bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: isRegistered
          ? "linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)"
          : "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.3), transparent)",
        backgroundSize: "200% 100%",
        animation: "erc-shimmer 3s ease-in-out infinite",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ChainIcon registered={isRegistered} />
          <div>
            <h3 style={{
              fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)",
              fontFamily: mono, letterSpacing: "0.02em", margin: 0, lineHeight: 1,
            }}>
              On-Chain Identity
            </h3>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: mono, letterSpacing: "0.04em" }}>
              ERC-8004 · Sepolia
            </span>
          </div>
        </div>

        {isRegistered ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
            background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)",
            color: "#22c55e", fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
              animation: "erc-glow-dot 2s ease-in-out infinite",
            }} />
            Verified
          </div>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
            background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.18)",
            color: "#fbbf24", fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Pending
          </span>
        )}
      </div>

      {isRegistered ? (
        <div style={{ animation: "erc-fade-in 0.4s ease forwards" }}>
          <StatRow label="Token ID" value={`#${tokenId}`} highlight />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
          <StatRow label="Reputation" value={reputationScore != null ? `${reputationScore} pts` : "—"} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
          <StatRow label="Validations" value={String(validationCount)} />
          {registeredAt && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
              <StatRow label="Since" value={new Date(registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
            </>
          )}
        </div>
      ) : (
        <div style={{ animation: "erc-fade-in 0.3s ease forwards" }}>
          <p style={{
            fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5,
            fontFamily: mono, margin: "0 0 14px 0",
          }}>
            Your agent will be registered on-chain at deploy. Manual registration available below.
          </p>
          <button
            onClick={handleRegister}
            disabled={registering}
            onMouseEnter={() => !registering && setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid rgba(99,102,241,0.25)",
              background: registering
                ? "rgba(99,102,241,0.15)"
                : "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(139,92,246,0.20))",
              color: registering ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.85)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: mono,
              cursor: registering ? "wait" : "pointer",
              transform: isHovering && !registering ? "translateY(-1px)" : "translateY(0)",
              boxShadow: isHovering && !registering ? "0 6px 20px rgba(99,102,241,0.25)" : "none",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              letterSpacing: "0.02em",
            }}
          >
            {registering ? <><Spinner />Registering…</> : "Register On-Chain"}
          </button>
          {error && (
            <div style={{
              fontSize: 11, color: "rgba(255,69,58,0.85)", fontFamily: mono,
              padding: "8px 12px", background: "rgba(255,69,58,0.06)", borderRadius: 8,
              border: "1px solid rgba(255,69,58,0.15)", marginTop: 10,
              animation: "erc-fade-in 0.2s ease forwards",
            }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
