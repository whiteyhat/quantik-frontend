import type {
  ArenaComparisonAgent,
  ArenaLeaderboardEntry,
  ArenaLeaderboardResponse,
  ArenaMarketBreakdown,
  ArenaSparklinePoint,
  ArenaWindow,
  PublicAgentProfile,
} from "@/lib/api";
import { DEMO_AGENT_ID, demoAgent } from "./agent";
import { demoPositions, demoSummary, demoTrades, MARKETS as PORTFOLIO_MARKETS } from "./portfolio";
import { ago, DAY, HOUR, MINUTE } from "./time";

// ─── Sample arena for guests: the season at full swing ───────────────────────
// Raw backend shapes (see quantik-backend/src/performance/arena.ts); api.*
// normalizes them. Every number is hand-tuned or drawn from a PRNG seeded by
// agent + window, so repeated reads match and nothing flickers on refetch.

export const DEMO_ARENA_CODE_PREFIX = "Q-DEMO-";

/** Demo agent codes share a prefix real codes (Q-AGENT-X123) never use. */
export function isDemoArenaCode(code: string | null | undefined): boolean {
  return typeof code === "string" && code.toUpperCase().startsWith(DEMO_ARENA_CODE_PREFIX);
}

const ACTIVE_AGENTS = 23; // 16 ranked + 7 deployed agents still waiting for a first trade

export function parseArenaWindow(value: string | null | undefined): ArenaWindow {
  return value === "day" || value === "week" ? value : "all";
}

// ─── Markets ─────────────────────────────────────────────────────────────────

const MARKETS: Record<string, { question: string; short: string }> = {
  "will-btc-close-above-150k-in-2026": { question: PORTFOLIO_MARKETS["will-btc-close-above-150k-in-2026"], short: "BTC $150k" },
  "fed-cut-december": { question: PORTFOLIO_MARKETS["fed-cut-december"], short: "Fed December cut" },
  "eth-etf-staking-approval": { question: PORTFOLIO_MARKETS["eth-etf-staking-approval"], short: "ETH ETF staking" },
  "apple-foldable-2026": { question: PORTFOLIO_MARKETS["apple-foldable-2026"], short: "Foldable phone" },
  "sol-flip-eth-volume": { question: PORTFOLIO_MARKETS["sol-flip-eth-volume"], short: "SOL vs ETH volume" },
  "nba-finals-game-7": { question: PORTFOLIO_MARKETS["nba-finals-game-7"], short: "Finals Game 7" },
  "us-cpi-below-3": { question: PORTFOLIO_MARKETS["us-cpi-below-3"], short: "US CPI < 3%" },
  "openai-gpt6-release": { question: PORTFOLIO_MARKETS["openai-gpt6-release"], short: "GPT-6 release" },
  "eth-above-6k-2026": { question: "Will ETH trade above $6,000 before year end?", short: "ETH $6k" },
  "gold-ath-q4": { question: "Will gold set a new all-time high this quarter?", short: "Gold ATH" },
  "ecb-cut-october": { question: "Will the ECB cut rates in October?", short: "ECB October cut" },
  "us-unemployment-4-5": { question: "Will US unemployment reach 4.5% this year?", short: "Jobless 4.5%" },
  "oil-above-90": { question: "Will WTI crude close above $90 this month?", short: "Oil $90" },
  "spot-sol-etf-approval": { question: "Will a spot SOL ETF be approved this year?", short: "SOL ETF" },
  "hurricane-cat5-landfall": { question: "Will a Category 5 hurricane make US landfall this season?", short: "Cat 5 landfall" },
  "sp500-up-10-2026": { question: "Will the S&P 500 finish 2026 up more than 10%?", short: "S&P +10%" },
  "global-temp-record-2026": { question: "Will 2026 be the hottest year on record?", short: "Heat record" },
  "btc-dominance-60": { question: "Will Bitcoin dominance top 60% this month?", short: "BTC dominance" },
  "eu-ai-act-delay": { question: "Will the EU delay AI Act enforcement?", short: "AI Act delay" },
  "us-gdp-q3-above-2": { question: "Will US Q3 GDP growth come in above 2%?", short: "Q3 GDP > 2%" },
  "jpy-150": { question: "Will USD/JPY close above 150 this month?", short: "USD/JPY 150" },
};

// ─── Roster ──────────────────────────────────────────────────────────────────

type Flair = "night_owl" | "speed_demon";
type BestTrade = [slug: string, pnl: number] | null;

interface Contender {
  key: string;
  /** Short tag after the Q-DEMO- prefix, as long as a real code (Q-AGENT-X123) */
  code: string;
  name: string;
  emoji: string;
  animal: string;
  agentType: "created" | "byo";
  connection: string;
  autopilot: boolean;
  /** Selected P&L per window: realized inside the window + live unrealized */
  pnl: Record<ArenaWindow, number>;
  unrealized: number;
  trades: number;
  winRate: number; // percent, like the backend
  open: number;
  streak: number;
  maxStreak: number;
  reach: number; // unique markets traded
  lastTradeAgo: number;
  heat: number;
  speed: number;
  risk: number;
  best: Record<ArenaWindow, BestTrade>;
  markets: string[];
  flair: Flair[];
}

const NOVA_KEY = "nova-7";

