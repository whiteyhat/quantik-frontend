"use client";

import { useEffect, useState } from "react";
import { api, type MarketAlertItem } from "@/lib/api";

export function MarketAlertEditor({
  open,
  slug,
  question,
  initialPrice,
  existingAlert,
  onClose,
  onSaved,
}: {
  open: boolean;
  slug: string;
  question: string;
  initialPrice: number;
  existingAlert?: MarketAlertItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("0.60");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirection(existingAlert?.direction ?? "above");
    setThreshold((existingAlert?.threshold ?? Math.min(0.99, Math.max(0.01, initialPrice + 0.05))).toFixed(2));
    setEnabled(existingAlert?.enabled ?? true);
  }, [existingAlert, initialPrice, open]);

  if (!open) return null;

  return (
    <>
      <button
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", border: "none", zIndex: 75 }}
      />
      <div
        style={{
          position: "fixed",
          inset: "14vh 16px auto",
          maxWidth: 420,
          margin: "0 auto",
          left: 0,
          right: 0,
          zIndex: 76,
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          background: "var(--panel-surface)",
          padding: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Market alert</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{question}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--glass-border)",
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              onClick={() => setDirection("above")}
              style={{
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: direction === "above" ? "rgba(10,132,255,0.16)" : "transparent",
                color: direction === "above" ? "var(--ios-blue)" : "var(--text-secondary)",
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              Above
            </button>
            <button
              onClick={() => setDirection("below")}
              style={{
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: direction === "below" ? "rgba(255,159,10,0.16)" : "transparent",
                color: direction === "below" ? "var(--ios-orange)" : "var(--text-secondary)",
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              Below
            </button>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
            Threshold (0-1 probability)
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: "var(--glass-surface)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          {existingAlert && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12 }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Alert enabled
            </label>
          )}

          <button
            onClick={async () => {
              const numericThreshold = Number(threshold);
              if (!Number.isFinite(numericThreshold) || numericThreshold < 0 || numericThreshold > 1) return;
              setSaving(true);
              try {
                if (existingAlert) {
                  await api.updateMarketAlert(existingAlert.id, {
                    direction,
                    threshold: numericThreshold,
                    enabled,
                  });
                } else {
                  await api.createMarketAlert({
                    slug,
                    question,
                    direction,
                    threshold: numericThreshold,
                  });
                }
                onSaved();
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            style={{
              marginTop: 8,
              height: 46,
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #007AFF 0%, #32ADE6 100%)",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              fontWeight: 700,
            }}
          >
            {saving ? "Saving…" : existingAlert ? "Update alert" : "Create alert"}
          </button>
        </div>
      </div>
    </>
  );
}
