"use client";

import { PerformancePanel } from "@/components/PerformancePanel";

export default function ReportsPage() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "-0.3px",
        }}
      >
        Reports
      </h1>
      <PerformancePanel />
    </div>
  );
}
