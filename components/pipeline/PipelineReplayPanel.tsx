"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type PipelineHistoryRun,
  type PipelineReplayFrame,
} from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";

import { fmtTime } from "@/lib/formatters";

function formatRelativeDuration(run: PipelineHistoryRun): string {
  if (!run.completed_at) return "in progress";
  return `${((run.completed_at - run.created_at) / 1000).toFixed(1)}s`;
}

function availableAgentCount(run: PipelineHistoryRun): number {
  if (Array.isArray(run.available_agents)) return run.available_agents.length;
  return [
    run.aura_output,
    run.flux_output,
    run.oracle_output,
    run.edge_output,
    run.clause_output,
    run.lucifer_output,
    run.sigma_output,
  ].filter((value) => value != null).length;
}

function runVariantLabel(run: PipelineHistoryRun): string {
  return availableAgentCount(run) >= 7 ? "FULL" : run.source === "scanner" ? "SNAPSHOT" : "PARTIAL";
}

function sortRunsForReplay(runs: PipelineHistoryRun[]): PipelineHistoryRun[] {
  return [...runs].sort((left, right) => {
    const availableDelta = availableAgentCount(right) - availableAgentCount(left);
    if (availableDelta !== 0) return availableDelta;
    if ((right.source ?? "pipeline") !== (left.source ?? "pipeline")) {
      return right.source === "pipeline" ? 1 : -1;
    }
    return right.created_at - left.created_at;
  });
}

function frameTone(frame: PipelineReplayFrame): {
  border: string;
  bg: string;
  text: string;
} {
  if (frame.type.endsWith("error")) {
    return {
      border: "rgba(255,69,58,0.24)",
      bg: "rgba(255,69,58,0.08)",
      text: "#ff453a",
    };
  }
  if (frame.type === "trade:rejected") {
    return {
      border: "rgba(255,159,10,0.24)",
      bg: "rgba(255,159,10,0.08)",
      text: "#ff9f0a",
    };
  }
  if (frame.type.includes("complete") || frame.type === "trade:executed") {
    return {
      border: "rgba(48,209,88,0.24)",
      bg: "rgba(48,209,88,0.08)",
      text: "#30d158",
    };
  }
  return {
    border: "rgba(10,132,255,0.24)",
    bg: "rgba(10,132,255,0.08)",
    text: "#0a84ff",
  };
}

function summarizeFrame(frame: PipelineReplayFrame): string {
  if (typeof frame.error === "string" && frame.error) return frame.error;
  if (!frame.data || typeof frame.data !== "object") {
    return frame.type === "pipeline:start"
      ? "Pipeline opened."
      : frame.type === "pipeline:complete"
        ? "Pipeline finished."
        : "No payload.";
  }

  const data = frame.data as Record<string, unknown>;
  if (frame.agent === "sigma") {
    const decision = String(data.decision ?? data.status ?? "done");
    const confidence =
      typeof data.confidence === "number" ? `${data.confidence}%` : null;
    return confidence ? `${decision} at ${confidence}` : decision;
  }
  if (frame.agent === "oracle" && typeof data.calibrated_prob === "number") {
    return `P(YES) ${(data.calibrated_prob * 100).toFixed(0)}%`;
  }
  if (frame.agent === "edge" && typeof data.net_ev === "number") {
    return `Net EV ${data.net_ev}`;
  }
  if (frame.type.startsWith("trade:")) {
    const status = String(data.status ?? data.execution_mode ?? frame.status);
    const orderId = data.orderId ? ` · ${String(data.orderId)}` : "";
    return `${status}${orderId}`;
  }
  if (typeof data.thesis === "string") return data.thesis;
  if (typeof data.summary === "string") return data.summary;
  return JSON.stringify(data).slice(0, 120);
}

interface PipelineReplayPanelProps {
  slug?: string;
  title?: string;
}

