"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, fmtPrice, fmtUSDC, type Trade, type TradeReportsResponse } from "@/lib/api";
import { Skeleton, SkeletonTableRows } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const panelStyle: React.CSSProperties = {
  background: "var(--glass-surface)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: 18,
  padding: 20,
};

type Period = "day" | "week" | "month" | "all";
type OutcomeFilter = Trade["outcome"] | "All";
type SourceFilter = "all" | "manual" | "autopilot";

function OutcomeBadge({ outcome }: { outcome: Trade["outcome"] }) {
  const colors: Record<Trade["outcome"], { background: string; color: string }> = {
    WIN: { background: "rgba(48,209,88,0.14)", color: "var(--ios-green)" },
    LOSS: { background: "rgba(255,69,58,0.14)", color: "var(--ios-red)" },
    OPEN: { background: "rgba(10,132,255,0.14)", color: "var(--ios-blue)" },
    PENDING: { background: "rgba(255,159,10,0.14)", color: "var(--ios-orange)" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        background: colors[outcome].background,
        color: colors[outcome].color,
      }}
    >
      {outcome}
    </span>
  );
}

function ReportMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function TradeHighlightCard({ label, trade }: { label: string; trade: Trade | null }) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {label}
      </div>
      {trade ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{trade.market}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <OutcomeBadge outcome={trade.outcome} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {trade.direction} · {fmtUSDC(trade.size)}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: (trade.pnl ?? 0) >= 0 ? "var(--ios-green)" : "var(--ios-red)" }}>
            {(trade.pnl ?? 0) >= 0 ? "+" : ""}{fmtUSDC(trade.pnl ?? 0)}
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No matching trade.</div>
      )}
    </div>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

interface TradeReportsViewProps {
  title?: string;
  subtitle?: string;
}

