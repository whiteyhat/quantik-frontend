"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, fmtUSDC } from "@/lib/api";

export function MarketHeader({ slug }: { slug: string }) {
  const t = useTranslations("marketDetail");
  const { data: market } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => api.getMarket(slug),
  });

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

  const resolutionLabel =
    market.resolutionDate && !isNaN(new Date(market.resolutionDate).getTime())
      ? new Date(market.resolutionDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "TBD";

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
            <StatPill icon="bar" label="Vol" value={fmtUSDC(volume)} />
            <Dot />
            <StatPill icon="drop" label="Liq" value={fmtUSDC(liquidity)} />
            <Dot />
            <StatPill icon="clock" label="Resolves" value={resolutionLabel} />
          </div>
        </div>

        {/* RIGHT: YES / NO price boxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          <PriceBox side="YES" cents={yesPct} color="var(--ios-green)" bg="rgba(48,209,88,0.08)" border="rgba(48,209,88,0.25)" betLabel={t("bet")} />
          <PriceBox side="NO" cents={noPct} color="var(--ios-red)" bg="rgba(255,69,58,0.08)" border="rgba(255,69,58,0.25)" betLabel={t("bet")} />
        </div>
      </div>
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
