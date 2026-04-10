"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bridgeApi, type BridgeQuote, type BridgeTransfer, type BridgeStatus } from "@/lib/api";
import { StellarWalletConnect } from "@/components/StellarWalletConnect";
import { useSocketEvent } from "@/context/SocketContext";
import { signTransaction } from "@stellar/freighter-api";

const mono = '"SF Mono", "JetBrains Mono", monospace';

// ── Step Indicator ──────────────────────────────────────────────────────────

const STEPS: { key: BridgeStatus[]; label: string }[] = [
  { key: ["pending"], label: "Connect & Deposit" },
  { key: ["stellar_tx_submitted", "bridging"], label: "Bridging" },
  { key: ["bridge_complete", "approving"], label: "Approving" },
  { key: ["ready"], label: "Ready" },
];

function getStepIndex(status: BridgeStatus): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].key.includes(status)) return i;
  }
  return 0;
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          fontFamily: mono,
          background: isComplete
            ? "rgba(48,209,88,0.20)"
            : isActive
              ? "rgba(255,159,10,0.20)"
              : "rgba(255,255,255,0.04)",
          border: `2px solid ${
            isComplete
              ? "rgba(48,209,88,0.50)"
              : isActive
                ? "rgba(255,159,10,0.50)"
                : "rgba(255,255,255,0.10)"
          }`,
          color: isComplete ? "#30d158" : isActive ? "#ff9f0a" : "rgba(255,255,255,0.25)",
          transition: "all 400ms ease",
        }}
      >
        {isComplete ? "✓" : step + 1}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: mono,
          color: isComplete
            ? "rgba(48,209,88,0.70)"
            : isActive
              ? "rgba(255,255,255,0.80)"
              : "rgba(255,255,255,0.25)",
          transition: "color 400ms ease",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Status Pill ─────────────────────────────────────────────────────────────

function statusPill(label: string, color: string) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "4px 10px",
      }}
    >
      {label}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface Props {
  agentId: string;
  walletAddress: string | null;
  stellarAddress: string | null;
}

