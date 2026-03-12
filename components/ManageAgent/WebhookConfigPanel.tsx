"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { AVAILABLE_WEBHOOK_EVENTS } from "@/lib/webhookEvents";

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

interface WebhookDelivery {
  event: string;
  url: string;
  status_code: number | null;
  latency_ms: number;
  attempt: number;
  error: string | null;
  created_at: number;
}

interface WebhookConfigPanelProps {
  agentId: string;
  endpointUrl?: string | null;
  webhookEvents?: string[];
}

export function WebhookConfigPanel({ agentId, endpointUrl, webhookEvents }: WebhookConfigPanelProps) {
  const t = useTranslations("webhook");
  const [url, setUrl] = useState(endpointUrl ?? "");
  const [events, setEvents] = useState<string[]>(webhookEvents ?? ["*"]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status_code: number | null; latency_ms: number; error?: string } | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  const isAllEvents = events.length === 1 && events[0] === "*";

  const fetchDeliveries = useCallback(async () => {
    try {
      const json = await api.getWebhookLog(agentId, 10);
      if (json.success) setDeliveries(json.data);
    } catch { /* ignore */ }
    finally { setLoadingLog(false); }
  }, [agentId]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.updateAgentWebhookConfig(agentId, { endpoint_url: url || null, webhook_events: events });
      setSaveMsg(t("saved"));
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const json = await api.testWebhook(agentId);
      setTestResult(json.data);
      // Refresh delivery log
      fetchDeliveries();
    } catch (err) {
      setTestResult({ ok: false, status_code: null, latency_ms: 0, error: err instanceof Error ? err.message : t("saveFailed") });
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (eventKey: string) => {
    if (isAllEvents) {
      // Switch from wildcard to specific selection
      setEvents([eventKey]);
    } else if (events.includes(eventKey)) {
      const next = events.filter(e => e !== eventKey);
      setEvents(next.length === 0 ? ["*"] : next);
    } else {
      const next = [...events, eventKey];
      // If all events selected, switch to wildcard
      if (next.length === AVAILABLE_WEBHOOK_EVENTS.length) {
        setEvents(["*"]);
      } else {
        setEvents(next);
      }
    }
  };

  return (
    <div style={panelStyle}>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {t("title")}
      </span>

      {/* Endpoint URL */}
      <div style={{ marginTop: 14 }}>
        <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 4 }}>
          {t("endpointUrl")}
        </div>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={t("placeholder")}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.80)", fontSize: 12, outline: "none",
            ...mono, boxSizing: "border-box",
          }}
        />
        {url && !url.startsWith("https://") && (
          <div style={{ ...mono, fontSize: 9, color: "#ff9f0a", marginTop: 3 }}>
            {t("httpsRequired")}
          </div>
        )}
      </div>

      {/* Event Subscriptions */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase" }}>
            {t("events")}
          </div>
          <button
            onClick={() => setEvents(isAllEvents ? [] : ["*"])}
            style={{
              ...mono, fontSize: 9, color: "#0a84ff", background: "none", border: "none",
              cursor: "pointer", padding: 0, outline: "none",
            }}
          >
            {isAllEvents ? t("customize") : t("selectAll")}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {AVAILABLE_WEBHOOK_EVENTS.map(evt => {
            const active = isAllEvents || events.includes(evt.key);
            return (
              <button
                key={evt.key}
                onClick={() => toggleEvent(evt.key)}
                style={{
                  ...mono, fontSize: 9, padding: "3px 8px", borderRadius: 6,
                  background: active ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(10,132,255,0.30)" : "rgba(255,255,255,0.08)"}`,
                  color: active ? "#0a84ff" : "rgba(255,255,255,0.35)",
                  cursor: "pointer", outline: "none", transition: "all 150ms ease",
                }}
              >
                {evt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save + Test buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "rgba(48,209,88,0.10)", border: "1px solid rgba(48,209,88,0.20)",
            color: "#30d158", fontSize: 11, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", outline: "none", ...mono,
          }}
        >
          {saving ? t("saving") : saveMsg ?? t("save")}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !url}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.20)",
            color: "#0a84ff", fontSize: 11, fontWeight: 600,
            cursor: testing || !url ? "not-allowed" : "pointer", outline: "none", ...mono,
            opacity: !url ? 0.4 : 1,
          }}
        >
          {testing ? t("testing") : t("testWebhook")}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 6,
          background: testResult.ok ? "rgba(48,209,88,0.08)" : "rgba(255,69,58,0.08)",
          border: `1px solid ${testResult.ok ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)"}`,
          ...mono, fontSize: 10,
          color: testResult.ok ? "#30d158" : "#ff453a",
        }}>
          {testResult.ok
            ? `HTTP ${testResult.status_code} — ${testResult.latency_ms}ms`
            : testResult.error ?? `HTTP ${testResult.status_code}`}
        </div>
      )}

      {/* Recent Deliveries */}
      {!loadingLog && deliveries.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 6 }}>
            {t("recentDeliveries")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {deliveries.slice(0, 5).map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: d.status_code && d.status_code < 400 ? "#30d158" : "#ff453a",
                  }} />
                  <span style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                    {d.event}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                    {d.latency_ms}ms
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.20)" }}>
                    {new Date(d.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
