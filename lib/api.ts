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
  // Legacy field — kept for backward compatibility
  usdc: number;
  // On-chain balances (new backend fields)
  onChainUsdc?: number;
  onChainUsdcFormatted?: string;
  pol?: number;
  polFormatted?: string;
  pnl: number;
  pnlPct: number;
  winRate: number;
  totalTrades: number;
  // Risk fields from portfolio summary
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
  decision: "BET_YES" | "BET_NO" | "PASS";
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

export interface TradeRequest {
  slug: string;
  tokenId: string;
  direction: "YES" | "NO";
  size_usd: number;
  limit_price?: number;
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

  // Wallet
  getBalance: async (): Promise<WalletBalance | null> => {
    try {
      return await apiFetch<WalletBalance>("/api/portfolio/summary");
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
    try {
      const res = await apiFetch<Signal[]>("/api/signals");
      return Array.isArray(res) ? res.slice(0, 10) : [];
    } catch {
      try {
        const res = await apiFetch<Signal[]>("/api/pipeline/results");
        return Array.isArray(res) ? res.slice(0, 10) : [];
      } catch {
        return [];
      }
    }
  },

  // Orchestrator
  getOrchestratorStatus: async (): Promise<OrchestratorStatus | null> => {
    try {
      return await apiFetch<OrchestratorStatus>("/api/orchestrator/status");
    } catch {
      return null;
    }
  },

  getOrchestratorCandidates: async (): Promise<OrchestratorCandidatesResponse> => {
    try {
      return await apiFetch<OrchestratorCandidatesResponse>("/api/orchestrator/candidates");
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
      return await apiFetch<RiskStatus>("/api/risk/status");
    } catch {
      return null;
    }
  },
};

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

export interface PipelineEvent {
  agent: string;
  status: "running" | "done" | "error";
  data?: Partial<PipelineResult[keyof PipelineResult]>;
  error?: string;
}

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

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: PipelineEvent = JSON.parse(line.slice(6));
              onEvent(event);
              if (event.status === "done" && event.data) {
                (result as Record<string, unknown>)[event.agent] = event.data;
              }
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
