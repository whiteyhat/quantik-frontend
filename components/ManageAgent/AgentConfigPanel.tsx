"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AgentConfigPanel() {
  const t = useTranslations("agentConfig");
  const myAgent = useQuantikStore((s) => s.myAgent);

  if (!myAgent) return null;

  const riskLevel = deriveRiskLevel(myAgent.protection_mindset);
  const rlColor = riskLevelColor(riskLevel);
  const autopilotPolicy = myAgent.autopilot_policy?.effective ?? null;

  const personalityChip = PERSONALITY_LABELS[myAgent.personality];
  const decisionChip = DECISION_LABELS[myAgent.decision_style];
  const instinctChip = INSTINCT_LABELS[myAgent.trading_instinct];
  const timeChip = TIME_LABELS[myAgent.time_patience];
  const moneyChip = MONEY_LABELS[myAgent.money_approach];
  const assetChip = ASSET_LABELS[myAgent.asset_love];
  const chartMetrics = useMemo(() => {
    if (!autopilotPolicy) return [];

    const tempoScore = clamp01(
      (
        clamp01(1 - ((autopilotPolicy.cadenceMinutes - 15) / (240 - 15))) +
        clamp01(autopilotPolicy.maxTradesPerDay / 16)
      ) / 2
    );

    return [
      {
        key: "tempo",
        label: t("rings.tempo"),
        value: `${autopilotPolicy.cadenceMinutes}m · ${autopilotPolicy.maxTradesPerDay}/day`,
        score: tempoScore,
        color: "#5ac8fa",
        hint: t("rings.tempoDesc"),
      },
      {
        key: "selectivity",
        label: t("rings.selectivity"),
        value: `${(autopilotPolicy.minSigma * 100).toFixed(0)}% sigma`,
        score: clamp01((autopilotPolicy.minSigma - 0.6) / 0.22),
        color: "#bf5af2",
        hint: t("rings.selectivityDesc"),
      },
      {
        key: "exposure",
        label: t("rings.exposure"),
        value: `${(autopilotPolicy.maxPositionFraction * 100).toFixed(0)}% max`,
        score: clamp01(autopilotPolicy.maxPositionFraction / 0.15),
        color: "#ff9f0a",
        hint: t("rings.exposureDesc"),
      },
      {
        key: "protection",
        label: t("rings.protection"),
        value: `${(autopilotPolicy.dailyLossLimitPct * 100).toFixed(0)}% pause`,
        score: clamp01(1 - ((autopilotPolicy.dailyLossLimitPct - 0.05) / 0.07)),
        color: "#ff453a",
        hint: t("rings.protectionDesc"),
      },
      {
        key: "sentiment",
        label: t("rings.sentiment"),
        value: autopilotPolicy.useAuraSentiment ? t("auraEnabled") : t("auraDisabled"),
        score: autopilotPolicy.useAuraSentiment ? 1 : 0.28,
        color: "#ffd60a",
        hint: t("rings.sentimentDesc"),
      },
    ];
  }, [autopilotPolicy, t]);
  const [hoveredRing, setHoveredRing] = useState<number | null>(null);
  const tooltipMetric = hoveredRing == null ? null : chartMetrics[hoveredRing] ?? null;

  return (
    <div className="glass-card glass-panel-compact">
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

      {/* Agent behavior map — same data as autopilot policy, but visualized instead of duplicated as another form */}
      {autopilotPolicy ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                width: 220,
                height: 220,
                margin: "0 auto",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at center, rgba(9,12,20,0.98) 0 36%, rgba(255,255,255,0.04) 36%, rgba(255,255,255,0.02) 100%)",
              }}
            >
              <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
                {chartMetrics.map((metric, index) => {
                  const radius = 92 - index * 16;
                  const strokeWidth = 10;
                  const circumference = 2 * Math.PI * radius;
                  const dash = circumference * metric.score;
                  return (
                    <g key={metric.key}>
                      <circle
                        cx="110"
                        cy="110"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx="110"
                        cy="110"
                        r={radius}
                        fill="none"
                        stroke={metric.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        style={{
                          cursor: "pointer",
                          filter: hoveredRing === index ? `drop-shadow(0 0 8px ${metric.color})` : "none",
                          opacity: hoveredRing == null ? 0.82 : hoveredRing === index ? 1 : 0.38,
                          transition: "opacity 180ms ease, filter 180ms ease",
                        }}
                        onMouseEnter={() => setHoveredRing(index)}
                        onMouseLeave={() => setHoveredRing(null)}
                      />
                    </g>
                  );
                })}
              </svg>

            </div>

            <div
              style={{
                width: "100%",
                minHeight: 110,
                borderRadius: 16,
                border: tooltipMetric ? `1px solid ${tooltipMetric.color}` : "1px solid rgba(255,255,255,0.08)",
                background: tooltipMetric ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
                transition: "border-color 180ms ease, background 180ms ease",
              }}
            >
              {tooltipMetric ? (
                <>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.94)",
                    }}
                  >
                    {tooltipMetric.label}
                  </div>
                  <div
                    style={{
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      fontSize: 13,
                      fontWeight: 700,
                      color: tooltipMetric.color,
                    }}
                  >
                    {tooltipMetric.value}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>
                    {tooltipMetric.hint}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", lineHeight: 1.55 }}>
                  {t("behaviorMapHoverHint")}
                </div>
              )}
            </div>
          </div>
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
