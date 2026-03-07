const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

export interface WalletBalance {
  address: string;
  // Legacy field
  usdc: number;
  // On-chain balances
  onChainUsdc?: number;
  onChainUsdcFormatted?: string;
  pol?: number;
  polFormatted?: string;
  pnl: number;
  pnlPct: number;
  winRate: number;
  totalTrades: number;
  // New backend fields
  pnlToday: number;
  pnlTodayPct: number;
  totalValue: number;
  // Risk fields
  circuitBreakerStatus?: "ARMED" | "WARNING" | "TRIGGERED";
  kellyUtilization?: number;
  drawdown?: number;
  drawdownLimit?: number;
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
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export const api = {
  // Markets
  getMarkets: async (search?: string, category?: string, limit?: number, offset?: number): Promise<{ markets: Market[]; total: number; hasMore: boolean }> => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (limit !== undefined) params.append("limit", limit.toString());
      if (offset !== undefined) params.append("offset", offset.toString());
      
      const query = params.toString();
      const res = await apiFetch<Market[] | { markets: Market[]; total: number; hasMore: boolean }>(
        `/api/markets${query ? `?${query}` : ""}`
      );
      if (Array.isArray(res)) return { markets: res, total: res.length, hasMore: false };
      if (res && Array.isArray((res as any).markets)) return res as { markets: Market[]; total: number; hasMore: boolean };
      return { markets: [], total: 0, hasMore: false };
    } catch {
      return { markets: [], total: 0, hasMore: false };
    }
  },

  getTrendingMarkets: async (): Promise<{ markets: Market[]; total: number; hasMore: boolean }> => {
    try {
      const res = await apiFetch<{ markets: Market[]; total: number; hasMore: boolean }>(
        `/api/markets/trending`
      );
      if (res && Array.isArray(res.markets)) return res;
      return { markets: [], total: 0, hasMore: false };
    } catch {
      return { markets: [], total: 0, hasMore: false };
    }
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
      const res = await apiFetch<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>(`/api/markets/${tokenId}/orderbook`);
      if (res && Array.isArray(res.bids) && Array.isArray(res.asks)) return res;
      return { bids: [], asks: [] };
    } catch {
      return { bids: [], asks: [] };
    }
  },

  // Wallet
  getBalance: async (): Promise<WalletBalance | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/portfolio/summary");
      if (!raw) return null;
      // Backend may return circuitBreakerStatus as an object {state, ...}
      const cbs = raw.circuitBreakerStatus;
      const cbStr =
        typeof cbs === "string" ? cbs :
        cbs && typeof cbs === "object" && "state" in (cbs as Record<string, unknown>) ? (cbs as { state: string }).state :
        undefined;
      return { ...raw, circuitBreakerStatus: cbStr } as unknown as WalletBalance;
    } catch {
      return null;
    }
  },

  getPositions: async (): Promise<Position[]> => {
    try {
      const res = await apiFetch<Position[]>("/api/wallet/positions");
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
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

  // Signals
  getSignals: async (): Promise<Signal[]> => {
    let raw: unknown[];
    try {
      const res = await apiFetch<unknown[]>("/api/signals");
      raw = Array.isArray(res) ? res : [];
    } catch {
      const res = await apiFetch<unknown[]>("/api/pipeline/results");
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

  // Orchestrator
  getOrchestratorStatus: async (): Promise<OrchestratorStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/orchestrator/status");
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

  getOrchestratorCandidates: async (): Promise<OrchestratorCandidatesResponse> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/orchestrator/candidates");
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

  // Risk
  getRiskStatus: async (): Promise<RiskStatus | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/risk/status");
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

  getRiskConfig: async (): Promise<RiskConfig | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/v1/risk-config");
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
  getPerformanceSummary: async (): Promise<PerformanceSummary> => {
    const raw = await apiFetch<Record<string, unknown>>("/api/performance/summary");
    return {
      winRate: Number(raw?.winRate ?? 0),
      pnlToday: Number(raw?.pnlToday ?? 0),
      metrics: {
        currentStreak: Number((raw?.metrics as Record<string, unknown>)?.currentStreak ?? 0),
        bestTrade: String((raw?.metrics as Record<string, unknown>)?.bestTrade ?? ""),
        bestPnl: Number((raw?.metrics as Record<string, unknown>)?.bestPnl ?? 0),
        totalVolume: Number((raw?.metrics as Record<string, unknown>)?.totalVolume ?? 0),
      },
      alphaDecay: raw?.alphaDecay ? {
        detected: Boolean((raw.alphaDecay as Record<string, unknown>).detected),
        rollingHitRate: Number((raw.alphaDecay as Record<string, unknown>).rollingHitRate ?? 0),
        recommendation: String((raw.alphaDecay as Record<string, unknown>).recommendation ?? ""),
      } : null,
    };
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

  // Settings
  getTelegramSettings: async (): Promise<{ chatId: string; botToken: string; hasToken: boolean }> => {
    return apiFetch("/api/v1/settings/telegram");
  },

  updateTelegramSettings: async (settings: { chatId?: string; botToken?: string }): Promise<{ success: boolean }> => {
    return apiFetch("/api/v1/settings/telegram", {
      method: "POST",
      body: JSON.stringify(settings),
    });
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
    headers: { "Content-Type": "application/json" },
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
