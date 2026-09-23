# Guest Showcase Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page of Quantik renders without an account; personal pages show demo agent NOVA-7; real actions open the Clerk sign-in popup; operator-only controls are hidden from everyone but the operator.

**Architecture:** A `ViewerProvider` mounted in `components/Providers.tsx` resolves who is looking (loading, guest, member without an agent, member) from Clerk plus one backend call (`GET /api/v1/me/access`), keeps the API token in sync, and switches `lib/api.ts` into a demo mode that answers personal reads from `lib/demo/` fixtures and refuses writes locally. A `useSignInGate()` hook wraps every real action. Pages keep their data code; only action handlers, a few automatic effects and "has an agent" checks change.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, @clerk/nextjs 7 (Core 3), next-intl 4, TanStack Query 5, Zustand 5, Vitest 4 (node environment), Playwright MCP for the walkthrough. Backend: Express 4 + Jest.

**Spec:** `docs/superpowers/specs/2026-09-23-guest-showcase-design.md`

## Global Constraints

- Frontend root: `/Users/carlos/Documents/GitHub/quantik/quantik-frontend`; backend root: `/Users/carlos/Documents/GitHub/quantik/quantik-backend`.
- Demo agent name: `NOVA-7`, id `demo-nova-7`, agent_code `Q-DEMO-NOVA7`, agent_type `created`, polymarket_ready `true`, polymarket_status `ready`, wallet_address set, erc8004_token_id `null`.
- Every new user-visible string goes through next-intl and exists in all of `messages/{en,es,fr,de}.json` (es informal "tú", fr formal "vous", de informal "du"; correct diacritics; no em dashes).
- Nothing runs automatically after sign-in. Automatic effects that would write or call a paid model skip quietly when the viewer cannot act; they never open the sign-in popup.
- The sign-in popup is `useClerk().openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href })`.
- `store.myAgent` holds the agent being displayed (NOVA-7 in demo). "Does this person have a real agent" is always `useViewer().hasAgent`.
- Operator = Clerk user id listed in backend env `ADMIN_USER_IDS`; the frontend learns it only from `GET /api/v1/me/access`.
- Do not commit or push to `main` without Carlos's go-ahead; `main` auto-deploys to production.

## Review Focus

1. A guest signs in from the popup while on a personal page. Expected: within one render the page shows their real data (or the no-agent demo) with a valid token; no 401 loop, no stale NOVA-7. Pinned by the mode-transition test in Task 3 (`nextViewerState` + `shouldResetOnTransition`).
2. A signed-in member with no agent opens Agent Factory. Expected: the quiz, not the "you already have an agent" lock. Pinned in Task 8 by the `isLocked` change plus the Task 3 `resolveViewerMode` test for `member-no-agent`.
3. A guest opens a market with `?autorun=1` or a pipeline replay. Expected: nothing is sent to the server, no popup; Execute Trade asks to sign in. Pinned in Task 7 (autorun guard) and Task 2 (`assertNotDemoWrite` test).
4. A guest clicks a notification. Expected: it opens, marks read locally, no sign-in popup, no request. Pinned in Task 6 and Task 2 (writes refused locally without network).
5. A member without an agent adds a market to their watchlist. Expected: the write reaches the server (they are signed in). Pinned in Task 2 (`no-agent` mode lets writes through).

---

### Task 1: Backend `GET /api/v1/me/access`

**Files:**
- Create: `quantik-backend/src/routes/meAccess.ts`
- Modify: `quantik-backend/src/index.ts` (mount next to the other `/api/v1` routers)
- Test: `quantik-backend/tests/securityGuards.test.ts`

**Interfaces:**
- Produces: `GET /api/v1/me/access` → `200 { signedIn: boolean; hasAgent: boolean; isOperator: boolean }` for everyone (guests get all false). Never 401.

- [ ] **Step 1: Write the failing test** (append to `tests/securityGuards.test.ts`; mount the router in `startServer` with `app.use("/api/v1", meAccessRouter)` after requiring it like the others)

```ts
describe("GET /api/v1/me/access", () => {
  it("tells guests nothing about operators", async () => {
    const body = await json(await fetch(`${baseUrl}/api/v1/me/access`));
    expect(body).toEqual({ signedIn: false, hasAgent: false, isOperator: false });
  });

  it("reports the owner's agent", async () => {
    signIn(OWNER_ID);
    const body = await json(await fetch(`${baseUrl}/api/v1/me/access`));
    expect(body).toEqual({ signedIn: true, hasAgent: true, isOperator: false });
  });

  it("recognises the operator", async () => {
    signIn("user-admin", "clerk_admin");
    const body = await json(await fetch(`${baseUrl}/api/v1/me/access`));
    expect(body).toEqual({ signedIn: true, hasAgent: false, isOperator: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd quantik-backend && npx jest tests/securityGuards.test.ts -t "me/access"`
Expected: FAIL (route not found → 404, `json` of HTML throws).

- [ ] **Step 3: Implement** `src/routes/meAccess.ts`

```ts
import { Router, Request, Response } from "express";
import { getUserIdAsync } from "../middleware/auth";
import { isAdminRequest } from "../middleware/guards";
import { loadLinkedAgentForUser } from "../utils/linkedAgent";

const router = Router();

// Who is looking: lets the frontend choose between the demo and the real app
// and hide operator-only controls. Safe for guests: everything is false.
router.get("/me/access", async (req: Request, res: Response) => {
  const userId = await getUserIdAsync(req);
  const linkedAgent = userId ? await loadLinkedAgentForUser(userId) : null;
  res.json({
    signedIn: !!userId,
    hasAgent: !!linkedAgent,
    isOperator: !!userId && isAdminRequest(req),
  });
});

export default router;
```

Mount in `src/index.ts`: `import meAccessRouter from "./routes/meAccess";` and `app.use("/api/v1", meAccessRouter);` directly after `app.use("/api/v1", agentsRouter);`.

- [ ] **Step 4: Run tests**

Run: `npx tsc --noEmit -p . && npx jest tests/securityGuards.test.ts`
Expected: PASS (all tests, including the 3 new ones). `loadLinkedAgentForUser` joins `users.agent_id`; the test seeds `users.agent_id = AGENT_ID` for the owner, so `hasAgent` is true.

- [ ] **Step 5: Commit (local only)**

```bash
git add src/routes/meAccess.ts src/index.ts tests/securityGuards.test.ts
git commit -m "feat: GET /api/v1/me/access for guest showcase mode"
```

---

### Task 2: Demo data and the demo adapter in `lib/api.ts`

**Files:**
- Create: `lib/demo/time.ts`, `lib/demo/agent.ts`, `lib/demo/portfolio.ts`, `lib/demo/activity.ts`, `lib/demo/routes.ts`
- Modify: `lib/api.ts` (top-level demo flag; `apiFetch`; raw-fetch writers `updateAutopilot`, `runPipeline`, `downloadTradeReportsCsv`)
- Test: `tests/unit/demoAdapter.test.ts`