export function PipelineReplayPanel({
  slug,
  title = "Pipeline Replay",
}: PipelineReplayPanelProps) {
  const pipelineLoadReplay = useQuantikStore((s) => s.pipelineLoadReplay);
  const [runs, setRuns] = useState<PipelineHistoryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [frames, setFrames] = useState<PipelineReplayFrame[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingRuns(true);
    api.getPipelineHistory()
      .then((history) => {
        if (!active) return;
        setRuns(history);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoadingRuns(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredRuns = useMemo(() => {
    if (!slug) return runs;
    return runs.filter((run) => run.market_slug === slug);
  }, [runs, slug]);

  const prioritizedRuns = useMemo(
    () => sortRunsForReplay(filteredRuns),
    [filteredRuns]
  );

  useEffect(() => {
    if (prioritizedRuns.length === 0) {
      setSelectedRunId(null);
      setFrames([]);
      return;
    }

    if (!selectedRunId || !prioritizedRuns.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(prioritizedRuns[0].id);
    }
  }, [prioritizedRuns, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;
    setLoadingFrames(true);
    setError(null);
    api.getPipelineReplay(selectedRunId)
      .then((payload) => {
        if (!active) return;
        setFrames(payload.frames);
        pipelineLoadReplay(payload.run, payload.frames);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoadingFrames(false);
      });

    return () => {
      active = false;
    };
  }, [pipelineLoadReplay, selectedRunId]);

  const selectedRun =
    prioritizedRuns.find((run) => run.id === selectedRunId) ?? prioritizedRuns[0] ?? null;

  // Hide entire panel when no previous scans exist for this market
  if (!loadingRuns && prioritizedRuns.length === 0) return null;

  return (
    <section className="glass-card glass-panel-compact" style={{ borderRadius: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.03em",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "rgba(255,255,255,0.40)",
              lineHeight: 1.5,
            }}
          >
            Replay persisted pipeline steps for the selected run.
          </p>
        </div>
        {selectedRun ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.48)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              textAlign: "right",
            }}
          >
            <div>{selectedRun.decision ?? "PENDING"}</div>
            <div>{formatRelativeDuration(selectedRun)}</div>
          </div>
        ) : null}
      </div>

      {loadingRuns ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>
          Loading replay history...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {prioritizedRuns.slice(0, 12).map((run) => {
              const active = run.id === selectedRunId;
              const variant = runVariantLabel(run);
              const variantColor =
                variant === "FULL"
                  ? "#30d158"
                  : variant === "SNAPSHOT"
                    ? "#ff9f0a"
                    : "#0a84ff";
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: active
                      ? "1px solid rgba(10,132,255,0.28)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(10,132,255,0.10)"
                      : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: variantColor,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      }}
                    >
                      {variant}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.36)",
                        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      }}
                    >
                      {availableAgentCount(run)}/7 agents
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.82)",
                      lineHeight: 1.4,
                    }}
                  >
                    {run.market_question || run.market_slug}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.42)",
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    }}
                  >
                    <span>{fmtTime(run.created_at)}</span>
                    <span>{run.decision ?? "PENDING"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {selectedRun && availableAgentCount(selectedRun) < 7 ? (
              <div
                style={{
                  borderRadius: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,159,10,0.18)",
                  background: "rgba(255,159,10,0.08)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.5,
                }}
              >
                This entry is a scanner snapshot, not a full pipeline replay. Full replays are prioritized above it, and missing agents were never recorded for that scan.
              </div>
            ) : null}
            {loadingFrames ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>
                Loading replay frames...
              </div>
            ) : error ? (
              <div style={{ fontSize: 13, color: "#ff453a" }}>{error}</div>
            ) : frames.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>
                No replay frames recorded for this run.
              </div>
            ) : (
              frames.map((frame) => {
                const tone = frameTone(frame);
                return (
                  <div
                    key={`${frame.index}-${frame.type}-${frame.timestamp}`}
                    style={{
                      border: `1px solid ${tone.border}`,
                      background: tone.bg,
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: tone.text,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                        }}
                      >
                        {frame.agent ? `${frame.agent} · ${frame.type}` : frame.type}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.42)",
                          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                        }}
                      >
                        {fmtTime(frame.timestamp)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.78)",
                        lineHeight: 1.5,
                      }}
                    >
                      {summarizeFrame(frame)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