// prettier-ignore
const RIVALS: Contender[] = [
  {
    key: "vex-9", code: "VEX9", name: "VEX-9", emoji: "🐺", animal: "wolf", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 2146.8, week: 612.4, day: 138.25 }, unrealized: 84.3,
    trades: 188, winRate: 66.5, open: 6, streak: 7, maxStreak: 12, reach: 14, lastTradeAgo: 3 * MINUTE,
    heat: 0.86, speed: 0.72, risk: 0.78,
    best: { day: ["eth-above-6k-2026", 58.2], week: ["eth-above-6k-2026", 121.4], all: ["fed-cut-december", 188.4] },
    markets: ["eth-above-6k-2026", "fed-cut-december", "btc-dominance-60", "will-btc-close-above-150k-in-2026", "gold-ath-q4", "ecb-cut-october", "us-cpi-below-3", "sol-flip-eth-volume"],
    flair: ["night_owl", "speed_demon"],
  },
  {
    key: "kestrel-4", code: "KES4", name: "KESTREL-4", emoji: "🦅", animal: "eagle", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 1318.6, week: 441.1, day: 96.4 }, unrealized: 42.1,
    trades: 142, winRate: 61.3, open: 4, streak: 4, maxStreak: 9, reach: 9, lastTradeAgo: 11 * MINUTE,
    heat: 0.64, speed: 0.55, risk: 0.62,
    best: { day: ["us-cpi-below-3", 39.6], week: ["fed-cut-december", 142.75], all: ["fed-cut-december", 142.75] },
    markets: ["fed-cut-december", "us-cpi-below-3", "ecb-cut-october", "us-unemployment-4-5", "us-gdp-q3-above-2", "jpy-150"],
    flair: [],
  },
  {
    key: "orion-x", code: "ORNX", name: "ORION-X", emoji: "🦁", animal: "lion", agentType: "byo", connection: "connected", autopilot: true,
    pnl: { all: 1276.25, week: 488.9, day: 171.6 }, unrealized: 63.75,
    trades: 97, winRate: 58.8, open: 5, streak: 5, maxStreak: 8, reach: 7, lastTradeAgo: 1 * MINUTE,
    heat: 0.78, speed: 0.81, risk: 0.93,
    best: { day: ["will-btc-close-above-150k-in-2026", 104.7], week: ["will-btc-close-above-150k-in-2026", 104.7], all: ["will-btc-close-above-150k-in-2026", 231.9] },
    markets: ["will-btc-close-above-150k-in-2026", "eth-above-6k-2026", "sol-flip-eth-volume", "spot-sol-etf-approval", "btc-dominance-60"],
    flair: ["speed_demon"],
  },
  {
    key: "sable-8", code: "SBL8", name: "SABLE-8", emoji: "🐆", animal: "leopard", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 742.9, week: 198.3, day: -24.1 }, unrealized: -12.4,
    trades: 76, winRate: 55.3, open: 3, streak: -2, maxStreak: 7, reach: 8, lastTradeAgo: 46 * MINUTE,
    heat: 0.22, speed: 0.38, risk: 0.66,
    best: { day: ["gold-ath-q4", -11.7], week: ["gold-ath-q4", 64.2], all: ["gold-ath-q4", 118.3] },
    markets: ["gold-ath-q4", "oil-above-90", "sp500-up-10-2026", "jpy-150", "us-gdp-q3-above-2"],
    flair: [],
  },
  {
    key: "zenith-2", code: "ZEN2", name: "ZENITH-2", emoji: "🦉", animal: "owl", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 455.7, week: 96.2, day: 18.4 }, unrealized: 22.8,
    trades: 64, winRate: 57.8, open: 2, streak: -1, maxStreak: 6, reach: 10, lastTradeAgo: 52 * MINUTE,
    heat: 0.12, speed: 0.24, risk: 0.41,
    best: { day: ["us-cpi-below-3", 14.2], week: ["fed-cut-december", 38.1], all: ["us-cpi-below-3", 84.2] },
    markets: ["us-cpi-below-3", "fed-cut-december", "global-temp-record-2026", "eu-ai-act-delay", "us-unemployment-4-5", "ecb-cut-october", "sp500-up-10-2026"],
    flair: ["night_owl"],
  },
  {
    key: "ronin-12", code: "RON12", name: "RONIN-12", emoji: "🐉", animal: "dragon", agentType: "byo", connection: "connected", autopilot: true,
    pnl: { all: 398.15, week: 262.75, day: 58.3 }, unrealized: 35.2,
    trades: 211, winRate: 52.1, open: 8, streak: 2, maxStreak: 6, reach: 16, lastTradeAgo: 4 * MINUTE,
    heat: 0.71, speed: 0.94, risk: 0.34,
    best: { day: ["btc-dominance-60", 21.3], week: ["sol-flip-eth-volume", 47.8], all: ["sol-flip-eth-volume", 61.4] },
    markets: ["btc-dominance-60", "sol-flip-eth-volume", "eth-above-6k-2026", "will-btc-close-above-150k-in-2026", "spot-sol-etf-approval", "oil-above-90", "jpy-150", "nba-finals-game-7"],
    flair: ["night_owl", "speed_demon"],
  },
  {
    key: "halcyon-4", code: "HAL4", name: "HALCYON-4", emoji: "🐬", animal: "dolphin", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 341.2, week: 58.9, day: 12.6 }, unrealized: 9.6,
    trades: 38, winRate: 71, open: 1, streak: 10, maxStreak: 10, reach: 5, lastTradeAgo: 2 * HOUR + 8 * MINUTE,
    heat: 0.41, speed: 0.18, risk: 0.29,
    best: { day: ["ecb-cut-october", 3], week: ["ecb-cut-october", 22.4], all: ["fed-cut-december", 38.9] },
    markets: ["ecb-cut-october", "fed-cut-december", "us-gdp-q3-above-2", "sp500-up-10-2026"],
    flair: [],
  },
  {
    key: "cipher-0", code: "CPH0", name: "CIPHER-0", emoji: "🐍", animal: "snake", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 286.45, week: -44.3, day: -31.75 }, unrealized: -18.9,
    trades: 89, winRate: 53.9, open: 4, streak: -3, maxStreak: 7, reach: 9, lastTradeAgo: 26 * MINUTE,
    heat: 0.28, speed: 0.49, risk: 0.71,
    best: { day: ["eu-ai-act-delay", -4.1], week: ["hurricane-cat5-landfall", 31.6], all: ["nba-finals-game-7", 126.5] },
    markets: ["nba-finals-game-7", "hurricane-cat5-landfall", "eu-ai-act-delay", "oil-above-90", "global-temp-record-2026", "us-cpi-below-3"],
    flair: ["night_owl"],
  },
  {
    key: "bastion-3", code: "BST3", name: "BASTION-3", emoji: "🐻", animal: "bear", agentType: "created", connection: "connected", autopilot: false,
    pnl: { all: 212.3, week: 71.4, day: 0 }, unrealized: 0,
    trades: 29, winRate: 62.1, open: 0, streak: 1, maxStreak: 5, reach: 4, lastTradeAgo: 19 * HOUR,
    heat: 0.04, speed: 0.12, risk: 0.52,
    best: { day: null, week: ["us-unemployment-4-5", 72.1], all: ["us-unemployment-4-5", 72.1] },
    markets: ["us-unemployment-4-5", "sp500-up-10-2026", "gold-ath-q4"],
    flair: [],
  },
  {
    key: "quasar-5", code: "QSR5", name: "QUASAR-5", emoji: "🐙", animal: "octopus", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: 164.85, week: 121.3, day: 44.9 }, unrealized: 14.25,
    trades: 54, winRate: 50, open: 3, streak: 2, maxStreak: 5, reach: 8, lastTradeAgo: 38 * MINUTE,
    heat: 0.34, speed: 0.66, risk: 0.47,
    best: { day: ["ecb-cut-october", 18.9], week: ["spot-sol-etf-approval", 54.8], all: ["spot-sol-etf-approval", 54.8] },
    markets: ["ecb-cut-october", "spot-sol-etf-approval", "jpy-150", "btc-dominance-60", "eu-ai-act-delay"],
    flair: ["speed_demon"],
  },
  {
    key: "drift-3", code: "DRF3", name: "DRIFT-3", emoji: "🦈", animal: "shark", agentType: "byo", connection: "connected", autopilot: true,
    pnl: { all: 58.4, week: -96.1, day: -12.2 }, unrealized: -8.6,
    trades: 71, winRate: 47.9, open: 2, streak: -1, maxStreak: 5, reach: 5, lastTradeAgo: 1 * HOUR + 40 * MINUTE,
    heat: 0.09, speed: 0.58, risk: 0.88,
    best: { day: ["oil-above-90", 6.4], week: ["oil-above-90", 18.9], all: ["oil-above-90", 67.3] },
    markets: ["oil-above-90", "will-btc-close-above-150k-in-2026", "gold-ath-q4", "hurricane-cat5-landfall"],
    flair: [],
  },
  {
    key: "glint-5", code: "GLN5", name: "GLINT-5", emoji: "🐝", animal: "bee", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: -42.75, week: 33.6, day: 9.8 }, unrealized: 5.1,
    trades: 33, winRate: 45.5, open: 1, streak: 1, maxStreak: 4, reach: 4, lastTradeAgo: 5 * HOUR,
    heat: 0.04, speed: 0.33, risk: 0.25,
    best: { day: ["spot-sol-etf-approval", 4.7], week: ["spot-sol-etf-approval", 41.25], all: ["spot-sol-etf-approval", 41.25] },
    markets: ["spot-sol-etf-approval", "sol-flip-eth-volume", "global-temp-record-2026"],
    flair: ["night_owl"],
  },
  {
    key: "mirage-6", code: "MRG6", name: "MIRAGE-6", emoji: "🦎", animal: "lizard", agentType: "created", connection: "connected", autopilot: true,
    pnl: { all: -118.9, week: -61.25, day: -8.4 }, unrealized: -21.3,
    trades: 58, winRate: 43.1, open: 3, streak: -4, maxStreak: 4, reach: 7, lastTradeAgo: 2 * HOUR,
    heat: 0.19, speed: 0.44, risk: 0.58,
    best: { day: ["hurricane-cat5-landfall", 12.9], week: ["global-temp-record-2026", 26.4], all: ["hurricane-cat5-landfall", 58.6] },
    markets: ["hurricane-cat5-landfall", "nba-finals-game-7", "global-temp-record-2026", "eu-ai-act-delay", "jpy-150"],
    flair: [],
  },
  {
    key: "phantom-13", code: "PHM13", name: "PHANTOM-13", emoji: "🦇", animal: "bat", agentType: "byo", connection: "connected", autopilot: true,
    pnl: { all: -236.4, week: -148.7, day: -52.3 }, unrealized: -34.6,
    trades: 122, winRate: 41, open: 5, streak: -6, maxStreak: 5, reach: 12, lastTradeAgo: 9 * MINUTE,
    heat: 0.48, speed: 0.87, risk: 0.95,
    best: { day: ["sol-flip-eth-volume", 8.2], week: ["btc-dominance-60", 27.4], all: ["will-btc-close-above-150k-in-2026", 89.9] },
    markets: ["sol-flip-eth-volume", "btc-dominance-60", "will-btc-close-above-150k-in-2026", "nba-finals-game-7", "eth-above-6k-2026", "oil-above-90"],
    flair: ["night_owl", "speed_demon"],
  },
  {
    key: "obelisk-9", code: "OBK9", name: "OBELISK-9", emoji: "🦏", animal: "rhino", agentType: "created", connection: "disconnected", autopilot: false,
    pnl: { all: -391.2, week: -22.8, day: 0 }, unrealized: 0,
    trades: 46, winRate: 38, open: 0, streak: -2, maxStreak: 3, reach: 3, lastTradeAgo: 2 * DAY + 3 * HOUR,
    heat: 0.07, speed: 0.09, risk: 1,
    best: { day: null, week: ["sp500-up-10-2026", -22.8], all: ["sp500-up-10-2026", 44] },
    markets: ["sp500-up-10-2026", "will-btc-close-above-150k-in-2026", "us-gdp-q3-above-2"],
    flair: [],
  },
];

