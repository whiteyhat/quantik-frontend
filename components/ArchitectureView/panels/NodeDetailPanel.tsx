"use client";

import { useState, useEffect, useCallback } from "react";
import type { Node } from "@xyflow/react";
import { useQuantikStore } from "@/store/useQuantikStore";
import {
  AGENT_META,
  SERVICES,
  SERVICE_DETAILS,
  type MainNodeData,
  type SubAgentNodeData,
  type ServiceNodeData,
} from "../data/architectureData";

interface NodeDetailPanelProps {
  node: Node | null;
  onClose: () => void;
  onNavigateToNode?: (nodeId: string) => void;
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  bottom: 16,
  width: 320,
  borderRadius: 16,
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
  padding: 20,
  overflowY: "auto",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  animation: "slide-in-right 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.40)",
  fontSize: 14,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 200ms",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(255,255,255,0.30)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

const monoValueStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(255,255,255,0.80)",
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

// ─── Shared Components ───────────────────────────────────────────────────────

function Separator() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />;
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={sectionLabelStyle}>{label}</span>
      <span style={{ ...monoValueStyle, color: color || monoValueStyle.color }}>{value}</span>
    </div>
  );
}

function AttributePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: '"SF Mono", monospace' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 8,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          color,
          fontFamily: '"SF Mono", monospace',
          textTransform: "capitalize",
        }}
      >
        {value.replace(/_/g, " ")}
      </span>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 6,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        color,
        fontFamily: '"SF Mono", monospace',
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

// ─── Main Agent Details ──────────────────────────────────────────────────────

