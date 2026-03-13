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

const AUTOPILOT_PULSE_KEY = "autopilot_pulse_dismissed";
const AP_STYLE_ID = "autopilot-particle-keyframes";

function ensureParticleKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(AP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = AP_STYLE_ID;
  style.textContent = `
    @keyframes ap-particle-rise {
      0%   { transform: translateY(0px) translateX(0px) scale(1); opacity: 0; }
      12%  { opacity: 1; }
      75%  { opacity: 0.7; }
      100% { transform: translateY(-72px) translateX(var(--ap-dx, 0px)) scale(0.15); opacity: 0; }
    }
    @keyframes ap-particle-drift {
      0%   { transform: translateY(0px) translateX(0px) scale(1); opacity: 0; }
      10%  { opacity: 0.8; }
      100% { transform: translateY(-40px) translateX(var(--ap-dx, 0px)) scale(0.4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Deterministic particle configs — no Math.random to avoid SSR/hydration mismatch
const PARTICLE_CONFIGS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${4 + ((i * 4.37 + 1.8) % 91)}%`,
  top: `${6 + ((i * 8.13 + 3.7) % 84)}%`,
  size: 2 + (i % 3),
  duration: `${3.2 + (i % 6) * 0.65}s`,
  delay: `${(i * 0.31) % 3.5}s`,
  anim: i % 2 === 0 ? "ap-particle-rise" : "ap-particle-drift",
  dx: `${-18 + (i % 8) * 5.5}px`,
  color:
    i % 4 === 0
      ? "rgba(255,122,69,0.65)"
      : i % 4 === 1
      ? "rgba(10,132,255,0.50)"
      : i % 4 === 2
      ? "rgba(255,159,10,0.55)"
      : "rgba(255,255,255,0.20)",
}));

const panelStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at top left, rgba(255,122,69,0.22), transparent 42%), linear-gradient(135deg, rgba(20,33,61,0.96), rgba(14,18,28,0.94))",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
  position: "relative",
  overflow: "hidden",
};

const mono: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

interface AutopilotControlCardProps {
  wallet: WalletBalance | null;
  onWalletRefresh?: () => Promise<WalletBalance | null>;
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
    case "ready":            return "funded";
    case "funding_required": return "unfunded";
    case "unavailable":      return "unavailable";
    case "no_wallet":        return "noWallet";
    default:                 return null;
  }
}

export function AutopilotControlCard({ wallet }: AutopilotControlCardProps) {
  const t = useTranslations("autopilot");
  const myAgent = useQuantikStore((s) => s.myAgent);
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const agentWallet = myAgent?.wallet_address ?? null;
  const defaultFundingStatus = agentWallet ? "funding_required" : "no_wallet";

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOPILOT_PULSE_KEY) !== "true";
  });

  useEffect(ensureParticleKeyframes, []);

  const fundingReady = useMemo(() => {
    const pol = wallet?.pol ?? 0;
    const usdc = wallet?.onChainUsdc ?? wallet?.usdc ?? 0;
    const status = wallet?.fundingStatus ?? defaultFundingStatus;
    return status === "ready" && pol > 0 && usdc > 0;
  }, [wallet, defaultFundingStatus]);

  if (!myAgent) return null;

  // Hide entirely until polymarket is fully ready (funded + contracts signed)
  if (!myAgent.polymarket_ready) return null;

  const autopilotEnabled = Boolean(myAgent?.autopilot_enabled);

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

  const handleToggle = (enabled: boolean) => {
    if (showPulse) {
      setShowPulse(false);
      localStorage.setItem(AUTOPILOT_PULSE_KEY, "true");
    }
    void (async () => {
      setIsSaving(true);
      try {
        await persistAutopilot(enabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
    })();
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
      label:
        myAgent.status === "active"
          ? t("agentActive")
          : t("agentStatus", { status: myAgent.status }),
      color: myAgent.status === "active" ? "#0a84ff" : "rgba(255,255,255,0.60)",
      background:
        myAgent.status === "active" ? "rgba(10,132,255,0.14)" : "rgba(255,255,255,0.06)",
    },
  ];

  return (
    <div
      style={panelStyle}
      data-testid="autopilot-control-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Particle layer — visible on hover, pointer-events none */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: 18,
          overflow: "hidden",
          transition: "opacity 400ms ease",
          opacity: isHovered ? 1 : 0,
        }}
      >
        {PARTICLE_CONFIGS.map((p) => (
          <div
            key={p.id}
            style={
              {
                position: "absolute",
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                "--ap-dx": p.dx,
                animation: isHovered
                  ? `${p.anim} ${p.duration} ${p.delay} ease-out infinite`
                  : "none",
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Card content */}
      <div style={{ position: "relative", zIndex: 1 }}>
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
                <div
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
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
            {
              label: "POL",
              value: `${formatAmount(wallet?.pol, 4)} POL`,
              hint: t("polFeeToken"),
            },
            {
              label: "USDC.e",
              value: `$${formatAmount(wallet?.onChainUsdc ?? wallet?.usdc)}`,
              hint: t("usdcTradingCapital"),
            },
            {
              label: t("status"),
              value: (() => {
                const key = statusLabelKey(wallet?.fundingStatus ?? defaultFundingStatus);
                return key
                  ? t(key as Parameters<typeof t>[0])
                  : (wallet?.fundingStatus ?? defaultFundingStatus).toUpperCase();
              })(),
              hint: wallet?.fundingMessage ?? t("autopilotDesc"),
            },
          ].map((item) => (
            <div key={item.label}>
              <div
                style={{
                  ...mono,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
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
              <div
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.46)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
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
    </div>
  );
}