**Interfaces:**
- Produces:
  - `export type DemoMode = "off" | "guest" | "no-agent"` and `setDemoMode(mode: DemoMode)`, `getDemoMode(): DemoMode`, `isDemoMode(): boolean` (true unless `off`) from `lib/api.ts`.
  - `export class DemoWriteBlockedError extends Error` from `lib/api.ts`.
  - `export function assertNotDemoWrite(): void` — throws `DemoWriteBlockedError` in `guest` mode, no-op otherwise.
  - `export const DEMO_AGENT: MyAgent` from `lib/demo/agent.ts`.
  - `export function resolveDemoGet(path: string, mode: Exclude<DemoMode, "off">): unknown | undefined` from `lib/demo/routes.ts` (path may include a query string; `undefined` = not a demo route, go live).
  - Window event `"quantik:sign-in-required"` dispatched when a guest write is refused.

- [ ] **Step 1: Write the failing tests** `tests/unit/demoAdapter.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, assertNotDemoWrite, DemoWriteBlockedError, setDemoMode } from "@/lib/api";
import { DEMO_AGENT } from "@/lib/demo/agent";
import { resolveDemoGet } from "@/lib/demo/routes";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ markets: [], total: 0, hasMore: false })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setDemoMode("off");
  vi.unstubAllGlobals();
});

describe("guest demo mode", () => {
  beforeEach(() => setDemoMode("guest"));

  it("serves the demo agent without touching the network", async () => {
    const agent = await api.getMyAgent();
    expect(agent?.name).toBe("NOVA-7");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves personal reads from fixtures", async () => {
    const positions = await api.getPositions();
    const trades = await api.getTrades();
    const reports = await api.getTradeReports({ period: "all" });
    expect(positions.length).toBeGreaterThan(0);
    expect(trades.length).toBeGreaterThan(0);
    expect(reports.count).toBe(reports.trades.length);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps public data live", async () => {
    await api.getMarkets();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses writes locally", async () => {
    await expect(api.executeTrade("btc", "YES", 10)).rejects.toBeInstanceOf(DemoWriteBlockedError);
    await expect(api.updateAutopilot(DEMO_AGENT.id, true)).rejects.toBeInstanceOf(DemoWriteBlockedError);
    expect(() => assertNotDemoWrite()).toThrow(DemoWriteBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("filters demo trade reports by outcome", () => {
    const wins = resolveDemoGet("/api/performance/trades?period=all&outcome=WIN", "guest") as { trades: { outcome: string }[] };
    expect(wins.trades.every((t) => t.outcome === "WIN")).toBe(true);
  });
});

describe("no-agent demo mode", () => {
  beforeEach(() => setDemoMode("no-agent"));

  it("still shows the demo agent", async () => {
    expect((await api.getMyAgent())?.name).toBe("NOVA-7");
  });

  it("lets a signed-in member's writes reach the server", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await api.addWatchlistItem("btc-150k");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(() => assertNotDemoWrite()).not.toThrow();
  });

  it("serves the member's real watchlist, not a demo one", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    await api.getWatchlist();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

(Adjust the `executeTrade`/`addWatchlistItem`/`getTradeReports` argument lists to the real signatures in `lib/api.ts` before running; the assertions stay the same.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/demoAdapter.test.ts`
Expected: FAIL (`setDemoMode` is not exported).

- [ ] **Step 3: Implement the fixtures**

`lib/demo/time.ts`:
```ts
/** Timestamps relative to "now" so demo charts and "x ago" labels stay fresh. */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const ago = (ms: number) => Date.now() - ms;
```

`lib/demo/agent.ts`: export `DEMO_AGENT_ID = "demo-nova-7"`, `DEMO_WALLET = "0x7a3D4bC1e9F2a8b6C5d0E4f3A2b1C9d8E7f6A5b4"`, `DEMO_AUTOPILOT_POLICY` (copy `DEFAULT_AUTOPILOT_POLICY` from `tests/e2e/fixtures.ts`, adding the six `overrides` keys `minSigma, minKelly, kellyMultiplier, maxPositionFraction, dailyLossLimitPct, useAuraSentiment` as `null` so it satisfies `AutopilotPolicyEnvelope`), and a getter-built `DEMO_AGENT: MyAgent` copied from `STANDARD_AGENT` with: `id: DEMO_AGENT_ID`, `agent_code: "Q-DEMO-NOVA7"`, `status: "active"`, `name: "NOVA-7"`, `avatar_emoji: "🦊"`, `personality: "calculated"`, `wallet_address: DEMO_WALLET`, `autopilot_enabled: true`, `autopilot_policy: DEMO_AUTOPILOT_POLICY`, `polymarket_ready: true`, `polymarket_status: "ready"`, `erc8004_token_id: null`, `connection_status: "connected"`, timestamps from `ago(...)` (created 21 days, deployed 20 days, updated 2 hours). Export a function `demoAgent(): MyAgent` returning a fresh object so timestamps are computed per read, and `DEMO_AGENT = demoAgent()` for tests.

`lib/demo/portfolio.ts`: export functions that build raw server-shaped payloads (the `api.*` normalizers run on them unchanged):
- `demoSummary()` → the `tests/fixtures/performance-summary.json` shape (totalValue 10480, cashBalance 5610, positionsValue 4870, pnl 480, pnlPct 4.8, pnlToday 62, winRate 0.64, totalTrades 47, kellyUtilization 0.31, circuitBreakerStatus "ARMED", balanceStatus "live", fundingStatus "ready", metrics {currentStreak 3, bestTrade "fed-cut-december", bestPnl 96, totalVolume 13240}, plus an equity series of 14 daily points ending now if the fixture has one).
- `demoPositions()` → 3 `Position` objects: `will-btc-close-above-150k-in-2026` YES 120 @0.45 now 0.52; `fed-cut-december` YES 80 @0.38 now 0.41; `eth-etf-staking-approval` NO 60 @0.55 now 0.49; each with `executionId`, `question`, `source` ("autopilot" twice, "manual" once), `executedAt: ago(n * DAY)`, `pnl`/`pnlPct` computed from prices, `resolutionDate` in the future.
- `demoTrades()` → 9 `Trade` objects over the last 14 days (6 WIN, 2 LOSS, 1 OPEN) with `timestamp: ago(...)`, `source`, `pnl`, `mode: "paper"`.
- `demoTradeReports(query: URLSearchParams)` → a full `TradeReportsResponse` built from `demoTrades()`: filter by `period` (day 1 day, week 7, month 30, all), `outcome`, `source`, case-insensitive `search` on slug; `summary.winRate` as a fraction; `buckets` = one per day in range with summed pnl and count and `label` = `new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })`; `bestTrade`/`worstTrade` by pnl; `agentAttribution` = the seven agents AURA…SIGMA with weights summing to 1.
- `demoTradesCsv(query)` → CSV text with header `timestamp,market,direction,source,size,price,outcome,pnl` for the filtered trades.
- `demoExecutionLog()` → `{ log: [...] }` of 6 entries `{ slug, side: "buy", amount, executed_at: ago(...), status: "paper", pnl }`.

