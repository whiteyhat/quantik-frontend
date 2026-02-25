"use client";

import { useState } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api } from "@/lib/api";

export function TradeConfirmationModal() {
  const { tradeModalOpen, pendingTrade, closeTradeModal } = useQuantikStore((s) => ({
    tradeModalOpen: s.tradeModalOpen,
    pendingTrade: s.pendingTrade,
    closeTradeModal: s.closeTradeModal,
  }));

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!tradeModalOpen || !pendingTrade) return null;

  const { sigma, edge, market, slug, tokenId } = pendingTrade;
  const isYes = sigma.decision === "BET_YES";
  const decisionColor = isYes ? '#00ff88' : '#ff4444';

  async function handleExecute() {
    if (!pendingTrade) return;
    setExecuting(true);
    setResult(null);

    try {
      const res = await api.executeTrade({
        slug: pendingTrade.slug,
        tokenId: pendingTrade.tokenId,
        direction: sigma.decision === "BET_YES" ? "YES" : "NO",
        size_usd: sigma.size_usd,
        limit_price: sigma.entry_price,
      });
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setExecuting(false);
    }
  }

  async function handleCancelAll() {
    setCancelling(true);
    try {
      await api.cancelAll();
      closeTradeModal();
    } catch (err) {
      console.error("Cancel all failed:", err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={closeTradeModal}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full max-w-lg rounded-lg"
          style={{
            background: '#14141f',
            border: `1px solid ${decisionColor}40`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: '#1e1e2e' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold q-mono" style={{ color: decisionColor }}>
                {sigma.decision}
              </span>
              <span className="text-xs" style={{ color: '#606080' }}>Trade Confirmation</span>
            </div>
            <button
              onClick={closeTradeModal}
              className="text-lg leading-none"
              style={{ color: '#606080' }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Market */}
            <div>
              <div className="text-xs mb-1" style={{ color: '#606080' }}>Market</div>
              <div className="text-sm leading-relaxed" style={{ color: '#e0e0e0' }}>
                {market.question}
              </div>
            </div>

            {/* Trade details grid */}
            <div
              className="grid grid-cols-2 gap-3 p-4 rounded"
              style={{ background: '#0f0f1a', border: '1px solid #1e1e2e' }}
            >
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Direction</div>
                <div className="text-base font-bold q-mono" style={{ color: decisionColor }}>
                  {isYes ? 'YES' : 'NO'}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Confidence</div>
                <div className="text-base font-bold q-mono" style={{ color: '#e0e0e0' }}>
                  {sigma.confidence}%
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Size (USD)</div>
                <div className="text-base font-semibold q-mono" style={{ color: '#4488ff' }}>
                  ${sigma.size_usd.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Bankroll %</div>
                <div className="text-base font-semibold q-mono" style={{ color: '#e0e0e0' }}>
                  {sigma.size_pct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Entry Price</div>
                <div className="text-base font-semibold q-mono" style={{ color: '#4488ff' }}>
                  {Math.round(sigma.entry_price * 100)}¢
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#606080' }}>EV Grade</div>
                <div
                  className="text-base font-bold q-mono"
                  style={{ color: edge.ev_grade === 'A' ? '#00ff88' : '#4488ff' }}
                >
                  {edge.ev_grade}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs mb-1" style={{ color: '#606080' }}>Net EV / Kelly</div>
                <div className="text-sm q-mono" style={{ color: '#e0e0e0' }}>
                  <span style={{ color: edge.net_ev > 0 ? '#00ff88' : '#ff4444' }}>
                    {edge.net_ev > 0 ? '+' : ''}{edge.net_ev.toFixed(1)}% net EV
                  </span>
                  <span style={{ color: '#606080' }}> · Kelly {edge.kelly.toFixed(1)}% · Rec {edge.recommended_size.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Thesis */}
            <div>
              <div className="text-xs mb-1" style={{ color: '#606080' }}>Sigma Thesis</div>
              <div className="text-xs leading-relaxed p-3 rounded" style={{ background: '#0a0a0f', color: '#e0e0e0' }}>
                {sigma.thesis}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div
                className="p-3 rounded text-xs q-mono"
                style={{
                  background: result.success ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.05)',
                  border: `1px solid ${result.success ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)'}`,
                  color: result.success ? '#00ff88' : '#ff4444',
                }}
              >
                {result.success
                  ? `✓ Trade executed${result.txHash ? ` · tx: ${result.txHash}` : ''}`
                  : `✗ Error: ${result.error}`}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-4 border-t"
            style={{ borderColor: '#1e1e2e' }}
          >
            {/* Cancel All (emergency) */}
            <button
              onClick={handleCancelAll}
              disabled={cancelling}
              className="text-xs px-3 py-2 rounded font-semibold"
              style={{
                background: 'rgba(255,68,68,0.1)',
                color: '#ff4444',
                border: '1px solid rgba(255,68,68,0.4)',
              }}
            >
              {cancelling ? 'Cancelling...' : '⚠ Cancel All Orders'}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={closeTradeModal}
                disabled={executing}
                className="text-xs px-4 py-2 rounded"
                style={{ color: '#606080', border: '1px solid #1e1e2e' }}
              >
                Dismiss
              </button>

              {!result?.success && (
                <button
                  onClick={handleExecute}
                  disabled={executing}
                  className="text-xs px-4 py-2 rounded font-semibold"
                  style={{
                    background: executing ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.15)',
                    color: '#00ff88',
                    border: '1px solid rgba(0,255,136,0.4)',
                  }}
                >
                  {executing ? 'Executing...' : '⚡ Confirm Trade'}
                </button>
              )}

              {result?.success && (
                <button
                  onClick={closeTradeModal}
                  className="text-xs px-4 py-2 rounded font-semibold"
                  style={{
                    background: 'rgba(0,255,136,0.15)',
                    color: '#00ff88',
                    border: '1px solid rgba(0,255,136,0.4)',
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
