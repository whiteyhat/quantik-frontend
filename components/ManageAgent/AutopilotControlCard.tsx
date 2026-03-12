"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api, type WalletBalance } from "@/lib/api";
import { AutopilotStatusBar } from "@/components/AutopilotStatusBar";
import { ScannerFeed } from "@/components/ScannerFeed";
import { ExecutionLog } from "@/components/ExecutionLog";
import { TelegramWebhookEditor } from "@/components/TelegramWebhookEditor";
import {
  AutopilotOnboardingModal,
  isAutopilotOnboarded,
} from "./AutopilotOnboardingModal";

const AUTOPILOT_PULSE_KEY = "autopilot_pulse_dismissed";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const panelStyle: React.CSSProperties = {
  background: "radial-gradient(circle at top left, rgba(255,122,69,0.22), transparent 42%), linear-gradient(135deg, rgba(20,33,61,0.96), rgba(14,18,28,0.94))",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
};

const mono: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

interface FundingState {
  address: string | null;
  pol: number;
  onChainUsdc: number;
  fundingStatus: WalletBalance["fundingStatus"];
  fundingMessage: string;
}

interface AutopilotControlCardProps {
  wallet: WalletBalance | null;
  onWalletRefresh: () => Promise<WalletBalance | null>;
}

function readinessColor(ready: boolean): string {
  return ready ? "#30d158" : "#ff9f0a";
}

function formatAmount(value: number | null | undefined, digits = 2): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0.00";
  return value.toFixed(digits);
}

function statusLabelKey(status: string): string | null {
  switch (status) {
    case "ready": return "funded";
    case "funding_required": return "unfunded";
    case "unavailable": return "unavailable";
    case "no_wallet": return "noWallet";
    default: return null;
  }
}

