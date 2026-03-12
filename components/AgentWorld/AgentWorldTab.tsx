"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PhaserBridge } from "./PhaserBridge";
import { useWorldBridge } from "./useWorldBridge";
import { useQuantikStore } from "@/store/useQuantikStore";
import { getRoomByAgentKey, getRoomById, type RoomDef } from "./config/worldMap";
import { getAgentLore, ROOM_DESCRIPTIONS, type AgentLore } from "./config/agentLore";

// ─── Agent World Tab ──────────────────────────────────────────────────────────
// React wrapper that bootstraps and manages the Phaser 3 game instance.

export function AgentWorldTab() {
  const t = useTranslations("manageAgent.agentWorld");
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [bridge, setBridge] = useState<PhaserBridge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailAgent, setDetailAgent] = useState<string | null>(null);
  const pipeline = useQuantikStore((s) => s.pipeline);

  // Connect React state to Phaser via bridge
  useWorldBridge(bridge);

  // Listen for room/NPC detail requests from Phaser
  useEffect(() => {
    if (!bridge) return;
    const onDetail = (agentId: string) => setDetailAgent(agentId);
    bridge.on("ui:room-detail", onDetail);
    return () => { bridge.off("ui:room-detail", onDetail); };
  }, [bridge]);

  const initGame = useCallback(async () => {
    if (!containerRef.current || gameRef.current) return;

    try {
      const Phaser = (await import("phaser")).default;
      const { createGameConfig } = await import("./config/gameConfig");
      const { BootScene } = await import("./scenes/BootScene");
      const { WorldScene } = await import("./scenes/WorldScene");
      const { UIScene } = await import("./scenes/UIScene");

      const bridgeInstance = PhaserBridge.getInstance();
      setBridge(bridgeInstance);

      const config = createGameConfig(containerRef.current, [BootScene, WorldScene, UIScene]);
      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once("ready", () => setLoading(false));
      setTimeout(() => setLoading(false), 3000);
    } catch (err) {
      console.error("[AgentWorld] Failed to initialize Phaser:", err);
      setError(err instanceof Error ? err.message : "Failed to load game engine");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      PhaserBridge.destroy();
      setBridge(null);
    };
  }, [initGame]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(10,10,30,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 10, background: "rgba(10,10,30,0.98)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 11, fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              color: "rgba(255,255,255,0.6)", marginBottom: 8, letterSpacing: "0.1em",
            }}>
              {t("loading")}
            </div>
            <div style={{
              width: 120, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.06)", overflow: "hidden", margin: "0 auto",
            }}>
              <div style={{
                width: "60%", height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #30d158, #0a84ff)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 10, background: "rgba(10,10,30,0.98)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontFamily: '"SF Mono", monospace', color: "#ff453a", marginBottom: 4 }}>
              {t("loadFailed")}
            </div>
            <div style={{ fontSize: 9, fontFamily: '"SF Mono", monospace', color: "rgba(255,255,255,0.4)", maxWidth: 300 }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio: "480 / 272",
          minHeight: 300,
          imageRendering: "pixelated",
        }}
      />

      {/* Enriched Agent Detail Panel */}
      {detailAgent && (
        <AgentDetailPanel
          agentKey={detailAgent}
          pipeline={pipeline}
          onClose={() => setDetailAgent(null)}
          t={t}
        />
      )}
    </div>
  );
}

// ── Agent Detail Panel ─────────────────────────────────────────────────

