"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function ArenaOpenSlot({
  rank,
  title,
}: {
  rank: number;
  title: string;
}) {
  const t = useTranslations("arena");

  return (
    <article className="arena-pylon-card arena-pylon-card--empty">
      <div className="arena-pylon-topline">
        <span className="arena-pylon-rank">#{rank}</span>
        <span className="arena-pylon-role">{title}</span>
      </div>
      <div className="arena-empty-slot">
        <Sparkles className="size-4" />
        <div>
          <div className="arena-pylon-name">{t("openSlotTitle")}</div>
          <div className="arena-podium-code">{t("openSlotDetail")}</div>
        </div>
      </div>
    </article>
  );
}
