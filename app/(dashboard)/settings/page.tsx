"use client";

import { useEffect, useState, useCallback } from "react";
import { usePaperMode } from "@/context/PaperModeContext";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const HEADLINE_SIZE = 14;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskConfig {
  agentVarThreshold: number;
  maxPositionSize: number;
  drawdownLimit: number;
  kellyMultiplier: number;
}

interface PaperModeStatus {
  enabled: boolean;
}

const DEFAULT_RISK: RiskConfig = {
  agentVarThreshold: 0.05,
  maxPositionSize: 0.10,
  drawdownLimit: 0.15,
  kellyMultiplier: 0.25,
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: HEADLINE_SIZE,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.03em",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative",
        width: 50,
        height: 28,
        borderRadius: 14,
        border: "none",
        background: checked ? "#30d158" : "rgba(255,255,255,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 220ms ease",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        outline: "none",
      }}
      aria-label="Toggle"
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 24 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "white",
          transition: "left 220ms cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ─── Glass slider (risk config) ───────────────────────────────────────────────

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
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)" }}>{hint}</div>
        </div>
        <span
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: 18,
            fontWeight: 700,
            color: accentColor,
          }}
        >
          {format(value)}
        </span>
      </div>

      {/* Slider */}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
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

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {format(min)}
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {format(max)}
        </span>
      </div>
    </div>
  );
}

// ─── Paper Mode Panel ─────────────────────────────────────────────────────────

