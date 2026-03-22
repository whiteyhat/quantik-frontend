"use client";

import { useEffect, useState } from "react";
import { api, type Market, type AgentTokenStatus } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { Zap } from "lucide-react";
import { TokenizeModal } from "@/components/TokenizeModal/TokenizeModal";

const railStyle: React.CSSProperties = {
  position: "sticky",
  top: 12,
  zIndex: 15,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

function QuickActionCard({
  title,
  subtitle,
  accent,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 18,
        border: `1px solid ${accent}35`,
        background: `linear-gradient(135deg, ${accent}18, var(--glass-surface))`,
        color: "var(--text-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: "0.08em", marginBottom: 8 }}>
        ACTION
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{subtitle}</div>
    </button>
  );
}

function MarketPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const load = search.trim()
      ? api.getMarkets(search.trim(), undefined, 20, 0)
      : api.getTrendingMarkets();

    load.then((response) => {
      if (active) setMarkets(response.markets);
    }).catch(() => {
      if (active) setMarkets([]);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [open, search]);

  if (!open) return null;

  return (
    <>
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          border: "none",
          background: "rgba(0,0,0,0.5)",
          zIndex: 70,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: "8vh 16px auto",
          maxWidth: 680,
          margin: "0 auto",
          left: 0,
          right: 0,
          zIndex: 71,
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          background: "var(--panel-surface)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          padding: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Run Pipeline</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pick a market and open analysis in autorun mode.</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search markets"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-surface)",
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        />
        <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>Loading markets…</div>
          ) : markets.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>No markets found.</div>
          ) : (
            markets.map((market) => (
              <button
                key={market.slug}
                onClick={() => {
                  router.push(`/market/${market.slug}?autorun=1`);
                  onClose();
                }}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{market.question}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>{market.category ?? "All"}</span>
                  <span>Vol {Math.round(market.volume)}</span>
                  <span>YES {Math.round((market.probability ?? market.yesPrice ?? 0) * 100)}¢</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function QuickActionRail({
  agentId,
  agentName,
  agentCode,
  autopilotEnabled,
  onAutopilotChanged,
}: {
  agentId: string;
  agentName?: string;
  agentCode?: string | null;
  autopilotEnabled: boolean;
  onAutopilotChanged: (enabled: boolean, updatedAt: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tokenizeModalOpen, setTokenizeModalOpen] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<AgentTokenStatus | null>(null);
  const setNotificationsOpen = useNotificationsStore((state) => state.setOpen);

  // Fetch token status on mount to show the correct badge
  useEffect(() => {
    if (!agentId) return;
    api.getAgentTokenStatus(agentId)
      .then((status) => setTokenStatus(status))
      .catch(() => setTokenStatus(null));
  }, [agentId]);

  async function handleAutopilotToggle() {
    setBusy(true);
    try {
      const response = await api.updateAutopilot(agentId, !autopilotEnabled);
      onAutopilotChanged(response.autopilot_enabled, response.autopilot_updated_at);
    } finally {
      setBusy(false);
    }
  }

  const tokenBadgeColor = tokenStatus?.token?.status === "migrated" ? "#30D158" : "#FF9F0A";
  const tokenBadgeLabel = tokenStatus?.token
    ? (tokenStatus.token.status === "migrated" ? "Live on DAMM" : "Bonding")
    : null;

  return (
    <>
      <div style={railStyle}>
        <QuickActionCard
          title="Run Pipeline"
          subtitle="Search a market and jump into autorun analysis."
          accent="var(--ios-blue)"
          onClick={() => setPickerOpen(true)}
        />
        <QuickActionCard
          title="Panic"
          subtitle="Open the hardened emergency protocol modal."
          accent="var(--ios-red)"
          onClick={() => window.dispatchEvent(new CustomEvent("open-panic"))}
        />
        <QuickActionCard
          title={autopilotEnabled ? "Pause Autopilot" : "Resume Autopilot"}
          subtitle="Toggle execution without changing the saved policy envelope."
          accent="var(--ios-orange)"
          onClick={() => void handleAutopilotToggle()}
          disabled={busy}
        />
        <QuickActionCard
          title="Notifications"
          subtitle="Open the operator inbox with live risk, trade, and alert events."
          accent="var(--ios-purple)"
          onClick={() => setNotificationsOpen(true)}
        />
        {/* Tokenize Agent card (per D-01, TKN-01) */}
        <button
          onClick={() => setTokenizeModalOpen(true)}
          aria-label={`Tokenize ${agentName ?? "agent"} to create trading tokens`}
          style={{
            textAlign: "left", padding: 16, borderRadius: 18,
            border: `1px solid ${tokenStatus?.token ? `${tokenBadgeColor}35` : "#007AFF35"}`,
            background: `linear-gradient(135deg, ${tokenStatus?.token
              ? (tokenStatus.token.status === "migrated" ? "rgba(48,209,88,0.08)" : "rgba(255,159,10,0.08)")
              : "rgba(0,122,255,0.08)"
            }, var(--glass-surface))`,
            color: "var(--text-primary)", cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Zap size={16} style={{ color: tokenStatus?.token?.status === "migrated" ? "#30D158" : "#007AFF" }} />
            {tokenBadgeLabel && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: tokenStatus?.token?.status === "migrated"
                  ? "rgba(48,209,88,0.18)" : "rgba(255,159,10,0.18)",
                color: tokenBadgeColor,
                border: `1px solid ${tokenBadgeColor}50`,
              }}>
                {tokenBadgeLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Tokenize Agent</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {tokenStatus?.tokenized ? "View token trading" : "Create trading tokens"}
          </div>
        </button>
      </div>
      <MarketPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
      {agentName && (
        <TokenizeModal
          open={tokenizeModalOpen}
          onClose={() => setTokenizeModalOpen(false)}
          agentId={agentId}
          agentName={agentName}
          agentCode={agentCode ?? null}
        />
      )}
    </>
  );
}
