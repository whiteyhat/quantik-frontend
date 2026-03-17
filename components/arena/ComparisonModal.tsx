"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { type ArenaComparisonAgent, type ArenaWindow } from "@/lib/api";
import { useArenaComparisonQuery } from "@/components/dashboard/dashboardQueries";
import { formatSignedCurrency } from "@/components/arena/arenaHelpers";
import { AnimatedCounter } from "@/components/arena/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

function ComparisonBar({
  label,
  left,
  right,
  format = (v) => v.toLocaleString(),
  delay = 0,
}: {
  label: string;
  left: number;
  right: number;
  format?: (v: number) => string;
  delay?: number;
}) {
  const max = Math.max(Math.abs(left), Math.abs(right), 1);
  const leftPct = (Math.abs(left) / max) * 100;
  const rightPct = (Math.abs(right) / max) * 100;
  const leftWins = Math.abs(left) > Math.abs(right);
  const rightWins = Math.abs(right) > Math.abs(left);

  return (
    <div className="arena-compare-metric" style={{ "--bar-delay": `${delay}ms` } as React.CSSProperties}>
      <div className="arena-compare-metric-label">{label}</div>
      <div className="arena-compare-bars">
        <div className="arena-compare-bar-left">
          <span className={`arena-compare-value ${leftWins ? "arena-compare-value--winner" : ""}`}>
            <AnimatedCounter value={left} format={format} />
          </span>
          <div className="arena-compare-bar-track arena-compare-bar-track--left">
            <div
              className={`arena-compare-bar-fill ${leftWins ? "arena-compare-bar-fill--winner" : ""}`}
              style={{ width: `${leftPct}%` }}
            />
          </div>
        </div>
        <div className="arena-compare-divider" />
        <div className="arena-compare-bar-right">
          <div className="arena-compare-bar-track arena-compare-bar-track--right">
            <div
              className={`arena-compare-bar-fill ${rightWins ? "arena-compare-bar-fill--winner" : ""}`}
              style={{ width: `${rightPct}%` }}
            />
          </div>
          <span className={`arena-compare-value ${rightWins ? "arena-compare-value--winner" : ""}`}>
            <AnimatedCounter value={right} format={format} />
          </span>
        </div>
      </div>
    </div>
  );
}

function SparklineOverlay({
  data1,
  data2,
}: {
  data1: Array<{ pnl: number }>;
  data2: Array<{ pnl: number }>;
}) {
  const width = 280;
  const height = 80;
  const padding = 2;

  const allPnls = [...data1.map((d) => d.pnl), ...data2.map((d) => d.pnl)];
  const min = Math.min(...allPnls);
  const max = Math.max(...allPnls);
  const range = max - min || 1;

  function toPoints(data: Array<{ pnl: number }>) {
    return data
      .map((d, i) => {
        const x = padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2);
        const y = padding + (1 - (d.pnl - min) / range) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="arena-compare-sparkline">
      {data1.length >= 2 && (
        <polyline points={toPoints(data1)} fill="none" stroke="rgba(87,216,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {data2.length >= 2 && (
        <polyline points={toPoints(data2)} fill="none" stroke="rgba(255,217,102,0.8)" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function AgentColumn({ agent, color }: { agent: ArenaComparisonAgent; color: string }) {
  return (
    <div className="arena-compare-agent">
      <div className="arena-compare-agent-head">
        <div className="arena-compare-avatar" style={{ borderColor: color }}>{agent.avatarEmoji}</div>
        <div>
          <div className="arena-compare-name">{agent.name}</div>
          <div className="arena-compare-rank">{agent.rank ? `#${agent.rank}` : "Unranked"}</div>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonModal({
  agentId1,
  agentId2,
  window: activeWindow,
  onClose,
}: {
  agentId1: string;
  agentId2: string;
  window: ArenaWindow;
  onClose: () => void;
}) {
  const query = useArenaComparisonQuery(agentId1, agentId2, activeWindow);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const data = query.data;
  const a1 = data?.agents[0];
  const a2 = data?.agents[1];

  const metrics = a1 && a2
    ? [
        { label: "Selected PnL", left: a1.selectedPnl, right: a2.selectedPnl, format: formatSignedCurrency },
        { label: "All-Time PnL", left: a1.allTimePnl, right: a2.allTimePnl, format: formatSignedCurrency },
        { label: "Win Rate", left: a1.winRate, right: a2.winRate, format: (v: number) => `${v.toFixed(1)}%` },
        { label: "Total Trades", left: a1.totalTrades, right: a2.totalTrades },
        { label: "Open Positions", left: a1.openPositions, right: a2.openPositions },
        { label: "Streak", left: a1.currentStreak, right: a2.currentStreak, format: (v: number) => (v > 0 ? `+${v}W` : v < 0 ? `${v}L` : "—") },
      ]
    : [];

  return (
    <AnimatePresence>
      <motion.div
        className="arena-compare-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="arena-compare-panel"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <button type="button" className="arena-compare-close" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>

          <div className="arena-section-kicker">Head-to-Head</div>

          {query.isLoading ? (
            <div className="arena-compare-loading">
              <Skeleton width="100%" height={200} borderRadius={16} />
            </div>
          ) : !a1 || !a2 ? (
            <div className="arena-compare-empty">Could not load comparison data</div>
          ) : (
            <>
              {/* Agent headers */}
              <div className="arena-compare-agents">
                <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
                  <AgentColumn agent={a1} color="rgba(87,216,255,0.6)" />
                </motion.div>
                <div className="arena-compare-vs">VS</div>
                <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
                  <AgentColumn agent={a2} color="rgba(255,217,102,0.6)" />
                </motion.div>
              </div>

              {/* Overlaid sparkline */}
              {(a1.sparkline.length >= 2 || a2.sparkline.length >= 2) && (
                <div className="arena-compare-chart">
                  <SparklineOverlay data1={a1.sparkline} data2={a2.sparkline} />
                  <div className="arena-compare-chart-legend">
                    <span style={{ color: "rgba(87,216,255,0.9)" }}>{a1.name}</span>
                    <span style={{ color: "rgba(255,217,102,0.9)" }}>{a2.name}</span>
                  </div>
                </div>
              )}

              {/* Metric bars */}
              <div className="arena-compare-metrics">
                {metrics.map((m, i) => (
                  <ComparisonBar
                    key={m.label}
                    label={m.label}
                    left={m.left}
                    right={m.right}
                    format={m.format}
                    delay={i * 80}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
