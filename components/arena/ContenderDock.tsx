"use client";

import { Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ArenaLeaderboardEntry, type ArenaViewerContext } from "@/lib/api";
import {
  contenderDetailCopy,
  contenderEyebrow,
  contenderReasonCopy,
  findNextRival,
  formatSignedCurrency,
  progressPercent,
  qualifierLabel,
} from "@/components/arena/arenaHelpers";
import { CommandCenterCard, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import { cn } from "@/lib/utils";

export function ContenderDock({
  viewer,
  viewerEntry,
  leaders,
  onCompare,
}: {
  viewer: ArenaViewerContext | undefined;
  viewerEntry: ArenaLeaderboardEntry | null;
  leaders: ArenaLeaderboardEntry[];
  onCompare?: () => void;
}) {
  const t = useTranslations("arena");
  const selectedBaseline = viewerEntry?.selectedPnl ?? viewer?.referencePnl ?? 0;
  const crownGap = viewer?.gapToCrown ?? 0;
  const qualifierTone = viewer?.ranked ? "good" : viewer?.reason === "no_agent" ? "neutral" : "warn";
  const nextRival = findNextRival(leaders, viewer);
  const nextRivalGap = nextRival ? Math.max(0, nextRival.selectedPnl - selectedBaseline) : 0;
  const hasViewerIdentity = Boolean(viewerEntry);
  const viewerName = viewerEntry?.name ?? t("qualifierMissing");
  const viewerCode = viewerEntry?.agentCode ?? null;

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
              <div className="arena-contender-avatar arena-dock-avatar">
                {viewerEntry ? viewerEntry.avatarEmoji : <Target className="size-7" />}
              </div>
            </div>
            <div className="arena-dock-target-copy">
              <div className="arena-dock-target-name" title={viewerName}>{viewerName}</div>
              {viewerCode ? <div className="arena-dock-target-code" title={viewerCode}>{viewerCode}</div> : null}
            </div>
            <div className={cn("arena-dock-rank", (!viewer?.ranked || !hasViewerIdentity) && "arena-dock-rank--ghost")}>
              {viewer?.ranked ? `#${viewer.rank}` : hasViewerIdentity ? t("outsideBoard") : "—"}
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
          {onCompare && (
            <button type="button" className="arena-compare-btn" onClick={onCompare}>
              ⚔️ Compare with Crown
            </button>
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
