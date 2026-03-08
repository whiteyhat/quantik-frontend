"use client";

import { useCallback } from "react";
import { fmtUSDC, fmtPrice, type Position } from "@/lib/api";
import {
  useSocketEvent,
  type PositionUpdateEvent,
} from "@/context/SocketContext";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export function LivePositionsTable({ positions, loading, onPositionUpdate }: LivePositionsTableProps) {
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
          Live Positions
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
          {activeCount} Active
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
          No open positions
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Market Title", "Outcome", "Shares", "Avg Entry Price", "Current Price", "Current Value", "P&L ($/%)", "Resolution Date"].map(
                  (h) => (
                    <th
                      key={h}
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
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnlColor = pos.pnl >= 0 ? "#30d158" : "#ff453a";
                const currentValue = pos.size * pos.currentPrice;
                return (
                  <tr key={pos.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "10px", fontSize: 13, color: "rgba(255,255,255,0.80)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pos.market}
                    </td>
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
                    <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                      {pos.size.toFixed(1)}
                    </td>
                    <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                      {fmtPrice(pos.entryPrice)}
                    </td>
                    <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                      {fmtPrice(pos.currentPrice)}
                    </td>
                    <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                      {fmtUSDC(currentValue)}
                    </td>
                    <td style={{ padding: "10px", fontFamily: '"SF Mono", monospace', fontSize: 12, color: pnlColor, fontWeight: 600 }}>
                      {pos.pnl >= 0 ? "+" : ""}{fmtUSDC(pos.pnl)} / {pos.pnlPct >= 0 ? "+" : ""}{(pos.pnlPct * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, color: "rgba(255,255,255,0.40)", whiteSpace: "nowrap" }}>
                      —
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
