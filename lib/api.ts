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
  yesTokenId?: string;
  noTokenId?: string;
  question: string;
  resolutionDate: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  liquidityGrade: "A" | "B" | "C" | "D";
  probability?: number;
  category?: string;
  tags?: string[];
  spread?: number;
  chainMode?: "stellar_testnet" | "polymarket";
  protocol?: string;
  opportunityType?: string;
  assetPair?: string;
  currentApy?: number;
  riskScore?: number;
  executionPlan?: StellarExecutionPlan;
  poolReserves?: {
    base: number;
    quote: number;
  };
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
  xlm?: number;
  xlmFormatted?: string;
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
  trustlineEstablished?: boolean;
  stellarReady?: boolean;
  stellarStatus?: string | null;
  network?: string | null;
  walletNetwork?: string | null;
}

// ── Bridge Types ──────────────────────────────────────────────────────────────

export type BridgeStatus =
  | "pending"
  | "stellar_tx_submitted"
  | "bridging"
  | "bridge_complete"
  | "approving"
  | "ready"
  | "failed";

export interface BridgeQuote {
  amountIn: number;
  fee: number;
  amountOut: number;
  estimatedTimeMinutes: number;
}

export interface BridgeTransfer {
  id: string;
  userId: string;
  agentId: string;
  direction: string;
  sourceChain: string;
  destChain: string;
  sourceTxHash: string | null;
  destTxHash: string | null;
  amount: number;
  fee: number | null;
  amountReceived: number | null;
  status: BridgeStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface Position {
  id: string;
  executionId?: number;
  market: string;
  question?: string;
  slug: string;
  tokenId?: string | null;
  yesTokenId?: string | null;
  noTokenId?: string | null;
  direction: "YES" | "NO";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  /** "autopilot" if the agent executed it, "manual" if the user did */
  source?: "autopilot" | "manual";
  /** ISO date string of when the market resolves */
  resolutionDate?: string | null;
  executedAt?: number;
  status?: string;
}

export interface Trade {
  id: string;
  market: string;
  slug: string;
  direction: "YES" | "NO";
  source?: "autopilot" | "manual";
  size: number;
  price: number;
  outcome: "WIN" | "LOSS" | "OPEN" | "PENDING";
  timestamp: number;
  pnl?: number;
  orderId?: string | null;
  mode?: string;
  pipelineRunId?: string | null;
}

export interface NotificationItem {
  id: string;
  level: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  category?: string | null;
  timestamp: number;
  readAt?: number | null;
  action?: {
    label: string;
    href: string;
  } | null;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  slug: string;
  question: string | null;
  created_at: number;
}

export interface MarketAlertItem {
  id: string;
  user_id: string;
  slug: string;
  question: string | null;
  direction: "above" | "below";
  threshold: number;
  enabled: boolean;
  last_state?: string | null;
  last_triggered_at?: number | null;
  created_at: number;
  updated_at: number;
}

export interface TradeReportBucket {
  timestamp: number;
  pnl: number;
  trades: number;
  label: string;
}

export interface TradeReportsResponse {
  trades: Trade[];
  count: number;
  period: "day" | "week" | "month" | "all";
  filters: {
    outcome: Trade["outcome"] | null;
    source: "autopilot" | "manual" | null;
    search: string;
  };
  summary: {
    totalTrades: number;
    totalPnl: number;
    wins: number;
    losses: number;
    open: number;
    pending: number;
    winRate: number;
  };
  buckets: TradeReportBucket[];
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  agentAttribution: Array<{
    agent: string;
    weight: number;
    brierScore: number | null;
    trend: "improving" | "degrading" | "stable";
  }>;
}

export type ArenaWindow = "day" | "week" | "all";

export interface ArenaMarketBreakdown {
  slug: string;
  question: string;
  pnl: number;
  trades: number;
  winRate: number;
  openPositions: number;
}

export interface ArenaLeaderboardEntry {
  rank: number;
  agentId: string;
  agentCode: string;
  name: string;
  avatarEmoji: string;
  animalType: string | null;
  agentType: string;
  connectionStatus: string | null;
  autopilotEnabled: boolean;
  polymarketReady: boolean;
  selectedPnl: number;
  selectedRealizedPnl: number;
  selectedUnrealizedPnl: number;
  allTimePnl: number;
  totalTrades: number;
  winRate: number;
  openPositions: number;
  currentStreak: number;
  lastTradeAt: number | null;
  bestTradeSlug: string | null;
  bestTradePnl: number;
  rankChange: number | null;
  marketBreakdown: ArenaMarketBreakdown[];
  badges: Array<{ id: string; name: string; description: string; tier: string; emoji: string }>;
  heat: number;
  dna: AgentDNA;
}

export interface AgentDNA {
  volume: number;
  diversity: number;
  speed: number;
  streak: number;
  riskAppetite: number;
  timing: number;
}

export interface PublicAgentProfile {
  agentCode: string;
  name: string;
  avatarEmoji: string;
  agentType: string;
  rank: number | null;
  selectedPnl: number;
  allTimePnl: number;
  winRate: number;
  totalTrades: number;
  openPositions: number;
  currentStreak: number;
  heat: number;
  dna: AgentDNA;
  badges: ArenaLeaderboardEntry["badges"];
  marketBreakdown: ArenaMarketBreakdown[];
  sparkline: ArenaSparklinePoint[];
}

export interface ArenaViewerContext {
  agentId: string | null;
  eligible: boolean;
  ranked: boolean;
  rank: number | null;
  entry: ArenaLeaderboardEntry | null;
  referencePnl: number;
  gapToTop10: number;
  gapToPodium: number;
  gapToCrown: number;
  reason: "no_agent" | "inactive" | "no_activity" | "ranked";
}

export interface ArenaSparklinePoint {
  timestamp: number;
  pnl: number;
  rank: number;
}

export interface ArenaComparisonAgent {
  agentId: string;
  agentCode: string;
  name: string;
  avatarEmoji: string;
  rank: number | null;
  selectedPnl: number;
  allTimePnl: number;
  winRate: number;
  totalTrades: number;
  openPositions: number;
  currentStreak: number;
  sparkline: ArenaSparklinePoint[];
}

export interface ArenaLeaderboardResponse {
  window: ArenaWindow;
  updatedAt: number;
  meta: {
    rankedAgents: number;
    totalRanked: number;
    activeAgents: number;
    totalSelectedPnlPool: number;
    totalRealizedPnlPool: number;
    totalUnrealizedPnlPool: number;
    lastTradeAt: number | null;
  };
  leaders: ArenaLeaderboardEntry[];
  viewer: ArenaViewerContext;
}

function requireObject(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${context} payload`);
  }
  return value as Record<string, unknown>;
}

function requireArenaString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${context}`);
  }
  return value;
}

function readArenaOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function requireArenaNumber(value: unknown, context: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${context}`);
  }
  return parsed;
}

function requireArenaBoolean(value: unknown, context: string): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  throw new Error(`Invalid ${context}`);
}

function normalizeBooleanLike(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function normalizeFundingStatus(value: unknown): WalletBalance["fundingStatus"] {
  return value === "ready" || value === "funding_required" || value === "unavailable" || value === "no_wallet"
    ? value
    : "unavailable";
}

function normalizeAutopilotBlocker(value: unknown): AutopilotBlocker {
  return value === "none"
    || value === "no_wallet"
    || value === "funding_required"
    || value === "polymarket_prep_required"
    || value === "scanner_idle"
    || value === "autopilot_off"
    ? value
    : "none";
}

function normalizeExecutionSource(value: unknown): AgentExecutionLogItem["source"] {
  return value === "autopilot" || value === "manual" || value === "unknown" ? value : "unknown";
}

function requireArenaWindow(value: unknown): ArenaWindow {
  if (value === "day" || value === "week" || value === "all") return value;
  throw new Error("Invalid arena window");
}

function requireArenaReason(value: unknown): ArenaViewerContext["reason"] {
  if (value === "no_agent" || value === "inactive" || value === "no_activity" || value === "ranked") {
    return value;
  }
  throw new Error("Invalid arena viewer state");
}

function normalizeArenaEntry(input: unknown, context: string): ArenaLeaderboardEntry {
  const entry = requireObject(input, context);
  return {
    rank: requireArenaNumber(entry.rank, `${context}.rank`),
    agentId: requireArenaString(entry.agentId, `${context}.agentId`),
    agentCode: requireArenaString(entry.agentCode, `${context}.agentCode`),
    name: requireArenaString(entry.name, `${context}.name`),
    avatarEmoji: requireArenaString(entry.avatarEmoji, `${context}.avatarEmoji`),
    animalType: readArenaOptionalString(entry.animalType),
    agentType: requireArenaString(entry.agentType, `${context}.agentType`),
    connectionStatus: readArenaOptionalString(entry.connectionStatus),
    autopilotEnabled: requireArenaBoolean(entry.autopilotEnabled, `${context}.autopilotEnabled`),
    polymarketReady: requireArenaBoolean(entry.polymarketReady, `${context}.polymarketReady`),
    selectedPnl: requireArenaNumber(entry.selectedPnl, `${context}.selectedPnl`),
    selectedRealizedPnl: requireArenaNumber(entry.selectedRealizedPnl, `${context}.selectedRealizedPnl`),
    selectedUnrealizedPnl: requireArenaNumber(entry.selectedUnrealizedPnl, `${context}.selectedUnrealizedPnl`),
    allTimePnl: requireArenaNumber(entry.allTimePnl, `${context}.allTimePnl`),
    totalTrades: requireArenaNumber(entry.totalTrades, `${context}.totalTrades`),
    winRate: requireArenaNumber(entry.winRate, `${context}.winRate`),
    openPositions: requireArenaNumber(entry.openPositions, `${context}.openPositions`),
    currentStreak: requireArenaNumber(entry.currentStreak, `${context}.currentStreak`),
    lastTradeAt: entry.lastTradeAt == null ? null : requireArenaNumber(entry.lastTradeAt, `${context}.lastTradeAt`),
    bestTradeSlug: readArenaOptionalString(entry.bestTradeSlug),
    bestTradePnl: requireArenaNumber(entry.bestTradePnl, `${context}.bestTradePnl`),
    rankChange: entry.rankChange == null ? null : Number(entry.rankChange),
    marketBreakdown: Array.isArray(entry.marketBreakdown)
      ? (entry.marketBreakdown as Record<string, unknown>[]).map((m) => ({
          slug: String(m.slug ?? ""),
          question: String(m.question ?? m.slug ?? ""),
          pnl: Number(m.pnl ?? 0),
          trades: Number(m.trades ?? 0),
          winRate: Number(m.winRate ?? 0),
          openPositions: Number(m.openPositions ?? 0),
        }))
      : [],
    badges: Array.isArray(entry.badges)
      ? (entry.badges as Record<string, unknown>[]).map((b) => ({
          id: String(b.id ?? ""),
          name: String(b.name ?? ""),
          description: String(b.description ?? ""),
          tier: String(b.tier ?? "common"),
          emoji: String(b.emoji ?? ""),
        }))
      : [],
    heat: Number(entry.heat ?? 0),
    dna: normalizeDNA(entry.dna),
  };
}

function normalizeDNA(input: unknown): AgentDNA {
  const empty: AgentDNA = { volume: 0, diversity: 0, speed: 0, streak: 0, riskAppetite: 0, timing: 0 };
  if (!input || typeof input !== "object") return empty;
  const d = input as Record<string, unknown>;
  return {
    volume: Number(d.volume ?? 0),
    diversity: Number(d.diversity ?? 0),
    speed: Number(d.speed ?? 0),
    streak: Number(d.streak ?? 0),
    riskAppetite: Number(d.riskAppetite ?? 0),
    timing: Number(d.timing ?? 0),
  };
}

function normalizeComparisonAgent(input: unknown): ArenaComparisonAgent {
  const a = requireObject(input, "comparison.agent");
  return {
    agentId: String(a.agentId ?? ""),
    agentCode: String(a.agentCode ?? ""),
    name: String(a.name ?? "Unknown"),
    avatarEmoji: String(a.avatarEmoji ?? "?"),
    rank: a.rank == null ? null : Number(a.rank),
    selectedPnl: Number(a.selectedPnl ?? 0),
    allTimePnl: Number(a.allTimePnl ?? 0),
    winRate: Number(a.winRate ?? 0),
    totalTrades: Number(a.totalTrades ?? 0),
    openPositions: Number(a.openPositions ?? 0),
    currentStreak: Number(a.currentStreak ?? 0),
    sparkline: Array.isArray(a.sparkline)
      ? (a.sparkline as Record<string, unknown>[]).map((p) => ({
          timestamp: Number(p.timestamp ?? 0),
          pnl: Number(p.pnl ?? 0),
          rank: Number(p.rank ?? 0),
        }))
      : [],
  };
}

function normalizeTradeRecord(input: unknown): Trade {
  const item = input as Record<string, unknown>;
  return {
    id: String(item?.id ?? ""),
    market: String(item?.market ?? item?.slug ?? ""),
    slug: String(item?.slug ?? ""),
    direction: (String(item?.direction ?? "YES").toUpperCase() === "NO" ? "NO" : "YES") as "YES" | "NO",
    source: String(item?.source ?? "").toLowerCase() === "autopilot" ? "autopilot" : "manual",
    size: Number(item?.size ?? item?.sizeUsdc ?? 0),
    price: Number(item?.price ?? item?.entryPrice ?? 0),
    outcome: (["WIN", "LOSS", "OPEN", "PENDING"].includes(String(item?.outcome ?? "").toUpperCase())
      ? String(item?.outcome).toUpperCase()
      : "OPEN") as Trade["outcome"],
    timestamp: Number(item?.timestamp ?? item?.created_at ?? 0),
    pnl: Number(item?.pnl ?? 0),
    orderId: item?.orderId != null ? String(item.orderId) : null,
    mode: item?.mode != null ? String(item.mode) : undefined,
    pipelineRunId: item?.pipelineRunId != null ? String(item.pipelineRunId) : null,
  };
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
  sentiment_score: number; // -1 to +1 (normalized from sentimentDelta)
  echo_chamber: boolean;   // normalized from shiftDetected
  echo_chamber_strength?: number; // normalized from echoChamberRisk
  summary?: string;
  confidence?: number;
  breakingNews?: boolean;
  shiftDirection?: "YES" | "NO" | "NEUTRAL";
  shiftTrend?: "ACCELERATING" | "STEADY" | "DECELERATING" | "REVERSING";
  whalePositioning?: "LONG" | "SHORT" | "NEUTRAL" | "MIXED";
  searchTrendSpike?: boolean;
  dataSufficiency?: number;
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
  ev_grade: "A" | "B" | "C" | "SKIP" | "PASS";
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
  plain_summary?: string;
  size_pct: number;
  size_usd: number;
  entry_price: number;
  executionPlan?: StellarExecutionPlan;
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

export interface AutopilotPolicyOverrides {
  cadenceMinutes: number | null;
  cooldownMinutes: number | null;
  maxTradesPerDay: number | null;
  maxBetUsdc: number | null;
  minSigma: number | null;
  minKelly: number | null;
  kellyMultiplier: number | null;
  maxPositionFraction: number | null;
  dailyLossLimitPct: number | null;
  useAuraSentiment: boolean | null;
  updatedAt: number | null;
}

export interface AutopilotPolicyEffective {
  cadenceMinutes: number;
  cooldownMinutes: number;
  maxTradesPerDay: number;
  maxBetUsdc: number;
  minSigma: number;
  minKelly: number;
  kellyMultiplier: number;
  maxPositionFraction: number;
  dailyLossLimitPct: number;
  useAuraSentiment: boolean;
}

export interface AutopilotPolicyEnvelope {
  derived: AutopilotPolicyEffective;
  overrides: AutopilotPolicyOverrides;
  effective: AutopilotPolicyEffective;
}

export interface AutopilotDecision {
  id: string;
  agent_id: string;
  user_id: string | null;
  slug: string;
  direction: "YES" | "NO";
  decision: "executed" | "skipped" | "failed";
  reason_code: string;
  size_usdc: number | null;
  scanned_at: number;
  policy_snapshot: AutopilotPolicyEnvelope;
  signal_snapshot: Record<string, unknown> | null;
  error: string | null;
}

export type AutopilotBlocker =
  | "none"
  | "no_wallet"
  | "funding_required"
  | "polymarket_prep_required"
  | "scanner_idle"
  | "autopilot_off";

export interface AutopilotDecisionSummary {
  id: string;
  slug: string;
  direction: "YES" | "NO";
  decision: "executed" | "skipped" | "failed";
  reason_code: string;
  size_usdc: number | null;
  scanned_at: number;
  error: string | null;
}

export interface AutopilotAgentStatus {
  agentId: string;
  autopilotEnabled: boolean;
  polymarketReady: boolean;
  polymarketStatus: string | null;
  wallet: {
    address: string | null;
    onChainUsdc: number;
    clobBalance: number;
    pol: number;
    fundingStatus: WalletBalance["fundingStatus"];
    fundingMessage: string | null;
    missingItems: string[];
  };
  scheduler: {
    scannerRunning: boolean;
    lastGlobalScanAt: number | null;
    scanIntervalMs: number;
    paperMode: boolean;
  };
  activity: {
    tradesToday: number;
    lastExecutedAt: number | null;
    lastDecisionAt: number | null;
    lastDecision: AutopilotDecisionSummary | null;
    lastReasonCode: string | null;
  };
  blocker: AutopilotBlocker;
}

export interface AgentExecutionLogItem {
  id: string;
  slug: string;
  side: string;
  direction: "YES" | "NO" | null;
  amount: number;
  executedAt: number;
  status: string;
  orderId: string | null;
  fillPrice: number | null;
  pnl: number | null;
  source: "autopilot" | "manual" | "unknown";
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
  reason?: string | null;
  cooldownEndsAt?: number | null;
  rearmedAt?: number | null;
}

export interface PipelineHistoryRun {
  id: string;
  market_slug: string;
  market_question: string;
  created_at: number;
  completed_at: number | null;
  decision: string | null;
  confidence: number | null;
  source?: "pipeline" | "scanner";
  available_agents?: string[];
  aura_output?: unknown;
  flux_output?: unknown;
  oracle_output?: unknown;
  edge_output?: unknown;
  sigma_output?: unknown;
  clause_output?: unknown;
  lucifer_output?: unknown;
}

export interface PipelineReplayStep {
  id: string;
  run_id: string;
  step_order: number;
  step: string;
  agent: string | null;
  status: string;
  startedAt: number | null;
  completedAt: number | null;
  data: unknown;
  error: string | null;
  created_at: number;
}

export interface PipelineReplayFrame {
  index: number;
  type:
    | "pipeline:start"
    | "pipeline:complete"
    | "agent:start"
    | "agent:complete"
    | "agent:error"
    | "trade:executed"
    | "trade:rejected"
    | "trade:error";
  step: string;
  agent: string | null;
  status: string;
  timestamp: number;
  startedAt: number | null;
  completedAt: number | null;
  data?: unknown;
  error?: string | null;
}

export interface PanicModeStatus {
  active: boolean;
  cooldownEndsAt: number | null;
  cooldownRemainingMs: number;
  canRearm: boolean;
  latestEvent: {
    id: string;
    requestCode: string;
    reason: string | null;
    status: string;
    initiatedAt: number;
    completedAt: number | null;
    reportId: string | null;
    cooldownEndsAt: number | null;
    rearmedAt: number | null;
  } | null;
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
  policy_setup_completed: boolean;
  policy_setup_completed_at: number | null;
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
  evm: { address: string; privateKey: string };
  stellar: { address: string; privateKey: string };
}

/** Legacy single-wallet shape used by BYO onboarding */
export interface LegacyWalletCredentials {
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
  telegramConfigured?: boolean;
}

export interface TradeRequest {
  direction: "YES" | "NO";
  tokenId?: string;
  side?: "buy" | "sell";
  price?: number;
  size: number;
  marketSlug?: string;
  netEv?: number;
  evGrade?: string;
}

export interface StellarExecutionPlan {
  action: "SWAP";
  protocol: string;
  assetIn: string;
  assetOut: string;
  amountUsdc: number;
  minAmountOut?: number;
}

export interface StellarTradeRequest {
  opportunityId: string;
  action: "SWAP";
  assetIn: string;
  assetOut: string;
  amountUsdc: number;
  minAmountOut?: number;
}

// ── Solana Token Types (Phase 2) ─────────────────────────────────────────────

export interface AgentTokenStatus {
  tokenized: boolean;
  token: {
    token_mint: string;
    dbc_pool_address: string;
    dbc_config_address: string;
    damm_pool_address: string | null;
    status: "bonding" | "migrated";
    token_name: string;
    token_symbol: string;
    metadata_uri: string;
    created_at: number;
    migrated_at: number | null;
  } | null;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  minimumAmountOut: string;
  priceBeforeSwap: string;
  priceAfterSwap: string;
  feeTrading: string;
  side: "buy" | "sell";
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

  // Solana Wallet
  getSolanaWalletStatus: async (): Promise<{ linked: boolean; walletAddress: string | null }> => {
    return apiFetch("/solana/wallet-status");
  },
  linkSolanaWallet: async (payload: {
    walletAddress: string;
    signature: string;
    message: string;
  }): Promise<{ success: boolean; walletAddress: string }> => {
    return apiFetch("/solana/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  unlinkSolanaWallet: async (): Promise<{ success: boolean }> => {
    return apiFetch("/solana/link-wallet", { method: "DELETE" });
  },

  getWalletStatus: async (signal?: AbortSignal): Promise<WalletBalance | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>("/api/wallet/balance", { signal });
      return {
        address: String(raw.address ?? ""),
        usdc: raw.usdc == null ? null : Number(raw.usdc),
        onChainUsdc: raw.onChainUsdc == null ? Number(raw.usdc ?? 0) : Number(raw.onChainUsdc),
        onChainUsdcFormatted: raw.onChainUsdcFormatted != null ? String(raw.onChainUsdcFormatted) : undefined,
        pol: raw.pol == null ? undefined : Number(raw.pol),
        polFormatted: raw.polFormatted != null ? String(raw.polFormatted) : undefined,
        xlm: raw.xlm == null ? undefined : Number(raw.xlm),
        xlmFormatted: raw.xlmFormatted != null ? String(raw.xlmFormatted) : undefined,
        pnl: 0,
        pnlPct: null,
        winRate: 0,
        totalTrades: 0,
        pnlToday: 0,
        pnlTodayPct: null,
        totalValue: null,
        balanceStatus: (String(raw.balanceStatus ?? "unavailable") as WalletBalance["balanceStatus"]),
        balanceMessage: raw.balanceMessage != null ? String(raw.balanceMessage) : null,
        liveBalanceAvailable: Boolean(raw.liveBalanceAvailable),
        fundingStatus: normalizeFundingStatus(raw.fundingStatus),
        fundingMessage: raw.fundingMessage != null ? String(raw.fundingMessage) : null,
        trustlineEstablished: Boolean(raw.trustlineEstablished),
        stellarReady: Boolean(raw.stellarReady),
        stellarStatus: raw.stellarStatus != null ? String(raw.stellarStatus) : null,
        network: raw.network != null ? String(raw.network) : null,
        walletNetwork: raw.walletNetwork != null ? String(raw.walletNetwork) : null,
      };
    } catch {
      return null;
    }
  },

  getPositions: async (signal?: AbortSignal): Promise<Position[]> => {
    const res = await apiFetch<Position[]>("/api/wallet/positions", { signal });
    const positions = Array.isArray(res) ? res : [];
    return positions.map((position) => ({
      ...position,
      id: String(position.id ?? ""),
      executionId: position.executionId != null ? Number(position.executionId) : undefined,
      tokenId: position.tokenId ?? null,
      yesTokenId: position.yesTokenId ?? null,
      noTokenId: position.noTokenId ?? null,
      executedAt: position.executedAt != null ? Number(position.executedAt) : undefined,
      status: position.status ? String(position.status) : undefined,
    }));
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

  executeStellarTrade: (req: StellarTradeRequest) =>
    apiFetch<{ ok: boolean; status: string; txHash?: string | null; executionId?: number | null; protocol?: string; action?: string; paper?: boolean }>(
      "/api/stellar/execute",
      {
        method: "POST",
        body: JSON.stringify(req),
      }
    ),

  cancelAll: () =>
    apiFetch<{ cancelled: number }>("/api/trade/cancel-all", { method: "POST" }),

  closePosition: async (executionId: number): Promise<{
    ok: boolean;
    executionId: number;
    slug: string;
    direction: "YES" | "NO";
    size: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    closedAt: number;
    status: string;
  }> =>
    apiFetch("/api/trade/close-position", {
      method: "POST",
      body: JSON.stringify({ executionId }),
    }),

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
  getPipelineHistory: async (): Promise<PipelineHistoryRun[]> => {
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
          source: item?.source === "scanner" ? "scanner" : "pipeline",
          available_agents: Array.isArray(item?.available_agents)
            ? item.available_agents.map((agent) => String(agent))
            : undefined,
          aura_output: item?.aura_output,
          flux_output: item?.flux_output,
          oracle_output: item?.oracle_output,
          edge_output: item?.edge_output,
          sigma_output: item?.sigma_output,
          clause_output: item?.clause_output,
          lucifer_output: item?.lucifer_output,
        };
      });
    } catch {
      return [];
    }
  },

  getPipelineRun: async (id: string): Promise<{
    run: PipelineHistoryRun;
    steps: PipelineReplayStep[];
  }> => {
    const raw = await apiFetch<{
      run: PipelineHistoryRun;
      steps: PipelineReplayStep[];
    }>(`/api/pipeline/history/${id}`);
    return {
      run: raw.run,
      steps: Array.isArray(raw.steps) ? raw.steps : [],
    };
  },

  getPipelineReplay: async (id: string): Promise<{
    run: PipelineHistoryRun;
    frames: PipelineReplayFrame[];
  }> => {
    const raw = await apiFetch<{
      run: PipelineHistoryRun;
      frames: PipelineReplayFrame[];
    }>(`/api/pipeline/history/${id}/replay`);
    return {
      run: raw.run,
      frames: Array.isArray(raw.frames) ? raw.frames : [],
    };
  },

  // Trades
  getTrades: async (): Promise<Trade[]> => {
    try {
      const raw = await apiFetch<{ trades: unknown[] }>("/api/trade");
      const trades = Array.isArray(raw?.trades) ? raw.trades : Array.isArray(raw) ? (raw as unknown[]) : [];
      return trades.map(normalizeTradeRecord);
    } catch {
      return [];
    }
  },

  getTradeReports: async (params?: {
    period?: "day" | "week" | "month" | "all";
    outcome?: Trade["outcome"] | "All";
    source?: "autopilot" | "manual" | "all";
    search?: string;
  }): Promise<TradeReportsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.period && params.period !== "all") searchParams.set("period", params.period);
    if (params?.outcome && params.outcome !== "All") searchParams.set("outcome", params.outcome);
    if (params?.source && params.source !== "all") searchParams.set("source", params.source);
    if (params?.search?.trim()) searchParams.set("search", params.search.trim());
    const query = searchParams.toString();
    const raw = await apiFetch<TradeReportsResponse>(`/api/performance/trades${query ? `?${query}` : ""}`);
    return {
      trades: Array.isArray(raw.trades) ? raw.trades.map(normalizeTradeRecord) : [],
      count: Number(raw.count ?? 0),
      period: raw.period ?? "all",
      filters: {
        outcome: raw.filters?.outcome ?? null,
        source: raw.filters?.source ?? null,
        search: typeof raw.filters?.search === "string" ? raw.filters.search : "",
      },
      summary: {
        totalTrades: Number(raw.summary?.totalTrades ?? 0),
        totalPnl: Number(raw.summary?.totalPnl ?? 0),
        wins: Number(raw.summary?.wins ?? 0),
        losses: Number(raw.summary?.losses ?? 0),
        open: Number(raw.summary?.open ?? 0),
        pending: Number(raw.summary?.pending ?? 0),
        winRate: Number(raw.summary?.winRate ?? 0),
      },
      buckets: Array.isArray(raw.buckets) ? raw.buckets : [],
      bestTrade: raw.bestTrade ? normalizeTradeRecord(raw.bestTrade) : null,
      worstTrade: raw.worstTrade ? normalizeTradeRecord(raw.worstTrade) : null,
      agentAttribution: Array.isArray(raw.agentAttribution) ? raw.agentAttribution : [],
    };
  },

  getArenaLeaderboard: async (window: ArenaWindow = "all", signal?: AbortSignal): Promise<ArenaLeaderboardResponse> => {
    const searchParams = new URLSearchParams();
    if (window !== "all") searchParams.set("window", window);
    const query = searchParams.toString();
    const raw = await apiFetch<ArenaLeaderboardResponse>(`/api/performance/arena${query ? `?${query}` : ""}`, { signal });
    const meta = requireObject(raw.meta, "arena.meta");
    const viewer = requireObject(raw.viewer, "arena.viewer");

    return {
      window: requireArenaWindow(raw.window),
      updatedAt: requireArenaNumber(raw.updatedAt, "arena.updatedAt"),
      meta: {
        rankedAgents: requireArenaNumber(meta.rankedAgents, "arena.meta.rankedAgents"),
        totalRanked: requireArenaNumber(meta.totalRanked ?? meta.rankedAgents, "arena.meta.totalRanked"),
        activeAgents: requireArenaNumber(meta.activeAgents, "arena.meta.activeAgents"),
        totalSelectedPnlPool: requireArenaNumber(meta.totalSelectedPnlPool, "arena.meta.totalSelectedPnlPool"),
        totalRealizedPnlPool: requireArenaNumber(meta.totalRealizedPnlPool, "arena.meta.totalRealizedPnlPool"),
        totalUnrealizedPnlPool: requireArenaNumber(meta.totalUnrealizedPnlPool, "arena.meta.totalUnrealizedPnlPool"),
        lastTradeAt: meta.lastTradeAt == null ? null : requireArenaNumber(meta.lastTradeAt, "arena.meta.lastTradeAt"),
      },
      leaders: Array.isArray(raw.leaders)
        ? raw.leaders.map((entry, index) => normalizeArenaEntry(entry, `arena.leaders[${index}]`))
        : (() => { throw new Error("Invalid arena.leaders payload"); })(),
      viewer: {
        agentId: readArenaOptionalString(viewer.agentId),
        eligible: requireArenaBoolean(viewer.eligible, "arena.viewer.eligible"),
        ranked: requireArenaBoolean(viewer.ranked, "arena.viewer.ranked"),
        rank: viewer.rank == null ? null : requireArenaNumber(viewer.rank, "arena.viewer.rank"),
        entry: viewer.entry ? normalizeArenaEntry(viewer.entry, "arena.viewer.entry") : null,
        referencePnl: requireArenaNumber(viewer.referencePnl, "arena.viewer.referencePnl"),
        gapToTop10: requireArenaNumber(viewer.gapToTop10, "arena.viewer.gapToTop10"),
        gapToPodium: requireArenaNumber(viewer.gapToPodium, "arena.viewer.gapToPodium"),
        gapToCrown: requireArenaNumber(viewer.gapToCrown, "arena.viewer.gapToCrown"),
        reason: requireArenaReason(viewer.reason),
      },
    };
  },

  getPublicAgentProfile: async (
    agentCode: string,
    signal?: AbortSignal,
  ): Promise<PublicAgentProfile | null> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>(`/api/performance/arena/agent/${encodeURIComponent(agentCode)}`, { signal });
      if (!raw) return null;
      return {
        agentCode: String(raw.agentCode ?? ""),
        name: String(raw.name ?? "Unknown"),
        avatarEmoji: String(raw.avatarEmoji ?? "?"),
        agentType: String(raw.agentType ?? "created"),
        rank: raw.rank == null ? null : Number(raw.rank),
        selectedPnl: Number(raw.selectedPnl ?? 0),
        allTimePnl: Number(raw.allTimePnl ?? 0),
        winRate: Number(raw.winRate ?? 0),
        totalTrades: Number(raw.totalTrades ?? 0),
        openPositions: Number(raw.openPositions ?? 0),
        currentStreak: Number(raw.currentStreak ?? 0),
        heat: Number(raw.heat ?? 0),
        dna: normalizeDNA(raw.dna),
        badges: Array.isArray(raw.badges)
          ? (raw.badges as Record<string, unknown>[]).map((b) => ({
              id: String(b.id ?? ""),
              name: String(b.name ?? ""),
              description: String(b.description ?? ""),
              tier: String(b.tier ?? "common"),
              emoji: String(b.emoji ?? ""),
            }))
          : [],
        marketBreakdown: Array.isArray(raw.marketBreakdown)
          ? (raw.marketBreakdown as Record<string, unknown>[]).map((m) => ({
              slug: String(m.slug ?? ""),
              question: String(m.question ?? m.slug ?? ""),
              pnl: Number(m.pnl ?? 0),
              trades: Number(m.trades ?? 0),
              winRate: Number(m.winRate ?? 0),
              openPositions: Number(m.openPositions ?? 0),
            }))
          : [],
        sparkline: Array.isArray(raw.sparkline)
          ? (raw.sparkline as Record<string, unknown>[]).map((p) => ({
              timestamp: Number(p.timestamp ?? 0),
              pnl: Number(p.pnl ?? 0),
              rank: Number(p.rank ?? 0),
            }))
          : [],
      };
    } catch {
      return null;
    }
  },

  getArenaAgentHistory: async (
    agentId: string,
    window: ArenaWindow = "all",
    signal?: AbortSignal,
  ): Promise<Array<{ timestamp: number; pnl: number; rank: number }>> => {
    const params = new URLSearchParams();
    if (window !== "all") params.set("window", window);
    const query = params.toString();
    const raw = await apiFetch<unknown[]>(`/api/performance/arena/${encodeURIComponent(agentId)}/history${query ? `?${query}` : ""}`, { signal });
    return Array.isArray(raw)
      ? raw.map((item) => {
          const p = item as Record<string, unknown>;
          return { timestamp: Number(p.timestamp ?? 0), pnl: Number(p.pnl ?? 0), rank: Number(p.rank ?? 0) };
        })
      : [];
  },

  getArenaComparison: async (
    a1: string,
    a2: string,
    window: ArenaWindow = "all",
    signal?: AbortSignal,
  ): Promise<{
    window: ArenaWindow;
    agents: [ArenaComparisonAgent, ArenaComparisonAgent];
  } | null> => {
    const params = new URLSearchParams({ a1, a2, window });
    try {
      const raw = await apiFetch<Record<string, unknown>>(`/api/performance/arena/compare?${params.toString()}`, { signal });
      if (!raw || !Array.isArray(raw.agents) || raw.agents.length < 2) return null;
      return {
        window: requireArenaWindow(raw.window),
        agents: [
          normalizeComparisonAgent(raw.agents[0]),
          normalizeComparisonAgent(raw.agents[1]),
        ],
      };
    } catch {
      return null;
    }
  },

  downloadTradeReportsCsv: async (params?: {
    period?: "day" | "week" | "month" | "all";
    outcome?: Trade["outcome"] | "All";
    source?: "autopilot" | "manual" | "all";
    search?: string;
  }): Promise<Blob> => {
    const searchParams = new URLSearchParams();
    if (params?.period && params.period !== "all") searchParams.set("period", params.period);
    if (params?.outcome && params.outcome !== "All") searchParams.set("outcome", params.outcome);
    if (params?.source && params.source !== "all") searchParams.set("source", params.source);
    if (params?.search?.trim()) searchParams.set("search", params.search.trim());
    const query = searchParams.toString();
    const headers: Record<string, string> = {};
    if (_authToken) {
      headers.Authorization = `Bearer ${_authToken}`;
    }
    const response = await fetch(`${BASE_URL}/api/performance/trades/export.csv${query ? `?${query}` : ""}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }
    return response.blob();
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
        confidence: (() => {
          const raw = Number(item?.confidence ?? 0);
          return raw > 1 ? raw : raw * 100;
        })(),
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
    // Dual wallet fields
    evm_address?: string;
    evm_private_key?: string;
    stellar_address?: string;
    stellar_private_key?: string;
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

  updateAgentTraits: async (agentId: string, traits: {
    personality: string;
    decisionStyle: string;
    tradingInstinct: string;
    timePatience: string;
    moneyApproach: string;
    protectionMindset: string;
    marketSense: string;
  }): Promise<{ ok: boolean; system_prompt: string; autopilot_policy: AutopilotPolicyEnvelope }> => {
    return apiFetch(`/api/v1/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...traits,
        profitDream: "wealth_builder",
        assetLove: "crypto",
      }),
    });
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

  getAutopilotPolicy: async (agentId: string): Promise<AutopilotPolicyEnvelope> => {
    return apiFetch(`/api/v1/agents/${agentId}/autopilot-policy`);
  },

  updateAutopilotPolicy: async (
    agentId: string,
    patch: {
      cadenceMinutes?: number | null;
      cooldownMinutes?: number | null;
      maxTradesPerDay?: number | null;
      maxBetUsdc?: number | null;
      minSigma?: number | null;
      minKelly?: number | null;
      kellyMultiplier?: number | null;
      maxPositionFraction?: number | null;
      dailyLossLimitPct?: number | null;
      useAuraSentiment?: boolean | null;
    }
  ): Promise<AutopilotPolicyEnvelope> => {
    return apiFetch(`/api/v1/agents/${agentId}/autopilot-policy`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  resetAutopilotPolicy: async (agentId: string): Promise<AutopilotPolicyEnvelope> => {
    return apiFetch(`/api/v1/agents/${agentId}/autopilot-policy/reset`, {
      method: "POST",
    });
  },

  getAutopilotDecisions: async (agentId: string, limit = 50): Promise<AutopilotDecision[]> => {
    const response = await apiFetch<{ decisions?: AutopilotDecision[] }>(`/api/v1/agents/${agentId}/autopilot-decisions?limit=${limit}`);
    return Array.isArray(response.decisions) ? response.decisions : [];
  },

  getAgentAutopilotStatus: async (agentId: string): Promise<AutopilotAgentStatus> => {
    const raw = await apiFetch<Record<string, unknown>>(`/api/v1/agents/${agentId}/autopilot-status`);
    const walletRaw = raw.wallet && typeof raw.wallet === "object" ? raw.wallet as Record<string, unknown> : {};
    const schedulerRaw = raw.scheduler && typeof raw.scheduler === "object" ? raw.scheduler as Record<string, unknown> : {};
    const activityRaw = raw.activity && typeof raw.activity === "object" ? raw.activity as Record<string, unknown> : {};
    const decisionRaw = activityRaw.lastDecision && typeof activityRaw.lastDecision === "object"
      ? activityRaw.lastDecision as Record<string, unknown>
      : null;

    return {
      agentId: String(raw.agentId ?? agentId),
      autopilotEnabled: normalizeBooleanLike(raw.autopilotEnabled),
      polymarketReady: normalizeBooleanLike(raw.polymarketReady),
      polymarketStatus: typeof raw.polymarketStatus === "string" ? raw.polymarketStatus : null,
      wallet: {
        address: typeof walletRaw.address === "string" ? walletRaw.address : null,
        onChainUsdc: Number(walletRaw.onChainUsdc ?? 0),
        clobBalance: Number(walletRaw.clobBalance ?? 0),
        pol: Number(walletRaw.pol ?? 0),
        fundingStatus: normalizeFundingStatus(walletRaw.fundingStatus),
        fundingMessage: typeof walletRaw.fundingMessage === "string" ? walletRaw.fundingMessage : null,
        missingItems: Array.isArray(walletRaw.missingItems)
          ? walletRaw.missingItems.map((item) => String(item))
          : [],
      },
      scheduler: {
        scannerRunning: normalizeBooleanLike(schedulerRaw.scannerRunning),
        lastGlobalScanAt: schedulerRaw.lastGlobalScanAt == null ? null : Number(schedulerRaw.lastGlobalScanAt),
        scanIntervalMs: Number(schedulerRaw.scanIntervalMs ?? 0),
        paperMode: normalizeBooleanLike(schedulerRaw.paperMode),
      },
      activity: {
        tradesToday: Number(activityRaw.tradesToday ?? 0),
        lastExecutedAt: activityRaw.lastExecutedAt == null ? null : Number(activityRaw.lastExecutedAt),
        lastDecisionAt: activityRaw.lastDecisionAt == null ? null : Number(activityRaw.lastDecisionAt),
        lastDecision: decisionRaw
          ? {
              id: String(decisionRaw.id ?? ""),
              slug: String(decisionRaw.slug ?? ""),
              direction: String(decisionRaw.direction ?? "YES").toUpperCase() === "NO" ? "NO" : "YES",
              decision: String(decisionRaw.decision ?? "skipped") === "executed"
                ? "executed"
                : String(decisionRaw.decision ?? "skipped") === "failed"
                  ? "failed"
                  : "skipped",
              reason_code: String(decisionRaw.reason_code ?? ""),
              size_usdc: decisionRaw.size_usdc == null ? null : Number(decisionRaw.size_usdc),
              scanned_at: Number(decisionRaw.scanned_at ?? 0),
              error: typeof decisionRaw.error === "string" ? decisionRaw.error : null,
            }
          : null,
        lastReasonCode: typeof activityRaw.lastReasonCode === "string" ? activityRaw.lastReasonCode : null,
      },
      blocker: normalizeAutopilotBlocker(raw.blocker),
    };
  },

  getAgentExecutions: async (
    agentId: string,
    options?: { source?: "autopilot" | "manual"; limit?: number }
  ): Promise<AgentExecutionLogItem[]> => {
    const params = new URLSearchParams();
    if (options?.source) params.set("source", options.source);
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    const raw = await apiFetch<{ executions?: unknown[] }>(
      `/api/v1/agents/${agentId}/executions${query ? `?${query}` : ""}`
    );
    const executions = Array.isArray(raw.executions) ? raw.executions : [];

    return executions.map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        id: String(item.id ?? ""),
        slug: String(item.slug ?? ""),
        side: String(item.side ?? ""),
        direction: item.direction == null
          ? null
          : String(item.direction).toUpperCase() === "NO"
            ? "NO"
            : "YES",
        amount: Number(item.amount ?? 0),
        executedAt: Number(item.executedAt ?? 0),
        status: String(item.status ?? ""),
        orderId: item.orderId == null ? null : String(item.orderId),
        fillPrice: item.fillPrice == null ? null : Number(item.fillPrice),
        pnl: item.pnl == null ? null : Number(item.pnl),
        source: normalizeExecutionSource(item.source),
      };
    });
  },

  updateRiskConfig: async (config: Partial<RiskConfig>): Promise<void> => {
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
        telegramConfigured: Boolean(raw?.telegramConfigured),
      };
    } catch {
      return { alerts: [], muted: false, mutedUntil: null };
    }
  },

  getLastMarketAlert: async (slug: string): Promise<AlertStatus> => {
    try {
      const raw = await apiFetch<Record<string, unknown>>(`/api/alerts/status?slug=${encodeURIComponent(slug)}`);
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
        telegramConfigured: Boolean(raw?.telegramConfigured),
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

  testTelegramConnection: async (): Promise<{ ok: boolean; sent: boolean }> => {
    return apiFetch("/api/alerts/test", { method: "POST" });
  },

  getNotifications: async (): Promise<{ notifications: NotificationItem[]; unread: number }> => {
    const raw = await apiFetch<{ notifications?: NotificationItem[]; unread?: number }>("/api/notifications");
    return {
      notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
      unread: Number(raw.unread ?? 0),
    };
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
  },

  markAllNotificationsRead: async (): Promise<void> => {
    await apiFetch("/api/notifications/read-all", { method: "POST" });
  },

  getWatchlist: async (): Promise<WatchlistItem[]> => {
    const raw = await apiFetch<{ items?: WatchlistItem[] }>("/api/v1/watchlist");
    return Array.isArray(raw.items) ? raw.items : [];
  },

  addWatchlistItem: async (slug: string, question?: string | null): Promise<void> => {
    await apiFetch("/api/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ slug, question }),
    });
  },

  removeWatchlistItem: async (slug: string): Promise<void> => {
    await apiFetch(`/api/v1/watchlist/${encodeURIComponent(slug)}`, { method: "DELETE" });
  },

  getMarketAlerts: async (): Promise<MarketAlertItem[]> => {
    const raw = await apiFetch<{ items?: MarketAlertItem[] }>("/api/v1/market-alerts");
    return Array.isArray(raw.items) ? raw.items : [];
  },

  createMarketAlert: async (input: {
    slug: string;
    question?: string | null;
    direction: "above" | "below";
    threshold: number;
  }): Promise<void> => {
    await apiFetch("/api/v1/market-alerts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateMarketAlert: async (
    id: string,
    patch: Partial<{
      question: string | null;
      direction: "above" | "below";
      threshold: number;
      enabled: boolean;
    }>
  ): Promise<void> => {
    await apiFetch(`/api/v1/market-alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
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

  downloadByoOnboardingWallet: async (sessionId: string): Promise<LegacyWalletCredentials> => {
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
  activatePanicMode: async (options: {
    cancelOrders: boolean;
    liquidatePositions: boolean;
    reason: string;
  }): Promise<{ success: boolean; reportId: string; cooldownEndsAt: number; reason: string }> => {
    return apiFetch("/api/v1/panic-mode/activate", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  getPanicModeStatus: async (): Promise<PanicModeStatus> => {
    return apiFetch("/api/v1/panic-mode/status");
  },

  rearmPanicMode: async (confirmation: string): Promise<{ success: boolean; status: PanicModeStatus }> => {
    return apiFetch("/api/v1/panic-mode/rearm", {
      method: "POST",
      body: JSON.stringify({ confirmation }),
    });
  },

  getLiquidationReport: async (id: string): Promise<LiquidationReport> => {
    return apiFetch(`/api/v1/liquidation-reports/${id}`);
  },

  // ── Token API (Phase 2) ───────────────────────────────────────────────────

  // Initiates token creation. Backend returns 202 and emits Socket.IO progress.
  tokenizeAgent: async (agentId: string): Promise<{ status: string; message: string }> => {
    return apiFetch(`/api/solana/tokens/${agentId}/tokenize`, { method: "POST", body: JSON.stringify({}) });
  },

  // Returns tokenization status for an agent (null token = not tokenized).
  getAgentTokenStatus: async (agentId: string): Promise<AgentTokenStatus> => {
    return apiFetch(`/api/solana/tokens/${agentId}/status`);
  },

  // Returns swap quote for buy or sell. amount: USDC for buy, token amount for sell.
  getSwapQuote: async (poolAddress: string, amount: number, side: "buy" | "sell"): Promise<SwapQuote> => {
    return apiFetch(`/api/solana/tokens/${encodeURIComponent(poolAddress)}/quote?amount=${amount}&side=${side}`);
  },

  // Returns base64-serialized swap transaction for user wallet to sign.
  buildSwapTx: async (params: {
    poolAddress: string;
    configAddress: string;
    tokenMint: string;
    amountIn: string;
    minimumAmountOut: string;
    side: "buy" | "sell";
    ownerPublicKey: string;
  }): Promise<{ transaction: string }> => {
    return apiFetch(`/api/solana/tokens/${encodeURIComponent(params.poolAddress)}/swap-tx`, {
      method: "POST",
      body: JSON.stringify(params),
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
      prob_estimate: raw.calibrated_prob ?? raw.prob_estimate ?? raw.estimated_true_prob ?? 0,
      market_implied: raw.market_implied ?? raw.yes_price ?? raw.yesPrice ?? 0,
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
      resolution_risk: (
        raw.riskLevel === "MEDIUM"
          ? "MED"
          : raw.riskLevel === "LOW"
            ? "LOW"
            : raw.riskLevel === "HIGH"
              ? "HIGH"
              : raw.resolution_risk ?? "MED"
      ) as "LOW" | "MED" | "HIGH",
      technicality_risks: Array.isArray(raw.technicality_risks) ? raw.technicality_risks : [],
    };
    case "sigma": return {
      ...raw,
      decision: raw.decision ?? raw.recommendation ?? "SKIP",
      confidence: typeof raw.confidence === "number"
        ? raw.confidence > 1 ? raw.confidence : raw.confidence * 100
        : 0,
      executionPlan: raw.executionPlan,
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
    const handleMessage = (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as
          | Record<string, { yes: number; no: number }>
          | { tokens?: string[]; prices?: unknown; timestamp?: number };

        if (payload && "prices" in payload) {
          const mapped: Record<string, { yes: number; no: number }> = {};
          const priceValues = payload.prices;
          if (Array.isArray(priceValues) && Array.isArray(payload.tokens)) {
            payload.tokens.forEach((token, index) => {
              const raw = priceValues[index] as Record<string, unknown> | number | undefined;
              const yes =
                typeof raw === "number"
                  ? raw
                  : Number((raw as Record<string, unknown> | undefined)?.yes ?? (raw as Record<string, unknown> | undefined)?.price ?? 0);
              mapped[token] = { yes, no: Math.max(0, 1 - yes) };
            });
          } else if (priceValues && typeof priceValues === "object") {
            Object.entries(priceValues as Record<string, unknown>).forEach(([token, raw]) => {
              const row = raw as Record<string, unknown>;
              const yes = Number(row?.yes ?? row?.price ?? raw ?? 0);
              mapped[token] = { yes, no: Math.max(0, 1 - yes) };
            });
          }
          onPrice(mapped);
          return;
        }

        onPrice(payload as Record<string, { yes: number; no: number }>);
      } catch {}
    };
    es.onmessage = handleMessage;
    es.addEventListener("prices", handleMessage as EventListener);
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

// ─── Releases ────────────────────────────────────────────────────────────────

export async function getReleases(): Promise<import("./releases").ReleaseEntry[]> {
  return apiFetch("/api/versions");
}

// ─── Bridge API ──────────────────────────────────────────────────────────────

export const bridgeApi = {
  getQuote: async (amount: number): Promise<BridgeQuote> => {
    const res = await apiFetch<{ data: BridgeQuote }>("/api/bridge/quote", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    return res.data;
  },

  buildTx: async (agentId: string, amount: number): Promise<{ xdr: string; transferId: string }> => {
    const res = await apiFetch<{ data: { xdr: string; transferId: string } }>("/api/bridge/build-tx", {
      method: "POST",
      body: JSON.stringify({ agentId, amount }),
    });
    return res.data;
  },

  submit: async (agentId: string, transferId: string, signedXdr: string): Promise<BridgeTransfer> => {
    const res = await apiFetch<{ data: BridgeTransfer }>("/api/bridge/submit", {
      method: "POST",
      body: JSON.stringify({ agentId, transferId, signedXdr }),
    });
    return res.data;
  },

  getStatus: async (transferId: string): Promise<BridgeTransfer> => {
    const res = await apiFetch<{ data: BridgeTransfer }>(`/api/bridge/status/${transferId}`);
    return res.data;
  },

  getHistory: async (): Promise<BridgeTransfer[]> => {
    const res = await apiFetch<{ data: BridgeTransfer[] }>("/api/bridge/history");
    return res.data;
  },
};

// ─── Formatters (re-exported from lib/formatters.ts) ─────────────────────────

export { fmtPrice, fmtUSDC, fmtCompact, fmtDollar, fmtNumber, fmtDate, fmtDateFull, fmtDateShort, fmtTime, fmtTimeShort, fmtDateTime } from "./formatters";

export function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#00ff88";
    case "B": return "#4488ff";
    case "C": return "#ffaa00";
    case "D": return "#ff4444";
    default:  return "#606080";
  }
}
