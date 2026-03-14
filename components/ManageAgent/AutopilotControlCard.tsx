"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api, type AutopilotPolicyEnvelope, type WalletBalance } from "@/lib/api";
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
    @keyframes ap-emoji-float {
      0%   {
        transform: translate(0, 0) scale(var(--pscale)) rotate(var(--prot0));
        opacity: 0.9;
      }
      30%  {
        opacity: 0.82;
      }
      65%  {
        opacity: 0.45;
      }
      100% {
        transform: translate(var(--pdx), var(--pdy)) scale(calc(var(--pscale) * 0.3)) rotate(var(--prot1));
        opacity: 0;
        filter: blur(3px);
      }
    }
    @keyframes ap-emoji-burst {
      0%   {
        transform: translate(0, 0) scale(0.15) rotate(var(--prot0));
        opacity: 0;
      }
      15%  {
        opacity: 0.95;
        transform: translate(calc(var(--pdx)*0.12), calc(var(--pdy)*0.12)) scale(var(--pscale)) rotate(calc(var(--prot0) * 0.4));
      }
      60%  {
        opacity: 0.55;
      }
      100% {
        transform: translate(var(--pdx), var(--pdy)) scale(calc(var(--pscale) * 0.08)) rotate(var(--prot1));
        opacity: 0;
        filter: blur(4px);
      }
    }
  `;
  document.head.appendChild(style);
}

const MONEY_EMOJIS = ["💸", "💰", "🤑", "💎"];

// Weighted distribution: 💸 is most common, 💎 is rarest
const EMOJI_WEIGHTS = [
  { emoji: "💸", weight: 40 },
  { emoji: "💰", weight: 28 },
  { emoji: "🤑", weight: 22 },
  { emoji: "💎", weight: 10 },
];

function pickWeightedEmoji(): string {
  const total = EMOJI_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EMOJI_WEIGHTS) {
    r -= e.weight;
    if (r <= 0) return e.emoji;
  }
  return MONEY_EMOJIS[0];
}

interface EmojiParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  fontSize: number;
  emoji: string;
  duration: number;
  anim: string;
  rot0: number;
  rot1: number;
  scale: number;
}

let _particleId = 0;

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

interface PolicyDraft {
  cadenceMinutes: string;
  cooldownMinutes: string;
  maxTradesPerDay: string;
  maxBetUsdc: string;
}

function toPolicyDraft(policy: AutopilotPolicyEnvelope | undefined): PolicyDraft {
  return {
    cadenceMinutes: policy ? String(policy.effective.cadenceMinutes) : "",
    cooldownMinutes: policy ? String(policy.effective.cooldownMinutes) : "",
    maxTradesPerDay: policy ? String(policy.effective.maxTradesPerDay) : "",
    maxBetUsdc: policy ? String(policy.effective.maxBetUsdc) : "",
  };
}

export function AutopilotControlCard({ wallet }: AutopilotControlCardProps) {
  const t = useTranslations("autopilot");
  const myAgent = useQuantikStore((s) => s.myAgent);
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const agentWallet = myAgent?.wallet_address ?? null;
  const defaultFundingStatus = agentWallet ? "funding_required" : "no_wallet";

  const [isSaving, setIsSaving] = useState(false);
  const [isPolicySaving, setIsPolicySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(() => toPolicyDraft(myAgent?.autopilot_policy));

  useEffect(() => {
    api.getTelegramSettings().then((s) => {
      setTelegramConfigured(Boolean(s.chatId && s.botToken));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    setPolicyDraft(toPolicyDraft(myAgent?.autopilot_policy));
  }, [myAgent?.autopilot_policy]);

  useEffect(() => {
    if (!myAgent || myAgent.autopilot_policy) return;
    api.getAutopilotPolicy(myAgent.id)
      .then((policy) => {
        setMyAgent({
          ...myAgent,
          autopilot_policy: policy,
        });
      })
      .catch(() => {});
  }, [myAgent, setMyAgent]);
  const [isHovered, setIsHovered] = useState(false);
  const [emojiParticles, setEmojiParticles] = useState<EmojiParticle[]>([]);
  const lastSpawnRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPolicyOpen, setIsPolicyOpen] = useState(Boolean(myAgent?.autopilot_enabled));
  const [showPulse, setShowPulse] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOPILOT_PULSE_KEY) !== "true";
  });

  useEffect(ensureParticleKeyframes, []);
  useEffect(() => {
    setIsPolicyOpen(Boolean(myAgent?.autopilot_enabled));
  }, [myAgent?.autopilot_enabled]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Burst a few emojis on enter for a delightful pop
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const burst: EmojiParticle[] = Array.from({ length: 3 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
      const speed = 30 + Math.random() * 40;
      const fontSize = 16 + Math.random() * 44; // 16–60px
      const scale = 0.7 + Math.random() * 0.5;
      const rot0 = (Math.random() - 0.5) * 30;
      const rot1 = rot0 + (Math.random() - 0.5) * 120;
      return {
        id: ++_particleId,
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 40,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 20,
        fontSize,
        emoji: pickWeightedEmoji(),
        duration: 1800 + Math.random() * 1200,
        anim: "ap-emoji-burst",
        rot0,
        rot1,
        scale,
      };
    });
    setEmojiParticles(burst);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    // Throttle: spawn every 160ms → ~6 events/s, sparse and intentional
    if (now - lastSpawnRef.current < 160) return;
    lastSpawnRef.current = now;

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // always just 1 per event
    const count = 1;
    const newParticles: EmojiParticle[] = Array.from({ length: count }, () => {
      // Mostly upward + slight horizontal drift
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 18 + Math.random() * 28; // slower travel
      const fontSize = 10 + Math.random() * 50; // 10–60px — wide range
      const scale = 0.5 + Math.random() * 0.7;
      const rot0 = (Math.random() - 0.5) * 20;
      const rot1 = rot0 + (Math.random() - 0.5) * 140;
      const duration = 1600 + Math.random() * 1400; // 1.6s–3s
      return {
        id: ++_particleId,
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 12,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        fontSize,
        emoji: pickWeightedEmoji(),
        duration,
        anim: "ap-emoji-float",
        rot0,
        rot1,
        scale,
      };
    });

    setEmojiParticles((prev) => [...prev.slice(-28), ...newParticles]); // cap at 28 alive
  }, []);

  const removeParticle = useCallback((id: number) => {
    setEmojiParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const fundingReady = useMemo(() => {
    const status = wallet?.fundingStatus ?? defaultFundingStatus;
    return status === "ready";
  }, [wallet, defaultFundingStatus]);
  const autopilotEnabled = Boolean(myAgent?.autopilot_enabled);
  const policy = myAgent?.autopilot_policy;
  const policySummary = policy
    ? `${policy.effective.cadenceMinutes}m · ${policy.effective.maxTradesPerDay}/day · $${policy.effective.maxBetUsdc.toFixed(0)} max`
    : t("policyLoading");
  const policyDirty = useMemo(() => {
    if (!policy) return false;
    return (
      policyDraft.cadenceMinutes !== String(policy.effective.cadenceMinutes) ||
      policyDraft.cooldownMinutes !== String(policy.effective.cooldownMinutes) ||
      policyDraft.maxTradesPerDay !== String(policy.effective.maxTradesPerDay) ||
      policyDraft.maxBetUsdc !== String(policy.effective.maxBetUsdc)
    );
  }, [policy, policyDraft]);

  if (!myAgent) return null;

  // Hide entirely until polymarket is fully ready (funded + contracts signed)
  if (!myAgent.polymarket_ready) return null;

  const updatePolicyField = (field: keyof PolicyDraft, value: string) => {
    setPolicyDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetPolicyDraft = () => {
    setPolicyDraft(toPolicyDraft(policy));
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

  const persistPolicy = async () => {
    if (!policy) return;

    const normalizeNumber = (value: string): number | null => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const cadenceMinutes = normalizeNumber(policyDraft.cadenceMinutes);
    const cooldownMinutes = normalizeNumber(policyDraft.cooldownMinutes);
    const maxTradesPerDay = normalizeNumber(policyDraft.maxTradesPerDay);
    const maxBetUsdc = normalizeNumber(policyDraft.maxBetUsdc);

    const payload = {
      cadenceMinutes: cadenceMinutes === policy.derived.cadenceMinutes ? null : cadenceMinutes,
      cooldownMinutes: cooldownMinutes === policy.derived.cooldownMinutes ? null : cooldownMinutes,
      maxTradesPerDay: maxTradesPerDay === policy.derived.maxTradesPerDay ? null : maxTradesPerDay,
      maxBetUsdc: maxBetUsdc === policy.derived.maxBetUsdc ? null : maxBetUsdc,
    };

    setIsPolicySaving(true);
    setError(null);
    try {
      const nextPolicy = await api.updateAutopilotPolicy(myAgent.id, payload);
      setMyAgent({
        ...myAgent,
        autopilot_policy: nextPolicy,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPolicySaving(false);
    }
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
      ref={cardRef}
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,122,69,0.22), transparent 42%), linear-gradient(135deg, rgba(20,33,61,0.96), rgba(14,18,28,0.94))",
        border: isHovered
          ? "1px solid rgba(255,159,10,0.28)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 20,
        boxShadow: isHovered
          ? "0 18px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,159,10,0.10) inset"
          : "0 18px 48px rgba(0,0,0,0.28)",
        position: "relative",
        overflow: "hidden",
        transition: "border 0.35s ease, box-shadow 0.35s ease",
      }}
      data-testid="autopilot-control-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { setIsHovered(false); setEmojiParticles([]); }}
      onMouseMove={handleMouseMove}
    >
      {/* Emoji particle layer */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        {emojiParticles.map((p) => (
          <div
            key={p.id}
            onAnimationEnd={() => removeParticle(p.id)}
            style={
              {
                position: "absolute",
                left: p.x,
                top: p.y,
                fontSize: p.fontSize,
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
                transformOrigin: "center center",
                "--pdx": `${p.dx}px`,
                "--pdy": `${p.dy}px`,
                "--pscale": p.scale,
                "--prot0": `${p.rot0}deg`,
                "--prot1": `${p.rot1}deg`,
                animation: `${p.anim} ${p.duration}ms cubic-bezier(0.22, 0.68, 0, 1.2) forwards`,
              } as React.CSSProperties
            }
          >
            {p.emoji}
          </div>
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
            loading={isSaving}
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

        {policy && autopilotEnabled && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (!autopilotEnabled) return;
                setIsPolicyOpen((prev) => !prev);
              }}
              aria-expanded={autopilotEnabled && isPolicyOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "transparent",
                border: "none",
                padding: 0,
                textAlign: "left",
                cursor: autopilotEnabled ? "pointer" : "default",
              }}
            >
              <div>
                <div style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t("policyTitle")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginTop: 4, lineHeight: 1.5 }}>
                  {t("policyDesc")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    padding: "5px 10px",
                    borderRadius: 999,
                    color: policyDirty ? "#ff9f0a" : "#30d158",
                    background: policyDirty
                      ? "rgba(255,159,10,0.12)"
                      : "rgba(48,209,88,0.12)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {policyDirty ? t("policyUnsaved") : t("policySynced")}
                </span>
                <div style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.58)" }}>
                  {policySummary}
                </div>
                <div
                  style={{
                    ...mono,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.62)",
                    transform: isPolicyOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 180ms ease",
                  }}
                >
                  ▾
                </div>
              </div>
            </button>

            {isPolicyOpen && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {[
                    {
                      key: "cadenceMinutes" as const,
                      label: t("cadenceLabel"),
                      hint: t("cadenceHint", { derived: policy.derived.cadenceMinutes }),
                      step: "5",
                    },
                    {
                      key: "cooldownMinutes" as const,
                      label: t("cooldownLabel"),
                      hint: t("cooldownHint", { derived: policy.derived.cooldownMinutes }),
                      step: "5",
                    },
                    {
                      key: "maxTradesPerDay" as const,
                      label: t("maxTradesLabel"),
                      hint: t("maxTradesHint", { derived: policy.derived.maxTradesPerDay }),
                      step: "1",
                    },
                    {
                      key: "maxBetUsdc" as const,
                      label: t("maxBetLabel"),
                      hint: t("maxBetHint", { derived: policy.derived.maxBetUsdc.toFixed(2) }),
                      step: "0.01",
                    },
                  ].map((field) => (
                    <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {field.label}
                      </span>
                      <input
                        value={policyDraft[field.key]}
                        onChange={(event) => updatePolicyField(field.key, event.target.value)}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step={field.step}
                        style={{
                          ...mono,
                          width: "100%",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(8,10,16,0.72)",
                          color: "rgba(255,255,255,0.92)",
                          padding: "10px 12px",
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
                        {field.hint}
                      </span>
                    </label>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={resetPolicyDraft}
                    disabled={isPolicySaving || !policyDirty}
                    style={{
                      ...mono,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.78)",
                      padding: "10px 14px",
                      fontSize: 12,
                      cursor: isPolicySaving || !policyDirty ? "default" : "pointer",
                      opacity: isPolicySaving || !policyDirty ? 0.45 : 1,
                    }}
                  >
                    {t("resetPolicy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void persistPolicy(); }}
                    disabled={isPolicySaving || !policyDirty}
                    style={{
                      ...mono,
                      borderRadius: 10,
                      border: "1px solid rgba(10,132,255,0.30)",
                      background: "rgba(10,132,255,0.16)",
                      color: "#7dc4ff",
                      padding: "10px 14px",
                      fontSize: 12,
                      cursor: isPolicySaving || !policyDirty ? "default" : "pointer",
                      opacity: isPolicySaving || !policyDirty ? 0.45 : 1,
                    }}
                  >
                    {isPolicySaving ? t("savingPolicy") : t("savePolicy")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

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
