"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, Link2, ExternalLink } from "lucide-react";
import { BASE_URL, getAuthToken } from "@/lib/api";

const mono = '"SF Mono", "JetBrains Mono", monospace';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

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
    @keyframes erc-step-pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    @keyframes erc-hash-glow {
      0%, 100% { text-shadow: 0 0 4px rgba(99,102,241,0.3); }
      50% { text-shadow: 0 0 8px rgba(139,92,246,0.5); }
    }
    @keyframes erc-confetti-1 {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(-40px) rotate(180deg) scale(0); opacity: 0; }
    }
    @keyframes erc-confetti-2 {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(-35px) translateX(15px) rotate(-120deg) scale(0); opacity: 0; }
    }
    @keyframes erc-confetti-3 {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(-45px) translateX(-15px) rotate(240deg) scale(0); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

type RegistrationPhase = "idle" | "submitting" | "confirming" | "indexing" | "done";

const STEP_LABELS: Record<string, string> = {
  submitting: "Submitting transaction...",
  confirming: "Confirming on-chain...",
  indexing: "Indexing identity...",
};

const VISIBLE_STEPS: RegistrationPhase[] = ["submitting", "confirming", "indexing"];

const SUBMIT_UX_DELAY_MS = 600;
const INDEXING_UX_DELAY_MS = 800;

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

function Spinner({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "erc-spin 0.6s linear infinite",
      verticalAlign: "middle",
      flexShrink: 0,
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

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function etherscanTxUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

function RegistrationProgress({
  phase,
  txHash,
}: {
  phase: RegistrationPhase;
  txHash: string | null;
}) {
  const currentIdx = VISIBLE_STEPS.indexOf(phase);

  return (
    <div style={{ animation: "erc-fade-in 0.3s ease forwards" }}>
      {txHash && (
        <a
          href={etherscanTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            marginBottom: 14,
            borderRadius: 8,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.20)",
            textDecoration: "none",
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(99,102,241,0.14)";
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(99,102,241,0.08)";
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.20)";
          }}
        >
          <span style={{
            fontSize: 10,
            fontFamily: mono,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}>TX</span>
          <span style={{
            fontSize: 11,
            fontFamily: mono,
            color: "#a78bfa",
            fontWeight: 600,
            animation: "erc-hash-glow 2s ease-in-out infinite",
          }}>
            {truncateHash(txHash)}
          </span>
          <ExternalLink size={10} color="#8b5cf6" style={{ marginLeft: "auto", flexShrink: 0 }} />
        </a>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {VISIBLE_STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isComplete = i < currentIdx;
          const isPending = i > currentIdx;

          return (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: isComplete
                  ? "rgba(34,197,94,0.15)"
                  : isActive
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${
                  isComplete
                    ? "rgba(34,197,94,0.4)"
                    : isActive
                      ? "rgba(99,102,241,0.4)"
                      : "rgba(255,255,255,0.08)"
                }`,
                transition: "all 300ms ease",
              }}>
                {isComplete && (
                  <CheckCircle2 size={11} color="#22c55e" style={{ animation: "erc-check-pop 0.3s ease forwards" }} />
                )}
                {isActive && <Spinner size={10} color="#8b5cf6" />}
                {isPending && (
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                  }} />
                )}
              </div>

              <span style={{
                fontSize: 11,
                fontFamily: mono,
                fontWeight: isActive ? 600 : 400,
                color: isComplete
                  ? "rgba(34,197,94,0.8)"
                  : isActive
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.25)",
                transition: "all 300ms ease",
                animation: isActive ? "erc-step-pulse 2s ease-in-out infinite" : "none",
              }}>
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12,
        height: 3,
        borderRadius: 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          borderRadius: 2,
          background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)",
          width: `${Math.min(((currentIdx + 1) / VISIBLE_STEPS.length) * 100, 100)}%`,
          transition: "width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }} />
      </div>
    </div>
  );
}

function SuccessConfetti() {
  return (
    <div style={{ position: "absolute", top: 12, right: 16, pointerEvents: "none" }}>
      {["#22c55e", "#8b5cf6", "#fbbf24"].map((color, i) => (
        <span key={i} style={{
          position: "absolute",
          width: 5,
          height: 5,
          borderRadius: 1,
          background: color,
          animation: `erc-confetti-${i + 1} 0.8s ease forwards`,
          animationDelay: `${i * 0.1}s`,
          right: i * 8,
        }} />
      ))}
    </div>
  );
}

function EtherscanButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        padding: "9px 14px",
        borderRadius: 8,
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.18)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "all 200ms ease",
        marginTop: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(99,102,241,0.15)";
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.30)";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(99,102,241,0.08)";
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.18)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <ExternalLink size={11} color="#8b5cf6" />
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        fontFamily: mono,
        color: "#a78bfa",
        letterSpacing: "0.02em",
      }}>{label}</span>
    </a>
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
  const [phase, setPhase] = useState<RegistrationPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [etherscanUrl, setEtherscanUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const isRegistered = !!tokenId;
  const registering = phase !== "idle" && phase !== "done";

  const prevTokenId = useRef(tokenId);
  const [showGlow, setShowGlow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (!prevTokenId.current && tokenId) {
      setShowGlow(true);
      setShowConfetti(true);
      const t1 = setTimeout(() => setShowGlow(false), 3000);
      const t2 = setTimeout(() => setShowConfetti(false), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevTokenId.current = tokenId;
  }, [tokenId]);

  useEffect(() => { ensureKeyframes(); }, []);

  // Fetch etherscanUrl from backend when already registered (page refresh case)
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!isRegistered || !agentId || fetchedRef.current) return;
    fetchedRef.current = true;
    const controller = new AbortController();
    fetch(`${BASE_URL}/api/erc8004/identity/${agentId}`, { signal: controller.signal, headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.etherscanUrl) setEtherscanUrl(data.etherscanUrl);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isRegistered, agentId]);

  const handleRegister = useCallback(async () => {
    setPhase("submitting");
    setError(null);
    setTxHash(null);
    try {
      await new Promise((r) => setTimeout(r, SUBMIT_UX_DELAY_MS));
      setPhase("confirming");

      const res = await fetch(`${BASE_URL}/api/erc8004/register`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Registration failed (${res.status})`);
      }

      const data = await res.json();
      if (data.txHash) setTxHash(data.txHash);
      if (data.etherscanUrl) setEtherscanUrl(data.etherscanUrl);

      setPhase("indexing");
      await new Promise((r) => setTimeout(r, INDEXING_UX_DELAY_MS));

      setPhase("done");
      if (data.tokenId) {
        onRegistered?.(data.tokenId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setPhase("idle");
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
          : registering
            ? "none"
            : "erc-pulse-border 4s ease-in-out infinite",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {showConfetti && <SuccessConfetti />}

      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundImage: isRegistered
          ? "linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)"
          : registering
            ? "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(139,92,246,0.5), transparent)"
            : "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.3), transparent)",
        backgroundSize: "200% 100%",
        animation: "erc-shimmer 3s ease-in-out infinite",
        animationDuration: registering ? "1.5s" : "3s",
      }} />

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
        ) : registering ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
            background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)",
            color: "#8b5cf6", fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <Spinner size={8} color="#8b5cf6" />
            Registering
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
          <StatRow label="Reputation" value={reputationScore != null ? `${reputationScore} pts` : "\u2014"} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
          <StatRow label="Validations" value={String(validationCount)} />
          {registeredAt && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
              <StatRow label="Since" value={new Date(registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
            </>
          )}

          {txHash ? (
            <EtherscanButton href={etherscanTxUrl(txHash)} label="View Transaction on Etherscan" />
          ) : etherscanUrl ? (
            <EtherscanButton href={etherscanUrl} label="View Identity on Etherscan" />
          ) : null}
        </div>
      ) : registering ? (
        <RegistrationProgress phase={phase} txHash={txHash} />
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
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid rgba(99,102,241,0.25)",
              background: "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(139,92,246,0.20))",
              color: "rgba(255,255,255,0.85)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: mono,
              cursor: "pointer",
              transform: isHovering ? "translateY(-1px)" : "translateY(0)",
              boxShadow: isHovering ? "0 6px 20px rgba(99,102,241,0.25)" : "none",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              letterSpacing: "0.02em",
            }}
          >
            Register On-Chain
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
