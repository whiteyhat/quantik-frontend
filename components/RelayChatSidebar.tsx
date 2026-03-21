"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslations, useLocale } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import { isPersonality, type Personality } from "@/lib/agents";
import { getAuthToken } from "@/lib/api";
import { readSSEStream } from "@/lib/sse";
import {
  extractLatestSignalTimestamp,
  formatRelayRelativeTime,
  getRelaySidebarLastSeenSignalAt,
  getRelaySidebarSessionId,
  parseRelaySidebarEvent,
  setRelaySidebarLastSeenSignalAt,
  type RelayContextKind,
  type RelayDoneEvent,
  type RelayTraceEvent,
  type RelayTimeFormats,
} from "@/lib/relaySidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SidebarMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "agent";
      text: string;
      latencyMs?: number;
      model?: string;
    }
  | {
      id: string;
      role: "trace";
      trace: RelayTraceEvent;
    }
  | {
      id: string;
      role: "context";
      kind: RelayContextKind;
      data: unknown;
    }
  | {
      id: string;
      role: "tool";
      tradeConfirmation: {
        slug: string;
        direction: string;
        size: number;
      };
    };

type ContextState = Partial<Record<RelayContextKind, unknown>>;

interface RelayChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  onFirstOpen?: () => void;
}

interface PersonalityTheme {
  primary: string;
  secondary: string;
  glow: string;
  panel: string;
  gradient: string;
}

interface SuggestionPrompt {
  label: string;
  message: string;
}

function getNextMessageId() {
  return crypto.randomUUID();
}

function getTheme(personality: Personality): PersonalityTheme {
  switch (personality) {
    case "guardian":
      return {
        primary: "#30d158",
        secondary: "#64d2ff",
        glow: "rgba(48,209,88,0.24)",
        panel: "rgba(20,30,24,0.92)",
        gradient: "radial-gradient(circle at top left, rgba(48,209,88,0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(100,210,255,0.16), transparent 44%), linear-gradient(180deg, rgba(7,11,14,0.98), rgba(12,18,24,0.96))",
      };
    case "adventurer":
      return {
        primary: "#ff9f0a",
        secondary: "#ffd60a",
        glow: "rgba(255,159,10,0.26)",
        panel: "rgba(28,18,8,0.92)",
        gradient: "radial-gradient(circle at top left, rgba(255,159,10,0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(255,214,10,0.12), transparent 44%), linear-gradient(180deg, rgba(11,8,6,0.98), rgba(22,15,10,0.96))",
      };
    default:
      return {
        primary: "#0a84ff",
        secondary: "#64d2ff",
        glow: "rgba(10,132,255,0.24)",
        panel: "rgba(10,12,20,0.92)",
        gradient: "radial-gradient(circle at top left, rgba(10,132,255,0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(100,210,255,0.14), transparent 44%), linear-gradient(180deg, rgba(8,10,18,0.98), rgba(12,15,24,0.96))",
      };
  }
}

function formatPercent(value: unknown, scale = 1): string {
  const parsed = Number(value ?? 0) * scale;
  return `${parsed.toFixed(1)}%`;
}

function formatMoney(value: unknown): string {
  const parsed = Number(value ?? 0);
  const sign = parsed > 0 ? "+" : "";
  return `${sign}$${parsed.toFixed(2)}`;
}

