"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Changelog data (derived from git history) ────────────────────────────────

interface VersionEntry {
  version: string;
  date: string;
  highlight: string;
  features: string[];
  fixes: string[];
}

const CHANGELOG: VersionEntry[] = [
  {
    version: "v0.6.0",
    date: "2026-03-06",
    highlight: "Market page & agent pipeline overhaul with animated visualizations and real order book data.",
    features: [
      "🎨 Full /market/[slug] redesign — chart + live order book two-column layout",
      "🤖 Animated agent cards: Aura semicircle gauge, Flux spread bar, Oracle dual-ring, Confidence bar all animate on mount",
      "⭕ Oracle probability ring — dual concentric rings showing model vs market-implied with edge delta in center",
      "💬 Synthesized Insight via Relay LLM — plain-English one-sentence summary streamed in real time",
      "📖 Real order book data from backend — live bids/asks with depth bars, 10s auto-refresh",
      "⏱️ Pipeline timeline shows real per-agent latency from store",
      "💰 Alpha Signal bankroll reads from live on-chain USDC wallet balance",
    ],
    fixes: [
      "🐛 Cent sign ¢ was rendering as literal \\u00A2 in SigmaDecision — fixed",
      "📌 HelpTooltip clipping on right side of screen — now uses createPortal to document.body with viewport clamping",
      "🔢 Pipeline timeline bars were all 1s — was hardcoded fallback, now uses real latencyMs from store",
      "📦 iconoir-react package was missing — replaced with inline SVG in HelpTooltip",
      "🗑️ Removed /market-analysis page and its sidebar nav entry",
      "📈 Main price chart no longer re-animates on every pipeline run",
    ],
  },
  {
    version: "v0.5.0",
    date: "2026-02-20",
    highlight: "Dashboard real data binding, performance metrics, and tooltip system.",
    features: [
      "📊 Dashboard fully wired to real API — PnL, USDC, POL balances, total value",
      "🏆 Win rate ring visualization in performance panel",
      "📈 Enriched performance metrics — Brier scores, attribution, drift status",
      "🔔 Telegram webhook editor in autopilot settings",
      "❓ HelpTooltip component system across all dashboard section headers",
      "🛡️ Risk Limits panel with live circuit breaker status and Kelly utilization",
    ],
    fixes: [
      "🔧 WalletBalance interface updated with onChainUsdc and pol fields",
      "👁️ Active Positions panel was hidden due to empty state logic — fixed",
      "🔄 normalizeAgentData now maps backend field names to frontend types",
      "♻️ Risk status duplicated on dashboard — removed duplicate panel",
      "🛠️ CI build failures fixed for PerformancePanel and HelpTooltip imports",
      "💡 Scanner feed handles object response from /api/pipeline/results",
    ],
  },
  {
    version: "v0.4.0",
    date: "2026-02-05",
    highlight: "Relay AI chat with SSE streaming, autopilot dashboard, and changelog panel.",
    features: [
      "🤝 Relay SSE streaming — word-by-word token delivery, ~250ms TTFT",
      "💬 Suggested question pills shown after every Relay response",
      "⌨️ Relay typing indicator with animated dot pulse",
      "⚡ Autopilot dashboard — scanner feed, execution log, live P&L ticker, status bar",
      "📋 This changelog panel — version history accessible from sidebar",
      "📱 Relay chat sidebar with glassmorphism drawer overlay",
    ],
    fixes: [
      "🤖 Relay model name corrected to Gemini 2.5 Flash, badge updated",
      "📱 Mobile keyboard layout broke Relay input — viewport-fit cover fix applied",
      "🧭 Suggested questions were disappearing — now always visible after response",
      "🔄 Relay suggested questions now rotate stably without index drift",
    ],
  },
  {
    version: "v0.3.0",
    date: "2026-01-22",
    highlight: "Full pipeline engine, live agent cards, trade execution, and risk management.",
    features: [
      "🚀 Market page rebuilt from scratch — live SSE pipeline log, Terminal-style design",
      "💸 Execute Trade wired to /api/execution/order with trade confirmation modal",
      "⚠️ Risk panel — circuit breaker status, live exposure, Kelly utilization limits",
      "📊 Performance panel — Brier scores, attribution breakdown, drift status",
      "🔄 Live SSE pipeline feed with per-agent card updates and status transitions",
      "🧪 Full Cypress E2E test suite for pipeline, signals, and trade flow",
    ],
    fixes: [
      "🛠️ PipelineLog rewritten — no more stale closures, reliable event queue drainer",
      "📡 SSE event parsing fixed — agent cards now update correctly on pipeline run",
      "📈 Price chart uses clobTokenIds[0] as tokenId — was using wrong field",
      "🔒 CircuitBreaker API response normalized — handles object and string shapes",
      "💥 toFixed crash on pipeline run — Number() coercion added to all numeric fields",
    ],
  },
  {
    version: "v0.2.0",
    date: "2026-01-10",
    highlight: "Signals, orchestrator, trending markets, and CI/CD pipeline.",
    features: [
      "📡 Recent Signals panel wired to /api/signals with live updates",
      "🎛️ Orchestrator panel — candidate market queue, scan status, autopilot toggle",
      "🔥 Trending markets pill + Polymarket live feed integration",
      "🚀 GitHub Actions CI/CD with automatic Vercel deploy on push to main",
      "🌟 Market analysis page with glassmorphism card redesign",
      "♾️ Infinite scroll on markets browser with pagination sentinel",
    ],
    fixes: [
      "🐛 toFixed crash prevented — Number() coercion on spread/sentiment/ev fields",
      "⟳ Infinite scroll sentinel wasn't triggering on short viewports — fixed",
      "🧪 All Cypress E2E specs now pass including crash guard scenarios",
      "📊 Circuit breaker badge border-radius and scanner column layout fixes",
    ],
  },
  {
    version: "v0.1.0",
    date: "2025-12-20",
    highlight: "Initial release — Quantik Mission Control trading terminal.",
    features: [
      "🏠 Dashboard with live wallet balance, positions, and P&L",
      "📊 Markets browser with search, filters, and liquidity grades",
      "💼 Portfolio view with open positions and trade history",
      "🔮 Market pipeline — 7-agent AI analysis (Aura, Flux, Oracle, Edge, Clause, Lucifer, Sigma)",
      "🎨 Glassmorphism dark UI with iOS-inspired design tokens and color system",
      "📱 Responsive layout with sidebar nav and mobile bottom tab bar",
      "⚠️ Emergency panic button — close all positions with one click",
      "📄 Paper mode — simulate trades without real execution",
    ],
    fixes: [],
  },
];

