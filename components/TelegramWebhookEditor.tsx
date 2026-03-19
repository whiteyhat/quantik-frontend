"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

export function TelegramWebhookEditor() {
  const t = useTranslations("telegram");
  const [chatId, setChatId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
    setIsError(false);
    try {
      await api.updateTelegramSettings({ chatId, botToken });
      setMessage(t("saved"));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(t("saveError"));
      setIsError(true);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    setIsError(false);
    try {
      const result = await api.testTelegramConnection();
      if (result.sent) {
        setMessage(t("testSuccess"));
      } else {
        setMessage(t("testFailed"));
        setIsError(true);
      }
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setMessage(t("testFailed"));
      setIsError(true);
    }
    setTesting(false);
  };

  if (loading) return <div style={panelStyle}>{t("loadingSettings")}</div>;

  return (
    <div style={panelStyle}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {t("title")}
        </h3>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase" }}>
            <span>{t("chatId")}</span>
            <HelpTooltip text={t("chatIdHelp")} width={360} />
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={t("chatIdPlaceholder")}
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
          <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase" }}>
            <span>{t("botToken")}</span>
            <HelpTooltip text={t("botTokenHelp")} />
          </label>
          <input
            type="text"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={t("botTokenPlaceholder")}
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
          <span style={{ fontSize: 12, color: isError ? "#ff453a" : "#30d158" }}>
            {message}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleTest}
              disabled={testing || !chatId || !botToken}
              style={{
                padding: "6px 16px",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: testing || !chatId || !botToken ? "default" : "pointer",
                opacity: testing || !chatId || !botToken ? 0.45 : 1,
              }}
            >
              {testing ? t("testSending") : t("testConnection")}
            </button>
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
              {saving ? t("saving") : t("saveSettings")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