`lib/demo/activity.ts`:
- `demoAutopilotStatus()` → copy the inline object from `tests/e2e/fixtures.ts` `mockManageAgentApis` with `agentId: DEMO_AGENT_ID`, `autopilotEnabled: true`, wallet `{ address: DEMO_WALLET, onChainUsdc: 5610, clobBalance: 5610, pol: 12.5, fundingStatus: "ready", fundingMessage: null, missingItems: [] }`, `scheduler.paperMode: true`, `activity.tradesToday: 2`, `blocker: null`-equivalent allowed value (use the `AutopilotBlocker` union member meaning "none"; if the union has no "none", use `"cadence"`), timestamps via `ago`.
- `demoAutopilotDecisions(limit)` → `{ decisions }`, 6 entries alternating executed/skipped over demo slugs with `signal_snapshot { question, sigmaConfidence, kellyFraction }` and `policy_snapshot: DEMO_AUTOPILOT_POLICY`.
- `demoAgentExecutions(query)` → `{ executions }` from `demoTrades()` mapped to `AgentExecutionLogItem`, honouring `limit` and `source`.
- `demoNotifications()` → `{ notifications, unread: 2 }` with 4 `NotificationItem`s (trade executed, LUCIFER risk flag, autopilot resumed, weekly report), ids prefixed `demo-`.
- `demoWatchlist()` → `{ items }` with 2 `WatchlistItem`s (`user_id: "demo"`), `demoMarketAlerts()` → `{ items }` with 1 `MarketAlertItem`.

- [ ] **Step 4: Implement the route table** `lib/demo/routes.ts`

```ts
import { demoAgent, DEMO_AUTOPILOT_POLICY } from "./agent";
import { demoExecutionLog, demoPositions, demoSummary, demoTradeReports, demoTrades } from "./portfolio";
import {
  demoAgentExecutions, demoAutopilotDecisions, demoAutopilotStatus,
  demoMarketAlerts, demoNotifications, demoWatchlist,
} from "./activity";

type Handler = (query: URLSearchParams) => unknown;

// Personal reads answered with demo data. "agent" routes are about the agent
// being displayed; "user" routes belong to a signed-in member even without an
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
```

- [ ] **Step 5: Wire the adapter into `lib/api.ts`**

Next to `_authToken` (line 11):
```ts
// ─── Demo mode ────────────────────────────────────────────────────────────────
// Set by ViewerProvider. "guest": personal reads come from lib/demo and every
// write is refused locally. "no-agent": a signed-in member without an agent sees
// the demo agent, but their own writes (watchlist, agent creation) go through.
export type DemoMode = "off" | "guest" | "no-agent";
let _demoMode: DemoMode = "off";
export function setDemoMode(mode: DemoMode) {
  _demoMode = mode;
}
export function getDemoMode(): DemoMode {
  return _demoMode;
}
export function isDemoMode(): boolean {
  return _demoMode !== "off";
}

export class DemoWriteBlockedError extends Error {
  constructor() {
    super("Sign in to do this");
    this.name = "DemoWriteBlockedError";
  }
}

/** Backstop for raw fetch() writes: guests never reach the server. */
export function assertNotDemoWrite(): void {
  if (_demoMode !== "guest") return;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("quantik:sign-in-required"));
  throw new DemoWriteBlockedError();
}
```

At the top of `apiFetch` (line ~994), before building headers:
```ts
  if (_demoMode !== "off") {
    const method = (options?.method ?? "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") {
      const demo = resolveDemoGet(path, _demoMode);
      if (demo !== undefined) return demo as T;
    } else {
      assertNotDemoWrite();
    }
  }
```
with `import { resolveDemoGet } from "@/lib/demo/routes";` at the top of the file.

In `updateAutopilot` (line ~1844) and at the start of `runPipeline` (line ~2461) add `assertNotDemoWrite();` as the first statement (for `runPipeline`, wrap it: `try { assertNotDemoWrite(); } catch (err) { onError?.(err as Error); return () => {}; }` matching its existing callback/abort return shape). In `downloadTradeReportsCsv` (line ~1462), before the fetch:
```ts
    if (isDemoMode() && getDemoMode() === "guest") {
      return new Blob([demoTradesCsv(new URLSearchParams(query))], { type: "text/csv" });
    }
```
importing `demoTradesCsv` from `@/lib/demo/portfolio`.

- [ ] **Step 6: Run tests and type-check**

Run: `npx vitest run tests/unit/demoAdapter.test.ts && npx tsc --noEmit -p .`
Expected: PASS; no type errors.

- [ ] **Step 7: Commit (local only)**

```bash
git add lib/demo lib/api.ts tests/unit/demoAdapter.test.ts
git commit -m "feat: demo data and demo adapter for guest showcase mode"
```

---

### Task 3: Viewer state, sign-in gate and routing

**Files:**
- Create: `lib/viewer.ts` (pure logic), `context/ViewerContext.tsx`, `hooks/useSignInGate.ts`
- Modify: `components/Providers.tsx`, `store/useQuantikStore.ts` (add `resetUserState`), `store/useNotificationsStore.ts` (add `reset`), `app/[locale]/(dashboard)/layout.tsx` (delete `AuthSync`, keep `WalletSync`), `middleware.ts`, `lib/api.ts` (add `getAccess`)
- Test: `tests/unit/viewer.test.ts`

**Interfaces:**
- Consumes: Task 1 endpoint; Task 2 `setDemoMode`, `setAuthToken`, `demoAgent`.
- Produces:
  - `export type ViewerMode = "loading" | "guest" | "member-no-agent" | "member"` (lib/viewer.ts)
  - `export interface ViewerState { mode: ViewerMode; isSignedIn: boolean; hasAgent: boolean; isOperator: boolean; isDemo: boolean; canAct: boolean }`
  - `export function resolveViewerMode(input: { clerkLoaded: boolean; signedIn: boolean; access: { hasAgent: boolean; isOperator: boolean } | null }): ViewerState`
  - `export function demoModeFor(mode: ViewerMode): DemoMode` (`guest`→"guest", `member-no-agent`→"no-agent", others→"off")
  - `export function shouldResetOnTransition(prev: ViewerMode, next: ViewerMode): boolean` (true when both are resolved and differ)
  - `export type GateNeeds = "agent" | "signIn"`; `export function decideGate(viewer: ViewerState, needs: GateNeeds): "run" | "sign-in" | "create-agent" | "wait"`
  - `useViewer(): ViewerState` (context/ViewerContext.tsx)
  - `useSignInGate(): (action: () => void | Promise<unknown>, opts?: { needs?: GateNeeds }) => void` — stable identity per viewer state.
  - `api.getAccess(): Promise<{ signedIn: boolean; hasAgent: boolean; isOperator: boolean }>` (raw fetch with the current token; never uses the demo adapter; returns all-false on any error).
  - `useQuantikStore.getState().resetUserState()` clears `myAgent`, `wallet`, `positions`, `recentTrades`, sets `myAgentLoading: false`.
  - `useNotificationsStore.getState().reset()` sets `items: [], unread: 0, hydrated: false`.

