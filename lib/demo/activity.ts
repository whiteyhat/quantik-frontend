import type {
  AgentExecutionLogItem,
  AutopilotAgentStatus,
  AutopilotDecision,
  MarketAlertItem,
  NotificationItem,
  WatchlistItem,
} from "@/lib/api";
import { DEMO_AGENT_ID, DEMO_AUTOPILOT_POLICY, DEMO_WALLET } from "./agent";
import { demoTrades } from "./portfolio";
import { ago, DAY, HOUR, MINUTE } from "./time";

// ─── NOVA-7's autopilot, notifications and discovery lists ───────────────────

export function demoAutopilotStatus(): AutopilotAgentStatus {
  return {
    agentId: DEMO_AGENT_ID,
    autopilotEnabled: true,
    polymarketReady: true,
    polymarketStatus: "ready",
    wallet: {
      address: DEMO_WALLET,
      onChainUsdc: 5610,
      clobBalance: 5610,
      pol: 12.5,
      fundingStatus: "ready",
      fundingMessage: null,
      missingItems: [],
    },
    scheduler: {
      scannerRunning: true,
      lastGlobalScanAt: ago(4 * MINUTE),
      scanIntervalMs: 15 * MINUTE,
      paperMode: true,
    },
    activity: {
      tradesToday: 2,
      lastExecutedAt: ago(3 * HOUR),
      lastDecisionAt: ago(4 * MINUTE),
      lastDecision: {
        id: "demo-decision-1",
        slug: "us-cpi-below-3",
        direction: "NO",
        decision: "skipped",
        reason_code: "edge_below_threshold",
        size_usdc: null,
        scanned_at: ago(4 * MINUTE),
        error: null,
      },
      lastReasonCode: "edge_below_threshold",
    },
    blocker: "none",
  };
}

const DECISIONS: Array<[string, string, "YES" | "NO", AutopilotDecision["decision"], string, number | null, number, number, number]> = [
  // slug, question, direction, decision, reason, size, minutes ago, sigma, kelly
  ["us-cpi-below-3", "Will US CPI print below 3% next month?", "NO", "skipped", "edge_below_threshold", null, 4, 0.66, 0.21],
  ["will-btc-close-above-150k-in-2026", "Will BTC close above $150k in 2026?", "YES", "executed", "signal_passed", 120, 185, 0.78, 0.46],
  ["fed-cut-december", "Will the Fed cut rates in December?", "YES", "executed", "signal_passed", 80, 1800, 0.81, 0.52],
  ["nba-finals-game-7", "Will the NBA Finals go to Game 7?", "YES", "skipped", "lucifer_veto", null, 2400, 0.7, 0.33],
  ["sol-flip-eth-volume", "Will Solana out-trade Ethereum on DEX volume this month?", "NO", "executed", "signal_passed", 90, 6600, 0.76, 0.44],
  ["openai-gpt6-release", "Will GPT-6 be released before July?", "YES", "skipped", "cooldown", null, 7200, 0.74, 0.41],
];

export function demoAutopilotDecisions(limit: number): { decisions: AutopilotDecision[] } {
  return {
    decisions: DECISIONS.slice(0, Math.max(1, limit)).map(
      ([slug, question, direction, decision, reason_code, size_usdc, minutesAgo, sigma, kelly], i) => ({
        id: `demo-decision-${i + 1}`,
        agent_id: DEMO_AGENT_ID,
        user_id: "demo",
        slug,
        direction,
        decision,
        reason_code,
        size_usdc,
        scanned_at: ago(minutesAgo * MINUTE),
        policy_snapshot: DEMO_AUTOPILOT_POLICY,
        signal_snapshot: { question, sigmaConfidence: sigma, kellyFraction: kelly },
        error: null,
      }),
    ),
  };
}

export function demoAgentExecutions(query: URLSearchParams): { executions: AgentExecutionLogItem[] } {
  const source = query.get("source");
  const limit = Number(query.get("limit") ?? 50);
  const executions = demoTrades()
    .filter((t) => !source || source === "all" || t.source === source)
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      side: "buy",
      direction: t.direction,
      amount: t.size,
      executedAt: t.timestamp,
      status: "paper",
      orderId: t.orderId ?? null,
      fillPrice: t.price,
      pnl: t.pnl ?? null,
      source: (t.source ?? "unknown") as AgentExecutionLogItem["source"],
    }));
  return { executions };
}

export function demoNotifications(): { notifications: NotificationItem[]; unread: number } {
  const notifications: NotificationItem[] = [
    {
      id: "demo-note-1",
      level: "success",
      title: "NOVA-7 placed a paper trade",
      message: "BET YES on \"Will BTC close above $150k in 2026?\" at 45¢ · $120.",
      category: "trade",
      timestamp: ago(3 * HOUR),
      readAt: null,
      action: { label: "Open market", href: "/market/will-btc-close-above-150k-in-2026" },
    },
    {
      id: "demo-note-2",
      level: "warning",
      title: "LUCIFER vetoed a trade",
      message: "Skipped the NBA Finals market: thin liquidity and a vague resolution rule.",
      category: "risk",
      timestamp: ago(40 * HOUR),
      readAt: null,
      action: null,
    },
    {
      id: "demo-note-3",
      level: "info",
      title: "Autopilot resumed",
      message: "Cooldown finished. NOVA-7 is scanning markets every 15 minutes.",
      category: "autopilot",
      timestamp: ago(2 * DAY),
      readAt: ago(2 * DAY - HOUR),
      action: null,
    },
    {
      id: "demo-note-4",
      level: "info",
      title: "Weekly report is ready",
      message: "7 closed trades, 71% win rate, +$194 paper P&L.",
      category: "report",
      timestamp: ago(4 * DAY),
      readAt: ago(4 * DAY - HOUR),
      action: { label: "View report", href: "/reports" },
    },
  ];
  return { notifications, unread: notifications.filter((n) => !n.readAt).length };
}

export function demoWatchlist(): { items: WatchlistItem[] } {
  return {
    items: [
      { id: "demo-watch-1", user_id: "demo", slug: "fed-cut-december", question: "Will the Fed cut rates in December?", created_at: ago(6 * DAY) },
      { id: "demo-watch-2", user_id: "demo", slug: "apple-foldable-2026", question: "Will Apple announce a foldable iPhone in 2026?", created_at: ago(9 * DAY) },
    ],
  };
}

export function demoMarketAlerts(): { items: MarketAlertItem[] } {
  return {
    items: [
      {
        id: "demo-alert-1",
        user_id: "demo",
        slug: "will-btc-close-above-150k-in-2026",
        question: "Will BTC close above $150k in 2026?",
        direction: "above",
        threshold: 0.6,
        enabled: true,
        last_state: "below",
        last_triggered_at: null,
        created_at: ago(5 * DAY),
        updated_at: ago(5 * DAY),
      },
    ],
  };
}
