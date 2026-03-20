"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, type ArenaWindow } from "@/lib/api";
import {
  normalizeDashboardHealth,
  selectSystemAgentRows,
} from "@/lib/dashboard";
import { useQuantikStore } from "@/store/useQuantikStore";

export const SCANNER_CATEGORIES = [
  "Trending 🔥",
  "All",
  "Crypto",
  "Politics",
  "Sports",
  "Pop Culture",
  "Science",
  "World Events",
  "Business",
] as const;

export type ScannerCategory = (typeof SCANNER_CATEGORIES)[number];

export const dashboardKeys = {
  summary: ["dashboard", "summary"] as const,
  positions: ["dashboard", "positions"] as const,
  riskStatus: ["dashboard", "risk", "status"] as const,
  riskConfig: ["dashboard", "risk", "config"] as const,
  signals: ["dashboard", "signals"] as const,
  agents: ["dashboard", "agents"] as const,
  health: ["dashboard", "health"] as const,
  orchestrator: ["dashboard", "orchestrator"] as const,
  trades: ["dashboard", "trades"] as const,
  arena: (window: ArenaWindow) => ["dashboard", "arena", window] as const,
  arenaHistory: (agentId: string | null, window: ArenaWindow) => ["dashboard", "arena", "history", agentId, window] as const,
  arenaComparison: (a1: string, a2: string, window: ArenaWindow) => ["dashboard", "arena", "compare", a1, a2, window] as const,
  scannerTrending: (search: string) => ["dashboard", "scanner", "trending", search] as const,
  scannerPaged: (category: ScannerCategory, search: string) => ["dashboard", "scanner", category, search] as const,
};

function marketMatchesSearch(question: string, search: string) {
  return question.toLowerCase().includes(search.trim().toLowerCase());
}

export function useDashboardSummaryQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.summary,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const summary = await api.getDashboardSummary(signal);
      if (!summary) throw new Error("Failed to load portfolio summary");
      return summary;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useDashboardPositionsQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.positions,
    enabled: authReady,
    queryFn: ({ signal }) => api.getPositions(signal),
    staleTime: 10_000,
    refetchInterval: 15_000,
    select: (positions) =>
      [...positions].sort((left, right) => Math.abs(right.size) - Math.abs(left.size)),
  });
}

export function useDashboardRiskStatusQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.riskStatus,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const risk = await api.getRiskStatus(signal);
      if (!risk) throw new Error("Failed to load risk status");
      return risk;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useDashboardRiskConfigQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.riskConfig,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const config = await api.getRiskConfig(signal);
      if (!config) throw new Error("Failed to load risk guardrails");
      return config;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useDashboardSignalsQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.signals,
    enabled: authReady,
    queryFn: ({ signal }) => api.getSignals(signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    select: (signals) =>
      [...signals].sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0)),
  });
}

export function useDashboardSystemAgentsQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.agents,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const health = await api.getSystemAgentHealth(signal);
      if (!health) throw new Error("Failed to load pipeline agent health");
      return health;
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
    select: (health) => selectSystemAgentRows(health.agents),
  });
}

export function useDashboardHealthQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.health,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const startedAt = Date.now();
      const health = await api.getHealth(signal);
      if (!health) throw new Error("Failed to load API health");
      return {
        ...normalizeDashboardHealth(health),
        latencyMs: Math.max(0, Date.now() - startedAt),
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useDashboardOrchestratorQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.orchestrator,
    enabled: authReady,
    queryFn: async ({ signal }) => {
      const [status, candidates] = await Promise.all([
        api.getOrchestratorStatus(signal),
        api.getOrchestratorCandidates(signal),
      ]);

      if (!status) throw new Error("Failed to load orchestrator state");

      return {
        status,
        candidates: [...candidates.candidates].sort((left, right) => right.opportunityScore - left.opportunityScore),
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useTriggerOrchestratorScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.triggerOrchestratorScan(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.orchestrator });
    },
  });
}

export function useDashboardAgentHealthScoreQuery(agentId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "agent-health-score", agentId],
    enabled: Boolean(agentId) && enabled,
    queryFn: async () => {
      if (!agentId) throw new Error("Missing agent id");
      const response = await api.getHealthScore(agentId);
      if (!response.success) throw new Error("Failed to load agent health score");
      return response.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useDashboardTradesQuery() {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.trades,
    enabled: authReady,
    queryFn: () => api.getTrades(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useArenaLeaderboardQuery(window: ArenaWindow) {
  const authReady = useQuantikStore((s) => s.authReady);
  return useQuery({
    queryKey: dashboardKeys.arena(window),
    queryFn: ({ signal }) => api.getArenaLeaderboard(window, signal),
    enabled: authReady,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useArenaAgentHistoryQuery(agentId: string | null, window: ArenaWindow) {
  return useQuery({
    queryKey: dashboardKeys.arenaHistory(agentId, window),
    queryFn: ({ signal }) => api.getArenaAgentHistory(agentId!, window, signal),
    enabled: !!agentId,
    staleTime: 60_000,
  });
}

export function useArenaComparisonQuery(a1: string | null, a2: string | null, window: ArenaWindow) {
  return useQuery({
    queryKey: dashboardKeys.arenaComparison(a1 ?? "", a2 ?? "", window),
    queryFn: ({ signal }) => api.getArenaComparison(a1!, a2!, window, signal),
    enabled: !!a1 && !!a2,
    staleTime: 30_000,
  });
}

export function useDashboardScannerQuery(category: ScannerCategory, search: string, pageSize = 20) {
  const trimmedSearch = search.trim().toLowerCase();
  const isTrending = category === "Trending 🔥";

  const trendingQuery = useQuery({
    queryKey: dashboardKeys.scannerTrending(trimmedSearch),
    enabled: isTrending,
    queryFn: async ({ signal }) => {
      const response = await api.getTrendingMarkets(signal);
      return response.markets;
    },
    staleTime: 20_000,
    refetchInterval: 45_000,
    select: (markets) =>
      trimmedSearch
        ? markets.filter((market) => marketMatchesSearch(market.question, trimmedSearch))
        : markets,
  });

  const pagedQuery = useInfiniteQuery({
    queryKey: dashboardKeys.scannerPaged(category, trimmedSearch),
    enabled: !isTrending,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.getMarkets(
        trimmedSearch || undefined,
        category === "All" ? undefined : category,
        pageSize,
        pageParam,
        signal
      ),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((count, page) => count + page.markets.length, 0);
    },
    staleTime: 20_000,
    refetchInterval: 45_000,
  });

  const pagedMarkets = pagedQuery.data?.pages.flatMap((page) => page.markets) ?? [];

  return {
    isTrending,
    markets: isTrending ? trendingQuery.data ?? [] : pagedMarkets,
    isLoading: isTrending ? trendingQuery.isLoading : pagedQuery.isLoading,
    isFetching: isTrending ? trendingQuery.isFetching : pagedQuery.isFetching,
    isError: isTrending ? trendingQuery.isError : pagedQuery.isError,
    error: isTrending ? trendingQuery.error : pagedQuery.error,
    fetchNextPage: pagedQuery.fetchNextPage,
    hasNextPage: pagedQuery.hasNextPage,
    isFetchingNextPage: pagedQuery.isFetchingNextPage,
    refetch: isTrending ? trendingQuery.refetch : pagedQuery.refetch,
  };
}
