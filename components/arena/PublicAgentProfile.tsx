"use client";

import "../arena/arena.css";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fmtNumber, type PublicAgentProfile as PublicAgentProfileData } from "@/lib/api";
import { formatSignedCurrency, formatSignedCompact, streakLabel, battleTone } from "@/components/arena/arenaHelpers";
import { AchievementBadgeRow } from "@/components/arena/AchievementBadge";
import { AgentHeatGlow } from "@/components/arena/AgentHeatGlow";
import { PnlSparkline } from "@/components/arena/PnlSparkline";
import { WinRateRing } from "@/components/arena/WinRateRing";
import { StrategyDNAChart } from "@/components/arena/StrategyDNAChart";
import { ShareButtons } from "@/components/arena/ShareButtons";
import { AnimatedCounter } from "@/components/arena/AnimatedCounter";
import { cn } from "@/lib/utils";

const sectionEase = [0.16, 1, 0.3, 1] as const;
const viewportOnce = { once: true, margin: "-40px" as const };

function RankBadge({ rank, unrankedLabel }: { rank: number | null; unrankedLabel: string }) {
  if (rank == null) return <span className="arena-public-rank arena-public-rank--unranked">{unrankedLabel}</span>;
  const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "default";
  return <span className={cn("arena-public-rank", `arena-public-rank--${tier}`)}>#{rank}</span>;
}

export function PublicAgentProfileView({
  profile,
  shareUrl,
}: {
  profile: PublicAgentProfileData;
  shareUrl: string;
}) {
  const t = useTranslations("arena");
  const locale = useLocale();
  const pnlTone = battleTone(profile.allTimePnl);

  const heroContent = (
    <motion.div
      className="arena-public-hero"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <div className="arena-public-hero__glow" aria-hidden="true" />
      <div className="arena-public-hero__particles" aria-hidden="true">
        <span /><span /><span /><span />
        <span /><span /><span /><span />
      </div>

      <div className="arena-public-hero__identity">
        <div className="arena-public-avatar">{profile.avatarEmoji}</div>
        <div className="arena-public-hero__info">
          <div className="arena-public-hero__name-row">
            <h1 className="arena-public-hero__name">{profile.name}</h1>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
            >
              <RankBadge rank={profile.rank} unrankedLabel={t("unranked")} />
            </motion.span>
          </div>
          <div className="arena-public-hero__code">{profile.agentCode}</div>
          <AchievementBadgeRow badges={profile.badges} maxVisible={7} />
        </div>
      </div>

      <div className={cn("arena-public-hero__pnl", pnlTone === "good" ? "arena-public-hero__pnl--up" : pnlTone === "bad" ? "arena-public-hero__pnl--down" : "")}>
        <span className="arena-public-hero__pnl-label">{t("allTimePnl")}</span>
        <strong className="arena-public-hero__pnl-value">
          <AnimatedCounter value={profile.allTimePnl} format={formatSignedCurrency} />
        </strong>
      </div>
    </motion.div>
  );

  const statItems = [
    { label: t("selectedPnl"), content: <AnimatedCounter value={profile.selectedPnl} format={formatSignedCurrency} /> },
    { label: t("winRate"), content: <WinRateRing winRate={profile.winRate} size={56} /> },
    { label: t("totalTrades"), content: <AnimatedCounter value={profile.totalTrades} format={(v) => fmtNumber(Math.round(v), locale)} /> },
    { label: t("metricStreak"), content: <strong>{streakLabel(profile.currentStreak)}</strong> },
    { label: t("openShort"), content: <AnimatedCounter value={profile.openPositions} format={(v) => String(Math.round(v))} /> },
  ];

  return (
    <div className="arena-public-profile">
      {profile.heat > 0.05 ? (
        <AgentHeatGlow heat={profile.heat}>{heroContent}</AgentHeatGlow>
      ) : (
        heroContent
      )}

      {/* Stats Grid */}
      <div className="arena-public-stats">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            className="arena-public-stat"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ delay: index * 0.08, duration: 0.5, ease: sectionEase }}
          >
            <span>{item.label}</span>
            {item.content}
          </motion.div>
        ))}
      </div>

      {/* Equity Curve */}
      {profile.sparkline.length >= 2 && (
        <motion.div
          className="arena-public-card"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, ease: sectionEase }}
        >
          <div className="arena-section-kicker">{t("publicEquityCurve")}</div>
          <div className="arena-public-chart">
            <PnlSparkline
              data={profile.sparkline.map((p) => ({ slug: "", question: "", pnl: p.pnl, trades: 0, winRate: 0, openPositions: 0 }))}
              width={600}
              height={120}
              animated
            />
          </div>
        </motion.div>
      )}

      {/* Strategy DNA + Market Breakdown side by side */}
      <div className="arena-public-duo">
        <motion.div
          className="arena-public-card"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, ease: sectionEase }}
        >
          <div className="arena-section-kicker">{t("strategyDNA")}</div>
          <div className="arena-public-dna">
            <StrategyDNAChart dna={profile.dna} size={200} />
          </div>
        </motion.div>

        {profile.marketBreakdown.length > 0 && (
          <motion.div
            className="arena-public-card"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, ease: sectionEase }}
          >
            <div className="arena-section-kicker">{t("publicMarkets")}</div>
            <div className="arena-public-markets">
              {profile.marketBreakdown.map((m, i) => (
                <motion.div
                  key={m.slug}
                  className="arena-public-market-row"
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: i * 0.06, ease: sectionEase }}
                >
                  <span className="arena-public-market-slug" title={m.slug}>{m.question}</span>
                  <span className={m.pnl >= 0 ? "arena-flyout-pnl--up" : "arena-flyout-pnl--down"}>
                    {formatSignedCompact(m.pnl)}
                  </span>
                  <span>{m.trades}</span>
                  <span>{m.winRate.toFixed(0)}%</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Share + CTA */}
      <motion.div
        className="arena-public-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewportOnce}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <ShareButtons
          url={shareUrl}
          text={t("shareText", { emoji: profile.avatarEmoji, name: profile.name, rank: String(profile.rank ?? "—"), pnl: formatSignedCurrency(profile.allTimePnl) })}
        />
        <Link href="/agent-factory" className="arena-public-cta">
          {t("publicJoinCta")}
        </Link>
      </motion.div>
    </div>
  );
}
