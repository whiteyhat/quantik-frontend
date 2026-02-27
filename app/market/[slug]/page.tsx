"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, runPipeline } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { MarketHeader } from "@/components/MarketHeader";
import { PriceChart } from "@/components/PriceChart";
import { AgentPipeline } from "@/components/AgentPipeline";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { TradeConfirmationModal } from "@/components/TradeConfirmationModal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { slug } = use(params);
  const pipelineStart = useQuantikStore((s) => s.pipelineStart);
  const pipelineAgentEvent = useQuantikStore((s) => s.pipelineAgentEvent);
  const pipelineComplete = useQuantikStore((s) => s.pipelineComplete);
  const pipelineReset = useQuantikStore((s) => s.pipelineReset);
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [cancelPipeline, setCancelPipeline] = useState<(() => void) | null>(null);

  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

  function handleRunPipeline() {
    pipelineReset();
    pipelineStart();
    const cancel = runPipeline(
      slug,
      (event) => pipelineAgentEvent(event),
      (result) => pipelineComplete(result),
      () => pipelineComplete({})
    );
    setCancelPipeline(() => cancel);
  }

  function handleStopPipeline() {
    cancelPipeline?.();
    pipelineReset();
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link
          href="/"
          style={{
            fontSize: "var(--text-subhead)",
            color: "var(--ios-blue)",
            textDecoration: "none",
          }}
        >
          Dashboard
        </Link>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-subhead)" }}>{"\u203A"}</span>
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-subhead)" }}>
          Market Analysis
        </span>
      </div>

      {/* Hero Market Header */}
      <MarketHeader slug={slug} />

      {/* Chart — full width */}
      <div className="glass-card" style={{ padding: 20, overflow: "hidden", marginBottom: 24 }}>
        {market?.tokenId ? (
          <PriceChart tokenId={market.tokenId} slug={slug} />
        ) : (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading chart...</span>
          </div>
        )}
      </div>

      {/* Run/Stop Pipeline button — full-width iOS blue */}
      <div style={{ marginBottom: 20 }}>
        {!pipeline.running ? (
          <button
            onClick={handleRunPipeline}
            data-testid="run-pipeline-btn"
            style={{
              width: "100%",
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              border: "none",
              background: "var(--ios-blue)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 200ms ease",
              fontFamily: "inherit",
            }}
          >
            <span>{"\u25B6"}</span>
            <span>Run Analysis Pipeline</span>
          </button>
        ) : (
          <button
            onClick={handleStopPipeline}
            data-testid="stop-pipeline-btn"
            style={{
              width: "100%",
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "var(--ios-red)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 200ms ease",
              fontFamily: "inherit",
            }}
          >
            <span>{"\u25A0"}</span>
            <span>Stop Pipeline</span>
          </button>
        )}
      </div>

      {/* Agent Pipeline — full width for all 7 agents */}
      <AgentPipeline
        market={
          market
            ? {
                slug: market.slug,
                tokenId: market.tokenId,
                question: market.question,
                yesPrice: market.yesPrice,
                noPrice: market.noPrice,
              }
            : undefined
        }
      />

      {/* Pipeline duration timeline */}
      <PipelineTimeline />

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal />
    </div>
  );
}