- [ ] **Step 1: Write the failing tests** `tests/unit/viewer.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { decideGate, demoModeFor, resolveViewerMode, shouldResetOnTransition } from "@/lib/viewer";

const member = { hasAgent: true, isOperator: false };
const noAgent = { hasAgent: false, isOperator: false };

describe("resolveViewerMode", () => {
  it("waits for Clerk", () => {
    expect(resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null }).mode).toBe("loading");
  });
  it("treats signed-out visitors as guests", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: false, access: null });
    expect(v).toMatchObject({ mode: "guest", isDemo: true, canAct: false, isOperator: false });
  });
  it("waits for access before deciding a signed-in member", () => {
    expect(resolveViewerMode({ clerkLoaded: true, signedIn: true, access: null }).mode).toBe("loading");
  });
  it("shows members without an agent the demo", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: noAgent });
    expect(v).toMatchObject({ mode: "member-no-agent", isDemo: true, canAct: false, isSignedIn: true, hasAgent: false });
  });
  it("gives members with an agent the real app", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: { ...member, isOperator: true } });
    expect(v).toMatchObject({ mode: "member", isDemo: false, canAct: true, isOperator: true });
  });
});

describe("demoModeFor", () => {
  it("maps viewer modes to adapter modes", () => {
    expect(demoModeFor("guest")).toBe("guest");
    expect(demoModeFor("member-no-agent")).toBe("no-agent");
    expect(demoModeFor("member")).toBe("off");
    expect(demoModeFor("loading")).toBe("off");
  });
});

describe("shouldResetOnTransition", () => {
  it("resets when a guest signs in or a member signs out", () => {
    expect(shouldResetOnTransition("guest", "member")).toBe(true);
    expect(shouldResetOnTransition("member", "guest")).toBe(true);
    expect(shouldResetOnTransition("member-no-agent", "member")).toBe(true);
  });
  it("ignores the first resolution and repeats", () => {
    expect(shouldResetOnTransition("loading", "guest")).toBe(false);
    expect(shouldResetOnTransition("guest", "guest")).toBe(false);
  });
});

describe("decideGate", () => {
  const guest = resolveViewerMode({ clerkLoaded: true, signedIn: false, access: null });
  const noAgentMember = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: noAgent });
  const fullMember = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: member });
  it("asks guests to sign in", () => {
    expect(decideGate(guest, "agent")).toBe("sign-in");
    expect(decideGate(guest, "signIn")).toBe("sign-in");
  });
  it("sends members without an agent to the factory only for agent actions", () => {
    expect(decideGate(noAgentMember, "agent")).toBe("create-agent");
    expect(decideGate(noAgentMember, "signIn")).toBe("run");
  });
  it("runs for members with an agent", () => {
    expect(decideGate(fullMember, "agent")).toBe("run");
  });
  it("does nothing while loading", () => {
    expect(decideGate(resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null }), "agent")).toBe("wait");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/viewer.test.ts`
Expected: FAIL (module `@/lib/viewer` not found).

- [ ] **Step 3: Implement `lib/viewer.ts`**

```ts
import type { DemoMode } from "@/lib/api";

export type ViewerMode = "loading" | "guest" | "member-no-agent" | "member";
export type GateNeeds = "agent" | "signIn";

export interface ViewerState {
  mode: ViewerMode;
  isSignedIn: boolean;
  /** A real agent of their own (never the demo agent). */
  hasAgent: boolean;
  isOperator: boolean;
  /** Personal pages show demo agent NOVA-7. */
  isDemo: boolean;
  /** May run real actions without being asked to sign in or build an agent. */
  canAct: boolean;
}

export function resolveViewerMode(input: {
  clerkLoaded: boolean;
  signedIn: boolean;
  access: { hasAgent: boolean; isOperator: boolean } | null;
}): ViewerState {
  const base = { isSignedIn: input.signedIn, hasAgent: false, isOperator: false };
  if (!input.clerkLoaded) return { ...base, isSignedIn: false, mode: "loading", isDemo: false, canAct: false };
  if (!input.signedIn) return { ...base, mode: "guest", isDemo: true, canAct: false };
  if (!input.access) return { ...base, mode: "loading", isDemo: false, canAct: false };
  const { hasAgent, isOperator } = input.access;
  return hasAgent
    ? { isSignedIn: true, hasAgent, isOperator, mode: "member", isDemo: false, canAct: true }
    : { isSignedIn: true, hasAgent, isOperator, mode: "member-no-agent", isDemo: true, canAct: false };
}

export function demoModeFor(mode: ViewerMode): DemoMode {
  if (mode === "guest") return "guest";
  if (mode === "member-no-agent") return "no-agent";
  return "off";
}

export function shouldResetOnTransition(prev: ViewerMode, next: ViewerMode): boolean {
  return prev !== "loading" && next !== "loading" && prev !== next;
}

export function decideGate(viewer: ViewerState, needs: GateNeeds): "run" | "sign-in" | "create-agent" | "wait" {
  if (viewer.mode === "loading") return "wait";
  if (!viewer.isSignedIn) return "sign-in";
  if (needs === "agent" && !viewer.hasAgent) return "create-agent";
  return "run";
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/viewer.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `api.getAccess`, store resets**

`lib/api.ts`, inside `api`:
```ts
  /** Who is looking. Raw fetch: must never be answered by the demo adapter. */
  getAccess: async (): Promise<{ signedIn: boolean; hasAgent: boolean; isOperator: boolean }> => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/me/access`, {
        headers: _authToken ? { Authorization: `Bearer ${_authToken}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { signedIn: boolean; hasAgent: boolean; isOperator: boolean };
    } catch {
      return { signedIn: false, hasAgent: false, isOperator: false };
    }
  },
```

`store/useQuantikStore.ts`: add `resetUserState: () => void;` to the interface and
```ts
  resetUserState: () => set({ myAgent: null, myAgentLoading: false, wallet: null, positions: [], recentTrades: [] }),
```

`store/useNotificationsStore.ts`: add `reset: () => void;` and `reset: () => set({ items: [], unread: 0, hydrated: false }),`.

- [ ] **Step 6: Implement `context/ViewerContext.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAuthToken, setDemoMode } from "@/lib/api";
import { demoAgent } from "@/lib/demo/agent";
import { demoModeFor, resolveViewerMode, shouldResetOnTransition, type ViewerState } from "@/lib/viewer";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";

const LOADING = resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null });
const ViewerContext = createContext<ViewerState>(LOADING);

export function useViewer(): ViewerState {
  return useContext(ViewerContext);
}

