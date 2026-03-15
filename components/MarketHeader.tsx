"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, fmtCompact } from "@/lib/api";
import { ResolutionCountdown } from "@/components/ResolutionCountdown";
import { MarketAlertEditor } from "@/components/markets/MarketAlertEditor";

export function MarketHeader({ slug }: { slug: string }) {
  const t = useTranslations("marketDetail");
  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });
  const [watchlisted, setWatchlisted] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<Awaited<ReturnType<typeof api.getMarketAlerts>>[number] | null>(null);

  useEffect(() => {
    if (!market) return;
    Promise.all([api.getWatchlist(), api.getMarketAlerts()])
      .then(([watchlist, alerts]) => {
        setWatchlisted(watchlist.some((item) => item.slug === market.slug));
        setAlert(alerts.find((item) => item.slug === market.slug) ?? null);
      })
      .catch(() => {});
  }, [market]);

  if (!market) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ height: 24, width: 120, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ height: 24, width: 56, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} />
            </div>
            <div style={{ height: 44, width: "80%", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />
            <div style={{ height: 20, width: "55%", borderRadius: 6, background: "rgba(255,255,255,0.03)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 190 }}>
            <div style={{ height: 90, borderRadius: 14, background: "rgba(48,209,88,0.08)" }} />
            <div style={{ height: 90, borderRadius: 14, background: "rgba(255,69,58,0.08)" }} />
          </div>
        </div>
      </div>
    );
  }

  const yesPct = Math.round((market.yesPrice ?? 0) * 100);
  const noPct = 100 - yesPct;
  const volume = market.volume ?? 0;
  const liquidity = market.liquidity ?? 0;

  const slugDisplay = market.slug?.toUpperCase().replace(/-/g, "-") ?? slug.toUpperCase();

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* LEFT: ID + LIVE + question + stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              className="font-mono-data"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 6,
                padding: "3px 10px",
                letterSpacing: "0.04em",
              }}
            >
              {t("id")}{slugDisplay}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ios-green)",
                background: "rgba(48,209,88,0.12)",
                border: "1px solid rgba(48,209,88,0.25)",
                borderRadius: 6,
                padding: "3px 10px",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--ios-green)",
                  boxShadow: "0 0 6px var(--ios-green)",
                  display: "inline-block",
                }}
              />
              LIVE
            </span>
            <button
              onClick={async () => {
                if (watchlisted) {
                  await api.removeWatchlistItem(slug);
                  setWatchlisted(false);
                } else {
                  await api.addWatchlistItem(slug, market.question);
                  setWatchlisted(true);
                }
              }}
              style={{
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--glass-border)",
                background: watchlisted ? "rgba(255,159,10,0.16)" : "rgba(255,255,255,0.04)",
                color: watchlisted ? "var(--ios-orange)" : "var(--text-secondary)",
                padding: "0 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {watchlisted ? "WATCHLISTED" : "WATCHLIST"}
            </button>
            <button
              onClick={() => setAlertOpen(true)}
              style={{
                height: 30,
                borderRadius: 8,
                border: "1px solid var(--glass-border)",
                background: alert?.enabled ? "rgba(10,132,255,0.16)" : "rgba(255,255,255,0.04)",
                color: alert?.enabled ? "var(--ios-blue)" : "var(--text-secondary)",
                padding: "0 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {alert?.enabled ? "EDIT ALERT" : "ADD ALERT"}
            </button>
          </div>

          {/* Market question */}
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}
          >
            {market.question}
          </h1>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <StatPill icon="bar" label="Vol" value={fmtCompact(volume)} />
            <Dot />
            <StatPill icon="drop" label="Liq" value={fmtCompact(liquidity)} />
          </div>
        </div>

        {/* RIGHT: YES / NO price boxes + countdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: 200 }}>
          <PriceBox side="YES" cents={yesPct} color="var(--ios-green)" bg="rgba(48,209,88,0.08)" border="rgba(48,209,88,0.25)" betLabel={t("bet")} />
          <PriceBox side="NO" cents={noPct} color="var(--ios-red)" bg="rgba(255,69,58,0.08)" border="rgba(255,69,58,0.25)" betLabel={t("bet")} />
          <ResolutionCountdown iso={market.resolutionDate} />
        </div>
      </div>

      <MarketAlertEditor
        open={alertOpen}
        slug={market.slug}
        question={market.question}
        initialPrice={market.yesPrice}
        existingAlert={alert}
        onClose={() => setAlertOpen(false)}
        onSaved={async () => {
          const alerts = await api.getMarketAlerts().catch(() => []);
          setAlert(alerts.find((item) => item.slug === market.slug) ?? null);
        }}
      />
    </div>
  );
}

function Dot() {
  return <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>•</span>;
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  const icons: Record<string, string> = {
    bar: "📊",
    drop: "💧",
    clock: "⏱",
  };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 13 }}>{icons[icon]}</span>
      <span
        className="font-mono-data"
        style={{ fontSize: 13, color: "var(--text-secondary)" }}
      >
        {label}:{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
      </span>
    </span>
  );
}

function PriceBox({
  side,
  cents,
  color,
  bg,
  border,
  betLabel,
}: {
  side: "YES" | "NO";
  cents: number;
  color: string;
  bg: string;
  border: string;
  betLabel: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: "18px 28px",
        textAlign: "center",
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          letterSpacing: "0.10em",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {betLabel} {side}
      </div>
      <div
        className="font-mono-data"
        style={{
          fontSize: 34,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {cents}¢
      </div>
    </div>
  );
}
