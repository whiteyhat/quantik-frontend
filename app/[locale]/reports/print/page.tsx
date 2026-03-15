"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, fmtUSDC, type TradeReportsResponse } from "@/lib/api";

export default function ReportsPrintPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TradeReportsResponse | null>(null);

  useEffect(() => {
    api.getTradeReports({
      period: (searchParams.get("period") as "day" | "week" | "month" | "all" | null) ?? "all",
      outcome: (searchParams.get("outcome") as "WIN" | "LOSS" | "OPEN" | "PENDING" | "All" | null) ?? "All",
      source: (searchParams.get("source") as "manual" | "autopilot" | "all" | null) ?? "all",
      search: searchParams.get("search") ?? "",
    }).then(setData).catch(() => setData(null));
  }, [searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#0f172a",
        padding: "32px 24px 48px",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Quantik Reports</h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Printable trade report generated {new Date().toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Print now
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { label: "Trades", value: data?.summary.totalTrades ?? 0 },
            { label: "Wins", value: data?.summary.wins ?? 0 },
            { label: "Losses", value: data?.summary.losses ?? 0 },
            { label: "Total P&L", value: fmtUSDC(data?.summary.totalPnl ?? 0) },
          ].map((metric) => (
            <div key={metric.label} style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>
                {metric.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{metric.value}</div>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Market", "Source", "Direction", "Price", "Size", "P&L", "Outcome", "When"].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "1px solid #cbd5e1",
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.trades ?? []).map((trade) => (
              <tr key={`${trade.id}-${trade.timestamp}`}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{trade.market}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{trade.source}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{trade.direction}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{Math.round(trade.price * 100)}¢</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{fmtUSDC(trade.size)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{fmtUSDC(trade.pnl ?? 0)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{trade.outcome}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{new Date(trade.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
