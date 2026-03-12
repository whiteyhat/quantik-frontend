"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "./ui/skeleton";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface PerformanceSummary {
  pnlToday?: number;
  tradesToday?: number;
  winRate?: number;
  openPositions?: number;
}

function useFlash(value: number) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      setFlashing(true);
      prevRef.current = value;
      const t = setTimeout(() => setFlashing(false), 400);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flashing;
}

function Metric({
  label,
  value,
  color = "rgba(255,255,255,0.85)",
  flashing = false,
}: {
  label: string;
  value: string;
  color?: string;
  flashing?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.30)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "\"SF Mono\", monospace",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          fontFamily: "\"SF Mono\", \"JetBrains Mono\", monospace",
          transition: "color 200ms ease",
          background: flashing ? "rgba(255,255,255,0.08)" : "transparent",
          borderRadius: 4,
          padding: "0 4px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function PnlTicker() {
  const t = useTranslations("pnlTicker");
  const [data, setData] = useState<PerformanceSummary>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/performance/summary`);
        if (!res.ok) return;
        const d: PerformanceSummary = await res.json();
        setData(d);
        setLoaded(true);
      } catch { /* silently fail */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 60_000);
    return () => clearInterval(iv);
  }, []);

  const pnl = data.pnlToday ?? 0;
  const trades = data.tradesToday ?? 0;
  const winRate = data.winRate ?? 0;
  const open = data.openPositions ?? 0;

  const pnlColor = pnl > 0 ? "#30d158" : pnl < 0 ? "#ff453a" : "rgba(255,255,255,0.85)";
  const pnlFlash = useFlash(pnl);
  const tradesFlash = useFlash(trades);

  return (
    <div
      data-testid="pnl-ticker"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "14px 20px",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
    >
      {loaded ? (
        <>
          <Metric
            label={t("todayPnl")}
            value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
            color={pnlColor}
            flashing={pnlFlash}
          />
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />
          <Metric
            label={t("trades")}
            value={String(trades)}
            flashing={tradesFlash}
          />
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />
          <Metric
            label={t("winRate")}
            value={`${(winRate * 100).toFixed(1)}%`}
            color={winRate >= 0.5 ? "#30d158" : winRate > 0 ? "#FF9F0A" : "rgba(255,255,255,0.55)"}
          />
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />
          <Metric
            label={t("openPositions")}
            value={String(open)}
            color="rgba(255,255,255,0.75)"
          />
        </>
      ) : (
        <>
          {[t("todayPnl"), t("trades"), t("winRate"), t("openPositions")].map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <Skeleton width={70} height={10} borderRadius={3} />
                <Skeleton width={60} height={15} borderRadius={4} />
              </div>
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}
