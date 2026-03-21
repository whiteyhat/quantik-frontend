"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiKeyPanelProps {
  apiKeyPrefix?: string | null;
  agentId: string;
}

export function ApiKeyPanel({ apiKeyPrefix, agentId }: ApiKeyPanelProps) {
  const t = useTranslations("apiKey");
  const tc = useTranslations("common");
  const [isRotating, setIsRotating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skillUrl = `${BASE_URL}/api/skill.md`;
  const apiBaseUrl = `${BASE_URL}/api/v1/tools`;

  const handleRotate = useCallback(async () => {
    if (!confirm(t("rotateConfirm"))) return;

    setIsRotating(true);
    setError(null);

    try {
      const listData = await api.getApiKeys();
      const activeKey = listData.keys?.find((k) => k.active);

      if (!activeKey) {
        // No active key — create via BYO agent creation flow
        setError(t("noActiveKey"));
      } else {
        const rotateData = await api.rotateApiKey(activeKey.id);
        if (rotateData.api_key) {
          setNewKey(rotateData.api_key);
        } else {
          setError(t("failedToRotate"));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToRotate"));
    } finally {
      setIsRotating(false);
    }
  }, []);

  return (
    <div className="glass-card glass-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {t("title")}
        </span>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {t("apiKey")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12, color: "rgba(255,255,255,0.55)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {apiKeyPrefix ?? "qk_live_••••"}••••••••••••••••
          </code>
          <button
            onClick={handleRotate}
            disabled={isRotating}
            style={{
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,159,10,0.10)", border: "1px solid rgba(255,159,10,0.20)",
              color: "#ff9f0a", fontSize: 11, fontWeight: 600,
              cursor: isRotating ? "not-allowed" : "pointer", outline: "none", flexShrink: 0,
            }}
          >
            {isRotating ? "..." : t("rotate")}
          </button>
        </div>
      </div>

      {/* New key display */}
      {newKey && (
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)" }}>
          <div style={{ fontSize: 11, color: "#30d158", fontWeight: 600, marginBottom: 4 }}>{t("newKey")}</div>
          <code style={{ fontSize: 11, color: "#30d158", fontFamily: '"SF Mono", "JetBrains Mono", monospace', wordBreak: "break-all" }}>
            {newKey}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(newKey); }}
            style={{
              display: "block", marginTop: 6, padding: "4px 10px", borderRadius: 6,
              background: "rgba(48,209,88,0.15)", border: "none",
              color: "#30d158", fontSize: 10, fontWeight: 600, cursor: "pointer", outline: "none",
            }}
          >
            {tc("copy")}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, fontSize: 11, color: "#ff453a" }}>{error}</div>
      )}

      {/* API Base URL */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {t("apiBaseUrl")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              background: "rgba(10,132,255,0.04)", border: "1px solid rgba(10,132,255,0.10)",
              fontSize: 11, color: "#0a84ff",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              wordBreak: "break-all",
            }}
          >
            {apiBaseUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(apiBaseUrl)}
            style={{
              padding: "6px 10px", borderRadius: 6,
              background: "rgba(10,132,255,0.10)", border: "none",
              color: "#0a84ff", fontSize: 10, fontWeight: 600,
              cursor: "pointer", outline: "none", flexShrink: 0,
            }}
          >
            {tc("copy")}
          </button>
        </div>
      </div>

      {/* Skill Manifest */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {t("skillManifest")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              background: "rgba(10,132,255,0.04)", border: "1px solid rgba(10,132,255,0.10)",
              fontSize: 11, color: "#0a84ff",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              wordBreak: "break-all",
            }}
          >
            {skillUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(skillUrl)}
            style={{
              padding: "6px 10px", borderRadius: 6,
              background: "rgba(10,132,255,0.10)", border: "none",
              color: "#0a84ff", fontSize: 10, fontWeight: 600,
              cursor: "pointer", outline: "none", flexShrink: 0,
            }}
          >
            {tc("copy")}
          </button>
        </div>
      </div>

      {/* Docs link */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <a
          href="/agent-factory/byo/docs"
          style={{
            fontSize: 11, fontWeight: 600, color: "#0a84ff",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            textDecoration: "none",
          }}
        >
          {t("viewDocs")} →
        </a>
      </div>
    </div>
  );
}
