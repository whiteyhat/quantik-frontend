"use client";

import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function RankChangeBadge({
  rankChange,
  size = "sm",
}: {
  rankChange: number | null;
  size?: "sm" | "md";
}) {
  const t = useTranslations("arena");
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
          ? t("rankUp", { n: rankChange })
          : isDown
            ? t("rankDown", { n: Math.abs(rankChange) })
            : t("rankNoChange")
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
