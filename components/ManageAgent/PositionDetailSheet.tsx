"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api, fmtPrice, fmtUSDC, type Market, type Position } from "@/lib/api";
import { PriceChart } from "@/components/PriceChart";

export function PositionDetailSheet({
  position,
  open,
  onClose,
  onClosed,
}: {
  position: Position | null;
  open: boolean;
  onClose: () => void;
  onClosed: (executionId: number) => void;
}) {
  const [market, setMarket] = useState<Market | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open || !position) return;
    let active = true;
    api.getMarket(position.slug)
      .then((response) => {
        if (active) setMarket(response);
      })
      .catch(() => {
        if (active) setMarket(null);
      });
    return () => {
      active = false;
    };
  }, [open, position]);

  if (!open || !position) return null;

  const pnlColor = position.pnl >= 0 ? "var(--ios-green)" : "var(--ios-red)";
  const question = market?.question ?? position.question ?? position.market;

  return (
    <>
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          border: "none",
          zIndex: 70,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          bottom: 12,
          width: "min(520px, calc(100vw - 24px))",
          zIndex: 71,
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          background: "var(--panel-surface)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 18, borderBottom: "1px solid var(--glass-border)" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", letterSpacing: "0.08em", fontWeight: 700 }}>
              LIVE POSITION
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {question}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {[
              { label: "Direction", value: position.direction, color: position.direction === "YES" ? "var(--ios-green)" : "var(--ios-red)" },
              { label: "Entry", value: fmtPrice(position.entryPrice), color: "var(--text-primary)" },
              { label: "Current", value: fmtPrice(position.currentPrice), color: "var(--text-primary)" },
              { label: "P&L", value: `${position.pnl >= 0 ? "+" : ""}${fmtUSDC(position.pnl)}`, color: pnlColor },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-surface)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: metric.color }}>{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <PriceChart tokenId={position.tokenId ?? market?.tokenId ?? ""} slug={position.slug} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>Size {position.size.toFixed(2)}</span>
            <span>Source {(position.source ?? "manual").toUpperCase()}</span>
            <span>Opened {position.executedAt ? new Date(position.executedAt).toLocaleString() : "—"}</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/market/${position.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 150,
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: "var(--glass-surface)",
                color: "var(--text-primary)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Open full market
            </Link>
            <button
              onClick={async () => {
                if (!position.executionId || closing) return;
                setClosing(true);
                try {
                  await api.closePosition(position.executionId);
                  onClosed(position.executionId);
                  onClose();
                } finally {
                  setClosing(false);
                }
              }}
              disabled={!position.executionId || closing}
              style={{
                minWidth: 150,
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,69,58,0.35)",
                background: "rgba(255,69,58,0.12)",
                color: "var(--ios-red)",
                cursor: position.executionId && !closing ? "pointer" : "not-allowed",
                fontWeight: 700,
                opacity: position.executionId && !closing ? 1 : 0.5,
              }}
            >
              {closing ? "Closing…" : "Close position"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