// One place decides who is looking, keeps the API token fresh, switches the
// API client between demo and real data, and wipes cached data on every switch.
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<{ hasAgent: boolean; isOperator: boolean } | null>(null);
  const [viewer, setViewer] = useState<ViewerState>(LOADING);
  const prevMode = useRef(LOADING.mode);

  // Token + access, re-run whenever the signed-in user changes
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    setAccess(null);
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }
    const refresh = async (initial: boolean) => {
      const token = await getToken().catch(() => null);
      if (!active) return;
      if (token) setAuthToken(token);
      if (initial) {
        const a = await api.getAccess();
        if (active) setAccess({ hasAgent: a.hasAgent, isOperator: a.isOperator });
      }
    };
    void refresh(true);
    const iv = setInterval(() => void refresh(false), 50_000); // Clerk JWTs last 60s
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [isLoaded, isSignedIn, userId, getToken]);

  // Agent Factory and BYO call this after a deploy so the app flips to "member"
  useEffect(() => {
    const onAgentChanged = () => {
      if (isSignedIn) void api.getAccess().then((a) => setAccess({ hasAgent: a.hasAgent, isOperator: a.isOperator }));
    };
    window.addEventListener("quantik:agent-changed", onAgentChanged);
    return () => window.removeEventListener("quantik:agent-changed", onAgentChanged);
  }, [isSignedIn]);

  // Resolve the mode, then apply it before anyone renders personal data
  useEffect(() => {
    const next = resolveViewerMode({ clerkLoaded: isLoaded, signedIn: !!isSignedIn, access });
    if (next.mode === "loading") return;
    const store = useQuantikStore.getState();
    if (shouldResetOnTransition(prevMode.current, next.mode)) {
      queryClient.clear();
      store.resetUserState();
      useNotificationsStore.getState().reset();
    }
    setDemoMode(demoModeFor(next.mode));
    if (next.isDemo) {
      store.setMyAgent(demoAgent() as MyAgent);
      store.setMyAgentLoading(false);
    } else if (next.mode === "member") {
      store.setMyAgentLoading(true);
      api.getMyAgent()
        .then((agent) => store.setMyAgent((agent as unknown as MyAgent) ?? null))
        .finally(() => store.setMyAgentLoading(false));
    }
    store.setAuthReady(true);
    prevMode.current = next.mode;
    setViewer(next);
  }, [isLoaded, isSignedIn, access, queryClient]);

  // Writes refused by the demo adapter ask the guest to sign in
  useEffect(() => {
    const onRequired = () => {
      if (!isSignedIn) clerk.openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
    };
    window.addEventListener("quantik:sign-in-required", onRequired);
    return () => window.removeEventListener("quantik:sign-in-required", onRequired);
  }, [clerk, isSignedIn]);

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}
```

Note: `store.setAuthReady(true)` now happens only after the demo flag is set, which is what keeps the first personal queries off the live API (`enabled: authReady` everywhere).

- [ ] **Step 7: Implement `hooks/useSignInGate.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { useViewer } from "@/context/ViewerContext";
import { decideGate, type GateNeeds } from "@/lib/viewer";

/**
 * Wraps a real action. Guests get the Clerk sign-in popup (and come back to
 * this page); members without an agent go to Agent Factory for agent actions.
 * The action never runs automatically after sign-in.
 */
export function useSignInGate() {
  const viewer = useViewer();
  const clerk = useClerk();
  const router = useRouter();

  return useCallback(
    (action: () => void | Promise<unknown>, opts?: { needs?: GateNeeds }) => {
      switch (decideGate(viewer, opts?.needs ?? "agent")) {
        case "run":
          void action();
          return;
        case "sign-in":
          clerk.openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
          return;
        case "create-agent":
          router.push("/agent-factory");
          return;
        case "wait":
          return;
      }
    },
    [viewer, clerk, router],
  );
}
```

- [ ] **Step 8: Wire it in and remove the old sync**

`components/Providers.tsx`: import `ViewerProvider` and wrap inside `QueryClientProvider`, outside `SocketProvider`:
```tsx
      <QueryClientProvider client={queryClient}>
        <ViewerProvider>
          <SocketProvider>
            ...
          </SocketProvider>
        </ViewerProvider>
      </QueryClientProvider>
```

`app/[locale]/(dashboard)/layout.tsx`: delete the whole `AuthSync` function (lines 23-90) and its `<AuthSync />` element; remove now-unused imports (`useAuth`, `setAuthToken`, `usePathname`/`useRouter` only if unused elsewhere in the file). `WalletSync` stays.

`middleware.ts`: remove `isPublicRoute` and the `auth.protect()` block so the handler is `clerkMiddleware(async (_auth, request: NextRequest) => intlMiddleware(request), ...)`; drop the `createRouteMatcher` import. Keep the `jwtKey` option and `config.matcher` unchanged.

- [ ] **Step 9: Type-check, lint, unit tests**

Run: `npx tsc --noEmit -p . && npx eslint context hooks lib/viewer.ts middleware.ts "app/[locale]/(dashboard)/layout.tsx" components/Providers.tsx && npx vitest run`
Expected: no errors; all unit tests pass.

- [ ] **Step 10: Commit (local only)**

```bash
git add lib/viewer.ts context/ViewerContext.tsx hooks/useSignInGate.ts components/Providers.tsx store middleware.ts "app/[locale]/(dashboard)/layout.tsx" lib/api.ts tests/unit/viewer.test.ts
git commit -m "feat: viewer state, sign-in gate and public routing for guest mode"
```

---

### Task 4: New copy in four languages

**Files:**
- Modify: `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/de.json`

**Interfaces:**
- Produces these keys (identical structure in all four files):
  - `nav.signIn`
  - `sidebar.guest`, `sidebar.signIn`, `sidebar.demoAgent`
  - `landing.exploreApp`
  - `demo.badge`, `demo.guestTitle`, `demo.guestBody`, `demo.noAgentTitle`, `demo.noAgentBody`, `demo.signIn`, `demo.createAgent`
  - `agentFactory.launch.signInToMint`, `agentFactory.launch.signInToMintDesc`
  - `settings.tradingModeTitle`, `settings.tradingModePaper`, `settings.tradingModeLive`, `settings.tradingModeHint`

- [ ] **Step 1: Add the English copy**

```json
"nav": { "signIn": "Sign in" },
"sidebar": { "guest": "Guest", "signIn": "Sign in to save your agent", "demoAgent": "Demo agent" },
"landing": { "exploreApp": "Explore the app" },
"demo": {
  "badge": "DEMO",
  "guestTitle": "You're exploring NOVA-7, a demo agent.",
  "guestBody": "Everything here is sample data. Sign in to build your own agent and trade with it.",
  "noAgentTitle": "You're looking at NOVA-7, a demo agent.",
  "noAgentBody": "Build your own agent in a few minutes and this dashboard becomes yours.",
  "signIn": "Sign in",
  "createAgent": "Create your agent"
},
"agentFactory": { "launch": { "signInToMint": "Sign in to mint your agent's wallet", "signInToMintDesc": "Your answers are saved. Sign in and your agent gets its own wallet, ready to deploy." } },
"settings": { "tradingModeTitle": "Trading mode", "tradingModePaper": "Paper trading", "tradingModeLive": "Live trading", "tradingModeHint": "Set by the Quantik team for the whole platform." }
```
(Merge each block into the existing namespace; do not replace existing keys.)

- [ ] **Step 2: Add Spanish, French and German** with the same keys:
  - es: "Iniciar sesión" / "Invitado" / "Inicia sesión para guardar tu agente" / "Agente demo" / "Explorar la app" / "DEMO" / "Estás explorando NOVA-7, un agente demo." / "Todo lo que ves son datos de ejemplo. Inicia sesión para crear tu propio agente y operar con él." / "Estás viendo NOVA-7, un agente demo." / "Crea tu propio agente en unos minutos y este panel será tuyo." / "Iniciar sesión" / "Crea tu agente" / "Inicia sesión para crear la billetera de tu agente" / "Tus respuestas se guardan. Inicia sesión y tu agente tendrá su propia billetera, lista para desplegar." / "Modo de trading" / "Trading simulado" / "Trading real" / "Lo define el equipo de Quantik para toda la plataforma."
  - fr: "Se connecter" / "Invité" / "Connectez-vous pour enregistrer votre agent" / "Agent de démo" / "Explorer l'application" / "DÉMO" / "Vous explorez NOVA-7, un agent de démonstration." / "Tout ce que vous voyez est un exemple. Connectez-vous pour créer votre propre agent et trader avec lui." / "Vous regardez NOVA-7, un agent de démonstration." / "Créez votre agent en quelques minutes et ce tableau de bord devient le vôtre." / "Se connecter" / "Créer votre agent" / "Connectez-vous pour créer le portefeuille de votre agent" / "Vos réponses sont enregistrées. Connectez-vous et votre agent obtient son propre portefeuille, prêt à être déployé." / "Mode de trading" / "Trading simulé" / "Trading réel" / "Défini par l'équipe Quantik pour toute la plateforme."
  - de: "Anmelden" / "Gast" / "Melde dich an, um deinen Agenten zu speichern" / "Demo-Agent" / "App erkunden" / "DEMO" / "Du erkundest NOVA-7, einen Demo-Agenten." / "Alles hier sind Beispieldaten. Melde dich an, um deinen eigenen Agenten zu bauen und mit ihm zu traden." / "Du siehst NOVA-7, einen Demo-Agenten." / "Bau in wenigen Minuten deinen eigenen Agenten und dieses Dashboard gehört dir." / "Anmelden" / "Agent erstellen" / "Melde dich an, um die Wallet deines Agenten zu erstellen" / "Deine Antworten sind gespeichert. Melde dich an und dein Agent bekommt seine eigene Wallet, bereit zum Deployen." / "Trading-Modus" / "Paper-Trading" / "Echtes Trading" / "Vom Quantik-Team für die ganze Plattform festgelegt."

- [ ] **Step 3: Verify structure parity and types**

Run:
```bash
node -e "const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>v&&typeof v==='object'&&!Array.isArray(v)?k(v,p+x+'.'):[p+x]);const en=new Set(k(require('./messages/en.json')));for(const l of ['es','fr','de']){const s=new Set(k(require('./messages/'+l+'.json')));const miss=[...en].filter(x=>!s.has(x));console.log(l,'missing',miss.length,miss.slice(0,5))}"
npx tsc --noEmit -p .
```
Expected: `missing 0` for es, fr, de; no type errors.

- [ ] **Step 4: Commit (local only)** `git add messages && git commit -m "feat: copy for guest showcase mode in four languages"`

---

### Task 5: Shell: sidebar, tab bar, demo banner, landing, operator-only panic

**Files:**
- Create: `components/demo/DemoBanner.tsx`
- Modify: `app/[locale]/(dashboard)/layout.tsx`, `components/BottomTabBar.tsx`, `components/onboarding/WelcomeModal.tsx`, `app/[locale]/(marketing)/page.tsx`, `components/landing/HeroSection.tsx`, `components/landing/FinalCTA.tsx`

**Interfaces:**
- Consumes: `useViewer()`, `useSignInGate()`, Task 4 keys.

- [ ] **Step 1: `components/demo/DemoBanner.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useViewer } from "@/context/ViewerContext";
import { useSignInGate } from "@/hooks/useSignInGate";

