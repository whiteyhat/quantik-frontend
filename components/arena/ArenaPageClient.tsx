"use client";

import { type CSSProperties, type MouseEvent, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, Crown, Flame, Radar, RefreshCw, Search, Shield, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { type ArenaLeaderboardEntry, type ArenaViewerContext, type ArenaWindow } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { useNow } from "@/hooks/useNow";
import { useArenaLeaderboardQuery } from "@/components/dashboard/dashboardQueries";
import {
  ARENA_WINDOW_OPTIONS,
  battleTone,
  buildWindowHref,
  filterArenaLeaders,
  findNextRival,
  formatSignedCompact,
  formatSignedCurrency,
  isOpenClawAgent,
  progressPercent,
  protocolKeys,
  streakLabel,
} from "@/components/arena/arenaHelpers";
import {
  CommandCenterCard,
  MetricBlock,
  PanelEmptyState,
  PanelErrorState,
  StatusBadge,
} from "@/components/dashboard/DashboardPrimitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuantikStore } from "@/store/useQuantikStore";

const THRONE_PARTICLE_STYLE_ID = "arena-throne-particle-keyframes";
const THRONE_PARTICLES = ["🏆", "🌟", "👑", "💯", "🎉"] as const;

type ThroneEmojiParticle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  fontSize: number;
  emoji: (typeof THRONE_PARTICLES)[number];
  duration: number;
  anim: "arena-throne-emoji-burst" | "arena-throne-emoji-float";
  rot0: number;
  rot1: number;
  scale: number;
};

type ThroneParticleStyle = CSSProperties & Record<"--arena-particle-dx" | "--arena-particle-dy" | "--arena-particle-rot0" | "--arena-particle-rot1" | "--arena-particle-scale", string>;

let throneParticleId = 0;

function ensureThroneParticleKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(THRONE_PARTICLE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = THRONE_PARTICLE_STYLE_ID;
  style.textContent = `
    @keyframes arena-throne-emoji-float {
      0% {
        transform: translate3d(0, 0, 0) scale(var(--arena-particle-scale)) rotate(var(--arena-particle-rot0));
        opacity: 0;
        filter: blur(0);
      }
      18% {
        opacity: 0.98;
      }
      62% {
        opacity: 0.62;
      }
      100% {
        transform: translate3d(var(--arena-particle-dx), var(--arena-particle-dy), 0) scale(calc(var(--arena-particle-scale) * 0.34)) rotate(var(--arena-particle-rot1));
        opacity: 0;
        filter: blur(2.5px);
      }
    }

    @keyframes arena-throne-emoji-burst {
      0% {
        transform: translate3d(0, 0, 0) scale(0.12) rotate(var(--arena-particle-rot0));
        opacity: 0;
      }
      14% {
        opacity: 1;
        transform: translate3d(calc(var(--arena-particle-dx) * 0.14), calc(var(--arena-particle-dy) * 0.14), 0) scale(var(--arena-particle-scale)) rotate(calc(var(--arena-particle-rot0) * 0.42));
      }
      64% {
        opacity: 0.56;
      }
      100% {
        transform: translate3d(var(--arena-particle-dx), var(--arena-particle-dy), 0) scale(calc(var(--arena-particle-scale) * 0.08)) rotate(var(--arena-particle-rot1));
        opacity: 0;
        filter: blur(4px);
      }
    }
  `;
  document.head.appendChild(style);
}

function pickThroneEmoji() {
  return THRONE_PARTICLES[Math.floor(Math.random() * THRONE_PARTICLES.length)];
}

function podiumLabel(rank: number, labels: {
  topPerformer: string;
  runnerUp: string;
  thirdPlace: string;
}) {
  if (rank === 1) return labels.topPerformer;
  if (rank === 2) return labels.runnerUp;
  return labels.thirdPlace;
}

function contenderReasonCopy(
  reason: ArenaViewerContext["reason"],
  labels: {
    viewerInactive: string;
    viewerNoActivity: string;
    viewerRanked: string;
    viewerNoAgent: string;
  },
) {
  if (reason === "inactive") return labels.viewerInactive;
  if (reason === "no_activity") return labels.viewerNoActivity;
  if (reason === "ranked") return labels.viewerRanked;
  return labels.viewerNoAgent;
}

function contenderEyebrow(reason: ArenaViewerContext["reason"], labels: {
  dockRankedEyebrow: string;
  dockClimbEyebrow: string;
  dockOpenEyebrow: string;
}) {
  if (reason === "ranked") return labels.dockRankedEyebrow;
  if (reason === "no_agent") return labels.dockOpenEyebrow;
  return labels.dockClimbEyebrow;
}

