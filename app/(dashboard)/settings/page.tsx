"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { usePaperMode } from "@/context/PaperModeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { GlassSlider } from "@/components/ui/GlassSlider";
import { api, type RiskConfig } from "@/lib/api";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "rgba(255,255,255,0.80)",
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
  fontSize: META_SIZE,
  outline: "none",
  transition: "border-color 220ms ease",
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RISK: RiskConfig = {
  agentVarThreshold: 0.05,
  maxPositionSize: 0.10,
  drawdownLimit: 0.15,
  kellyMultiplier: 0.25,
};

// ─── Animation variants ──────────────────────────────────────────────────────

const gentleEase: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: gentleEase } },
};

// ─── Shared components ───────────────────────────────────────────────────────

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

function StatusBanner({ status, message }: { status: "saved" | "error" | "saving"; message: string }) {
  const colors = {
    saved: { bg: "rgba(48,209,88,0.08)", border: "rgba(48,209,88,0.20)", text: "#30d158" },
    error: { bg: "rgba(255,69,58,0.08)", border: "rgba(255,69,58,0.20)", text: "#ff453a" },
    saving: { bg: "rgba(10,132,255,0.08)", border: "rgba(10,132,255,0.20)", text: "#0a84ff" },
  };
  const c = colors[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto", marginTop: 10, transition: { duration: 0.22 } }}
      exit={{ opacity: 0, y: -6, height: 0, marginTop: 0, transition: { duration: 0.18 } }}
      style={{
        padding: "7px 12px",
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: META_SIZE,
        color: c.text,
        fontFamily: '"SF Mono", monospace',
      }}
    >
      {message}
    </motion.div>
  );
}

function ErrorWithRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: "rgba(255,69,58,0.06)",
        border: "1px solid rgba(255,69,58,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span style={{ fontSize: META_SIZE, color: "rgba(255,69,58,0.80)" }}>
        ✗ {message}
      </span>
      <button
        onClick={onRetry}
        style={{
          background: "rgba(255,69,58,0.12)",
          border: "1px solid rgba(255,69,58,0.25)",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: "pointer",
          fontSize: LABEL_SIZE,
          fontWeight: 600,
          color: "#ff453a",
          fontFamily: '"SF Mono", monospace',
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        RETRY
      </button>
    </div>
  );
}

function UnsavedBadge() {
  return (
    <span
      style={{
        fontSize: LABEL_SIZE,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        background: "rgba(255,159,10,0.12)",
        color: "#ff9f0a",
        border: "1px solid rgba(255,159,10,0.25)",
        fontFamily: '"SF Mono", monospace',
        letterSpacing: "0.06em",
      }}
    >
      UNSAVED
    </span>
  );
}

// ─── Paper Mode Panel ─────────────────────────────────────────────────────────

