"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isConnected, requestAccess } from "@stellar/freighter-api";

interface Props {
  onConnected?: (address: string) => void;
}

export function StellarWalletConnect({ onConnected }: Props) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onConnectedRef = useRef(onConnected);
  useEffect(() => { onConnectedRef.current = onConnected; });

  useEffect(() => {
    let active = true;

    async function checkWallet() {
      try {
        const result = await isConnected();
        if (!active) return;
        setConnected(Boolean(result.isConnected));
        if (result.isConnected) {
          const addressResult = await getAddress();
          if (!active) return;
          setAddress(addressResult.address ?? null);
          if (addressResult.address) onConnectedRef.current?.(addressResult.address);
        }
      } catch {
        if (active) setConnected(false);
      }
    }

    void checkWallet();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const result = await requestAccess();
      if (result.error || !result.address) {
        setError(result.error?.message ?? "Freighter connection failed.");
        return;
      }
      setConnected(true);
      setAddress(result.address);
      onConnected?.(result.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Freighter connection failed.");
    } finally {
      setLoading(false);
    }
  }

  if (connected && address) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          disabled
          style={{
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(48,209,88,0.28)",
            background: "rgba(48,209,88,0.10)",
            color: "var(--ios-green)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Freighter Connected
        </button>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
          {address}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        style={{
          height: 40,
          borderRadius: 12,
          border: "1px solid rgba(0,122,255,0.28)",
          background: "rgba(0,122,255,0.12)",
          color: "var(--ios-blue)",
          fontSize: 13,
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Connecting..." : "Connect Freighter"}
      </button>
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: "var(--text-secondary)", textDecoration: "none" }}
      >
        Install Freighter if it is not detected
      </a>
      {error ? (
        <span style={{ fontSize: 11, color: "var(--ios-red)" }}>{error}</span>
      ) : null}
    </div>
  );
}
