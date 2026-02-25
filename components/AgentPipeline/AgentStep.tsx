"use client";

import { useState, type ReactNode } from "react";

export interface AgentStepProps {
  emoji: string;
  name: string;
  status: "idle" | "running" | "done" | "error";
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

export function AgentStep({ emoji, name, status, latencyMs, summary, children }: AgentStepProps) {
  const [expanded, setExpanded] = useState(false);

  const statusDotClass = `status-dot status-dot-${status}`;

  return (
    <div style={{ position: "relative" }}>
      {/* Main row — always visible */}
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
          borderRadius: 12,
          transition: "background 200ms ease",
          textAlign: "left",
          color: "inherit",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Status dot */}
        <div className={statusDotClass} />

        {/* Emoji + Name */}
        <span style={{ fontSize: "var(--text-body)" }}>{emoji}</span>
        <span
          className="text-headline"
          style={{
            color: status === "idle" ? "var(--text-tertiary)" : "var(--text-primary)",
            flex: 1,
          }}
        >
          {name}
        </span>

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
          }}
        >
          {status === "running" ? "RUNNING..." : status.toUpperCase()}
        </span>

        {/* Latency badge */}
        {latencyMs !== undefined && status === "done" && (
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-caption)",
              color: "var(--text-tertiary)",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
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
          }}
        >
          ▸
        </span>
      </button>

      {/* Summary line (visible when done, collapsed) */}
      {summary && !expanded && status === "done" && (
        <div style={{ padding: "0 16px 8px 36px" }}>
          <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>
            {summary}
          </span>
        </div>
      )}

      {/* Expanded content */}
      <div
        style={{
          maxHeight: expanded ? 600 : 0,
          overflow: "hidden",
          transition: "max-height 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <div className="glass-card-elevated" style={{ margin: "4px 8px 8px", padding: 16, borderRadius: 14 }}>
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
        fontSize: "var(--text-caption)",
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
      dangerouslySetInnerHTML={{ __html: syntaxHighlight(raw) }}
    />
  );
}
