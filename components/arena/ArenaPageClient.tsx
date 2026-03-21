"use client";

import "./arena.css";
import { useDeferredValue, useReducer, useRef, useState } from "react";
import { Activity, RefreshCw, Search, Shield, Star, Swords, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { type ArenaWindow, type ArenaLeaderboardEntry } from "@/lib/api";
import { formatRelativeTime } from "@/lib/dashboard";
import { useNow } from "@/hooks/useNow";
import { useFollowedAgents } from "@/hooks/useFollowedAgents";
import { useArenaLeaderboardQuery } from "@/components/dashboard/dashboardQueries";
import {
  battleTone,
  contenderReasonCopy,
  filterArenaLeaders,
  formatSignedCompact,
  protocolKeys,
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

import { ArenaTabBar } from "./ArenaTabBar";
import { ArenaFlankCard } from "./ArenaFlankCard";
import { ArenaOpenSlot } from "./ArenaOpenSlot";
import { ChampionThroneCard } from "./ChampionThroneCard";
import { TelemetryStrip } from "./TelemetryStrip";
import { BattleLaneRow } from "./BattleLaneRow";
import { ContenderDock } from "./ContenderDock";
import { BattleControlsPanel } from "./BattleControlsPanel";
import { LiveActivityFeed } from "./LiveActivityFeed";

const ComparisonModal = dynamic(() => import("./ComparisonModal"), { ssr: false });

interface CompareState {
  mode: boolean;
  selection: string | null;
  pair: [string, string] | null;
}

type CompareAction =
  | { type: "TOGGLE_MODE" }
  | { type: "SELECT_AGENT"; agentId: string }
  | { type: "SET_PAIR"; pair: [string, string] }
  | { type: "CLOSE_MODAL" };

function compareReducer(state: CompareState, action: CompareAction): CompareState {
  switch (action.type) {
    case "TOGGLE_MODE":
      return { ...state, mode: !state.mode, selection: null };
    case "SELECT_AGENT":
      if (state.selection === null) {
        return { ...state, selection: action.agentId };
      }
      if (state.selection === action.agentId) {
        return { ...state, selection: null };
      }
      return { mode: false, selection: null, pair: [state.selection, action.agentId] };
    case "SET_PAIR":
      return { mode: false, selection: null, pair: action.pair };
    case "CLOSE_MODAL":
      return { ...state, pair: null };
    default:
      return state;
  }
}

export function ArenaPageClient() {
  const t = useTranslations("arena");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewerFocus, setViewerFocus] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [compare, dispatchCompare] = useReducer(compareReducer, { mode: false, selection: null, pair: null });
  const [followingFocus, setFollowingFocus] = useState(false);
  const { followed, isFollowing, toggle: toggleFollow } = useFollowedAgents();
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const windowParam = searchParams.get("window");
  const activeWindow: ArenaWindow = windowParam === "day" || windowParam === "week" ? windowParam : "all";
  const arenaQuery = useArenaLeaderboardQuery(activeWindow);
  const now = useNow(10_000);
  const keys = protocolKeys(activeWindow);
  const hasInitiallyRendered = useRef(false);

  const leaders = arenaQuery.data?.leaders ?? [];
  const viewer = arenaQuery.data?.viewer;
  const viewerEntry = viewer?.entry ?? null;
  const podiumLeaders = leaders.slice(0, 3);
  const champion = podiumLeaders[0] ?? null;
  const battlePool = arenaQuery.data?.meta.totalSelectedPnlPool ?? 0;
  const unrealizedPool = arenaQuery.data?.meta.totalUnrealizedPnlPool ?? 0;
  const hottestStreak = leaders.reduce<ArenaLeaderboardEntry | null>((best, entry) => !best || Math.abs(entry.currentStreak) > Math.abs(best.currentStreak) ? entry : best, null);
  const bestTradeLeader = leaders.reduce<ArenaLeaderboardEntry | null>((best, entry) => !best || entry.bestTradePnl > best.bestTradePnl ? entry : best, null);
  const battlePoolLabel = battlePool > 0 ? t("positivePool") : battlePool < 0 ? t("negativePool") : t("neutralPool");
  const lastPulseAt = arenaQuery.data?.meta.lastTradeAt;
  const filteredLeaders = filterArenaLeaders(leaders, {
    query: deferredSearchTerm,
    viewerFocus,
    viewer,
    followingFocus,
    followedIds: followed,
  });
  const hasSearchFilters = deferredSearchTerm.trim().length > 0 || viewerFocus || followingFocus;
  const defaultLeaders = leaders.slice(0, 10);
  const warTableLeaders = hasSearchFilters
    ? filteredLeaders
    : viewer?.ranked && viewerEntry && viewer.rank && viewer.rank > 10
      ? [...defaultLeaders, viewerEntry]
      : defaultLeaders;

  // Runner-up gap for telemetry flip
  const runnerUpGap = champion && podiumLeaders[1]
    ? Math.round((champion.selectedPnl - podiumLeaders[1].selectedPnl) * 100) / 100
    : undefined;

  // Mark initial render complete for stagger animation
  if (!hasInitiallyRendered.current && warTableLeaders.length > 0) {
    hasInitiallyRendered.current = true;
  }

  return (
    <div className="arena-shell">
      <section className="arena-prelude" id="tour-arena-prelude">
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
              <div className="arena-prelude-target__core" id="tour-arena-position">
                <span>{viewerEntry ? viewerEntry.avatarEmoji : <Target className="size-9" />}</span>
                <strong>{viewer?.ranked ? `#${viewer.rank}` : viewerEntry ? t("outsideBoard") : "—"}</strong>
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
            <CommandCenterCard accent="orange" className="arena-stage-card" id="tour-arena-stage" role="tabpanel" aria-labelledby={`arena-tab-${activeWindow}`}>
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
                runnerUpGap={runnerUpGap}
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
                <button
                  type="button"
                  className={cn("arena-filter-chip", followingFocus && "arena-filter-chip--active")}
                  onClick={() => setFollowingFocus((current) => !current)}
                  aria-pressed={followingFocus}
                  aria-controls="arena-lane-list"
                  disabled={followed.size === 0}
                >
                  <Star className="size-4" />
                  {t("followingFilter")}
                </button>
                <button
                  type="button"
                  className={cn("arena-filter-chip", compare.mode && "arena-filter-chip--active")}
                  onClick={() => dispatchCompare({ type: "TOGGLE_MODE" })}
                  aria-pressed={compare.mode}
                >
                  <Swords className="size-4" />
                  {t("compareMode")}
                </button>
                {hasSearchFilters ? (
                  <button
                    type="button"
                    className="arena-filter-chip"
                    onClick={() => {
                      setSearchTerm("");
                      setViewerFocus(false);
                      setFollowingFocus(false);
                    }}
                  >
                    <RefreshCw className="size-4" />
                    {t("clearFilters")}
                  </button>
                ) : null}
              </div>

              <div className="arena-lane-list" id="arena-lane-list">
                {warTableLeaders.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {warTableLeaders.map((entry, index) => (
                      <BattleLaneRow
                        key={entry.agentId}
                        entry={entry}
                        now={now}
                        isViewer={viewer?.agentId === entry.agentId}
                        isExpanded={expandedAgentId === entry.agentId}
                        onToggleExpand={() => setExpandedAgentId((prev) => prev === entry.agentId ? null : entry.agentId)}
                        staggerIndex={hasInitiallyRendered.current ? undefined : index}
                        activeWindow={activeWindow}
                        compareMode={compare.mode}
                        isCompareSelected={compare.selection === entry.agentId}
                        isFollowing={isFollowing(entry.agentId)}
                        onToggleFollow={toggleFollow}
                        onSelectForCompare={(agentId) => dispatchCompare({ type: "SELECT_AGENT", agentId })}
                      />
                    ))}
                  </AnimatePresence>
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
              leaders={leaders}
              onCompare={
                viewerEntry && champion && viewerEntry.agentId !== champion.agentId
                  ? () => dispatchCompare({ type: "SET_PAIR", pair: [viewerEntry.agentId, champion.agentId] })
                  : undefined
              }
            />

            <BattleControlsPanel viewer={viewer} />

            <LiveActivityFeed />
          </div>
        </div>
      )}

      {compare.pair && (
        <ComparisonModal
          agentId1={compare.pair[0]}
          agentId2={compare.pair[1]}
          window={activeWindow}
          onClose={() => dispatchCompare({ type: "CLOSE_MODAL" })}
        />
      )}
    </div>
  );
}
