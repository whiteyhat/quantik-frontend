"use client";

import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import { type RiskConfig } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

// ─── Label mappings from agent factory config values ─────────────────────────

const PERSONALITY_LABELS: Record<string, { labelKey: string; icon: string }> = {
  guardian: { labelKey: "riskProfiles.guardian", icon: "🛡️" },
  balanced: { labelKey: "riskProfiles.balanced", icon: "⚖️" },
  adventurer: { labelKey: "riskProfiles.adventurer", icon: "🚀" },
};

const DECISION_LABELS: Record<string, { labelKey: string; icon: string }> = {
  gut: { labelKey: "tradingStyles.gutTrader", icon: "🎯" },
  analyst: { labelKey: "tradingStyles.analyst", icon: "🔬" },
  observer: { labelKey: "tradingStyles.observer", icon: "👁️" },
};

const INSTINCT_LABELS: Record<string, { labelKey: string; icon: string }> = {
  trend_chaser: { labelKey: "strategies.trendChaser", icon: "📈" },
  reversal_spotter: { labelKey: "strategies.reversalSpotter", icon: "🔄" },
  value_hunter: { labelKey: "strategies.valueHunter", icon: "💎" },
  speed_demon: { labelKey: "strategies.speedDemon", icon: "⚡" },
};

const TIME_LABELS: Record<string, { labelKey: string; icon: string }> = {
  lightning: { labelKey: "timeframes.lightning", icon: "⚡" },
  swing: { labelKey: "timeframes.swing", icon: "🌊" },
  longterm: { labelKey: "timeframes.longTerm", icon: "🏔️" },
};

const MONEY_LABELS: Record<string, { labelKey: string; icon: string }> = {
  fixed_safe: { labelKey: "sizingModes.fixedSafe", icon: "🔒" },
  smart_scaling: { labelKey: "sizingModes.smartScaling", icon: "📊" },
  aggressive: { labelKey: "sizingModes.aggressive", icon: "🔥" },
};

const ASSET_LABELS: Record<string, { labelKey: string; icon: string }> = {
  stocks: { labelKey: "focusAreas.stocks", icon: "📊" },
  forex: { labelKey: "focusAreas.forex", icon: "💱" },
  crypto: { labelKey: "focusAreas.crypto", icon: "🪙" },
  all_rounder: { labelKey: "focusAreas.allRounder", icon: "🌐" },
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.65)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const chipAccentStyle: React.CSSProperties = {
  ...chipStyle,
  background: "rgba(10,132,255,0.10)",
  border: "1px solid rgba(10,132,255,0.25)",
  color: "#0a84ff",
};

// ─── Risk derivation ─────────────────────────────────────────────────────────

function deriveRiskLevel(protection: string): number {
  const protectionMap: Record<string, number> = { tight: 2, flexible: 5, hands_off: 8 };
  return Math.min(10, Math.max(1, protectionMap[protection] ?? 5));
}

function riskLevelColor(level: number): string {
  if (level <= 3) return "#30d158";
  if (level <= 6) return "#ff9f0a";
  return "#ff453a";
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AgentConfigPanelProps {
  riskConfig: RiskConfig | null;
}

export function AgentConfigPanel({ riskConfig }: AgentConfigPanelProps) {
  const t = useTranslations("agentConfig");
  const myAgent = useQuantikStore((s) => s.myAgent);

  if (!myAgent) return null;

  const riskLevel = deriveRiskLevel(myAgent.protection_mindset);
  const rlColor = riskLevelColor(riskLevel);

  const personalityChip = PERSONALITY_LABELS[myAgent.personality];
  const decisionChip = DECISION_LABELS[myAgent.decision_style];
  const instinctChip = INSTINCT_LABELS[myAgent.trading_instinct];
  const timeChip = TIME_LABELS[myAgent.time_patience];
  const moneyChip = MONEY_LABELS[myAgent.money_approach];
  const assetChip = ASSET_LABELS[myAgent.asset_love];

  return (
    <div style={panelStyle}>
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: 14,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {t("title")}
      </h3>

      {/* Agent trait chips — all from real backend data */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {personalityChip && (
          <span style={chipAccentStyle}>
            <span>{personalityChip.icon}</span>
            {t(personalityChip.labelKey as any)}
          </span>
        )}
        {instinctChip && (
          <span style={chipStyle}>
            <span>{instinctChip.icon}</span>
            {t(instinctChip.labelKey as any)}
          </span>
        )}
        {decisionChip && (
          <span style={chipStyle}>
            <span>{decisionChip.icon}</span>
            {t(decisionChip.labelKey as any)}
          </span>
        )}
        {timeChip && (
          <span style={chipStyle}>
            <span>{timeChip.icon}</span>
            {t(timeChip.labelKey as any)}
          </span>
        )}
        {moneyChip && (
          <span style={chipStyle}>
            <span>{moneyChip.icon}</span>
            {t(moneyChip.labelKey as any)}
          </span>
        )}
        {assetChip && (
          <span style={chipStyle}>
            <span>{assetChip.icon}</span>
            {t(assetChip.labelKey as any)}
          </span>
        )}
      </div>

      {/* Risk Level bar — derived from protection_mindset */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{t("riskLevel")}</span>
          <span
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 14,
              fontWeight: 700,
              color: rlColor,
            }}
          >
            {riskLevel <= 3 ? t("low") : riskLevel <= 6 ? t("medium") : t("high")} ({riskLevel}/10)
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
          <div
            style={{
              height: "100%",
              width: `${riskLevel * 10}%`,
              borderRadius: 3,
              background: `linear-gradient(90deg, #30d158, ${rlColor})`,
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>

      {/* Risk parameters — read-only, derived from agent personality */}
      {riskConfig ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {[
            { label: t("maxDrawdownLimit"), hint: t("maxDrawdownDesc"), value: `${(riskConfig.drawdownLimit * 100).toFixed(0)}%`, color: "#ff453a", pct: riskConfig.drawdownLimit / 0.50 },
            { label: t("maxPositionSize"), hint: t("maxPositionDesc"), value: `${(riskConfig.maxPositionSize * 100).toFixed(0)}%`, color: "#0a84ff", pct: riskConfig.maxPositionSize / 0.30 },
            { label: t("kellyMultiplier"), hint: t("kellyDesc"), value: `${riskConfig.kellyMultiplier.toFixed(2)}x`, color: "#bf5af2", pct: riskConfig.kellyMultiplier },
          ].map((param) => (
            <div key={param.label} style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{param.label}</span>
                <span style={{ fontFamily: '"SF Mono", monospace', fontSize: 13, fontWeight: 700, color: param.color }}>{param.value}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(param.pct * 100, 100)}%`, borderRadius: 2, background: param.color, opacity: 0.6, transition: "width 300ms ease" }} />
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{param.hint}</div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "12px 0",
            marginBottom: 14,
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: '"SF Mono", monospace',
          }}
        >
          {t("loadingRisk")}
        </div>
      )}

    </div>
  );
}
