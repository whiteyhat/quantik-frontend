import type { Position, Trade, TradeReportBucket, TradeReportsResponse } from "@/lib/api";
import { ago, DAY, HOUR } from "./time";

// ─── NOVA-7's sample portfolio (raw server shapes; api.* normalizes them) ────

export const MARKETS: Record<string, string> = {
  "will-btc-close-above-150k-in-2026": "Will BTC close above $150k in 2026?",
  "fed-cut-december": "Will the Fed cut rates in December?",
  "eth-etf-staking-approval": "Will the SEC approve staking in spot ETH ETFs this year?",
  "apple-foldable-2026": "Will Apple announce a foldable iPhone in 2026?",
  "sol-flip-eth-volume": "Will Solana out-trade Ethereum on DEX volume this month?",
  "nba-finals-game-7": "Will the NBA Finals go to Game 7?",
  "us-cpi-below-3": "Will US CPI print below 3% next month?",
  "openai-gpt6-release": "Will GPT-6 be released before July?",
  "ecb-hike-october": "Will the ECB raise rates in October?",
  "gold-record-high": "Will gold set a new all-time high this month?",
  "oil-above-90": "Will Brent crude close above $90 this quarter?",
  "starship-orbit": "Will Starship complete a full orbit this month?",
  "nvda-5t-cap": "Will Nvidia close above a $5T market cap this month?",
  "eth-above-5k": "Will ETH trade above $5,000 this month?",
  "boe-cut-november": "Will the Bank of England cut rates in November?",
  "tesla-robotaxi-expansion": "Will Tesla launch robotaxi service in a new city this month?",
  "ucl-real-madrid-final": "Will Real Madrid reach the Champions League final?",
  "boj-hike-quarter": "Will the Bank of Japan raise rates this quarter?",
  "btc-above-120k-month": "Will BTC close above $120k this month?",
  "us-jobs-above-150k": "Will US payrolls beat 150k in the next jobs report?",
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
    drawdown: 0.031, // max drawdown, far inside the 15% limit
    drawdownLimit: 0.15,
    circuitBreakerStatus: "ARMED",
    balanceStatus: "live",
    liveBalanceAvailable: true,
    fundingStatus: "ready",
    metrics: {
      currentStreak: 3,
      bestTrade: "fed-cut-december",
      bestTradeQuestion: MARKETS["fed-cut-december"],
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

// Exactly the OPEN rows of TRADE_SEEDS (same market, side, stake, price, age and source), so the
// dashboard, My Agent, Reports and the arena all count the same 2 open positions. The Fed trade
// is a closed +$96 win, not an open position.
export function demoPositions(): Position[] {
  return [
    position("demo-pos-101", "will-btc-close-above-150k-in-2026", "YES", 120, 0.45, 0.52, 3 / 24, "autopilot"),
    position("demo-pos-103", "eth-etf-staking-approval", "NO", 60, 0.55, 0.49, 8, "autopilot"),
  ];
}

type TradeSeed = [string, "YES" | "NO", "autopilot" | "manual", number, number, Trade["outcome"], number | undefined, number];

// The last week is what the sample arena replays (lib/demo/arena.ts): keep it
// stable. Older rows fill NOVA-7's 20 days so the report matches the dashboard:
// 47 trades, 29 wins / 16 losses (64%), 2 still open, +$480 realized.
const TRADE_SEEDS: TradeSeed[] = [
  // slug, direction, source, size, price, outcome, pnl, hours ago
  // the BTC buy 3h ago is the one the notifications and autopilot card mention
  ["will-btc-close-above-150k-in-2026", "YES", "autopilot", 120, 0.45, "OPEN", undefined, 3],
  ["fed-cut-december", "YES", "autopilot", 80, 0.38, "WIN", 96, 30],
  ["us-cpi-below-3", "NO", "autopilot", 60, 0.58, "WIN", 43.5, 52],
  ["nba-finals-game-7", "YES", "manual", 40, 0.31, "LOSS", -40, 80],
  ["sol-flip-eth-volume", "NO", "autopilot", 90, 0.62, "WIN", 55.2, 110],
  ["apple-foldable-2026", "NO", "autopilot", 70, 0.71, "WIN", 28.6, 150],
  // ── older than a week
  ["gold-record-high", "YES", "autopilot", 25, 0.49, "WIN", 23.9, 176],
  ["oil-above-90", "NO", "autopilot", 75, 0.56, "LOSS", -65.9, 184],
  ["openai-gpt6-release", "YES", "manual", 50, 0.27, "LOSS", -50, 190],
  ["starship-orbit", "NO", "autopilot", 45, 0.43, "WIN", 54, 191],
  ["eth-etf-staking-approval", "NO", "autopilot", 60, 0.55, "OPEN", undefined, 192],
  ["eth-above-5k", "NO", "manual", 70, 0.36, "WIN", 82.3, 199],
  ["nvda-5t-cap", "YES", "manual", 30, 0.28, "LOSS", -21.2, 208],
  ["boe-cut-november", "YES", "autopilot", 55, 0.33, "WIN", 68.6, 214],
  ["btc-above-120k-month", "NO", "autopilot", 30, 0.32, "LOSS", -23.1, 223],
  ["tesla-robotaxi-expansion", "YES", "manual", 75, 0.41, "WIN", 93.3, 229],
  ["ucl-real-madrid-final", "YES", "manual", 75, 0.56, "WIN", 25.9, 239],
  ["us-jobs-above-150k", "YES", "manual", 50, 0.44, "LOSS", -35, 246],
  ["boj-hike-quarter", "YES", "manual", 45, 0.28, "WIN", 82.8, 254],
  ["us-cpi-below-3", "YES", "autopilot", 40, 0.64, "WIN", 11.7, 259],
  ["ecb-hike-october", "NO", "autopilot", 35, 0.66, "LOSS", -19.3, 269],
  ["apple-foldable-2026", "NO", "autopilot", 75, 0.31, "WIN", 68.7, 274],
  ["sol-flip-eth-volume", "YES", "manual", 80, 0.69, "LOSS", -44.6, 282],
  ["openai-gpt6-release", "YES", "manual", 45, 0.38, "WIN", 56.4, 292],
  ["oil-above-90", "NO", "manual", 60, 0.53, "WIN", 45.1, 299],
  ["ecb-hike-october", "NO", "autopilot", 45, 0.66, "WIN", 22.9, 300],
  ["gold-record-high", "YES", "autopilot", 75, 0.5, "LOSS", -55.2, 307],
  ["starship-orbit", "NO", "autopilot", 40, 0.61, "WIN", 10.8, 316],
  ["nvda-5t-cap", "YES", "autopilot", 25, 0.3, "WIN", 31.3, 321],
  ["btc-above-120k-month", "NO", "autopilot", 50, 0.43, "LOSS", -41.3, 331],
  ["eth-above-5k", "NO", "manual", 35, 0.67, "WIN", 15.7, 338],
  ["boe-cut-november", "YES", "autopilot", 25, 0.49, "WIN", 15.1, 345],
  ["apple-foldable-2026", "NO", "autopilot", 70, 0.32, "LOSS", -60.4, 351],
  ["tesla-robotaxi-expansion", "YES", "autopilot", 25, 0.54, "WIN", 9.1, 360],
  ["oil-above-90", "NO", "autopilot", 35, 0.58, "LOSS", -19.6, 367],
  ["ucl-real-madrid-final", "YES", "autopilot", 50, 0.34, "WIN", 41.2, 372],
  ["boj-hike-quarter", "YES", "autopilot", 25, 0.68, "WIN", 9.3, 377],
  ["starship-orbit", "NO", "autopilot", 50, 0.57, "LOSS", -34.7, 386],
  ["us-jobs-above-150k", "YES", "autopilot", 55, 0.7, "WIN", 9.4, 391],
  ["ecb-hike-october", "NO", "autopilot", 75, 0.57, "WIN", 33.5, 399],
  ["nvda-5t-cap", "YES", "autopilot", 80, 0.39, "LOSS", -63.9, 404],
  ["us-cpi-below-3", "YES", "autopilot", 30, 0.32, "WIN", 28.6, 411],
  ["eth-above-5k", "NO", "autopilot", 55, 0.38, "LOSS", -52.6, 419],
  ["sol-flip-eth-volume", "YES", "autopilot", 50, 0.45, "WIN", 47.9, 424],
  ["openai-gpt6-release", "YES", "autopilot", 30, 0.49, "WIN", 15.9, 429],
  ["boe-cut-november", "YES", "manual", 60, 0.43, "LOSS", -56.6, 439],
  ["gold-record-high", "YES", "autopilot", 75, 0.57, "WIN", 36.7, 444],
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
    agentAttribution: DEMO_AGENT_WEIGHTS.map((w) => ({ ...w, agent: w.agent.toUpperCase() })),
  };
}

/** How much each pipeline agent's vote counts for NOVA-7 (Reports and L5 calibration). */
export const DEMO_AGENT_WEIGHTS: Array<{ agent: string; weight: number; brierScore: number; trend: "improving" | "stable" | "degrading" }> = [
  { agent: "Oracle", weight: 0.24, brierScore: 0.18, trend: "improving" },
  { agent: "Sigma", weight: 0.2, brierScore: 0.19, trend: "stable" },
  { agent: "Edge", weight: 0.15, brierScore: 0.17, trend: "stable" },
  { agent: "Aura", weight: 0.13, brierScore: 0.22, trend: "improving" },
  { agent: "Flux", weight: 0.11, brierScore: 0.2, trend: "stable" },
  { agent: "Lucifer", weight: 0.1, brierScore: 0.21, trend: "degrading" },
  { agent: "Clause", weight: 0.07, brierScore: 0.19, trend: "stable" },
];

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
        question: t.market,
        side: "buy",
        amount: t.size,
        executed_at: t.timestamp,
        status: "paper",
        pnl: t.pnl ?? null,
      })),
  };
}
