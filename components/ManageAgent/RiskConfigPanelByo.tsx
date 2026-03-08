"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const mono: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

interface RiskConfig {
  drawdownLimit: number;
  maxPositionSize: number;
  kellyMultiplier: number;
}

interface RiskConfigPanelByoProps {
  agentId: string;
}

export function RiskConfigPanelByo({ agentId }: RiskConfigPanelByoProps) {
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Edit state
  const [editDrawdown, setEditDrawdown] = useState(15);
  const [editMaxPos, setEditMaxPos] = useState(10);
  const [editKelly, setEditKelly] = useState(25);

  const fetchConfig = useCallback(async () => {
    try {
      setError(false);
      const json = await api.getRiskConfig();
      if (!json) throw new Error("Missing risk config");
      setConfig({
        drawdownLimit: json.drawdownLimit,
        maxPositionSize: json.maxPositionSize,
        kellyMultiplier: json.kellyMultiplier,
      });
      setEditDrawdown(Math.round(json.drawdownLimit * 100));
      setEditMaxPos(Math.round(json.maxPositionSize * 100));
      setEditKelly(Math.round(json.kellyMultiplier * 100));
    } catch {
      if (!config) setError(true);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/risk-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          drawdownLimit: editDrawdown / 100,
          maxPositionSize: editMaxPos / 100,
          kellyMultiplier: editKelly / 100,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setConfig({
        drawdownLimit: editDrawdown / 100,
        maxPositionSize: editMaxPos / 100,
        kellyMultiplier: editKelly / 100,
      });
      setEditing(false);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Global Risk Policy
        </span>
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading...</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div style={panelStyle}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Global Risk Policy
        </span>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#ff453a", ...mono, marginBottom: 8 }}>Failed to load</div>
          <button
            onClick={() => { setLoading(true); fetchConfig(); }}
            style={{
              padding: "6px 16px", borderRadius: 8,
              background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.20)",
              color: "#ff453a", fontSize: 11, fontWeight: 600,
              cursor: "pointer", outline: "none", ...mono,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const riskBars = editing
    ? [
        { label: "Max Drawdown Limit", hint: "Circuit breaker triggers at this level", value: `${editDrawdown}%`, color: "#ff453a", pct: editDrawdown / 50 },
        { label: "Max Position Size", hint: "Maximum capital per single trade", value: `${editMaxPos}%`, color: "#0a84ff", pct: editMaxPos / 30 },
        { label: "Kelly Multiplier", hint: "Fraction of Kelly criterion to apply", value: `${(editKelly / 100).toFixed(2)}x`, color: "#bf5af2", pct: editKelly / 100 },
      ]
    : [
        { label: "Max Drawdown Limit", hint: "Circuit breaker triggers at this level", value: `${(config.drawdownLimit * 100).toFixed(0)}%`, color: "#ff453a", pct: config.drawdownLimit / 0.50 },
        { label: "Max Position Size", hint: "Maximum capital per single trade", value: `${(config.maxPositionSize * 100).toFixed(0)}%`, color: "#0a84ff", pct: config.maxPositionSize / 0.30 },
        { label: "Kelly Multiplier", hint: "Fraction of Kelly criterion to apply", value: `${config.kellyMultiplier.toFixed(2)}x`, color: "#bf5af2", pct: config.kellyMultiplier },
      ];

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Global Risk Policy
        </span>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{ ...mono, fontSize: 9, color: "#0a84ff", background: "none", border: "none", cursor: "pointer", padding: 0, outline: "none" }}
          >
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setEditing(false);
                setEditDrawdown(Math.round(config.drawdownLimit * 100));
                setEditMaxPos(Math.round(config.maxPositionSize * 100));
                setEditKelly(Math.round(config.kellyMultiplier * 100));
              }}
              style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.40)", background: "none", border: "none", cursor: "pointer", padding: 0, outline: "none" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...mono, fontSize: 9, color: "#30d158", background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", padding: 0, outline: "none" }}
            >
              {saving ? "Saving..." : saveMsg ?? "Save"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {riskBars.map((bar, i) => (
          <div key={bar.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <div>
                <span style={{ ...mono, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{bar.label}</span>
                <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.20)", marginLeft: 6 }}>{bar.hint}</span>
              </div>
              <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: bar.color }}>{bar.value}</span>
            </div>
            {editing ? (
              <input
                type="range"
                min={1} max={i === 0 ? 50 : i === 1 ? 30 : 100}
                value={i === 0 ? editDrawdown : i === 1 ? editMaxPos : editKelly}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (i === 0) setEditDrawdown(v);
                  else if (i === 1) setEditMaxPos(v);
                  else setEditKelly(v);
                }}
                style={{ width: "100%", accentColor: bar.color, height: 4 }}
              />
            ) : (
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${Math.min(100, bar.pct * 100)}%`,
                  background: bar.color, opacity: 0.6,
                  transition: "width 400ms ease",
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