function contenderDetailCopy(reason: ArenaViewerContext["reason"], labels: {
  dockRankedDetail: string;
  dockInactiveDetail: string;
  dockNoActivityDetail: string;
  dockNoAgentDetail: string;
}) {
  if (reason === "ranked") return labels.dockRankedDetail;
  if (reason === "inactive") return labels.dockInactiveDetail;
  if (reason === "no_activity") return labels.dockNoActivityDetail;
  return labels.dockNoAgentDetail;
}

function qualifierLabel(viewer: ArenaViewerContext | undefined, labels: {
  qualifierReady: string;
  qualifierLocked: string;
  qualifierMissing: string;
}) {
  if (!viewer || viewer.reason === "no_agent") return labels.qualifierMissing;
  if (viewer.eligible) return labels.qualifierReady;
  return labels.qualifierLocked;
}

function ArenaTabBar({ activeWindow }: { activeWindow: ArenaWindow }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="arena-tabs" role="tablist" aria-label="Arena windows">
      {ARENA_WINDOW_OPTIONS.map((windowOption) => (
        <Link
          key={windowOption.value}
          href={buildWindowHref(pathname, searchParams, windowOption.value)}
          className={cn("arena-tab", activeWindow === windowOption.value && "arena-tab--active")}
          id={`arena-tab-${windowOption.value}`}
          role="tab"
          aria-selected={activeWindow === windowOption.value}
          aria-controls="arena-stage-panel"
          aria-current={activeWindow === windowOption.value ? "page" : undefined}
          tabIndex={activeWindow === windowOption.value ? 0 : -1}
        >
          <span className="arena-tab__label">{windowOption.label}</span>
        </Link>
      ))}
    </div>
  );
}

function ArenaFlankCard({
  entry,
  now,
  isViewer,
  align,
}: {
  entry: ArenaLeaderboardEntry;
  now: number;
  isViewer: boolean;
  align: "left" | "right";
}) {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const originLabel = isOpenClawAgent(entry.agentType) ? t("openClawAgent") : t("quantikAgent");

  return (
    <article className={cn("arena-pylon-card", `arena-pylon-card--${align}`, isViewer && "arena-pylon-card--viewer")}>
      <div className="arena-pylon-topline">
        <span className="arena-pylon-rank">#{entry.rank}</span>
        <span className="arena-pylon-role">
          {podiumLabel(entry.rank, {
            topPerformer: t("topPerformer"),
            runnerUp: t("runnerUp"),
            thirdPlace: t("thirdPlace"),
          })}
        </span>
        {isViewer ? <span className="arena-viewer-tag">{t("viewerBadge")}</span> : null}
      </div>

      <div className="arena-pylon-agent">
        <div className="arena-podium-avatar arena-pylon-avatar">{entry.avatarEmoji}</div>
        <div className="min-w-0">
          <div className="arena-pylon-name" title={entry.name}>{entry.name}</div>
          <div className="arena-podium-code" title={entry.agentCode}>{entry.agentCode}</div>
        </div>
      </div>

      <div className={cn("arena-pylon-pnl", entry.selectedPnl >= 0 ? "arena-pylon-pnl--up" : "arena-pylon-pnl--down")}>
        {formatSignedCurrency(entry.selectedPnl)}
      </div>

      <div className="arena-pylon-metrics">
        <div>
          <span>{t("winRate")}</span>
          <strong>{entry.winRate.toFixed(1)}%</strong>
        </div>
        <div>
          <span>{t("openPositions")}</span>
          <strong>{entry.openPositions}</strong>
        </div>
      </div>

      <div className="arena-pylon-foot">
        <span className={cn("arena-status-pill", "arena-status-pill--origin", isOpenClawAgent(entry.agentType) ? "arena-status-pill--origin-openclaw" : "arena-status-pill--origin-quantik")}>
          {originLabel}
        </span>
        <span className="arena-status-pill arena-status-pill--neutral">{formatRelativeTime(entry.lastTradeAt, now, tCommon)}</span>
        <span className={cn("arena-status-pill", entry.autopilotEnabled ? "arena-status-pill--good" : "arena-status-pill--neutral")}>
          {entry.autopilotEnabled ? t("autopilotOn") : t("autopilotOff")}
        </span>
      </div>
    </article>
  );
}

