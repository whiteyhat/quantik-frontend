"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type Signal } from "@/lib/api";
import { SkeletonRow } from "./ui/skeleton";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function statusStyle(status: Signal["status"]): StatusStyle {
  switch (status) {
    case "TRADE":
      return {
        label: "TRADE",
        color: "#30d158",
        bg: "rgba(48,209,88,0.15)",
        border: "rgba(48,209,88,0.25)",
      };
    case "WATCH":
      return {
        label: "WATCH",
        color: "#ff9f0a",
        bg: "rgba(255,159,10,0.15)",
        border: "rgba(255,159,10,0.25)",
      };
    case "SKIP":
      return {
        label: "SKIP",
        color: "#ff453a",
        bg: "rgba(255,69,58,0.15)",
        border: "rgba(255,69,58,0.25)",
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RecentSignals() {
  const t = useTranslations("recentSignals");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSignals() {
      try {
        const data = await api.getSignals();
        if (mounted) {
          setSignals(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load signals");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSignals();
    const iv = setInterval(fetchSignals, 30_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }} data-testid="recent-signals">
      {loading ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 7 }}
          data-testid="signals-loading"
        >
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            fontSize: 13,
            color: "rgba(255,69,58,0.6)",
          }}
          data-testid="signals-error"
        >
          {error}
        </div>
      ) : signals.length === 0 ? (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
          }}
          data-testid="signals-empty"
        >
          {t("noSignals")}
        </div>
      ) : (
        signals.map((signal) => {
          const ss = statusStyle(signal.status);
          const edge = signal.edge ?? 0;
          return (
            <Link
              key={signal.id}
              href={`/market/${signal.slug ?? ""}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  transition: "background 150ms ease",
                }}
                data-testid="signal-row"
              >
                {/* Status badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: ss.bg,
                    color: ss.color,
                    border: `1px solid ${ss.border}`,
                    fontFamily: "monospace",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                  data-testid={`badge-${signal.status}`}
                >
                  {ss.label}
                </span>

                {/* Market question (truncated 50 chars) */}
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.55)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {truncate(signal.question || signal.slug || "—", 50)}
                </span>

                {/* Confidence */}
                <span
                  style={{
                    fontFamily: '"SF Mono", monospace',
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    flexShrink: 0,
                  }}
                >
                  {Math.round((signal.confidence ?? 0) * 100)}%
                </span>

                {/* Edge */}
                <span
                  style={{
                    fontFamily: '"SF Mono", monospace',
                    fontSize: 11,
                    color: edge > 0 ? "#30d158" : "rgba(255,255,255,0.30)",
                    flexShrink: 0,
                  }}
                >
                  {edge > 0 ? "+" : ""}
                  {(edge * 100).toFixed(1)}%
                </span>

                {/* Timestamp */}
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.20)",
                    flexShrink: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {timeAgo(signal.timestamp ?? 0)}
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
