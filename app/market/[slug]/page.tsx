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
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-subhead)" }}>›</span>
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-subhead)" }}>
          Market Analysis
        </span>
      </div>

      {/* Market Header */}
      <MarketHeader slug={slug} />

      {/* Main content: Chart + Pipeline */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left: Chart */}
        <div>
          {market?.tokenId && <PriceChart tokenId={market.tokenId} slug={slug} />}
        </div>

        {/* Right: Agent Pipeline */}
        <div>
          {/* Run/Stop button */}
          <div style={{ marginBottom: 16 }}>
            {!pipeline.running ? (
              <button
                onClick={handleRunPipeline}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--ios-blue)",
                  color: "#fff",
                  fontSize: "var(--text-subhead)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }}
              >
                ▶ Run Analysis Pipeline
              </button>
            ) : (
              <button
                onClick={handleStopPipeline}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--ios-red)",
                  fontSize: "var(--text-subhead)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }}
              >
                ■ Stop Pipeline
              </button>
            )}
          </div>

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
        </div>
      </div>

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal />
    </div>
  );
}