function ArenaOpenSlot({
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

function ChampionThroneCard({
  entry,
  now,
  isViewer,
}: {
  entry: ArenaLeaderboardEntry;
  now: number;
  isViewer: boolean;
}) {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const originLabel = isOpenClawAgent(entry.agentType) ? t("openClawAgent") : t("quantikAgent");
  const cardRef = useRef<HTMLElement>(null);
  const lastSpawnRef = useRef(0);
  const [emojiParticles, setEmojiParticles] = useState<ThroneEmojiParticle[]>([]);

  useEffect(ensureThroneParticleKeyframes, []);

  const handleMouseEnter = useCallback((event: MouseEvent<HTMLElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const burst = Array.from({ length: 5 }, (_, index): ThroneEmojiParticle => {
      const angle = -Math.PI / 2 + ((index - 2) / 4) * Math.PI * 0.95 + (Math.random() - 0.5) * 0.24;
      const speed = 48 + Math.random() * 46;
      const rot0 = (Math.random() - 0.5) * 26;
      const rot1 = rot0 + (Math.random() - 0.5) * 160;
      return {
        id: ++throneParticleId,
        x: cx + (Math.random() - 0.5) * 36,
        y: cy + (Math.random() - 0.5) * 20,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 14,
        fontSize: 24 + Math.random() * 28 + (Math.random() > 0.68 ? 18 + Math.random() * 18 : 0),
        emoji: pickThroneEmoji(),
        duration: 1700 + Math.random() * 900,
        anim: "arena-throne-emoji-burst",
        rot0,
        rot1,
        scale: 0.72 + Math.random() * 0.4,
      };
    });

    setEmojiParticles(burst);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const nowMs = Date.now();
    if (nowMs - lastSpawnRef.current < 140) return;
    lastSpawnRef.current = nowMs;

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.88;
    const speed = 22 + Math.random() * 26;
    const rot0 = (Math.random() - 0.5) * 24;
    const rot1 = rot0 + (Math.random() - 0.5) * 140;

    const particle: ThroneEmojiParticle = {
      id: ++throneParticleId,
      x: x + (Math.random() - 0.5) * 22,
      y: y + (Math.random() - 0.5) * 16,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      fontSize: 18 + Math.random() * 24 + (Math.random() > 0.78 ? 14 + Math.random() * 18 : 0),
      emoji: pickThroneEmoji(),
      duration: 1450 + Math.random() * 850,
      anim: "arena-throne-emoji-float",
      rot0,
      rot1,
      scale: 0.62 + Math.random() * 0.36,
    };

    setEmojiParticles((current) => [...current.slice(-20), particle]);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setEmojiParticles([]);
  }, []);

  return (
    <article
      ref={cardRef}
      className={cn("arena-throne-card", isViewer && "arena-throne-card--viewer")}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="arena-throne-glow" aria-hidden="true" />
      <div className="arena-throne-particle-layer" aria-hidden="true">
        {emojiParticles.map((particle) => {
          const particleStyle: ThroneParticleStyle = {
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            fontSize: `${particle.fontSize}px`,
            animationDuration: `${particle.duration}ms`,
            animationName: particle.anim,
            "--arena-particle-dx": `${particle.dx}px`,
            "--arena-particle-dy": `${particle.dy}px`,
            "--arena-particle-rot0": `${particle.rot0}deg`,
            "--arena-particle-rot1": `${particle.rot1}deg`,
            "--arena-particle-scale": String(particle.scale),
          };

          return (
          <span
            key={particle.id}
            className="arena-throne-particle"
            style={particleStyle}
            onAnimationEnd={() => {
              setEmojiParticles((current) => current.filter((item) => item.id !== particle.id));
            }}
          >
            {particle.emoji}
          </span>
          );
        })}
      </div>
      <div className="arena-throne-crown" aria-hidden="true">
        <Crown className="size-5" />
      </div>

      <div className="arena-throne-topline">
        <div className="arena-throne-title-stack">
          <span className="arena-throne-rank">#{entry.rank}</span>
          <div>
            <div className="arena-section-kicker">{t("stageChampionKicker")}</div>
            <div className="arena-throne-role">{t("topPerformer")}</div>
          </div>
        </div>
        {isViewer ? <span className="arena-viewer-tag">{t("viewerBadge")}</span> : null}
      </div>

      <div className="arena-throne-core">
        <div className="arena-throne-portrait">
          <div className="arena-throne-avatar">{entry.avatarEmoji}</div>
          <div className="arena-throne-agent">
            <div className="arena-throne-name" title={entry.name}>{entry.name}</div>
            <div className="arena-podium-code" title={entry.agentCode}>{entry.agentCode}</div>
          </div>
        </div>
      </div>

      <div className="arena-throne-pnl-shell">
        <div className="arena-throne-pnl-stack">
          <div className={cn("arena-throne-pnl", entry.selectedPnl >= 0 ? "arena-throne-pnl--up" : "arena-throne-pnl--down")}>
            {formatSignedCurrency(entry.selectedPnl)}
          </div>
          <div className="arena-throne-pnl-copy">
            <span>{t("allTimePnl")}</span>
            <strong>{formatSignedCurrency(entry.allTimePnl)}</strong>
          </div>
        </div>
      </div>

      <div className="arena-throne-strip">
        <div className="arena-throne-stat">
          <span>{t("winRate")}</span>
          <strong>{entry.winRate.toFixed(1)}%</strong>
        </div>
        <div className="arena-throne-stat">
          <span>{t("realized")}</span>
          <strong>{formatSignedCompact(entry.selectedRealizedPnl)}</strong>
        </div>
        <div className="arena-throne-stat">
          <span>{t("liveEdge")}</span>
          <strong>{formatSignedCompact(entry.selectedUnrealizedPnl)}</strong>
        </div>
        <div className="arena-throne-stat">
          <span>{t("lastTrade")}</span>
          <strong>{formatRelativeTime(entry.lastTradeAt, now, tCommon)}</strong>
        </div>
      </div>

      <div className="arena-throne-foot">
        <span className={cn("arena-status-pill", "arena-status-pill--origin", isOpenClawAgent(entry.agentType) ? "arena-status-pill--origin-openclaw" : "arena-status-pill--origin-quantik")}>
          {originLabel}
        </span>
        <span className={cn("arena-status-pill", entry.autopilotEnabled ? "arena-status-pill--good" : "arena-status-pill--neutral")}>
          {entry.autopilotEnabled ? t("autopilotOn") : t("autopilotOff")}
        </span>
        <span className={cn("arena-status-pill", entry.polymarketReady ? "arena-status-pill--good" : "arena-status-pill--warn")}>
          {entry.polymarketReady ? t("battleReady") : t("training")}
        </span>
        <span className={cn("arena-status-pill", battleTone(entry.bestTradePnl) === "good" ? "arena-status-pill--good" : "arena-status-pill--neutral")}>
          {t("bestTrade")} {formatSignedCurrency(entry.bestTradePnl)}
        </span>
      </div>
    </article>
  );
}

function TelemetryStrip({
  champion,
  hottestStreak,
  bestTradeLeader,
  activeWindow,
}: {
  champion: ArenaLeaderboardEntry | null;
  hottestStreak: ArenaLeaderboardEntry | null;
  bestTradeLeader: ArenaLeaderboardEntry | null;
  activeWindow: ArenaWindow;
}) {
  const t = useTranslations("arena");
  const keys = protocolKeys(activeWindow);
  const telemetryCards = [
    {
      key: "crown",
      icon: Crown,
      label: t("crownPressure"),
      title: champion?.name ?? t("telemetryUnavailable"),
      value: champion ? formatSignedCurrency(champion.selectedPnl) : t("telemetryNoSignal"),
      href: "/reports",
    },
    {
      key: "streak",
      icon: Flame,
      label: t("hottestStreak"),
      title: hottestStreak?.name ?? t("telemetryUnavailable"),
      value: hottestStreak ? streakLabel(hottestStreak.currentStreak) : t("telemetryNoSignal"),
      href: "/reports",
    },
    {
      key: "best-trade",
      icon: Zap,
      label: t("bestTradePulse"),
      title: bestTradeLeader?.name ?? t("telemetryUnavailable"),
      value: bestTradeLeader ? formatSignedCurrency(bestTradeLeader.bestTradePnl) : t("telemetryNoSignal"),
      href: "/reports",
    },
    {
      key: "protocol",
      icon: Radar,
      label: t("battleProtocol"),
      title: t(keys.protocolKey),
      value: t("telemetryProtocolHint"),
      href: "/manage-agent",
    },
  ];

  return (
    <div className="arena-telemetry-strip">
      {telemetryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.key} href={card.href} className="arena-telemetry-card">
            <Icon className="size-4" />
            <div className="arena-telemetry-copy">
              <span>{card.label}</span>
              <strong className="arena-telemetry-title" title={card.title}>{card.title}</strong>
              <small className="arena-telemetry-value">{card.value}</small>
            </div>
            <ArrowRight className="arena-telemetry-arrow size-4" />
          </Link>
        );
      })}
    </div>
  );
}

