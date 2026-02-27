# Project: frontend

## Tech Stack
Node.js, React 19.2.3, Next.js 16.1.6, TypeScript, Tailwind CSS

## File Structure
```
├── app/
│   ├── api/
│   │   └── relay/
│   │       └── route.ts
│   ├── emergency/
│   │   └── panic/
│   │       └── page.tsx
│   ├── market/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── market-analysis/
│   │   └── page.tsx
│   ├── markets/
│   │   └── page.tsx
│   ├── portfolio/
│   │   └── page.tsx
│   ├── reports/
│   │   └── liquidation/
│   │       └── [id]/
│   │           ...
│   ├── settings/
│   │   └── page.tsx
│   ├── trade-history/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentPipeline/
│   │   ├── AgentStep.tsx
│   │   ├── index.tsx
│   │   └── SigmaDecision.tsx
│   ├── ui/
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── table.tsx
│   ├── ActivePositions.tsx
│   ├── BottomTabBar.tsx
│   ├── GlobalPanicButton.tsx
│   ├── MarketHeader.tsx
│   ├── MarketScanner.tsx
│   ├── PipelineTimeline.tsx
│   ├── PortfolioOverview.tsx
│   ├── PriceChart.tsx
│   ├── Providers.tsx
│   ├── RecentSignals.tsx
│   ├── RelayChatSidebar.tsx
│   ├── SystemStatus.tsx
│   ├── ToastNotification.tsx
│   └── TradeConfirmationModal.tsx
├── context/
│   └── PaperModeContext.tsx
├── cypress/
│   ├── e2e/
│   │   ├── dashboard.cy.ts
│   │   ├── infinite-scroll.cy.ts
│   │   ├── market-scanner.cy.ts
│   │   ├── mobile.cy.ts
│   │   ├── navigation.cy.ts
│   │   ├── orchestrator.cy.ts
│   │   ├── settings.cy.ts
│   │   └── trading.cy.ts
│   ├── fixtures/
│   │   ├── market-single.json
│   │   ├── markets.json
│   │   ├── pipeline.txt
│   │   ├── portfolio.json
│   │   └── risk-config.json
│   └── screenshots/
│       ├── dashboard.cy.ts/
│       │   ├── Dashboard -- loads the dashboard, opens Relay, and sends a message (failed) (1).png
│       │   ├── Dashboard -- loads the dashboard, opens Relay, and sends a message (failed) (2).png
│       │   ├── Dashboard -- loads the dashboard, opens Relay, and sends a message (failed) (3).png
│       │   └── Dashboard -- loads the dashboard, opens Relay, and sends a message (failed).png
│       ├── infinite-scroll.cy.ts/
│       │   └── Infinite Scroll in MarketScanner -- triggers load-more when sentinel scrolled into view (failed).png
│       ├── mobile.cy.ts/
│       │   ├── Mobile Responsiveness -- opens Relay via BottomTabBar and sends a message (failed) (1).png
│       │   └── Mobile Responsiveness -- opens Relay via BottomTabBar and sends a message (failed).png
│       ├── navigation.cy.ts/
│       │   └── Navigation -- navigates through all main routes without crashing (failed).png
│       ├── risk-config.cy.ts/
│       │   ├── Risk Config -- loads risk config, modifies sliders, and saves (failed) (1).png
│       │   └── Risk Config -- loads risk config, modifies sliders, and saves (failed).png
│       ├── settings.cy.ts/
│       │   ├── Settings  Risk Config -- loads risk config, modifies sliders, and saves (failed) (1).png
│       │   ├── Settings  Risk Config -- loads risk config, modifies sliders, and saves (failed) (2).png
│       │   ├── Settings  Risk Config -- loads risk config, modifies sliders, and saves (failed) (3).png
│       │   └── Settings  Risk Config -- loads risk config, modifies sliders, and saves (failed).png
│       └── trading.cy.ts/
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (1).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (10).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (11).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (12).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (13).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (14).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (15).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (16).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (2).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (3).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (4).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (5).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (6).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (7).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (8).png
│           ├── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed) (9).png
│           └── Trading Flow -- toggles paper mode, visits a market, runs pipeline, and clicks trading buttons (failed).png
├── lib/
│   ├── api.ts
│   └── utils.ts
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── store/
│   └── useQuantikStore.ts
├── test-results/
├── tests/
│   ├── e2e/
│   │   ├── api.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── relay.spec.ts
│   └── unit/
│       ├── api.test.ts
│       └── formatters.test.ts
├── body.html
├── components.json
├── cypress.config.ts
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── page.html
├── playwright.config.ts
├── postcss.config.mjs
├── README.md
├── sentry.client.config.ts
├── sentry.edge.config.ts
├── sentry.server.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── update-mobile.js
├── vercel.json
└── vitest.config.ts
```

## Key Files
- package.json (1389 bytes)
- tsconfig.json (698 bytes)
- next.config.ts (396 bytes)
- app/ (13 files)
- lib/ (2 files)
- components/ (23 files)

## README (first 20 lines)
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