function PaperModePanel() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const { refreshPaperMode } = usePaperMode();

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { paperMode?: boolean } | null) => {
        if (d && typeof d.paperMode === "boolean") setEnabled(d.paperMode);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(
    async (value: boolean) => {
      setEnabled(value);
      setSaving(true);
      setStatus("idle");
      try {
        const res = await fetch(`${BASE_URL}/api/v1/settings/paper-mode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: value }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus("saved");
        refreshPaperMode();
        setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setEnabled(!value);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      } finally {
        setSaving(false);
      }
    },
    [refreshPaperMode]
  );

  return (
    <div style={panelStyle}>
      <SectionHeader title="Paper Mode" subtitle="Simulate trades without executing real orders" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderRadius: 12,
          background: enabled ? "rgba(48,209,88,0.07)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${enabled ? "rgba(48,209,88,0.20)" : "rgba(255,255,255,0.08)"}`,
          transition: "background 220ms, border-color 220ms",
        }}
      >
        <div>
          <div style={{ fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>
            Paper Trading Mode
          </div>
          <div style={{ fontSize: META_SIZE, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
            {enabled
              ? "Active — all trades are simulated, no real USDC spent"
              : "Inactive — real trades will execute on chain"}
          </div>
        </div>

        {loading ? (
          <div style={{ width: 50, height: 28, borderRadius: 14, background: "rgba(255,255,255,0.08)" }} />
        ) : (
          <ToggleSwitch checked={enabled} onChange={toggle} disabled={saving} />
        )}
      </div>

      {status === "saved" && (
        <div
          style={{
            marginTop: 10,
            padding: "7px 12px",
            borderRadius: 8,
            background: "rgba(48,209,88,0.08)",
            border: "1px solid rgba(48,209,88,0.20)",
            fontSize: META_SIZE,
            color: "#30d158",
            fontFamily: "monospace",
          }}
        >
          ✓ Paper mode {enabled ? "enabled" : "disabled"}
        </div>
      )}
      {status === "error" && (
        <div
          style={{
            marginTop: 10,
            padding: "7px 12px",
            borderRadius: 8,
            background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.20)",
            fontSize: META_SIZE,
            color: "#ff453a",
            fontFamily: "monospace",
          }}
        >
          ✗ Failed to update setting
        </div>
      )}
    </div>
  );
}

// ─── Risk Configuration Panel (inline, collapsible) ──────────────────────────

function RiskConfigPanel() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_RISK);
  const [original, setOriginal] = useState<RiskConfig>(DEFAULT_RISK);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | undefined>();

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/risk-config`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        const d = data as Record<string, unknown>;
        const loaded: RiskConfig = {
          agentVarThreshold: (d?.agentVarThreshold as number) ?? DEFAULT_RISK.agentVarThreshold,
          maxPositionSize: (d?.maxPositionSize as number) ?? DEFAULT_RISK.maxPositionSize,
          drawdownLimit: (d?.drawdownLimit as number) ?? DEFAULT_RISK.drawdownLimit,
          kellyMultiplier: (d?.kellyMultiplier as number) ?? DEFAULT_RISK.kellyMultiplier,
        };
        setConfig(loaded);
        setOriginal(loaded);
      })
      .catch(() => {})
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
    <div style={panelStyle}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: open ? 16 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: HEADLINE_SIZE,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                textAlign: "left",
              }}
            >
              Risk Configuration
            </h2>
            <span
              style={{
                display: "block",
                marginTop: 2,
                fontSize: LABEL_SIZE,
                color: "rgba(255,255,255,0.30)",
                textAlign: "left",
              }}
            >
              Agent risk parameters for pipeline decisions
            </span>
          </div>
          {isDirty && (
            <span
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(255,159,10,0.12)",
                color: "#ff9f0a",
                border: "1px solid rgba(255,159,10,0.25)",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
              }}
            >
              UNSAVED
            </span>
          )}
        </div>
        {/* Chevron */}
        <span
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.40)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 220ms ease",
            display: "inline-block",
            userSelect: "none",
          }}
        >
          ›
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Skeleton width={120} height={13} borderRadius={4} />
                    <Skeleton width={50} height={18} borderRadius={4} />
                  </div>
                  <Skeleton width="100%" height={5} borderRadius={3} />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Status banner */}
              {saveStatus !== "idle" && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "9px 14px",
                    borderRadius: 9,
                    background:
                      saveStatus === "saved"
                        ? "rgba(48,209,88,0.10)"
                        : saveStatus === "saving"
                        ? "rgba(10,132,255,0.10)"
                        : "rgba(255,69,58,0.10)",
                    border: `1px solid ${
                      saveStatus === "saved"
                        ? "rgba(48,209,88,0.25)"
                        : saveStatus === "saving"
                        ? "rgba(10,132,255,0.25)"
                        : "rgba(255,69,58,0.25)"
                    }`,
                    fontSize: META_SIZE,
                    color:
                      saveStatus === "saved"
                        ? "#30d158"
                        : saveStatus === "saving"
                        ? "#0a84ff"
                        : "#ff453a",
                    fontFamily: "monospace",
                  }}
                >
                  {saveStatus === "saving"
                    ? "⏳ Saving configuration…"
                    : saveStatus === "saved"
                    ? "✓ Configuration saved"
                    : `✗ ${saveError ?? "Failed to save"}`}
                </div>
              )}

              {/* Sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <GlassSlider
                  label="Agent VaR Threshold"
                  hint="Max value-at-risk per agent decision"
                  value={config.agentVarThreshold}
                  min={0.01}
                  max={0.20}
                  step={0.005}
                  format={pct}
                  accentColor="#0a84ff"
                  onChange={(v) => setConfig((c) => ({ ...c, agentVarThreshold: v }))}
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
                  onChange={(v) => setConfig((c) => ({ ...c, maxPositionSize: v }))}
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
                  onChange={(v) => setConfig((c) => ({ ...c, drawdownLimit: v }))}
                />
                <GlassSlider
                  label="Kelly Multiplier"
                  hint="Fraction of full Kelly criterion to apply"
                  value={config.kellyMultiplier}
                  min={0.10}
                  max={1.00}
                  step={0.05}
                  format={mult}
                  accentColor="#bf5af2"
                  onChange={(v) => setConfig((c) => ({ ...c, kellyMultiplier: v }))}
                />
              </div>

              {/* Summary + Save */}
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {/* Summary chips */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "VaR", value: pct(config.agentVarThreshold), color: "#0a84ff" },
                    { label: "Max Pos", value: pct(config.maxPositionSize), color: "#30d158" },
                    { label: "Drawdown", value: pct(config.drawdownLimit), color: "#ff9f0a" },
                    { label: "Kelly", value: mult(config.kellyMultiplier), color: "#bf5af2" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span
                        style={{
                          fontSize: LABEL_SIZE,
                          color: "rgba(255,255,255,0.25)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {label}
                      </span>
                      <span style={{ fontFamily: '"SF Mono", monospace', fontSize: 15, fontWeight: 700, color }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saveStatus === "saving"}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 9,
                    border: "none",
                    cursor: !isDirty || saveStatus === "saving" ? "not-allowed" : "pointer",
                    background: !isDirty ? "rgba(255,255,255,0.06)" : "rgba(10,132,255,0.80)",
                    color: !isDirty ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.95)",
                    fontSize: META_SIZE,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    fontFamily: '"SF Mono", monospace',
                    transition: "all 200ms ease",
                    opacity: saveStatus === "saving" ? 0.6 : 1,
                  }}
                >
                  {saveStatus === "saving" ? "⏳ SAVING…" : "💾 SAVE"}
                </button>
              </div>

              {/* Warning */}
              <div
                style={{
                  marginTop: 12,
                  padding: "9px 14px",
                  borderRadius: 9,
                  background: "rgba(255,69,58,0.06)",
                  border: "1px solid rgba(255,69,58,0.12)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,69,58,0.80)", lineHeight: 1.5 }}>
                  Changes apply immediately on the next pipeline execution. Higher thresholds may expose capital to greater drawdowns.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── App Info Panel ───────────────────────────────────────────────────────────

function AppInfoPanel() {
  const items: { label: string; value: string }[] = [
    { label: "Version", value: "v0.1.0" },
    { label: "Environment", value: process.env.NODE_ENV ?? "production" },
    { label: "API Endpoint", value: BASE_URL },
    { label: "Network", value: "Polygon (USDC)" },
  ];

  return (
    <div style={panelStyle}>
      <SectionHeader title="App Info" />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.40)" }}>{item.label}</span>
            <span
              style={{
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                fontSize: META_SIZE,
                color: "rgba(255,255,255,0.60)",
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          Settings
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>
          System configuration and preferences
        </p>
      </div>

      <PaperModePanel />
      {/* Risk Configuration — inline, collapsible (replaces standalone /settings/risk) */}
      <RiskConfigPanel />
      <AppInfoPanel />
    </div>
  );
}