function MainNodeDetails({ data }: { data: MainNodeData }) {
  const myAgent = useQuantikStore((s) => s.myAgent);

  return (
    <>
      {/* Identity */}
      <StaggerSection index={0}>
        <div style={{ textAlign: "center", marginBottom: 4, paddingTop: 8 }}>
          <span style={{ fontSize: 44, display: "block", marginBottom: 8 }}>{data.emoji}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.92)", fontFamily: '"SF Mono", monospace', display: "block" }}>
            {data.label}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "#007AFF", marginTop: 4, fontFamily: '"SF Mono", monospace' }}>
            {data.code}
          </span>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={data.status} color="var(--ios-green)" />
          </div>
        </div>
      </StaggerSection>

      <Separator />

      {/* Agent Attributes from Zustand */}
      {myAgent && (
        <>
          {/* Personality */}
          <StaggerSection index={1}>
            <div>
              <span style={sectionLabelStyle}>Personality</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <AttributePill label="Type" value={myAgent.personality} color="#BF5AF2" />
                <AttributePill label="Decisions" value={myAgent.decision_style} color="#007AFF" />
              </div>
            </div>
          </StaggerSection>

          <Separator />

          {/* Trading Profile */}
          <StaggerSection index={2}>
            <div>
              <span style={sectionLabelStyle}>Trading Profile</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <AttributePill label="Instinct" value={myAgent.trading_instinct} color="#FF9F0A" />
                <AttributePill label="Patience" value={myAgent.time_patience} color="#30D158" />
                <AttributePill label="Goal" value={myAgent.profit_dream} color="#FFD60A" />
              </div>
            </div>
          </StaggerSection>

          <Separator />

          {/* Risk Profile */}
          <StaggerSection index={3}>
            <div>
              <span style={sectionLabelStyle}>Risk Profile</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <AttributePill label="Approach" value={myAgent.money_approach} color="#FF453A" />
                <AttributePill label="Protection" value={myAgent.protection_mindset} color="#64D2FF" />
              </div>
            </div>
          </StaggerSection>

          <Separator />

          {/* Market Preferences */}
          <StaggerSection index={4}>
            <div>
              <span style={sectionLabelStyle}>Market Preferences</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <AttributePill label="Sense" value={myAgent.market_sense} color="#007AFF" />
                <AttributePill label="Assets" value={myAgent.asset_love} color="#30D158" />
              </div>
            </div>
          </StaggerSection>

          <Separator />

          {/* Deployment Info */}
          <StaggerSection index={5}>
            <div>
              <span style={sectionLabelStyle}>Deployment</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {myAgent.wallet_address && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                    <span style={sectionLabelStyle}>Wallet</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...monoValueStyle }}>{`${myAgent.wallet_address.slice(0, 6)}...${myAgent.wallet_address.slice(-4)}`}</span>
                      {/* Polygonscan link */}
                      <a
                        href={`https://polygonscan.com/address/${myAgent.wallet_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Polygonscan"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer",
                          transition: "background 200ms, border-color 200ms",
                          flexShrink: 0,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                      {/* Polymarket link */}
                      <a
                        href={`https://polymarket.com/profile/${myAgent.wallet_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Polymarket"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer",
                          transition: "background 200ms, border-color 200ms",
                          flexShrink: 0,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.50)" strokeWidth="2" />
                          <path d="M8 12l3 3 5-6" stroke="rgba(255,255,255,0.50)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
                {myAgent.deployed_at && (
                  <DetailRow
                    label="Deployed"
                    value={new Date(myAgent.deployed_at).toLocaleDateString()}
                  />
                )}
                <DetailRow
                  label="Created"
                  value={new Date(myAgent.created_at).toLocaleDateString()}
                />
              </div>
            </div>
          </StaggerSection>
        </>
      )}

      <Separator />

      {/* Connected Agents */}
      <StaggerSection index={6}>
        <div>
          <span style={sectionLabelStyle}>Connected Agents</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {Object.entries(AGENT_META).map(([key, meta]) => (
              <span
                key={key}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)`,
                  color: meta.color,
                  fontFamily: '"SF Mono", monospace',
                }}
              >
                {meta.emoji} {meta.label}
              </span>
            ))}
          </div>
        </div>
      </StaggerSection>
    </>
  );
}

// ─── Sub-Agent Details ───────────────────────────────────────────────────────

function SubAgentDetails({ data, onNavigateToNode }: { data: SubAgentNodeData; onNavigateToNode?: (nodeId: string) => void }) {
  const statusColor =
    data.status === "running" ? "var(--ios-blue)"
    : data.status === "done" ? "var(--ios-green)"
    : data.status === "error" ? "var(--ios-red)"
    : "rgba(255,255,255,0.30)";

  const agentServices = SERVICES[data.agentKey] || [];

  return (
    <>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 4, paddingTop: 8 }}>
        <span style={{ fontSize: 36, display: "block", marginBottom: 6 }}>{data.emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.92)", fontFamily: '"SF Mono", monospace' }}>
          {data.label}
        </span>
        <span style={{ display: "block", fontSize: 11, color: data.accentColor, marginTop: 2 }}>
          {data.role}
        </span>
        <div style={{ marginTop: 8 }}>
          <StatusBadge status={data.status} color={statusColor} />
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <DetailRow label="Agent Key" value={data.agentKey} />
        {data.latencyMs !== undefined && (
          <DetailRow label="Latency" value={`${(data.latencyMs / 1000).toFixed(1)}s`} color="var(--ios-blue)" />
        )}
      </div>

      <Separator />

      {/* Description */}
      <div>
        <span style={sectionLabelStyle}>Description</span>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
          {getAgentDescription(data.agentKey)}
        </p>
      </div>

      <Separator />

      {/* Connected Services - Fancy List */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={sectionLabelStyle}>Connected Services</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 6,
              background: `color-mix(in srgb, ${data.accentColor} 15%, transparent)`,
              color: data.accentColor,
              fontFamily: '"SF Mono", monospace',
            }}
          >
            {agentServices.length}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {agentServices.map((svc) => (
            <ServiceListItem
              key={svc.id}
              icon={svc.icon}
              label={svc.label}
              color={data.accentColor}
              onClick={onNavigateToNode ? () => onNavigateToNode(svc.id) : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ServiceListItem({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        background: hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
        transition: "all 200ms ease",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.70)",
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          flex: 1,
        }}
      >
        {label}
      </span>
      {/* Status dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--ios-green)",
          flexShrink: 0,
        }}
      />
      {/* Chevron */}
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", flexShrink: 0 }}>&#x25B8;</span>
    </div>
  );
}

// ─── Service Details ─────────────────────────────────────────────────────────

function ServiceDetails({ data }: { data: ServiceNodeData }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const details = SERVICE_DETAILS[getServiceId(data)] || null;

  const statusColor =
    data.status === "streaming" ? "var(--ios-blue)"
    : data.status === "connected" ? "var(--ios-green)"
    : "rgba(255,255,255,0.30)";

  const parentMeta = data.parentAgent !== "shared" ? AGENT_META[data.parentAgent] : null;

  return (
    <>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 4, paddingTop: 8 }}>
        <span style={{ fontSize: 32, display: "block", marginBottom: 6 }}>{data.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.80)", fontFamily: '"SF Mono", monospace' }}>
          {data.label}
        </span>
        <div style={{ marginTop: 8 }}>
          <StatusBadge status={data.status} color={statusColor} />
        </div>
      </div>

      <Separator />

      {/* Info Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <DetailRow
          label="Parent"
          value={parentMeta ? `${parentMeta.emoji} ${parentMeta.label}` : "Shared"}
          color={parentMeta?.color}
        />
        {details && (
          <>
            <DetailRow label="Protocol" value={details.protocol} />
            <DetailRow label="Endpoint" value={details.endpoint.length > 24 ? details.endpoint.slice(0, 24) + "..." : details.endpoint} />
          </>
        )}
      </div>

      {details && (
        <>
          <Separator />

          {/* Description */}
          <div>
            <span style={sectionLabelStyle}>About</span>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
              {details.description}
            </p>
          </div>

          <Separator />

          {/* Live Feed */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={sectionLabelStyle}>Live Feed</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ios-blue)", animation: "pulse-ring 1.2s ease-out infinite" }} />
            </div>
            <div
              style={{
                maxHeight: 140,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                borderRadius: 10,
                background: "rgba(0,0,0,0.20)",
                border: "1px solid rgba(255,255,255,0.04)",
                padding: 8,
              }}
              className="scrollbar-hide"
            >
              {details.feed.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: i < details.feed.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.20)", fontFamily: '"SF Mono", monospace', flexShrink: 0, marginTop: 1 }}>
                    {item.time}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                    {item.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sources */}
          <div>
            <span style={sectionLabelStyle}>Data Sources</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {details.sources.map((src, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.50)",
                    fontFamily: '"SF Mono", monospace',
                  }}
                >
                  {src}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Collapsible Logs */}
          <div>
            <button
              onClick={() => setLogsOpen(!logsOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={sectionLabelStyle}>System Logs</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.30)",
                    fontFamily: '"SF Mono", monospace',
                  }}
                >
                  {details.logs.length}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.25)",
                  transform: logsOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease",
                }}
              >
                &#x25B8;
              </span>
            </button>

            <div
              style={{
                maxHeight: logsOpen ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.30)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  padding: 8,
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {details.logs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 6,
                      padding: "3px 0",
                      borderBottom: i < details.logs.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", flexShrink: 0, marginTop: 1 }}>
                      {log.time}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 4px",
                        borderRadius: 3,
                        flexShrink: 0,
                        marginTop: 1,
                        background:
                          log.level === "error" ? "rgba(255,69,58,0.15)"
                          : log.level === "warn" ? "rgba(255,159,10,0.15)"
                          : "rgba(0,122,255,0.10)",
                        color:
                          log.level === "error" ? "var(--ios-red)"
                          : log.level === "warn" ? "var(--ios-orange)"
                          : "var(--ios-blue)",
                      }}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getServiceId(data: ServiceNodeData): string {
  // Match service node to SERVICE_DETAILS key
  // For Polymarket and other shared services, use label-based matching
  if (data.label.toLowerCase().includes("polymarket")) return "polymarket";

  // For agent-specific services, search SERVICES map
  const agentServices = SERVICES[data.parentAgent] || [];
  const match = agentServices.find((s) => s.label === data.label);
  return match?.id || data.label.toLowerCase().replace(/\s+/g, "-");
}

function getAgentDescription(key: string): string {
  const descriptions: Record<string, string> = {
    aura: "Analyzes market sentiment from news, social media, and financial feeds. Detects echo chambers and contrarian signals.",
    edge: "Calculates expected value, Kelly fraction, and optimal position sizing based on probability estimates and market odds.",
    oracle: "Estimates true probability using ensemble ML models, historical patterns, and LLM reasoning. Compares against market-implied odds.",
    lucifer: "Devil's advocate agent. Challenges bullish theses, identifies bias flags, and can veto trades that fail stress tests.",
    flux: "Routes liquidity across DEXs (Uniswap, Curve, 1inch). Monitors spread, depth, and whale activity for optimal execution.",
    clause: "Evaluates smart contract risks, resolution mechanics, and gas optimization for on-chain trading operations.",
    sigma: "Final decision engine. Synthesizes all agent outputs into a BET_YES, BET_NO, or PASS with confidence-weighted sizing.",
  };
  return descriptions[key] || "Specialized sub-agent in the trading pipeline.";
}

// ─── Export ──────────────────────────────────────────────────────────────────

// ─── Staggered Section Wrapper ───────────────────────────────────────────────

function StaggerSection({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        animation: "fade-up 350ms ease both",
        animationDelay: `${80 + index * 50}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function NodeDetailPanel({ node, onClose, onNavigateToNode }: NodeDetailPanelProps) {
  const [closing, setClosing] = useState(false);
  const [visibleNode, setVisibleNode] = useState<Node | null>(null);

  // Track the displayed node — keep it visible during exit animation
  useEffect(() => {
    if (node) {
      setVisibleNode(node);
      setClosing(false);
    } else if (visibleNode) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisibleNode(null);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [node]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key handler
  useEffect(() => {
    if (!visibleNode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visibleNode, onClose]);

  if (!visibleNode) return null;

  const nodeType = (visibleNode.data as { type?: string })?.type;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`arch-backdrop${closing ? " closing" : ""}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          ...panelStyle,
          animation: closing
            ? "slide-out-right 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards"
            : "slide-in-right 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <button
          onClick={onClose}
          style={closeButtonStyle}
          aria-label="Close panel"
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        >
          &#x2715;
        </button>

        {nodeType === "main" && (
          <MainNodeDetails data={visibleNode.data as unknown as MainNodeData} />
        )}
        {nodeType === "sub-agent" && (
          <SubAgentDetails
            data={visibleNode.data as unknown as SubAgentNodeData}
            onNavigateToNode={onNavigateToNode}
          />
        )}
        {nodeType === "service" && (
          <ServiceDetails data={visibleNode.data as unknown as ServiceNodeData} />
        )}
      </div>
    </>
  );
}
