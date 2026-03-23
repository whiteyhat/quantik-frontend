"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AgentTokenStatus, DistributionRecord, DistributionStatusResponse } from "@/lib/api";
import { fetchDistributions, fetchDistributionStatus } from "@/lib/api";
import { TokenInfoCard } from "./TokenInfoCard";
import { TradingPanel } from "./TradingPanel";
import { DistributionCountdown } from "@/components/DistributionCountdown";
import { DistributionHistoryTable } from "@/components/DistributionHistoryTable";
import { useSocketEvent } from "@/context/SocketContext";

// ── Inline toast types ────────────────────────────────────────────────────────

interface InlineToast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

let toastCounter = 0;

interface TokenDetailPageProps {
  tokenStatus: AgentTokenStatus;
  agentEmoji?: string;
}

export function TokenDetailPage({ tokenStatus, agentEmoji }: TokenDetailPageProps) {
  const router = useRouter();

  // ── Distribution state ─────────────────────────────────────────────────────
  const [distributionStatus, setDistributionStatus] = useState<DistributionStatusResponse | null>(null);
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [distributionsTotal, setDistributionsTotal] = useState(0);
  const [distributionsLoading, setDistributionsLoading] = useState(true);
  const [distributionsOffset, setDistributionsOffset] = useState(0);

  // ── Inline toast state ─────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<InlineToast[]>([]);

  const showToast = useCallback((message: string, type: InlineToast["type"], duration = 4000) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const tokenMint = tokenStatus.token?.token_mint ?? null;

  // ── Fetch distribution data on mount ──────────────────────────────────────
  useEffect(() => {
    if (!tokenMint) return;
    setDistributionsLoading(true);
    Promise.all([
      fetchDistributionStatus(tokenMint),
      fetchDistributions(tokenMint, 10, 0),
    ])
      .then(([status, list]) => {
        setDistributionStatus(status);
        setDistributions(list.distributions);
        setDistributionsTotal(list.total);
      })
      .catch(console.error)
      .finally(() => setDistributionsLoading(false));
  }, [tokenMint]);

  // ── Load more handler ──────────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (!tokenMint) return;
    const nextOffset = distributionsOffset + 10;
    try {
      const more = await fetchDistributions(tokenMint, 10, nextOffset);
      setDistributions((prev) => [...prev, ...more.distributions]);
      setDistributionsOffset(nextOffset);
    } catch (err) {
      console.error("Failed to load more distributions:", err);
    }
  }, [distributionsOffset, tokenMint]);

  // ── Socket.IO distribution event listeners ─────────────────────────────────
  const handleDistributionStart = useCallback(
    (payload: { agentId: string; tokenSymbol: string; tokenMint: string; buybackAmountUsdc: number }) => {
      if (payload.tokenMint !== tokenMint) return;
      showToast(
        `Buyback started for $${payload.tokenSymbol} — ${payload.buybackAmountUsdc.toFixed(2)} USDC`,
        "info"
      );
    },
    [tokenMint, showToast]
  );

  const handleDistributionComplete = useCallback(
    (payload: {
      agentId: string;
      tokenSymbol: string;
      tokenMint: string;
      tokensBought: number;
      holderCount: number;
    }) => {
      if (payload.tokenMint !== tokenMint) return;
      // Refresh distribution data after completion
      if (tokenMint) {
        fetchDistributionStatus(tokenMint).then(setDistributionStatus).catch(console.error);
        fetchDistributions(tokenMint, 10, 0)
          .then((r) => {
            setDistributions(r.distributions);
            setDistributionsTotal(r.total);
            setDistributionsOffset(0);
          })
          .catch(console.error);
      }
      showToast(`Distribution sent to top ${payload.holderCount} holders`, "success");
    },
    [tokenMint, showToast]
  );

  const handleDistributionFailed = useCallback(
    (payload: { agentId: string; tokenSymbol: string; tokenMint: string; reason: string }) => {
      if (payload.tokenMint !== tokenMint) return;
      showToast(
        `Distribution failed for $${payload.tokenSymbol} — ${payload.reason}`,
        "error",
        8000
      );
    },
    [tokenMint, showToast]
  );

  useSocketEvent("distribution:start", handleDistributionStart);
  useSocketEvent("distribution:complete", handleDistributionComplete);
  useSocketEvent("distribution:failed", handleDistributionFailed);

  // ── Early return for missing token ────────────────────────────────────────
  if (!tokenStatus.token) {
    return (
      <div style={{ padding: 24, color: "rgba(255,255,255,0.60)", fontSize: 15 }}>
        Token not found.{" "}
        <button
          onClick={() => router.back()}
          style={{ color: "#007AFF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Go back
        </button>
      </div>
    );
  }

  const { token } = tokenStatus;

  // Toast color map
  const toastColorMap: Record<InlineToast["type"], { bg: string; border: string; text: string }> = {
    info: { bg: "rgba(0,122,255,0.15)", border: "#007AFF", text: "#007AFF" },
    success: { bg: "rgba(48,209,88,0.15)", border: "#30D158", text: "#30D158" },
    error: { bg: "rgba(255,69,58,0.15)", border: "#FF453A", text: "#FF453A" },
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", position: "relative" }}>

      {/* Inline toast container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "max(16px, env(safe-area-inset-top, 16px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: "calc(100vw - 32px)",
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => {
            const colors = toastColorMap[t.type];
            return (
              <div
                key={t.id}
                role={t.type === "error" ? "alert" : "status"}
                style={{
                  padding: "10px 20px",
                  borderRadius: 100,
                  background: colors.bg,
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "normal",
                  textAlign: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {t.message}
              </div>
            );
          })}
        </div>
      )}

      {/* Header with back button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            color: "rgba(255,255,255,0.60)", cursor: "pointer", fontSize: 15, padding: "4px 0",
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
          {token.token_name}{" "}
          <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 400 }}>
            (${token.token_symbol})
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Token info card */}
        <TokenInfoCard token={token} agentEmoji={agentEmoji} />

        {/* Price chart placeholder (Phase 5) */}
        <div style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 16, height: 200,
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.40)", marginBottom: 8 }}>
            Price History
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>
            Price chart coming in Phase 5 — Showing buy/sell data after first trades
          </div>
        </div>

        {/* Distribution Section (Phase 3) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Section header */}
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.92)", paddingTop: 8 }}>
            Distributions
          </div>

          {/* Countdown card */}
          <DistributionCountdown
            nextDistributionAt={
              distributionStatus?.next_distribution_at ?? Date.now() + 7 * 24 * 60 * 60 * 1000
            }
            auditStatus={distributionStatus?.current_distribution?.audit_status}
            lastDistributionStatus={distributionStatus?.current_distribution?.status}
          />

          {/* History table */}
          <DistributionHistoryTable
            distributions={distributions}
            isLoading={distributionsLoading}
            onLoadMore={handleLoadMore}
            hasMore={distributions.length < distributionsTotal}
          />
        </div>

        {/* Trading panel */}
        <TradingPanel token={token} />

        {/* Top holders placeholder (Phase 4) */}
        <div style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: 8 }}>
            Top Holders
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Holder leaderboard coming in Phase 4
          </div>
        </div>
      </div>
    </div>
  );
}
