"use client";

import { type SigmaResult, type EdgeResult, fmtUSDC } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { usePaperMode } from "@/context/PaperModeContext";

interface SigmaDecisionProps {
  sigma: SigmaResult;
  edge?: EdgeResult;
  market: {
    slug: string;
    tokenId: string;
    question: string;
    yesPrice: number;
    noPrice: number;
  };
}

export function SigmaDecision({ sigma, edge, market }: SigmaDecisionProps) {
  const openTradeModal = useQuantikStore((s) => s.openTradeModal);
  const { paperMode } = usePaperMode();

  const glowClass =
    sigma.decision === "BET_YES"
      ? "glow-green"
      : sigma.decision === "BET_NO"
      ? "glow-red"
      : "glow-orange";

  const decisionColor =
    sigma.decision === "BET_YES"
      ? "var(--ios-green)"
      : sigma.decision === "BET_NO"
      ? "var(--ios-red)"
      : "var(--ios-orange)";

  const canExecute =
    edge &&
    (edge.ev_grade === "A" || edge.ev_grade === "B") &&
    sigma.decision !== "PASS";

  return (
    <div
      className={`glass-card-elevated ${glowClass}`}
      style={{ padding: 24, marginTop: 16 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🧩</span>
        <span className="text-headline" style={{ color: "var(--text-primary)", flex: 1 }}>
          SIGMA DECISION
        </span>

        {/* Confidence */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span className="text-caption" style={{ color: "var(--text-secondary)" }}>
            Confidence
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="confidence-bar" style={{ width: 100 }}>
              <div
                className="confidence-bar-fill"
                style={{
                  width: `${sigma.confidence}%`,
                  background: decisionColor,
                }}
              />
            </div>
            <span className="font-mono-data" style={{ fontSize: "var(--text-subhead)", fontWeight: 600, color: decisionColor }}>
              {sigma.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Decision + details */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          {/* Decision badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: decisionColor,
                display: "inline-block",
              }}
            />
            <span
              className="font-mono-data"
              style={{ fontSize: "var(--text-headline)", fontWeight: 700, color: decisionColor }}
            >
              {sigma.decision.replace("_", " ")}
            </span>
          </div>

          {/* Size rec */}
          <div style={{ marginBottom: 12 }}>
            <span className="font-mono-data text-subhead" style={{ color: "var(--text-secondary)" }}>
              Buy {sigma.size_pct ?? 0}% bankroll · {fmtUSDC(sigma.size_usd)} · Target {Math.round((sigma.entry_price ?? 0) * 100)}¢
            </span>
          </div>

          {/* Thesis */}
          <p className="text-body" style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            &ldquo;{sigma.thesis}&rdquo;
          </p>
        </div>

        {/* Execute button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <button
            disabled={!canExecute}
            onClick={() => {
              if (!canExecute || !edge) return;
              openTradeModal({
                slug: market.slug,
                tokenId: market.tokenId,
                sigma,
                edge,
                market: {
                  question: market.question,
                  yesPrice: market.yesPrice,
                  noPrice: market.noPrice,
                },
              });
            }}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              background: canExecute
                ? paperMode
                  ? "#FF9F0A"
                  : "var(--ios-blue)"
                : "rgba(255,255,255,0.08)",
              color: canExecute ? "#fff" : "var(--text-tertiary)",
              fontSize: "var(--text-subhead)",
              fontWeight: 600,
              cursor: canExecute ? "pointer" : "not-allowed",
              opacity: canExecute ? 1 : 0.5,
              transition: "all 200ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {paperMode ? "Simulate Trade →" : "Execute Trade →"}
          </button>
        </div>
      </div>
    </div>
  );
}
