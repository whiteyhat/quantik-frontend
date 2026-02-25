"use client";

import { AgentStatus } from "@/store/useQuantikStore";

interface AgentCardProps {
  title: string;
  agent: string;
  status: AgentStatus;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const statusConfig: Record<AgentStatus, { label: string; color: string; animate: boolean }> = {
  idle: { label: "IDLE", color: "#606080", animate: false },
  running: { label: "RUNNING", color: "#ffaa00", animate: true },
  done: { label: "DONE", color: "#00ff88", animate: false },
  error: { label: "ERROR", color: "#ff4444", animate: false },
};

export function AgentCard({ title, agent, status, fullWidth, children }: AgentCardProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className={`rounded p-3 relative ${fullWidth ? "col-span-2" : ""}`}
      style={{
        background: '#14141f',
        border: `1px solid ${status === 'running' ? '#ffaa00' : status === 'done' ? '#1e2e1e' : '#1e1e2e'}`,
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4488ff' }}>
            {agent}
          </span>
          <span className="text-xs" style={{ color: '#606080' }}>·</span>
          <span className="text-xs" style={{ color: '#606080' }}>{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${cfg.animate ? 'agent-running' : ''}`}
            style={{ background: cfg.color }}
          />
          <span className="text-xs q-mono" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={status === 'idle' ? 'opacity-30' : ''}>
        {children}
      </div>
    </div>
  );
}