const PERSONAL_ROUTES = ["/dashboard", "/manage-agent", "/reports", "/settings"];

// Slim notice above personal pages while they show demo agent NOVA-7
export function DemoBanner() {
  const t = useTranslations("demo");
  const viewer = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const gate = useSignInGate();

  if (!viewer.isDemo || !PERSONAL_ROUTES.some((r) => pathname.startsWith(r))) return null;
  const guest = viewer.mode === "guest";

  return (
    <div
      role="status"
      className="demo-banner"
      style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        margin: "12px 20px 0", padding: "10px 14px", borderRadius: 12,
        background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.25)",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 100, background: "rgba(10,132,255,0.18)", color: "#5ac8fa", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
        {t("badge")}
      </span>
      <span style={{ flex: "1 1 240px", fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
        <strong style={{ color: "#fff", fontWeight: 600 }}>{guest ? t("guestTitle") : t("noAgentTitle")}</strong>{" "}
        {guest ? t("guestBody") : t("noAgentBody")}
      </span>
      <button
        type="button"
        onClick={() => (guest ? gate(() => {}, { needs: "signIn" }) : router.push("/agent-factory"))}
        className="demo-banner__cta"
        style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 100, background: "#fff", color: "#050508", border: "none", cursor: "pointer" }}
      >
        {guest ? t("signIn") : t("createAgent")}
      </button>
    </div>
  );
}
```

Add to `app/globals.css`: `.demo-banner__cta { transition: transform 120ms cubic-bezier(0.34,1.56,0.64,1), opacity 120ms ease; } .demo-banner__cta:hover { opacity: 0.9; } .demo-banner__cta:active { transform: scale(0.96); } .demo-banner { animation: demo-banner-in 350ms cubic-bezier(0.16,1,0.3,1) both; } @keyframes demo-banner-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } } @media (prefers-reduced-motion: reduce) { .demo-banner { animation: none; } }`.

- [ ] **Step 2: Dashboard layout**

In `app/[locale]/(dashboard)/layout.tsx`:
- Render `<DemoBanner />` as the first child of the content column div (`md:ml-[220px] ...`), before `<main>`.
- Sidebar nav: delete `isDisabled`/`isLoading` and the non-`Link` branch; remove the opacity/cursor/pointerEvents style entries; every item renders as `Link`.
- Factory badge and glow: `const { hasAgent } = useViewer();` then `{hasAgent ? "1/1" : "0/1"}` and `className={!hasAgent && item.isFactory ? "onboarding-glow" : undefined}` (colours keyed on `hasAgent` too).
- Profile block: when `!viewer.isSignedIn`, replace the whole profile row content with a button that calls `gate(() => {}, { needs: "signIn" })`, showing a neutral avatar circle, `tSidebar("guest")` as the name and `tSidebar("signIn")` as the subline (no green Online dot). Signed-in users keep `UserButton` exactly as today.
- Panic: `{viewer.isOperator && <GlobalPanicButton />}`.
- Keep `WelcomeModal`; in `components/onboarding/WelcomeModal.tsx` change the visibility rule to `const visible = viewer.mode === "member-no-agent" && !hasSeenOnboarding;` (import `useViewer`), and make Skip only close the modal (set the flag without `router.push`); Get Started keeps navigating to `/agent-factory`.

- [ ] **Step 3: Bottom tab bar** (`components/BottomTabBar.tsx`): delete `isDisabled` and the disabled `div` branch; drive the factory badge and glow from `useViewer().hasAgent`.

- [ ] **Step 4: Landing**

`app/[locale]/(marketing)/page.tsx`: keep the redirect effect for signed-in visitors; change the blank-screen guard to `if (isLoaded && isSignedIn) return <div style={{ background: "#000", minHeight: "100vh" }} />;` so guests see the landing immediately.

`components/landing/HeroSection.tsx`: nav button → `<SignInButton mode="modal" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard"><PillButton variant="dark">{tNav("signIn")}</PillButton></SignInButton>`; hero CTA → `<PillButton variant="light" onClick={() => router.push("/dashboard")}>{t("exploreApp")}</PillButton>` with `const router = useRouter();` from `@/i18n/navigation`.

