"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

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

  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const isReady = result?.polymarketReady ?? polymarketReady ?? false;

  // Determine which step we're on
  const fundingPassed = result?.balances
    ? result.balances.polSufficient && result.balances.usdcSufficient
    : polymarketStatus === "ready" || polymarketStatus === "approving";
  const currentStep: 1 | 2 = fundingPassed ? 2 : 1;

  const handleVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const data = await api.verifyPolymarket(agentId);
      setResult(data);
    } catch (err) {
      setResult({
        status: "approval_failed",
        polymarketReady: false,
        balances: { pol: 0, usdc: 0, polSufficient: false, usdcSufficient: false },
        error: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifying(false);
    }
  }, [agentId]);

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
                <button
                  onClick={() => navigator.clipboard?.writeText(walletAddress)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "3px 8px",
                    color: "rgba(255,255,255,0.50)",
                    fontSize: 10,
                    fontWeight: 600,
                    outline: "none",
                  }}
                  title={tc("copy")}
                >
                  {tc("copy")}
                </button>
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

      {/* Verify button */}
      <div style={{ padding: "16px 22px 20px" }}>
        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: 12,
            background: verifying
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(255,159,10,0.90), rgba(255,100,20,0.90))",
            border: verifying
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(255,159,10,0.50)",
            color: verifying ? "rgba(255,255,255,0.30)" : "#fff",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor: verifying ? "not-allowed" : "pointer",
            transition: "all 250ms ease",
            outline: "none",
            boxShadow: verifying ? "none" : "0 4px 20px rgba(255,159,10,0.25)",
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
