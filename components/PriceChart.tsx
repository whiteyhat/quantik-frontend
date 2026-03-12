"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const INTERVALS = ["1h", "1d", "1w", "all"] as const;
const INTERVAL_KEYS: Record<string, string> = {
  "1h": "1h",
  "1d": "1d",
  "1w": "1w",
  "all": "all",
};

interface NormalizedPoint {
  timestamp: number;
  yes: number;
}

/** Normalize both { t, p } and { timestamp, yes/price } formats */
function normalizeData(raw: unknown): { points: NormalizedPoint[]; isSynthetic: boolean } {
  // Handle wrapped format { data: [...], synthetic: true } from old backend
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    const wrapped = raw as { data?: unknown[]; synthetic?: boolean };
    if (wrapped.data) {
      return normalizeData(wrapped.data);
    }
    return { points: [], isSynthetic: false };
  }

  if (!Array.isArray(raw) || raw.length === 0) return { points: [], isSynthetic: false };
  const first = raw[0] as Record<string, unknown>;
  const isSynthetic = "t" in first && "p" in first;
  const points = raw.map((item) => {
    const d = item as Record<string, unknown>;
    let timestamp = Number(d.t ?? d.timestamp ?? 0);
    // CLOB API returns timestamps in seconds — convert to ms for new Date()
    if (timestamp > 0 && timestamp < 1e10) timestamp *= 1000;
    const yes = Number(d.p ?? d.yes ?? d.price ?? 0);
    return { timestamp, yes };
  });
  return { points, isSynthetic };
}

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card-elevated"
      style={{
        padding: "8px 14px",
        borderRadius: 12,
        fontSize: "var(--text-subhead)",
      }}
    >
      <div className="font-mono-data" style={{ color: "#BF5AF2", fontWeight: 600 }}>
        YES: {Math.round(payload[0].value * 100)}¢
      </div>
      {label && (
        <div className="text-caption" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
          {new Date(label).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function PriceChart({ tokenId, slug }: { tokenId: string; slug: string }) {
  const t = useTranslations("priceChart");
  const [interval, setInterval] = useState<string>("1d");
  const [data, setData] = useState<NormalizedPoint[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    // Use tokenId if available, otherwise use slug for synthetic fallback
    const id = tokenId || slug;
    if (!id) return;
    api.getPriceHistory(id, interval).then((raw) => {
      const { points, isSynthetic } = normalizeData(raw);
      setData(points);
      setIsFallback(isSynthetic);
    }).catch(() => {
      setData([]);
      setIsFallback(false);
    });
  }, [tokenId, slug, interval]);

  return (
    <div data-testid="price-chart">
      {/* Header with segmented control */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="text-headline" style={{ color: "var(--text-primary)", margin: 0 }}>
            {t("title")}
          </h2>
          {isFallback && data.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 6,
                background: "rgba(255,159,10,0.15)",
                color: "var(--ios-orange)",
                border: "1px solid rgba(255,159,10,0.25)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t("estimatedData")}
            </span>
          )}
        </div>

        <div className="segmented-control">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              className={interval === iv ? "active" : ""}
              onClick={() => setInterval(iv)}
            >
              {t(INTERVAL_KEYS[iv] as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 280 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BF5AF2" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#BF5AF2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => {
                  if (!ts) return "";
                  const d = new Date(ts);
                  if (isNaN(d.getTime())) return "";
                  return interval === "1h"
                    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : d.toLocaleDateString([], { month: "short", day: "numeric" });
                }}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}¢`}
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<GlassTooltip />} />
              <Area
                type="monotone"
                dataKey="yes"
                stroke="#BF5AF2"
                strokeWidth={2}
                fill="url(#purpleGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#BF5AF2",
                  stroke: "rgba(191,90,242,0.3)",
                  strokeWidth: 6,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t("noData")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