export function BridgeStatusCard({ agentId, walletAddress, stellarAddress }: Props) {
  const [freighterAddress, setFreighterAddress] = useState<string | null>(stellarAddress);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<BridgeTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bridgeStatus: BridgeStatus = activeTransfer?.status ?? "pending";
  const currentStep = getStepIndex(bridgeStatus);
  const isReady = bridgeStatus === "ready";
  const isFailed = bridgeStatus === "failed";

  // ── Socket.IO listeners ─────────────────────────────────────────────────
  // Use refs to avoid re-subscription cascade: handler is stable (empty deps),
  // reads current values from refs instead of closing over state.

  const activeTransferRef = useRef(activeTransfer);
  useEffect(() => { activeTransferRef.current = activeTransfer; }, [activeTransfer]);

  const agentIdRef = useRef(agentId);
  useEffect(() => { agentIdRef.current = agentId; }, [agentId]);

  const handleBridgeEvent = useCallback((data: { transferId?: string; agentId?: string; error?: string }) => {
    if (data.agentId && data.agentId !== agentIdRef.current) return;
    const current = activeTransferRef.current;
    if (data.transferId && current && data.transferId !== current.id) return;
    if (current?.id) {
      bridgeApi.getStatus(current.id).then(setActiveTransfer).catch(() => {});
    }
  }, []);

  useSocketEvent("bridge:initiated", handleBridgeEvent);
  useSocketEvent("bridge:bridging", handleBridgeEvent);
  useSocketEvent("bridge:complete", handleBridgeEvent);
  useSocketEvent("bridge:approving", handleBridgeEvent);
  useSocketEvent("bridge:ready", handleBridgeEvent);
  useSocketEvent("bridge:failed", handleBridgeEvent);
  useSocketEvent("bridge:approval_failed", handleBridgeEvent);

  // ── Load existing active transfer ───────────────────────────────────────

  useEffect(() => {
    bridgeApi.getHistory().then((transfers) => {
      const active = transfers.find(
        (t) => t.agentId === agentId && !["ready", "failed"].includes(t.status)
      );
      if (active) setActiveTransfer(active);
      // Also check if we have a ready transfer
      const ready = transfers.find(
        (t) => t.agentId === agentId && t.status === "ready"
      );
      if (ready && !active) setActiveTransfer(ready);
    }).catch(() => {});
  }, [agentId]);

  // ── Get quote ───────────────────────────────────────────────────────────

  async function handleGetQuote() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    setQuoteLoading(true);
    setError(null);
    try {
      const q = await bridgeApi.getQuote(numAmount);
      setQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  }

  // ── Initiate bridge ─────────────────────────────────────────────────────

  async function handleBridge() {
    if (!quote || !freighterAddress) return;
    setBridgeLoading(true);
    setError(null);
    try {
      // 1. Build unsigned Stellar tx
      const { xdr, transferId } = await bridgeApi.buildTx(agentId, quote.amountIn);

      // 2. Sign with Freighter
      const signResult = await signTransaction(xdr, {
        networkPassphrase: "Test SDF Network ; September 2015",
      });

      if (!signResult.signedTxXdr) {
        throw new Error("Freighter signing was cancelled");
      }

      // 3. Submit signed tx
      const transfer = await bridgeApi.submit(agentId, transferId, signResult.signedTxXdr);
      setActiveTransfer(transfer);
      setQuote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bridge failed");
    } finally {
      setBridgeLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--glass-surface)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Stellar → Polygon
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            Cross-Chain Bridge
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {statusPill(
            isReady ? "READY" : isFailed ? "FAILED" : "SETUP",
            isReady ? "var(--ios-green)" : isFailed ? "var(--ios-red)" : "var(--ios-orange)"
          )}
          {statusPill("ALLBRIDGE", "var(--ios-blue)")}
        </div>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <StepIndicator key={s.label} step={i} currentStep={currentStep} label={s.label} />
        ))}
      </div>

      {/* Dual-chain addresses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Stellar Address</div>
          <div style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: mono, wordBreak: "break-all", lineHeight: 1.5 }}>
            {freighterAddress ?? "Not connected"}
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Polygon Address</div>
          <div style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: mono, wordBreak: "break-all", lineHeight: 1.5 }}>
            {walletAddress ?? "Not generated"}
          </div>
        </div>
      </div>

      {/* Freighter Connect (if not connected) */}
      {!freighterAddress && (
        <div
          style={{
            padding: "14px",
            borderRadius: 14,
            background: "rgba(10,132,255,0.06)",
            border: "1px solid rgba(10,132,255,0.18)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>
            Step 1: Connect Freighter
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
            Connect your Stellar wallet to bridge USDC to Polygon for Polymarket trading.
          </div>
          <StellarWalletConnect onConnected={(addr) => setFreighterAddress(addr)} />
        </div>
      )}

      {/* Bridge form (if connected but not yet bridging) */}
      {freighterAddress && !activeTransfer && (
        <div
          style={{
            padding: "14px",
            borderRadius: 14,
            background: "rgba(255,159,10,0.06)",
            border: "1px solid rgba(255,159,10,0.14)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>
            Step 2: Bridge USDC
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Enter the amount of USDC to bridge from Stellar to Polygon. Minimum 10 USDC.
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min="10"
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
              placeholder="Amount (USDC)"
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: mono,
                padding: "0 12px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => void handleGetQuote()}
              disabled={quoteLoading || !amount}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid rgba(10,132,255,0.28)",
                background: "rgba(10,132,255,0.12)",
                color: "var(--ios-blue)",
                fontSize: 12,
                fontWeight: 700,
                cursor: quoteLoading ? "wait" : "pointer",
              }}
            >
              {quoteLoading ? "..." : "Get Quote"}
            </button>
          </div>

          {/* Quote display */}
          {quote && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>Send</span>
                <span style={{ color: "var(--text-primary)", fontFamily: mono }}>{quote.amountIn} USDC</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>Bridge Fee</span>
                <span style={{ color: "#ff9f0a", fontFamily: mono }}>{quote.fee} USDC</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>Receive</span>
                <span style={{ color: "#30d158", fontWeight: 700, fontFamily: mono }}>{quote.amountOut} USDC</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>Est. Time</span>
                <span style={{ color: "var(--text-primary)" }}>~{quote.estimatedTimeMinutes} min</span>
              </div>

              <button
                type="button"
                onClick={() => void handleBridge()}
                disabled={bridgeLoading}
                style={{
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  border: "none",
                  cursor: bridgeLoading ? "wait" : "pointer",
                  marginTop: 6,
                }}
              >
                {bridgeLoading ? "Signing with Freighter..." : "Bridge USDC →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active transfer status */}
      {activeTransfer && (
        <div
          style={{
            padding: "14px",
            borderRadius: 14,
            background: isReady
              ? "rgba(48,209,88,0.06)"
              : isFailed
                ? "rgba(255,69,58,0.06)"
                : "rgba(10,132,255,0.06)",
            border: `1px solid ${
              isReady
                ? "rgba(48,209,88,0.18)"
                : isFailed
                  ? "rgba(255,69,58,0.18)"
                  : "rgba(10,132,255,0.18)"
            }`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>
            {isReady
              ? "Bridge Complete — Agent Ready to Trade"
              : isFailed
                ? "Bridge Failed"
                : "Bridge In Progress..."}
          </div>

          {!isReady && !isFailed && (
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  background: "linear-gradient(90deg, #007AFF, #00C6FF)",
                  width: `${Math.min(((currentStep + 1) / STEPS.length) * 100, 95)}%`,
                  transition: "width 600ms ease",
                }}
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
            <div style={{ color: "var(--text-secondary)" }}>
              Status: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {activeTransfer.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              Amount: <span style={{ color: "var(--text-primary)", fontWeight: 700, fontFamily: mono }}>
                {activeTransfer.amount} USDC
              </span>
            </div>
          </div>

          {activeTransfer.sourceTxHash && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Stellar TX:{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${activeTransfer.sourceTxHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--ios-blue)", fontFamily: mono, textDecoration: "none" }}
              >
                {activeTransfer.sourceTxHash.slice(0, 12)}...
              </a>
            </div>
          )}

          {isFailed && activeTransfer.error && (
            <div style={{ fontSize: 11, color: "var(--ios-red)", lineHeight: 1.5 }}>
              {activeTransfer.error}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{ fontSize: 11, color: "var(--ios-red)", padding: "8px 12px", borderRadius: 10, background: "rgba(255,69,58,0.06)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
