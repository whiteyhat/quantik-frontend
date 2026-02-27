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
  const [toast, setToast] = useState<string | null>(null);
  const { paperMode } = usePaperMode();

  // Trade execution button color: amber in paper mode, blue in live mode
  const confirmBtnBg = paperMode ? "#FF9F0A" : "var(--ios-blue)";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Derive trade fields from pending (used inside modal)
  const sigma = pending?.sigma;
  const edge = pending?.edge;
  const slug = pending?.slug;
  const market = pending?.market;
  const direction = sigma?.decision === "BET_YES" ? "YES" : "NO";

  async function handleConfirm() {
    if (!slug || !sigma) return;
    setLoading(true);
    try {
      await api.placeOrder(slug, direction, sigma.size_usd);
      showToast(paperMode ? "Order placed (Paper Mode)" : "Order placed");
      close();
    } catch {
      showToast("Order failed — try again");
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

  return (
    <>
      {/* Toast — renders outside modal so it persists after close */}
      {toast && (
        <div
          data-testid="trade-toast"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            padding: "10px 24px",
            borderRadius: 100,
            background: toast.includes("failed") ? "var(--ios-red-glow)" : "var(--ios-green-glow)",
            border: toast.includes("failed")
              ? "1px solid var(--ios-red)"
              : "1px solid var(--ios-green)",
            color: toast.includes("failed") ? "var(--ios-red)" : "var(--ios-green)",
            fontSize: "var(--text-subhead)",
            fontWeight: 500,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}

      {/* Modal */}
      {open && pending && sigma && edge && market && slug && (
        <div
          data-testid="trade-confirmation-modal"
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
                <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Slug</span>
                <span className="font-mono-data text-subhead" data-testid="modal-slug" style={{ color: "var(--text-primary)" }}>
                  {slug}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Direction</span>
                <span
                  className="font-mono-data text-subhead"
                  data-testid="modal-direction"
                  style={{
                    fontWeight: 600,
                    color: direction === "YES" ? "var(--ios-green)" : "var(--ios-red)",
                  }}
                >
                  BUY {direction} · {Math.round((sigma.entry_price ?? 0) * 100)}¢
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Size (USDC)</span>
                <span className="font-mono-data text-subhead" data-testid="modal-size" style={{ color: "var(--text-primary)" }}>
                  {fmtUSDC(sigma.size_usd)} ({sigma.size_pct}%)
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Confidence</span>
                <span className="font-mono-data text-subhead" data-testid="modal-confidence" style={{ color: "var(--ios-green)" }}>
                  {sigma.confidence}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Edge</span>
                <span className="font-mono-data text-subhead" data-testid="modal-edge" style={{ color: "var(--ios-green)" }}>
                  {edge.ev_grade} (+{(edge.net_ev ?? 0).toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={close}
                data-testid="modal-cancel-btn"
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
                data-testid="modal-confirm-btn"
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
                Cancel All Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
