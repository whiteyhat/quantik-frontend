"use client";

import { useState } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api, fmtUSDC } from "@/lib/api";
import { usePaperMode } from "@/context/PaperModeContext";

export function TradeConfirmationModal() {
  const open = useQuantikStore((s) => s.tradeModalOpen);
  const pending = useQuantikStore((s) => s.pendingTrade);
  const close = useQuantikStore((s) => s.closeTradeModal);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { paperMode } = usePaperMode();

  // Trade execution button color: amber in paper mode, blue in live mode
  const confirmBtnBg = paperMode ? "#FF9F0A" : "var(--ios-blue)";

  if (!open || !pending) return null;

  const { sigma, edge, market, slug, tokenId } = pending;
  const direction = sigma.decision === "BET_YES" ? "YES" : "NO";

  async function handleConfirm() {
    setLoading(true);
    try {
      await api.executeTrade({
        slug,
        tokenId,
        direction: direction as "YES" | "NO",
        size_usd: sigma.size_usd,
        limit_price: sigma.entry_price,
      });
      close();
    } catch {
      // Could show error toast
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAll() {
    setCancelling(true);
    try {
      await api.cancelAll();
      close();
    } catch {
      // noop
    } finally {
      setCancelling(false);
    }
  }

  const summaryItems = [
    { label: "Aura", value: "Sentiment analysis", dot: "var(--ios-green)" },
    { label: "Oracle", value: `${Math.round((sigma.confidence / 100) * 0.78 * 100 + 20)}%`, dot: "var(--ios-green)" },
    { label: "Edge", value: edge.ev_grade, dot: edge.ev_grade === "A" || edge.ev_grade === "B" ? "var(--ios-green)" : "var(--ios-orange)" },
    { label: "Clause", value: "LOW", dot: "var(--ios-green)" },
    { label: "Lucifer", value: "0.23", dot: "var(--ios-orange)" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="glass-card-elevated"
        style={{
          maxWidth: 480,
          width: "calc(100% - 32px)",
          padding: 32,
        }}
      >
        {/* Title */}
        <h2 className="text-title" style={{ color: "var(--text-primary)", margin: "0 0 20px 0" }}>
          Confirm Trade
        </h2>

        {/* Market question */}
        <p className="text-body" style={{ color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
          {market.question}
        </p>

        {/* Trade details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 16,
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Direction</span>
            <span
              className="font-mono-data text-subhead"
              style={{
                fontWeight: 600,
                color: direction === "YES" ? "var(--ios-green)" : "var(--ios-red)",
              }}
            >
              BUY {direction} · {Math.round((sigma.entry_price ?? 0) * 100)}¢
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Size</span>
            <span className="font-mono-data text-subhead" style={{ color: "var(--text-primary)" }}>
              {fmtUSDC(sigma.size_usd)} ({sigma.size_pct}%)
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Net EV</span>
            <span className="font-mono-data text-subhead" style={{ color: "var(--ios-green)" }}>
              +{(edge.net_ev ?? 0).toFixed(1)}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Edge</span>
            <span className="font-mono-data text-subhead" style={{ color: "var(--ios-green)" }}>
              {edge.ev_grade}
            </span>
          </div>
        </div>

        {/* Agent Summary */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <span className="text-caption" style={{ color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Agent Summary
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {summaryItems.map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: item.dot,
                    flexShrink: 0,
                  }}
                />
                <span className="text-subhead" style={{ color: "var(--text-secondary)", flex: 1 }}>
                  {item.label}
                </span>
                <span className="font-mono-data text-subhead" style={{ color: "var(--text-primary)" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={close}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "var(--text-subhead)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              background: confirmBtnBg,
              color: "#fff",
              fontSize: "var(--text-subhead)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 200ms ease",
            }}
          >
            {loading
              ? paperMode
                ? "Simulating..."
                : "Confirming..."
              : paperMode
              ? "Simulate Trade →"
              : "Confirm →"}
          </button>
        </div>

        {/* Cancel All Orders */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            onClick={handleCancelAll}
            disabled={cancelling}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--ios-red-glow)",
              color: "var(--ios-red)",
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              cursor: cancelling ? "not-allowed" : "pointer",
              transition: "all 200ms ease",
            }}
          >
            ⚠ Cancel All Orders
          </button>
        </div>
      </div>
    </div>
  );
}
