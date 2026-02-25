"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
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

// ─── Paper Mode Panel ─────────────────────────────────────────────────────────

function PaperModePanel() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/settings/paper-mode`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PaperModeStatus | null) => {
        if (d) setEnabled(d.enabled);
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
        setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setEnabled(!value);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      } finally {
        setSaving(false);
      }
    },
    []
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
          <div
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              background: "rgba(255,255,255,0.08)",
            }}
          />
        ) : (
          <ToggleSwitch checked={enabled} onChange={toggle} disabled={saving} />
        )}
      </div>

      {/* Status feedback */}
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

// ─── Risk Config Summary ──────────────────────────────────────────────────────

function RiskConfigSummary() {
  const [config, setConfig] = useState<RiskConfig | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/risk`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RiskConfig | null) => d && setConfig(d))
      .catch(() => {});
  }, []);

  const rows = config
    ? [
        {
          label: "Agent VaR Threshold",
          value: `${(config.agentVarThreshold * 100).toFixed(1)}%`,
          sub: "Max value-at-risk per agent signal",
        },
        {
          label: "Max Position Size",
          value: `${(config.maxPositionSize * 100).toFixed(1)}%`,
          sub: "Of total portfolio per trade",
        },
        {
          label: "Drawdown Limit",
          value: `${(config.drawdownLimit * 100).toFixed(1)}%`,
          sub: "Hard halt threshold",
        },
        {
          label: "Kelly Multiplier",
          value: `${config.kellyMultiplier}×`,
          sub: "Fractional Kelly risk multiplier",
        },
      ]
    : [];

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <SectionHeader title="Risk Configuration" subtitle="Current live risk parameters" />
        <Link
          href="/settings/risk"
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            background: "rgba(10,132,255,0.12)",
            border: "1px solid rgba(10,132,255,0.25)",
            color: "#0a84ff",
            fontSize: META_SIZE,
            fontWeight: 600,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Edit →
        </Link>
      </div>

      {!config ? (
        <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.25)", padding: "12px 0" }}>
          Loading config…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div>
                <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.70)" }}>
                  {row.label}
                </div>
                <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {row.sub}
                </div>
              </div>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: BODY_SIZE,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
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
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.40)" }}>
              {item.label}
            </span>
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
      <RiskConfigSummary />
      <AppInfoPanel />
    </div>
  );
}
