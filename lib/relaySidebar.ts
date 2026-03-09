export type RelayContextKind = "portfolio" | "scanner" | "risk" | "ops";

export interface RelayTraceEvent {
  type: "trace";
  key: string;
  label: string;
  status: string;
  state?: "running" | "done";
  detail?: string;
}

export interface RelayContextEvent {
  type: "context";
  kind: RelayContextKind;
  data: unknown;
}

export interface RelayTokenEvent {
  type: "token";
  token: string;
}

export interface RelayDoneEvent {
  type: "done";
  reply?: string;
  latencyMs?: number;
  model?: string;
  suggestions?: string[];
  contexts?: Record<string, unknown>;
  agentName?: string;
  agentEmoji?: string | null;
}

export interface RelayErrorEvent {
  type: "error";
  error?: string;
}

export interface RelayTradeConfirmationEvent {
  type: "trade_confirmation";
  slug: string;
  direction: string;
  size: number;
}

export type RelaySidebarEvent =
  | RelayTraceEvent
  | RelayContextEvent
  | RelayTokenEvent
  | RelayDoneEvent
  | RelayErrorEvent
  | RelayTradeConfirmationEvent;

export const RELAY_SIDEBAR_SESSION_KEY = "quantik_relay_sidebar_session";
export const RELAY_SIDEBAR_LAST_SEEN_SIGNAL_KEY = "quantik_relay_sidebar_last_seen_signal_at";

export function parseRelaySidebarEvent(payload: string): RelaySidebarEvent | null {
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.type === "trace") {
      return {
        type: "trace",
        key: String(parsed.key ?? ""),
        label: String(parsed.label ?? ""),
        status: String(parsed.status ?? ""),
        state: parsed.state === "done" ? "done" : "running",
        detail: typeof parsed.detail === "string" ? parsed.detail : undefined,
      };
    }
    if (parsed.type === "context") {
      return {
        type: "context",
        kind: parsed.kind as RelayContextKind,
        data: parsed.data,
      };
    }
    if (parsed.type === "done") {
      return {
        type: "done",
        reply: typeof parsed.reply === "string" ? parsed.reply : undefined,
        latencyMs: typeof parsed.latencyMs === "number" ? parsed.latencyMs : undefined,
        model: typeof parsed.model === "string" ? parsed.model : undefined,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((item): item is string => typeof item === "string")
          : undefined,
        contexts: parsed.contexts && typeof parsed.contexts === "object"
          ? parsed.contexts as Record<string, unknown>
          : undefined,
        agentName: typeof parsed.agentName === "string" ? parsed.agentName : undefined,
        agentEmoji: typeof parsed.agentEmoji === "string" ? parsed.agentEmoji : null,
      };
    }
    if (parsed.type === "error") {
      return {
        type: "error",
        error: typeof parsed.error === "string" ? parsed.error : undefined,
      };
    }
    if (parsed.type === "trade_confirmation") {
      return {
        type: "trade_confirmation",
        slug: String(parsed.slug ?? ""),
        direction: String(parsed.direction ?? ""),
        size: Number(parsed.size ?? 0),
      };
    }
    if (
      parsed.type === "token" ||
      typeof parsed.token === "string" ||
      typeof parsed.delta === "string" ||
      typeof parsed.text === "string" ||
      typeof parsed.content === "string"
    ) {
      return {
        type: "token",
        token: String(parsed.token ?? parsed.delta ?? parsed.text ?? parsed.content ?? ""),
      };
    }
  } catch {
    return { type: "token", token: payload };
  }

  return null;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `relay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRelaySidebarSessionId(storage: Storage | null): string {
  if (!storage) return createLocalId();

  let id = storage.getItem(RELAY_SIDEBAR_SESSION_KEY);
  if (!id) {
    id = createLocalId();
    storage.setItem(RELAY_SIDEBAR_SESSION_KEY, id);
  }
  return id;
}

export function getRelaySidebarLastSeenSignalAt(storage: Storage | null): number | null {
  if (!storage) return null;
  const raw = storage.getItem(RELAY_SIDEBAR_LAST_SEEN_SIGNAL_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setRelaySidebarLastSeenSignalAt(storage: Storage | null, timestamp: number): void {
  if (!storage || !Number.isFinite(timestamp)) return;
  storage.setItem(RELAY_SIDEBAR_LAST_SEEN_SIGNAL_KEY, String(timestamp));
}

export function extractLatestSignalTimestamp(scannerContext: unknown): number | null {
  if (!scannerContext || typeof scannerContext !== "object") return null;

  const context = scannerContext as {
    lastScannedAt?: unknown;
    signals?: Array<{ scannedAt?: unknown }>;
  };
  const signalTimes = Array.isArray(context.signals)
    ? context.signals
        .map((signal) => Number(signal?.scannedAt))
        .filter((value) => Number.isFinite(value))
    : [];
  const lastScannedAt = Number(context.lastScannedAt);
  const latestSignal = signalTimes.length > 0 ? Math.max(...signalTimes) : null;

  if (Number.isFinite(lastScannedAt) && latestSignal != null) {
    return Math.max(lastScannedAt, latestSignal);
  }
  if (Number.isFinite(lastScannedAt)) return lastScannedAt;
  return latestSignal;
}

export function formatRelayRelativeTime(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return "No sync yet";
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Synced ${days}d ago`;
}
