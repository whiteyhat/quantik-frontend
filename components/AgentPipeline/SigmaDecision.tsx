"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { type SigmaResult, type EdgeResult, fmtUSDC } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { usePaperMode } from "@/context/PaperModeContext";

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

interface SigmaDecisionProps {
  sigma: SigmaResult;
  edge?: EdgeResult;
  market: {
    slug: string;
    tokenId: string;
    yesTokenId?: string;
    noTokenId?: string;
    question: string;
    yesPrice: number;
    noPrice: number;
  };
}

export function SigmaDecision({ sigma, edge, market }: SigmaDecisionProps) {
  const t = useTranslations("agentPipeline");
  const openTradeModal = useQuantikStore((s) => s.openTradeModal);
  const wallet = useQuantikStore((s) => s.wallet);
  const { paperMode } = usePaperMode();

  // Wallet funding checks (skip in paper mode)
  const usdcBalance = wallet?.onChainUsdc ?? wallet?.usdc ?? 0;
  const polBalance = wallet?.pol ?? 0;
  const hasUsdc = paperMode || usdcBalance > 0;
  const hasGas = paperMode || polBalance > 0.01;
  const walletFunded = hasUsdc && hasGas;

  const effectiveDecision =
    sigma.decision ?? (sigma as any).recommendation ?? "WATCH";
  const isExecute =
    effectiveDecision === "BET_YES" ||
    effectiveDecision === "BET_NO" ||
    effectiveDecision === "TRADE";
  const isSkip =
    effectiveDecision === "SKIP" || effectiveDecision === "VETO";

  const decisionSide =
    effectiveDecision === "BET_NO" ? "NO" : "YES";
  const decisionLabel = isSkip
    ? "SKIP"
    : isExecute
    ? `BET ${decisionSide}`
    : "HOLD";

  const decisionColor = isExecute
    ? decisionSide === "YES"
      ? "var(--ios-green)"
      : "var(--ios-red)"
    : isSkip
    ? "var(--ios-red)"
    : "var(--ios-orange)";

  const confidence = num(sigma.confidence);
  const [animatedConfidence, setAnimatedConfidence] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimatedConfidence(confidence), 80);
    return () => clearTimeout(t);
  }, [confidence]);
  const sizeUsd = num(sigma.size_usd);
  const ev = num(edge?.net_ev);
  const entryPrice = isExecute
    ? decisionSide === "YES"
      ? market.yesPrice
      : market.noPrice
    : market.yesPrice;
  const estReturn = sizeUsd * (ev / 100);

  const highConviction = Boolean(
    edge && (edge.ev_grade === "A" || edge.ev_grade === "B")
  );
  const signalReady = Boolean(edge && isExecute);
  const canExecute = signalReady && walletFunded;

  return (
    <div
      className="glass-card-elevated"
      style={{
        padding: "18px 20px",
        marginTop: 4,
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        borderTop: `2px solid color-mix(in srgb, ${decisionColor} 20%, transparent)`,
      }}
    >
      {/* Decision badge */}
      <div
        style={{
          background: `color-mix(in srgb, ${decisionColor} 15%, transparent)`,
          border: `1px solid color-mix(in srgb, ${decisionColor} 30%, transparent)`,
          borderRadius: 10,
          padding: "8px 14px",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginBottom: 3,
          }}
        >
          {t("sigma.decision")}
        </div>
        <div
          className="font-mono-data"
          style={{ fontSize: 15, fontWeight: 800, color: decisionColor }}
        >
          {decisionLabel}
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
            {t("sigma.confidenceLevel")}
          </span>
          <span
            className="font-mono-data"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}
          >
            {confidence.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${animatedConfidence}%`,
              borderRadius: 3,
              background: `linear-gradient(90deg, var(--ios-blue) 0%, #00C6FF 100%)`,
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>

      {/* Entry / Size / Est. Return */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            {t("sigma.entry")}
          </div>
          <div className="font-mono-data" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {(entryPrice * 100).toFixed(1)}{"¢"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            {t("sigma.size")}
          </div>
          <div className="font-mono-data" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {fmtUSDC(sizeUsd)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            {t("sigma.estReturn")}
          </div>
          <div
            className="font-mono-data"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: estReturn >= 0 ? "var(--ios-green)" : "var(--ios-red)",
            }}
          >
            {estReturn >= 0 ? "+" : ""}${Math.abs(estReturn).toFixed(0)}{" "}
            <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
              ({confidence.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Low-conviction warning */}
      {signalReady && !highConviction && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.20)",
            flexBasis: "100%",
            order: 9,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>{"\u26A0"}</span>
          <span style={{ fontSize: 12, color: "var(--ios-orange)", lineHeight: 1.4 }}>
            {t("sigma.lowEdge")}
          </span>
        </div>
      )}

      {/* Wallet funding warning */}
      {signalReady && !walletFunded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255,159,10,0.08)",
            border: "1px solid rgba(255,159,10,0.20)",
            flexBasis: "100%",
            order: 10,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>{"⚠"}</span>
          <span style={{ fontSize: 12, color: "var(--ios-orange)", lineHeight: 1.4 }}>
            {!hasUsdc && !hasGas
              ? t("sigma.fundWalletFull")
              : !hasUsdc
                ? t("sigma.noUsdc")
                : t("sigma.noPol")}
          </span>
        </div>
      )}

      {/* Execute button */}
      <button
        data-testid="execute-trade-btn"
        disabled={!canExecute}
        onClick={() => {
          if (!canExecute || !edge) return;
          openTradeModal({
            slug: market.slug,
            tokenId: market.tokenId,
            yesTokenId: market.yesTokenId,
            noTokenId: market.noTokenId,
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
          height: 44,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          borderRadius: 12,
          background: canExecute
            ? paperMode
              ? "var(--ios-orange)"
              : "linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)"
            : "rgba(255,255,255,0.06)",
          color: canExecute ? "#fff" : "var(--text-tertiary)",
          fontSize: 14,
          fontWeight: 700,
          cursor: canExecute ? "pointer" : "not-allowed",
          opacity: canExecute ? 1 : 0.45,
          transition: "all 200ms ease",
          fontFamily: "inherit",
          flexShrink: 0,
          boxShadow: canExecute ? "0 4px 16px rgba(0,122,255,0.30)" : "none",
          letterSpacing: "0.02em",
        }}
      >
        <span>{paperMode ? t("sigma.simulateTrade") : t("sigma.executeTrade")}</span>
        <span>{"\u2192"}</span>
      </button>
    </div>
  );
}