function BattleLaneRow({
  entry,
  now,
  isViewer,
}: {
  entry: ArenaLeaderboardEntry;
  now: number;
  isViewer: boolean;
}) {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const connectionLabel = entry.connectionStatus?.replace(/_/g, " ") ?? t("training");

  return (
    <article className={cn("arena-lane", isViewer && "arena-lane--viewer")}>
      <div className="arena-lane-rankblade">
        <span>#{entry.rank}</span>
      </div>

      <div className="arena-lane-agent">
        <div className="arena-board-avatar arena-lane-avatar">{entry.avatarEmoji}</div>
        <div className="min-w-0">
          <div className="arena-board-name-row">
            <span className="arena-board-name" title={entry.name}>{entry.name}</span>
            {isViewer ? <span className="arena-viewer-tag">{t("viewerBadge")}</span> : null}
          </div>
          <div className="arena-lane-meta">
            <span title={entry.agentCode}>{entry.agentCode}</span>
            <span>{entry.openPositions} {t("openShort")}</span>
            <span>{streakLabel(entry.currentStreak)}</span>
            <span>{connectionLabel}</span>
          </div>
        </div>
      </div>

      <div className={cn("arena-lane-pnl", entry.selectedPnl >= 0 ? "arena-lane-pnl--up" : "arena-lane-pnl--down")}>
        <strong>{formatSignedCurrency(entry.selectedPnl)}</strong>
        <span>{t("allTimePnl")} {formatSignedCompact(entry.allTimePnl)}</span>
      </div>

      <div className="arena-lane-intel">
        <div className="arena-lane-intel-chip">
          <span>{t("realized")}</span>
          <strong>{formatSignedCompact(entry.selectedRealizedPnl)}</strong>
        </div>
        <div className="arena-lane-intel-chip">
          <span>{t("unrealized")}</span>
          <strong>{formatSignedCompact(entry.selectedUnrealizedPnl)}</strong>
        </div>
        <div className="arena-lane-intel-chip">
          <span>{t("winRate")}</span>
          <strong>{entry.winRate.toFixed(1)}%</strong>
        </div>
        <div className="arena-lane-intel-chip">
          <span>{t("totalTrades")}</span>
          <strong>{entry.totalTrades}</strong>
        </div>
      </div>

      <div className="arena-lane-trail">
        <div className="arena-lane-tag-stack">
          <span className={cn("arena-status-pill", entry.autopilotEnabled ? "arena-status-pill--good" : "arena-status-pill--neutral")}>
            {entry.autopilotEnabled ? t("autopilotOn") : t("autopilotOff")}
          </span>
          <span className={cn("arena-status-pill", entry.polymarketReady ? "arena-status-pill--good" : "arena-status-pill--warn")}>
            {entry.polymarketReady ? t("battleReady") : t("training")}
          </span>
        </div>
        <div className="arena-lane-last">
          <span>{t("lastTrade")}</span>
          <strong>{formatRelativeTime(entry.lastTradeAt, now, tCommon)}</strong>
        </div>
      </div>
    </article>
  );
}

