import { create } from "zustand";
import {
  AutopilotPolicyEnvelope,
  PipelineResult,
  PipelineEvent,
  PipelineHistoryRun,
  PipelineReplayFrame,
  SigmaResult,
  EdgeResult,
  WalletBalance,
  Position,
  Trade,
  normalizeAgentData,
} from "@/lib/api";
import { AGENT_NAMES, AGENT_OUTPUT_KEYS, isAgentName, type AgentName } from "@/lib/agents";

// ─── My Agent (user's configured trading agent) ──────────────────────────────

export interface MyAgent {
  id: string;
  agent_code: string;
  status: string;
  name: string;
  avatar_emoji: string;
  animal_type: string | null;
  avatar_image: string | null;
  personality: string;
  decision_style: string;
  trading_instinct: string;
  time_patience: string;
  profit_dream: string;
  money_approach: string;
  protection_mindset: string;
  leverage_vibe: string;
  market_sense: string;
  asset_love: string;
  wallet_address: string | null;
  created_at: number;
  updated_at: number;
  deployed_at: number | null;
  // BYO agent fields
  agent_type?: "created" | "byo";
  endpoint_url?: string | null;
  agent_url?: string | null;
  webhook_events?: string[];
  api_key_prefix?: string | null;
  connection_status?: "pending" | "connected" | "disconnected" | "error";
  last_heartbeat?: number | null;
  description?: string | null;
  autopilot_enabled?: boolean;
  autopilot_updated_at?: number | null;
  autopilot_policy?: AutopilotPolicyEnvelope;
  // Polymarket wallet preparation
  polymarket_ready?: boolean;
  polymarket_status?: "pending_funding" | "funding_detected" | "approving" | "approval_failed" | "ready";
  // ERC-8004 on-chain identity
  erc8004_token_id?: string | null;
  erc8004_registered_at?: number | null;
  erc8004_reputation_score?: number | null;
  erc8004_validation_count?: number;
}

// ─── Pipeline State ───────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface AgentCardState {
  status: AgentStatus;
  data?: unknown;
  error?: string;
  startedAt?: number;   // Date.now() when agent:start fired
  latencyMs?: number;   // ms from start to done/error
}

export interface PipelineState {
  running: boolean;
  agents: Record<string, AgentCardState>;
  result: PipelineResult | null;
  source: "idle" | "live" | "replay";
  runId: string | null;
  frames: PipelineReplayFrame[];
  version: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface QuantikStore {
  // Auth
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;

  // My Agent
  myAgent: MyAgent | null;
  myAgentLoading: boolean;
  setMyAgent: (a: MyAgent | null) => void;
  setMyAgentLoading: (l: boolean) => void;

  // Wallet
  wallet: WalletBalance | null;
  setWallet: (w: WalletBalance) => void;

  // Positions
  positions: Position[];
  setPositions: (p: Position[]) => void;

  // Recent trades
  recentTrades: Trade[];
  setRecentTrades: (t: Trade[]) => void;

  // Live prices (tokenId -> { yes, no })
  livePrices: Record<string, { yes: number; no: number }>;
  updatePrices: (prices: Record<string, { yes: number; no: number }>) => void;

  // Pipeline
  pipeline: PipelineState;
  pipelineStart: () => void;
  pipelineAgentEvent: (event: PipelineEvent) => void;
  pipelineComplete: (result: PipelineResult) => void;
  pipelineLoadReplay: (run: PipelineHistoryRun, frames: PipelineReplayFrame[]) => void;
  pipelineReset: () => void;

  // Trade modal
  tradeModalOpen: boolean;
  pendingTrade: {
    slug: string;
    tokenId: string;
    yesTokenId?: string;
    noTokenId?: string;
    sigma: SigmaResult;
    edge: EdgeResult;
    market: { question: string; yesPrice: number; noPrice: number };
  } | null;
  openTradeModal: (data: NonNullable<QuantikStore["pendingTrade"]>) => void;
  closeTradeModal: () => void;
}

type PipelineAgentKey = AgentName;

let pipelineVersion = 0;

function nextPipelineVersion(): number {
  pipelineVersion += 1;
  return pipelineVersion;
}

function defaultAgents(): Record<string, AgentCardState> {
  return Object.fromEntries(AGENT_NAMES.map((a) => [a, { status: "idle" }]));
}

function isPipelineAgentKey(agent: string): agent is PipelineAgentKey {
  return isAgentName(agent);
}

function normalizeStoredAgentOutput(agent: PipelineAgentKey, raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeAgentData(agent, raw as Record<string, unknown>);
  }
  return raw;
}

