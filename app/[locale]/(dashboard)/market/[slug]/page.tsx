"use client";

import { use, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api, runPipeline } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { MarketHeader } from "@/components/MarketHeader";
import { PriceChart } from "@/components/PriceChart";
import { OrderBook } from "@/components/OrderBook";
import { AgentPipeline } from "@/components/AgentPipeline";
import { PipelineLog } from "@/components/PipelineLog";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { PipelineReplayPanel } from "@/components/pipeline/PipelineReplayPanel";
import { TradeConfirmationModal } from "@/components/TradeConfirmationModal";
import { RelayChat } from "@/components/RelayChat";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { slug } = use(params);
  const t = useTranslations("marketDetail");
  const searchParams = useSearchParams();
  const pipelineStart = useQuantikStore((s) => s.pipelineStart);
  const pipelineAgentEvent = useQuantikStore((s) => s.pipelineAgentEvent);
  const pipelineComplete = useQuantikStore((s) => s.pipelineComplete);
  const pipelineReset = useQuantikStore((s) => s.pipelineReset);
  const pipeline = useQuantikStore((s) => s.pipeline);
  const [cancelPipeline, setCancelPipeline] = useState<(() => void) | null>(null);
  const autorunFired = useRef(false);

  const { data: market, isError } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

  useEffect(() => {
    if (!market || pipeline.running || autorunFired.current) return;
    if (searchParams.get("autorun") !== "1") return;
    autorunFired.current = true;
    handleRunPipeline();
  }, [market, pipeline.running, searchParams]);

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

  if (isError) {
    return (
      <div style={{ padding: 20 }}>
        <Link
          href="/dashboard"
          style={{
            color: "var(--ios-blue)",
            textDecoration: "none",
            marginBottom: 16,
            display: "inline-block",
          }}
        >
          {"\u2039"} {t("backToDashboard")}
        </Link>
        <div
          className="glass-card"
          style={{
            padding: 32,
            textAlign: "center",
            border: "1px solid rgba(255, 59, 48, 0.3)",
          }}
        >
          <h2
            style={{ color: "var(--ios-red)", marginBottom: 8, fontSize: 20 }}
          >
            {t("notFound")}
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {t("notFoundDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back nav */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/dashboard"
          style={{
            fontSize: "var(--text-subhead)",
            color: "var(--ios-blue)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {"\u2039"} {t("back")}
        </Link>
      </div>

      {/* MARKET HEADER — question + YES/NO cards */}
      <MarketHeader slug={slug} />

      {/* CHART + ORDER BOOK — two-column */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="glass-card" style={{ padding: 20, overflow: "hidden" }}>
          <PriceChart tokenId={market?.tokenId ?? ""} slug={slug} />
        </div>
        <OrderBook
          tokenId={market?.tokenId ?? ""}
          yesPrice={market?.yesPrice ?? 0.5}
        />
      </div>

      {/* RUN / STOP PIPELINE BUTTON */}
      <div style={{ marginBottom: 20 }}>
        {!pipeline.running ? (
          <button
            onClick={handleRunPipeline}
            data-testid="run-pipeline-btn"
            disabled={!market}
            style={{
              width: "100%",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderRadius: 16,
              border: "none",
              background:
                "linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              boxShadow: "0 4px 24px rgba(0,122,255,0.35)",
              transition: "all 200ms ease",
              opacity: market ? 1 : 0.5,
              cursor: market ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 6px 32px rgba(0,122,255,0.5)";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 24px rgba(0,122,255,0.35)";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)";
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span>{market?.chainMode === "stellar_testnet" ? "Run 7-Agent Swap Analysis" : t("runPipeline")}</span>
          </button>
        ) : (
          <button
            onClick={handleStopPipeline}
            data-testid="stop-pipeline-btn"
            style={{
              width: "100%",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderRadius: 16,
              border: "1px solid rgba(255,69,58,0.30)",
              background: "rgba(255,69,58,0.08)",
              color: "var(--ios-red)",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              transition: "all 200ms ease",
            }}
          >
            <span style={{ fontSize: 12 }}>{"\u25A0"}</span>
            <span className="pipeline-running-text">{t("running")}</span>
            <style>{`
              .pipeline-running-text::after {
                content: '';
                display: inline-block;
                width: 1.5em;
                animation: dotdotdot 1.4s steps(4, end) infinite;
              }
              @keyframes dotdotdot {
                0%   { content: ''; }
                25%  { content: '.'; }
                50%  { content: '..'; }
                75%  { content: '...'; }
                100% { content: ''; }
              }
            `}</style>
          </button>
        )}
      </div>

      {/* LIVE PIPELINE FEED */}
      <PipelineLog slug={slug} />

      {/* AGENT PIPELINE — compact grid + insight + execute bar */}
      <AgentPipeline
        market={
          market
            ? {
                slug: market.slug,
                tokenId: market.tokenId,
                yesTokenId: market.yesTokenId,
                noTokenId: market.noTokenId,
                question: market.question,
                yesPrice: market.yesPrice,
                noPrice: market.noPrice,
                chainMode: market.chainMode,
                protocol: market.protocol,
                assetPair: market.assetPair,
                currentApy: market.currentApy,
                executionPlan: market.executionPlan,
              }
            : undefined
        }
      />

      {/* Pipeline duration timeline */}
      <PipelineTimeline />

      <PipelineReplayPanel slug={slug} title="Replay This Market" />

      {/* Quantik Relay */}
      <RelayChat slug={slug} />

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal />
    </div>
  );
}
