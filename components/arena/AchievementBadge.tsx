"use client";

import { type CSSProperties, useCallback, useRef, useState } from "react";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  tier: string;
  emoji: string;
}

interface AchievementBadgeProps {
  badge: BadgeData;
  index?: number;
}

const TIER_CLASS: Record<string, string> = {
  common: "arena-badge--common",
  rare: "arena-badge--rare",
  epic: "arena-badge--epic",
  legendary: "arena-badge--legendary",
};

const TIER_LABEL: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function AchievementBadge({ badge, index = 0 }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const tierClass = TIER_CLASS[badge.tier] ?? TIER_CLASS.common;

  const handleEnter = useCallback(() => setShowTooltip(true), []);
  const handleLeave = useCallback(() => setShowTooltip(false), []);

  const style: CSSProperties = {
    "--badge-index": index,
  } as CSSProperties;

  return (
    <span
      ref={badgeRef}
      className={`arena-badge ${tierClass}`}
      style={style}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
      role="img"
      aria-label={`${badge.name} badge — ${badge.description}`}
    >
      <span className="arena-badge-emoji">{badge.emoji}</span>

      {showTooltip && (
        <span className="arena-badge-tooltip" role="tooltip">
          <strong className="arena-badge-tooltip-name">{badge.name}</strong>
          <span className="arena-badge-tooltip-desc">{badge.description}</span>
          <span className={`arena-badge-tooltip-tier arena-badge-tooltip-tier--${badge.tier}`}>
            {TIER_LABEL[badge.tier] ?? "Common"}
          </span>
        </span>
      )}
    </span>
  );
}

export function AchievementBadgeRow({
  badges,
  maxVisible = 3,
}: {
  badges: BadgeData[];
  maxVisible?: number;
}) {
  if (badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  return (
    <span className="arena-badge-row">
      {visible.map((badge, i) => (
        <AchievementBadge key={badge.id} badge={badge} index={i} />
      ))}
      {overflow > 0 && (
        <span className="arena-badge-overflow" title={`${overflow} more badge${overflow > 1 ? "s" : ""}`}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