// NOVA-7's line is built from the guest dashboard fixtures so both pages agree
function novaContender(): Contender {
  const summary = demoSummary();
  const metrics = summary.metrics as { currentStreak: number; bestTrade: string; bestPnl: number };
  const unrealized = round2(demoPositions().reduce((sum, p) => sum + p.pnl, 0));
  const weekStart = Date.now() - 7 * DAY;
  const weekRealized = demoTrades()
    .filter((t) => t.timestamp >= weekStart && t.pnl != null)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const agent = demoAgent();
  return {
    key: NOVA_KEY,
    code: agent.agent_code.replace(DEMO_ARENA_CODE_PREFIX, ""),
    name: agent.name,
    emoji: agent.avatar_emoji,
    animal: agent.animal_type ?? "fox",
    agentType: "created",
    connection: agent.connection_status ?? "connected",
    autopilot: true,
    pnl: { all: summary.pnl as number, week: round2(weekRealized + unrealized), day: summary.pnlToday as number },
    unrealized,
    trades: summary.totalTrades as number,
    winRate: round2((summary.winRate as number) * 100),
    open: demoPositions().length,
    streak: metrics.currentStreak,
    maxStreak: 6,
    reach: 11,
    lastTradeAgo: 3 * HOUR, // matches the autopilot status and the latest notification
    heat: 0.31,
    speed: 0.36,
    risk: 0.44,
    best: { day: ["us-cpi-below-3", 43.5], week: [metrics.bestTrade, metrics.bestPnl], all: [metrics.bestTrade, metrics.bestPnl] },
    markets: [],
    flair: [],
  };
}

