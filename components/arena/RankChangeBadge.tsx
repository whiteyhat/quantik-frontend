"use client";

import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankChangeBadge({
  rankChange,
  size = "sm",
}: {
  rankChange: number | null;
  size?: "sm" | "md";
}) {
  if (rankChange == null) return null;

  const isUp = rankChange > 0;
  const isDown = rankChange < 0;
  const iconSize = size === "md" ? "size-3.5" : "size-3";

  return (
    <span
      className={cn(
        "arena-rank-delta",
        size === "md" && "arena-rank-delta--md",
        isUp && "arena-rank-delta--up",
        isDown && "arena-rank-delta--down",
        !isUp && !isDown && "arena-rank-delta--flat",
      )}
      title={
        isUp
          ? `Up ${rankChange} position${rankChange > 1 ? "s" : ""}`
          : isDown
            ? `Down ${Math.abs(rankChange)} position${Math.abs(rankChange) > 1 ? "s" : ""}`
            : "No change"
      }
    >
      {isUp ? (
        <ChevronUp className={iconSize} />
      ) : isDown ? (
        <ChevronDown className={iconSize} />
      ) : (
        <Minus className={iconSize} />
      )}
      {rankChange !== 0 && <span>{Math.abs(rankChange)}</span>}
    </span>
  );
}
