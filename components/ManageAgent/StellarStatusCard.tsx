"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api, type WalletBalance } from "@/lib/api";
import { StellarWalletConnect } from "@/components/StellarWalletConnect";
import {
  getFreighterHelperCopy,
  getStellarHeroMarketHref,
} from "@/lib/stellarSubmission";

interface Props {
  walletAddress: string | null;
  wallet?: WalletBalance | null;
}

function statusPill(label: string, color: string) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "4px 10px",
      }}
    >
      {label}
    </span>
  );
}

export function StellarStatusCard({ walletAddress, wallet }: Props) {
  const [status, setStatus] = useState<WalletBalance | null>(wallet ?? null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const next = await api.getWalletStatus();
      setStatus(next);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!wallet) {
      void refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const xlm = status?.xlm ?? wallet?.xlm ?? 0;
  const usdc = status?.onChainUsdc ?? status?.usdc ?? wallet?.onChainUsdc ?? wallet?.usdc ?? 0;
  const trustline = Boolean(status?.trustlineEstablished ?? wallet?.trustlineEstablished);
  const stellarReady = Boolean(status?.stellarReady ?? wallet?.stellarReady);
  const stellarStatus = status?.stellarStatus ?? wallet?.stellarStatus ?? "pending_funding";

  return (
    <div
      style={{
        background: "var(--glass-surface)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Stellar Testnet
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            Stellar Wallet
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {statusPill(stellarReady ? "READY" : "SETUP", stellarReady ? "var(--ios-green)" : "var(--ios-orange)")}
        {statusPill(trustline ? "USDC TRUSTLINE ON" : "TRUSTLINE MISSING", trustline ? "var(--ios-green)" : "var(--ios-orange)")}
        {statusPill(String(stellarStatus).replace(/_/g, " ").toUpperCase(), "var(--ios-blue)")}
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Stellar Address</div>
        <div style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: '"SF Mono", "JetBrains Mono", monospace', lineHeight: 1.5, wordBreak: "break-all" }}>
          {walletAddress ?? status?.address ?? "No wallet assigned"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>XLM</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{xlm.toFixed(4)}</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>USDC</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{usdc.toFixed(2)}</div>
        </div>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: 14,
          background: "rgba(48,209,88,0.06)",
          border: "1px solid rgba(48,209,88,0.14)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>
            Demo Path
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Open the canonical Soroswap market and launch the 7-agent swap flow directly from the Stellar dashboard.
          </div>
        </div>
        <Link
          href={getStellarHeroMarketHref()}
          style={{
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 14px",
            width: "fit-content",
          }}
        >
          Open Demo Market
        </Link>
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(10,132,255,0.06)",
          border: "1px solid rgba(10,132,255,0.18)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>
          Freighter (Optional)
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
          {getFreighterHelperCopy()}
        </div>
        <StellarWalletConnect />
      </div>
    </div>
  );
}
