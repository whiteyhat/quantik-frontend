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
import {
  demoArenaComparison,
  demoArenaHistory,
  demoArenaLeaderboard,
  demoArenaProfile,
  parseArenaWindow,
} from "./arena";
import {
  demoAgentsHealth,
  demoAlertStatus,
  demoAttribution,
  demoBrierScores,
  demoCalibration,
  demoDrift,
  demoHealth,
  demoOrchestratorStatus,
  demoPipelineHistory,
  demoRiskConfig,
  demoRiskStatus,
  demoScannerResults,
  demoScannerStatus,
  demoSignals,
} from "./system";

type Handler = (query: URLSearchParams, pathname: string) => unknown;

/** Path segment by index, URL-decoded ("/api/performance/arena/x" → 4 is "x"). */
const segment = (pathname: string, index: number) => decodeURIComponent(pathname.split("/")[index] ?? "");

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
  // Exposure and available capital of the portfolio on screen
  [/^\/api\/risk\/status$/, () => demoRiskStatus()],
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
  // Guests see a sample arena; members (even without an agent) see the live one
  [/^\/api\/performance\/arena$/, (q) => demoArenaLeaderboard(parseArenaWindow(q.get("window")))],
  [/^\/api\/performance\/arena\/compare$/, (q) =>
    demoArenaComparison(q.get("a1") ?? "", q.get("a2") ?? "", parseArenaWindow(q.get("window")))],
  [/^\/api\/performance\/arena\/agent\/[^/]+$/, (_q, path) => demoArenaProfile(segment(path, 5))],
  [/^\/api\/performance\/arena\/[^/]+\/history$/, (q, path) =>
    demoArenaHistory(segment(path, 4), parseArenaWindow(q.get("window")), Number(q.get("limit") ?? 0))],
  // Platform state on the showcase pages (dashboard, My Agent, Reports): guests
  // see a healthy sample platform, never production's; members see the truth
  [/^\/api\/v1\/risk-config$/, () => demoRiskConfig()],
  [/^\/api\/signals$/, () => demoSignals()],
  [/^\/api\/agents\/health$/, () => demoAgentsHealth()],
  [/^\/api\/health$/, () => demoHealth()],
  [/^\/api\/orchestrator\/status$/, () => demoOrchestratorStatus()],
  [/^\/api\/scanner\/status$/, () => demoScannerStatus()],
  [/^\/api\/scanner\/results$/, (q) => demoScannerResults(Number(q.get("limit") ?? 50))],
  [/^\/api\/pipeline\/history$/, () => demoPipelineHistory()],
  [/^\/api\/alerts\/status$/, (q) => demoAlertStatus(q.get("slug"))],
  [/^\/api\/monitoring\/brier$/, () => demoBrierScores()],
  [/^\/api\/monitoring\/attribution$/, () => demoAttribution()],
  [/^\/api\/monitoring\/drift$/, () => demoDrift()],
  [/^\/api\/monitoring\/calibration$/, () => demoCalibration()],
];

/**
 * Simulated round trip for demo answers the page times itself (the dashboard
 * shows API health latency): an instant answer would read "0ms".
 */
export function demoLatencyMs(path: string): number {
  const pathname = path.split("?")[0];
  return pathname === "/api/health" ? 90 + Math.round(Math.random() * 80) : 0;
}

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
      if (pattern.test(pathname)) return handler(query, pathname);
    }
  }
  return undefined;
}