// ─── VersionLog Panel ─────────────────────────────────────────────────────────

function VersionLogPanel({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  // Trigger slide-in after mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Transparent click-away overlay (no dim) */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 38 }}
      />

      {/* Second sidebar — same size/style as nav sidebar, slides in from left */}
      <div
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 220,
          width: 260,
          zIndex: 39,
          display: "flex",
          flexDirection: "column",
          background: "rgba(5,5,10,0.96)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
          transform: visible ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 240ms cubic-bezier(0.32,0.72,0,1)",
          overflowY: "auto",
        }}
      >
        {/* Header — mirrors sidebar header style */}
        <div
          style={{
            padding: "24px 16px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span
              style={{
                fontFamily: '"SF Mono","JetBrains Mono",monospace',
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.10em",
              }}
            >
              CHANGELOG
            </span>
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 100,
                background: "rgba(10,132,255,0.12)",
                border: "1px solid rgba(10,132,255,0.22)",
                fontSize: 10,
                fontFamily: "monospace",
                color: "#0a84ff",
              }}
            >
              {CHANGELOG.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 7,
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 12,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Version list */}
        <div style={{ flex: 1, padding: "6px 0 24px" }}>
          {CHANGELOG.map((v, i) => (
            <div
              key={v.version}
              style={{
                padding: "14px 16px",
                borderBottom: i < CHANGELOG.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              {/* Version + date row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "2px 9px",
                    borderRadius: 100,
                    background: i === 0 ? "rgba(10,132,255,0.18)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${i === 0 ? "rgba(10,132,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                    fontFamily: '"SF Mono","JetBrains Mono",monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: i === 0 ? "#0a84ff" : "rgba(255,255,255,0.55)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {v.version}
                </span>
                {i === 0 && (
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 100,
                      background: "rgba(48,209,88,0.12)",
                      border: "1px solid rgba(48,209,88,0.22)",
                      fontSize: 9,
                      fontFamily: "monospace",
                      color: "#30d158",
                      letterSpacing: "0.06em",
                    }}
                  >
                    LATEST
                  </span>
                )}
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.20)", marginLeft: "auto" }}>
                  {v.date}
                </span>
              </div>

              {/* Highlight */}
              <p style={{ margin: "0 0 10px", fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
                {v.highlight}
              </p>

              {/* New Features */}
              {v.features.length > 0 && (
                <div style={{ marginBottom: v.fixes.length > 0 ? 10 : 0 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      color: "rgba(48,209,88,0.65)",
                      textTransform: "uppercase",
                      marginBottom: 5,
                      fontFamily: "monospace",
                    }}
                  >
                    New Features
                  </div>
                  {v.features.map((f, fi) => (
                    <div
                      key={fi}
                      style={{
                        marginBottom: 4,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.45,
                      }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Bug Fixes */}
              {v.fixes.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      color: "rgba(255,159,10,0.65)",
                      textTransform: "uppercase",
                      marginBottom: 5,
                      fontFamily: "monospace",
                    }}
                  >
                    Bug Fixes
                  </div>
                  {v.fixes.map((fix, fi) => (
                    <div
                      key={fi}
                      style={{
                        marginBottom: 4,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.45,
                      }}
                    >
                      {fix}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── VersionLogButton ─────────────────────────────────────────────────────────

export function VersionLogButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        title="View changelog"
        aria-label="Open changelog"
        style={{
          background: open ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(10,132,255,0.3)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 7,
          cursor: "pointer",
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: open ? "#0a84ff" : "rgba(255,255,255,0.35)",
          transition: "all 160ms ease",
          flexShrink: 0,
        }}
      >
        📋
      </button>

      {mounted && open && createPortal(
        <VersionLogPanel onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

export default VersionLogPanel;