function AgentDetailPanel({
  agentKey,
  pipeline,
  onClose,
  t,
}: {
  agentKey: string;
  pipeline: import("@/store/useQuantikStore").PipelineState;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<"manageAgent.agentWorld">>;
}) {
  const room: RoomDef | undefined = getRoomByAgentKey(agentKey) || getRoomById(agentKey as "aura");
  const resolvedKey = room?.agentKey || agentKey;
  const agentState = pipeline.agents[resolvedKey];
  const lore = getAgentLore(resolvedKey);
  const roomDesc = ROOM_DESCRIPTIONS[agentKey];
  const accentHex = room ? `#${room.theme.accentColor.toString(16).padStart(6, "0")}` : "#888";
  const status = agentState?.status || "idle";

  // Determine title and description from translations, falling back to lore/roomDesc
  const agentTransKey = `agents.${resolvedKey}` as const;
  const roomTransKey = `rooms.${agentKey}` as const;
  const hasAgentTrans = Boolean(lore);
  const hasRoomTrans = Boolean(roomDesc);

  const title = hasAgentTrans
    ? t(`${agentTransKey}.title` as Parameters<typeof t>[0])
    : hasRoomTrans
    ? t(`${roomTransKey}.title` as Parameters<typeof t>[0])
    : t("systemRoom");

  const description = hasAgentTrans
    ? t(`${agentTransKey}.description` as Parameters<typeof t>[0])
    : hasRoomTrans
    ? t(`${roomTransKey}.description` as Parameters<typeof t>[0])
    : "";

  const pipelinePhase = hasAgentTrans
    ? t(`${agentTransKey}.pipelinePhase` as Parameters<typeof t>[0])
    : lore?.pipelinePhase ?? "";

  const personality = hasAgentTrans
    ? (t.raw(`${agentTransKey}.personality` as Parameters<typeof t>[0]) as string[])
    : lore?.personality ?? [];

  // Status color mapping
  const statusColors: Record<string, string> = {
    done: "#30d158", running: "#ff9f0a", error: "#ff453a", idle: "#666",
  };
  const statusColor = statusColors[status] || "#666";

  // Activity text from translations
  const activityText = hasAgentTrans
    ? t(`${agentTransKey}.activityText.${status}` as Parameters<typeof t>[0])
    : (status === "idle" ? t("awaitingPipeline") : t("statusLabel", { status }));

  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      style={{
        position: "absolute", inset: 0, zIndex: 20, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", cursor: "pointer",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(10,10,30,0.94)",
          backdropFilter: "blur(12px)",
          borderLeft: `3px solid ${accentHex}`,
          border: `1px solid ${accentHex}33`,
          borderRadius: 10,
          padding: "20px 24px",
          minWidth: 300,
          maxWidth: 400,
          cursor: "default",
          animation: "scaleIn 0.15s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 8, right: 10, background: "none",
            border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
            fontSize: 18, fontFamily: "monospace", padding: "2px 4px",
          }}
        >
          x
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {lore && (
            <span style={{ fontSize: 20 }}>{lore.icon}</span>
          )}
          <span style={{
            fontSize: 18, fontFamily: '"SF Mono", monospace',
            color: accentHex, fontWeight: 700, letterSpacing: "0.08em",
          }}>
            {room?.label || agentKey.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 13, fontFamily: '"SF Mono", monospace',
          color: "rgba(255,255,255,0.5)", marginBottom: 12,
        }}>
          {title}
        </div>

        {/* Pipeline position badge */}
        {lore && (
          <div style={{
            display: "inline-block", fontSize: 11, fontFamily: '"SF Mono", monospace',
            color: accentHex, background: `${accentHex}15`,
            border: `1px solid ${accentHex}30`, borderRadius: 4,
            padding: "3px 8px", marginBottom: 12, letterSpacing: "0.05em",
          }}>
            {pipelinePhase}
          </div>
        )}

        {/* Status + Latency row */}
        {agentState && (
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <StatusPill label={status.toUpperCase()} color={statusColor} />
            {agentState.latencyMs != null && (
              <span style={{
                fontSize: 12, fontFamily: '"SF Mono", monospace',
                color: agentState.latencyMs < 500 ? "#30d158" : agentState.latencyMs < 2000 ? "#ff9f0a" : "#ff453a",
                alignSelf: "center",
              }}>
                {agentState.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <div style={{
            fontSize: 12, fontFamily: '"SF Mono", monospace',
            color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
            marginBottom: 12, borderLeft: `2px solid ${accentHex}22`,
            paddingLeft: 10,
          }}>
            {description}
          </div>
        )}

        {/* Personality traits */}
        {personality.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {personality.map((trait) => (
              <span key={trait} style={{
                fontSize: 11, fontFamily: '"SF Mono", monospace',
                color: accentHex, background: `${accentHex}12`,
                border: `1px solid ${accentHex}25`, borderRadius: 3,
                padding: "2px 8px",
              }}>
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Current activity */}
        <div style={{
          fontSize: 12, fontFamily: '"SF Mono", monospace',
          color: statusColor, marginBottom: 12, fontStyle: "italic",
        }}>
          {activityText}
        </div>

        {/* Error message */}
        {agentState?.error && (
          <div style={{
            fontSize: 11, fontFamily: '"SF Mono", monospace',
            color: "#ff453a", background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.2)", borderRadius: 4,
            padding: "6px 8px", marginBottom: 12,
          }}>
            {agentState.error.slice(0, 120)}
          </div>
        )}

        {/* Output summary (formatted instead of raw JSON) */}
        {agentState?.data != null && (
          <AgentOutputSummary data={agentState.data} accentHex={accentHex} agentKey={resolvedKey} t={t} />
        )}

        {/* Pipeline position indicator */}
        {lore && <PipelinePositionIndicator currentStep={lore.pipelineStep} agents={pipeline.agents} label={t("pipelinePosition")} />}
      </div>
    </div>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: '"SF Mono", monospace', fontWeight: 700,
      color: "#000", background: color, borderRadius: 4,
      padding: "3px 10px", letterSpacing: "0.06em",
      animation: label === "RUNNING" ? "pulse 1.5s ease-in-out infinite" : "none",
    }}>
      {label}
    </span>
  );
}

// ── Agent Output Summary ────────────────────────────────────────────

function AgentOutputSummary({ data, accentHex, agentKey, t }: {
  data: unknown;
  accentHex: string;
  agentKey: string;
  t: ReturnType<typeof useTranslations<"manageAgent.agentWorld">>;
}) {
  // Try to extract meaningful metrics from agent output
  const obj = typeof data === "object" && data !== null ? data as Record<string, unknown> : null;

  // Common metric extraction
  const metrics: { label: string; value: string; color?: string }[] = [];

  if (obj) {
    if ("probability" in obj) {
      const p = Number(obj.probability);
      metrics.push({ label: t("metrics.probability"), value: `${(p * 100).toFixed(1)}%`, color: p > 0.6 ? "#30d158" : p > 0.4 ? "#ff9f0a" : "#ff453a" });
    }
    if ("sentiment" in obj || "sentimentScore" in obj) {
      const s = Number(obj.sentiment ?? obj.sentimentScore);
      metrics.push({ label: t("metrics.sentiment"), value: s > 0 ? `+${s.toFixed(2)}` : s.toFixed(2), color: s > 0 ? "#30d158" : "#ff453a" });
    }
    if ("confidence" in obj) {
      const c = Number(obj.confidence);
      metrics.push({ label: t("metrics.confidence"), value: `${(c * 100).toFixed(0)}%` });
    }
    if ("edge" in obj) {
      const e = Number(obj.edge);
      metrics.push({ label: t("metrics.edge"), value: `${(e * 100).toFixed(1)}%`, color: e > 0 ? "#30d158" : "#ff453a" });
    }
    if ("riskScore" in obj) {
      const r = Number(obj.riskScore);
      metrics.push({ label: t("metrics.risk"), value: `${(r * 100).toFixed(0)}%`, color: r < 0.3 ? "#30d158" : r < 0.6 ? "#ff9f0a" : "#ff453a" });
    }
    if ("positionSize" in obj) {
      metrics.push({ label: t("metrics.position"), value: `${Number(obj.positionSize).toFixed(2)}` });
    }
    if ("decision" in obj || "verdict" in obj) {
      const d = String(obj.decision ?? obj.verdict);
      metrics.push({ label: t("metrics.decision"), value: d.toUpperCase(), color: d.toLowerCase().includes("go") ? "#30d158" : "#ff453a" });
    }
    if ("resolutionRisk" in obj) {
      const r = Number(obj.resolutionRisk);
      metrics.push({ label: t("metrics.resolutionRisk"), value: `${(r * 100).toFixed(0)}%`, color: r < 0.3 ? "#30d158" : "#ff453a" });
    }
  }

  if (metrics.length > 0) {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12,
      }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 4,
            padding: "6px 8px", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, fontFamily: '"SF Mono", monospace', color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 14, fontFamily: '"SF Mono", monospace', color: m.color || accentHex, fontWeight: 600 }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: show truncated JSON
  return (
    <div style={{
      fontSize: 10, fontFamily: '"SF Mono", monospace',
      color: "rgba(255,255,255,0.3)", marginBottom: 12,
      maxHeight: 60, overflow: "hidden", whiteSpace: "pre-wrap",
      background: "rgba(255,255,255,0.02)", borderRadius: 4, padding: 6,
    }}>
      {String(JSON.stringify(data, null, 1)).slice(0, 200)}
    </div>
  );
}

