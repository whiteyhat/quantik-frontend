"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";

// ── CSS keyframes injected once ──────────────────────────────────────────────

const STYLE_ID = "polymarket-stepper-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes pm-pulse-border {
      0%, 100% { border-color: rgba(255,159,10,0.35); box-shadow: 0 0 0 0 rgba(255,159,10,0); }
      50% { border-color: rgba(255,69,58,0.55); box-shadow: 0 0 24px 4px rgba(255,69,58,0.12); }
    }
    @keyframes pm-glow-dot {
      0%, 100% { box-shadow: 0 0 4px 1px rgba(255,159,10,0.4); }
      50% { box-shadow: 0 0 10px 3px rgba(255,69,58,0.6); }
    }
    @keyframes pm-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pm-check-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes pm-copy-ripple {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,200,130,0.5); }
      50% { transform: scale(1.04); box-shadow: 0 0 0 6px rgba(0,200,130,0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,200,130,0); }
    }
    @keyframes pm-copy-toast-in {
      0% { opacity: 0; transform: translateY(6px) scale(0.92); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pm-copy-toast-out {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-6px) scale(0.92); }
    }
    @keyframes pm-copy-check {
      0% { stroke-dashoffset: 20; opacity: 0; }
      40% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface VerifyResult {
  status: string;
  polymarketReady: boolean;
  balances: { pol: number; usdc: number; polSufficient: boolean; usdcSufficient: boolean };
  approvals?: { allPassed: boolean; details: unknown };
  missingItems?: string[];
  error?: string;
}

interface Props {
  agentId: string;
  walletAddress: string | null;
  polymarketReady?: boolean;
  polymarketStatus?: string;
}

// ── Fonts ────────────────────────────────────────────────────────────────────

const mono = '"SF Mono", "JetBrains Mono", monospace';

// ── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step, currentStep, label }: { step: 1 | 2; currentStep: 1 | 2; label: string }) {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
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
          ...(isComplete
            ? { animation: "pm-check-pop 400ms ease forwards" }
            : {}),
        }}
      >
        {isComplete ? "✓" : step}
      </div>
      <span
        style={{
          fontSize: 12,
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

function CheckItem({
  label,
  sublabel,
  checked,
  value,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  value?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: checked ? "rgba(48,209,88,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${checked ? "rgba(48,209,88,0.18)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12,
        transition: "all 300ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            background: checked ? "rgba(48,209,88,0.20)" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${checked ? "#30d158" : "rgba(255,255,255,0.12)"}`,
            color: checked ? "#30d158" : "rgba(255,255,255,0.15)",
            transition: "all 300ms ease",
          }}
        >
          {checked ? "✓" : ""}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1, fontFamily: mono }}>
            {sublabel}
          </div>
        </div>
      </div>
      {value && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: mono,
            color: checked ? "#30d158" : "#ff453a",
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PolymarketStatusCard({ agentId, walletAddress, polymarketReady, polymarketStatus }: Props) {
  const t = useTranslations("polymarket");
  const tc = useTranslations("common");
  useEffect(ensureKeyframes, []);

  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const myAgent = useQuantikStore((s) => s.myAgent);

  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFading, setCopyFading] = useState(false);

  // Wallet re-assignment state (for when walletAddress is null or private key is missing)
  const [showWalletAssign, setShowWalletAssign] = useState(false);
  const [assignAddress, setAssignAddress] = useState("");
  const [assignPrivateKey, setAssignPrivateKey] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Show wallet assignment panel automatically when wallet is not assigned
  useEffect(() => {
    if (!walletAddress) setShowWalletAssign(true);
  }, [walletAddress]);

  const handleCopyWallet = useCallback(() => {
    if (!walletAddress || copied) return;
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setCopyFading(false);
    setTimeout(() => setCopyFading(true), 1400);
    setTimeout(() => { setCopied(false); setCopyFading(false); }, 1900);
  }, [walletAddress, copied]);

  const isReady = result?.polymarketReady ?? polymarketReady ?? false;

  // Determine which step we're on
  const fundingPassed = result?.balances
    ? result.balances.polSufficient && result.balances.usdcSufficient
    : polymarketStatus === "ready" || polymarketStatus === "approving";
  // Never advance to step 2 if wallet isn't assigned
  const currentStep: 1 | 2 = (fundingPassed && !!walletAddress) ? 2 : 1;

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const data = await api.verifyPolymarket(agentId);
      setResult(data);
      // When fully verified, update store so AutopilotControlCard becomes visible
      if (data.polymarketReady && myAgent) {
        setMyAgent({ ...myAgent, polymarket_ready: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      // If error is about missing private key, prompt to re-assign wallet
      if (msg.includes("private key") || msg.includes("no wallet")) {
        setShowWalletAssign(true);
      }
      setResult({
        status: "approval_failed",
        polymarketReady: false,
        balances: { pol: 0, usdc: 0, polSufficient: false, usdcSufficient: false },
        error: msg,
      });
    } finally {
      setVerifying(false);
    }
  }, [agentId, myAgent, setMyAgent]);

  const handleAssignWallet = useCallback(async () => {
    if (!assignAddress || !/^0x[0-9a-fA-F]{40}$/.test(assignAddress)) {
      setAssignError("Enter a valid 0x EVM wallet address");
      return;
    }
    setAssigning(true);
    setAssignError(null);
    try {
      await api.assignWallet(agentId, assignAddress, assignPrivateKey || undefined);
      // Update store so the wallet address propagates everywhere
      if (myAgent) {
        setMyAgent({ ...myAgent, wallet_address: assignAddress, polymarket_status: "pending_funding" as any, polymarket_ready: false });
      }
      setShowWalletAssign(false);
      setAssignPrivateKey("");
      setResult(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign wallet");
    } finally {
      setAssigning(false);
    }
  }, [agentId, assignAddress, assignPrivateKey, myAgent, setMyAgent]);

  // Don't render if fully ready (component disappears)
  if (isReady) return null;

  const polChecked = result?.balances?.polSufficient ?? false;
  const usdcChecked = result?.balances?.usdcSufficient ?? false;
  const approvalsChecked = result?.approvals?.allPassed ?? false;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(20,22,30,0.98), rgba(14,16,24,0.96))",
        border: "1.5px solid rgba(255,159,10,0.35)",
        borderRadius: 20,
        padding: 0,
        overflow: "hidden",
        animation: "pm-pulse-border 3s ease-in-out infinite",
        position: "relative",
      }}
    >
      {/* Top warning shimmer bar */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, transparent, rgba(255,159,10,0.6), rgba(255,69,58,0.6), transparent)",
          backgroundSize: "200% 100%",
          animation: "pm-shimmer 2.5s linear infinite",
        }}
      />

      {/* Header */}
      <div style={{ padding: "18px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ff9f0a, #ff453a)",
                animation: "pm-glow-dot 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "-0.01em",
              }}
            >
              {t("setupRequired")}
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#ff9f0a",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: mono,
              padding: "3px 8px",
              background: "rgba(255,159,10,0.10)",
              borderRadius: 6,
              border: "1px solid rgba(255,159,10,0.20)",
            }}
          >
            {t("blocker")}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {t("completeSteps")}
        </p>
      </div>

      {/* Stepper indicators */}
      <div style={{ padding: "0 22px", display: "flex", alignItems: "center", gap: 0, marginBottom: 18 }}>
        <StepIndicator step={1} currentStep={currentStep} label={t("fundWallet")} />
        <div
          style={{
            flex: 1,
            height: 1,
            margin: "0 12px",
            background: fundingPassed
              ? "rgba(48,209,88,0.30)"
              : "rgba(255,255,255,0.08)",
            transition: "background 400ms ease",
          }}
        />
        <StepIndicator step={2} currentStep={currentStep} label={t("setupTitle")} />
      </div>

      {/* Step content */}
      <div style={{ padding: "0 22px" }}>
        {currentStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Wallet address */}
            {walletAddress && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: mono }}>{t("depositTo")}</span>
                  <span style={{ fontSize: 12, fontFamily: mono, color: "rgba(255,255,255,0.60)" }}>
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  {/* Floating toast */}
                  {copied && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        right: 0,
                        background: "rgba(0,200,130,0.12)",
                        border: "1px solid rgba(0,200,130,0.35)",
                        borderRadius: 8,
                        padding: "5px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        animation: copyFading
                          ? "pm-copy-toast-out 0.4s ease forwards"
                          : "pm-copy-toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <polyline
                          points="2,6 5,9 10,3"
                          stroke="#00c882"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="20"
                          style={{ animation: "pm-copy-check 0.3s ease forwards" }}
                        />
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#00c882", fontFamily: mono, letterSpacing: "0.05em" }}>
                        COPIED
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleCopyWallet}
                    style={{
                      background: copied ? "rgba(0,200,130,0.12)" : "rgba(255,255,255,0.06)",
                      border: copied ? "1px solid rgba(0,200,130,0.35)" : "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: "3px 8px",
                      color: copied ? "#00c882" : "rgba(255,255,255,0.50)",
                      fontSize: 10,
                      fontWeight: 700,
                      outline: "none",
                      transition: "background 0.2s, border-color 0.2s, color 0.2s",
                      animation: copied ? "pm-copy-ripple 0.5s ease" : undefined,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      letterSpacing: "0.04em",
                      fontFamily: mono,
                    }}
                    title={tc("copy")}
                  >
                    {copied ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline
                            points="1.5,5 4,7.5 8.5,2"
                            stroke="#00c882"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="20"
                            style={{ animation: "pm-copy-check 0.3s ease forwards" }}
                          />
                        </svg>
                        {tc("copy")}
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <rect x="3" y="1" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                          <rect x="1" y="3" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="rgba(0,0,0,0.3)" />
                        </svg>
                        {tc("copy")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <CheckItem
              label={t("polGas")}
              sublabel={t("polMin")}
              checked={polChecked}
              value={result?.balances ? `${result.balances.pol.toFixed(4)} POL` : undefined}
            />
            <CheckItem
              label={t("usdcCapital")}
              sublabel={t("usdcMin")}
              checked={usdcChecked}
              value={result?.balances ? `$${result.balances.usdc.toFixed(2)}` : undefined}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CheckItem
              label={t("usdcCtf")}
              sublabel={t("approveCtf")}
              checked={approvalsChecked}
            />
            <CheckItem
              label={t("usdcExchange")}
              sublabel={t("approveExchange")}
              checked={approvalsChecked}
            />
            <CheckItem
              label={t("ctfExchange")}
              sublabel={t("approveCtfTransfers")}
              checked={approvalsChecked}
            />
            <CheckItem
              label={t("usdcNegRisk")}
              sublabel={t("approveNegRiskUsdc")}
              checked={approvalsChecked}
            />
            <CheckItem
              label={t("ctfNegRisk")}
              sublabel={t("approveNegRiskCtf")}
              checked={approvalsChecked}
            />
            <CheckItem
              label={t("negRiskCtf")}
              sublabel={t("approveNegRiskCtfTokens")}
              checked={approvalsChecked}
            />
          </div>
        )}
      </div>

      {/* Error display */}
      {result?.error && (
        <div
          style={{
            margin: "12px 22px 0",
            padding: "10px 14px",
            background: "rgba(255,69,58,0.06)",
            border: "1px solid rgba(255,69,58,0.18)",
            borderRadius: 10,
            fontSize: 11,
            color: "rgba(255,69,58,0.80)",
            fontFamily: mono,
          }}
        >
          {result.error}
        </div>
      )}

      {/* Wallet assignment panel — shown when wallet is not assigned or private key is missing */}
      {showWalletAssign && (
        <div
          style={{
            margin: "0 22px 16px",
            padding: "14px 16px",
            background: "rgba(10,132,255,0.06)",
            border: "1px solid rgba(10,132,255,0.20)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0a84ff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontFamily: mono }}>
            {walletAddress ? "Re-assign Wallet Credentials" : "Assign Wallet"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="Wallet address (0x...)"
              value={assignAddress}
              onChange={(e) => setAssignAddress(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "rgba(255,255,255,0.88)",
                fontSize: 12,
                fontFamily: mono,
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              placeholder="Private key (0x... — stored encrypted)"
              value={assignPrivateKey}
              onChange={(e) => setAssignPrivateKey(e.target.value)}
              type="password"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "8px 12px",
                color: "rgba(255,255,255,0.88)",
                fontSize: 12,
                fontFamily: mono,
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          {assignError && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#ff453a", fontFamily: mono }}>{assignError}</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={handleAssignWallet}
              disabled={assigning}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 8,
                border: "1px solid rgba(10,132,255,0.35)",
                background: assigning ? "rgba(255,255,255,0.04)" : "rgba(10,132,255,0.18)",
                color: assigning ? "rgba(255,255,255,0.30)" : "#0a84ff",
                fontSize: 12,
                fontWeight: 700,
                cursor: assigning ? "not-allowed" : "pointer",
                fontFamily: mono,
                letterSpacing: "0.04em",
              }}
            >
              {assigning ? "Saving..." : "Save Wallet"}
            </button>
            {walletAddress && (
              <button
                onClick={() => { setShowWalletAssign(false); setAssignError(null); }}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: mono,
                }}
              >
                {tc("cancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Verify button */}
      <div style={{ padding: "16px 22px 20px" }}>
        {!walletAddress && !showWalletAssign && (
          <button
            onClick={() => setShowWalletAssign(true)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: "10px 24px",
              borderRadius: 10,
              background: "rgba(10,132,255,0.12)",
              border: "1px solid rgba(10,132,255,0.25)",
              color: "#0a84ff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: mono,
              textTransform: "uppercase",
            }}
          >
            Assign Wallet
          </button>
        )}
        <button
          onClick={handleVerify}
          disabled={verifying || !walletAddress}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: 12,
            background: (verifying || !walletAddress)
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(255,159,10,0.90), rgba(255,100,20,0.90))",
            border: (verifying || !walletAddress)
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(255,159,10,0.50)",
            color: (verifying || !walletAddress) ? "rgba(255,255,255,0.30)" : "#fff",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor: (verifying || !walletAddress) ? "not-allowed" : "pointer",
            transition: "all 250ms ease",
            outline: "none",
            boxShadow: (verifying || !walletAddress) ? "none" : "0 4px 20px rgba(255,159,10,0.25)",
            textTransform: "uppercase",
          }}
        >
          {verifying
            ? currentStep === 1
              ? t("checkingBalances")
              : t("runningApprovals")
            : t("verify")}
        </button>
      </div>
    </div>
  );
}
