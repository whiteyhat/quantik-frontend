"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SCAN_INTERVAL_SECONDS = 5 * 60;

type AutopilotStatus = "HUNTING" | "TRADING" | "PAUSED" | "CIRCUIT_BREAKER";

interface ScannerStatus {
  lastScan?: string | null;   // ISO timestamp
  marketsChecked?: number;
  tradesToday?: number;
  circuitBreakerTriggered?: boolean;
  paperMode?: boolean;
  isRunning?: boolean;
  scanIntervalMs?: number;
}

function deriveStatus(data: ScannerStatus): AutopilotStatus {
  if (data.circuitBreakerTriggered) return "CIRCUIT_BREAKER";
  const lastScanMs = data.lastScan ? Date.now() - new Date(data.lastScan).getTime() : Infinity;
  if (lastScanMs < 2 * 60 * 1000) return "HUNTING";
  if ((data.tradesToday ?? 0) > 0) return "TRADING";
  return "PAUSED";
}

const STATUS_CONFIG: Record<AutopilotStatus, { label: string; color: string; bg: string; pulse: boolean }> = {
  HUNTING:        { label: "HUNTING",        color: "#0a84ff", bg: "rgba(10,132,255,0.15)",  pulse: true  },
  TRADING:        { label: "TRADING",        color: "#30d158", bg: "rgba(48,209,88,0.15)",   pulse: false },
  PAUSED:         { label: "PAUSED",         color: "#FF9F0A", bg: "rgba(255,159,10,0.15)",  pulse: false },
  CIRCUIT_BREAKER:{ label: "CIRCUIT BREAKER",color: "#ff453a", bg: "rgba(255,69,58,0.15)",   pulse: false },
};

export function AutopilotStatusBar() {
  const t = useTranslations("autopilot");
  const [status, setStatus] = useState<AutopilotStatus>("HUNTING");
  const [scannerData, setScannerData] = useState<ScannerStatus>({});
  const [countdown, setCountdown] = useState(SCAN_INTERVAL_SECONDS);
  const [lastScanLabel, setLastScanLabel] = useState<string>("—");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/scanner/status`);
      if (!res.ok) return;
      const data: ScannerStatus = await res.json();
      const nextCountdown = Math.max(1, Math.round((data.scanIntervalMs ?? (SCAN_INTERVAL_SECONDS * 1000)) / 1000));
      setScannerData(data);
      setStatus(deriveStatus(data));
      setCountdown(nextCountdown);
      if (data.lastScan) {
        const diffMs = Date.now() - new Date(data.lastScan).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        setLastScanLabel(diffMin < 1 ? t("lessThanMinAgo") : t("minAgo", { m: diffMin }));
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 30_000);
    return () => clearInterval(poll);
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        const fallback = Math.max(1, Math.round((scannerData.scanIntervalMs ?? (SCAN_INTERVAL_SECONDS * 1000)) / 1000));
        return prev > 0 ? prev - 1 : fallback;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scannerData.scanIntervalMs]);

  const fmtCountdown = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div
      data-testid="autopilot-status-bar"
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        fontFamily: "\"SF Mono\", \"JetBrains Mono\", monospace",
      }}
    >
      {/* Status pill */}
      <div
        data-testid="status-pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 100,
          background: cfg.bg,
          border: `1px solid ${cfg.color}44`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: cfg.color,
            display: "inline-block",
            boxShadow: `0 0 6px ${cfg.color}`,
            animation: cfg.pulse ? "quantik-pulse 1.6s ease-in-out infinite" : "none",
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: "0.08em" }}>
          {status === "HUNTING" ? t("hunting") : status === "TRADING" ? t("trading") : status === "PAUSED" ? t("paused") : t("circuitBreaker")}
        </span>
      </div>

      {/* Last scan info */}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
        {t("lastScan")}{lastScanLabel}
        {scannerData.marketsChecked != null && ` · ${scannerData.marketsChecked} ${t("marketsChecked")}`}
      </span>

      {/* Next scan countdown */}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
        {t("nextScanIn")}{" "}
        <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
          {fmtCountdown(countdown)}
        </span>
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* LIVE / PAPER badge */}
      <div
        data-testid="mode-badge"
        style={{
          padding: "3px 10px",
          borderRadius: 100,
          background: scannerData.paperMode ? "rgba(255,159,10,0.15)" : "rgba(48,209,88,0.12)",
          border: `1px solid ${scannerData.paperMode ? "rgba(255,159,10,0.35)" : "rgba(48,209,88,0.30)"}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: scannerData.paperMode ? "#FF9F0A" : "#30d158",
            letterSpacing: "0.08em",
          }}
        >
          {scannerData.paperMode ? "PAPER" : "LIVE"}
        </span>
      </div>
    </div>
  );
}
