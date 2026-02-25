"use client";

import { useEffect, useState, useCallback } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Glassmorphism panel — L001 compliant ────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 24,
};

// ─── Font sizes — L003 compliant (min 11px) ──────────────────────────────────
const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;

// ─── Types ────────────────────────────────────────────────────────────────────
interface RiskConfig {
  agentVarThreshold: number; // 0–1 (e.g. 0.05 = 5% VaR)
  maxPositionSize: number;   // 0–1 (e.g. 0.10 = 10%)
  drawdownLimit: number;     // 0–1 (e.g. 0.15 = 15%)
  kellyMultiplier: number;   // 0–1 (e.g. 0.25 = fractional Kelly 0.25x)
}

const DEFAULT_CONFIG: RiskConfig = {
  agentVarThreshold: 0.05,
  maxPositionSize: 0.10,
  drawdownLimit: 0.15,
  kellyMultiplier: 0.25,
};

// ─── Slider input ─────────────────────────────────────────────────────────────
function GlassSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  accentColor,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accentColor: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: BODY_SIZE,
              fontWeight: 600,
              color: "rgba(255,255,255,0.88)",
              marginBottom: 3,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,255,255,0.30)",
              letterSpacing: "0.03em",
            }}
          >
            {hint}
          </div>
        </div>
        <span
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: 20,
            fontWeight: 700,
            color: accentColor,
            lineHeight: 1,
          }}
        >
          {format(value)}
        </span>
      </div>

      {/* Slider track */}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.07)",
          }}
        />
        {/* Track fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: 5,
            borderRadius: 3,
            background: accentColor,
            transition: "width 80ms ease",
          }}
        />
        {/* Native range input (invisible, layered over) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            height: 20,
            opacity: 0,
            cursor: "pointer",
            margin: 0,
            padding: 0,
            zIndex: 2,
          }}
        />
        {/* Thumb visual */}
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 9px)`,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: accentColor,
            border: "2px solid rgba(0,0,0,0.5)",
            boxShadow: `0 0 12px ${accentColor}66`,
            pointerEvents: "none",
            transition: "left 80ms ease",
            zIndex: 1,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.20)",
            fontFamily: "monospace",
          }}
        >
          {format(min)}
        </span>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.20)",
            fontFamily: "monospace",
          }}
        >
          {format(max)}
        </span>
      </div>
    </div>
  );
}

// ─── Save status banner ───────────────────────────────────────────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error";

function StatusBanner({ status, error }: { status: SaveStatus; error?: string }) {
  if (status === "idle") return null;

  const map: Record<
    Exclude<SaveStatus, "idle">,
    { bg: string; border: string; color: string; text: string }
  > = {
    saving: {
      bg: "rgba(10,132,255,0.10)",
      border: "rgba(10,132,255,0.25)",
      color: "#0a84ff",
      text: "Saving configuration…",
    },
    saved: {
      bg: "rgba(48,209,88,0.10)",
      border: "rgba(48,209,88,0.25)",
      color: "#30d158",
      text: "Configuration saved successfully.",
    },
    error: {
      bg: "rgba(255,69,58,0.10)",
      border: "rgba(255,69,58,0.25)",
      color: "#ff453a",
      text: error ?? "Failed to save. Please try again.",
    },
  };

  const s = map[status as Exclude<SaveStatus, "idle">];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        background: s.bg,
        border: `1px solid ${s.border}`,
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 14 }}>
        {status === "saving" ? "⏳" : status === "saved" ? "✅" : "❌"}
      </span>
      <span
        style={{
          fontSize: BODY_SIZE,
          color: s.color,
          fontFamily: "monospace",
          fontWeight: 600,
        }}
      >
        {s.text}
      </span>
    </div>
  );
}

// ─── Risk Config Page ─────────────────────────────────────────────────────────
export default function RiskConfigPage() {
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<RiskConfig>(DEFAULT_CONFIG);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Load current config on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/risk-config`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const loaded: RiskConfig = {
          agentVarThreshold: data?.agentVarThreshold ?? DEFAULT_CONFIG.agentVarThreshold,
          maxPositionSize: data?.maxPositionSize ?? DEFAULT_CONFIG.maxPositionSize,
          drawdownLimit: data?.drawdownLimit ?? DEFAULT_CONFIG.drawdownLimit,
          kellyMultiplier: data?.kellyMultiplier ?? DEFAULT_CONFIG.kellyMultiplier,
        };
        setConfig(loaded);
        setOriginal(loaded);
      })
      .catch(() => {
        // Backend may not be running — continue with defaults
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    config.agentVarThreshold !== original.agentVarThreshold ||
    config.maxPositionSize !== original.maxPositionSize ||
    config.drawdownLimit !== original.drawdownLimit ||
    config.kellyMultiplier !== original.kellyMultiplier;

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    setSaveError(undefined);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/risk-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setOriginal(config);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    }
  }, [config]);

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const mult = (v: number) => `${v.toFixed(2)}×`;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.03em",
          }}
        >
          Risk Configuration
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: META_SIZE,
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.5,
          }}
        >
          Fine-tune agent risk parameters. Changes are applied to all active trading pipelines after saving.
        </p>
      </div>

      <StatusBanner status={saveStatus} error={saveError} />

      {loading ? (
        <div
          style={{
            ...panelStyle,
            textAlign: "center",
            padding: 40,
            color: "rgba(255,255,255,0.25)",
            fontSize: BODY_SIZE,
            fontFamily: "monospace",
          }}
        >
          Loading configuration…
        </div>
      ) : (
        <>
          {/* Main config panel */}
          <div style={panelStyle}>
            <div
              style={{
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: HEADLINE_SIZE,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Agent Risk Parameters
                </h2>
                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    fontSize: LABEL_SIZE,
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Applies to all pipeline decisions
                </span>
              </div>

              {/* Dirty indicator */}
              {isDirty && (
                <span
                  style={{
                    fontSize: LABEL_SIZE,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(255,159,10,0.12)",
                    color: "#ff9f0a",
                    border: "1px solid rgba(255,159,10,0.25)",
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                  }}
                >
                  UNSAVED CHANGES
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <GlassSlider
                label="Agent VaR Threshold"
                hint="Maximum allowed Value-at-Risk per agent decision"
                value={config.agentVarThreshold}
                min={0.01}
                max={0.20}
                step={0.005}
                format={pct}
                accentColor="#0a84ff"
                onChange={(v) =>
                  setConfig((c) => ({ ...c, agentVarThreshold: v }))
                }
              />

              <GlassSlider
                label="Max Position Size"
                hint="Maximum size of any single position as % of portfolio"
                value={config.maxPositionSize}
                min={0.01}
                max={0.50}
                step={0.01}
                format={pct}
                accentColor="#30d158"
                onChange={(v) =>
                  setConfig((c) => ({ ...c, maxPositionSize: v }))
                }
              />

              <GlassSlider
                label="Drawdown Limit"
                hint="Circuit breaker triggers at this drawdown level"
                value={config.drawdownLimit}
                min={0.05}
                max={0.50}
                step={0.005}
                format={pct}
                accentColor="#ff9f0a"
                onChange={(v) =>
                  setConfig((c) => ({ ...c, drawdownLimit: v }))
                }
              />

              <GlassSlider
                label="Kelly Multiplier"
                hint="Fraction of full Kelly criterion to apply (0.25× = quarter-Kelly)"
                value={config.kellyMultiplier}
                min={0.10}
                max={1.00}
                step={0.05}
                format={mult}
                accentColor="#bf5af2"
                onChange={(v) =>
                  setConfig((c) => ({ ...c, kellyMultiplier: v }))
                }
              />
            </div>
          </div>

          {/* Summary + Save row */}
          <div
            style={{
              ...panelStyle,
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              padding: "16px 24px",
            }}
          >
            {/* Summary chips */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "VaR", value: pct(config.agentVarThreshold), color: "#0a84ff" },
                { label: "Max Pos", value: pct(config.maxPositionSize), color: "#30d158" },
                { label: "Drawdown", value: pct(config.drawdownLimit), color: "#ff9f0a" },
                { label: "Kelly", value: mult(config.kellyMultiplier), color: "#bf5af2" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: LABEL_SIZE,
                      color: "rgba(255,255,255,0.30)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: '"SF Mono", monospace',
                      fontSize: 16,
                      fontWeight: 700,
                      color,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 28px",
                borderRadius: 10,
                border: "none",
                cursor: saveStatus === "saving" ? "wait" : "pointer",
                background:
                  saveStatus === "saving"
                    ? "rgba(10,132,255,0.30)"
                    : "rgba(10,132,255,0.80)",
                color: "rgba(255,255,255,0.95)",
                fontSize: BODY_SIZE,
                fontWeight: 700,
                letterSpacing: "0.06em",
                fontFamily: '"SF Mono", monospace',
                transition: "background 200ms ease, opacity 200ms ease",
                opacity: saveStatus === "saving" ? 0.6 : 1,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(10,132,255,0.30)",
              }}
            >
              {saveStatus === "saving" ? "⏳ SAVING…" : "💾 SAVE CONFIGURATION"}
            </button>
          </div>

          {/* Risk warning footer */}
          <div
            style={{
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,69,58,0.06)",
              border: "1px solid rgba(255,69,58,0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <span
              style={{
                fontSize: LABEL_SIZE,
                color: "rgba(255,69,58,0.80)",
                lineHeight: 1.5,
                letterSpacing: "0.02em",
              }}
            >
              Changes take effect immediately on the next pipeline execution. Increasing thresholds
              beyond recommended values may expose capital to higher-than-expected drawdowns.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
