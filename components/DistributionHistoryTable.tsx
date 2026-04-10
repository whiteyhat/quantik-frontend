"use client";

import type { DistributionRecord } from "@/lib/api";
import { DistributionStatus } from "./DistributionStatus";

interface DistributionHistoryTableProps {
  distributions: DistributionRecord[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPnl(pnl: number): { text: string; color: string } {
  if (pnl >= 0) {
    return { text: `+$${pnl.toFixed(2)}`, color: "#30D158" };
  }
  return { text: `-$${Math.abs(pnl).toFixed(2)}`, color: "#FF453A" };
}

function formatUsdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(tokens: number | null): string {
  if (tokens === null) return "—";
  return tokens.toLocaleString();
}

export function DistributionHistoryTable({
  distributions,
  isLoading,
  onLoadMore,
  hasMore,
}: DistributionHistoryTableProps) {
  const monoFont = '"SF Mono", "JetBrains Mono", "Fira Code", monospace';

  if (!isLoading && distributions.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 8,
          }}
        >
          No distributions yet
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>
          This agent token doesn&apos;t have any completed distributions. Distributions happen
          automatically every Friday at midnight UTC. Check back next week.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {["Date", "Weekly P&L", "Buyback (USDC)", "Tokens Distributed", "Status", "View Tx"].map(
                (col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.40)",
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
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: "12px 16px", minHeight: 48 }}>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.08)",
                            width: j === 5 ? 40 : j === 4 ? 60 : "70%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : distributions.map((record) => {
                  const pnl = formatPnl(record.weekly_pnl);
                  const txSig = record.holder_distribution_tx_signature;

                  return (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        minHeight: 48,
                      }}
                    >
                      {/* Date */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.92)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(record.week_start)}
                      </td>

                      {/* Weekly P&L */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: pnl.color,
                          fontFamily: monoFont,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pnl.text}
                      </td>

                      {/* Buyback (USDC) */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.92)",
                          fontFamily: monoFont,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatUsdc(record.buyback_amount_usdc)}
                      </td>

                      {/* Tokens Distributed */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.92)",
                          fontFamily: monoFont,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTokens(record.holder_tokens)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <DistributionStatus
                          status={record.status}
                          auditStatus={record.audit_status}
                        />
                      </td>

                      {/* View Tx */}
                      <td style={{ padding: "12px 16px" }}>
                        {txSig ? (
                          <a
                            href={`https://solscan.io/tx/${txSig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 13,
                              color: "#007AFF",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            View →
                          </a>
                        ) : (
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Load More button */}
      {hasMore && !isLoading && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={onLoadMore}
            style={{
              width: "100%",
              height: 38,
              background: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.60)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