function PaperModePanel() {
  const { paperMode, refreshPaperMode } = usePaperMode();
  const [enabled, setEnabled] = useState(paperMode);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  // Sync from context when it updates
  useEffect(() => {
    setEnabled(paperMode);
  }, [paperMode]);

  const mutation = useMutation({
    mutationFn: api.setPaperMode,
    onMutate: (value) => {
      setEnabled(value);
      setStatus("idle");
    },
    onSuccess: () => {
      refreshPaperMode();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 4000);
    },
    onError: () => {
      setEnabled(!enabled);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    },
  });

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

        <ToggleSwitch checked={enabled} onChange={(v) => mutation.mutate(v)} disabled={mutation.isPending} />
      </div>

      <AnimatePresence>
        {status === "saved" && (
          <StatusBanner key="saved" status="saved" message={`✓ Paper mode ${enabled ? "enabled" : "disabled"}`} />
        )}
        {status === "error" && (
          <StatusBanner key="error" status="error" message="✗ Failed to update setting" />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Risk Configuration Panel ─────────────────────────────────────────────────

function RiskConfigPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_RISK);
  const [original, setOriginal] = useState<RiskConfig>(DEFAULT_RISK);
  const [confirming, setConfirming] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | undefined>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["riskConfig"],
    queryFn: () => api.getRiskConfig(),
  });

  // Sync loaded data into local state
  useEffect(() => {
    if (data) {
      setConfig(data);
      setOriginal(data);
    }
  }, [data]);

  const isDirty =
    config.agentVarThreshold !== original.agentVarThreshold ||
    config.maxPositionSize !== original.maxPositionSize ||
    config.drawdownLimit !== original.drawdownLimit ||
    config.kellyMultiplier !== original.kellyMultiplier;

  const mutation = useMutation({
    mutationFn: api.updateRiskConfig,
    onMutate: () => {
      setSaveStatus("saving");
      setSaveError(undefined);
    },
    onSuccess: () => {
      setOriginal(config);
      setSaveStatus("saved");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["riskConfig"] });
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
      setSaveStatus("error");
      setConfirming(false);
      setTimeout(() => setSaveStatus("idle"), 5000);
    },
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const mult = (v: number) => `${v.toFixed(2)}×`;

  const summaryChips = [
    { label: "VaR", value: pct(original.agentVarThreshold), color: "#0a84ff" },
    { label: "Max Pos", value: pct(original.maxPositionSize), color: "#30d158" },
    { label: "Drawdown", value: pct(original.drawdownLimit), color: "#ff9f0a" },
    { label: "Kelly", value: mult(original.kellyMultiplier), color: "#bf5af2" },
  ];

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
          transition: "margin-bottom 220ms ease",
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
          {isDirty && <UnsavedBadge />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Collapsed summary chips */}
          {!open && !isLoading && !isError && (
            <div style={{ display: "flex", gap: 10 }}>
              {summaryChips.map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: '"SF Mono", monospace', fontSize: 12, fontWeight: 700, color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Chevron */}
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.40)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 220ms ease",
              display: "inline-block",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="risk-body"
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{ height: "auto", opacity: 1, overflow: "hidden", transition: { duration: 0.28, ease: gentleEase } }}
            exit={{ height: 0, opacity: 0, overflow: "hidden", transition: { duration: 0.22, ease: gentleEase } }}
          >
            {isLoading ? (
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
            ) : isError ? (
              <ErrorWithRetry message="Failed to load risk configuration" onRetry={() => refetch()} />
            ) : (
              <>
                {/* Status banner */}
                <AnimatePresence>
                  {saveStatus !== "idle" && (
                    <StatusBanner
                      key="risk-status"
                      status={saveStatus === "saved" ? "saved" : saveStatus === "saving" ? "saving" : "error"}
                      message={
                        saveStatus === "saving"
                          ? "⏳ Saving configuration…"
                          : saveStatus === "saved"
                          ? "✓ Configuration saved"
                          : `✗ ${saveError ?? "Failed to save"}`
                      }
                    />
                  )}
                </AnimatePresence>

                {/* Sliders */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: saveStatus !== "idle" ? 14 : 0 }}>
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
                        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {label}
                        </span>
                        <span style={{ fontFamily: '"SF Mono", monospace', fontSize: 15, fontWeight: 700, color }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Reset to defaults */}
                    {isDirty && (
                      <button
                        onClick={() => { setConfig(DEFAULT_RISK); setConfirming(false); }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: LABEL_SIZE,
                          color: "rgba(255,255,255,0.30)",
                          fontFamily: '"SF Mono", monospace',
                          letterSpacing: "0.04em",
                          padding: "6px 10px",
                          transition: "color 200ms ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.30)")}
                      >
                        RESET
                      </button>
                    )}

                    {/* Confirm / Save */}
                    <AnimatePresence mode="wait">
                      {confirming ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{ display: "flex", gap: 6 }}
                        >
                          <button
                            onClick={() => mutation.mutate(config)}
                            style={{
                              padding: "10px 18px",
                              borderRadius: 9,
                              border: "none",
                              cursor: "pointer",
                              background: "rgba(48,209,88,0.80)",
                              color: "rgba(255,255,255,0.95)",
                              fontSize: META_SIZE,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              fontFamily: '"SF Mono", monospace',
                              transition: "all 200ms ease",
                            }}
                          >
                            CONFIRM
                          </button>
                          <button
                            onClick={() => setConfirming(false)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 9,
                              border: "1px solid rgba(255,255,255,0.10)",
                              cursor: "pointer",
                              background: "rgba(255,255,255,0.04)",
                              color: "rgba(255,255,255,0.50)",
                              fontSize: META_SIZE,
                              fontWeight: 600,
                              fontFamily: '"SF Mono", monospace',
                              transition: "all 200ms ease",
                            }}
                          >
                            CANCEL
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="save"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => setConfirming(true)}
                          disabled={!isDirty || mutation.isPending}
                          style={{
                            padding: "10px 22px",
                            borderRadius: 9,
                            border: "none",
                            cursor: !isDirty || mutation.isPending ? "not-allowed" : "pointer",
                            background: !isDirty ? "rgba(255,255,255,0.06)" : "rgba(10,132,255,0.80)",
                            color: !isDirty ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.95)",
                            fontSize: META_SIZE,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            fontFamily: '"SF Mono", monospace',
                            transition: "all 200ms ease",
                            opacity: mutation.isPending ? 0.6 : 1,
                          }}
                        >
                          {mutation.isPending ? "⏳ SAVING…" : "SAVE"}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Telegram / Notifications Panel ──────────────────────────────────────────

function TelegramSettingsPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState("");
  const [botToken, setBotToken] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["telegramSettings"],
    queryFn: () => api.getTelegramSettings(),
  });

  // Sync loaded data
  useEffect(() => {
    if (data) {
      setChatId(data.chatId ?? "");
      setBotToken("");
      setDirty(false);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: api.updateTelegramSettings,
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["telegramSettings"] });
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    },
  });

  const handleSave = () => {
    const payload: { chatId?: string; botToken?: string } = {};
    if (chatId !== (data?.chatId ?? "")) payload.chatId = chatId;
    if (botToken) payload.botToken = botToken;
    mutation.mutate(payload);
  };

  const isConfigured = data?.hasToken ?? false;

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
          transition: "margin-bottom 220ms ease",
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
              Notifications
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
              Telegram alert configuration
            </span>
          </div>
          {dirty && <UnsavedBadge />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Status indicator */}
          {!isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isConfigured ? "#30d158" : "rgba(255,255,255,0.20)",
                  boxShadow: isConfigured ? "0 0 6px rgba(48,209,88,0.5)" : "none",
                }}
              />
              <span style={{ fontSize: LABEL_SIZE, color: isConfigured ? "rgba(48,209,88,0.80)" : "rgba(255,255,255,0.25)", fontFamily: '"SF Mono", monospace' }}>
                {isConfigured ? "Active" : "Not configured"}
              </span>
            </div>
          )}

          {/* Chevron */}
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.40)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 220ms ease",
              display: "inline-block",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="telegram-body"
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{ height: "auto", opacity: 1, overflow: "hidden", transition: { duration: 0.28, ease: gentleEase } }}
            exit={{ height: 0, opacity: 0, overflow: "hidden", transition: { duration: 0.22, ease: gentleEase } }}
          >
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
                <Skeleton width="100%" height={44} borderRadius={8} />
                <Skeleton width="100%" height={44} borderRadius={8} />
              </div>
            ) : isError ? (
              <ErrorWithRetry message="Failed to load notification settings" onRetry={() => refetch()} />
            ) : (
              <>
                <AnimatePresence>
                  {saveStatus !== "idle" && (
                    <StatusBanner
                      key="tg-status"
                      status={saveStatus === "saved" ? "saved" : saveStatus === "saving" ? "saving" : "error"}
                      message={
                        saveStatus === "saving"
                          ? "⏳ Saving…"
                          : saveStatus === "saved"
                          ? "✓ Notification settings saved"
                          : "✗ Failed to save settings"
                      }
                    />
                  )}
                </AnimatePresence>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: saveStatus !== "idle" ? 14 : 0 }}>
                  {/* Chat ID */}
                  <div>
                    <label style={{ display: "block", fontSize: LABEL_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                      Chat ID
                    </label>
                    <input
                      type="text"
                      value={chatId}
                      onChange={(e) => { setChatId(e.target.value); setDirty(true); }}
                      placeholder="e.g. -1001234567890"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(10,132,255,0.50)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>

                  {/* Bot Token */}
                  <div>
                    <label style={{ display: "block", fontSize: LABEL_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                      Bot Token
                    </label>
                    <input
                      type="password"
                      value={botToken}
                      onChange={(e) => { setBotToken(e.target.value); setDirty(true); }}
                      placeholder={data?.hasToken ? "••••••••  (already set)" : "Enter bot token"}
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(10,132,255,0.50)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                    <span style={{ display: "block", marginTop: 4, fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)" }}>
                      Get a token from @BotFather on Telegram
                    </span>
                  </div>
                </div>

                {/* Save */}
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleSave}
                    disabled={!dirty || mutation.isPending}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 9,
                      border: "none",
                      cursor: !dirty || mutation.isPending ? "not-allowed" : "pointer",
                      background: !dirty ? "rgba(255,255,255,0.06)" : "rgba(10,132,255,0.80)",
                      color: !dirty ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.95)",
                      fontSize: META_SIZE,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      fontFamily: '"SF Mono", monospace',
                      transition: "all 200ms ease",
                      opacity: mutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {mutation.isPending ? "⏳ SAVING…" : "SAVE"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App Info Panel ───────────────────────────────────────────────────────────

function AppInfoPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: health, isLoading: healthLoading, refetch: retryHealth } = useQuery({
    queryKey: ["apiHealth"],
    queryFn: () => api.getHealth(),
    refetchInterval: 30_000,
    retry: 1,
  });
  const healthConnected = !!health && health.status !== "unknown";
  const healthError = !healthLoading && !healthConnected;

  const items: { label: string; value: string; copyable?: boolean }[] = [
    { label: "Version", value: `v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}` },
    { label: "Environment", value: process.env.NODE_ENV ?? "production" },
    { label: "API Endpoint", value: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001", copyable: true },
    { label: "Network", value: "Polygon (USDC)" },
  ];

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div style={panelStyle}>
      <SectionHeader title="App Info" />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item) => (
          <div
            key={item.label}
            className="info-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.40)" }}>{item.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: META_SIZE,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {item.value}
              </span>
              {item.copyable && (
                <button
                  onClick={() => handleCopy(item.label, item.value)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 4px",
                    borderRadius: 4,
                    color: copiedKey === item.label ? "#30d158" : "rgba(255,255,255,0.20)",
                    fontSize: LABEL_SIZE,
                    fontFamily: '"SF Mono", monospace',
                    transition: "color 200ms ease",
                  }}
                  onMouseEnter={(e) => { if (copiedKey !== item.label) e.currentTarget.style.color = "rgba(255,255,255,0.50)"; }}
                  onMouseLeave={(e) => { if (copiedKey !== item.label) e.currentTarget.style.color = "rgba(255,255,255,0.20)"; }}
                  title="Copy to clipboard"
                >
                  {copiedKey === item.label ? "✓" : "⎘"}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* API Status row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
          }}
        >
          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.40)" }}>API Status</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {healthLoading ? (
              <>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.20)",
                    animation: "pulse-ring 1.5s ease infinite",
                  }}
                />
                <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "rgba(255,255,255,0.30)" }}>
                  Checking…
                </span>
              </>
            ) : healthError ? (
              <>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff453a", boxShadow: "0 0 6px rgba(255,69,58,0.5)" }} />
                <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "#ff453a" }}>
                  Disconnected
                </span>
                <button
                  onClick={() => retryHealth()}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: LABEL_SIZE,
                    color: "rgba(255,69,58,0.60)",
                    fontFamily: '"SF Mono", monospace',
                    padding: "0 4px",
                    textDecoration: "underline",
                  }}
                >
                  retry
                </button>
              </>
            ) : (
              <>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#30d158", boxShadow: "0 0 6px rgba(48,209,88,0.5)" }} />
                <span style={{ fontFamily: '"SF Mono", monospace', fontSize: META_SIZE, color: "#30d158" }}>
                  Connected
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
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
      </motion.div>

      <motion.div variants={fadeInUp}><PaperModePanel /></motion.div>
      <motion.div variants={fadeInUp}><RiskConfigPanel /></motion.div>
      <motion.div variants={fadeInUp}><TelegramSettingsPanel /></motion.div>
      <motion.div variants={fadeInUp}><AppInfoPanel /></motion.div>
    </motion.div>
  );
}
