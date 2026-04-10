"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface TokenStatusBadgeProps {
  agentId: string;
}

type BadgeState =
  | { kind: "not_tokenized" }
  | { kind: "bonding"; createdAt: number }
  | { kind: "live" };

function computeDaysLeft(createdAt: number): { days: number; hours: number } {
  // DBC migration typically takes ~7-30 days or hits the 50K USDC threshold.
  // Using 30 days as expected max bonding window for display purposes.
  const BONDING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - createdAt;
  const remaining = Math.max(0, BONDING_WINDOW_MS - elapsed);
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { days, hours };
}

function resolveBadgeState(
  tokenStatus: Awaited<ReturnType<typeof api.getAgentTokenStatus>>
): BadgeState {
  if (!tokenStatus.tokenized || !tokenStatus.token) {
    return { kind: "not_tokenized" };
  }
  if (tokenStatus.token.status === "migrated") {
    return { kind: "live" };
  }
  return { kind: "bonding", createdAt: tokenStatus.token.created_at };
}

function formatBondingLabel(createdAt: number): string {
  const { days, hours } = computeDaysLeft(createdAt);
  if (days > 0) return `Bonding (${days}d left)`;
  if (hours > 0) return `Bonding (${hours}h left)`;
  return "Bonding (< 1h left)";
}

export function TokenStatusBadge({ agentId }: TokenStatusBadgeProps) {
  const [badgeState, setBadgeState] = useState<BadgeState>({ kind: "not_tokenized" });
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .getAgentTokenStatus(agentId)
      .then((status) => {
        if (active) setBadgeState(resolveBadgeState(status));
      })
      .catch(() => {
        if (active) setBadgeState({ kind: "not_tokenized" });
      });
    return () => {
      active = false;
    };
  }, [agentId]);

  // Refresh countdown every 60s so the label stays current
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (badgeState.kind === "not_tokenized") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.40)",
          border: "1px solid rgba(255,255,255,0.15)",
          whiteSpace: "nowrap",
        }}
      >
        Not Tokenized
      </span>
    );
  }

  if (badgeState.kind === "live") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          background: "rgba(48,209,88,0.18)",
          color: "#30D158",
          border: "1px solid rgba(48,209,88,0.30)",
          whiteSpace: "nowrap",
        }}
      >
        Live on DAMM
      </span>
    );
  }

  // Bonding state — recompute countdown at render time (tick forces re-render every 60s)
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        background: "rgba(255,159,10,0.18)",
        color: "#FF9F0A",
        border: "1px solid rgba(255,159,10,0.30)",
        whiteSpace: "nowrap",
      }}
    >
      {formatBondingLabel(badgeState.createdAt)}
    </span>
  );
}
