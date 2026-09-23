import { demoAgent, DEMO_AUTOPILOT_POLICY } from "./agent";
import { demoExecutionLog, demoPositions, demoSummary, demoTradeReports, demoTrades } from "./portfolio";
import {
  demoAgentExecutions,
  demoAutopilotDecisions,
  demoAutopilotStatus,
  demoMarketAlerts,
  demoNotifications,
  demoWatchlist,
} from "./activity";

type Handler = (query: URLSearchParams) => unknown;

// Personal reads answered with demo data. "Agent" routes describe the agent
// being displayed; "guest" routes belong to a signed-in member even without an
// agent (their own watchlist), so only guests get demo versions of those.
const AGENT_ROUTES: Array<[RegExp, Handler]> = [
  [/^\/api\/v1\/agent\/me$/, () => demoAgent()],
  [/^\/api\/performance\/summary$/, () => demoSummary()],
  [/^\/api\/wallet\/positions$/, () => demoPositions()],
  [/^\/api\/trade$/, () => ({ trades: demoTrades() })],
  [/^\/api\/performance\/trades$/, (q) => demoTradeReports(q)],
  [/^\/api\/execution\/log$/, () => demoExecutionLog()],
  [/^\/api\/v1\/agents\/[^/]+\/autopilot-policy$/, () => DEMO_AUTOPILOT_POLICY],
  [/^\/api\/v1\/agents\/[^/]+\/autopilot-status$/, () => demoAutopilotStatus()],
  [/^\/api\/v1\/agents\/[^/]+\/autopilot-decisions$/, (q) => demoAutopilotDecisions(Number(q.get("limit") ?? 20))],
  [/^\/api\/v1\/agents\/[^/]+\/executions$/, (q) => demoAgentExecutions(q)],
  // Any other per-agent read in demo mode gets an empty envelope, never the server
  [/^\/api\/v1\/agents\/[^/]+\/[^/]+$/, () => ({ success: true, data: [] })],
];

const GUEST_ROUTES: Array<[RegExp, Handler]> = [
  [/^\/api\/notifications$/, () => demoNotifications()],
  [/^\/api\/v1\/watchlist$/, () => demoWatchlist()],
  [/^\/api\/v1\/market-alerts$/, () => demoMarketAlerts()],
];

/** True for personal reads (the ones demo mode can answer). */
export function isPersonalRoute(path: string): boolean {
  const pathname = path.split("?")[0];
  return [...AGENT_ROUTES, ...GUEST_ROUTES].some(([pattern]) => pattern.test(pathname));
}

/** Demo payload for a personal GET, or undefined when the live API should answer. */
export function resolveDemoGet(path: string, mode: "guest" | "no-agent"): unknown | undefined {
  const [pathname, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  const tables = mode === "guest" ? [AGENT_ROUTES, GUEST_ROUTES] : [AGENT_ROUTES];
  for (const table of tables) {
    for (const [pattern, handler] of table) {
      if (pattern.test(pathname)) return handler(query);
    }
  }
  return undefined;
}