function ContenderDock({
  viewer,
  viewerEntry,
  viewerName,
  viewerAvatar,
  viewerCode,
  leaders,
}: {
  viewer: ArenaViewerContext | undefined;
  viewerEntry: ArenaLeaderboardEntry | null;
  viewerName: string;
  viewerAvatar: string;
  viewerCode: string;
  leaders: ArenaLeaderboardEntry[];
}) {
  const t = useTranslations("arena");
  const selectedBaseline = viewerEntry?.selectedPnl ?? viewer?.referencePnl ?? 0;
  const crownGap = viewer?.gapToCrown ?? 0;
  const qualifierTone = viewer?.ranked ? "good" : viewer?.reason === "no_agent" ? "neutral" : "warn";
  const nextRival = findNextRival(leaders, viewer);
  const nextRivalGap = nextRival ? Math.max(0, nextRival.selectedPnl - selectedBaseline) : 0;

  return (
    <div className="arena-dock-stack">
      <CommandCenterCard accent={viewer?.ranked ? "green" : viewer?.reason === "no_agent" ? "neutral" : "orange"} className="arena-dock-card">
        <div className="arena-dock-topline">
          <div className="arena-eyebrow">
            {contenderEyebrow(viewer?.reason ?? "no_agent", {
              dockRankedEyebrow: t("dockRankedEyebrow"),
              dockClimbEyebrow: t("dockClimbEyebrow"),
              dockOpenEyebrow: t("dockOpenEyebrow"),
            })}
          </div>
          <StatusBadge
            tone={qualifierTone}
            label={qualifierLabel(viewer, {
              qualifierReady: t("qualifierReady"),
              qualifierLocked: t("qualifierLocked"),
              qualifierMissing: t("qualifierMissing"),
            })}
          />
        </div>

        <div className="arena-dock-head">
          <div className="arena-dock-target">
            <div className="arena-dock-target-glow" aria-hidden="true" />
            <div className="arena-dock-avatar-shell">
              <div className="arena-contender-avatar arena-dock-avatar">{viewerAvatar}</div>
            </div>
            <div className="arena-dock-target-copy">
              <div className="arena-dock-target-name" title={viewerName}>{viewerName}</div>
              <div className="arena-dock-target-code" title={viewerCode}>{viewerCode}</div>
            </div>
            <div className={cn("arena-dock-rank", !viewer?.ranked && "arena-dock-rank--ghost")}>
              {viewer?.ranked ? `#${viewer.rank}` : t("outsideBoard")}
            </div>
          </div>
          <div className="arena-dock-detail min-w-0">
            <div className="arena-board-subline arena-dock-statusline">
              <span>
                {contenderReasonCopy(viewer?.reason ?? "no_agent", {
                  viewerInactive: t("viewerInactive"),
                  viewerNoActivity: t("viewerNoActivity"),
                  viewerRanked: t("viewerRanked"),
                  viewerNoAgent: t("viewerNoAgent"),
                })}
              </span>
            </div>
            <p className="arena-dock-copy">
              {contenderDetailCopy(viewer?.reason ?? "no_agent", {
                dockRankedDetail: t("dockRankedDetail"),
                dockInactiveDetail: t("dockInactiveDetail"),
                dockNoActivityDetail: t("dockNoActivityDetail"),
                dockNoAgentDetail: t("dockNoAgentDetail"),
              })}
            </p>
          </div>
        </div>

        <div className="arena-dock-metrics">
          <div className="arena-dock-metric">
            <span>{t("selectedPnl")}</span>
            <strong>{formatSignedCurrency(selectedBaseline)}</strong>
          </div>
          <div className="arena-dock-metric">
            <span>{t("allTimePnl")}</span>
            <strong>{formatSignedCurrency(viewerEntry?.allTimePnl ?? 0)}</strong>
          </div>
          <div className="arena-dock-metric">
            <span>{t("winRate")}</span>
            <strong>{viewerEntry ? `${viewerEntry.winRate.toFixed(1)}%` : "0.0%"}</strong>
          </div>
          <div className="arena-dock-metric">
            <span>{t("totalTrades")}</span>
            <strong>{viewerEntry?.totalTrades ?? 0}</strong>
          </div>
        </div>

        <div className="arena-dock-rival">
          <div className="arena-section-kicker">{t("nextRival")}</div>
          {nextRival ? (
            <div className="arena-dock-rival-card">
              <div className="arena-dock-rival-head">
                <div className="arena-board-avatar arena-dock-rival-avatar">{nextRival.avatarEmoji}</div>
                <div className="min-w-0">
                  <div className="arena-board-name" title={nextRival.name}>{nextRival.name}</div>
                  <div className="arena-board-subline">
                    <span title={nextRival.agentCode}>{nextRival.agentCode}</span>
                    <span>#{nextRival.rank}</span>
                  </div>
                </div>
              </div>
              <div className="arena-dock-rival-metrics">
                <div>
                  <span>{t("lockOnGap")}</span>
                  <strong>{formatSignedCurrency(nextRivalGap)}</strong>
                </div>
                <div>
                  <span>{t("selectedPnl")}</span>
                  <strong>{formatSignedCurrency(nextRival.selectedPnl)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="arena-dock-copy">{t("nextRivalEmpty")}</p>
          )}
        </div>

        <div className="arena-lock-stack">
          <div className="arena-lock-row">
            <div>
              <span>{t("gapTop10")}</span>
              <strong>{formatSignedCurrency(viewer?.gapToTop10 ?? 0)}</strong>
            </div>
            <div className="arena-lock-bar">
              <span style={{ width: `${progressPercent(viewer?.gapToTop10 ?? 0, crownGap)}%` }} />
            </div>
          </div>
          <div className="arena-lock-row">
            <div>
              <span>{t("gapPodium")}</span>
              <strong>{formatSignedCurrency(viewer?.gapToPodium ?? 0)}</strong>
            </div>
            <div className="arena-lock-bar">
              <span style={{ width: `${progressPercent(viewer?.gapToPodium ?? 0, crownGap)}%` }} />
            </div>
          </div>
          <div className="arena-lock-row">
            <div>
              <span>{t("gapCrown")}</span>
              <strong>{formatSignedCurrency(crownGap)}</strong>
            </div>
            <div className="arena-lock-bar">
              <span style={{ width: `${progressPercent(crownGap, crownGap)}%` }} />
            </div>
          </div>
        </div>
      </CommandCenterCard>
    </div>
  );
}

function BattleControlsPanel({
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

export function ArenaPageClient() {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const myAgent = useQuantikStore((state) => state.myAgent);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewerFocus, setViewerFocus] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const windowParam = searchParams.get("window");
  const activeWindow: ArenaWindow = windowParam === "day" || windowParam === "week" ? windowParam : "all";
  const arenaQuery = useArenaLeaderboardQuery(activeWindow);
  const now = useNow(10_000);
  const keys = protocolKeys(activeWindow);

  const leaders = arenaQuery.data?.leaders ?? [];
  const viewer = arenaQuery.data?.viewer;
  const viewerEntry = viewer?.entry ?? null;
  const podiumLeaders = leaders.slice(0, 3);
  const champion = podiumLeaders[0] ?? null;
  const viewerName = viewerEntry?.name ?? myAgent?.name ?? t("unknownAgent");
  const viewerAvatar = viewerEntry?.avatarEmoji ?? myAgent?.avatar_emoji ?? "🤖";
  const viewerCode = viewerEntry?.agentCode ?? myAgent?.agent_code ?? t("unknownAgent");
  const battlePool = arenaQuery.data?.meta.totalSelectedPnlPool ?? 0;
  const unrealizedPool = arenaQuery.data?.meta.totalUnrealizedPnlPool ?? 0;
  const hottestStreak = leaders.slice().sort((left, right) => Math.abs(right.currentStreak) - Math.abs(left.currentStreak))[0] ?? null;
  const bestTradeLeader = leaders.slice().sort((left, right) => right.bestTradePnl - left.bestTradePnl)[0] ?? null;
  const battlePoolLabel = battlePool > 0 ? t("positivePool") : battlePool < 0 ? t("negativePool") : t("neutralPool");
  const lastPulseAt = arenaQuery.data?.meta.lastTradeAt;
  const filteredLeaders = filterArenaLeaders(leaders, {
    query: deferredSearchTerm,
    viewerFocus,
    viewer,
  });
  const hasSearchFilters = deferredSearchTerm.trim().length > 0 || viewerFocus;
  const defaultLeaders = leaders.slice(0, 10);
  const warTableLeaders = hasSearchFilters
    ? filteredLeaders
    : viewer?.ranked && viewerEntry && viewer.rank && viewer.rank > 10
      ? [...defaultLeaders, viewerEntry]
      : defaultLeaders;

  return (
    <div className="arena-shell">
      <section className="arena-prelude">
        <div className="arena-prelude-copy">
          <div className="arena-eyebrow">{t("eyebrow")}</div>
          <h1 className="arena-title">⚔️ {t("title")}</h1>
          <p className="arena-subtitle">{t("subtitle")}</p>
        </div>

        <div className="arena-prelude-panel">
          <div className="arena-prelude-panel__top">
            <ArenaTabBar activeWindow={activeWindow} />
            <div className="arena-prelude-badges">
              <StatusBadge tone={battleTone(battlePool)} label={battlePoolLabel} />
              <StatusBadge
                tone={viewer?.ranked ? "good" : viewer?.reason === "no_agent" ? "neutral" : "warn"}
                label={contenderReasonCopy(viewer?.reason ?? "no_agent", {
                  viewerInactive: t("viewerInactive"),
                  viewerNoActivity: t("viewerNoActivity"),
                  viewerRanked: t("viewerRanked"),
                  viewerNoAgent: t("viewerNoAgent"),
                })}
              />
              <StatusBadge tone="info" label={t("updatedAt", { time: formatRelativeTime(arenaQuery.data?.updatedAt, now, tCommon) })} />
            </div>
          </div>

          <div className="arena-prelude-lockup">
            <div className="arena-prelude-protocol">
              <div className="arena-section-kicker">{t("modeLock")}</div>
              <div className="arena-prelude-protocol__value">{t(keys.protocolKey)}</div>
              <p>{t(keys.rulesKey)}</p>
            </div>

            <div className="arena-prelude-target">
              <div className="arena-prelude-target__field" aria-hidden="true" />
              <div className="arena-prelude-target__rings" aria-hidden="true" />
              <div className="arena-prelude-target__particles" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="arena-prelude-target__core">
                <span>{viewerAvatar}</span>
                <strong>{viewer?.ranked ? `#${viewer.rank}` : t("outsideBoard")}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="arena-prelude-metrics">
          <MetricBlock
            label={t("rankedAgents")}
            value={(arenaQuery.data?.meta.rankedAgents ?? 0).toLocaleString()}
            tone="info"
            hint={t("metricRankedHint")}
          />
          <MetricBlock
            label={t("activeAgents")}
            value={(arenaQuery.data?.meta.activeAgents ?? 0).toLocaleString()}
            tone="neutral"
            hint={t("metricActiveHint")}
          />
          <MetricBlock
            label={t("warChest")}
            value={formatSignedCompact(battlePool)}
            tone={battleTone(battlePool)}
            hint={t("metricWarHint")}
          />
          <MetricBlock
            label={t("liveEdge")}
            value={formatSignedCompact(unrealizedPool)}
            tone={battleTone(unrealizedPool)}
            hint={t("lastPulseAt", { time: formatRelativeTime(lastPulseAt, now, tCommon) })}
          />
        </div>
      </section>

      {arenaQuery.isLoading ? (
        <div className="arena-loading-grid">
          <CommandCenterCard accent="orange" className="arena-loading-card">
            <div className="space-y-4">
              <Skeleton width={170} height={14} borderRadius={999} />
              <Skeleton width="54%" height={34} borderRadius={12} />
              <Skeleton width="100%" height={360} borderRadius={28} />
            </div>
          </CommandCenterCard>
          <CommandCenterCard accent="neutral" className="arena-loading-card">
            <div className="space-y-4">
              <Skeleton width={160} height={14} borderRadius={999} />
              <Skeleton width="100%" height={420} borderRadius={28} />
            </div>
          </CommandCenterCard>
        </div>
      ) : arenaQuery.isError ? (
        <CommandCenterCard accent="red">
          <PanelErrorState
            title={t("loadFailedTitle")}
            detail={t("loadFailedDetail")}
            onRetry={() => void arenaQuery.refetch()}
          />
        </CommandCenterCard>
      ) : (
        <div className="arena-grid">
          <div className="arena-main-column">
            <CommandCenterCard accent="orange" className="arena-stage-card" id="arena-stage-panel" role="tabpanel" aria-labelledby={`arena-tab-${activeWindow}`}>
              <div className="arena-stage-header">
                <div>
                  <div className="arena-section-kicker">{t("stageEyebrow")}</div>
                  <h2 className="arena-section-title">{t("stageTitle")}</h2>
                  <p className="arena-section-copy">{t("stageSubtitle")}</p>
                </div>
                <div className="arena-stage-header__meta">
                  <StatusBadge tone="info" label={t(keys.protocolKey)} />
                  <StatusBadge tone="neutral" label={t("updatedAt", { time: formatRelativeTime(arenaQuery.data?.updatedAt, now, tCommon) })} />
                </div>
              </div>

              {champion ? (
                <div className="arena-stage-layout">
                  <div className="arena-stage-pylon">
                    {podiumLeaders[1] ? (
                      <ArenaFlankCard
                        entry={podiumLeaders[1]}
                        now={now}
                        align="left"
                        isViewer={viewer?.agentId === podiumLeaders[1].agentId}
                      />
                    ) : (
                      <ArenaOpenSlot rank={2} title={t("runnerUp")} />
                    )}
                  </div>

                  <ChampionThroneCard
                    entry={champion}
                    now={now}
                    isViewer={viewer?.agentId === champion.agentId}
                  />

                  <div className="arena-stage-pylon">
                    {podiumLeaders[2] ? (
                      <ArenaFlankCard
                        entry={podiumLeaders[2]}
                        now={now}
                        align="right"
                        isViewer={viewer?.agentId === podiumLeaders[2].agentId}
                      />
                    ) : (
                      <ArenaOpenSlot rank={3} title={t("thirdPlace")} />
                    )}
                  </div>
                </div>
              ) : (
                <PanelEmptyState
                  title={t("emptyTitle")}
                  detail={t("emptyDetail")}
                  action={
                    <Link href="/manage-agent" className="arena-hero-link">
                      <RefreshCw className="size-4" />
                      {t("ctaManageAgent")}
                    </Link>
                  }
                />
              )}

              <TelemetryStrip
                champion={champion}
                hottestStreak={hottestStreak}
                bestTradeLeader={bestTradeLeader}
                activeWindow={activeWindow}
              />
            </CommandCenterCard>

            <CommandCenterCard accent="blue" className="arena-war-card">
              <div className="arena-war-header">
                <div>
                  <div className="arena-section-kicker">{t("tableEyebrow")}</div>
                  <h2 className="arena-section-title">{t("tableTitle")}</h2>
                  <p className="arena-section-copy">{t("tableSubtitle")}</p>
                </div>
                <div className="arena-war-header__meta">
                  <div className="arena-war-meta-chip">
                    <Activity className="size-4" />
                    <span>{t("warMetaFiltered", { visible: warTableLeaders.length, total: leaders.length })}</span>
                  </div>
                  <div className="arena-war-meta-chip">
                    <Shield className="size-4" />
                    <span>{t(keys.protocolKey)}</span>
                  </div>
                </div>
              </div>

              <div className="arena-war-controls">
                <label className="arena-search-shell">
                  <Search className="size-4" />
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchPlaceholder")}
                    className="arena-search-input"
                    data-testid="arena-search-input"
                  />
                </label>
                <button
                  type="button"
                  className={cn("arena-filter-chip", viewerFocus && "arena-filter-chip--active")}
                  onClick={() => setViewerFocus((current) => !current)}
                  aria-pressed={viewerFocus}
                  aria-controls="arena-lane-list"
                  disabled={!viewer?.ranked}
                >
                  <Target className="size-4" />
                  {t("focusViewer")}
                </button>
                {hasSearchFilters ? (
                  <button
                    type="button"
                    className="arena-filter-chip"
                    onClick={() => {
                      setSearchTerm("");
                      setViewerFocus(false);
                    }}
                  >
                    <RefreshCw className="size-4" />
                    {t("clearFilters")}
                  </button>
                ) : null}
              </div>

              <div className="arena-lane-list" id="arena-lane-list">
                {warTableLeaders.length > 0 ? (
                  warTableLeaders.map((entry) => (
                    <BattleLaneRow
                      key={entry.agentId}
                      entry={entry}
                      now={now}
                      isViewer={viewer?.agentId === entry.agentId}
                    />
                  ))
                ) : (
                  <PanelEmptyState
                    title={hasSearchFilters ? t("searchEmptyTitle") : t("emptyTitle")}
                    detail={hasSearchFilters ? t("searchEmptyDetail") : t("emptyDetail")}
                  />
                )}
              </div>
            </CommandCenterCard>
          </div>

          <div className="arena-rail">
            <ContenderDock
              viewer={viewer}
              viewerEntry={viewerEntry}
              viewerName={viewerName}
              viewerAvatar={viewerAvatar}
              viewerCode={viewerCode}
              leaders={leaders}
            />

            <BattleControlsPanel viewer={viewer} />
          </div>
        </div>
      )}
    </div>
  );
}
