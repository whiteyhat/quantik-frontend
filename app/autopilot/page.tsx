"use client";

import { AutopilotStatusBar } from "@/components/AutopilotStatusBar";
import { ScannerFeed } from "@/components/ScannerFeed";
import { ExecutionLog } from "@/components/ExecutionLog";
import { PnlTicker } from "@/components/PnlTicker";
import { TelegramWebhookEditor } from "@/components/TelegramWebhookEditor";

export default function AutopilotPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page title */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: "0.04em",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          ⚡ AUTOPILOT
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12,
            color: "rgba(255,255,255,0.30)",
            fontFamily: "monospace",
          }}
        >
          Autonomous trading — read-only observation dashboard
        </p>
      </div>

      {/* Autopilot Status Bar */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <AutopilotStatusBar />
      </div>

      {/* P&L Ticker — full width */}
      <PnlTicker />

      {/* Main grid: Scanner (60%) + Execution Log (40%) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60fr 40fr",
          gap: 16,
        }}
      >
        {/* Scanner Feed */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <ScannerFeed />
        </div>

        {/* Execution Log */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <ExecutionLog />
          <TelegramWebhookEditor />
        </div>
      </div>
    </div>
  );
}
