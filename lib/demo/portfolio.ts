import type { Position, Trade, TradeReportBucket, TradeReportsResponse } from "@/lib/api";
import { ago, DAY, HOUR } from "./time";

// ─── NOVA-7's sample portfolio (raw server shapes; api.* normalizes them) ────

const MARKETS: Record<string, string> = {
  "will-btc-close-above-150k-in-2026": "Will BTC close above $150k in 2026?",
  "fed-cut-december": "Will the Fed cut rates in December?",
  "eth-etf-staking-approval": "Will the SEC approve staking in spot ETH ETFs this year?",
  "apple-foldable-2026": "Will Apple announce a foldable iPhone in 2026?",
  "sol-flip-eth-volume": "Will Solana out-trade Ethereum on DEX volume this month?",
  "nba-finals-game-7": "Will the NBA Finals go to Game 7?",
  "us-cpi-below-3": "Will US CPI print below 3% next month?",
  "openai-gpt6-release": "Will GPT-6 be released before July?",
};

export function demoSummary(): Record<string, unknown> {
  return {
    totalValue: 10480,
    cashBalance: 5610,
    positionsValue: 4870,
    onChainUsdc: 5610,
    pol: 12.5, // gas: without it, live-mode Execute Trade shows "no POL" instead of asking to sign in
    pnl: 480,
    pnlPct: 0.048, // fractions, like the real API
    pnlToday: 62,
    pnlTodayPct: 0.006,
    winRate: 0.64,
    totalTrades: 47,
    kellyUtilization: 0.31,
    circuitBreakerStatus: "ARMED",
    balanceStatus: "live",
    liveBalanceAvailable: true,
    fundingStatus: "ready",
    metrics: {
      currentStreak: 3,
      bestTrade: "fed-cut-december",
      bestPnl: 96,
      totalVolume: 13240,
    },
    alphaDecay: {
      detected: false,
      rollingHitRate: 0.63,
      recommendation: "no_decay",
    },
  };
}

function position(
  id: string,
  slug: string,
  direction: "YES" | "NO",
  size: number,
  entryPrice: number,
  currentPrice: number,
  daysAgo: number,
  source: "autopilot" | "manual",
): Position {
  const pnl = +((size / entryPrice) * (currentPrice - entryPrice)).toFixed(2);
  return {
    id,
    executionId: Number(id.replace(/\D/g, "")) || 1,
    market: MARKETS[slug],
    question: MARKETS[slug],
    slug,
    direction,
    size,
    entryPrice,
    currentPrice,
    pnl,
    pnlPct: +(pnl / size).toFixed(4),
    source,
    resolutionDate: new Date(Date.now() + 45 * DAY).toISOString(),
    executedAt: ago(daysAgo * DAY),
    status: "paper",
  };
}

export function demoPositions(): Position[] {
  return [
    position("demo-pos-101", "will-btc-close-above-150k-in-2026", "YES", 120, 0.45, 0.52, 3, "autopilot"),
    position("demo-pos-102", "fed-cut-december", "YES", 80, 0.38, 0.41, 5, "autopilot"),
    position("demo-pos-103", "eth-etf-staking-approval", "NO", 60, 0.55, 0.49, 8, "manual"),
  ];
}

const TRADE_SEEDS: Array<[string, "YES" | "NO", "autopilot" | "manual", number, number, Trade["outcome"], number | undefined, number]> = [
  // slug, direction, source, size, price, outcome, pnl, hours ago
  ["will-btc-close-above-150k-in-2026", "YES", "autopilot", 120, 0.45, "OPEN", undefined, 72],
  ["fed-cut-december", "YES", "autopilot", 80, 0.38, "WIN", 96, 30],
  ["us-cpi-below-3", "NO", "autopilot", 60, 0.58, "WIN", 43.5, 52],
  ["nba-finals-game-7", "YES", "manual", 40, 0.31, "LOSS", -40, 80],
  ["sol-flip-eth-volume", "NO", "autopilot", 90, 0.62, "WIN", 55.2, 110],
  ["apple-foldable-2026", "NO", "autopilot", 70, 0.71, "WIN", 28.6, 150],
  ["openai-gpt6-release", "YES", "manual", 50, 0.27, "LOSS", -50, 190],
  ["eth-etf-staking-approval", "NO", "autopilot", 60, 0.55, "WIN", 37.8, 230],
  ["fed-cut-december", "NO", "autopilot", 45, 0.66, "WIN", 22.9, 300],
];