// Mirrors NOVA-7's trade history on the dashboard (top 10 markets by |P&L|)
// prettier-ignore
const NOVA_BREAKDOWN: ArenaMarketBreakdown[] = [
  { slug: "eth-above-6k-2026", question: MARKETS["eth-above-6k-2026"].question, pnl: 121.4, trades: 9, winRate: 66.67, openPositions: 0 },
  { slug: "fed-cut-december", question: MARKETS["fed-cut-december"].question, pnl: 118.9, trades: 6, winRate: 83.33, openPositions: 0 },
  { slug: "gold-ath-q4", question: MARKETS["gold-ath-q4"].question, pnl: 88.3, trades: 7, winRate: 71.43, openPositions: 0 },
  { slug: "ecb-cut-october", question: MARKETS["ecb-cut-october"].question, pnl: 64.18, trades: 6, winRate: 66.67, openPositions: 0 },
  { slug: "sol-flip-eth-volume", question: MARKETS["sol-flip-eth-volume"].question, pnl: 55.2, trades: 4, winRate: 75, openPositions: 0 },
  { slug: "openai-gpt6-release", question: MARKETS["openai-gpt6-release"].question, pnl: -50, trades: 1, winRate: 0, openPositions: 0 },
  { slug: "us-cpi-below-3", question: MARKETS["us-cpi-below-3"].question, pnl: 43.5, trades: 3, winRate: 66.67, openPositions: 0 },
  { slug: "nba-finals-game-7", question: MARKETS["nba-finals-game-7"].question, pnl: -40, trades: 2, winRate: 0, openPositions: 0 },
  { slug: "eth-etf-staking-approval", question: MARKETS["eth-etf-staking-approval"].question, pnl: 31.25, trades: 3, winRate: 50, openPositions: 1 },
  { slug: "apple-foldable-2026", question: MARKETS["apple-foldable-2026"].question, pnl: 28.6, trades: 2, winRate: 50, openPositions: 0 },
];

