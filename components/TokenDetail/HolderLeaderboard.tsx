"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { useSocketEvent } from "@/context/SocketContext";
import { fetchHolders } from "@/lib/api";
import type { HolderEntry } from "@/lib/api";
import { truncateWallet } from "@/lib/formatters";

interface HolderLeaderboardProps {
  mint: string;
  isLoading?: boolean;
  connectedWallet?: string | null;
}

interface HoldersUpdatedPayload {
  mint: string;
  holders: HolderEntry[];
  updatedAt: number;
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <span role="img" aria-label="First Place" style={{ fontSize: 14 }}>🥇</span>;
  if (rank === 2) return <span role="img" aria-label="Second Place" style={{ fontSize: 14 }}>🥈</span>;
  if (rank === 3) return <span role="img" aria-label="Third Place" style={{ fontSize: 14 }}>🥉</span>;
  return <span style={{ fontSize: 13, color: "rgba(255,255,255,0.60)" }}>{rank}</span>;
}

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {[40, 120, 100, 80, 40].map((w, i) => (
        <td key={i} style={{ padding: "12px 16px" }}>
          <div
            style={{
              width: w,
              height: 12,
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export function HolderLeaderboard({
  mint,
  isLoading: externalLoading = false,
  connectedWallet,
}: HolderLeaderboardProps) {
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const isLoading = externalLoading || fetchLoading;

  // Initial fetch on mount
  useEffect(() => {
    if (!mint) return;
    setFetchLoading(true);
    fetchHolders(mint)
      .then((data) => {
        setHolders(data.holders);
        setLastSyncTime(data.lastSyncTime);
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [mint]);

  // Live updates via Socket.IO — per D-07
  const handleHoldersUpdate = useCallback(
    (payload: HoldersUpdatedPayload) => {
      if (payload.mint !== mint) return;
      setHolders(payload.holders);
      setLastSyncTime(payload.updatedAt);
    },
    [mint]
  );
  useSocketEvent("holders:updated", handleHoldersUpdate);

  const containerStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  };

  return (
    <div style={containerStyle}>
      {/* Section heading */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            margin: 0,
          }}
        >
          Top Holders
        </h3>
        {lastSyncTime && !isLoading && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>
            Updated {Math.floor((Date.now() - lastSyncTime) / 60000)}m ago
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
          aria-label="Top token holders leaderboard"
          aria-live="polite"
          aria-atomic="false"
        >
          <thead>
            <tr>
              {["Rank", "Wallet", "Balance", "% of Supply", ""].map((h, i) => (
                <th
                  key={i}
                  aria-label={h || "Explorer"}
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.40)",
                    padding: "0 16px 8px",
                    textAlign: i === 0 || i === 4 ? "center" : i >= 2 ? "right" : "left",
                    width: i === 0 ? 40 : i === 4 ? 40 : i === 2 ? 100 : i === 3 ? 80 : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton: 3 rows per UI-SPEC
              [1, 2, 3].map((i) => <SkeletonRow key={i} />)
            ) : holders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: "24px 16px", textAlign: "center" }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.60)",
                      margin: "0 0 4px",
                    }}
                  >
                    No holders tracked yet
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.40)",
                      margin: 0,
                    }}
                  >
                    Holder leaderboard updates hourly after the token migrates to DAMM v2. Check back when your token is live.
                  </p>
                </td>
              </tr>
            ) : (
              holders.map((holder, index) => {
                const isConnected =
                  !!connectedWallet &&
                  holder.wallet.toLowerCase() === connectedWallet.toLowerCase();
                const isLast = index === holders.length - 1;

                return (
                  <tr
                    key={holder.wallet}
                    aria-label={`${holder.rank}. ${truncateWallet(holder.wallet)} – ${holder.balance.toLocaleString()} tokens (${holder.percentage.toFixed(2)}%)`}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                      borderLeft: isConnected ? "3px solid #007AFF" : "3px solid transparent",
                      background: isConnected
                        ? "rgba(0,122,255,0.08)"
                        : "transparent",
                      minHeight: 48,
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        isConnected
                          ? "rgba(0,122,255,0.12)"
                          : "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        isConnected ? "rgba(0,122,255,0.08)" : "transparent";
                    }}
                  >
                    {/* Rank */}
                    <td
                      style={{ padding: "12px 16px", textAlign: "center", width: 40 }}
                    >
                      <RankCell rank={holder.rank} />
                    </td>

                    {/* Wallet address */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontFamily: "SF Mono, JetBrains Mono, monospace",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.92)",
                          fontWeight: isConnected ? 600 : 400,
                        }}
                      >
                        {truncateWallet(holder.wallet)}
                      </span>
                      {isConnected && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 12,
                            fontWeight: 400,
                            color: "#007AFF",
                          }}
                        >
                          You
                        </span>
                      )}
                    </td>

                    {/* Balance */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {holder.balance.toLocaleString("en-US")}
                    </td>

                    {/* % of Supply */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.70)",
                      }}
                    >
                      {holder.percentage.toFixed(2)}%
                    </td>

                    {/* Solscan link */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        width: 40,
                      }}
                    >
                      <a
                        href={`https://solscan.io/token/${mint}/holders?address=${holder.wallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View wallet on Solscan"
                        style={{ color: "#007AFF", display: "inline-flex" }}
                        tabIndex={0}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pulse animation for skeleton rows */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
