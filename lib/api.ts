import {
  normalizeDashboardSummary,
  toPerformanceSummary,
  toWalletBalance,
} from "@/lib/dashboard";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Auth Token ───────────────────────────────────────────────────────────────
// Set by useAuth() hook in layout — allows apiFetch to attach Bearer token
let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  _authToken = token;
}
export function getAuthToken(): string | null {
  return _authToken;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Market {
  slug: string;
  tokenId: string;
  question: string;
  resolutionDate: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  liquidityGrade: "A" | "B" | "C" | "D";
  spread?: number;
}

export interface PricePoint {
  timestamp: number;
  yes: number;
  no: number;
}

export interface AgentStatusEntry {
  id: string;
  name: string;
  latencyMs: number;
  confidence: number;
  lastAction: string;
  lastActionAt: string;
  status: "active" | "idle" | "error";
}

export interface WalletBalance {
  address: string;
  // Legacy field
  usdc: number | null;
  // On-chain balances
  onChainUsdc?: number | null;
  onChainUsdcFormatted?: string;
  pol?: number;
  polFormatted?: string;
  pnl: number;
  pnlPct: number | null;
  winRate: number;
  totalTrades: number;
  // New backend fields
  pnlToday: number;
  pnlTodayPct: number | null;
  totalValue: number | null;
  // Risk fields
  circuitBreakerStatus?: "ARMED" | "WARNING" | "TRIGGERED";
  kellyUtilization?: number;
  drawdown?: number;
  drawdownLimit?: number;
  balanceStatus?: "live" | "unfunded" | "unavailable" | "no_wallet";
  balanceMessage?: string | null;
  liveBalanceAvailable?: boolean;
  fundingStatus?: "ready" | "funding_required" | "unavailable" | "no_wallet";
  fundingMessage?: string | null;
}

export interface Position {
  id: string;
  market: string;
  slug: string;
  direction: "YES" | "NO";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface Trade {
  id: string;
  market: string;
  slug: string;
  direction: "YES" | "NO";
  size: number;
  price: number;
  outcome: "WIN" | "LOSS" | "OPEN" | "PENDING";
  timestamp: number;
  pnl?: number;
}

export interface Order {
  id: string;
  market: string;
  direction: "YES" | "NO";
  size: number;
  limitPrice: number;
  status: "OPEN" | "FILLED" | "CANCELLED";
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface PipelineResult {
  aura?: AuraResult;
  flux?: FluxResult;
  oracle?: OracleResult;
  edge?: EdgeResult;
  clause?: ClauseResult;
  lucifer?: LuciferResult;
  sigma?: SigmaResult;
}

export interface AuraResult {
  sentiment_score: number; // -1 to +1
  echo_chamber: boolean;
  echo_chamber_strength?: number;
  newsHeadlines?: string[];
  newsArticles?: { title: string; url: string; source: string }[];
  sourcesUsed?: string[];
  sourceStatus?: Record<string, string>;
}

export interface FluxResult {
  liquidity_grade: "A" | "B" | "C" | "D";
  spread: number;
  whale_signals: number;
  depth_score?: number;
}

export interface OracleResult {
  prob_estimate: number; // 0-1
  market_implied: number;
  confidence: number;
}

export interface EdgeResult {
  ev_grade: "A" | "B" | "C" | "PASS";
  net_ev: number; // percent
  kelly: number;  // percent
  recommended_size: number; // percent bankroll
}

export interface ClauseResult {
  resolution_risk: "LOW" | "MED" | "HIGH";
  technicality_risks: string[];
}

export interface LuciferResult {
  devils_advocate_score: number; // 0-1
  bias_flags: string[];
  counter_thesis: string;
}

export interface SigmaResult {
  decision: "BET_YES" | "BET_NO" | "PASS" | "SKIP" | "VETO" | "TRADE" | "WATCH";
  confidence: number; // percent
  thesis: string;
  size_pct: number;
  size_usd: number;
  entry_price: number;
}

// ── Orchestrator types ────────────────────────────────────────────────────────

export interface OrchestratorCandidate {
  slug: string;
  tokenId: string;
  question: string;
  opportunityScore: number;
  components: {
    volume: number;
    priceMove: number;
    liquidity: number;
    recency: number;
  };
  triggers: string[];
  scoredAt: number;
}

export interface OrchestratorStatus {
  lastScanAt: number;
  nextScanAt: number;
  marketsScanned: number;
  candidatesFound: number;
  scanIntervalMs: number;
  status: "idle" | "scanning";
}

export interface OrchestratorCandidatesResponse {
  candidates: OrchestratorCandidate[];
  total: number;
  scanCycle: number;
}

export interface Signal {
  id: string;
  slug: string;
  question: string;
  decision: string;
  confidence: number;
  edge: number;
  timestamp: number;
  status: "TRADE" | "WATCH" | "SKIP";
}

export interface RiskStatus {
  circuitBreaker: "ARMED" | "WARNING" | "TRIGGERED";
  dailyPnl: number;
  dailyPnlPct: number;
  exposurePct: number;
  availableCapital: number;
}

export interface RiskConfig {
  maxPositionSize: number;
  kellyMultiplier: number;
  drawdownLimit: number;
  agentVarThreshold: number;
}

export interface LiquidationAsset {
  asset: string;
  executionPrice: number;
  triggerPrice: number;
  size: number;
  pnlImpact: number;
}

export interface TimelineEvent {
  timestamp: number;
  type: string;
  message: string;
}

export interface LiquidationReport {
  id: string;
  timestamp: number;
  triggeredBy: string;
  totalRealizedValue: number;
  totalSlippage: number;
  totalGas: number;
  assets: LiquidationAsset[];
  timeline: TimelineEvent[];
  status: "complete" | "partial" | "failed";
}

export type ByoOnboardingStatus = "pending_claim" | "claimed" | "expired" | "failed" | "cancelled";

export interface ByoOnboardingSession {
  session_id: string;
  status: ByoOnboardingStatus;
  expires_at: number;
  claimed_at: number | null;
  agent_id: string | null;
  identity: { name: string; description: string | null; avatar: string } | null;
  agent_url: string | null;
  endpoint_url: string | null;
  webhook_events: string[];
  api_key_prefix: string | null;
  wallet_address: string | null;
  connection_status: string | null;
  wallet_download_ready: boolean;
  wallet_downloaded_at: number | null;
  last_error: string | null;
}

export interface HealthScoreResponse {
  score: number | null;
  grade: "A" | "B" | "C" | "D" | "F" | null;
  status: "healthy" | "degraded" | "critical" | "insufficient_data";
  components: {
    uptime: number | null;
    error_rate: number | null;
    latency: number | null;
    connection: number | null;
  };
  total_requests_24h: number;
  error_count_24h: number;
  avg_latency_ms: number | null;
  connection_status: string;
  request_samples_24h: number;
  heartbeat_samples_24h: number;
  message: string;
}

export interface GeneratedWalletCredentials {
  address: string;
  privateKey: string;
  seedPhrase: string;
}

export interface PerformanceSummary {
  winRate: number;
  pnlToday: number;
  metrics: {
    currentStreak: number;
    bestTrade: string;
    bestPnl: number;
    totalVolume: number;
  };
  alphaDecay: {
    detected: boolean;
    rollingHitRate: number;
    recommendation: string;
  } | null;
}

export interface HealthServiceSnapshot {
  status: "healthy" | "degraded" | "down" | string;
  detail?: string | null;
  checkedAt?: number | null;
  meta?: Record<string, unknown>;
}

export interface HealthStatus {
  status: string;
  message: string | null;
  checkedAt: number | null;
  services: Record<string, HealthServiceSnapshot>;
}

export interface SystemAgentHealthEntry {
  name: string;
  status: "live" | "idle" | "degraded" | "down";
  lastActiveAt: number;
  latencyMs: number;
  errorRate: number;
}

export interface SystemAgentHealthStatus {
  agents: SystemAgentHealthEntry[];
  overall: "healthy" | "degraded" | "down";
  checkedAt: number;
}

export interface AlertEntry {
  id: string;
  slug: string;
  question: string;
  confidence: number;
  signal_state: "TRADE" | "WATCH" | "SKIP" | null;
  alert_sent: number; // 1=sent, 2=approved, -1=vetoed
  created_at: number;
}

export interface AlertStatus {
  alerts: AlertEntry[];
  muted: boolean;
  mutedUntil: number | null;
}

export interface TradeRequest {
  slug: string;
  tokenId: string;
  direction: "YES" | "NO";
  size_usd: number;
  limit_price?: number;
}

// ── Monitoring types (L5) ───────────────────────────────────────────────────

export interface BrierEntry {
  slug: string;
  score: number;
  timestamp: number;
}

export interface AttributionEntry {
  signalType: string;
  hitRate: number;
  count: number;
}

export interface DriftStatus {
  microstructure: "clear" | "detected";
  concept: "clear" | "detected";
  lastChecked: number;
}

export interface CalibrationEntry {
  agent: string;
  weight: number;
  confidence: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  // Markets
  getMarkets: async (search?: string, category?: string, limit?: number, offset?: number, signal?: AbortSignal): Promise<{ markets: Market[]; total: number; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (limit !== undefined) params.append("limit", limit.toString());
    if (offset !== undefined) params.append("offset", offset.toString());

    const query = params.toString();
    const res = await apiFetch<Market[] | { markets: Market[]; total: number; hasMore: boolean }>(
      `/api/markets${query ? `?${query}` : ""}`,
      { signal }
    );
    if (Array.isArray(res)) return { markets: res, total: res.length, hasMore: false };
    if (res && Array.isArray((res as { markets?: Market[] }).markets)) return res as { markets: Market[]; total: number; hasMore: boolean };
    return { markets: [], total: 0, hasMore: false };
  },

  getTrendingMarkets: async (signal?: AbortSignal): Promise<{ markets: Market[]; total: number; hasMore: boolean }> => {
    const res = await apiFetch<{ markets: Market[]; total: number; hasMore: boolean }>(
      `/api/markets/trending`,
      { signal }
    );
    if (res && Array.isArray(res.markets)) return res;
    return { markets: [], total: 0, hasMore: false };
  },

  getMarket: (slug: string) =>
    apiFetch<Market>(`/api/markets/${slug}`),

  getPriceHistory: async (tokenId: string, interval = "1d"): Promise<PricePoint[]> => {
    try {
      const res = await apiFetch<PricePoint[]>(`/api/markets/${tokenId}/price-history?interval=${interval}`);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getOrderBook: async (tokenId: string): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> => {
    try {
      const res = await apiFetch<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>(`/api/markets/${tokenId}/book`);
      if (res && Array.isArray(res.bids) && Array.isArray(res.asks)) return res;
      return { bids: [], asks: [] };
    } catch {
      return { bids: [], asks: [] };
    }
  },

  // Wallet
  getDashboardSummary: async (signal?: AbortSignal) => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/performance/summary", { signal });
      return normalizeDashboardSummary(raw);
    } catch {
      return null;
    }
  },

  getBalance: async (signal?: AbortSignal): Promise<WalletBalance | null> => {
    try {
      const summary = await api.getDashboardSummary(signal);
      return summary ? toWalletBalance(summary) : null;
    } catch {
      return null;
    }
  },

  getPositions: async (signal?: AbortSignal): Promise<Position[]> => {
    const res = await apiFetch<Position[]>("/api/wallet/positions", { signal });
    return Array.isArray(res) ? res : [];
  },

  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await apiFetch<Order[]>("/api/wallet/orders");
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  // Trade
  executeTrade: (req: TradeRequest) =>
    apiFetch<{ success: boolean; txHash?: string; error?: string }>("/api/trade/execute", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  cancelAll: () =>
    apiFetch<{ cancelled: number }>("/api/trade/cancel-all", { method: "POST" }),

  // Execution engine
  placeOrder: (slug: string, direction: string, sizeUsdc: number) =>
    apiFetch<{ orderId: string; status: string }>("/api/execution/order", {
      method: "POST",
      body: JSON.stringify({ slug, direction, sizeUsdc }),
    }),

  // Execution log (for system log feed)
  getExecutionLog: async (): Promise<{ slug: string; side: string; amount: number; executed_at: number; status: string; pnl: number | null }[]> => {
    try {
      const raw = await apiFetch<{ log: unknown[] }>("/api/execution/log");
      const log = Array.isArray(raw?.log) ? raw.log : [];
      return log.map((r) => {
        const item = r as Record<string, unknown>;
        return {
          slug: String(item?.slug ?? ""),
          side: String(item?.side ?? "buy"),
          amount: Number(item?.amount ?? 0),
          executed_at: Number(item?.executed_at ?? 0),
          status: String(item?.status ?? ""),
          pnl: item?.pnl != null ? Number(item.pnl) : null,
        };
      });
    } catch {
      return [];
    }
  },

  // Scanner status + results (for system log feed)
  getScannerStatus: async (): Promise<{
    isRunning: boolean; lastScan: string | null; scannedToday: number;
    alertsTriggered: number; marketsChecked: number; tradesToday: number;
    circuitBreakerTriggered: boolean; paperMode: boolean; scanIntervalMs?: number;
  } | null> => {
    try {
      return await apiFetch("/api/scanner/status");
    } catch {
      return null;
    }
  },

  getScannerResults: async (limit = 30): Promise<{
    slug: string; scannedAt: number; sigmaConfidence: number;
    kellyFraction: number; recommendation: string; probability: number;
  }[]> => {
    try {
      const raw = await apiFetch<{ results: unknown[] }>(`/api/scanner/results?limit=${limit}`);
      const results = Array.isArray(raw?.results) ? raw.results : [];
      return results.map((r) => {
        const item = r as Record<string, unknown>;
        return {
          slug: String(item?.slug ?? ""),
          scannedAt: Number(item?.scannedAt ?? item?.scanned_at ?? 0),
          sigmaConfidence: Number(item?.sigmaConfidence ?? item?.sigma_confidence ?? 0),
          kellyFraction: Number(item?.kellyFraction ?? item?.kelly_fraction ?? 0),
          recommendation: String(item?.recommendation ?? ""),
          probability: Number(item?.probability ?? 0),
        };
      });
    } catch {
      return [];
    }
  },

  // Pipeline history (for system log feed)
  getPipelineHistory: async (): Promise<{
    id: string; market_slug: string; market_question: string;
    created_at: number; completed_at: number | null;
    decision: string | null; confidence: number | null;
  }[]> => {
    try {
      const raw = await apiFetch<unknown[]>("/api/pipeline/history");
      const arr = Array.isArray(raw) ? raw : [];
      return arr.map((r) => {
        const item = r as Record<string, unknown>;
        return {
          id: String(item?.id ?? ""),
          market_slug: String(item?.market_slug ?? ""),
          market_question: String(item?.market_question ?? ""),
          created_at: Number(item?.created_at ?? 0),
          completed_at: item?.completed_at != null ? Number(item.completed_at) : null,
          decision: item?.decision != null ? String(item.decision) : null,
          confidence: item?.confidence != null ? Number(item.confidence) : null,
        };
      });
    } catch {
      return [];
    }
  },

  // Trades
  getTrades: async (): Promise<Trade[]> => {
    try {
      const raw = await apiFetch<{ trades: unknown[] }>("/api/trade");
      const trades = Array.isArray(raw?.trades) ? raw.trades : Array.isArray(raw) ? (raw as unknown[]) : [];
      return trades.map((t) => {
        const item = t as Record<string, unknown>;
        return {
          id: String(item?.id ?? ""),
          market: String(item?.market ?? item?.slug ?? ""),
          slug: String(item?.slug ?? ""),
          direction: (String(item?.direction ?? "YES").toUpperCase() === "NO" ? "NO" : "YES") as "YES" | "NO",
          size: Number(item?.size ?? item?.sizeUsdc ?? 0),
          price: Number(item?.price ?? item?.entryPrice ?? 0),
          outcome: (["WIN", "LOSS", "OPEN", "PENDING"].includes(String(item?.outcome ?? "").toUpperCase())
            ? String(item?.outcome).toUpperCase()
            : "OPEN") as Trade["outcome"],
          timestamp: Number(item?.timestamp ?? item?.created_at ?? 0),
          pnl: Number(item?.pnl ?? 0),
        };
      });
    } catch {
      return [];
    }
  },

  // Signals
  getSignals: async (signal?: AbortSignal): Promise<Signal[]> => {
    let raw: unknown[];
    try {
      const res = await apiFetch<unknown[]>("/api/signals", { signal });
      raw = Array.isArray(res) ? res : [];
    } catch {
      const res = await apiFetch<unknown[]>("/api/pipeline/results", { signal });
      raw = Array.isArray(res) ? res : [];
    }
    const validStatuses = new Set(["TRADE", "WATCH", "SKIP"]);
    return raw.slice(0, 10).map((r) => {
      const item = r as Record<string, unknown>;
      const rawStatus = String(item?.status ?? item?.decision ?? "SKIP").toUpperCase();
      return {
        id: String(item?.id ?? item?.slug ?? ""),
        slug: String(item?.slug ?? ""),
        question: String(item?.question ?? ""),
        decision: String(item?.decision ?? ""),
        confidence: Number(item?.confidence ?? 0),
        edge: Number(item?.edge ?? 0),
        timestamp: Number(item?.timestamp ?? 0),
        status: (validStatuses.has(rawStatus) ? rawStatus : "SKIP") as Signal["status"],
      };
    });
  },

  getAgentStatus: async (signal?: AbortSignal): Promise<AgentStatusEntry[]> => {
    try {
      return await apiFetch<AgentStatusEntry[]>("/api/agents/status", { signal });
    } catch {
      return [];
    }
  },

  getSystemAgentHealth: async (signal?: AbortSignal): Promise<SystemAgentHealthStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/agents/health", { signal });
      const rawAgents = Array.isArray(raw?.agents) ? raw.agents : [];

      return {
        agents: rawAgents.map((entry) => {
          const item = entry as Record<string, unknown>;
          const rawStatus = String(item?.status ?? "idle");
          return {
            name: String(item?.name ?? ""),
            status:
              rawStatus === "live" || rawStatus === "idle" || rawStatus === "degraded"
                ? rawStatus
                : "down",
            lastActiveAt: Number(item?.lastActiveAt ?? 0),
            latencyMs: Number(item?.latencyMs ?? 0),
            errorRate: Number(item?.errorRate ?? 0),
          };
        }),
        overall:
          raw?.overall === "healthy" || raw?.overall === "degraded"
            ? raw.overall
            : "down",
        checkedAt: Number(raw?.checkedAt ?? 0),
      };
    } catch {
      return null;
    }
  },

  // Orchestrator
  getOrchestratorStatus: async (signal?: AbortSignal): Promise<OrchestratorStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/orchestrator/status", { signal });
      return {
        lastScanAt: Number(raw?.lastScanAt ?? 0),
        nextScanAt: Number(raw?.nextScanAt ?? 0),
        marketsScanned: Number(raw?.marketsScanned ?? 0),
        candidatesFound: Number(raw?.candidatesFound ?? 0),
        scanIntervalMs: Number(raw?.scanIntervalMs ?? 0),
        status: raw?.status === "scanning" ? "scanning" : "idle",
      };
    } catch {
      return null;
    }
  },

  getOrchestratorCandidates: async (signal?: AbortSignal): Promise<OrchestratorCandidatesResponse> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/orchestrator/candidates", { signal });
      const rawCandidates = Array.isArray(raw?.candidates) ? raw.candidates : [];
      return {
        candidates: rawCandidates.map((c: Record<string, unknown>) => {
          const comp = (c?.components ?? {}) as Record<string, unknown>;
          return {
            slug: String(c?.slug ?? ""),
            tokenId: String(c?.tokenId ?? ""),
            question: String(c?.question ?? ""),
            opportunityScore: Number(c?.opportunityScore ?? 0),
            components: {
              volume: Number(comp?.volume ?? 0),
              priceMove: Number(comp?.priceMove ?? 0),
              liquidity: Number(comp?.liquidity ?? 0),
              recency: Number(comp?.recency ?? 0),
            },
            triggers: Array.isArray(c?.triggers) ? c.triggers.map(String) : [],
            scoredAt: Number(c?.scoredAt ?? 0),
          };
        }),
        total: Number(raw?.total ?? 0),
        scanCycle: Number(raw?.scanCycle ?? 0),
      };
    } catch {
      return { candidates: [], total: 0, scanCycle: 0 };
    }
  },

  triggerOrchestratorScan: async (): Promise<{ triggered: boolean; marketsScanned: number; candidatesFound: number }> => {
    return apiFetch("/api/orchestrator/scan", { method: "POST" });
  },

  getHealth: async (signal?: AbortSignal): Promise<HealthStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/health", { signal });
      const servicesSource =
        raw?.services && typeof raw.services === "object"
          ? (raw.services as Record<string, unknown>)
          : raw?.checks && typeof raw.checks === "object"
            ? (raw.checks as Record<string, unknown>)
            : {};

      return {
        status: String(raw?.status ?? "unknown"),
        message:
          typeof raw?.message === "string"
            ? raw.message
            : typeof raw?.detail === "string"
              ? raw.detail
              : null,
        checkedAt: Number(raw?.checkedAt ?? raw?.checked_at ?? raw?.timestamp ?? 0) || null,
        services: Object.fromEntries(
          Object.entries(servicesSource).map(([name, value]) => [
            name,
            value && typeof value === "object"
              ? {
                  status: String((value as { status?: unknown }).status ?? "unknown"),
                  detail:
                    typeof (value as { detail?: unknown }).detail === "string"
                      ? String((value as { detail?: unknown }).detail)
                      : null,
                  checkedAt:
                    Number((value as { checkedAt?: unknown; checked_at?: unknown }).checkedAt ?? (value as { checked_at?: unknown }).checked_at ?? 0) || null,
                  meta:
                    "meta" in (value as Record<string, unknown>) &&
                    (value as { meta?: unknown }).meta &&
                    typeof (value as { meta?: unknown }).meta === "object"
                      ? ((value as { meta?: Record<string, unknown> }).meta ?? {})
                      : undefined,
                }
              : {
                  status: typeof value === "string" ? value : "unknown",
                  detail: null,
                  checkedAt: null,
                },
          ])
        ),
      };
    } catch {
      return null;
    }
  },

  // Risk
  getRiskStatus: async (signal?: AbortSignal): Promise<RiskStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/risk/status", { signal });
      // Backend may return circuitBreaker as an object {state, drawdownPct, ...}
      const cb = raw?.circuitBreaker;
      const cbStr: RiskStatus["circuitBreaker"] =
        typeof cb === "string" ? (cb as RiskStatus["circuitBreaker"]) :
        cb && typeof cb === "object" && "state" in cb ? (cb as { state: string }).state as RiskStatus["circuitBreaker"] :
        "ARMED";
      return {
        circuitBreaker: cbStr,
        dailyPnl: Number(raw?.dailyPnl ?? 0),
        dailyPnlPct: Number(raw?.dailyPnlPct ?? 0),
        exposurePct: Number(raw?.exposurePct ?? 0),
        availableCapital: Number(raw?.availableCapital ?? 0),
      };
    } catch {
      return null;
    }
  },

  getRiskConfig: async (signal?: AbortSignal): Promise<RiskConfig | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/v1/risk-config", { signal });
      return {
        maxPositionSize: Number(raw?.maxPositionSize ?? 0.10),
        kellyMultiplier: Number(raw?.kellyMultiplier ?? 0.25),
        drawdownLimit: Number(raw?.drawdownLimit ?? 0.15),
        agentVarThreshold: Number(raw?.agentVarThreshold ?? 0.05),
      };
    } catch {
      return null;
    }
  },

  // Monitoring (L5)
  getPerformanceSummary: async (signal?: AbortSignal): Promise<PerformanceSummary> => {
    const summary = await api.getDashboardSummary(signal);
    return toPerformanceSummary(summary ?? normalizeDashboardSummary(null));
  },

  getBrierScores: async (): Promise<BrierEntry[]> => {
    try {
      const res = await apiFetch<BrierEntry[]>("/api/monitoring/brier");
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getAttribution: async (): Promise<AttributionEntry[]> => {
    try {
      const res = await apiFetch<AttributionEntry[]>("/api/monitoring/attribution");
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getDriftStatus: async (): Promise<DriftStatus | null> => {
    try {
      return await apiFetch<DriftStatus>("/api/monitoring/drift");
    } catch {
      return null;
    }
  },

  getCalibration: async (): Promise<CalibrationEntry[]> => {
    try {
      const res = await apiFetch<CalibrationEntry[]>("/api/monitoring/calibration");
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  // My Agent (user's configured trading agent)
  getMyAgent: async (): Promise<Record<string, unknown> | null> => {
    try {
      return await apiFetch<Record<string, unknown>>("/api/v1/agent/me");
    } catch {
      return null;
    }
  },

  createAgent: async (config: {
    name: string;
    avatar: string;
    animalType?: string;
    generatedImage?: string | null;
    wallet_address?: string;
    private_key?: string;
    seed_phrase?: string;
    personality: string;
    decisionStyle: string;
    tradingInstinct: string;
    timePatience: string;
    profitDream: string;
    moneyApproach: string;
    protectionMindset: string;
    marketSense: string;
    assetLove: string;
  }): Promise<Record<string, unknown>> => {
    return apiFetch<Record<string, unknown>>("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  generateWallet: async (): Promise<GeneratedWalletCredentials> => {
    return apiFetch("/api/wallet/generate", { method: "POST" });
  },

  verifyPolymarket: async (agentId: string): Promise<{
    status: string;
    polymarketReady: boolean;
    address: string;
    balances: { pol: number; usdc: number; polSufficient: boolean; usdcSufficient: boolean };
    approvals?: { allPassed: boolean; details: unknown };
    missingItems?: string[];
    error?: string;
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/verify-polymarket`, { method: "POST" });
  },

  checkBalance: async (agentId: string): Promise<{
    status: string;
    polymarketReady: boolean;
    address: string;
    balances: { pol: number; usdc: number; polSufficient: boolean; usdcSufficient: boolean };
    missingItems?: string[];
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/check-balance`, { method: "POST" });
  },

  runApprovals: async (agentId: string): Promise<{
    status: string;
    polymarketReady: boolean;
    address: string;
    balances: { pol: number; usdc: number; polSufficient: boolean; usdcSufficient: boolean };
    approvals?: { allPassed: boolean; details: unknown };
    missingItems?: string[];
    error?: string;
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/run-approvals`, { method: "POST" });
  },

  assignWallet: async (agentId: string, walletAddress: string, privateKey?: string, seedPhrase?: string): Promise<{ ok: boolean; wallet_address: string }> => {
    return apiFetch(`/api/v1/agents/${agentId}/wallet`, {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress, private_key: privateKey, seed_phrase: seedPhrase }),
    });
  },

  deleteAgent: async (id: string): Promise<void> => {
    await apiFetch(`/api/v1/agents/${id}`, { method: "DELETE" });
  },

  deployAgent: async (id: string): Promise<{ ok: boolean; status: string; deployed_at: number }> => {
    return apiFetch(`/api/v1/agents/${id}/deploy`, { method: "POST" });
  },

  updateAutopilot: async (agentId: string, enabled: boolean): Promise<{
    ok: boolean;
    agent_id: string;
    autopilot_enabled: boolean;
    autopilot_updated_at: number;
  }> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (_authToken) {
      headers.Authorization = `Bearer ${_authToken}`;
    }
    const res = await fetch(`${BASE_URL}/api/v1/agents/${agentId}/autopilot`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null) as Record<string, unknown> | null;
      const error = new Error(
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string"
            ? payload.error
            : `API error ${res.status}`
      ) as Error & {
        status?: number;
        code?: string;
        data?: Record<string, unknown> | null;
      };
      error.status = res.status;
      error.code = typeof payload?.error === "string" ? payload.error : undefined;
      error.data = payload;
      throw error;
    }
    return res.json();
  },

  updateRiskConfig: async (config: RiskConfig): Promise<void> => {
    await apiFetch("/api/v1/risk-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  // Alerts
  getAlertStatus: async (): Promise<AlertStatus> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/alerts/status");
      return {
        alerts: Array.isArray(raw?.alerts)
          ? (raw.alerts as Record<string, unknown>[]).map((a) => ({
              id: String(a.id ?? ""),
              slug: String(a.slug ?? ""),
              question: String(a.question ?? ""),
              confidence: Number(a.confidence ?? 0),
              signal_state: (["TRADE", "WATCH", "SKIP"].includes(String(a.signal_state)) ? String(a.signal_state) : null) as AlertEntry["signal_state"],
              alert_sent: Number(a.alert_sent ?? 0),
              created_at: Number(a.created_at ?? 0),
            }))
          : [],
        muted: Boolean(raw?.muted),
        mutedUntil: typeof raw?.mutedUntil === "number" ? raw.mutedUntil : null,
      };
    } catch {
      return { alerts: [], muted: false, mutedUntil: null };
    }
  },

  muteAlerts: async (seconds = 3600): Promise<{ mutedUntil: number }> => {
    return apiFetch("/api/alerts/mute", {
      method: "POST",
      body: JSON.stringify({ seconds }),
    });
  },

  unmuteAlerts: async (): Promise<void> => {
    await apiFetch("/api/alerts/mute", { method: "DELETE" });
  },

  // Settings
  setPaperMode: async (enabled: boolean): Promise<{ paperMode: boolean }> =>
    apiFetch("/api/v1/settings/paper-mode", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  getTelegramSettings: async (): Promise<{ chatId: string; botToken: string; hasToken: boolean }> => {
    return apiFetch("/api/v1/settings/telegram");
  },

  updateTelegramSettings: async (settings: { chatId?: string; botToken?: string }): Promise<{ success: boolean }> => {
    return apiFetch("/api/v1/settings/telegram", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  },

  // ── BYO Agent ─────────────────────────────────────────────────────────────
  // Legacy direct-create endpoint — deprecated in favor of onboarding/claim.

  createByoAgent: async (config: {
    agent_url?: string;
    name?: string;
    avatar?: string;
    description?: string;
    endpoint_url?: string;
  }): Promise<Record<string, unknown>> => {
    return apiFetch("/api/v1/agents/byo", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  createByoOnboardingSession: async (): Promise<{ session_id: string; onboarding_url: string; expires_at: number }> => {
    return apiFetch("/api/v1/agents/byo/onboarding", { method: "POST" });
  },

  getByoOnboardingSession: async (sessionId: string): Promise<ByoOnboardingSession> => {
    return apiFetch(`/api/v1/agents/byo/onboarding/${sessionId}`);
  },

  downloadByoOnboardingWallet: async (sessionId: string): Promise<GeneratedWalletCredentials> => {
    return apiFetch(`/api/v1/agents/byo/onboarding/${sessionId}/wallet-download`, {
      method: "POST",
    });
  },

  getApiKeys: async (): Promise<{ keys: { id: string; key_prefix: string; active: boolean; scopes: string[]; created_at: number; last_used_at: number | null }[] }> => {
    return apiFetch("/api/v1/api-keys");
  },

  rotateApiKey: async (keyId: string): Promise<{ api_key: string; key_prefix: string }> => {
    return apiFetch(`/api/v1/api-keys/${keyId}/rotate`, { method: "POST" });
  },

  revokeApiKey: async (keyId: string): Promise<void> => {
    await apiFetch(`/api/v1/api-keys/${keyId}`, { method: "DELETE" });
  },

  healthCheck: async (agentId: string): Promise<{ connection_status: string }> => {
    return apiFetch(`/api/v1/agents/${agentId}/health-check`, { method: "POST" });
  },

  getAgentActivity: async (agentId: string, limit = 50, offset = 0): Promise<{
    success: boolean;
    data: { tool_name: string; method: string; status_code: number; latency_ms: number; created_at: number }[];
    total: number;
    hasMore: boolean;
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/activity?limit=${limit}&offset=${offset}`);
  },

  getAgentUsage: async (agentId: string): Promise<{
    success: boolean;
    data: {
      total_requests_24h: number;
      requests_last_hour: number;
      error_count_24h: number;
      error_rate_24h: string;
      by_tool: { tool: string; requests: number; avg_latency_ms: number | null; errors: number }[];
      daily_breakdown: { day: string; count: number; errors: number }[];
      recent_errors: { tool_name: string; status_code: number; error: string | null; created_at: number }[];
    };
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/usage`);
  },

  // BYO Dashboard — Health Score
  getHealthScore: async (agentId: string): Promise<{
    success: boolean;
    data: HealthScoreResponse;
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/health-score`);
  },

  // BYO Dashboard — Webhook Log
  getWebhookLog: async (agentId: string, limit = 20): Promise<{
    success: boolean;
    data: {
      event: string; url: string; status_code: number | null;
      latency_ms: number; attempt: number; error: string | null; created_at: number;
    }[];
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/webhook-log?limit=${limit}`);
  },

  // BYO Dashboard — Update Webhook Config
  updateAgentWebhookConfig: async (agentId: string, config: {
    endpoint_url?: string | null;
    agent_url?: string | null;
    webhook_events?: string[];
  }): Promise<{
    success: boolean;
    data: {
      agent_url: string | null;
      endpoint_url: string | null;
      webhook_events: string[];
    };
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/byo-config`, {
      method: "PATCH",
      body: JSON.stringify(config),
    });
  },

  // BYO Dashboard — Test Webhook
  testWebhook: async (agentId: string): Promise<{
    success: boolean;
    data: { ok: boolean; status_code: number | null; latency_ms: number; error?: string };
  }> => {
    return apiFetch(`/api/v1/agents/${agentId}/webhook-test`, { method: "POST" });
  },

  // Emergency
  activatePanicMode: async (options: { cancelOrders: boolean; liquidatePositions: boolean }): Promise<{ success: boolean }> => {
    return apiFetch("/api/v1/panic-mode/activate", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  getLiquidationReport: async (id: string): Promise<LiquidationReport> => {
    return apiFetch(`/api/v1/liquidation-reports/${id}`);
  },
};


// ─── Agent data normalizers ───────────────────────────────────────────────────
// Backend field names differ from frontend interface — normalize at API boundary
export function normalizeAgentData(agent: string, raw: Record<string, unknown>): Record<string, unknown> {
  switch (agent) {
    case "aura": return {
      ...raw,
      sentiment_score: raw.sentimentDelta ?? raw.sentiment_score ?? 0,
      echo_chamber: raw.shiftDetected ?? raw.echo_chamber ?? false,
      echo_chamber_strength: raw.echoChamberRisk ?? raw.echo_chamber_strength,
    };
    case "oracle": return {
      ...raw,
      prob_estimate: raw.calibrated_prob ?? raw.prob_estimate ?? 0,
      market_implied: raw.market_implied ?? 0,
      confidence: typeof raw.confidence === "number"
        ? raw.confidence > 1 ? raw.confidence : raw.confidence * 100
        : 0,
    };
    case "edge": return {
      ...raw,
      kelly: raw.fractional_kelly !== undefined
        ? Number(raw.fractional_kelly) * 100
        : typeof raw.kelly === "number" ? raw.kelly : 0,
      recommended_size: raw.position_size ?? raw.recommended_size ?? 0,
      net_ev: typeof raw.net_ev === "number"
        ? raw.net_ev > 1 ? raw.net_ev : raw.net_ev * 100
        : 0,
    };
    case "clause": return {
      ...raw,
      resolution_risk: (raw.riskLevel ?? raw.resolution_risk ?? "MED") as "LOW" | "MED" | "HIGH",
      technicality_risks: Array.isArray(raw.technicality_risks) ? raw.technicality_risks : [],
    };
    case "sigma": return {
      ...raw,
      decision: raw.decision ?? raw.recommendation ?? "SKIP",
      confidence: typeof raw.confidence === "number"
        ? raw.confidence > 1 ? raw.confidence : raw.confidence * 100
        : 0,
    };
    case "flux": return {
      ...raw,
      spread: typeof raw.spread === "number" ? raw.spread : 0,
      depth_score: raw.depth_imbalance ?? raw.depth_score,
    };
    default: return raw;
  }
}

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

export function streamPrices(
  tokens: string[],
  onPrice: (data: Record<string, { yes: number; no: number }>) => void
): () => void {
  const url = `${BASE_URL}/api/stream/prices?tokens=${tokens.join(",")}`;
  let es: EventSource | null = null;
  let alive = true;

  function connect() {
    if (!alive) return;
    es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        onPrice(JSON.parse(e.data));
      } catch {}
    };
    es.onerror = () => {
      es?.close();
      if (alive) setTimeout(connect, 3000);
    };
  }

  connect();

  return () => {
    alive = false;
    es?.close();
  };
}

export type PipelineEvent =
  | { type: "pipeline:start" }
  | { type: "agent:start"; agent: string }
  | { type: "agent:complete"; agent: string; data: unknown }
  | { type: "agent:error"; agent: string; error: unknown };

export function runPipeline(
  slug: string,
  onEvent: (event: PipelineEvent) => void,
  onComplete: (result: PipelineResult) => void,
  onError?: (err: Error) => void
): () => void {
  let aborted = false;
  const controller = new AbortController();

  fetch(`${BASE_URL}/api/pipeline/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
    },
    body: JSON.stringify({ slug }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Pipeline error ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const result: PipelineResult = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done || aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (currentEvent === "agent:start") {
                onEvent({ type: "agent:start", agent: payload.agent });
              } else if (currentEvent === "agent:complete") {
                const normalized = payload.data && payload.agent
                  ? normalizeAgentData(payload.agent, payload.data as Record<string, unknown>)
                  : payload.data;
                onEvent({ type: "agent:complete", agent: payload.agent, data: normalized });
                if (payload.agent && normalized) {
                  (result as Record<string, unknown>)[payload.agent] = normalized;
                }
              } else if (currentEvent === "agent:error") {
                onEvent({ type: "agent:error", agent: payload.agent, error: payload.data });
              } else if (currentEvent === "pipeline:complete") {
                onComplete(payload);
                return;
              } else if (currentEvent === "pipeline:start") {
                onEvent({ type: "pipeline:start" });
              } else {
                // Fallback: handle legacy format where data line has agent/status/data fields
                if (payload.agent && payload.status) {
                  if (payload.status === "running") {
                    onEvent({ type: "agent:start", agent: payload.agent });
                  } else if (payload.status === "done" || payload.status === "complete") {
                    const normalized2 = payload.data && payload.agent
                      ? normalizeAgentData(payload.agent, payload.data as Record<string, unknown>)
                      : payload.data;
                    onEvent({ type: "agent:complete", agent: payload.agent, data: normalized2 });
                    if (payload.agent && normalized2) {
                      (result as Record<string, unknown>)[payload.agent] = normalized2;
                    }
                  } else if (payload.status === "error") {
                    onEvent({ type: "agent:error", agent: payload.agent, error: payload.error ?? payload.data });
                  }
                }
              }
              currentEvent = "";
            } catch {}
          }
        }
      }

      if (!aborted) onComplete(result);
    })
    .catch((err) => {
      if (!aborted) onError?.(err);
    });

  return () => {
    aborted = true;
    controller.abort();
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return "0¢";
  return `${Math.round(p * 100)}¢`;
}

export function fmtUSDC(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#00ff88";
    case "B": return "#4488ff";
    case "C": return "#ffaa00";
    case "D": return "#ff4444";
    default:  return "#606080";
  }
}
