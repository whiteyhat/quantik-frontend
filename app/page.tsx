"use client";

import { PortfolioOverview } from "@/components/PortfolioOverview";
import { MarketScanner } from "@/components/MarketScanner";
import { ActivePositions } from "@/components/ActivePositions";
import { RecentSignals } from "@/components/RecentSignals";

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Section 1: Portfolio Overview */}
      <PortfolioOverview />

      {/* Section 2: Market Scanner */}
      <section id="markets">
        <MarketScanner />
      </section>

      {/* Section 3: Positions + Signals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <ActivePositions />
        <RecentSignals />
      </div>
    </div>
  );
}