function buildReplayState(
  run: PipelineHistoryRun,
  frames: PipelineReplayFrame[]
): PipelineState {
  const agents = defaultAgents();
  const result: PipelineResult = {};
  let hasResult = false;

  for (const frame of frames) {
    if (!frame.agent || !isPipelineAgentKey(frame.agent)) continue;

    const agent = frame.agent;
    const prev = agents[agent];
    const startedAt =
      frame.startedAt ?? prev.startedAt ?? (frame.type === "agent:start" ? frame.timestamp : undefined);

    if (frame.type === "agent:start") {
      agents[agent] = { ...prev, status: "running", startedAt };
      continue;
    }

    if (frame.type === "agent:complete") {
      const normalized = normalizeStoredAgentOutput(agent, frame.data);
      const completedAt = frame.completedAt ?? frame.timestamp;
      agents[agent] = {
        status: "done",
        data: normalized,
        startedAt,
        latencyMs: startedAt != null ? Math.max(completedAt - startedAt, 0) : undefined,
      };
      if (normalized !== undefined) {
        (result as Record<string, unknown>)[agent] = normalized;
        hasResult = true;
      }
      continue;
    }

    if (frame.type === "agent:error") {
      const completedAt = frame.completedAt ?? frame.timestamp;
      agents[agent] = {
        status: "error",
        error: frame.error ?? undefined,
        startedAt,
        latencyMs: startedAt != null ? Math.max(completedAt - startedAt, 0) : undefined,
      };
    }
  }

  for (const agent of AGENT_NAMES) {
    const outputKey = AGENT_OUTPUT_KEYS[agent] as keyof PipelineHistoryRun;
    const normalized = normalizeStoredAgentOutput(agent, run[outputKey]);
    if (normalized == null) continue;

    if (agents[agent].status === "idle") {
      agents[agent] = { status: "done", data: normalized };
    } else if (agents[agent].status === "done" && agents[agent].data === undefined) {
      agents[agent] = { ...agents[agent], data: normalized };
    }

    (result as Record<string, unknown>)[agent] = normalized;
    hasResult = true;
  }

  if (!result.sigma && (run.decision || run.confidence != null)) {
    const sigmaFallback = normalizeStoredAgentOutput("sigma", {
      decision: run.decision ?? "SKIP",
      confidence: run.confidence ?? 0,
      thesis: "",
      size_pct: 0,
      size_usd: 0,
      entry_price: 0,
    });
    result.sigma = sigmaFallback as PipelineResult["sigma"];
    if (agents.sigma.status === "idle") {
      agents.sigma = { status: "done", data: sigmaFallback };
    }
    hasResult = true;
  }

  return {
    running: false,
    agents,
    result: hasResult || frames.length > 0 ? result : null,
    source: "replay",
    runId: run.id,
    frames,
    version: nextPipelineVersion(),
  };
}

export const useQuantikStore = create<QuantikStore>((set) => ({
  authReady: false,
  setAuthReady: (authReady) => set({ authReady }),

  myAgent: null,
  myAgentLoading: true,
  setMyAgent: (myAgent) => set({ myAgent }),
  setMyAgentLoading: (myAgentLoading) => set({ myAgentLoading }),

  wallet: null,
  setWallet: (wallet) => set({ wallet }),

  positions: [],
  setPositions: (positions) => set({ positions }),

  recentTrades: [],
  setRecentTrades: (recentTrades) => set({ recentTrades }),

  livePrices: {},
  updatePrices: (prices) =>
    set((s) => ({ livePrices: { ...s.livePrices, ...prices } })),

  pipeline: {
    running: false,
    agents: defaultAgents(),
    result: null,
    source: "idle",
    runId: null,
    frames: [],
    version: nextPipelineVersion(),
  },

  pipelineStart: () =>
    set({
      pipeline: {
        running: true,
        agents: defaultAgents(),
        result: null,
        source: "live",
        runId: null,
        frames: [],
        version: nextPipelineVersion(),
      },
    }),

  pipelineAgentEvent: (event) =>
    set((s) => {
      if (event.type === "pipeline:start") return s;
      const agentKey = "agent" in event ? event.agent : undefined;
      if (!agentKey) return s;
      const now = Date.now();
      const prev = s.pipeline.agents[agentKey];
      let card: AgentCardState;
      if (event.type === "agent:start") {
        card = { status: "running", startedAt: now };
      } else if (event.type === "agent:complete") {
        const latencyMs = prev?.startedAt ? now - prev.startedAt : undefined;
        card = { status: "done", data: event.data, startedAt: prev?.startedAt, latencyMs };
      } else {
        const latencyMs = prev?.startedAt ? now - prev.startedAt : undefined;
        card = { status: "error", error: typeof event.error === "string" ? event.error : JSON.stringify(event.error), startedAt: prev?.startedAt, latencyMs };
      }
      return {
        pipeline: {
          ...s.pipeline,
          agents: { ...s.pipeline.agents, [agentKey]: card },
        },
      };
    }),

  pipelineComplete: (result) =>
    set((s) => ({
      pipeline: {
        ...s.pipeline,
        running: false,
        result,
      },
    })),

  pipelineLoadReplay: (run, frames) =>
    set({
      pipeline: buildReplayState(run, frames),
    }),

  pipelineReset: () =>
    set({
      pipeline: {
        running: false,
        agents: defaultAgents(),
        result: null,
        source: "idle",
        runId: null,
        frames: [],
        version: nextPipelineVersion(),
      },
    }),

  tradeModalOpen: false,
  pendingTrade: null,
  openTradeModal: (data) => set({ tradeModalOpen: true, pendingTrade: data }),
  closeTradeModal: () => set({ tradeModalOpen: false, pendingTrade: null }),
}));
