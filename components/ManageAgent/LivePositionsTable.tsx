"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { fmtUSDC, fmtPrice, type Position } from "@/lib/api";
import {
  useSocketEvent,
  type PositionUpdateEvent,
} from "@/context/SocketContext";
import { useQuantikStore } from "@/store/useQuantikStore";
import { Skeleton } from "@/components/ui/skeleton";

function fmtCountdown(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

interface LivePositionsTableProps {
  positions: Position[];
  loading: boolean;
  onPositionUpdate: (slug: string, currentPrice: number, pnl: number, pnlPct: number) => void;
  onOpenPosition: (position: Position) => void;
}

export function LivePositionsTable({ positions, loading, onPositionUpdate, onOpenPosition }: LivePositionsTableProps) {
  const t = useTranslations("manageAgent");
  const tc = useTranslations("common");
  const myAgent = useQuantikStore((s) => s.myAgent);
  const agentEmoji = myAgent?.avatar_emoji ?? "\u{1F916}";
  const agentName = myAgent?.name ?? "Agent";
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleUpdate = useCallback(
    (data: PositionUpdateEvent) => {
      onPositionUpdate(data.slug, data.currentPrice, data.pnl, data.pnlPct);
    },
    [onPositionUpdate]
  );

  useSocketEvent<PositionUpdateEvent>("position:update", handleUpdate);

  const activeCount = positions.length;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.03em",
          }}
        >
          {t("livePositions")}
        </h2>
        <span
          style={{
            padding: "3px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.60)",
            fontFamily: '"SF Mono", monospace',
          }}
        >
          {activeCount} {tc("active")}
        </span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={44} borderRadius={8} />
          ))}
        </div>
      ) : activeCount === 0 ? (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 13,
            fontFamily: "monospace",
          }}
        >
          {t("noOpenPositions")}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {positions.map((pos) => {
              const pnlColor = pos.pnl >= 0 ? "#30d158" : "#ff453a";
              const isAutopilot = pos.source === "autopilot";
              return (
                <div
                  key={pos.id}
                  onClick={() => onOpenPosition(pos)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                  }}
                >
                  {/* Row 1: Market name + direction badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{isAutopilot ? agentEmoji : "\u{1F9D1}"}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pos.market}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        background: pos.direction === "YES" ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
                        color: pos.direction === "YES" ? "#30d158" : "#ff453a",
                      }}
                    >
                      {pos.direction}
                    </span>
                  </div>
                  {/* Row 2: Size + Price + PnL */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 12, fontFamily: '"SF Mono", monospace', fontSize: 11, color: "rgba(255,255,255,0.50)" }}>
                      <span>{pos.size.toFixed(1)} sh</span>
                      <span>@ {fmtPrice(pos.currentPrice)}</span>
                      <span>{fmtCountdown(pos.resolutionDate)}</span>
                    </div>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontSize: 12, fontWeight: 600, color: pnlColor }}>
                      {pos.pnl >= 0 ? "+" : ""}{fmtUSDC(pos.pnl)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            {/* Keyframe for the bouncing arrow */}
            <style>{`
              @keyframes bounceRight {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(4px); }
              }
            `}</style>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    t("source") ?? "Source",
                    t("marketTitle"),
                    t("outcome"),
                    t("shares"),
                    t("currentPrice"),
                    t("currentValue"),
                    t("pnlPercent"),
                    t("resolutionDate"),
                    "", // arrow column
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.30)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const pnlColor = pos.pnl >= 0 ? "#30d158" : "#ff453a";
                  const currentValue = pos.size * pos.currentPrice;
                  const isHovered = hoveredRow === pos.id;
                  const isAutopilot = pos.source === "autopilot";
                  return (
                    <tr
                      key={pos.id}
                      onMouseEnter={() => setHoveredRow(pos.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => onOpenPosition(pos)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        background: isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Source: agent emoji for autopilot, human for manual */}
                      <td
                        style={{ padding: "10px", whiteSpace: "nowrap" }}
                        title={isAutopilot ? agentName : "Manual"}
                      >
                        <span style={{ fontSize: 16 }}>{isAutopilot ? agentEmoji : "\u{1F9D1}"}</span>
                      </td>
                      {/* Market */}
                      <td style={{ padding: "10px", fontSize: 13, color: "rgba(255,255,255,0.80)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pos.market}
                      </td>
                      {/* Outcome */}
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: pos.direction === "YES" ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
                            color: pos.direction === "YES" ? "#30d158" : "#ff453a",
                          }}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      {/* Shares */}
                      <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {pos.size.toFixed(1)}
                      </td>
                      {/* Current Price */}
                      <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {fmtPrice(pos.currentPrice)}
                      </td>
                      {/* Current Value */}
                      <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                        {fmtUSDC(currentValue)}
                      </td>
                      {/* PnL */}
                      <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: pnlColor, fontWeight: 600 }}>
                        {pos.pnl >= 0 ? "+" : ""}{fmtUSDC(pos.pnl)} / {pos.pnlPct >= 0 ? "+" : ""}{(pos.pnlPct * 100).toFixed(1)}%
                      </td>
                      {/* Resolution Date */}
                      <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.40)", whiteSpace: "nowrap" }}>
                        {fmtCountdown(pos.resolutionDate)}
                      </td>
                      {/* Hover arrow */}
                      <td style={{ padding: "10px 8px", width: 28 }}>
                        <span
                          style={{
                            display: "inline-block",
                            opacity: isHovered ? 1 : 0,
                            transition: "opacity 0.15s ease",
                            animation: isHovered ? "bounceRight 0.8s ease-in-out infinite" : "none",
                            fontSize: 14,
                            color: "rgba(255,255,255,0.50)",
                          }}
                        >
                          →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
