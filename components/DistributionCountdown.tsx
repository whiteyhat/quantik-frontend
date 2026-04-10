"use client";

import { useState, useEffect } from "react";
import type { DistributionRecord } from "@/lib/api";
import { DistributionStatus } from "./DistributionStatus";

interface DistributionCountdownProps {
  nextDistributionAt: number; // Unix ms timestamp
  auditStatus?: "pending" | "verified" | "failed";
  lastDistributionStatus?: DistributionRecord["status"];
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Distributing now...";
  if (msRemaining < 60_000) return "Distributing now...";
  const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `Next distribution in ${days}d ${hours}h`;
  if (hours > 0) return `Next distribution in ${hours}h ${minutes}m`;
  return `Next distribution in ${minutes}m`;
}

function getCountdownColor(msRemaining: number): string {
  if (msRemaining <= 0) return "#30D158"; // green — just completed
  if (msRemaining < 24 * 60 * 60 * 1000) return "#FF9F0A"; // orange — < 24h
  return "rgba(255,255,255,0.60)"; // secondary — > 24h
}

export function DistributionCountdown({
  nextDistributionAt,
  auditStatus,
  lastDistributionStatus,
}: DistributionCountdownProps) {
  const [msRemaining, setMsRemaining] = useState<number>(() => nextDistributionAt - Date.now());

  useEffect(() => {
    setMsRemaining(nextDistributionAt - Date.now());
    const interval = setInterval(() => {
      setMsRemaining(nextDistributionAt - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [nextDistributionAt]);

  const countdownText = formatCountdown(msRemaining);
  const countdownColor = getCountdownColor(msRemaining);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* Left: countdown text */}
      <div
        aria-live="polite"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: countdownColor,
          fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
        }}
      >
        {countdownText}
      </div>

      {/* Right: audit/distribution status badge */}
      {(auditStatus || lastDistributionStatus) && (
        <DistributionStatus
          status={lastDistributionStatus ?? "pending"}
          auditStatus={auditStatus}
        />
      )}
    </div>
  );
}
