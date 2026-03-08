import { create } from "zustand";
import {
  PipelineResult,
  PipelineEvent,
  SigmaResult,
  EdgeResult,
  WalletBalance,
  Position,
  Trade,
} from "@/lib/api";

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
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface QuantikStore {
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
  pipelineReset: () => void;

  // Trade modal
  tradeModalOpen: boolean;
  pendingTrade: {
    slug: string;
    tokenId: string;
    sigma: SigmaResult;
    edge: EdgeResult;
    market: { question: string; yesPrice: number; noPrice: number };
  } | null;
  openTradeModal: (data: NonNullable<QuantikStore["pendingTrade"]>) => void;
  closeTradeModal: () => void;
}

const AGENT_NAMES = ["aura", "flux", "oracle", "edge", "clause", "lucifer", "sigma"];

function defaultAgents(): Record<string, AgentCardState> {
  return Object.fromEntries(AGENT_NAMES.map((a) => [a, { status: "idle" }]));
}

export const useQuantikStore = create<QuantikStore>((set) => ({
  myAgent: null,
  myAgentLoading: false,
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
  },

  pipelineStart: () =>
    set({
      pipeline: {
        running: true,
        agents: defaultAgents(),
        result: null,
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

  pipelineReset: () =>
    set({
      pipeline: {
        running: false,
        agents: defaultAgents(),
        result: null,
      },
    }),

  tradeModalOpen: false,
  pendingTrade: null,
  openTradeModal: (data) => set({ tradeModalOpen: true, pendingTrade: data }),
  closeTradeModal: () => set({ tradeModalOpen: false, pendingTrade: null }),
}));
