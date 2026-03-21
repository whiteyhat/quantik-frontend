"use client";

import { useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import { api } from "@/lib/api";
import { usePaperMode } from "@/context/PaperModeContext";

const DEFAULT_TRADE_SIZE = 10;
const PRESETS = [5, 10, 25, 50, 100];

/* ─── Animated confidence ring (SVG) ──────────────────────────────────────── */
function ConfidenceRing({
  value,
  color,
  size = 64,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="8"
      />
      {/* Filled arc */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          animation: "trade-modal-ring-fill 800ms ease-out forwards",
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
      {/* Center text */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="22"
        fontWeight="700"
        fontFamily="var(--font-mono, 'SF Mono', monospace)"
      >
        {value.toFixed(0)}
      </text>
      <text
        x="50"
        y="67"
        textAnchor="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize="10"
        fontWeight="600"
      >
        %
      </text>
    </svg>
  );
}

/* ─── Main modal ──────────────────────────────────────────────────────────── */
export function TradeConfirmationModal() {
  const t = useTranslations("tradeConfirm");
  const open = useQuantikStore((s) => s.tradeModalOpen);
  const pending = useQuantikStore((s) => s.pendingTrade);
  const close = useQuantikStore((s) => s.closeTradeModal);
  const wallet = useQuantikStore((s) => s.wallet);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tradeAmount, setTradeAmount] = useState(DEFAULT_TRADE_SIZE);
  const { paperMode } = usePaperMode();

  const usdcBalance = wallet?.onChainUsdc ?? wallet?.usdc ?? 0;
  const polBalance = wallet?.pol ?? 0;
  const walletFunded = paperMode || (usdcBalance > 0 && polBalance > 0.01);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // Derive trade fields from pending
  const sigma = pending?.sigma;
  const edge = pending?.edge;
  const slug = pending?.slug;
  const yesTokenId = pending?.yesTokenId;
  const noTokenId = pending?.noTokenId;
  const tokenId = pending?.tokenId;
  const market = pending?.market;
  const direction = sigma?.decision === "BET_YES" ? "YES" : "NO";
  const dirColor = direction === "YES" ? "var(--ios-green)" : "var(--ios-red)";
  const confidence = sigma?.confidence ?? 0;

  // Reset trade amount when modal opens with new pending trade
  const pendingSlug = pending?.slug;
  const prevSlugRef = useRef<string | null>(null);
  if (open && pendingSlug && pendingSlug !== prevSlugRef.current) {
    prevSlugRef.current = pendingSlug;
    setTradeAmount(sigma?.size_usd && sigma.size_usd > 0 ? sigma.size_usd : DEFAULT_TRADE_SIZE);
  }

  // Computed values
  const entryPrice = sigma?.entry_price ?? 0;
  const ev = edge?.net_ev ?? 0;
  const estPayout = useMemo(() => {
    if (!entryPrice || entryPrice <= 0) return 0;
    // shares = amount / price, payout = shares * 1 (if win)
    const shares = tradeAmount / entryPrice;
    return shares - tradeAmount;
  }, [tradeAmount, entryPrice]);

  async function handleConfirm() {
    if (!slug || !sigma) return;
    setLoading(true);
    try {
      const size = tradeAmount > 0 ? tradeAmount : DEFAULT_TRADE_SIZE;

      if (paperMode) {
        await api.placeOrder(slug, direction, size);
      } else {
        // Polymarket CLOB: always "buy" the correct outcome token
        // YES bet → buy YES token, NO bet → buy NO token
        const resolvedToken = direction === "YES"
          ? (yesTokenId ?? tokenId ?? slug)
          : (noTokenId ?? tokenId ?? slug);
        const price = direction === "YES" ? market?.yesPrice ?? 0.5 : market?.noPrice ?? 0.5;
        await api.executeTrade({
          direction,
          tokenId: resolvedToken,
          price,
          size,
          marketSlug: slug,
          netEv: edge?.net_ev,
          evGrade: edge?.ev_grade,
        });
      }

      showToast(paperMode ? t("orderPlacedPaper") : t("orderPlaced"));
      close();
    } catch (err: unknown) {
      // Surface the actual error from the backend/Polymarket
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("balance") || msg.includes("allowance")) {
        showToast("Insufficient USDC balance or allowance");
      } else {
        showToast(msg.includes("API error") ? msg.replace(/^API error \d+:\s*/, "") : t("orderFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toast */}
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
            animation: "toast-in 300ms ease-out",
          }}
        >
          {toast}
        </div>
      )}

      {/* Modal */}
      {open && pending && sigma && edge && market && slug && (
        <div
          data-testid="trade-confirmation-modal"
          className="trade-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="trade-modal-card"
            style={{
              maxWidth: 460,
              width: "calc(100% - 32px)",
              borderRadius: 20,
              background: "rgba(18, 18, 24, 0.92)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {/* ── Header with gradient accent bar ── */}
            <div
              style={{
                height: 3,
                background: direction === "YES"
                  ? "linear-gradient(90deg, #30D158, #00C6FF)"
                  : "linear-gradient(90deg, #FF453A, #FF6B6B)",
              }}
            />

            <div className="p-4 sm:p-6 md:py-7 md:px-7">
              {/* ── Top row: Direction badge + Confidence ring ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                {/* Left: mode tag + title */}
                <div>
                  {/* Paper / Live badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      borderRadius: 100,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                      background: paperMode ? "rgba(255,159,10,0.12)" : "rgba(0,122,255,0.12)",
                      color: paperMode ? "var(--ios-orange)" : "var(--ios-blue)",
                      border: `1px solid ${paperMode ? "rgba(255,159,10,0.20)" : "rgba(0,122,255,0.20)"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: paperMode ? "var(--ios-orange)" : "var(--ios-blue)",
                      }}
                    />
                    {paperMode ? "Paper Mode" : "Live Trading"}
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {t("title")}
                  </h2>
                </div>

                {/* Right: Confidence ring */}
                <ConfidenceRing value={confidence} color={dirColor} size={68} />
              </div>

              {/* ── Market question ── */}
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--text-secondary)",
                }}
              >
                {market.question}
              </p>

              {/* ── Direction indicator ── */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "14px 20px",
                  borderRadius: 14,
                  marginBottom: 16,
                  background: `color-mix(in srgb, ${dirColor} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${dirColor} 18%, transparent)`,
                }}
              >
                {/* Glow aura behind badge */}
                <div
                  style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, color-mix(in srgb, ${dirColor} 30%, transparent), transparent 70%)`,
                    animation: "trade-modal-glow-pulse 2.5s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
                <span
                  className="font-mono-data"
                  style={{
                    position: "relative",
                    fontSize: 22,
                    fontWeight: 800,
                    color: dirColor,
                    letterSpacing: "0.04em",
                  }}
                >
                  {direction === "YES" ? "\u2191" : "\u2193"} {t("buy", { direction })}
                </span>
                <span
                  style={{
                    position: "relative",
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  @ {Math.round(entryPrice * 100)}¢
                </span>
              </div>

              {/* ── Trade details grid ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {/* Edge / EV */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    {t("edge")}
                  </div>
                  <div
                    className="font-mono-data"
                    data-testid="modal-edge"
                    style={{ fontSize: 13, fontWeight: 700 }}
                  >
                    <span style={{ color: "var(--ios-green)" }}>{edge.ev_grade}</span>
                    <span style={{ color: "var(--text-tertiary)", marginLeft: 6, fontWeight: 500 }}>
                      +{ev.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Est. Payout */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    Est. Profit
                  </div>
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: estPayout >= 0 ? "var(--ios-green)" : "var(--ios-red)",
                    }}
                  >
                    {estPayout >= 0 ? "+" : ""}${Math.abs(estPayout).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ── Size input with presets ── */}
              <div
                style={{
                  padding: "16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t("sizeUsdc")}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      className="font-mono-data"
                      style={{ fontSize: 20, fontWeight: 300, color: "var(--text-tertiary)" }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={tradeAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setTradeAmount(val);
                      }}
                      data-testid="modal-size-input"
                      style={{
                        width: 90,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--text-primary)",
                        fontSize: 18,
                        fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                        fontWeight: 700,
                        textAlign: "right",
                        outline: "none",
                        transition: "border-color 200ms ease, box-shadow 200ms ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = paperMode ? "var(--ios-orange)" : "var(--ios-blue)";
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${paperMode ? "rgba(255,159,10,0.15)" : "rgba(0,122,255,0.15)"}`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <span
                      className="font-mono-data"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}
                    >
                      USDC
                    </span>
                  </div>
                </div>

                {/* Preset buttons */}
                <div style={{ display: "flex", gap: 6 }}>
                  {PRESETS.map((amt) => (
                    <button
                      key={amt}
                      className="trade-modal-preset-btn"
                      onClick={() => setTradeAmount(amt)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 8,
                        border:
                          tradeAmount === amt
                            ? `1px solid ${paperMode ? "var(--ios-orange)" : "var(--ios-blue)"}`
                            : "1px solid rgba(255,255,255,0.08)",
                        background:
                          tradeAmount === amt
                            ? paperMode
                              ? "rgba(255,159,10,0.12)"
                              : "rgba(0,122,255,0.12)"
                            : "rgba(255,255,255,0.03)",
                        color:
                          tradeAmount === amt
                            ? paperMode
                              ? "var(--ios-orange)"
                              : "var(--ios-blue)"
                            : "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                        cursor: "pointer",
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Insufficient balance for trade size ── */}
              {walletFunded && !paperMode && usdcBalance > 0 && tradeAmount > usdcBalance && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,159,10,0.06)",
                    border: "1px solid rgba(255,159,10,0.18)",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{"\u26A0"}</span>
                  <div style={{ fontSize: 12, color: "var(--ios-orange)", lineHeight: 1.4 }}>
                    Trade size (${tradeAmount}) exceeds wallet balance (${usdcBalance.toFixed(2)} USDC)
                  </div>
                </div>
              )}

              {/* ── Wallet funding warning ── */}
              {!walletFunded && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,69,58,0.06)",
                    border: "1px solid rgba(255,69,58,0.18)",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{"\u26A0"}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ios-red)",
                        marginBottom: 2,
                      }}
                    >
                      {t("walletNotFunded")}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}
                    >
                      {usdcBalance <= 0 && polBalance <= 0.01
                        ? t("walletNotFundedDesc")
                        : usdcBalance <= 0
                          ? t("noUsdc")
                          : t("noPol")}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action buttons ── */}
              <div style={{ display: "flex", gap: 10 }}>
                {/* Cancel */}
                <button
                  onClick={close}
                  data-testid="modal-cancel-btn"
                  className="trade-modal-cancel-btn"
                  style={{
                    flex: 1,
                    padding: "13px 20px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                >
                  {t("cancel")}
                </button>

                {/* Confirm */}
                <button
                  onClick={handleConfirm}
                  disabled={loading || !walletFunded}
                  data-testid="modal-confirm-btn"
                  className="trade-modal-confirm-btn"
                  style={{
                    flex: 2,
                    padding: "13px 24px",
                    borderRadius: 12,
                    border: "none",
                    background: !walletFunded
                      ? "rgba(255,255,255,0.06)"
                      : paperMode
                        ? "linear-gradient(135deg, #FF9F0A, #FFB340)"
                        : "linear-gradient(135deg, #007AFF, #00C6FF)",
                    color: !walletFunded ? "var(--text-tertiary)" : "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading || !walletFunded ? "not-allowed" : "pointer",
                    opacity: loading || !walletFunded ? 0.45 : 1,
                    transition: "all 250ms ease",
                    animation:
                      walletFunded && !loading
                        ? paperMode
                          ? "trade-modal-btn-glow-amber 2.5s ease-in-out infinite"
                          : "trade-modal-btn-glow 2.5s ease-in-out infinite"
                        : "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  {!walletFunded
                    ? t("walletNotFundedTitle")
                    : loading
                      ? paperMode
                        ? t("simulating")
                        : t("confirming")
                      : paperMode
                        ? `${t("simulateTrade")} \u2192`
                        : `${t("confirmTrade")} \u2192`}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
