"use client";

import { useEffect, useState } from "react";
import { api, fmtUSDC, type Position } from "@/lib/api";

function PositionRow({ position }: { position: Position }) {
  const isYes = position.direction === "YES";
  const accentColor = isYes ? "var(--ios-green)" : "var(--ios-red)";
  const safePnl = position.pnl ?? 0;
  const pnlColor = safePnl >= 0 ? "var(--ios-green)" : "var(--ios-red)";
  const pnlSign = safePnl >= 0 ? "+" : "";

  return (
    <div
      className="glass-card"
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 12,
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 3,
          height: 32,
          borderRadius: 2,
          background: accentColor,
          flexShrink: 0,
        }}
      />

      {/* Market question */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="text-subhead"
          style={{
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {position.market}
        </div>
      </div>

      {/* Direction badge */}
      <span
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 6,
          background: isYes ? "var(--ios-green-glow)" : "var(--ios-red-glow)",
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {position.direction}
      </span>

      {/* Entry → Current price */}
      <span
        className="font-mono-data"
        style={{
          fontSize: "var(--text-subhead)",
          color: "var(--text-secondary)",
          flexShrink: 0,
        }}
      >
        {Math.round((position.entryPrice ?? 0) * 100)}¢ → {Math.round((position.currentPrice ?? 0) * 100)}¢
      </span>

      {/* P&L */}
      <span
        className="font-mono-data"
        style={{
          fontSize: "var(--text-subhead)",
          fontWeight: 600,
          color: pnlColor,
          flexShrink: 0,
          textAlign: "right",
          minWidth: 80,
        }}
      >
        {pnlSign}{fmtUSDC(position.pnl)} ({pnlSign}{(position.pnlPct ?? 0).toFixed(1)}%)
      </span>
    </div>
  );
}

export function ActivePositions() {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    api.getPositions().then(setPositions).catch(() => {});
  }, []);

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}>
        Active Positions
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {positions.map((p) => (
          <PositionRow key={p.id} position={p} />
        ))}
        {positions.length === 0 && (
          <span className="text-body" style={{ color: "var(--text-tertiary)", padding: 16, textAlign: "center" }}>
            No active positions
          </span>
        )}
      </div>
    </div>
  );
}