function ContextCard({
  kind,
  data,
  theme,
  onAction,
  surface = "panel",
}: {
  kind: RelayContextKind;
  data: unknown;
  theme: PersonalityTheme;
  onAction: (message: string) => void;
  surface?: "panel" | "inline";
}) {
  const t = useTranslations("relaySidebar");
  const isInline = surface === "inline";
  const sharedCardStyle: React.CSSProperties = {
    borderRadius: isInline ? 14 : 16,
    padding: isInline ? "12px 12px 10px" : "14px 14px 12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: isInline ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)",
    boxShadow: isInline ? "none" : `0 18px 40px ${theme.glow}`,
    minWidth: 0,
  };

  if (kind === "portfolio") {
    const portfolio = data as {
      totalValue?: number | null;
      dailyPnl?: number;
      positions?: Array<{ slug: string }>;
      exposurePct?: number;
      balanceMessage?: string;
    };

    return (
      <div style={sharedCardStyle} data-testid="relay-sidebar-context-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.46)", textTransform: "uppercase", fontWeight: 700 }}>
            {t("portfolioLabel")}
          </span>
          <span style={{ color: theme.primary, fontSize: 12, fontWeight: 700 }}>
            {portfolio.totalValue != null ? `$${portfolio.totalValue.toFixed(2)}` : t("portfolioWaiting")}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("portfolioToday")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: Number(portfolio.dailyPnl ?? 0) >= 0 ? "#30d158" : "#ff6b60" }}>
              {formatMoney(portfolio.dailyPnl)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("portfolioExposure")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(portfolio.exposurePct)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          {portfolio.positions?.length
            ? t("portfolioPositionsScope", { count: portfolio.positions.length })
            : portfolio.balanceMessage ?? t("portfolioSnapshotReady")}
        </div>
      </div>
    );
  }

  if (kind === "scanner") {
    const scanner = data as {
      count?: number;
      newSignalCount?: number;
      signals?: Array<{ question?: string; recommendation?: string; sigmaConfidence?: number }>;
      lastScannedAt?: number | null;
      stale?: boolean;
      action?: { message?: string; label?: string };
    };
    const topSignal = scanner.signals?.[0];

    return (
      <div style={sharedCardStyle} data-testid="relay-sidebar-context-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.46)", textTransform: "uppercase", fontWeight: 700 }}>
            {t("scannerLabel")}
          </span>
          <span style={{ color: scanner.stale ? "#ff9f0a" : theme.primary, fontSize: 12, fontWeight: 700 }}>
            {t("scannerLive", { count: scanner.count ?? 0 })}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)", fontWeight: 600, lineHeight: 1.4 }}>
          {topSignal?.question ?? t("scannerNoSignals")}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {topSignal?.recommendation && (
            <span style={{
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.82)",
              letterSpacing: "0.05em",
            }}>
              {topSignal.recommendation}
            </span>
          )}
          {typeof topSignal?.sigmaConfidence === "number" && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
              Sigma {Math.round(topSignal.sigmaConfidence * 100)}%
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.46)" }}>
            {scanner.newSignalCount ? t("scannerNew", { count: scanner.newSignalCount }) : t("scannerNoNewAlerts")}
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.46)" }}>
            {formatRelayRelativeTime(scanner.lastScannedAt ?? null)}
          </span>
          {scanner.action?.message && (
            <button
              onClick={() => onAction(scanner.action?.message ?? t("actionRefreshSignalsMsg"))}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: theme.primary,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {scanner.action?.label ?? t("scannerRefresh")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (kind === "risk") {
    const risk = data as {
      circuitBreaker?: string;
      exposurePct?: number;
      dailyPnl?: number;
      maxPositionSizePct?: number;
      themeExposure?: Record<string, number>;
    };
    const topTheme = risk.themeExposure
      ? Object.entries(risk.themeExposure).sort((a, b) => b[1] - a[1])[0]
      : null;

    return (
      <div style={sharedCardStyle} data-testid="relay-sidebar-context-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.46)", textTransform: "uppercase", fontWeight: 700 }}>
            {t("riskLabel")}
          </span>
          <span style={{ color: risk.circuitBreaker === "TRIGGERED" ? "#ff6b60" : theme.primary, fontSize: 12, fontWeight: 700 }}>
            {risk.circuitBreaker ?? t("riskArmed")}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("riskExposure")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(risk.exposurePct)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("riskSizeCap")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(risk.maxPositionSizePct, 100)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          {topTheme
            ? t("riskTopCluster", { theme: topTheme[0], pct: `${topTheme[1].toFixed(1)}%`, pnl: formatMoney(risk.dailyPnl) })
            : t("riskDailyPnl", { pnl: formatMoney(risk.dailyPnl) })}
        </div>
      </div>
    );
  }

  const ops = data as {
    connectionStatus?: string | null;
    autopilotEnabled?: boolean;
    lastHeartbeat?: number | null;
    health?: { status?: string; score?: number | null };
    agentName?: string | null;
  };

  const heartbeatFormats: RelayTimeFormats = {
    noSync: t("heartbeatNoSync"),
    justNow: t("heartbeatJustNow"),
    mAgo: (m) => t("heartbeatMAgo", { m }),
    hAgo: (h) => t("heartbeatHAgo", { h }),
    dAgo: (d) => t("heartbeatDAgo", { d }),
  };

  return (
    <div style={sharedCardStyle} data-testid="relay-sidebar-context-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.46)", textTransform: "uppercase", fontWeight: 700 }}>
          {t("opsLabel")}
        </span>
        <span style={{ color: theme.primary, fontSize: 12, fontWeight: 700 }}>
          {ops.health?.score != null ? `${ops.health.score}/100` : t("opsLive")}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)", fontWeight: 600 }}>
        {ops.agentName ?? t("opsAgentRuntime")}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
        {t("opsConnection", { status: ops.connectionStatus ?? "pending" })}
        {" "}
        {ops.autopilotEnabled ? t("opsAutopilotEnabled") : t("opsAutopilotDisabled")}
        {" "}
        {t("opsLastHeartbeat", { time: formatRelayRelativeTime(ops.lastHeartbeat ?? null, Date.now(), heartbeatFormats) })}
      </div>
    </div>
  );
}

