"use client";

import { type CSSProperties, type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ArenaLeaderboardEntry } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { battleTone, formatSignedCompact, formatSignedCurrency, isOpenClawAgent } from "@/components/arena/arenaHelpers";
import { RankChangeBadge } from "@/components/arena/RankChangeBadge";
import { AchievementBadgeRow } from "@/components/arena/AchievementBadge";
import { AgentHeatGlow } from "@/components/arena/AgentHeatGlow";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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

export function ChampionThroneCard({
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
    const burstCount = Math.round(5 + entry.heat * 5);
    const burst = Array.from({ length: burstCount }, (_, index): ThroneEmojiParticle => {
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
  }, [entry.heat]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const nowMs = Date.now();
    const spawnInterval = Math.max(60, 140 - entry.heat * 80);
    if (nowMs - lastSpawnRef.current < spawnInterval) return;
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
  }, [entry.heat]);

  const handleMouseLeave = useCallback(() => {
    setEmojiParticles([]);
  }, []);

  const card = (
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
          <RankChangeBadge rankChange={entry.rankChange} size="md" />
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
            <div className="arena-throne-name-row">
              <div className="arena-throne-name" title={entry.name}>{entry.name}</div>
              <AchievementBadgeRow badges={entry.badges} maxVisible={4} />
            </div>
            <Link href={`/arena/agent/${entry.agentCode}`} className="arena-podium-code arena-podium-code--link" title={entry.agentCode}>{entry.agentCode}</Link>
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

  if (entry.heat > 0.05) {
    return <AgentHeatGlow heat={entry.heat}>{card}</AgentHeatGlow>;
  }

  return card;
}
