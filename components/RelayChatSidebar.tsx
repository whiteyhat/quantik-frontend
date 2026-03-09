"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useQuantikStore } from "@/store/useQuantikStore";
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
} from "@/lib/relaySidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const DEFAULT_ACTIONS = [
  { label: "Refresh Signals", message: "Refresh signals now." },
  { label: "Show Positions", message: "Show my active positions." },
  { label: "Explain Risk", message: "What's my current risk status?" },
  { label: "Review Trades", message: "Review recent trades." },
];

const FALLBACK_SUGGESTIONS = [
  "What's my portfolio status?",
  "Any new scanner signals?",
  "What's my current risk status?",
];

const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  connected: { dot: "#30d158", text: "Connected" },
  active: { dot: "#30d158", text: "Active" },
  pending: { dot: "#ff9f0a", text: "Pending" },
  disconnected: { dot: "#ff453a", text: "Disconnected" },
  error: { dot: "#ff453a", text: "Attention" },
  default: { dot: "rgba(255,255,255,0.32)", text: "Standby" },
};

type SidebarMessage =
  | {
      id: number;
      role: "user";
      text: string;
    }
  | {
      id: number;
      role: "agent";
      text: string;
      latencyMs?: number;
      model?: string;
    }
  | {
      id: number;
      role: "trace";
      trace: RelayTraceEvent;
    }
  | {
      id: number;
      role: "context";
      kind: RelayContextKind;
      data: unknown;
    }
  | {
      id: number;
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

let nextMessageId = 0;
function getNextMessageId() {
  nextMessageId += 1;
  return nextMessageId;
}

function getAgentIntro(name: string, personality: string, emoji: string): string {
  switch (personality) {
    case "guardian":
      return `${emoji} ${name} online. I am already wired into scanner, portfolio, risk, and ops. Ask directly and I will pull the live internal view.`;
    case "adventurer":
      return `${emoji} ${name} ready. I can check active signals, portfolio state, risk posture, and recent decisions without making you restate the obvious.`;
    default:
      return `${emoji} ${name} here. Internal systems are connected. Ask about signals, portfolio, risk, or recent trades and I will summarize the latest state.`;
  }
}

const FALLBACK_INTRO =
  "Quantik intelligence is ready. Create or connect your agent to unlock scoped portfolio, scanner, risk, and runtime context in this drawer.";

function getTheme(personality: string): PersonalityTheme {
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
            Portfolio
          </span>
          <span style={{ color: theme.primary, fontSize: 12, fontWeight: 700 }}>
            {portfolio.totalValue != null ? `$${portfolio.totalValue.toFixed(2)}` : "Waiting"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Today</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: Number(portfolio.dailyPnl ?? 0) >= 0 ? "#30d158" : "#ff6b60" }}>
              {formatMoney(portfolio.dailyPnl)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Exposure</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(portfolio.exposurePct)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          {portfolio.positions?.length ? `${portfolio.positions.length} active positions in scope.` : portfolio.balanceMessage ?? "Portfolio snapshot ready."}
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
            Scanner
          </span>
          <span style={{ color: scanner.stale ? "#ff9f0a" : theme.primary, fontSize: 12, fontWeight: 700 }}>
            {scanner.count ?? 0} live
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)", fontWeight: 600, lineHeight: 1.4 }}>
          {topSignal?.question ?? "No high-conviction signals in cache."}
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
            {scanner.newSignalCount ? `${scanner.newSignalCount} new` : "No new alerts"}
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.46)" }}>
            {formatRelayRelativeTime(scanner.lastScannedAt ?? null)}
          </span>
          {scanner.action?.message && (
            <button
              onClick={() => onAction(scanner.action?.message ?? "Refresh signals now.")}
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
              {scanner.action?.label ?? "Refresh"}
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
            Risk
          </span>
          <span style={{ color: risk.circuitBreaker === "TRIGGERED" ? "#ff6b60" : theme.primary, fontSize: 12, fontWeight: 700 }}>
            {risk.circuitBreaker ?? "ARMED"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Exposure</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(risk.exposurePct)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Size Cap</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {formatPercent(risk.maxPositionSizePct, 100)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          {topTheme ? `Top cluster: ${topTheme[0]} ${topTheme[1].toFixed(1)}%. Daily PnL ${formatMoney(risk.dailyPnl)}.` : `Daily PnL ${formatMoney(risk.dailyPnl)}.`}
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

  return (
    <div style={sharedCardStyle} data-testid="relay-sidebar-context-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.46)", textTransform: "uppercase", fontWeight: 700 }}>
          Ops
        </span>
        <span style={{ color: theme.primary, fontSize: 12, fontWeight: 700 }}>
          {ops.health?.score != null ? `${ops.health.score}/100` : "Live"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.86)", fontWeight: 600 }}>
        {ops.agentName ?? "Agent runtime"}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
        Connection {ops.connectionStatus ?? "pending"}.
        {" "}
        {ops.autopilotEnabled ? "Autopilot enabled." : "Autopilot disabled."}
        {" "}
        Last heartbeat {formatRelayRelativeTime(ops.lastHeartbeat ?? null).replace("Synced ", "")}.
      </div>
    </div>
  );
}

function getContextLogLabel(kind: RelayContextKind): string {
  switch (kind) {
    case "portfolio":
      return "PORTFOLIO";
    case "scanner":
      return "SCANNER";
    case "risk":
      return "RISK";
    default:
      return "OPS";
  }
}

function getContextLogStatus(kind: RelayContextKind, data: unknown): string {
  if (kind === "scanner") {
    const scanner = data as { stale?: boolean };
    return scanner.stale ? "cached" : "live";
  }

  if (kind === "risk") {
    const risk = data as { circuitBreaker?: string };
    return risk.circuitBreaker?.toLowerCase() ?? "armed";
  }

  if (kind === "ops") {
    const ops = data as { connectionStatus?: string | null };
    return ops.connectionStatus?.toLowerCase() ?? "standby";
  }

  return "snapshot";
}

function getContextLogPreview(kind: RelayContextKind, data: unknown): string {
  if (kind === "portfolio") {
    const portfolio = data as {
      totalValue?: number | null;
      dailyPnl?: number;
      positions?: Array<{ slug: string }>;
    };

    return [
      portfolio.totalValue != null ? `$${portfolio.totalValue.toFixed(2)} total` : "Portfolio snapshot",
      `${formatMoney(portfolio.dailyPnl)} today`,
      `${portfolio.positions?.length ?? 0} active`,
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
      `${scanner.count ?? 0} signals`,
      scanner.newSignalCount ? `${scanner.newSignalCount} new` : "No new alerts",
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
      `Exposure ${formatPercent(risk.exposurePct)}`,
      `P&L ${formatMoney(risk.dailyPnl)}`,
      `Cap ${formatPercent(risk.maxPositionSizePct, 100)}`,
    ].join(" · ");
  }

  const ops = data as {
    health?: { score?: number | null };
    autopilotEnabled?: boolean;
    lastHeartbeat?: number | null;
  };

  return [
    ops.health?.score != null ? `Health ${ops.health.score}/100` : "Health pending",
    ops.autopilotEnabled ? "Autopilot on" : "Autopilot off",
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
  const status = getContextLogStatus(kind, data);
  const summary = getContextLogPreview(kind, data);

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
                {getContextLogLabel(kind)}
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
        Trade Confirmation
      </div>
      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.5 }}>
        {confirmation.direction} on <strong>{confirmation.slug}</strong> for ${confirmation.size.toFixed(2)} USDC.
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
          Confirm
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
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RelayChatSidebar({ open, onToggle, onFirstOpen }: RelayChatSidebarProps) {
  const myAgent = useQuantikStore((state) => state.myAgent);
  const agentName = myAgent?.name ?? "Relay";
  const agentEmoji = myAgent?.avatar_emoji ?? "🤝";
  const personality = myAgent?.personality ?? "balanced";
  const theme = getTheme(personality);

  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [contexts, setContexts] = useState<ContextState>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expandedContextIds, setExpandedContextIds] = useState<Record<number, boolean>>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [hasInjectedIntro, setHasInjectedIntro] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentMessageIdRef = useRef<number | null>(null);
  const activeTraceIdsRef = useRef<Record<string, number>>({});
  const activeContextIdsRef = useRef<Partial<Record<RelayContextKind, number>>>({});

  const statusTone = STATUS_TONE[myAgent?.connection_status ?? myAgent?.status ?? "default"] ?? STATUS_TONE.default;
  const scannerContext = contexts.scanner as {
    lastScannedAt?: number | null;
    stale?: boolean;
  } | undefined;
  const headerSyncLabel = scannerContext?.lastScannedAt
    ? `${scannerContext.stale ? "Cached" : "Scanner"} · ${formatRelayRelativeTime(scannerContext.lastScannedAt)}`
    : formatRelayRelativeTime(lastSyncAt);

  const suggestionPrompts = useMemo<SuggestionPrompt[]>(() => {
    const promptMap = new Map<string, SuggestionPrompt>();

    for (const suggestion of suggestions.length ? suggestions : FALLBACK_SUGGESTIONS) {
      const trimmed = suggestion.trim();
      if (!trimmed) continue;
      promptMap.set(trimmed.toLowerCase(), {
        label: trimmed,
        message: trimmed,
      });
    }

    for (const action of DEFAULT_ACTIONS) {
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
  }, [suggestions]);

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
        ? getAgentIntro(agentName, personality, agentEmoji)
        : FALLBACK_INTRO;
      window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: getNextMessageId(), role: "agent", text: intro }]);
      }, 240);
    }
  }, [agentEmoji, agentName, hasInjectedIntro, myAgent, onFirstOpen, open, personality]);

  const resetTurnState = useCallback(() => {
    activeTraceIdsRef.current = {};
    activeContextIdsRef.current = {};
    agentMessageIdRef.current = null;
  }, []);

  const toggleContextExpansion = useCallback((messageId: number) => {
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
          tokenId: confirmation.slug,
          side: confirmation.direction === "YES" ? "buy" : "sell",
          price: 0.5,
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
            ? `Trade executed. Order ID: ${payload.orderId ?? "pending"}.`
            : `Trade failed: ${payload.error ?? "Unknown error"}.`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "agent",
          text: "Trade execution failed. Check your connection and try again.",
        },
      ]);
    }
  }, []);

  const handleTradeCancel = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      { id: getNextMessageId(), role: "agent", text: "Trade cancelled." },
    ]);
  }, []);

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
      setSuggestions(event.suggestions?.length ? event.suggestions : FALLBACK_SUGGESTIONS);
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
          text: event.error ?? "Unable to reach the Quantik intelligence network right now.",
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
  }, [applyContextUpdate, applyDoneContexts]);

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

    try {
      const response = await fetch(`${API_URL}/api/v1/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": resolvedSessionId,
        },
        body: JSON.stringify({
          message: trimmed,
          sessionId: resolvedSessionId,
          clientContext: {
            lastSeenSignalAt: getRelaySidebarLastSeenSignalAt(localStorageRef),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "The agent chat endpoint is unavailable.");
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
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          handleParsedEvent(parseRelaySidebarEvent(payload));
        }
      }
    } catch (error) {
      setSending(false);
      setSuggestions(FALLBACK_SUGGESTIONS);
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId(),
          role: "agent",
          text: error instanceof Error
            ? error.message
            : `Unable to reach ${agentName}. Check your connection and try again.`,
        },
      ]);
    }
  }, [agentName, handleParsedEvent, resetTurnState, sending, sessionId]);

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
              Quantik Command Drawer
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
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 12,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            {myAgent?.autopilot_enabled ? "Autopilot On" : "Autopilot Off"}
          </div>
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
            Ask about portfolio, signals, risk, recent trades, or runtime status. Internal systems are already in the loop.
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "trace") {
            const trace = message.trace;
            return (
              <div
                key={message.id}
                data-testid="relay-sidebar-trace"
                style={{
                  marginLeft: 34,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: `1px solid ${trace.state === "done" ? `${theme.primary}33` : "rgba(255,255,255,0.08)"}`,
                  background: trace.state === "done"
                    ? `linear-gradient(135deg, ${theme.primary}18, rgba(255,255,255,0.03))`
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: trace.state === "done" ? theme.primary : "rgba(255,255,255,0.12)",
                      color: trace.state === "done" ? "#fff" : "rgba(255,255,255,0.65)",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    {trace.state === "done" ? "✓" : "•"}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.84)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {trace.label}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.66)", lineHeight: 1.5 }}>
                  {trace.status}
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
          placeholder={`Message ${agentName}...`}
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