function getContextLogLabel(kind: RelayContextKind, t: ReturnType<typeof useTranslations<"relaySidebar">>): string {
  switch (kind) {
    case "portfolio":
      return t("contextLabelPortfolio");
    case "scanner":
      return t("contextLabelScanner");
    case "risk":
      return t("contextLabelRisk");
    default:
      return t("contextLabelOps");
  }
}

function getContextLogStatus(kind: RelayContextKind, data: unknown, t: ReturnType<typeof useTranslations<"relaySidebar">>): string {
  if (kind === "scanner") {
    const scanner = data as { stale?: boolean };
    return scanner.stale ? t("scannerStatusCached") : t("scannerStatusLive");
  }

  if (kind === "risk") {
    const risk = data as { circuitBreaker?: string };
    return risk.circuitBreaker?.toLowerCase() ?? t("riskStatusArmed");
  }

  if (kind === "ops") {
    const ops = data as { connectionStatus?: string | null };
    return ops.connectionStatus?.toLowerCase() ?? t("statusStandby").toLowerCase();
  }

  return t("contextStatusSnapshot");
}

function getContextLogPreview(kind: RelayContextKind, data: unknown, t: ReturnType<typeof useTranslations<"relaySidebar">>): string {
  if (kind === "portfolio") {
    const portfolio = data as {
      totalValue?: number | null;
      dailyPnl?: number;
      positions?: Array<{ slug: string }>;
    };

    return [
      portfolio.totalValue != null
        ? t("previewTotal", { amount: `$${portfolio.totalValue.toFixed(2)}` })
        : t("previewPortfolioSnapshot"),
      t("previewToday", { amount: formatMoney(portfolio.dailyPnl) }),
      t("previewActivePositions", { count: portfolio.positions?.length ?? 0 }),
    ].join(" · ");
  }

  if (kind === "scanner") {
    const scanner = data as {
      count?: number;
      newSignalCount?: number;
      signals?: Array<{ question?: string }>;
      lastScannedAt?: number | null;
    };
    const topSignal = scanner.signals?.[0]?.question;

    return [
      t("previewSignals", { count: scanner.count ?? 0 }),
      scanner.newSignalCount
        ? t("previewNewAlerts", { count: scanner.newSignalCount })
        : t("previewNoNewAlerts"),
      topSignal ?? formatRelayRelativeTime(scanner.lastScannedAt ?? null),
    ].join(" · ");
  }

  if (kind === "risk") {
    const risk = data as {
      exposurePct?: number;
      dailyPnl?: number;
      maxPositionSizePct?: number;
    };

    return [
      t("previewExposure", { pct: formatPercent(risk.exposurePct) }),
      t("previewPnl", { amount: formatMoney(risk.dailyPnl) }),
      t("previewCap", { pct: formatPercent(risk.maxPositionSizePct, 100) }),
    ].join(" · ");
  }

  const ops = data as {
    health?: { score?: number | null };
    autopilotEnabled?: boolean;
    lastHeartbeat?: number | null;
  };

  return [
    ops.health?.score != null
      ? t("previewHealth", { score: ops.health.score })
      : t("previewHealthPending"),
    ops.autopilotEnabled ? t("previewAutopilotOn") : t("previewAutopilotOff"),
    formatRelayRelativeTime(ops.lastHeartbeat ?? null),
  ].join(" · ");
}

