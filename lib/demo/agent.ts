import type { AutopilotPolicyEnvelope } from "@/lib/api";
import type { MyAgent } from "@/store/useQuantikStore";
import { ago, DAY, HOUR } from "./time";

// ─── NOVA-7: the demo agent guests explore ──────────────────────────────────

export const DEMO_AGENT_ID = "demo-nova-7";
export const DEMO_WALLET = "0x7a3D4bC1e9F2a8b6C5d0E4f3A2b1C9d8E7f6A5b4";

const POLICY = {
  cadenceMinutes: 15,
  cooldownMinutes: 45,
  maxTradesPerDay: 5,
  maxBetUsdc: 120,
  minSigma: 0.72,
  minKelly: 0.4,
  kellyMultiplier: 0.25,
  maxPositionFraction: 0.1,
  dailyLossLimitPct: 0.15,
  useAuraSentiment: true,
};

export const DEMO_AUTOPILOT_POLICY = {
  derived: { ...POLICY },
  overrides: {
    cadenceMinutes: null,
    cooldownMinutes: null,
    maxTradesPerDay: null,
    maxBetUsdc: null,
    minSigma: null,
    minKelly: null,
    kellyMultiplier: null,
    maxPositionFraction: null,
    dailyLossLimitPct: null,
    useAuraSentiment: null,
    updatedAt: null,
  },
  effective: { ...POLICY },
} as unknown as AutopilotPolicyEnvelope;

/** A fresh copy per read so timestamps stay relative to now. */
export function demoAgent(): MyAgent {
  return {
    id: DEMO_AGENT_ID,
    agent_code: "Q-DEMO-NOVA7",
    status: "active",
    name: "NOVA-7",
    avatar_emoji: "🦊",
    animal_type: "fox",
    avatar_image: null,
    personality: "calculated",
    decision_style: "analyst",
    trading_instinct: "value_hunter",
    time_patience: "swing",
    profit_dream: "wealth_builder",
    money_approach: "smart_scaling",
    protection_mindset: "flexible",
    leverage_vibe: "none",
    market_sense: "fixed_rules",
    asset_love: "crypto",
    wallet_address: DEMO_WALLET,
    created_at: ago(21 * DAY),
    updated_at: ago(2 * HOUR),
    deployed_at: ago(20 * DAY),
    agent_type: "created",
    endpoint_url: null,
    agent_url: null,
    webhook_events: ["*"],
    api_key_prefix: null,
    connection_status: "connected",
    last_heartbeat: ago(2 * 60_000),
    description: null,
    autopilot_enabled: true,
    autopilot_updated_at: ago(3 * DAY),
    autopilot_policy: DEMO_AUTOPILOT_POLICY,
    polymarket_ready: true,
    polymarket_status: "ready",
    erc8004_token_id: null,
    erc8004_registered_at: null,
    erc8004_reputation_score: null,
    erc8004_validation_count: 0,
  };
}

export const DEMO_AGENT = demoAgent();
