"use client";

import { useRef } from "react";
import { useQuantikStore } from "@/store/useQuantikStore";
import { runPipeline, PipelineEvent, PipelineResult, EdgeResult, SigmaResult } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PipelineControlsProps {
  slug: string;
}

export function PipelineControls({ slug }: PipelineControlsProps) {
  const stopRef = useRef<(() => void) | null>(null);

  const {
    pipeline,
    pipelineStart,
    pipelineAgentEvent,
    pipelineComplete,
    pipelineReset,
    openTradeModal,
    wallet,
  } = useQuantikStore((s) => ({
    pipeline: s.pipeline,
    pipelineStart: s.pipelineStart,
    pipelineAgentEvent: s.pipelineAgentEvent,
    pipelineComplete: s.pipelineComplete,
    pipelineReset: s.pipelineReset,
    openTradeModal: s.openTradeModal,
    wallet: s.wallet,
  }));

  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

  function handleRun() {
    if (pipeline.running) {
      stopRef.current?.();
      pipelineReset();
      return;
    }

    pipelineStart();

    stopRef.current = runPipeline(
      slug,
      (event: PipelineEvent) => {
        pipelineAgentEvent(event);
      },
      (result: PipelineResult) => {
        pipelineComplete(result);
      },
      (err: Error) => {
        console.error("Pipeline error:", err);
        pipelineComplete({});
      }
    );
  }

  // Determine if Execute Trade should be enabled
  const sigma = pipeline.result?.sigma as SigmaResult | undefined;
  const edge = pipeline.result?.edge as EdgeResult | undefined;
  const edgeGrade = edge?.ev_grade ?? "PASS";
  const hasDecision = sigma && sigma.decision !== "PASS";
  const edgeGood = edgeGrade === "A" || edgeGrade === "B";
  const canExecute = hasDecision && edgeGood && !pipeline.running;

  function handleExecute() {
    if (!canExecute || !sigma || !market) return;

    openTradeModal({
      slug,
      tokenId: market.tokenId,
      sigma,
      edge: edge!,
      market: {
        question: market.question,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
      },
    });
  }

  // Status text
  const statusText = pipeline.running
    ? "Pipeline running..."
    : pipeline.result
    ? "Analysis complete"
    : "Ready";

  const statusColor = pipeline.running ? '#ffaa00' : pipeline.result ? '#00ff88' : '#606080';

  return (
    <div
      className="q-card p-4 flex items-center justify-between"
    >
      {/* Left: status */}
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${pipeline.running ? 'agent-running' : ''}`}
          style={{ background: statusColor }}
        />
        <span className="text-xs q-mono" style={{ color: statusColor }}>
          {statusText}
        </span>

        {/* Agent completion counts */}
        {(pipeline.running || pipeline.result) && (
          <span className="text-xs q-mono" style={{ color: '#606080' }}>
            {Object.values(pipeline.agents).filter((a) => a.status === 'done').length}
            /7 agents done
          </span>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-3">
        {pipeline.result && (
          <button
            onClick={pipelineReset}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{
              color: '#606080',
              border: '1px solid #1e1e2e',
            }}
          >
            Reset
          </button>
        )}

        {/* Run/Stop Pipeline */}
        <button
          onClick={handleRun}
          disabled={false}
          className="text-xs px-4 py-2 rounded font-semibold flex items-center gap-2 transition-all"
          style={{
            background: pipeline.running ? 'rgba(255,68,68,0.1)' : 'rgba(68,136,255,0.1)',
            color: pipeline.running ? '#ff4444' : '#4488ff',
            border: `1px solid ${pipeline.running ? 'rgba(255,68,68,0.4)' : 'rgba(68,136,255,0.4)'}`,
          }}
        >
          {pipeline.running ? '■ Stop' : '▶ Run Pipeline'}
        </button>

        {/* Execute Trade */}
        <button
          onClick={handleExecute}
          disabled={!canExecute}
          className="text-xs px-4 py-2 rounded font-semibold flex items-center gap-2 transition-all"
          style={{
            background: canExecute ? 'rgba(0,255,136,0.15)' : 'rgba(30,30,46,0.5)',
            color: canExecute ? '#00ff88' : '#606080',
            border: `1px solid ${canExecute ? 'rgba(0,255,136,0.4)' : '#1e1e2e'}`,
            cursor: canExecute ? 'pointer' : 'not-allowed',
          }}
          title={!canExecute ? 'Requires Sigma decision + Edge grade A or B' : ''}
        >
          {canExecute ? '⚡ Execute Trade' : '⚡ Execute Trade'}
        </button>
      </div>
    </div>
  );
}
