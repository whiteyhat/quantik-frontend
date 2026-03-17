"use client";

import { Radar, Shield, Sparkles, Target, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type ArenaViewerContext } from "@/lib/api";

export function BattleControlsPanel({
  viewer,
}: {
  viewer: ArenaViewerContext | undefined;
}) {
  const t = useTranslations("arena");
  const primaryAction = viewer?.reason === "no_agent"
    ? { href: "/agent-factory", label: t("ctaForgeContender"), icon: Sparkles }
    : viewer?.reason === "inactive"
      ? { href: "/manage-agent", label: t("ctaRearmContender"), icon: Shield }
      : { href: "/manage-agent", label: t("ctaManageAgent"), icon: Target };
  const secondaryAction = viewer?.reason === "ranked"
    ? { href: "/reports", label: t("ctaReviewTrades"), icon: Trophy }
    : { href: "/reports", label: t("ctaStudyArena"), icon: Radar };
  const PrimaryActionIcon = primaryAction.icon;
  const SecondaryActionIcon = secondaryAction.icon;

  return (
    <div className="arena-dock-controls">
      <div className="arena-section-kicker">{t("battleControls")}</div>
      <div className="arena-contender-actions">
        <Link href={primaryAction.href} className="arena-hero-link">
          <PrimaryActionIcon className="size-4" />
          {primaryAction.label}
        </Link>
        <Link href={secondaryAction.href} className="arena-hero-link arena-hero-link--ghost">
          <SecondaryActionIcon className="size-4" />
          {secondaryAction.label}
        </Link>
      </div>
    </div>
  );
}
