"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Version {
  id: number;
  version: string;
  released_at: string;
  highlight: string;
  features: string[];
  fixes: string[];
}

// ─── VersionLog Panel ─────────────────────────────────────────────────────────

function VersionLogPanel({ onClose }: { onClose: () => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/versions`)
      .then((r) => r.json())
      .then((data) => {
        setVersions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        paddingTop: 72,
        paddingLeft: 228,
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "relative",
          zIndex: 1,
          width: 420,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "rgba(8,8,14,0.97)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
          padding: "20px 0 8px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span
              style={{
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.12em",
              }}
            >
              CHANGELOG
            </span>
            {!loading && !error && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 100,
                  background: "rgba(10,132,255,0.12)",
                  border: "1px solid rgba(10,132,255,0.25)",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#0a84ff",
                }}
              >
                {versions.length} releases
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "8px 0" }}>
          {loading && (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "rgba(255,255,255,0.25)",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              Loading changelog...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "rgba(255,69,58,0.7)",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              Changelog unavailable
            </div>
          )}

          {!loading &&
            !error &&
            versions.map((v, i) => (
              <div
                key={v.id}
                style={{
                  padding: "16px 20px",
                  borderBottom:
                    i < versions.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                {/* Version header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 100,
                      background: i === 0
                        ? "rgba(10,132,255,0.18)"
                        : "rgba(255,255,255,0.06)",
                      border: `1px solid ${i === 0 ? "rgba(10,132,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                      fontFamily: '"SF Mono","JetBrains Mono",monospace',
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? "#0a84ff" : "rgba(255,255,255,0.55)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {v.version}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "rgba(255,255,255,0.22)",
                    }}
                  >
                    {v.released_at}
                  </span>
                  {i === 0 && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: "rgba(48,209,88,0.12)",
                        border: "1px solid rgba(48,209,88,0.25)",
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "#30d158",
                        letterSpacing: "0.06em",
                      }}
                    >
                      LATEST
                    </span>
                  )}
                </div>

                {/* Highlight */}
                {v.highlight && (
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13,
                      fontStyle: "italic",
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.4,
                    }}
                  >
                    {v.highlight}
                  </p>
                )}

                {/* Features */}
                {v.features.length > 0 && (
                  <div style={{ marginBottom: v.fixes.length > 0 ? 8 : 0 }}>
                    {v.features.map((f, fi) => (
                      <div
                        key={fi}
                        style={{
                          display: "flex",
                          gap: 8,
                          marginBottom: 4,
                          fontSize: 12,
                          color: "rgba(255,255,255,0.65)",
                          lineHeight: 1.4,
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(48,209,88,0.85)",
                            flexShrink: 0,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          ✦
                        </span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fixes */}
                {v.fixes.length > 0 && (
                  <div>
                    {v.fixes.map((fix, fi) => (
                      <div
                        key={fi}
                        style={{
                          display: "flex",
                          gap: 8,
                          marginBottom: 4,
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                          lineHeight: 1.4,
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,159,10,0.7)",
                            flexShrink: 0,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          ⬡
                        </span>
                        <span>{fix}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── VersionLogButton — trigger + state manager ───────────────────────────────

export function VersionLogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        title="View changelog"
        aria-label="Open changelog"
        style={{
          background: open
            ? "rgba(10,132,255,0.15)"
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(10,132,255,0.3)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 7,
          cursor: "pointer",
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: open ? "#0a84ff" : "rgba(255,255,255,0.35)",
          transition: "all 160ms ease",
          flexShrink: 0,
        }}
      >
        📋
      </button>

      {open && <VersionLogPanel onClose={() => setOpen(false)} />}
    </>
  );
}

export default VersionLogPanel;
