"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

export function TelegramWebhookEditor() {
  const [chatId, setChatId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getTelegramSettings()
      .then((s) => {
        setChatId(s.chatId);
        setBotToken(s.botToken);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.updateTelegramSettings({ chatId, botToken });
      setMessage("Settings saved successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error saving settings");
    }
    setSaving(false);
  };

  if (loading) return <div style={panelStyle}>Loading settings...</div>;

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Telegram Notifications
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase" }}>
            Chat ID
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-100..."
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "white",
              fontSize: 13,
              fontFamily: "monospace"
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase" }}>
            Bot Token
          </label>
          <input
            type="text"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456:ABC..."
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "white",
              fontSize: 13,
              fontFamily: "monospace"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 12, color: message.includes("Error") ? "#ff453a" : "#30d158" }}>
            {message}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "6px 16px",
              background: "#0a84ff",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer"
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
