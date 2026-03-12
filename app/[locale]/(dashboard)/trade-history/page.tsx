"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fmtUSDC, fmtPrice, type Trade } from "@/lib/api";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Skeleton, SkeletonTableRows } from "@/components/ui/skeleton";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 20,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Outcome badge ────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome, label }: { outcome: Trade["outcome"]; label: string }) {
  const styles: Record<Trade["outcome"], { bg: string; color: string; border: string }> = {
    WIN: {
      bg: "rgba(48,209,88,0.15)",
      color: "#30d158",
      border: "rgba(48,209,88,0.25)",
    },
    LOSS: {
      bg: "rgba(255,69,58,0.15)",
      color: "#ff453a",
      border: "rgba(255,69,58,0.25)",
    },
    OPEN: {
      bg: "rgba(10,132,255,0.12)",
      color: "#0a84ff",
      border: "rgba(10,132,255,0.25)",
    },
    PENDING: {
      bg: "rgba(255,159,10,0.12)",
      color: "#ff9f0a",
      border: "rgba(255,159,10,0.25)",
    },
  };

  const s = styles[outcome];
  return (
    <span
      style={{
        fontSize: LABEL_SIZE,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 5,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontFamily: "monospace",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Trade History Page ───────────────────────────────────────────────────────

type FilterOutcome = "All" | Trade["outcome"];

const OUTCOME_FILTERS: FilterOutcome[] = ["All", "WIN", "LOSS", "OPEN", "PENDING"];

export default function TradeHistoryPage() {
  const t = useTranslations("tradeHistory");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOutcome>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${BASE_URL}/api/performance/trades`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        // Guard: API may return an object or null instead of an array
        const safeData = Array.isArray(data)
          ? data
          : (data as Record<string, unknown>)?.trades ??
            (data as Record<string, unknown>)?.items ??
            [];
        setTrades(safeData as Trade[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Guard: ensure trades is always an array before any array operations
  const safeTrades = Array.isArray(trades) ? trades : [];

  const filtered = safeTrades.filter((t) => {
    const matchOutcome = filter === "All" || t.outcome === filter;
    const matchSearch = !search || t.market.toLowerCase().includes(search.toLowerCase());
    return matchOutcome && matchSearch;
  });

  const totalPnl = filtered.reduce((acc, tr) => acc + (tr.pnl ?? 0), 0);
  const wins = filtered.filter((tr) => tr.outcome === "WIN").length;
  const losses = filtered.filter((tr) => tr.outcome === "LOSS").length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const outcomeLabels: Record<Trade["outcome"], string> = {
    WIN: t("win"),
    LOSS: t("loss"),
    OPEN: t("open"),
    PENDING: t("pending"),
  };

  const filterLabels: Record<FilterOutcome, string> = {
    All: t("all"),
    WIN: t("win"),
    LOSS: t("loss"),
    OPEN: t("open"),
    PENDING: t("pending"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.04em",
            }}
          >
            {t("title")}
          </h1>
          <HelpTooltip text={t("subtitle")} />
        </div>
        <p style={{ margin: "4px 0 0", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.30)" }}>
          {t("allTrades")}
        </p>
      </div>

      {/* Summary metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...panelStyle, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width={80} height={10} borderRadius={4} />
              <Skeleton width={100} height={20} borderRadius={6} />
            </div>
          ))
        ) : (
          [{
            label: t("totalTrades"),
            value: String(filtered.length),
            color: "rgba(255,255,255,0.92)",
          },
          {
            label: t("winRate"),
            value: `${winRate}%`,
            color: "#30d158",
          },
          {
            label: t("totalPnl"),
            value: `${totalPnl >= 0 ? "+" : ""}${fmtUSDC(totalPnl)}`,
            color: totalPnl >= 0 ? "#30d158" : "#ff453a",
          },
          {
            label: t("winsLosses"),
            value: `${wins} / ${losses}`,
            color: "rgba(255,255,255,0.70)",
          }].map((m) => (
            <div key={m.label} style={{ ...panelStyle, padding: "14px 18px" }}>
              <span
                style={{
                  display: "block",
                  fontSize: LABEL_SIZE,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.30)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                {m.label}
              </span>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 20,
                  fontWeight: 700,
                  color: m.color,
                }}
              >
                {m.value}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 14px",
            fontSize: BODY_SIZE,
            width: "100%",
            maxWidth: 360,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 9,
            color: "rgba(255,255,255,0.85)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {OUTCOME_FILTERS.map((f) => {
            const isActive = filter === f;
            const accentMap: Record<FilterOutcome, string> = {
              All: "#0a84ff",
              WIN: "#30d158",
              LOSS: "#ff453a",
              OPEN: "#0a84ff",
              PENDING: "#ff9f0a",
            };
            const accent = accentMap[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 100,
                  border: isActive
                    ? `1px solid color-mix(in srgb, ${accent} 60%, transparent)`
                    : "1px solid rgba(255,255,255,0.10)",
                  background: isActive
                    ? `color-mix(in srgb, ${accent} 18%, transparent)`
                    : "rgba(255,255,255,0.04)",
                  color: isActive ? accent : "rgba(255,255,255,0.45)",
                  fontSize: META_SIZE,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 160ms ease",
                  fontFamily: "inherit",
                }}
              >
                {filterLabels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={panelStyle}>
        {loading ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("date"), t("market"), t("direction"), t("size"), t("price"), t("outcome"), t("pnl")].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: LABEL_SIZE,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.25)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                <SkeletonTableRows rows={5} cols={7} />
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              fontSize: BODY_SIZE,
              color: "#ff453a",
              fontFamily: "monospace",
            }}
          >
            {t("errorLabel")}: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              fontSize: BODY_SIZE,
              color: "rgba(255,255,255,0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>📭</span>
            <span>{safeTrades.length === 0 ? t("noHistory") : t("noMatch")}</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("date"), t("market"), t("direction"), t("size"), t("price"), t("outcome"), t("pnl")].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: LABEL_SIZE,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.25)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => {
                  const isYes = trade.direction === "YES";
                  const dirColor = isYes ? "#30d158" : "#ff453a";
                  const pnl = trade.pnl ?? 0;
                  const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
                  const pnlSign = pnl >= 0 ? "+" : "";

                  return (
                    <tr key={trade.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)" }}>
                          {fmtDate(trade.timestamp)}
                        </div>
                        <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                          {fmtTime(trade.timestamp)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <Link
                          href={`/market/${trade.slug}`}
                          style={{
                            fontSize: BODY_SIZE,
                            color: "rgba(255,255,255,0.75)",
                            textDecoration: "none",
                            display: "block",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {trade.market}
                        </Link>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: LABEL_SIZE,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 5,
                            background: isYes ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
                            color: dirColor,
                            border: `1px solid ${isYes ? "rgba(48,209,88,0.25)" : "rgba(255,69,58,0.25)"}`,
                            fontFamily: "monospace",
                          }}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>
                          {fmtUSDC(trade.size)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.50)", fontFamily: "monospace" }}>
                          {fmtPrice(trade.price)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <OutcomeBadge outcome={trade.outcome} label={outcomeLabels[trade.outcome]} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {trade.pnl !== undefined ? (
                          <span
                            style={{
                              fontSize: BODY_SIZE,
                              fontWeight: 600,
                              color: pnlColor,
                              fontFamily: "monospace",
                            }}
                          >
                            {pnlSign}{fmtUSDC(pnl)}
                          </span>
                        ) : (
                          <span style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer label */}
      <div
        style={{
          textAlign: "center",
          fontSize: LABEL_SIZE,
          color: "rgba(255,255,255,0.15)",
          fontFamily: "monospace",
          letterSpacing: "0.06em",
        }}
      >
        {t("tradesShown", { count: filtered.length })}
      </div>
    </div>
  );
}
