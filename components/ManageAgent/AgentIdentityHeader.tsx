"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQuantikStore } from "@/store/useQuantikStore";
import { fmtUSDC, type WalletBalance } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { DeleteAgentModal } from "./DeleteAgentModal";

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 20,
};

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return { label: "statusLive", bg: "rgba(48,209,88,0.15)", border: "rgba(48,209,88,0.35)", color: "#30d158", dot: "#30d158" };
    case "paused":
      return { label: "statusPaused", bg: "rgba(255,159,10,0.15)", border: "rgba(255,159,10,0.35)", color: "#ff9f0a", dot: "#ff9f0a" };
    case "terminated":
      return { label: "statusTerminated", bg: "rgba(255,69,58,0.15)", border: "rgba(255,69,58,0.35)", color: "#ff453a", dot: "#ff453a" };
    default:
      return { label: "statusInactive", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", dot: "rgba(255,255,255,0.3)" };
  }
}

function truncAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface AgentIdentityHeaderProps {
  wallet: WalletBalance | null;
  timePeriod: "7D" | "30D" | "All";
  onPeriodChange: (p: "7D" | "30D" | "All") => void;
}

export function AgentIdentityHeader({ wallet, timePeriod, onPeriodChange }: AgentIdentityHeaderProps) {
  const t = useTranslations("manageAgent");
  const td = useTranslations("deleteAgent");
  const router = useRouter();
  const myAgent = useQuantikStore((s) => s.myAgent);
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [deleteBtnHovered, setDeleteBtnHovered] = useState(false);

  const handleDeleted = useCallback(() => {
    setDeleteModalOpen(false);
    setMyAgent(null);
    setDeleteToast(td("deletedSuccess"));
    setTimeout(() => router.push("/agent-factory"), 1500);
  }, [setMyAgent, router]);

  const copyAddress = useCallback(() => {
    if (!myAgent?.wallet_address) return;
    navigator.clipboard.writeText(myAgent.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [myAgent?.wallet_address]);

  if (!myAgent) return null;

  const badge = statusBadge(myAgent.status);
  const periods: ("7D" | "30D" | "All")[] = ["7D", "30D", "All"];
  const displayBalance = wallet?.totalValue;
  const balanceMessage = wallet?.balanceMessage ?? null;

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        {/* Left: Avatar + Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Avatar */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              position: "relative",
              flexShrink: 0,
            }}
          >
            {myAgent.avatar_image ? (
              <img
                src={myAgent.avatar_image}
                alt={myAgent.name}
                style={{ width: 120, height: 120, borderRadius: 30, objectFit: "cover" }}
              />
            ) : (
              myAgent.avatar_emoji || "🤖"
            )}
            {/* Online dot */}
            {myAgent.status === "active" && (
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  left: -2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#30d158",
                  border: "2px solid rgba(0,0,0,0.6)",
                }}
              />
            )}
          </div>

          <div>
            {/* Name + Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 20,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  letterSpacing: "0.03em",
                }}
              >
                {myAgent.name || myAgent.agent_code}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.color,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
                {t(badge.label as any)}
              </span>
            </div>

            {/* Wallet address */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                {t("wdkWallet")}{truncAddr(myAgent.wallet_address || "")}
              </span>
              <button
                onClick={copyAddress}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: copied ? "#30d158" : "rgba(255,255,255,0.30)",
                  padding: 0,
                }}
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>

            {/* Balance */}
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("balance")}
              </span>
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {displayBalance != null ? fmtUSDC(displayBalance) : "--"}
              </span>
            </div>
            {balanceMessage && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.5,
                  maxWidth: 420,
                }}
              >
                {balanceMessage}
              </div>
            )}
          </div>
        </div>

        {/* Right: Period selector + Actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {/* Period selector */}
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  background: timePeriod === p ? "rgba(255,255,255,0.12)" : "transparent",
                  color: timePeriod === p ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.40)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: '"SF Mono", monospace',
                  transition: "all 150ms ease",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat with Agent shortcut */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-agent-chat"))}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "1px solid rgba(10,132,255,0.30)",
              background: "rgba(10,132,255,0.10)",
              color: "#0a84ff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
              fontFamily: '"SF Mono", monospace',
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>💬</span>
            {t("chatWithAgent", { name: myAgent.name?.toUpperCase() || "AGENT" })}
          </button>

          {/* Delete agent button */}
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={() => setDeleteModalOpen(true)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${deleteBtnHovered ? "rgba(255,69,58,0.35)" : "rgba(255,69,58,0.20)"}`,
                background: deleteBtnHovered ? "rgba(255,69,58,0.15)" : "rgba(255,69,58,0.08)",
                color: deleteBtnHovered ? "#ff453a" : "rgba(255,69,58,0.6)",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: '"SF Mono", monospace',
                transition: "all 150ms ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={() => setDeleteBtnHovered(true)}
              onMouseLeave={() => setDeleteBtnHovered(false)}
            >
              🗑
            </button>
            {deleteBtnHovered && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(20,20,28,0.95)",
                  border: "1px solid rgba(255,69,58,0.35)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  color: "#ff453a",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  letterSpacing: "0.1em",
                  padding: "5px 10px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                DELETE AGENT
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid rgba(255,69,58,0.35)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete toast */}
      {deleteToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "12px 24px",
            borderRadius: 12,
            background: "rgba(48,209,88,0.18)",
            border: "1px solid rgba(48,209,88,0.35)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            color: "#30d158",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.03em",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          ✓ {deleteToast}
        </div>
      )}

      {/* Delete confirmation modal */}
      <DeleteAgentModal
        agent={myAgent}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
