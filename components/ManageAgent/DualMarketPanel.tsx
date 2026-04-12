"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuantikStore } from "@/store/useQuantikStore";

// ── Types ────────────────────────────────────────────────────────────────────

interface KrakenLeg {
  status: "executed" | "failed";
  pair: string;
  direction: "BUY" | "SELL";
  amount: number;
  asset: string;
  polarity: "bullish" | "bearish";
  confidence: number;
  assetClass: "crypto" | "forex" | "futures";
  paper: boolean;
  engine: "kraken";
}

// ── Fonts ────────────────────────────────────────────────────────────────────

const mono = '"SF Mono", "JetBrains Mono", monospace';

// ── CSS keyframes injected once ──────────────────────────────────────────────

const STYLE_ID = "kraken-dual-market-keyframes";
let _keyframesInjected = false;

function ensureKeyframes() {
  if (typeof document === "undefined" || _keyframesInjected) return;
  _keyframesInjected = true;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes kraken-pulse {
      0%, 100% { border-color: rgba(247,147,26,0.35); box-shadow: 0 0 0 0 rgba(247,147,26,0); }
      50% { border-color: rgba(191,90,242,0.55); box-shadow: 0 0 24px 4px rgba(191,90,242,0.10); }
    }
    @keyframes kraken-bar-fill {
      0% { width: 0%; }
      100% { width: var(--target-width); }
    }
    @keyframes kraken-status-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes kraken-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes kraken-empty-pulse {
      0%, 100% { opacity: 0.25; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(1.15); }
    }
    @keyframes kraken-live-glow {
      0%, 100% { box-shadow: 0 0 4px 1px rgba(48,209,88,0.3); }
      50% { box-shadow: 0 0 10px 3px rgba(48,209,88,0.5); }
    }
  `;
  document.head.appendChild(style);
}

// ── Animation variants ───────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

// ── Asset class config ───────────────────────────────────────────────────────

const ASSET_CLASS_CONFIG: Record<
  string,
  { bg: string; border: string; color: string; label: string }
> = {
  crypto: {
    bg: "rgba(247,147,26,0.12)",
    border: "1px solid rgba(247,147,26,0.25)",
    color: "#f7931a",
    label: "CRYPTO",
  },
  forex: {
    bg: "rgba(10,132,255,0.12)",
    border: "1px solid rgba(10,132,255,0.25)",
    color: "#0a84ff",
    label: "FOREX",
  },
  futures: {
    bg: "rgba(191,90,242,0.12)",
    border: "1px solid rgba(191,90,242,0.25)",
    color: "#bf5af2",
    label: "FUTURES",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(c: number): string {
  if (c >= 0.7) return "#30d158";
  if (c >= 0.4) return "#ff9f0a";
  return "#ff453a";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AssetClassBadge({ assetClass }: { assetClass: string }) {
  const cfg = ASSET_CLASS_CONFIG[assetClass] ?? ASSET_CLASS_CONFIG.crypto;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        borderRadius: 6,
        padding: "2px 8px",
        background: cfg.bg,
        border: cfg.border,
        color: cfg.color,
        fontFamily: mono,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: "BUY" | "SELL" }) {
  const isBuy = direction === "BUY";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 6,
        padding: "2px 8px",
        letterSpacing: "0.06em",
        fontFamily: mono,
        background: isBuy ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
        border: isBuy
          ? "1px solid rgba(48,209,88,0.30)"
          : "1px solid rgba(255,69,58,0.30)",
        color: isBuy ? "#30d158" : "#ff453a",
        flexShrink: 0,
      }}
    >
      {direction}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidenceColor(confidence);
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 60, gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            background: color,
            ["--target-width" as string]: `${pct}%`,
            width: `${pct}%`,
            animation: "kraken-bar-fill 300ms ease-out forwards",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.40)",
          fontFamily: mono,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function StatusIndicator({ status }: { status: "executed" | "failed" }) {
  const isSuccess = status === "executed";
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: isSuccess ? "#30d158" : "#ff453a",
        animation: isSuccess ? "kraken-status-pop 300ms ease-out" : "none",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {isSuccess ? "\u2713" : "\u2717"}
    </span>
  );
}

function LegRow({ leg }: { leg: KrakenLeg }) {
  return (
    <motion.div
      variants={fadeInUp}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "12px 16px",
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <AssetClassBadge assetClass={leg.assetClass} />

        <span
          style={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            minWidth: 90,
          }}
        >
          {leg.pair}
        </span>

        <DirectionBadge direction={leg.direction} />

        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: leg.polarity === "bullish" ? "#30d158" : "#ff453a",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {leg.polarity === "bullish" ? "\u25B2" : "\u25BC"}
        </span>

        <span
          style={{
            fontFamily: mono,
            fontSize: 12,
            color: "rgba(255,255,255,0.50)",
            flexShrink: 0,
          }}
        >
          {leg.amount.toFixed(4)}
        </span>

        <ConfidenceBar confidence={leg.confidence} />

        <StatusIndicator status={leg.status} />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 0",
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.25)",
          fontStyle: "italic",
          fontFamily: mono,
        }}
      >
        Waiting for dual-market execution...
      </span>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(247,147,26,0.4)",
          animation: "kraken-empty-pulse 2s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function SummaryRow({ legs }: { legs: KrakenLeg[] }) {
  const successCount = legs.filter((l) => l.status === "executed").length;
  const allSuccess = successCount === legs.length;
  const classes = [...new Set(legs.map((l) => l.assetClass))];

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          fontFamily: mono,
        }}
      >
        {legs.length} leg{legs.length !== 1 ? "s" : ""}
      </span>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          fontFamily: mono,
          color: allSuccess ? "#30d158" : "#ff9f0a",
        }}
      >
        {successCount}/{legs.length} executed
      </span>

      <div style={{ display: "flex", gap: 6 }}>
        {classes.map((cls) => {
          const cfg = ASSET_CLASS_CONFIG[cls] ?? ASSET_CLASS_CONFIG.crypto;
          return (
            <span
              key={cls}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.08em",
                borderRadius: 4,
                padding: "1px 6px",
                background: cfg.bg,
                border: cfg.border,
                color: cfg.color,
                fontFamily: mono,
              }}
            >
              {cfg.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DualMarketPanel() {
  const legs = useQuantikStore((s) => s.pipeline.krakenLegs) as KrakenLeg[];
  const pipelineSource = useQuantikStore((s) => s.pipeline.source);
  const pipelineVersion = useQuantikStore((s) => s.pipeline.version);
  const hasReceived = legs.length > 0;

  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Hide entirely when no pipeline has been run (source is still "idle")
  if (pipelineSource === "idle" && !hasReceived) return null;

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(20,22,30,0.98), rgba(14,16,24,0.96))",
        border: "1.5px solid rgba(247,147,26,0.25)",
        borderRadius: 20,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        padding: "24px 24px 28px",
        position: "relative",
        overflow: "hidden",
        animation: "kraken-pulse 2s ease-in-out infinite",
      }}
    >
      {/* Shimmer bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundImage:
            "linear-gradient(90deg, transparent, rgba(247,147,26,0.4), rgba(191,90,242,0.4), transparent)",
          backgroundSize: "200% 100%",
          animation: "kraken-shimmer 3s ease-in-out infinite",
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: mono,
            letterSpacing: "0.04em",
          }}
        >
          Dual-Market Execution
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasReceived && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(48,209,88,0.15)",
                border: "1px solid rgba(48,209,88,0.30)",
                borderRadius: 8,
                padding: "3px 10px",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#30d158",
                  animation: "kraken-live-glow 2s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#30d158",
                  letterSpacing: "0.08em",
                  fontFamily: mono,
                }}
              >
                LIVE
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(255,159,10,0.15)",
              border: "1px solid rgba(255,159,10,0.30)",
              borderRadius: 8,
              padding: "3px 10px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#ff9f0a",
                letterSpacing: "0.08em",
                fontFamily: mono,
              }}
            >
              PAPER
            </span>
          </div>
        </div>
      </div>

      {/* Market question — removed, slug not available from store */}

      {/* Legs list */}
      {hasReceived ? (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={pipelineVersion}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit="hidden"
              style={{ marginTop: 16 }}
            >
              {legs.map((leg, i) => (
                <LegRow key={`${leg.pair}-${leg.direction}-${i}`} leg={leg} />
              ))}
            </motion.div>
          </AnimatePresence>

          {legs.length > 0 && <SummaryRow legs={legs} />}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