export function TradeReportsView({ title, subtitle }: TradeReportsViewProps) {
  const t = useTranslations("tradeHistory");
  const [period, setPeriod] = useState<Period>("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("All");
  const [source, setSource] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<TradeReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.getTradeReports({ period, outcome, source, search })
      .then((response) => {
        if (active) setData(response);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, outcome, source, search]);

  const trades = data?.trades ?? [];
  const summary = data?.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.04em",
            }}
          >
            {title ?? t("title")}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            {subtitle ?? t("allTrades")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={async () => {
              const blob = await api.downloadTradeReportsCsv({ period, outcome, source, search });
              saveBlob(blob, "quantik-trades.csv");
            }}
            style={{
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: "var(--glass-surface)",
              color: "var(--text-primary)",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
          <Link
            href={`/reports/print?period=${period}&outcome=${outcome}&source=${source}&search=${encodeURIComponent(search)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: "var(--glass-surface)",
              color: "var(--text-primary)",
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            Print / PDF
          </Link>
        </div>
      </div>

      <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(["all", "day", "week", "month"] as Period[]).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              style={{
                padding: "9px 12px",
                borderRadius: 999,
                border: "1px solid var(--glass-border)",
                background: period === value ? "rgba(10,132,255,0.16)" : "transparent",
                color: period === value ? "var(--ios-blue)" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <select
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as OutcomeFilter)}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid var(--glass-border)",
              background: "var(--glass-surface)",
              color: "var(--text-primary)",
            }}
          >
            <option value="All">All outcomes</option>
            <option value="WIN">Wins</option>
            <option value="LOSS">Losses</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as SourceFilter)}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid var(--glass-border)",
              background: "var(--glass-surface)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All sources</option>
            <option value="manual">Manual</option>
            <option value="autopilot">Autopilot</option>
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid var(--glass-border)",
              background: "var(--glass-surface)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {loading ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={panelStyle}>
                <Skeleton width={90} height={10} borderRadius={4} />
                <div style={{ height: 8 }} />
                <Skeleton width={120} height={26} borderRadius={8} />
              </div>
            ))}
          </div>
          <div style={panelStyle}>
            <Skeleton width="100%" height={260} borderRadius={16} />
          </div>
        </>
      ) : error ? (
        <div style={{ ...panelStyle, color: "var(--ios-red)" }}>Failed to load reports: {error}</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <ReportMetric label="Trades" value={String(summary?.totalTrades ?? 0)} />
            <ReportMetric label="Win rate" value={`${Math.round((summary?.winRate ?? 0) * 100)}%`} color="var(--ios-green)" />
            <ReportMetric
              label="Total P&L"
              value={`${(summary?.totalPnl ?? 0) >= 0 ? "+" : ""}${fmtUSDC(summary?.totalPnl ?? 0)}`}
              color={(summary?.totalPnl ?? 0) >= 0 ? "var(--ios-green)" : "var(--ios-red)"}
            />
            <ReportMetric label="Wins / losses" value={`${summary?.wins ?? 0} / ${summary?.losses ?? 0}`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <TradeHighlightCard label="Best trade" trade={data?.bestTrade ?? null} />
            <TradeHighlightCard label="Worst trade" trade={data?.worstTrade ?? null} />
          </div>

          <div style={panelStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              P&L by {period === "day" ? "hour" : period === "all" ? "trade" : "day"}
            </div>
            {data?.buckets?.length ? (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.buckets}>
                    <defs>
                      <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a84ff" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#0a84ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.15)" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--panel-surface)",
                        borderRadius: 12,
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                      formatter={(value) => fmtUSDC(Number(value ?? 0))}
                    />
                    <Area type="monotone" dataKey="pnl" stroke="#0a84ff" strokeWidth={2} fill="url(#reportsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No chart for this filter set.</div>
            )}
          </div>

          <div style={panelStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Agent attribution
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {(data?.agentAttribution ?? []).map((entry) => (
                <div
                  key={entry.agent}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{entry.agent}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ios-blue)" }}>{Math.round(entry.weight * 100)}%</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    Trend {entry.trend}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trades.length === 0 ? (
              <div style={{ ...panelStyle, padding: 24, color: "var(--text-secondary)", textAlign: "center" }}>
                No trades match the current filters.
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={`mobile-${trade.id}-${trade.timestamp}`}
                  style={{
                    ...panelStyle,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {trade.market}
                    </div>
                    <OutcomeBadge outcome={trade.outcome} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    <span style={{ color: trade.direction === "YES" ? "var(--ios-green)" : "var(--ios-red)", fontWeight: 700 }}>{trade.direction}</span>
                    <span>{fmtPrice(trade.price)}</span>
                    <span>{fmtUSDC(trade.size)}</span>
                    <span style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}>
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: (trade.pnl ?? 0) >= 0 ? "var(--ios-green)" : "var(--ios-red)" }}>
                    {(trade.pnl ?? 0) >= 0 ? "+" : ""}{fmtUSDC(trade.pnl ?? 0)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block" style={panelStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Market", "Source", "Direction", "Price", "Size", "P&L", "Outcome", "When"].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          borderBottom: "1px solid var(--glass-border)",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, color: "var(--text-secondary)", textAlign: "center" }}>
                        No trades match the current filters.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => (
                      <tr key={`${trade.id}-${trade.timestamp}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px", color: "var(--text-primary)", minWidth: 220 }}>
                          <div>{trade.market}</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>{trade.slug}</div>
                        </td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{trade.source}</td>
                        <td style={{ padding: "12px", color: trade.direction === "YES" ? "var(--ios-green)" : "var(--ios-red)", fontWeight: 700 }}>{trade.direction}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{fmtPrice(trade.price)}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{fmtUSDC(trade.size)}</td>
                        <td style={{ padding: "12px", color: (trade.pnl ?? 0) >= 0 ? "var(--ios-green)" : "var(--ios-red)", fontWeight: 700 }}>
                          {(trade.pnl ?? 0) >= 0 ? "+" : ""}{fmtUSDC(trade.pnl ?? 0)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <OutcomeBadge outcome={trade.outcome} />
                        </td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {new Date(trade.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {loading ? <SkeletonTableRows rows={6} cols={8} /> : null}
          </div>
        </>
      )}
    </div>
  );
}
