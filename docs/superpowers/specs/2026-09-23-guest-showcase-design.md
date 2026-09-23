# Guest showcase mode

Date: 2026-09-23 · Owner: Carlos · Status: awaiting approval

## Goal

Anyone can walk through the whole Quantik app without an account. Sign-in (the Clerk popup) appears only when a visitor tries something real: building an agent, trading, running an analysis, chatting with an agent, or saving anything.

## What visitors experience

| Visitor | Personal pages (Dashboard, My Agent, Trade History, Settings) | Public pages (Markets, Market detail, Arena, World, Architecture, BYO docs, agent profiles) | Real actions |
|---|---|---|---|
| Guest (signed out) | Demo agent **NOVA-7** with a sample portfolio, trades and P&L, labelled **DEMO** | Real live data | Clerk sign-in popup, then back to the same page |
| Signed in, no agent yet | Same demo, labelled DEMO | Real live data | Agent Factory prompt ("Create your agent first") |
| Signed in with an agent | Their own data (unchanged) | Real live data | Work as today |

- A slim banner on personal pages says the visitor is exploring a demo, with one button: **Sign in** (guests) or **Create your agent** (no agent yet).
- Nothing runs automatically after sign-in. A guest who clicks "Trade" signs in, returns to the same page and clicks again.
- Landing: primary button **Explore the app** opens the dashboard as a guest; the nav button becomes **Sign in**. The landing no longer waits for Clerk before showing anything.
- Sidebar and bottom tab bar: every item is clickable for everyone. The profile area shows **Sign in** for guests.
- Operator-only controls (paper/live mode, Kraken keys, Telegram, risk limits, panic button) are hidden for everyone except the operator.

## How it works

1. **Routing.** `middleware.ts` stops forcing sign-in on pages. Every page renders for guests; the server already enforces sign-in and ownership on every real action.
2. **Viewer state.** One hook, `useViewer()`, answers: guest, member without an agent, member with an agent, operator. Operator status comes from a small new API endpoint (`GET /api/v1/me/access`).
3. **Sign-in gate.** `useSignInGate()` wraps every real action. Signed in with an agent: the action runs. Guest: opens `clerk.openSignIn()` and returns the visitor to the current URL. Signed in without an agent: sends them to Agent Factory.
4. **Demo data.** In demo mode, `lib/api.ts` answers the personal read requests (my agent, wallet, positions, trades, performance, notifications, watchlist, agent sub-resources) from `lib/demo/` fixtures, built from the existing test fixtures. Public data still comes from the live API. Demo mode never sends a write to the server; any write that slips past a gate is refused locally and opens the sign-in popup.
5. **Mode switches.** Signing in or creating an agent clears cached queries so demo data never mixes with real data.
6. **Copy.** All new text in English, Spanish, French and German.

## Out of scope

- Per-user paper mode, per-user panic button and per-agent risk limits (today they are platform-wide and operator-only).
- Changes to the Agent Factory flow itself beyond gating its final "deploy" step.

## Testing

- Playwright walk-through as a guest: every page renders with no console errors and no sideways scrolling at 390px and 1440px; every real action opens the sign-in popup.
- Signed-in regression: pages that called the API before still do (demo adapter off).
- The server lockdown tests stay green.