export function AutopilotControlCard({ wallet, onWalletRefresh }: AutopilotControlCardProps) {
  const t = useTranslations("autopilot");
  const tc = useTranslations("common");
  const myAgent = useQuantikStore((s) => s.myAgent);
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const agentWallet = myAgent?.wallet_address ?? null;
  const defaultFundingStatus = agentWallet ? "funding_required" : "no_wallet";
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showFundingDialog, setShowFundingDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPulse, setShowPulse] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOPILOT_PULSE_KEY) !== "true";
  });
  const [fundingState, setFundingState] = useState<FundingState>({
    address: wallet?.address ?? agentWallet,
    pol: wallet?.pol ?? 0,
    onChainUsdc: wallet?.onChainUsdc ?? wallet?.usdc ?? 0,
    fundingStatus: wallet?.fundingStatus ?? defaultFundingStatus,
    fundingMessage: wallet?.fundingMessage ?? t("autopilotDesc"),
  });

  const autopilotEnabled = Boolean(myAgent?.autopilot_enabled);
  const fundingReady = useMemo(() => {
    const nextPol = wallet?.pol ?? fundingState.pol ?? 0;
    const nextUsdc = wallet?.onChainUsdc ?? wallet?.usdc ?? fundingState.onChainUsdc ?? 0;
    const nextStatus = wallet?.fundingStatus ?? fundingState.fundingStatus;
    return nextStatus === "ready" && nextPol > 0 && nextUsdc > 0;
  }, [fundingState, wallet]);

  useEffect(() => {
    if (!wallet) return;
    setFundingState((prev) => ({
      address: wallet.address ?? prev.address ?? agentWallet,
      pol: wallet.pol ?? prev.pol,
      onChainUsdc: wallet.onChainUsdc ?? wallet.usdc ?? prev.onChainUsdc,
      fundingStatus: wallet.fundingStatus ?? prev.fundingStatus,
      fundingMessage: wallet.fundingMessage ?? prev.fundingMessage,
    }));
  }, [wallet, agentWallet]);

  if (!myAgent) return null;

  const updateFundingState = (nextWallet: WalletBalance | null, fallbackMessage?: string) => {
    setFundingState({
      address: nextWallet?.address ?? fundingState.address ?? agentWallet,
      pol: nextWallet?.pol ?? fundingState.pol ?? 0,
      onChainUsdc: nextWallet?.onChainUsdc ?? nextWallet?.usdc ?? fundingState.onChainUsdc ?? 0,
      fundingStatus: nextWallet?.fundingStatus ?? fundingState.fundingStatus ?? defaultFundingStatus,
      fundingMessage: nextWallet?.fundingMessage ?? fallbackMessage ?? fundingState.fundingMessage,
    });
  };

  const persistAutopilot = async (enabled: boolean) => {
    setError(null);
    const result = await api.updateAutopilot(myAgent.id, enabled);
    const nextAgent = {
      ...myAgent,
      autopilot_enabled: result.autopilot_enabled,
      autopilot_updated_at: result.autopilot_updated_at,
    };

    if (enabled && myAgent.status !== "active") {
      const deploy = await api.deployAgent(myAgent.id);
      setMyAgent({
        ...nextAgent,
        status: deploy.status,
        deployed_at: deploy.deployed_at,
      });
      return;
    }

    setMyAgent(nextAgent);
  };

  const handleEnable = async () => {
    const refreshed = await onWalletRefresh();
    updateFundingState(refreshed);
    const nextPol = refreshed?.pol ?? 0;
    const nextUsdc = refreshed?.onChainUsdc ?? refreshed?.usdc ?? 0;
    const nextStatus = refreshed?.fundingStatus ?? defaultFundingStatus;
    if (nextStatus !== "ready" || nextPol <= 0 || nextUsdc <= 0) {
      setShowFundingDialog(true);
      return;
    }

    if (!isAutopilotOnboarded()) {
      setShowOnboardingModal(true);
      return;
    }

    await persistAutopilot(true);
  };

  const handleToggle = (enabled: boolean) => {
    if (showPulse) {
      setShowPulse(false);
      localStorage.setItem(AUTOPILOT_PULSE_KEY, "true");
    }
    void (async () => {
      setIsSaving(true);
      try {
        if (enabled) {
          await handleEnable();
          return;
        }
        await persistAutopilot(false);
      } catch (err) {
        const typedError = err as Error & {
          code?: string;
          data?: Record<string, unknown> | null;
        };
        if (typedError.code === "AUTOPILOT_FUNDING_REQUIRED") {
          setFundingState({
            address: typeof typedError.data?.wallet_address === "string" ? typedError.data.wallet_address : wallet?.address ?? agentWallet,
            pol: Number(typedError.data?.pol ?? wallet?.pol ?? 0),
            onChainUsdc: Number(typedError.data?.on_chain_usdc ?? wallet?.onChainUsdc ?? wallet?.usdc ?? 0),
            fundingStatus: "funding_required",
            fundingMessage: typeof typedError.data?.funding_message === "string"
              ? typedError.data.funding_message
              : typedError.message,
          });
          setShowFundingDialog(true);
          return;
        }
        setError(typedError.message);
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleOnboardingConfirm = () => {
    setShowOnboardingModal(false);
    void (async () => {
      setIsSaving(true);
      try {
        await persistAutopilot(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const resolvedAddress = fundingState.address ?? agentWallet;

  const copyWalletAddress = async () => {
    if (!resolvedAddress) return;
    try {
      await navigator.clipboard.writeText(resolvedAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const chips = [
    {
      label: autopilotEnabled ? t("autopilotOn") : t("autopilotOff"),
      color: autopilotEnabled ? "#30d158" : "rgba(255,255,255,0.55)",
      background: autopilotEnabled ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.06)",
    },
    {
      label: fundingReady ? t("walletFunded") : t("fundingRequired"),
      color: readinessColor(fundingReady),
      background: fundingReady ? "rgba(48,209,88,0.12)" : "rgba(255,159,10,0.12)",
    },
    {
      label: myAgent.status === "active" ? t("agentActive") : t("agentStatus", { status: myAgent.status }),
      color: myAgent.status === "active" ? "#0a84ff" : "rgba(255,255,255,0.60)",
      background: myAgent.status === "active" ? "rgba(10,132,255,0.14)" : "rgba(255,255,255,0.06)",
    },
  ];

  return (
    <>
      <div style={panelStyle} data-testid="autopilot-control-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(255,122,69,0.35), rgba(10,132,255,0.24))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 10px 24px rgba(255,122,69,0.18)",
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t("autonomousTrading")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.96)", letterSpacing: "-0.02em" }}>
                  {t("autopilotControl")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.6, maxWidth: 440 }}>
              {t("autopilotDesc")}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  style={{
                    ...mono,
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    borderRadius: 999,
                    color: chip.color,
                    background: chip.background,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          <ToggleSwitch
            checked={autopilotEnabled}
            onChange={handleToggle}
            disabled={isSaving || myAgent.status === "terminated"}
            pulse={showPulse && !autopilotEnabled}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "POL", value: `${formatAmount(wallet?.pol ?? fundingState.pol, 4)} POL`, hint: t("polFeeToken") },
            { label: "USDC.e", value: `$${formatAmount(wallet?.onChainUsdc ?? wallet?.usdc ?? fundingState.onChainUsdc)}`, hint: t("usdcTradingCapital") },
            { label: t("status"), value: (() => { const key = statusLabelKey(wallet?.fundingStatus ?? fundingState.fundingStatus ?? defaultFundingStatus); return key ? t(key as any) : (wallet?.fundingStatus ?? fundingState.fundingStatus ?? defaultFundingStatus).toUpperCase(); })(), hint: wallet?.fundingMessage ?? fundingState.fundingMessage },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ ...mono, fontSize: 14, color: "rgba(255,255,255,0.88)", fontWeight: 700 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 4, lineHeight: 1.4 }}>
                {item.hint}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 12, ...mono, fontSize: 11, color: "#ff453a" }}>
            {error}
          </div>
        )}

        {autopilotEnabled && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              <AutopilotStatusBar />
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.46)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {t("liveScanner")}
              </div>
              <ScannerFeed />
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <ExecutionLog />
              <TelegramWebhookEditor />
            </div>
          </div>
        )}
      </div>

      <AutopilotOnboardingModal
        open={showOnboardingModal}
        onConfirm={handleOnboardingConfirm}
        onCancel={() => setShowOnboardingModal(false)}
      />

      <Dialog open={showFundingDialog} onOpenChange={setShowFundingDialog}>
        <DialogContent className="max-w-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("fundWalletTitle")}</DialogTitle>
            <DialogDescription>
              {t("fundWalletDesc")}
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "POL", value: `${formatAmount(fundingState.pol, 4)} POL`, hint: t("needsGreaterThanZero") },
              { label: "USDC.e", value: `$${formatAmount(fundingState.onChainUsdc)}`, hint: t("needsGreaterThanZero") },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{ ...mono, fontSize: 18, color: "rgba(255,255,255,0.92)", fontWeight: 700 }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4 }}>
                  {item.hint}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,122,69,0.08)",
              border: "1px solid rgba(255,122,69,0.18)",
            }}
          >
            <div style={{ ...mono, fontSize: 10, color: "#ff9f0a", textTransform: "uppercase", marginBottom: 6 }}>
              {t("depositAddress")}
            </div>
            <div style={{ ...mono, fontSize: 13, color: "rgba(255,255,255,0.84)", wordBreak: "break-all" }}>
              {resolvedAddress ?? t("noWalletAddress")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", marginTop: 8, lineHeight: 1.5 }}>
              {wallet?.fundingMessage ?? fundingState.fundingMessage}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowFundingDialog(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.72)",
                cursor: "pointer",
                ...mono,
              }}
            >
              {tc("close")}
            </button>
            <button
              type="button"
              onClick={copyWalletAddress}
              disabled={!resolvedAddress}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(10,132,255,0.30)",
                background: "rgba(10,132,255,0.14)",
                color: "#0a84ff",
                cursor: resolvedAddress ? "pointer" : "not-allowed",
                opacity: resolvedAddress ? 1 : 0.5,
                ...mono,
              }}
            >
              {copied ? t("addressCopied") : t("copyWalletAddress")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
