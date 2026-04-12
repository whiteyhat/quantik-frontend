"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api, runPipeline, type PipelineHistoryRun } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";
import { MarketHeader } from "@/components/MarketHeader";
import { PriceChart } from "@/components/PriceChart";
import { OrderBook } from "@/components/OrderBook";
import { AgentPipeline } from "@/components/AgentPipeline";
import { PipelineLog } from "@/components/PipelineLog";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { TradeConfirmationModal } from "@/components/TradeConfirmationModal";
import { RelayChat } from "@/components/RelayChat";
import { DualMarketPanel } from "@/components/ManageAgent/DualMarketPanel";
import { fmtTime } from "@/lib/formatters";

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
  const pipelineLoadReplay = useQuantikStore((s) => s.pipelineLoadReplay);
  const [historyRuns, setHistoryRuns] = useState<PipelineHistoryRun[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingReplay, setLoadingReplay] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

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

  // Fetch pipeline history for this market
  useEffect(() => {
    let active = true;
    api.getPipelineHistory().then((all) => {
      if (!active) return;
      setHistoryRuns(all.filter((r) => r.market_slug === slug));
    }).catch(() => {});
    return () => { active = false; };
  }, [slug]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [historyOpen]);

  const sortedRuns = useMemo(() => {
    return [...historyRuns].sort((a, b) => b.created_at - a.created_at);
  }, [historyRuns]);

  function handleReplayRun(runId: string) {
    setLoadingReplay(runId);
    setHistoryOpen(false);
    api.getPipelineReplay(runId)
      .then((payload) => {
        pipelineLoadReplay(payload.run, payload.frames);
      })
      .catch(() => {})
      .finally(() => setLoadingReplay(null));
  }

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

      {/* RUN / STOP PIPELINE BUTTON + HISTORY */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, position: "relative" }} ref={historyRef}>
        {/* History button — only when previous runs exist */}
        {sortedRuns.length > 0 && !pipeline.running && (
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            title="Previous runs"
            style={{
              width: 56,
              height: 56,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: historyOpen
                ? "1px solid rgba(10,132,255,0.40)"
                : "1px solid rgba(255,255,255,0.10)",
              background: historyOpen
                ? "rgba(10,132,255,0.12)"
                : "rgba(255,255,255,0.06)",
              color: historyOpen ? "#0a84ff" : "rgba(255,255,255,0.60)",
              cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        )}

        {/* History dropdown */}
        {historyOpen && sortedRuns.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: 0,
              width: 340,
              maxHeight: 320,
              overflowY: "auto",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(20,20,22,0.96)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.50)",
              zIndex: 50,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ padding: "6px 8px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Previous Runs
            </div>
            {sortedRuns.slice(0, 12).map((run) => {
              const isLoading = loadingReplay === run.id;
              const agentCount = [run.aura_output, run.flux_output, run.oracle_output, run.edge_output, run.clause_output, run.lucifer_output, run.sigma_output].filter((v) => v != null).length;
              const variant = agentCount >= 7 ? "FULL" : run.source === "scanner" ? "SNAP" : "PARTIAL";
              const variantColor = variant === "FULL" ? "#30d158" : variant === "SNAP" ? "#ff9f0a" : "#0a84ff";
              return (
                <button
                  key={run.id}
                  onClick={() => handleReplayRun(run.id)}
                  disabled={isLoading}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: isLoading ? "rgba(10,132,255,0.10)" : "transparent",
                    cursor: isLoading ? "wait" : "pointer",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: variantColor, letterSpacing: "0.08em", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                      {variant}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.36)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                      {fmtTime(run.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>
                      {run.decision ?? "PENDING"}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.36)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                      {run.confidence != null ? `${run.confidence}%` : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main pipeline button */}
        {!pipeline.running ? (
          <button
            onClick={handleRunPipeline}
            data-testid="run-pipeline-btn"
            disabled={!market}
            style={{
              flex: 1,
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
            <span>{t("runPipeline")}</span>
          </button>
        ) : (
          <button
            onClick={handleStopPipeline}
            data-testid="stop-pipeline-btn"
            style={{
              flex: 1,
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
              }
            : undefined
        }
      />

      {/* Pipeline duration timeline */}
      <PipelineTimeline />

      <DualMarketPanel />

      {/* Quantik Relay */}
      <RelayChat slug={slug} />

      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal />
    </div>
  );
}