// Rank order at the previous hourly snapshot, per window (drives rankChange).
// An agent missing from a list is new to that board.
const PREVIOUS_ORDER: Record<ArenaWindow, string[]> = {
  all: ["vex-9", "orion-x", "kestrel-4", "sable-8", "zenith-2", NOVA_KEY, "halcyon-4", "cipher-0", "ronin-12", "bastion-3", "drift-3", "quasar-5", "mirage-6", "phantom-13", "obelisk-9"],
  week: ["vex-9", "kestrel-4", "orion-x", "sable-8", "ronin-12", NOVA_KEY, "zenith-2", "quasar-5", "halcyon-4", "bastion-3", "glint-5", "cipher-0", "obelisk-9", "drift-3", "mirage-6", "phantom-13"],
  day: ["vex-9", "orion-x", "ronin-12", "kestrel-4", "quasar-5", NOVA_KEY, "halcyon-4", "zenith-2", "sable-8", "glint-5", "bastion-3", "obelisk-9", "drift-3", "mirage-6", "cipher-0", "phantom-13"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, round2(value)));
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32): same seed, same sequence, every call. */
function seeded(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const agentIdFor = (key: string) => (key === NOVA_KEY ? DEMO_AGENT_ID : `demo-arena-${key}`);
const agentCodeFor = (c: Contender) => `${DEMO_ARENA_CODE_PREFIX}${c.code}`;

function roster(): Contender[] {
  return [...RIVALS, novaContender()];
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function marketBreakdown(c: Contender): ArenaMarketBreakdown[] {
  if (c.key === NOVA_KEY) return NOVA_BREAKDOWN.map((m) => ({ ...m }));
  const rng = seeded(`${c.key}:markets`);
  const n = c.markets.length;
  const shares = c.markets.map(() => 0.4 + rng() * 1.2);
  const shareSum = shares.reduce((a, b) => a + b, 0);
  const noise = c.markets.map(() => rng() - 0.5);
  const noiseMean = noise.reduce((a, b) => a + b, 0) / n;
  const spread = Math.max(Math.abs(c.pnl.all) * 0.22, 40);
  const pnls = c.markets.map((_, i) => round2((c.pnl.all * shares[i]) / shareSum + (noise[i] - noiseMean) * spread));
  pnls[0] = round2(pnls[0] + c.pnl.all - pnls.reduce((a, b) => a + b, 0));

  const weights = c.markets.map(() => 0.5 + rng());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const trades = weights.map((w) => Math.max(1, Math.floor((c.trades * w) / weightSum)));
  trades[0] += c.trades - trades.reduce((a, b) => a + b, 0);

  const open = c.markets.map(() => 0);
  let cursor = Math.floor(rng() * n);
  for (let placed = 0; placed < c.open; cursor++) {
    const i = cursor % n;
    if (open[i] < trades[i]) {
      open[i] += 1;
      placed += 1;
    }
  }

  return c.markets
    .map((slug, i) => {
      const settled = trades[i] - open[i];
      const lean = pnls[i] >= 0 ? 0.06 : -0.18;
      const rate = Math.min(0.95, Math.max(0.05, c.winRate / 100 + lean + (rng() - 0.5) * 0.2));
      const wins = Math.round(settled * rate);
      return {
        slug,
        question: MARKETS[slug]?.question ?? slug,
        pnl: pnls[i],
        trades: trades[i],
        winRate: settled > 0 ? round2((wins / settled) * 100) : 0,
        openPositions: open[i],
      };
    })
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 10);
}

function dna(c: Contender, maxTrades: number): ArenaLeaderboardEntry["dna"] {
  return {
    volume: clamp01(c.trades / maxTrades),
    diversity: clamp01(c.reach / 10),
    speed: c.speed,
    streak: clamp01(c.maxStreak / 15),
    riskAppetite: c.risk,
    timing: clamp01(c.winRate / 100 + c.streak * 0.012),
  };
}

const BADGES = {
  first_blood: { id: "first_blood", name: "First Blood", tier: "common", emoji: "🩸", description: "Completed first trade" },
  market_maker: { id: "market_maker", name: "Market Maker", tier: "rare", emoji: "🏭", description: "50+ trades executed" },
  diversified: { id: "diversified", name: "Diversified", tier: "rare", emoji: "🌐", description: "Traded 5+ markets" },
  night_owl: { id: "night_owl", name: "Night Owl", tier: "common", emoji: "🦉", description: "Traded at midnight UTC" },
  speed_demon: { id: "speed_demon", name: "Speed Demon", tier: "epic", emoji: "⚡", description: "Trade closed under 1 hour" },
  streak_master: { id: "streak_master", name: "Streak Master", tier: "epic", emoji: "🔥", description: "10+ win streak" },
  diamond_hands: { id: "diamond_hands", name: "Diamond Hands", tier: "legendary", emoji: "💎", description: "Highest single-trade PnL" },
} as const;

function badges(c: Contender, bestTradePnl: number, globalHighest: number): ArenaLeaderboardEntry["badges"] {
  const list: ArenaLeaderboardEntry["badges"] = [{ ...BADGES.first_blood }];
  if (c.trades >= 50) list.push({ ...BADGES.market_maker });
  if (c.reach >= 5) list.push({ ...BADGES.diversified });
  if (c.flair.includes("night_owl")) list.push({ ...BADGES.night_owl });
  if (c.flair.includes("speed_demon")) list.push({ ...BADGES.speed_demon });
  if (Math.abs(c.streak) >= 10) list.push({ ...BADGES.streak_master });
  if (globalHighest > 0 && bestTradePnl >= globalHighest) list.push({ ...BADGES.diamond_hands });
  return list;
}

function compareEntries(left: ArenaLeaderboardEntry, right: ArenaLeaderboardEntry): number {
  if (right.selectedPnl !== left.selectedPnl) return right.selectedPnl - left.selectedPnl;
  if (right.allTimePnl !== left.allTimePnl) return right.allTimePnl - left.allTimePnl;
  if (right.winRate !== left.winRate) return right.winRate - left.winRate;
  return left.agentId.localeCompare(right.agentId);
}

function buildEntries(window: ArenaWindow): Array<{ contender: Contender; entry: ArenaLeaderboardEntry }> {
  const contenders = roster();
  const maxTrades = Math.max(...contenders.map((c) => c.trades));
  const rows = contenders.map((c) => {
    const best = c.best[window];
    const entry: ArenaLeaderboardEntry = {
      rank: 0,
      agentId: agentIdFor(c.key),
      agentCode: agentCodeFor(c),
      name: c.name,
      avatarEmoji: c.emoji,
      animalType: c.animal,
      agentType: c.agentType,
      connectionStatus: c.connection,
      autopilotEnabled: c.autopilot,
      polymarketReady: true,
      selectedPnl: c.pnl[window],
      selectedRealizedPnl: round2(c.pnl[window] - c.unrealized),
      selectedUnrealizedPnl: c.unrealized,
      allTimePnl: c.pnl.all,
      totalTrades: c.trades,
      winRate: c.winRate,
      openPositions: c.open,
      currentStreak: c.streak,
      lastTradeAt: ago(c.lastTradeAgo),
      bestTradeSlug: best?.[0] ?? null,
      bestTradePnl: best?.[1] ?? 0,
      rankChange: null,
      marketBreakdown: marketBreakdown(c),
      badges: [],
      heat: c.heat,
      dna: dna(c, maxTrades),
    };
    return { contender: c, entry };
  });

  rows.sort((a, b) => compareEntries(a.entry, b.entry));
  const previous = PREVIOUS_ORDER[window];
  const globalHighest = Math.max(0, ...rows.map((r) => r.entry.bestTradePnl));
  rows.forEach((row, index) => {
    const prev = previous.indexOf(row.contender.key);
    row.entry.rank = index + 1;
    row.entry.rankChange = prev === -1 ? null : prev + 1 - row.entry.rank;
    row.entry.badges = badges(row.contender, row.entry.bestTradePnl, globalHighest);
  });
  return rows;
}

function gapToRank(leaders: ArenaLeaderboardEntry[], referencePnl: number, rank: number): number {
  const target = leaders[Math.min(Math.max(rank, 1), leaders.length) - 1]?.selectedPnl ?? referencePnl;
  return round2(Math.max(0, target - referencePnl));
}

/** GET /api/performance/arena?window=… as the backend returns it for NOVA-7's owner. */
export function demoArenaLeaderboard(window: ArenaWindow): ArenaLeaderboardResponse {
  const leaders = buildEntries(window).map((r) => r.entry);
  const viewerEntry = leaders.find((e) => e.agentId === DEMO_AGENT_ID)!;
  const referencePnl = viewerEntry.selectedPnl;
  return {
    window,
    updatedAt: Date.now(),
    meta: {
      rankedAgents: leaders.length,
      totalRanked: leaders.length,
      activeAgents: ACTIVE_AGENTS,
      totalSelectedPnlPool: round2(leaders.reduce((sum, e) => sum + e.selectedPnl, 0)),
      totalRealizedPnlPool: round2(leaders.reduce((sum, e) => sum + e.selectedRealizedPnl, 0)),
      totalUnrealizedPnlPool: round2(leaders.reduce((sum, e) => sum + e.selectedUnrealizedPnl, 0)),
      lastTradeAt: Math.max(...leaders.map((e) => e.lastTradeAt ?? 0)),
    },
    leaders,
    viewer: {
      agentId: DEMO_AGENT_ID,
      eligible: true,
      ranked: true,
      rank: viewerEntry.rank,
      entry: viewerEntry,
      referencePnl: round2(referencePnl),
      gapToTop10: gapToRank(leaders, referencePnl, 10),
      gapToPodium: gapToRank(leaders, referencePnl, 3),
      gapToCrown: gapToRank(leaders, referencePnl, 1),
      reason: "ranked",
    },
  };
}

// ─── History, profile, comparison ────────────────────────────────────────────

const HISTORY_POINTS: Record<ArenaWindow, number> = { day: 24, week: 168, all: 168 };

/** Hourly snapshots ending at the agent's current number (a seeded random bridge). */
function series(entry: ArenaLeaderboardEntry, window: ArenaWindow, contender: Contender, total: number): ArenaSparklinePoint[] {
  const n = HISTORY_POINTS[window];
  const rng = seeded(`${contender.key}:${window}:history`);
  const end = entry.selectedPnl;
  const start = window === "all"
    ? round2(contender.pnl.all - contender.pnl.week)
    : window === "week"
      ? round2(end * (-0.1 + rng() * 0.6) + (rng() - 0.5) * 20)
      : round2(end * (-0.2 + rng() * 0.5) + (rng() - 0.5) * 10);
  const scale = (Math.max(Math.abs(end - start), Math.abs(end) * 0.3, 20) * 0.9) / Math.sqrt(n);

  const walk = [0];
  for (let i = 1; i < n; i++) walk.push(walk[i - 1] + (rng() + rng() + rng() - 1.5) * scale);
  const drift = walk[n - 1];

  const previousRank = entry.rank + (entry.rankChange ?? 0);
  const lastSnapshot = Math.floor(Date.now() / HOUR) * HOUR;
  return walk.map((w, i) => {
    const progress = n > 1 ? i / (n - 1) : 1;
    const last = i === n - 1;
    const rankDrift = (previousRank - entry.rank) * (1 - progress) * 1.5 + (rng() - 0.5) * 0.9;
    return {
      timestamp: lastSnapshot - (n - 1 - i) * HOUR,
      pnl: last ? end : round2(start + (end - start) * progress + (w - drift * progress)),
      rank: last ? entry.rank : Math.min(total, Math.max(1, Math.round(entry.rank + rankDrift))),
    };
  });
}

/** GET /api/performance/arena/:agentId/history — unknown agents get an empty history. */
export function demoArenaHistory(agentId: string, window: ArenaWindow, limit?: number): ArenaSparklinePoint[] {
  const rows = buildEntries(window);
  const row = rows.find((r) => r.entry.agentId === agentId);
  if (!row) return [];
  const points = series(row.entry, window, row.contender, rows.length);
  return limit && limit > 0 ? points.slice(-limit) : points;
}

/** GET /api/performance/arena/agent/:code — null for codes outside the sample arena. */
export function demoArenaProfile(agentCode: string): PublicAgentProfile | null {
  const rows = buildEntries("all");
  const row = rows.find((r) => r.entry.agentCode.toUpperCase() === agentCode.toUpperCase());
  if (!row) return null;
  const { entry } = row;
  return {
    agentCode: entry.agentCode,
    name: entry.name,
    avatarEmoji: entry.avatarEmoji,
    agentType: entry.agentType,
    rank: entry.rank,
    selectedPnl: entry.selectedPnl,
    allTimePnl: entry.allTimePnl,
    winRate: entry.winRate,
    totalTrades: entry.totalTrades,
    openPositions: entry.openPositions,
    currentStreak: entry.currentStreak,
    heat: entry.heat,
    dna: entry.dna,
    badges: entry.badges,
    marketBreakdown: entry.marketBreakdown,
    sparkline: series(entry, "all", row.contender, rows.length),
    walletAddress: null, // no real explorer links for sample agents
    needsSetup: false,
  };
}

/** GET /api/performance/arena/compare?a1&a2&window — null when neither agent is on the board. */
export function demoArenaComparison(
  a1: string,
  a2: string,
  window: ArenaWindow,
): { window: ArenaWindow; agents: [ArenaComparisonAgent, ArenaComparisonAgent] } | null {
  const rows = buildEntries(window);
  const pick = (id: string): ArenaComparisonAgent => {
    const row = rows.find((r) => r.entry.agentId === id);
    const e = row?.entry;
    return {
      agentId: e?.agentId ?? "",
      agentCode: e?.agentCode ?? "",
      name: e?.name ?? "Unknown",
      avatarEmoji: e?.avatarEmoji ?? "?",
      rank: e?.rank ?? null,
      selectedPnl: e?.selectedPnl ?? 0,
      allTimePnl: e?.allTimePnl ?? 0,
      winRate: e?.winRate ?? 0,
      totalTrades: e?.totalTrades ?? 0,
      openPositions: e?.openPositions ?? 0,
      currentStreak: e?.currentStreak ?? 0,
      sparkline: row ? series(row.entry, window, row.contender, rows.length).slice(-48) : [],
    };
  };
  const [left, right] = [pick(a1), pick(a2)];
  if (!left.agentId && !right.agentId) return null;
  return { window, agents: [left, right] };
}

// ─── Live feed ───────────────────────────────────────────────────────────────
// Same shape as the backend's "arena:leaderboard_delta" event, plus optional
// trade/streak fields only the sample arena sends.

export type ArenaFeedKind = "rank" | "trade_won" | "trade_lost" | "streak";

export interface ArenaFeedDelta {
  agentId: string;
  name: string;
  avatarEmoji: string;
  previousRank: number | null;
  currentRank: number;
  rankChange: number;
  kind?: ArenaFeedKind;
  pnl?: number;
  market?: string;
  streak?: number;
}

export interface ArenaFeedEvent {
  window: string;
  deltas: ArenaFeedDelta[];
  timestamp: number;
}

// A season's worth of beats. Rank moves and streaks match the all-time board,
// so the feed never contradicts the table next to it.
// prettier-ignore
const FEED_SCRIPT: Array<[ArenaFeedKind, string, number?, string?]> = [
  ["trade_won", "orion-x", 38.4, "will-btc-close-above-150k-in-2026"],
  ["trade_won", "vex-9", 24.75, "eth-above-6k-2026"],
  ["rank", "kestrel-4"],
  ["trade_lost", "phantom-13", -18.2, "sol-flip-eth-volume"],
  ["streak", "halcyon-4"],
  ["trade_won", "ronin-12", 6.85, "btc-dominance-60"],
  ["trade_won", NOVA_KEY, 43.5, "us-cpi-below-3"],
  ["rank", NOVA_KEY],
  ["trade_lost", "mirage-6", -12.6, "hurricane-cat5-landfall"],
  ["trade_won", "quasar-5", 14.3, "ecb-cut-october"],
  ["rank", "ronin-12"],
  ["streak", "vex-9"],
  ["trade_lost", "cipher-0", -21.4, "nba-finals-game-7"],
  ["rank", "orion-x"],
  ["trade_won", "kestrel-4", 31.9, "fed-cut-december"],
  ["trade_won", "sable-8", 19.45, "gold-ath-q4"],
  ["streak", "phantom-13"],
  ["trade_won", "zenith-2", 9.8, "us-cpi-below-3"],
  ["rank", "quasar-5"],
  ["trade_won", "halcyon-4", 3.1, "ecb-cut-october"],
  ["trade_lost", "drift-3", -9.75, "oil-above-90"],
  ["rank", "zenith-2"],
  ["trade_won", "glint-5", 4.7, "spot-sol-etf-approval"],
  ["streak", "orion-x"],
  ["trade_won", "vex-9", 58.2, "fed-cut-december"],
  ["trade_lost", "sable-8", -11.7, "gold-ath-q4"],
  ["rank", "cipher-0"],
  ["streak", "mirage-6"],
  ["trade_won", "ronin-12", 11.25, "sol-flip-eth-volume"],
  ["rank", "halcyon-4"],
];

export const DEMO_ARENA_FEED_SEED_SIZE = 6;
export const DEMO_ARENA_FEED_SCRIPT_LENGTH = FEED_SCRIPT.length;

function contenderMarkets(c: Contender): string[] {
  return c.key === NOVA_KEY ? NOVA_BREAKDOWN.map((m) => m.slug) : c.markets;
}

/**
 * The feed beat for a given step. The script plays once as written; later
 * passes replay it with fresh amounts and markets, and turn its rank moves
 * into trades, because the board beside the feed never moves.
 */
export function demoArenaFeedEvent(step: number, now: number): ArenaFeedEvent {
  const length = FEED_SCRIPT.length;
  const index = ((step % length) + length) % length;
  const pass = Math.max(0, Math.floor(step / length));
  const [scriptKind, key, scriptPnl, scriptSlug] = FEED_SCRIPT[index];
  const row = buildEntries("all").find((r) => r.contender.key === key)!;
  const { entry, contender } = row;
  const base = {
    agentId: entry.agentId,
    name: entry.name,
    avatarEmoji: entry.avatarEmoji,
    previousRank: entry.rank,
    currentRank: entry.rank,
    rankChange: 0,
  };

  let kind = scriptKind;
  let pnl = scriptPnl;
  let slug = scriptSlug;
  if (pass > 0 && (kind === "trade_won" || kind === "trade_lost" || kind === "rank")) {
    const rng = seeded(`${key}:feed:${step}`);
    const markets = contenderMarkets(contender);
    if (kind === "rank") {
      kind = rng() < contender.winRate / 100 ? "trade_won" : "trade_lost";
      const typical = Math.max(4, (Math.abs(contender.pnl.all) / Math.max(1, contender.trades)) * 3);
      pnl = (kind === "trade_won" ? 1 : -1) * (typical * (0.4 + rng()));
    } else {
      pnl = (pnl ?? 0) * (0.55 + rng() * 0.9);
    }
    pnl = Math.sign(pnl) * Math.max(1, Math.abs(round2(pnl)));
    if (markets.length > 0 && (slug == null || rng() < 0.5)) slug = markets[Math.floor(rng() * markets.length)];
  }

  let delta: ArenaFeedDelta;
  if (kind === "rank" && entry.rankChange) {
    delta = { ...base, kind, previousRank: entry.rank + entry.rankChange, rankChange: entry.rankChange };
  } else if (kind === "trade_won" || kind === "trade_lost") {
    delta = { ...base, kind, pnl, market: slug ? MARKETS[slug]?.short ?? slug : undefined };
  } else {
    delta = { ...base, kind: "streak", streak: entry.currentStreak };
  }
  return { window: "all", deltas: [delta], timestamp: now };
}

/** A few recent beats (oldest first) so the feed is never empty on load. */
export function demoArenaFeedSeed(now: number): ArenaFeedEvent[] {
  return Array.from({ length: DEMO_ARENA_FEED_SEED_SIZE }, (_, i) =>
    demoArenaFeedEvent(i, now - (DEMO_ARENA_FEED_SEED_SIZE - i) * 37_000),
  );
}
