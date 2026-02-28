"use client";

import { useState, useEffect, type ReactNode } from "react";

export interface AgentStepProps {
  emoji: string;
  name: string;
  role?: string;
  status: "idle" | "running" | "done" | "error";
  agentColor?: string;
  latencyMs?: number;
  summary?: string;
  children?: ReactNode;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\bnull\b)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-string";
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function AgentStep({ emoji, name, role, status, agentColor, latencyMs, summary, children }: AgentStepProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when running, auto-expand sigma when done
  useEffect(() => {
    if (status === "running") setExpanded(true);
  }, [status]);

  const statusDotClass = `status-dot status-dot-${status}`;
  const isRunning = status === "running";

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        marginBottom: 8,
        borderLeft: isRunning ? `2px solid ${agentColor ?? "var(--ios-blue)"}` : "2px solid transparent",
        boxShadow: isRunning
          ? `inset 3px 0 12px -4px ${agentColor ?? "var(--ios-blue)"}40, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
          : undefined,
        transition: "border-color 300ms ease, box-shadow 300ms ease",
        minHeight: 64,
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderRadius: 16,
          transition: "background 200ms ease",
          textAlign: "left",
          color: "inherit",
          minHeight: 64,
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Status dot */}
        <div className={statusDotClass} />

        {/* Emoji + Name + Role */}
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="text-headline"
            style={{
              color: status === "idle" ? "var(--text-tertiary)" : "var(--text-primary)",
              display: "block",
            }}
          >
            {name}
          </span>
          {role && (
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginTop: 1 }}>
              {role}
            </span>
          )}
        </div>

        {/* Summary (one-line when done and not expanded) */}
        {summary && status === "done" && !expanded && (
          <span
            className="text-caption"
            style={{
              color: "var(--text-secondary)",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
            }}
          >
            {summary}
          </span>
        )}

        {/* Status label */}
        <span
          className="text-caption font-mono-data"
          style={{
            color:
              status === "running"
                ? "var(--ios-blue)"
                : status === "done"
                ? "var(--ios-green)"
                : status === "error"
                ? "var(--ios-red)"
                : "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          {status === "running" ? "RUNNING..." : status === "done" ? "\u2713 DONE" : status === "error" ? "\u2717 ERROR" : "IDLE"}
        </span>

        {/* Latency badge */}
        {latencyMs !== undefined && status === "done" && (
          <span
            className="font-mono-data"
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}
          >
            {(latencyMs / 1000).toFixed(1)}s
          </span>
        )}

        {/* Expand chevron */}
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: 12,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            flexShrink: 0,
          }}
        >
          &#x25B8;
        </span>
      </button>

      {/* Expanded content */}
      <div
        style={{
          maxHeight: expanded ? 600 : 0,
          overflow: "hidden",
          transition: "max-height 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <div className="glass-card-elevated" style={{ margin: "0 8px 8px", padding: 16, borderRadius: 14 }}>
          {children ? (
            children
          ) : (
            <span className="text-body" style={{ color: "var(--text-tertiary)" }}>
              No data available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Render agent data as syntax-highlighted JSON */
export function AgentDataView({ data }: { data: unknown }) {
  if (!data) return null;
  const raw = JSON.stringify(data, null, 2);
  return (
    <pre
      className="font-mono-data"
      style={{
        fontSize: 11,
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
      dangerouslySetInnerHTML={{ __html: syntaxHighlight(raw) }}
    />
  );
}
