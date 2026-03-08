"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useSocketEvent,
  type TradeEvent,
  type AgentAlertEvent,
  type PositionUpdateEvent,
} from "@/context/SocketContext";
import { api } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
  minWidth: 0,
  overflow: "hidden",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = "info" | "success" | "warning" | "error" | "scan" | "agent";

interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
  timestamp: number;
}

const MAX_ENTRIES = 80;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function slugToLabel(slug: string): string {
  if (slug.length > 40) return slug.slice(0, 37) + "...";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function levelStyle(level: LogLevel): { color: string; badge: string; badgeBg: string } {
  switch (level) {
    case "success":
      return { color: "rgba(48,209,88,0.85)", badge: "OK", badgeBg: "rgba(48,209,88,0.12)" };
    case "warning":
      return { color: "rgba(255,159,10,0.85)", badge: "WARN", badgeBg: "rgba(255,159,10,0.12)" };
    case "error":
      return { color: "rgba(255,69,58,0.85)", badge: "ERR", badgeBg: "rgba(255,69,58,0.12)" };
    case "scan":
      return { color: "rgba(10,132,255,0.85)", badge: "SCAN", badgeBg: "rgba(10,132,255,0.12)" };
    case "agent":
      return { color: "rgba(191,90,242,0.85)", badge: "AGENT", badgeBg: "rgba(191,90,242,0.12)" };
    default:
      return { color: "rgba(255,255,255,0.50)", badge: "SYS", badgeBg: "rgba(255,255,255,0.06)" };
  }
}

function confLabel(c: number): string {
  const pct = c > 1 ? c : c * 100;
  return `${Math.round(pct)}%`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SystemLogFeed() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [filter, setFilter] = useState<"all" | "scan" | "agent" | "trade">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEntry = useCallback((entry: Omit<LogEntry, "id">) => {
    setEntries((prev) => {
      const newEntry = { ...entry, id: `${Date.now()}-${Math.random()}` };
      return [newEntry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  // ─── Seed with historical backend data ──────────────────────────────────────

  useEffect(() => {
    let active = true;

    async function seedLog() {
      const [scanStatus, scanResults, pipelineHistory, execLog, alertData] = await Promise.allSettled([
        api.getScannerStatus(),
        api.getScannerResults(30),
        api.getPipelineHistory(),
        api.getExecutionLog(),
        api.getAlertStatus(),
      ]);

      if (!active) return;

      const historical: LogEntry[] = [];

      // ── Scanner status summary
      if (scanStatus.status === "fulfilled" && scanStatus.value) {
        const s = scanStatus.value;
        historical.push({
          id: "scanner-status",
          level: s.isRunning ? "scan" : "info",
          source: "scanner",
          message: s.isRunning
            ? `Scanner active — ${s.marketsChecked} markets monitored, ${s.scannedToday} scanned today`
            : `Scanner idle — last scan: ${s.lastScan ?? "never"}`,
          detail: s.circuitBreakerTriggered
            ? "Circuit breaker TRIGGERED — trading halted"
            : `${s.alertsTriggered} alerts triggered, ${s.tradesToday} trades today${s.paperMode ? " [PAPER]" : ""}`,
          timestamp: Date.now(),
        });
      }

      // ── Scanner results — individual market scans
      if (scanResults.status === "fulfilled") {
        for (const scan of scanResults.value.slice(0, 15)) {
          const label = slugToLabel(scan.slug);
          const conf = confLabel(scan.sigmaConfidence);
          const kelly = (scan.kellyFraction * 100).toFixed(1);
          const rec = scan.recommendation?.toUpperCase() ?? "—";
          historical.push({
            id: `scan-${scan.scannedAt}-${scan.slug}`,
            level: "scan",
            source: "scanner",
            message: `Scanned ${label}`,
            detail: `Sigma: ${conf} | Kelly: ${kelly}% | Rec: ${rec} | Prob: ${(scan.probability * 100).toFixed(0)}%`,
            timestamp: scan.scannedAt,
          });
        }
      }

      // ── Pipeline runs — agent analysis
      if (pipelineHistory.status === "fulfilled") {
        for (const run of pipelineHistory.value.slice(0, 15)) {
          const label = run.market_question || slugToLabel(run.market_slug);
          const conf = run.confidence != null ? confLabel(run.confidence) : "—";
          const dec = run.decision?.toUpperCase() ?? "PENDING";
          const duration = run.completed_at && run.created_at
            ? `${((run.completed_at - run.created_at) / 1000).toFixed(1)}s`
            : "in progress";

          historical.push({
            id: `pipeline-${run.id}`,
            level: "agent",
            source: "pipeline",
            message: `Pipeline: ${label}`,
            detail: `Decision: ${dec} | Confidence: ${conf} | Duration: ${duration}`,
            timestamp: run.created_at,
          });
        }
      }

      // ── Execution log — trade executions
      if (execLog.status === "fulfilled") {
        for (const exec of execLog.value.slice(0, 15)) {
          const dir = exec.side === "buy" ? "YES" : "NO";
          const label = slugToLabel(exec.slug);
          const pnlStr = exec.pnl != null ? ` | P&L: ${exec.pnl >= 0 ? "+" : ""}$${exec.pnl.toFixed(2)}` : "";
          const mode = exec.status === "paper" ? " [PAPER]" : "";
          historical.push({
            id: `exec-${exec.executed_at}-${exec.slug}`,
            level: exec.pnl != null && exec.pnl >= 0 ? "success" : exec.pnl != null ? "error" : "info",
            source: "execution",
            message: `Executed ${dir} $${exec.amount.toFixed(2)} on ${label}${mode}`,
            detail: `Status: ${exec.status.toUpperCase()}${pnlStr}`,
            timestamp: exec.executed_at,
          });
        }
      }

      // ── Alert events
      if (alertData.status === "fulfilled") {
        for (const alert of alertData.value.alerts.slice(0, 8)) {
          const status = alert.alert_sent === 2 ? "APPROVED" : alert.alert_sent === -1 ? "VETOED" : "PENDING";
          const conf = confLabel(alert.confidence);
          historical.push({
            id: `alert-${alert.id}`,
            level: alert.alert_sent === 2 ? "success" : alert.alert_sent === -1 ? "warning" : "info",
            source: "alerts",
            message: `Alert ${status}: ${alert.question || slugToLabel(alert.slug)}`,
            detail: `Confidence: ${conf} | State: ${alert.signal_state ?? "—"}`,
            timestamp: alert.created_at,
          });
        }
      }

      // Sort by timestamp descending
      historical.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(historical.slice(0, MAX_ENTRIES));
      setSeeded(true);
    }

    seedLog();

    // Re-fetch every 30s for scanner activity
    const interval = setInterval(() => {
      if (!active) return;
      Promise.allSettled([
        api.getScannerResults(5),
        api.getScannerStatus(),
      ]).then(([newScans, newStatus]) => {
        if (!active) return;
        const fresh: Omit<LogEntry, "id">[] = [];

        if (newStatus.status === "fulfilled" && newStatus.value) {
          const s = newStatus.value;
          fresh.push({
            level: "scan",
            source: "scanner",
            message: `Scanner heartbeat — ${s.marketsChecked} markets, ${s.scannedToday} scans today`,
            timestamp: Date.now(),
          });
        }

        if (newScans.status === "fulfilled") {
          for (const scan of newScans.value.slice(0, 3)) {
            fresh.push({
              level: "scan",
              source: "scanner",
              message: `Scanned ${slugToLabel(scan.slug)}`,
              detail: `Sigma: ${confLabel(scan.sigmaConfidence)} | Kelly: ${(scan.kellyFraction * 100).toFixed(1)}% | Rec: ${scan.recommendation?.toUpperCase() ?? "—"}`,
              timestamp: scan.scannedAt,
            });
          }
        }

        for (const f of fresh) addEntry(f);
      });
    }, 30_000);

    return () => { active = false; clearInterval(interval); };
  }, [addEntry]);

  // ─── Real-time socket subscriptions ──────────────────────────────────────────

  useSocketEvent<TradeEvent>("trade:executed", useCallback(
    (data: TradeEvent) => {
      addEntry({
        level: "success",
        source: "execution",
        message: `Executed ${data.direction} on ${slugToLabel(data.slug)}`,
        detail: data.paper ? "Paper trade" : "Live trade",
        timestamp: data.timestamp,
      });
    },
    [addEntry]
  ));

  useSocketEvent<AgentAlertEvent>("agent:alert", useCallback(
    (data: AgentAlertEvent) => {
      addEntry({
        level: data.type === "risk" ? "warning" : "agent",
        source: "alerts",
        message: data.title || data.message,
        detail: data.message !== data.title ? data.message : undefined,
        timestamp: data.timestamp,
      });
    },
    [addEntry]
  ));

  useSocketEvent<PositionUpdateEvent>("position:update", useCallback(
    (data: PositionUpdateEvent) => {
      addEntry({
        level: data.pnl >= 0 ? "success" : "warning",
        source: "positions",
        message: `Position ${slugToLabel(data.slug)} updated`,
        detail: `P&L: ${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)}`,
        timestamp: data.timestamp,
      });
    },
    [addEntry]
  ));

  // ─── Filtering ─────────────────────────────────────────────────────────────

  const filtered = filter === "all"
    ? entries
    : filter === "scan"
    ? entries.filter((e) => e.source === "scanner")
    : filter === "agent"
    ? entries.filter((e) => e.source === "pipeline" || e.source === "alerts")
    : entries.filter((e) => e.source === "execution" || e.source === "positions");

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={panelStyle}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: expanded ? 10 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            System Log
          </h3>
          {seeded && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#30d158",
                animation: "pulse 2s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
          )}
          {entries.length > 0 && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: '"SF Mono", monospace' }}>
              {entries.length}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.40)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 220ms ease",
            display: "inline-block",
          }}
        >
          ›
        </span>
      </button>

      {expanded && (
        <>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["all", "scan", "agent", "trade"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: filter === f ? "rgba(255,255,255,0.10)" : "transparent",
                  color: filter === f ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.30)",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: '"SF Mono", monospace',
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Log feed */}
          <div
            ref={scrollRef}
            style={{
              maxHeight: 320,
              overflowY: "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {!seeded ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                Loading system activity...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.20)", fontSize: 11 }}>
                No {filter === "all" ? "" : filter + " "}events recorded
              </div>
            ) : (
              filtered.map((entry) => {
                const style = levelStyle(entry.level);
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "5px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.025)",
                      minWidth: 0,
                    }}
                  >
                    {/* Time */}
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", flexShrink: 0, marginTop: 2, width: 56 }}>
                      {formatTime(entry.timestamp)}
                    </span>

                    {/* Level badge */}
                    <span
                      style={{
                        padding: "1px 4px",
                        borderRadius: 3,
                        background: style.badgeBg,
                        color: style.color,
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                        minWidth: 32,
                        textAlign: "center",
                        marginTop: 1,
                      }}
                    >
                      {style.badge}
                    </span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.65)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.message}
                      </div>
                      {entry.detail && (
                        <div
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.28)",
                            marginTop: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
