"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocketEvent } from "@/context/SocketContext";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";
import {
  api,
  type Position,
  type Trade,
  type Signal,
  type PerformanceSummary,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const ArchitectureView = dynamic(
  () => import("@/components/ArchitectureView").then((m) => ({ default: m.ArchitectureView })),
  { ssr: false }
);

const AgentWorldTab = dynamic(
  () => import("@/components/AgentWorld/AgentWorldTab").then((m) => ({ default: m.AgentWorldTab })),
  { ssr: false }
);

import { AgentIdentityHeader } from "@/components/ManageAgent/AgentIdentityHeader";
import { EquityCurveChart } from "@/components/ManageAgent/EquityCurveChart";
import { MetricsRow } from "@/components/ManageAgent/MetricsRow";
import { LivePositionsTable } from "@/components/ManageAgent/LivePositionsTable";
import { AiInsightCard } from "@/components/ManageAgent/AiInsightCard";
import { AgentConfigPanel } from "@/components/ManageAgent/AgentConfigPanel";
import { SystemLogFeed } from "@/components/ManageAgent/SystemLogFeed";
import { ApiKeyPanel } from "@/components/ManageAgent/ApiKeyPanel";
import { ConnectionStatusPanel } from "@/components/ManageAgent/ConnectionStatusPanel";
import { ApiUsagePanel } from "@/components/ManageAgent/ApiUsagePanel";
import { ConnectionActivityLog } from "@/components/ManageAgent/ConnectionActivityLog";
import { HealthScoreBadge } from "@/components/ManageAgent/HealthScoreBadge";
import { WebhookConfigPanel } from "@/components/ManageAgent/WebhookConfigPanel";
import { RiskConfigPanelByo } from "@/components/ManageAgent/RiskConfigPanelByo";
import { AutopilotControlCard } from "@/components/ManageAgent/AutopilotControlCard";
import { PolymarketStatusCard } from "@/components/ManageAgent/PolymarketStatusCard";

import { PositionDetailSheet } from "@/components/ManageAgent/PositionDetailSheet";
import { PipelineReplayPanel } from "@/components/pipeline/PipelineReplayPanel";

type TabId = "dashboard" | "architecture" | "world";

export default function ManageAgentPage() {
  const t = useTranslations("manageAgent");
  const router = useRouter();
  const storeAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const setMyAgentLoading = useQuantikStore((s) => s.setMyAgentLoading);
  const storeWallet = useQuantikStore((s) => s.wallet);
  const storeSetWallet = useQuantikStore((s) => s.setWallet);
  const authReady = useQuantikStore((s) => s.authReady);

  // Safety net: if store is empty and not loading, try fetching agent
  useEffect(() => {
    if (!authReady || storeAgent || myAgentLoading) return;
    let active = true;
    setMyAgentLoading(true);
    api.getMyAgent()
      .then((data) => {
        if (active && data) setMyAgent(data as unknown as import("@/store/useQuantikStore").MyAgent);
      })
      .catch(() => {})
      .finally(() => { if (active) setMyAgentLoading(false); });
    return () => { active = false; };
  }, [authReady, storeAgent, myAgentLoading, setMyAgent, setMyAgentLoading]);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  useEffect(() => {
    const syncTabFromLocation = () => {
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      if (requestedTab === "dashboard" || requestedTab === "architecture" || requestedTab === "world") {
        setActiveTab(requestedTab);
      }
    };

    syncTabFromLocation();
    window.addEventListener("popstate", syncTabFromLocation);
    return () => window.removeEventListener("popstate", syncTabFromLocation);
  }, []);

  // Data state
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<"7D" | "30D" | "All">("7D");
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const myAgent = storeAgent;

  // Fetch real data when agent exists
  useEffect(() => {
    if (!myAgent) {
      setLoading(false);
      return;
    }
    let active = true;

    async function fetchAll() {
      try {
        const [walletData, posData, signalData, perfData, tradeData] = await Promise.allSettled([
          api.getBalance(),
          api.getPositions(),
          api.getSignals(),
          api.getPerformanceSummary(),
          api.getTrades(),
        ]);

        if (!active) return;

        if (walletData.status === "fulfilled" && walletData.value) storeSetWallet(walletData.value);
        if (posData.status === "fulfilled") setPositions(posData.value);
        if (signalData.status === "fulfilled") setSignals(signalData.value);
        if (perfData.status === "fulfilled") setPerformance(perfData.value);
        if (tradeData.status === "fulfilled") setTrades(tradeData.value);
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAll();

    const interval = setInterval(() => {
      api.getBalance().then((w) => { if (active && w) storeSetWallet(w); }).catch(() => {});
      api.getPositions().then((p) => { if (active) setPositions(p); }).catch(() => {});
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [myAgent]);

  const handlePositionUpdate = useCallback(
    (slug: string, currentPrice: number, pnl: number, pnlPct: number) => {
      setPositions((prev) =>
        prev.map((p) =>
          p.slug === slug ? { ...p, currentPrice, pnl, pnlPct } : p
        )
      );
    },
    []
  );

  const refreshWallet = useCallback(async () => {
    try {
      const nextWallet = await api.getBalance();
      if (nextWallet) storeSetWallet(nextWallet);
      return nextWallet;
    } catch {
      return null;
    }
  }, [storeSetWallet]);

  // Gap 2: instant balance refresh when a trade executes
  const handleTradeExecuted = useCallback(() => {
    if (!myAgent) return;
    api.getBalance()
      .then((w) => { if (w) storeSetWallet(w); })
      .catch(() => {});
  }, [myAgent, storeSetWallet]);

  useSocketEvent("trade:executed", handleTradeExecuted);

  // Loading state
  if (myAgentLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
        <Skeleton width={300} height={32} borderRadius={8} />
        <Skeleton width="100%" height={200} borderRadius={12} />
        <Skeleton width="100%" height={300} borderRadius={12} />
      </div>
    );
  }

  if (!myAgent) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 16,
          padding: 40,
        }}
      >
        <div style={{ fontSize: 48 }}>🤖</div>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          {t("noAgentTitle")}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.40)",
            textAlign: "center",
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          {t("noAgentDesc")}
        </p>
        <button
          onClick={() => router.push("/agent-factory")}
          style={{
            marginTop: 8,
            padding: "10px 28px",
            borderRadius: 10,
            border: "1px solid rgba(10,132,255,0.30)",
            background: "rgba(10,132,255,0.12)",
            color: "#0a84ff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          {t("openAgentFactory")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header + Tab bar */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.04em",
            }}
          >
            {t("title")}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.30)" }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Segmented tab control */}
        <div id="tour-view-tabs" className="segmented-control">
          {(
            [
              { id: "dashboard" as TabId, label: t("tabDashboard") },
              { id: "architecture" as TabId, label: t("tabArchitecture") },
              { id: "world" as TabId, label: t("tabAgentWorld") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              style={{ fontFamily: '"SF Mono", "JetBrains Mono", monospace', letterSpacing: "0.02em" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Dashboard Tab ──────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <AgentIdentityHeader
                wallet={storeWallet}
                timePeriod={timePeriod}
                onPeriodChange={setTimePeriod}
              />
              <EquityCurveChart
                wallet={storeWallet}
                trades={trades}
                timePeriod={timePeriod}
              />
              <MetricsRow
                wallet={storeWallet}
                performance={performance}
                loading={loading}
              />
            </div>
            {(loading || positions.length > 0) && (
              <LivePositionsTable
                positions={positions}
                loading={loading}
                onPositionUpdate={handlePositionUpdate}
                onOpenPosition={setSelectedPosition}
              />
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <PolymarketStatusCard
              agentId={storeAgent?.id ?? ""}
              walletAddress={storeAgent?.wallet_address ?? null}
              polymarketReady={storeAgent?.polymarket_ready}
              polymarketStatus={storeAgent?.polymarket_status}
            />
            <AutopilotControlCard
              wallet={storeWallet}
              onWalletRefresh={refreshWallet}
            />
            <AiInsightCard signals={signals} loading={loading} />
            {storeAgent?.agent_type === "byo" ? (
              <>
                <HealthScoreBadge agentId={storeAgent.id} />
                <ConnectionStatusPanel
                  agentId={storeAgent.id}
                  connectionStatus={storeAgent.connection_status}
                  lastHeartbeat={storeAgent.last_heartbeat}
                  description={storeAgent.description}
                />
                <RiskConfigPanelByo agentId={storeAgent.id} />
                <WebhookConfigPanel
                  agentId={storeAgent.id}
                  endpointUrl={storeAgent.endpoint_url}
                  webhookEvents={storeAgent.webhook_events}
                />
                <ApiUsagePanel
                  agentId={storeAgent.id}
                />
                <ConnectionActivityLog
                  agentId={storeAgent.id}
                />
                <ApiKeyPanel
                  apiKeyPrefix={storeAgent.api_key_prefix}
                  agentId={storeAgent.id}
                />
              </>
            ) : (
              <AgentConfigPanel />
            )}
            <SystemLogFeed />
            <PipelineReplayPanel title="Recent Pipeline Replay" />
          </div>
        </div>
      )}

      {/* ─── Agent World Tab ─────────────────────────────────────────────────── */}
      {activeTab === "world" && (
        <AgentWorldTab />
      )}

      {/* ─── Architecture Tab ───────────────────────────────────────────────── */}
      {activeTab === "architecture" && (
        <div
          style={{
            height: "calc(100vh - 200px)",
            minHeight: 500,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <ArchitectureView />
        </div>
      )}

      <PositionDetailSheet
        position={selectedPosition}
        open={selectedPosition != null}
        onClose={() => setSelectedPosition(null)}
        onClosed={(executionId) => {
          setPositions((prev) => prev.filter((position) => position.executionId !== executionId));
        }}
      />
    </div>
  );
}