export function demoTrades(): Trade[] {
  return TRADE_SEEDS.map(([slug, direction, source, size, price, outcome, pnl, hoursAgo], i) => ({
    id: `demo-trade-${i + 1}`,
    market: MARKETS[slug],
    slug,
    direction,
    source,
    size,
    price,
    outcome,
    timestamp: ago(hoursAgo * HOUR),
    pnl,
    orderId: `paper-demo-${i + 1}`,
    mode: "paper",
    pipelineRunId: null,
  }));
}

const PERIOD_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

function filterTrades(query: URLSearchParams): Trade[] {
  const period = query.get("period") ?? "all";
  const outcome = query.get("outcome");
  const source = query.get("source");
  const search = (query.get("search") ?? "").toLowerCase();
  const since = PERIOD_DAYS[period] ? Date.now() - PERIOD_DAYS[period] * DAY : 0;
  return demoTrades().filter(
    (t) =>
      t.timestamp >= since &&
      (!outcome || t.outcome === outcome) &&
      (!source || t.source === source) &&
      (!search || t.slug.includes(search) || t.market.toLowerCase().includes(search)),
  );
}

export function demoTradeReports(query: URLSearchParams): TradeReportsResponse {
  const trades = filterTrades(query);
  const period = (query.get("period") ?? "all") as TradeReportsResponse["period"];
  const closed = trades.filter((t) => t.outcome === "WIN" || t.outcome === "LOSS");
  const wins = trades.filter((t) => t.outcome === "WIN").length;
  const losses = trades.filter((t) => t.outcome === "LOSS").length;

  const byDay = new Map<number, TradeReportBucket>();
  for (const t of trades) {
    const day = new Date(t.timestamp);
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    const bucket = byDay.get(key) ?? {
      timestamp: key,
      pnl: 0,
      trades: 0,
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    bucket.pnl = +(bucket.pnl + (t.pnl ?? 0)).toFixed(2);
    bucket.trades += 1;
    byDay.set(key, bucket);
  }

  const ranked = [...closed].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
  return {
    trades,
    count: trades.length,
    period,
    filters: {
      outcome: (query.get("outcome") as Trade["outcome"] | null) ?? null,
      source: (query.get("source") as "autopilot" | "manual" | null) ?? null,
      search: query.get("search") ?? "",
    },
    summary: {
      totalTrades: trades.length,
      totalPnl: +closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0).toFixed(2),
      wins,
      losses,
      open: trades.filter((t) => t.outcome === "OPEN").length,
      pending: trades.filter((t) => t.outcome === "PENDING").length,
      winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
    },
    buckets: [...byDay.values()].sort((a, b) => a.timestamp - b.timestamp),
    bestTrade: ranked[0] ?? null,
    worstTrade: ranked[ranked.length - 1] ?? null,
    agentAttribution: [
      { agent: "ORACLE", weight: 0.24, brierScore: 0.18, trend: "improving" },
      { agent: "SIGMA", weight: 0.2, brierScore: 0.19, trend: "stable" },
      { agent: "EDGE", weight: 0.15, brierScore: null, trend: "stable" },
      { agent: "AURA", weight: 0.13, brierScore: 0.22, trend: "improving" },
      { agent: "FLUX", weight: 0.11, brierScore: null, trend: "stable" },
      { agent: "LUCIFER", weight: 0.1, brierScore: 0.21, trend: "degrading" },
      { agent: "CLAUSE", weight: 0.07, brierScore: null, trend: "stable" },
    ],
  };
}

export function demoTradesCsv(query: URLSearchParams): string {
  const rows = filterTrades(query).map((t) =>
    [
      new Date(t.timestamp).toISOString(),
      `"${t.market.replace(/"/g, '""')}"`,
      t.direction,
      t.source ?? "",
      t.size,
      t.price,
      t.outcome,
      t.pnl ?? "",
    ].join(","),
  );
  return ["timestamp,market,direction,source,size,price,outcome,pnl", ...rows].join("\n") + "\n";
}

export function demoExecutionLog(): { log: Array<Record<string, unknown>> } {
  return {
    log: demoTrades()
      .slice(0, 6)
      .map((t) => ({
        slug: t.slug,
        side: "buy",
        amount: t.size,
        executed_at: t.timestamp,
        status: "paper",
        pnl: t.pnl ?? null,
      })),
  };
}
