"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, Copy, LogOut, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useQuantikStore } from "@/store/useQuantikStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── SolanaWalletButton ───────────────────────────────────────────────────────

export function SolanaWalletButton() {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const setSolanaWallet = useQuantikStore((s) => s.setSolanaWallet);
  const setSolanaWalletLoading = useQuantikStore((s) => s.setSolanaWalletLoading);
  const solanaWallet = useQuantikStore((s) => s.solanaWallet);

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ── Restore persisted wallet on mount ──────────────────────────────────
  useEffect(() => {
    setSolanaWalletLoading(true);
    api.getSolanaWalletStatus()
      .then((status) => {
        if (status.linked && status.walletAddress) {
          setSolanaWallet({ address: status.walletAddress, linkedAt: Date.now() });
        }
      })
      .catch(() => {})
      .finally(() => setSolanaWalletLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sign and link after wallet adapter connects ────────────────────────
  useEffect(() => {
    if (!connected || !publicKey || !signMessage) return;
    // Only sign+link if we don't already have this wallet linked
    if (solanaWallet?.address === publicKey.toBase58()) return;

    const walletAddress = publicKey.toBase58();
    const timestamp = Date.now();
    const message = `Sign to connect to Quantik: ${walletAddress} at ${timestamp}`;

    setConnecting(true);
    setError(null);

    (async () => {
      try {
        const msgBytes = new TextEncoder().encode(message);
        const sig = await signMessage(msgBytes);
        const signatureBase64 = Buffer.from(sig).toString("base64");

        await api.linkSolanaWallet({ walletAddress, signature: signatureBase64, message });
        setSolanaWallet({ address: walletAddress, linkedAt: timestamp });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel")) {
          setError("cancelled");
        } else {
          setError(msg);
        }
        // Disconnect adapter so it doesn't show as connected
        disconnect().catch(() => {});
      } finally {
        setConnecting(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // ── Close tooltip on outside click ────────────────────────────────────
  useEffect(() => {
    if (!tooltipOpen) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
        setShowDisconnectConfirm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tooltipOpen]);

  // ── Error auto-reset after 3s ─────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleCopy = useCallback(() => {
    if (!solanaWallet) return;
    navigator.clipboard.writeText(solanaWallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [solanaWallet]);

  const handleDisconnect = useCallback(async () => {
    try {
      await api.unlinkSolanaWallet();
      await disconnect();
      setSolanaWallet(null);
      setTooltipOpen(false);
      setShowDisconnectConfirm(false);
    } catch (err) {
      console.error("[SolanaWalletButton] disconnect error:", err instanceof Error ? err.message : err);
    }
  }, [disconnect, setSolanaWallet]);

  // ── Connected state: badge + tooltip ──────────────────────────────────
  if (solanaWallet) {
    return (
      <div style={{ position: "relative" }} ref={tooltipRef}>
        {/* Connected badge (D-07) */}
        <button
          onClick={() => setTooltipOpen((prev) => !prev)}
          aria-label="Solana wallet connected"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 8px",
            borderRadius: 12,
            background: tooltipOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
        >
          {/* Solana dot indicator */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#9945ff",
              display: "inline-block",
              boxShadow: "0 0 6px rgba(153,69,255,0.5)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.02em",
            }}
          >
            {truncateAddress(solanaWallet.address)}
          </span>
        </button>

        {/* Tooltip dropdown (D-08) */}
        {tooltipOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              right: 0,
              minWidth: 240,
              padding: 12,
              borderRadius: 12,
              background: "rgba(8,10,18,0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              zIndex: 100,
            }}
          >
            {showDisconnectConfirm ? (
              // Disconnect confirmation
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: 4 }}>
                  Disconnect Wallet?
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginBottom: 12 }}>
                  {"You'll need to reconnect to manage your token holdings. Continue?"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleDisconnect}
                    style={{
                      flex: 1,
                      padding: "5px 10px",
                      borderRadius: 8,
                      background: "rgba(255,69,58,0.18)",
                      border: "1px solid rgba(255,69,58,0.35)",
                      color: "#ff453a",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "5px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Normal tooltip
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 4 }}>Full Address:</div>
                <div
                  style={{
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    fontSize: 11,
                    color: "rgba(255,255,255,0.92)",
                    wordBreak: "break-all",
                    marginBottom: 12,
                    userSelect: "text",
                  }}
                >
                  {solanaWallet.address}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "5px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "background 150ms ease",
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy Address"}
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "5px 10px",
                      borderRadius: 8,
                      background: "rgba(255,69,58,0.12)",
                      border: "1px solid rgba(255,69,58,0.25)",
                      color: "#ff453a",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <LogOut size={12} />
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error && error !== "cancelled") {
    return (
      <button
        onClick={handleConnect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 12,
          background: "rgba(255,69,58,0.12)",
          border: "1px solid rgba(255,69,58,0.25)",
          color: "#ff453a",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
        aria-label="Connect Solana Wallet (error state)"
      >
        <Wallet size={14} />
        Retry Connection
      </button>
    );
  }

  // ── Default: connect button ────────────────────────────────────────────
  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      aria-label="Connect Solana Wallet"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 12,
        background: connecting ? "rgba(10,132,255,0.08)" : "rgba(10,132,255,0.18)",
        border: "1px solid rgba(10,132,255,0.30)",
        color: connecting ? "rgba(255,255,255,0.40)" : "rgba(10,132,255,0.90)",
        fontSize: 12,
        fontWeight: 500,
        cursor: connecting ? "not-allowed" : "pointer",
        transition: "background 150ms ease",
        opacity: connecting ? 0.7 : 1,
      }}
    >
      {connecting ? (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid rgba(10,132,255,0.30)",
            borderTopColor: "rgba(10,132,255,0.80)",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        <Wallet size={14} />
      )}
      {connecting ? "" : "Connect Solana Wallet"}
    </button>
  );
}