`components/landing/FinalCTA.tsx`: same "Explore the app" button; remove the unused `SignInButton` import.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p . && npx eslint "app/[locale]/(dashboard)/layout.tsx" components/BottomTabBar.tsx components/demo components/onboarding components/landing "app/[locale]/(marketing)/page.tsx"`
Expected: no errors. Then in the browser (dev server, signed out): `/en` shows the landing immediately with "Explore the app"; clicking it opens `/en/dashboard` with the DEMO banner and all sidebar items clickable; no panic button.

- [ ] **Step 6: Commit (local only)** `git add -A components app/globals.css "app/[locale]" && git commit -m "feat: guest-ready app shell, demo banner and landing calls to action"`

---

### Task 6: Dashboard and My Agent

**Files:**
- Modify: `components/dashboard/DashboardPageClient.tsx`, `components/dashboard/DashboardPilotDeck.tsx`, `app/[locale]/(dashboard)/manage-agent/page.tsx`, `components/ManageAgent/AgentIdentityHeader.tsx`, `components/ManageAgent/DeleteAgentModal.tsx`, `components/ManageAgent/PositionDetailSheet.tsx`, `components/ManageAgent/PolymarketStatusCard.tsx`, `components/ManageAgent/ERC8004StatusCard.tsx`, `components/ManageAgent/AutopilotControlCard.tsx`, `components/ManageAgent/ApiKeyPanel.tsx`, `components/ManageAgent/ConnectionStatusPanel.tsx`, `components/ManageAgent/WebhookConfigPanel.tsx`, `components/NotificationCenter.tsx`

**Interfaces:**
- Consumes: `useSignInGate()` → `gate(action, { needs })`; `useViewer()` → `{ isDemo, canAct, isOperator }`; `isDemoMode()` from `lib/api.ts`.

Pattern for every action below (declare the hook ABOVE any early `return null` in the component):
```tsx
import { useSignInGate } from "@/hooks/useSignInGate";
const gate = useSignInGate();
// before: onClick={handler}
onClick={() => gate(() => handler())}
```

- [ ] **Step 1: Gate the actions**
  - `DashboardPageClient.tsx` ~1425: `onScan={() => gate(() => void scanMutation.mutateAsync())}` (covers Scan now and Force scan).
  - `DashboardPilotDeck.tsx` ~157: `onChange={(enabled) => gate(() => void handleAutopilotToggle(enabled))}`.
  - `AgentIdentityHeader.tsx` ~273: `onClick={() => gate(() => setDeleteModalOpen(true))}`.
  - `DeleteAgentModal.tsx` ~243: `onClick={() => gate(() => void handleDelete())}`.
  - `PositionDetailSheet.tsx` ~156: move the inline body into `const handleClosePosition = async () => { ... }` and use `onClick={() => gate(() => void handleClosePosition())}`.
  - `PolymarketStatusCard.tsx`: ~758 `gate(() => void handleAssignWallet())`, ~803 `gate(() => setShowWalletAssign(true))`, ~824 `gate(() => void handleVerify())`, ~861 `gate(() => void triggerApprovals())`.
  - `ERC8004StatusCard.tsx` ~574: `onClick={() => gate(() => void handleRegister())}`; inside `handleRegister` add `assertNotDemoWrite();` before the raw fetch.
  - `AutopilotControlCard.tsx` ~548: `onChange={(enabled) => gate(() => handleToggle(enabled))}`.
  - BYO panels: `ApiKeyPanel.tsx` ~82 `gate(() => void handleRotate())`; `ConnectionStatusPanel.tsx` ~124 `gate(() => void handleTest())`; `WebhookConfigPanel.tsx` ~170 `gate(() => void handleSave())` and ~182 `gate(() => void handleTest())`.

- [ ] **Step 2: Operator-only and quiet automatic effects**
  - `AutopilotControlCard.tsx` ~865: `{viewer.isOperator && <TelegramWebhookEditor />}`.
  - `manage-agent/page.tsx` ~336: `{viewer.isOperator && <RiskConfigPanelByo agentId={storeAgent.id} />}`.
  - `manage-agent/page.tsx` ~70 (safety-net `getMyAgent`): add `if (viewer.isDemo) return;` first (ViewerProvider already placed NOVA-7 in the store).
  - `PolymarketStatusCard.tsx` ~381 auto-approvals effect: first line `if (!viewer.canAct) return;`.
  - `NotificationCenter.tsx` ~152 and ~206: keep the local store update; send the server call only when `!isDemoMode()`: `if (!isDemoMode()) void api.markAllNotificationsRead().catch(() => {});` (same for `markNotificationRead(item.id)`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p . && npx eslint components/dashboard components/ManageAgent components/NotificationCenter.tsx "app/[locale]/(dashboard)/manage-agent"`
Expected: no errors. Browser (signed out): `/en/dashboard` and `/en/manage-agent` render NOVA-7 with positions, trades and autopilot; toggles, delete, close position and register each open the Clerk popup; notifications open and mark read with no network request; no Telegram editor.

- [ ] **Step 4: Commit (local only)** `git commit -am "feat: gate dashboard and agent actions for guests"`

---

### Task 7: Markets, market detail, analysis, pipeline, trades and chat

**Files:**
- Modify: `app/[locale]/(dashboard)/market/[slug]/page.tsx`, `app/[locale]/(dashboard)/markets/page.tsx`, `app/[locale]/(dashboard)/market-analysis/page.tsx`, `components/MarketHeader.tsx`, `components/markets/MarketAlertEditor.tsx`, `components/AgentPipeline/SigmaDecision.tsx`, `components/AgentPipeline/index.tsx`, `components/TradeConfirmationModal.tsx`, `components/RelayChat.tsx`, `components/RelayChatSidebar.tsx`

**Interfaces:**
- Consumes: `useSignInGate()`, `useViewer()`, `assertNotDemoWrite()`.

Pattern (hook above any early return):
```tsx
const gate = useSignInGate();
onClick={() => gate(() => handler())}                      // needs an agent (default)
onClick={() => gate(() => handler(), { needs: "signIn" })}  // any signed-in user
```

- [ ] **Step 1: Gate the actions**
  - `market/[slug]/page.tsx` ~294 Run pipeline: `onClick={() => gate(handleRunPipeline)}`. Leave history/replay (~194, ~255) and Stop ungated.
  - `market/[slug]/page.tsx` ~47 autorun effect: set `autorunFired.current = true;` first, then `if (!viewer.canAct) return;`, then `handleRunPipeline();`.
  - `market-analysis/page.tsx` ~759: `onClick={() => gate(() => selectMarket(m))}`.
  - `markets/page.tsx` ~306 watchlist star: `onToggleWatchlist={() => gate(async () => { ...existing body... }, { needs: "signIn" })}`; ~314 alert: `onEditAlert={() => gate(() => setAlertMarket(market), { needs: "signIn" })}`.
  - `MarketHeader.tsx` ~108 watchlist and ~131 alert opener: same two patterns with `{ needs: "signIn" }`.
  - `MarketAlertEditor.tsx` ~141 save: `onClick={() => gate(async () => { ...existing body... }, { needs: "signIn" })}`.
  - `SigmaDecision.tsx` ~267: `onClick={() => { if (!canExecute || !edge) return; gate(() => openTradeModal({ ...existing payload })); }}`.
  - `TradeConfirmationModal.tsx` ~690: `onClick={() => gate(() => void handleConfirm())}`.
  - `RelayChatSidebar.tsx` ~965: rename `sendMessageWithText` to `sendMessageWithTextRaw`; add
    ```tsx
    const gate = useSignInGate();
    const sendMessageWithText = useCallback((rawText: string) => {
      if (!rawText.trim()) return;
      gate(() => void sendMessageWithTextRaw(rawText));
    }, [gate, sendMessageWithTextRaw]);
    ```
    and `onConfirm={() => gate(() => void handleTradeConfirm(message.tradeConfirmation))}` at ~1292. Add `assertNotDemoWrite();` as the first line inside `sendMessageWithTextRaw` and `handleTradeConfirm`.
  - `RelayChat.tsx`: `handleKeyDown` → `gate(() => sendMessage())`, `handleSuggestionClick` → `gate(() => sendMessage(q))`, Send button → `onClick={() => gate(() => sendMessage())}`; hook above `if (!pipelineDone) return null;`.

