"use client";

import { useEffect, useRef, useState } from "react";

export default function ArenaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          AGENT ARENA
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.30)" }}>
          Multiplayer Evolutionary Trading Battle Royale · Powered by Tether WDK
        </p>
      </div>

      {/* Main Arena Container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          background: "rgba(0,0,0,0.4)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div style={{ textAlign: "center", zIndex: 10 }}>
            <div
              style={{
                fontSize: 40,
                marginBottom: 10,
                animation: "pulse 2s infinite ease-in-out",
              }}
            >
              🕹️
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#0a84ff",
                letterSpacing: "0.1em",
              }}
            >
              INITIALIZING PHASER ENGINE...
            </div>
          </div>
        )}

        {/* Overlay for T11 Placeholder */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(10,132,255,0.05) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Stats/Lobby Info (Placeholder) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase" }}>Active Lobbies</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#0a84ff", fontFamily: "monospace" }}>0</span>
        </div>
        <div
          className="glass-card"
          style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase" }}>Total Agents Battle-Ready</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#30d158", fontFamily: "monospace" }}>70</span>
        </div>
        <div
          className="glass-card"
          style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase" }}>Mutations Tracked</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#bf5af2", fontFamily: "monospace" }}>0</span>
        </div>
      </div>
    </div>
  );
}
