"use client";

import "../arena/arena.css";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type PublicAgentProfile as PublicAgentProfileData } from "@/lib/api";
import { formatSignedCurrency, formatSignedCompact, streakLabel, battleTone } from "@/components/arena/arenaHelpers";
import { AchievementBadgeRow } from "@/components/arena/AchievementBadge";
import { AgentHeatGlow } from "@/components/arena/AgentHeatGlow";
import { PnlSparkline } from "@/components/arena/PnlSparkline";
import { WinRateRing } from "@/components/arena/WinRateRing";
import { StrategyDNAChart } from "@/components/arena/StrategyDNAChart";
import { ShareButtons } from "@/components/arena/ShareButtons";
import { cn } from "@/lib/utils";

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) return <span className="arena-public-rank arena-public-rank--unranked">Unranked</span>;
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
  const pnlTone = battleTone(profile.allTimePnl);

  const heroContent = (
    <div className="arena-public-hero">
      <div className="arena-public-hero__glow" aria-hidden="true" />
      <div className="arena-public-hero__particles" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <div className="arena-public-hero__identity">
        <div className="arena-public-avatar">{profile.avatarEmoji}</div>
        <div className="arena-public-hero__info">
          <div className="arena-public-hero__name-row">
            <h1 className="arena-public-hero__name">{profile.name}</h1>
            <RankBadge rank={profile.rank} />
          </div>
          <div className="arena-public-hero__code">{profile.agentCode}</div>
          <AchievementBadgeRow badges={profile.badges} maxVisible={7} />
        </div>
      </div>

      <div className={cn("arena-public-hero__pnl", pnlTone === "good" ? "arena-public-hero__pnl--up" : pnlTone === "bad" ? "arena-public-hero__pnl--down" : "")}>
        <span className="arena-public-hero__pnl-label">{t("allTimePnl")}</span>
        <strong className="arena-public-hero__pnl-value">{formatSignedCurrency(profile.allTimePnl)}</strong>
      </div>
    </div>
  );

  return (
    <div className="arena-public-profile">
      {profile.heat > 0.05 ? (
        <AgentHeatGlow heat={profile.heat}>{heroContent}</AgentHeatGlow>
      ) : (
        heroContent
      )}

      {/* Stats Grid */}
      <div className="arena-public-stats">
        <div className="arena-public-stat">
          <span>{t("selectedPnl")}</span>
          <strong>{formatSignedCurrency(profile.selectedPnl)}</strong>
        </div>
        <div className="arena-public-stat">
          <span>{t("winRate")}</span>
          <WinRateRing winRate={profile.winRate} size={56} />
        </div>
        <div className="arena-public-stat">
          <span>{t("totalTrades")}</span>
          <strong>{profile.totalTrades.toLocaleString()}</strong>
        </div>
        <div className="arena-public-stat">
          <span>Streak</span>
          <strong>{streakLabel(profile.currentStreak)}</strong>
        </div>
        <div className="arena-public-stat">
          <span>{t("openShort")}</span>
          <strong>{profile.openPositions}</strong>
        </div>
      </div>

      {/* Equity Curve */}
      {profile.sparkline.length >= 2 && (
        <div className="arena-public-card">
          <div className="arena-section-kicker">{t("publicEquityCurve")}</div>
          <div className="arena-public-chart">
            <PnlSparkline
              data={profile.sparkline.map((p) => ({ slug: "", pnl: p.pnl, trades: 0, winRate: 0, openPositions: 0 }))}
              width={600}
              height={120}
            />
          </div>
        </div>
      )}

      {/* Strategy DNA + Market Breakdown side by side */}
      <div className="arena-public-duo">
        <div className="arena-public-card">
          <div className="arena-section-kicker">{t("strategyDNA")}</div>
          <div className="arena-public-dna">
            <StrategyDNAChart dna={profile.dna} size={200} />
          </div>
        </div>

        {profile.marketBreakdown.length > 0 && (
          <div className="arena-public-card">
            <div className="arena-section-kicker">{t("publicMarkets")}</div>
            <div className="arena-public-markets">
              {profile.marketBreakdown.map((m) => (
                <div key={m.slug} className="arena-public-market-row">
                  <span className="arena-public-market-slug" title={m.slug}>{m.slug}</span>
                  <span className={m.pnl >= 0 ? "arena-flyout-pnl--up" : "arena-flyout-pnl--down"}>
                    {formatSignedCompact(m.pnl)}
                  </span>
                  <span>{m.trades}</span>
                  <span>{m.winRate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share + CTA */}
      <div className="arena-public-footer">
        <ShareButtons
          url={shareUrl}
          text={`${profile.avatarEmoji} ${profile.name} is ranked #${profile.rank ?? "—"} in the Quantik Arena! PnL: ${formatSignedCurrency(profile.allTimePnl)}`}
        />
        <Link href="/agent-factory" className="arena-public-cta">
          {t("publicJoinCta")}
        </Link>
      </div>
    </div>
  );
}