- [ ] **Step 2: Quiet automatic calls**
  - `RelayChat.tsx` ~231 auto-summary effect: first line `if (!viewer.canAct) return;`.
  - `AgentPipeline/index.tsx` ~1036: `if (!sigmaData || insightFiredRef.current || pipeline.source !== "live" || !viewer.canAct) return;`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p . && npx eslint components app`
Expected: no errors. Browser (signed out): `/en/markets` loads live markets; the star and alarm open the popup; `/en/market/<slug>?autorun=1` makes no POST (check the Network tab / Playwright request log) and shows no popup; Run pipeline opens the popup; a replay from "Previous runs" plays; Execute Trade opens the popup; the chat panel opens but Send opens the popup.

- [ ] **Step 4: Commit (local only)** `git commit -am "feat: gate trading, analysis and chat for guests"`

---

### Task 8: Agent Factory, BYO, Settings and Reports

**Files:**
- Modify: `app/[locale]/(dashboard)/agent-factory/page.tsx`, `app/[locale]/(dashboard)/agent-factory/byo/page.tsx`, `app/[locale]/(dashboard)/settings/page.tsx`, `components/reports/TradeReportsView.tsx`

**Interfaces:**
- Consumes: `useSignInGate()`, `useViewer()`, window event `"quantik:agent-changed"` (Task 3), Task 4 keys `agentFactory.launch.signInToMint*`, `settings.tradingMode*`.

- [ ] **Step 1: Agent Factory**
  - `isLocked` (~1496): `const isLocked = viewer.hasAgent && !!myAgent && !myAgentLoading;`.
  - Wallet effect (~1389): `if (step !== 5 || walletAddress || !viewer.isSignedIn) return;` and add `viewer.isSignedIn` to its dependency list (safe: generating a wallet stores nothing).
  - `StepLaunch` (~861): add props `needsSignIn: boolean; onSignIn: () => void`. When `needsSignIn`, show a neutral status dot and `t("launch.signInToMint")`, and replace the error panel (~1116-1172) with a button `onClick={onSignIn}` labelled `t("launch.signInToMint")` above `t("launch.signInToMintDesc")`. Call site (~2070): `needsSignIn={!viewer.isSignedIn}` and `onSignIn={() => gate(() => {}, { needs: "signIn" })}`.
  - Deploy (~2078): `onDeploy={() => gate(handleDeploy, { needs: "signIn" })}`; after a successful `createAgent` in `handleDeploy`, dispatch `window.dispatchEvent(new CustomEvent("quantik:agent-changed"))`.
  - Delete confirm (~1770): `onClick={() => gate(handleDelete)}`; after a successful delete dispatch `"quantik:agent-changed"`.
  - Draft persistence (~1290): save `{ step, config }` to `sessionStorage` key `"quantik:factory-draft"` on change (try/catch), restore on mount, remove after a successful deploy.
- [ ] **Step 2: BYO** (`byo/page.tsx`)
  - Existing-agent effect (~960): first line `if (!viewer.isSignedIn || !viewer.hasAgent) return;`.
  - `onGenerate` (~1313) and `onRegenerate` (~1328): `() => gate(handleGenerate, { needs: "signIn" })`.
  - After a successful BYO activate/deploy, dispatch `"quantik:agent-changed"`.
- [ ] **Step 3: Settings** (`settings/page.tsx` ~1415-1418)
  - Wrap `PaperModePanel`, `RiskConfigPanel`, `TelegramSettingsPanel` in `{viewer.isOperator && (...)}`.
  - For non-operators render a small read-only card before App Info: title `t("tradingModeTitle")`, value `paperMode ? t("tradingModePaper") : t("tradingModeLive")` (from `usePaperMode()`), hint `t("tradingModeHint")`, styled like the existing settings cards.
  - Tutorial restart (~1465): `disabled={!viewer.hasAgent || restarted}`.
- [ ] **Step 4: Reports** (`TradeReportsView.tsx` ~182): `onClick={() => gate(async () => { const blob = await api.downloadTradeReportsCsv({ period, outcome, source, search }); saveBlob(blob, "quantik-trades.csv"); }, { needs: "signIn" })}` — guests get the popup; members without an agent download their (empty) real export; the demo CSV path in `lib/api.ts` is the backstop.
- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p . && npx eslint app components`
Expected: no errors. Browser (signed out): Agent Factory quiz works through step 4 with no requests; step 5 shows "Sign in to mint your agent's wallet"; Settings shows only Trading mode (read-only), App Info and Tutorial; Reports shows NOVA-7's trades and Export asks to sign in.

- [ ] **Step 6: Commit (local only)** `git commit -am "feat: guest-friendly agent factory, settings and reports"`

---

### Task 9: Verification and release

**Files:** none new (fixes go to the files above).

- [ ] **Step 1: Automated checks**

Run (frontend): `npx tsc --noEmit -p . && npx eslint . && npx vitest run`
Run (backend): `npx tsc --noEmit -p . && npx jest --testPathPatterns=tests/` (expect only the pre-existing `solanaTokens.test.ts` failures and the live-contract tests that need the deployed backend).

- [ ] **Step 2: Guest walkthrough (Playwright MCP, dev server with `NEXT_PUBLIC_API_URL=https://api.quantik.fun`)**

For each of `/en`, `/en/dashboard`, `/en/manage-agent`, `/en/reports`, `/en/settings`, `/en/markets`, `/en/market/<a trending slug>`, `/en/market-analysis`, `/en/agent-factory`, `/en/agent-factory/byo`, `/en/arena`, `/en/world`, `/en/architecture` at 1440×900 and 390×844:
- no console errors (`browser_console_messages` level error), no `MISSING_MESSAGE`;
- `document.documentElement.scrollWidth <= innerWidth`;
- `browser_network_requests`: no POST/PUT/PATCH/DELETE to `api.quantik.fun`, no 401 responses.
Click every action listed in Tasks 6-8 once and confirm the Clerk popup opens (or, for members without an agent, navigation to Agent Factory). Repeat the dashboard and landing checks in `/es`, `/fr`, `/de`.

- [ ] **Step 3: Independent review** — run a review workflow (missed action sites, regressions for signed-in members, mode-transition bugs) and fix confirmed findings.

- [ ] **Step 4: Release (only after Carlos says go)** — commit the landing redesign and guest mode, push backend first (Task 1 endpoint), wait for Railway, then push frontend; smoke-test https://quantik.fun signed out on desktop and phone.