function ContextLogEntry({
  kind,
  data,
  theme,
  expanded,
  onToggle,
  onAction,
}: {
  kind: RelayContextKind;
  data: unknown;
  theme: PersonalityTheme;
  expanded: boolean;
  onToggle: () => void;
  onAction: (message: string) => void;
}) {
  const t = useTranslations("relaySidebar");
  const status = getContextLogStatus(kind, data, t);
  const summary = getContextLogPreview(kind, data, t);

  return (
    <div style={{ marginLeft: 34 }} data-testid="relay-sidebar-context-log">
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${theme.primary}24`,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          overflow: "hidden",
          boxShadow: `0 14px 36px ${theme.glow}`,
        }}
      >
        <button
          data-testid="relay-sidebar-context-toggle"
          onClick={onToggle}
          style={{
            width: "100%",
            padding: "11px 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              marginTop: 1,
              fontSize: 12,
              color: "rgba(255,255,255,0.58)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {expanded ? "▾" : "▸"}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: theme.primary,
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {getContextLogLabel(kind, t)}
              </span>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.68)",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {status}
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.60)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              }}
            >
              {summary}
            </div>
          </div>
        </button>

        {expanded && (
          <div style={{ padding: "0 10px 10px 34px" }}>
            <ContextCard
              kind={kind}
              data={data}
              theme={theme}
              onAction={onAction}
              surface="inline"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TradeConfirmationBubble({
  confirmation,
  onConfirm,
  onCancel,
  theme,
}: {
  confirmation: { slug: string; direction: string; size: number };
  onConfirm: () => void;
  onCancel: () => void;
  theme: PersonalityTheme;
}) {
  const t = useTranslations("relaySidebar");
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,159,10,0.24)",
        background: "rgba(255,159,10,0.08)",
        padding: "12px 12px 10px",
      }}
    >
      <div style={{ fontSize: 11, color: "#ffb340", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {t("tradeConfirmationTitle")}
      </div>
      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.5 }}>
        {t("tradeDirectionText", { direction: confirmation.direction, slug: confirmation.slug, size: confirmation.size.toFixed(2) })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 10,
            border: "none",
            background: theme.primary,
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("tradeConfirm")}
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "transparent",
            color: "rgba(255,255,255,0.66)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("tradeCancel")}
        </button>
      </div>
    </div>
  );
}

export function RelayChatSidebar({ open, onToggle, onFirstOpen }: RelayChatSidebarProps) {
  const t = useTranslations("relaySidebar");
  const locale = useLocale();
  const myAgent = useQuantikStore((state) => state.myAgent);
  const agentName = myAgent?.name ?? "Relay";
  const agentEmoji = myAgent?.avatar_emoji ?? "🤝";
  const rawPersonality = myAgent?.personality ?? "balanced";
  const personality: Personality = isPersonality(rawPersonality) ? rawPersonality : "balanced";
  const theme = useMemo(() => getTheme(personality), [personality]);

  const defaultActions = useMemo(() => [
    { label: t("actionRefreshSignals"), message: t("actionRefreshSignalsMsg") },
    { label: t("actionShowPositions"), message: t("actionShowPositionsMsg") },
    { label: t("actionExplainRisk"), message: t("actionExplainRiskMsg") },
    { label: t("actionReviewTrades"), message: t("actionReviewTradesMsg") },
  ], [t]);

  const fallbackSuggestions = useMemo(() => [
    t("fallbackSuggestion1"),
    t("fallbackSuggestion2"),
    t("fallbackSuggestion3"),
  ], [t]);

  const statusToneMap = useMemo(() => ({
    connected: { dot: "#30d158", text: t("statusConnected") },
    active: { dot: "#30d158", text: t("statusActive") },
    pending: { dot: "#ff9f0a", text: t("statusPending") },
    disconnected: { dot: "#ff453a", text: t("statusDisconnected") },
    error: { dot: "#ff453a", text: t("statusAttention") },
    default: { dot: "rgba(255,255,255,0.32)", text: t("statusStandby") },
  }), [t]);

  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [contexts, setContexts] = useState<ContextState>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expandedContextIds, setExpandedContextIds] = useState<Record<string, boolean>>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [hasInjectedIntro, setHasInjectedIntro] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentMessageIdRef = useRef<string | null>(null);
  const activeTraceIdsRef = useRef<Record<string, string>>({});
  const activeContextIdsRef = useRef<Partial<Record<RelayContextKind, string>>>({});

  const rawStatusKey = (myAgent?.connection_status ?? myAgent?.status ?? "default") as keyof typeof statusToneMap;
  // When autopilot is enabled and the agent hasn't yet reported a live connection_status,
  // the raw status can be stuck on "pending". Promote it to "active" so the pill
  // reflects reality instead of a stale initialisation state.
  const effectiveStatusKey =
    myAgent?.autopilot_enabled && (rawStatusKey === "pending" || rawStatusKey === "default")
      ? "active"
      : rawStatusKey;
  const statusTone = statusToneMap[effectiveStatusKey] ?? statusToneMap.default;

  const syncFormats: RelayTimeFormats = useMemo(() => ({
    noSync: t("syncNoSync"),
    justNow: t("syncJustNow"),
    mAgo: (m) => t("syncMAgo", { m }),
    hAgo: (h) => t("syncHAgo", { h }),
    dAgo: (d) => t("syncDAgo", { d }),
  }), [t]);

  const scannerContext = contexts.scanner as {
    lastScannedAt?: number | null;
    stale?: boolean;
  } | undefined;

  const headerSyncLabel = useMemo(() => {
    if (scannerContext?.lastScannedAt) {
      const prefix = scannerContext.stale ? t("cachedLabel") : t("scannerSyncLabel");
      return `${prefix} · ${formatRelayRelativeTime(scannerContext.lastScannedAt, Date.now(), syncFormats)}`;
    }
    if (lastSyncAt) return formatRelayRelativeTime(lastSyncAt, Date.now(), syncFormats);
    if (myAgent?.autopilot_enabled) return t("autopilotOn");
    return t("syncNoSync");
  }, [scannerContext, lastSyncAt, myAgent?.autopilot_enabled, t, syncFormats]);

  const suggestionPrompts = useMemo<SuggestionPrompt[]>(() => {
    const promptMap = new Map<string, SuggestionPrompt>();

    for (const suggestion of suggestions.length ? suggestions : fallbackSuggestions) {
      const trimmed = suggestion.trim();
      if (!trimmed) continue;
      promptMap.set(trimmed.toLowerCase(), {
        label: trimmed,
        message: trimmed,
      });
    }

    for (const action of defaultActions) {
      const key = action.message.toLowerCase();
      if (!promptMap.has(key)) {
        promptMap.set(key, {
          label: action.label,
          message: action.message,
        });
      }
      if (promptMap.size >= 3) break;
    }

    return Array.from(promptMap.values()).slice(0, 3);
  }, [suggestions, fallbackSuggestions, defaultActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSessionId(getRelaySidebarSessionId(window.localStorage));
  }, []);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open]);

  useEffect(() => {
    if (open && !hasInjectedIntro) {
      setHasInjectedIntro(true);
      onFirstOpen?.();
      const intro = myAgent
        ? (personality === "guardian"
            ? t("introGuardian", { emoji: agentEmoji, name: agentName })
            : personality === "adventurer"
            ? t("introAdventurer", { emoji: agentEmoji, name: agentName })
            : t("introDefault", { emoji: agentEmoji, name: agentName }))
        : t("fallbackIntro");
      window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: getNextMessageId(), role: "agent", text: intro }]);
      }, 240);
    }
  }, [agentEmoji, agentName, hasInjectedIntro, myAgent, onFirstOpen, open, personality, t]);

  const resetTurnState = useCallback(() => {
    activeTraceIdsRef.current = {};
    activeContextIdsRef.current = {};
    agentMessageIdRef.current = null;
  }, []);

  const toggleContextExpansion = useCallback((messageId: string) => {
    setExpandedContextIds((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  const applyContextUpdate = useCallback((kind: RelayContextKind, data: unknown) => {
    setContexts((prev) => ({ ...prev, [kind]: data }));

    if (kind === "scanner" && typeof window !== "undefined") {
      const latestSignalTimestamp = extractLatestSignalTimestamp(data);
      if (latestSignalTimestamp) {
        setRelaySidebarLastSeenSignalAt(window.localStorage, latestSignalTimestamp);
      }
    }

    const existingId = activeContextIdsRef.current[kind];
    if (existingId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.role === "context" && message.id === existingId
            ? { ...message, data }
            : message,
        ),
      );
      return;
    }

    const nextId = getNextMessageId();
    activeContextIdsRef.current[kind] = nextId;
    setExpandedContextIds((prev) => ({ ...prev, [nextId]: false }));
    setMessages((prev) => [...prev, { id: nextId, role: "context", kind, data }]);
  }, []);

  const handleTradeConfirm = useCallback(async (confirmation: { slug: string; direction: string; size: number }) => {
    try {
      const response = await fetch(`${API_URL}/api/trade/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: confirmation.direction,
          size: confirmation.size,
          marketSlug: confirmation.slug,
        }),
      });
      const payload = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "agent",
          text: response.ok
            ? t("tradeExecuted", { orderId: payload.orderId ?? "pending" })
            : t("tradeFailed", { error: payload.error ?? "Unknown error" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "agent",
          text: t("tradeExecutionFailed"),
        },
      ]);
    }
  }, [t]);

  const handleTradeCancel = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      { id: getNextMessageId(), role: "agent", text: t("tradeCancelled") },
    ]);
  }, [t]);

  const applyDoneContexts = useCallback((doneEvent: RelayDoneEvent) => {
    if (!doneEvent.contexts) return;
    for (const [kind, data] of Object.entries(doneEvent.contexts) as Array<[RelayContextKind, unknown]>) {
      if (data == null) continue;
      applyContextUpdate(kind, data);
    }
  }, [applyContextUpdate]);

  const handleParsedEvent = useCallback((event: ReturnType<typeof parseRelaySidebarEvent>) => {
    if (!event) return;

    if (event.type === "trace") {
      const existingId = activeTraceIdsRef.current[event.key];
      if (existingId) {
        setMessages((prev) =>
          prev.map((message) =>
            message.role === "trace" && message.id === existingId
              ? { ...message, trace: event }
              : message,
          ),
        );
        return;
      }

      const traceId = getNextMessageId();
      activeTraceIdsRef.current[event.key] = traceId;
      setMessages((prev) => [...prev, { id: traceId, role: "trace", trace: event }]);
      return;
    }

    if (event.type === "context") {
      applyContextUpdate(event.kind, event.data);
      return;
    }

    if (event.type === "token") {
      if (agentMessageIdRef.current == null) {
        const id = getNextMessageId();
        agentMessageIdRef.current = id;
        setMessages((prev) => [...prev, { id, role: "agent", text: event.token }]);
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.role === "agent" && message.id === agentMessageIdRef.current
            ? { ...message, text: message.text + event.token }
            : message,
        ),
      );
      return;
    }

    if (event.type === "done") {
      setLastSyncAt(Date.now());
      setSending(false);
      setSuggestions(event.suggestions?.length ? event.suggestions : fallbackSuggestions);
      applyDoneContexts(event);
      if (agentMessageIdRef.current != null) {
        setMessages((prev) =>
          prev.map((message) =>
            message.role === "agent" && message.id === agentMessageIdRef.current
              ? {
                  ...message,
                  text: event.reply ?? message.text,
                  latencyMs: event.latencyMs,
                  model: event.model,
                }
              : message,
          ),
        );
      } else if (event.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: getNextMessageId(),
            role: "agent",
            text: event.reply ?? "",
            latencyMs: event.latencyMs,
            model: event.model,
          },
        ]);
      }
      return;
    }

    if (event.type === "error") {
      setSending(false);
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "agent",
          text: event.error ?? t("networkErrorGeneric"),
        },
      ]);
      return;
    }

    if (event.type === "trade_confirmation") {
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "tool",
          tradeConfirmation: {
            slug: event.slug,
            direction: event.direction,
            size: event.size,
          },
        },
      ]);
    }
  }, [applyContextUpdate, applyDoneContexts, fallbackSuggestions, t]);

  const sendMessageWithText = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    resetTurnState();
    setSending(true);
    setInput("");
    setSuggestions([]);
    setMessages((prev) => [...prev, { id: getNextMessageId(), role: "user", text: trimmed }]);

    const localStorageRef = typeof window !== "undefined" ? window.localStorage : null;
    const resolvedSessionId = sessionId || getRelaySidebarSessionId(localStorageRef);
    if (!sessionId) setSessionId(resolvedSessionId);

    const abortController = new AbortController();
    const fetchTimeout = setTimeout(() => abortController.abort(), 90_000);

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/v1/agent/chat`, {
        method: "POST",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": resolvedSessionId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          sessionId: resolvedSessionId,
          locale,
          clientContext: {
            lastSeenSignalAt: getRelaySidebarLastSeenSignalAt(localStorageRef),
          },
        }),
      });
      clearTimeout(fetchTimeout);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? t("networkErrorGeneric"));
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        const payload = await response.json() as RelayDoneEvent;
        handleParsedEvent({
          type: "done",
          reply: payload.reply,
          latencyMs: payload.latencyMs,
          model: payload.model,
          suggestions: payload.suggestions,
          contexts: payload.contexts,
          agentName: payload.agentName,
          agentEmoji: payload.agentEmoji,
        });
        return;
      }

      const reader = response.body.getReader();
      await readSSEStream(reader, (payload) => {
        handleParsedEvent(parseRelaySidebarEvent(payload));
      });
    } catch (error) {
      clearTimeout(fetchTimeout);
      setSending(false);
      setSuggestions(fallbackSuggestions);
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      const errorText = isAbort
        ? t("networkErrorTimeout")
        : error instanceof Error
          ? error.message
          : t("networkErrorAgent", { name: agentName });
      setMessages((prev) => [
        ...prev,
        { id: getNextMessageId(), role: "agent", text: errorText },
      ]);
    }
  }, [agentName, fallbackSuggestions, handleParsedEvent, locale, resetTurnState, sending, sessionId, t]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessageWithText(input);
    }
  }

  return (
    <div
      className="w-screen md:w-[420px]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100dvh",
        zIndex: 60,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        background: theme.gradient,
        backdropFilter: "blur(36px)",
        WebkitBackdropFilter: "blur(36px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: `28px 0 80px ${theme.glow}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${theme.primary}33, ${theme.secondary}26)`,
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: `0 16px 36px ${theme.glow}`,
            }}
          >
            {agentEmoji}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.94)", letterSpacing: "-0.02em" }}>
              {agentName}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.48)", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {t("commandDrawer")}
            </div>
          </div>
          <button
            onClick={onToggle}
            style={{
              marginLeft: "auto",
              width: 32,
              height: 32,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 12,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusTone.dot, boxShadow: `0 0 18px ${statusTone.dot}` }} />
            {statusTone.text}
          </div>
          {(() => {
            const apStr = myAgent?.autopilot_enabled ? t("autopilotOn") : t("autopilotOff");
            const lastSpace = apStr.lastIndexOf(" ");
            const prefix = apStr.slice(0, lastSpace);
            const state = apStr.slice(lastSpace + 1);
            return (
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: myAgent?.autopilot_enabled ? "1px solid rgba(48,209,88,0.22)" : "1px solid rgba(255,255,255,0.08)",
                  background: myAgent?.autopilot_enabled ? "rgba(48,209,88,0.07)" : "rgba(255,255,255,0.04)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {prefix}{" "}
                <span style={{ color: myAgent?.autopilot_enabled ? "#30d158" : "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                  {state}
                </span>
              </div>
            );
          })()}
          {(scannerContext?.lastScannedAt || lastSyncAt) && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              {headerSyncLabel}
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "36px 22px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.42)",
              lineHeight: 1.7,
              boxShadow: `0 20px 50px ${theme.glow}`,
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 12 }}>{agentEmoji}</div>
            {t("emptyState")}
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "trace") {
            const trace = message.trace;
            const isRunning = trace.state !== "done";

            const traceLabel = trace.labelKey ? t(trace.labelKey as never) : trace.label;
            const traceStatus = trace.statusKey ? t(trace.statusKey as never) : trace.status;
            return (
              <div
                key={message.id}
                data-testid="relay-sidebar-trace"
                style={{
                  marginLeft: 34,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: `1px solid ${!isRunning ? `${theme.primary}33` : "rgba(255,255,255,0.08)"}`,
                  background: !isRunning
                    ? `linear-gradient(135deg, ${theme.primary}18, rgba(255,255,255,0.03))`
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isRunning ? (
                    <div style={{ width: 18, height: 18, flexShrink: 0, position: "relative" }}>
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.12)",
                        borderTopColor: theme.primary,
                        borderRightColor: theme.primary,
                        animation: "traceSpinRing 700ms linear infinite",
                      }} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 18, height: 18, borderRadius: 999,
                        background: theme.primary,
                        color: "#fff", fontSize: 11,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, flexShrink: 0,
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.84)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {traceLabel}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.66)", lineHeight: 1.5 }}>
                  {traceStatus}
                  {trace.detail ? ` ${trace.detail}` : ""}
                </div>
              </div>
            );
          }

          if (message.role === "context") {
            return (
              <ContextLogEntry
                key={message.id}
                kind={message.kind}
                data={message.data}
                theme={theme}
                expanded={expandedContextIds[message.id] ?? true}
                onToggle={() => toggleContextExpansion(message.id)}
                onAction={(nextMessage) => void sendMessageWithText(nextMessage)}
              />
            );
          }

          if (message.role === "tool") {
            return (
              <div key={message.id} style={{ marginLeft: 34 }}>
                <TradeConfirmationBubble
                  confirmation={message.tradeConfirmation}
                  onConfirm={() => void handleTradeConfirm(message.tradeConfirmation)}
                  onCancel={handleTradeCancel}
                  theme={theme}
                />
              </div>
            );
          }

          const isUser = message.role === "user";
          const baseBubbleStyle: React.CSSProperties = {
            maxWidth: "82%",
            padding: "10px 12px",
            borderRadius: isUser ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
            border: isUser ? `1px solid ${theme.primary}40` : "1px solid rgba(255,255,255,0.08)",
            background: isUser
              ? `linear-gradient(135deg, ${theme.primary}26, ${theme.secondary}14)`
              : "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.88)",
            fontSize: 13,
            lineHeight: 1.6,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          };

          return (
            <div
              key={message.id}
              style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${theme.primary}30, ${theme.secondary}18)`,
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {agentEmoji}
                </div>
              )}
              <div style={baseBubbleStyle}>
                {message.role === "agent" ? <ReactMarkdown>{message.text}</ReactMarkdown> : message.text}
                {message.role === "agent" && message.latencyMs != null && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.46)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {message.latencyMs}ms
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sending && agentMessageIdRef.current == null && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${theme.primary}30, ${theme.secondary}18)`,
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              {agentEmoji}
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "18px 18px 18px 6px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.42)",
                fontSize: 18,
                letterSpacing: 3,
              }}
            >
              ...
            </div>
          </div>
        )}
      </div>

      {suggestionPrompts.length > 0 && !sending && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            padding: "10px 12px 0",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {suggestionPrompts.map((prompt) => (
            <button
              key={`${prompt.label}:${prompt.message}`}
              data-testid="relay-sidebar-suggestion"
              onClick={() => void sendMessageWithText(prompt.message)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.70)",
                fontSize: 12,
                lineHeight: 1.3,
                cursor: "pointer",
              }}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          padding: "12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))",
        }}
      >
        <textarea
          ref={inputRef}
          data-testid="relay-sidebar-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t("inputPlaceholder", { name: agentName })}
          style={{
            flex: 1,
            minHeight: 48,
            maxHeight: 120,
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.88)",
            resize: "none",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
            boxShadow: `0 12px 28px ${theme.glow}`,
          }}
        />
        <button
          onClick={() => void sendMessageWithText(input)}
          disabled={!input.trim() || sending}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            border: "none",
            background: input.trim() && !sending
              ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
              : "rgba(255,255,255,0.08)",
            color: input.trim() && !sending ? "#fff" : "rgba(255,255,255,0.28)",
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            fontSize: 18,
            fontWeight: 700,
            boxShadow: input.trim() && !sending ? `0 18px 38px ${theme.glow}` : "none",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
