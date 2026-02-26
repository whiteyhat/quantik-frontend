"use client";

import { useEffect, useState } from "react";
import { api, fmtUSDC } from "@/lib/api";

interface SystemStatusProps {
  onClose: () => void;
}

export function SystemStatus({ onClose }: SystemStatusProps) {
  const [latency, setLatency] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<number>(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    // Ping backend for latency
    const start = Date.now();
    api.getBalance().then((w) => {
      if (w !== null) {
        setLatency(Date.now() - start);
        setBalance(w.usdc);
        setApiOk(true);
        setLastSync(Date.now());
      } else {
        setLatency(null);
        setApiOk(false);
      }
    });
  }, []);

  const latencyColor =
    latency === null
      ? "var(--ios-red)"
      : latency < 100
      ? "var(--ios-green)"
      : "var(--ios-orange)";

  const syncAgo = Math.floor((now - lastSync) / 60000);

  return (
    <div
      className="glass-card-elevated"
      style={{
        padding: 20,
        width: 280,
        borderRadius: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="text-headline" style={{ color: "var(--text-primary)" }}>
          System Status
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Backend */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Backend</span>
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
              background: `color-mix(in srgb, ${latencyColor} 15%, transparent)`,
              color: latencyColor,
            }}
          >
            {latency !== null ? `${latency}ms` : "Offline"}
          </span>
        </div>

        {/* CLI */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>CLI</span>
          <span className="font-mono-data text-caption" style={{ color: "var(--text-tertiary)" }}>
            v0.1.0
          </span>
        </div>

        {/* Wallet */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Wallet</span>
          <div style={{ textAlign: "right" }}>
            <span className="font-mono-data text-subhead" style={{ color: "var(--text-primary)" }}>
              {balance !== null ? fmtUSDC(balance) : "—"}
            </span>
            <div className="text-caption" style={{ color: "var(--text-tertiary)" }}>
              last synced {syncAgo < 1 ? "just now" : `${syncAgo}m ago`}
            </div>
          </div>
        </div>

        {/* Markets API */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-subhead" style={{ color: "var(--text-secondary)" }}>Markets API</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: apiOk ? "var(--ios-green)" : apiOk === false ? "var(--ios-red)" : "var(--ios-orange)",
              }}
            />
            <span className="text-caption" style={{ color: apiOk ? "var(--ios-green)" : "var(--ios-red)" }}>
              {apiOk ? "OK" : apiOk === false ? "Degraded" : "Checking..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
