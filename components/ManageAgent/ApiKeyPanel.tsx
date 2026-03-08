"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

interface ApiKeyPanelProps {
  apiKeyPrefix?: string | null;
  agentId: string;
}

export function ApiKeyPanel({ apiKeyPrefix, agentId }: ApiKeyPanelProps) {
  const [isRotating, setIsRotating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skillUrl = `${BASE_URL}/api/skill.md`;
  const apiBaseUrl = `${BASE_URL}/api/v1/tools`;

  const handleRotate = useCallback(async () => {
    if (!confirm("Rotate API key? The current key will stop working immediately.")) return;

    setIsRotating(true);
    setError(null);

    try {
      const listData = await api.getApiKeys();
      const activeKey = listData.keys?.find((k) => k.active);

      if (!activeKey) {
        // No active key — create via BYO agent creation flow
        setError("No active key found. Please create a new one from Agent Factory.");
      } else {
        const rotateData = await api.rotateApiKey(activeKey.id);
        if (rotateData.api_key) {
          setNewKey(rotateData.api_key);
        } else {
          setError("Failed to rotate key");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate key");
    } finally {
      setIsRotating(false);
    }
  }, []);

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span
          style={{
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          API Key & Endpoints
        </span>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          API KEY
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
            {isRotating ? "..." : "Rotate"}
          </button>
        </div>
      </div>

      {/* New key display */}
      {newKey && (
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)" }}>
          <div style={{ fontSize: 11, color: "#30d158", fontWeight: 600, marginBottom: 4 }}>New API Key (save now!):</div>
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
            Copy
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, fontSize: 11, color: "#ff453a" }}>{error}</div>
      )}

      {/* API Base URL */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          API BASE URL
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
            Copy
          </button>
        </div>
      </div>

      {/* Skill Manifest */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          SKILL MANIFEST
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
            Copy
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
          View Full API Docs →
        </a>
      </div>
    </div>
  );
}