// ── Pipeline Position Indicator ──────────────────────────────────────

const PIPELINE_AGENTS = [
  { key: "aura", label: "A", step: 1 },
  { key: "flux", label: "F", step: 2 },
  { key: "clause", label: "C", step: 3 },
  { key: "oracle", label: "O", step: 4 },
  { key: "edge", label: "E", step: 5 },
  { key: "lucifer", label: "L", step: 6 },
  { key: "sigma", label: "S", step: 7 },
];

function PipelinePositionIndicator({
  currentStep,
  agents,
  label,
}: {
  currentStep: number;
  agents: Record<string, import("@/store/useQuantikStore").AgentCardState>;
  label: string;
}) {
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
      <div style={{ fontSize: 10, fontFamily: '"SF Mono", monospace', color: "rgba(255,255,255,0.25)", marginBottom: 6, letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {PIPELINE_AGENTS.map((agent, i) => {
          const state = agents[agent.key];
          const isCurrent = agent.step === currentStep;
          const isDone = state?.status === "done";
          const isError = state?.status === "error";
          const isRunning = state?.status === "running";

          const bg = isCurrent
            ? "rgba(255,255,255,0.15)"
            : isDone ? "rgba(48,209,88,0.2)"
            : isError ? "rgba(255,69,58,0.2)"
            : isRunning ? "rgba(255,159,10,0.2)"
            : "rgba(255,255,255,0.04)";

          const border = isCurrent
            ? "1px solid rgba(255,255,255,0.3)"
            : "1px solid transparent";

          return (
            <div key={agent.key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 3, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: bg, border, fontSize: 11,
                fontFamily: '"SF Mono", monospace', fontWeight: isCurrent ? 700 : 400,
                color: isCurrent ? "#fff" : isDone ? "#30d158" : isError ? "#ff453a" : isRunning ? "#ff9f0a" : "rgba(255,255,255,0.2)",
              }}>
                {agent.label}
              </div>
              {i < PIPELINE_AGENTS.length - 1 && (
                <div style={{
                  width: 6, height: 1,
                  background: isDone ? "rgba(48,209,88,0.3)" : "rgba(255,255,255,0.08)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

