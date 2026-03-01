"use client";

import { type SigmaResult, type EdgeResult, fmtUSDC } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { usePaperMode } from "@/context/PaperModeContext";

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function humanizeThesis(sigma: SigmaResult, edge?: EdgeResult): string {
  const confidence = typeof sigma.confidence === "number" ? sigma.confidence : 0;
  const decision = sigma.decision ?? (sigma as any).recommendation ?? "WATCH";
  const sizeUsd = typeof sigma.size_usd === "number" ? sigma.size_usd : 0;
  const evGrade = edge?.ev_grade ?? "C";

  if (decision === "SKIP" || decision === "VETO") {
    return "Clause flagged this one — resolution criteria are ambiguous enough to cause disputes. Sitting this out.";
  }
  if (decision === "BET_YES" || decision === "TRADE") {
    const strength = confidence > 65 ? "Strong" : confidence > 50 ? "Decent" : "Marginal";
    return `${strength} edge on YES at ${confidence.toFixed(0)}% confidence${sizeUsd > 0 ? `, sizing $${sizeUsd.toFixed(0)}` : ""}. ${evGrade === "A" ? "Kelly agrees." : evGrade === "B" ? "Kelly is cautiously in." : "Kelly is holding back."}`;
  }
  if (decision === "BET_NO") {
    return `Market overpriced — NO side has edge at ${confidence.toFixed(0)}% confidence${sizeUsd > 0 ? `, $${sizeUsd.toFixed(0)} on NO` : ""}. ${evGrade === "A" ? "Kelly agrees." : "Kelly is cautious."}`;
  }
  if (decision === "PASS" || decision === "WATCH") {
    return "No meaningful edge at current prices. Watching until something shifts.";
  }
  const raw = sigma.thesis ?? "";
  if (raw) return raw;
  return "Waiting for cleaner data before taking a position.";
}

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

  const effectiveDecision = sigma.decision ?? (sigma as any).recommendation ?? "WATCH";
  const isExecute = effectiveDecision === "BET_YES" || effectiveDecision === "BET_NO" || effectiveDecision === "TRADE";
  const isSkip = effectiveDecision === "SKIP" || effectiveDecision === "VETO";
  const isPass = !isExecute && !isSkip;

  const glowClass = isExecute ? "glow-green" : isSkip ? "glow-red" : "glow-orange";

  const decisionColor = isExecute
    ? "var(--ios-green)"
    : isSkip
    ? "var(--ios-red)"
    : "var(--ios-orange)";

  const decisionLabel = isSkip
    ? "SKIP"
    : isExecute
    ? `EXECUTE ${effectiveDecision === "BET_NO" ? "NO" : "YES"}`
    : "HOLD";

  const canExecute = Boolean(
    edge &&
    (edge.ev_grade === "A" || edge.ev_grade === "B") &&
    isExecute
  );

  return (
    <div
      className={`glass-card-elevated ${glowClass}`}
      style={{ padding: 24, marginTop: 16 }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span
          className="font-mono-data"
          style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.06em" }}
        >
          SIGMA DECISION
        </span>

        {/* Decision badge */}
        <span
          className="font-mono-data"
          style={{
            fontSize: 16,
            fontWeight: 700,
            padding: "6px 16px",
            borderRadius: 10,
            color: decisionColor,
            background: `color-mix(in srgb, ${decisionColor} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${decisionColor} 30%, transparent)`,
            letterSpacing: "0.05em",
          }}
        >
          {decisionLabel}
        </span>
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Confidence
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="confidence-bar" style={{ width: 80 }}>
              <div className="confidence-bar-fill" style={{ width: `${num(sigma.confidence)}%`, background: decisionColor }} />
            </div>
            <span className="font-mono-data" style={{ fontSize: 14, fontWeight: 700, color: decisionColor }}>
              {num(sigma.confidence)}%
            </span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Size
          </span>
          <span className="font-mono-data" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {fmtUSDC(num(sigma.size_usd))}
          </span>
        </div>

        <div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            EV
          </span>
          <span className="font-mono-data" style={{ fontSize: 14, fontWeight: 600, color: decisionColor }}>
            {edge ? `${num(edge.net_ev) > 0 ? "+" : ""}${num(edge.net_ev).toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Thesis */}
      <p className="text-body" style={{ color: "var(--text-secondary)", margin: "0 0 20px 0", lineHeight: 1.6 }}>
        {humanizeThesis(sigma, edge)}
      </p>

      {/* Full-width execute button */}
      <button
        data-testid="execute-trade-btn"
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
        className="glass-card-interactive"
        style={{
          width: "100%",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "none",
          borderRadius: 12,
          background: canExecute
            ? paperMode
              ? "var(--ios-orange)"
              : "var(--ios-blue)"
            : "rgba(255,255,255,0.08)",
          color: canExecute ? "#fff" : "var(--text-tertiary)",
          fontSize: 15,
          fontWeight: 600,
          cursor: canExecute ? "pointer" : "not-allowed",
          opacity: canExecute ? 1 : 0.5,
          transition: "all 200ms ease",
          fontFamily: "inherit",
        }}
      >
        <span>{"\u25B6"}</span>
        <span>{paperMode ? "Simulate Trade" : "Execute Trade"}</span>
      </button>
    </div>
  );
}
