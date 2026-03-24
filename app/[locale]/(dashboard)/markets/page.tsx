"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, fmtUSDC, fmtDateShort, streamPrices, type Market, type MarketAlertItem, type WatchlistItem } from "@/lib/api";
import { SkeletonCard } from "@/components/ui/skeleton";
import { MarketAlertEditor } from "@/components/markets/MarketAlertEditor";

const panelStyle: React.CSSProperties = {
  background: "var(--glass-surface)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: 18,
  padding: 20,
};

function MarketCard({
  market,
  livePrice,
  isWatchlisted,
  alert,
  onToggleWatchlist,
  onEditAlert,
}: {
  market: Market;
  livePrice?: { yes: number; no: number };
  isWatchlisted: boolean;
  alert?: MarketAlertItem | null;
  onToggleWatchlist: () => void;
  onEditAlert: () => void;
}) {
  const t = useTranslations("markets");
  const locale = useLocale();
  const stellarMode = market.chainMode === "stellar_testnet";
  const yes = livePrice?.yes ?? market.yesPrice ?? 0;
  const no = livePrice?.no ?? market.noPrice ?? Math.max(0, 1 - yes);
  const yesPct = Math.round(yes * 100);
  const noPct = Math.round(no * 100);

  return (
    <div
      style={{
        ...panelStyle,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", padding: "4px 8px", borderRadius: 999, border: "1px solid var(--glass-border)" }}>
            {stellarMode ? (market.protocol ?? "soroswap").toUpperCase() : (market.category ?? "All")}
          </span>
          {stellarMode && market.assetPair ? (
            <span style={{ fontSize: 11, color: "var(--ios-blue)", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(10,132,255,0.35)" }}>
              {market.assetPair}
            </span>
          ) : null}
          {alert?.enabled ? (
            <span style={{ fontSize: 11, color: "var(--ios-orange)", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,159,10,0.35)" }}>
              ALERT {alert.direction.toUpperCase()} {Math.round(alert.threshold * 100)}¢
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onToggleWatchlist}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: isWatchlisted ? "rgba(255,159,10,0.18)" : "transparent",
              color: isWatchlisted ? "var(--ios-orange)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ★
          </button>
          <button
            onClick={onEditAlert}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: alert?.enabled ? "rgba(10,132,255,0.16)" : "transparent",
              color: alert?.enabled ? "var(--ios-blue)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ⏰
          </button>
        </div>
      </div>

      <Link href={`/market/${market.slug}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.45,
          }}
        >
          {market.question}
        </h3>

        {stellarMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.18)" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>APY</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-blue)" }}>{(market.currentApy ?? 0).toFixed(1)}%</div>
            </div>
            <div style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.16)" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>TVL</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{fmtUSDC(market.liquidity)}</div>
            </div>
            <div style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.16)" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>Risk</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-orange)" }}>{(market.riskScore ?? 0).toFixed(2)}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 2, borderRadius: 10, overflow: "hidden", height: 28 }}>
            <div style={{ width: `${yesPct}%`, minWidth: 46, background: "rgba(48,209,88,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ios-green)", fontSize: 11, fontWeight: 700 }}>
              YES {yesPct}¢
            </div>
            <div style={{ width: `${Math.max(noPct, 100 - yesPct)}%`, minWidth: 46, background: "rgba(255,69,58,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ios-red)", fontSize: 11, fontWeight: 700 }}>
              NO {noPct}¢
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "var(--text-secondary)", fontSize: 12 }}>
          <span>{t("vol")} {fmtUSDC(market.volume)}</span>
          <span>{t("liq")} {market.liquidityGrade}</span>
          <span>{market.resolutionDate ? fmtDateShort(new Date(market.resolutionDate).getTime(), locale) : "—"}</span>
        </div>
      </Link>
    </div>
  );
}

export default function MarketsPage() {
  const t = useTranslations("markets");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minLiquidity, setMinLiquidity] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [minProbability, setMinProbability] = useState(0);
  const [maxProbability, setMaxProbability] = useState(100);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, { yes: number; no: number }>>({});
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<MarketAlertItem[]>([]);
  const [alertMarket, setAlertMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function refreshOperatorState() {
    const [nextWatchlist, nextAlerts] = await Promise.all([
      api.getWatchlist().catch(() => []),
      api.getMarketAlerts().catch(() => []),
    ]);
    setWatchlist(nextWatchlist);
    setAlerts(nextAlerts);
  }

  useEffect(() => {
    void refreshOperatorState();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = !search.trim() && selectedCategory === "all"
      ? api.getTrendingMarkets()
      : api.getMarkets(search.trim() || undefined, selectedCategory !== "all" ? selectedCategory : undefined, 80, 0);

    load.then((response) => {
      if (active) setMarkets(response.markets);
    }).catch(() => {
      if (active) setMarkets([]);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [search, selectedCategory]);

  useEffect(() => {
    if (markets.length === 0) return;
    cleanupRef.current?.();
    const tokens = markets.map((market) => market.tokenId).filter(Boolean);
    if (tokens.length === 0) return;
    const unsubscribe = streamPrices(tokens, (prices) => {
      setLivePrices((previous) => ({ ...previous, ...prices }));
    });
    cleanupRef.current = unsubscribe;
    return () => unsubscribe();
  }, [markets]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(markets.map((market) => market.category).filter(Boolean))) as string[];
    return ["all", ...values];
  }, [markets]);

  const watchlistSlugs = new Set(watchlist.map((item) => item.slug));
  const alertMap = new Map(alerts.filter((alert) => alert.enabled).map((alert) => [alert.slug, alert]));

  const filtered = markets.filter((market) => {
    if (watchlistOnly && !watchlistSlugs.has(market.slug)) return false;
    if (Number(minLiquidity) > 0 && (market.liquidity ?? 0) < Number(minLiquidity)) return false;
    if (Number(minVolume) > 0 && (market.volume ?? 0) < Number(minVolume)) return false;
    const yes = livePrices[market.tokenId]?.yes ?? market.probability ?? market.yesPrice ?? 0;
    const yesPct = yes * 100;
    if (yesPct < minProbability || yesPct > maxProbability) return false;
    if (Number(expiryDays) > 0 && market.resolutionDate) {
      const ms = new Date(market.resolutionDate).getTime() - Date.now();
      const days = ms / 86_400_000;
      if (days > Number(expiryDays)) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.04em",
          }}
        >
          {t("title")}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Server-normalized market discovery with watchlists and alert thresholds.
        </p>
      </div>

      <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--glass-surface)", color: "var(--text-primary)" }}
          />
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--glass-surface)", color: "var(--text-primary)" }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All categories" : category}
              </option>
            ))}
          </select>
          <input
            value={minLiquidity}
            onChange={(event) => setMinLiquidity(event.target.value)}
            placeholder="Min liquidity"
            type="number"
            style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--glass-surface)", color: "var(--text-primary)" }}
          />
          <input
            value={minVolume}
            onChange={(event) => setMinVolume(event.target.value)}
            placeholder="Min volume"
            type="number"
            style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--glass-surface)", color: "var(--text-primary)" }}
          />
          <input
            value={expiryDays}
            onChange={(event) => setExpiryDays(event.target.value)}
            placeholder="Resolve within N days"
            type="number"
            style={{ padding: "12px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--glass-surface)", color: "var(--text-primary)" }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12 }}>
            <input type="checkbox" checked={watchlistOnly} onChange={(event) => setWatchlistOnly(event.target.checked)} />
            Watchlist only
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
            Min YES probability: {minProbability}¢
            <input type="range" min={0} max={100} value={minProbability} onChange={(event) => setMinProbability(Number(event.target.value))} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
            Max YES probability: {maxProbability}¢
            <input type="range" min={0} max={100} value={maxProbability} onChange={(event) => setMaxProbability(Number(event.target.value))} />
          </label>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((market) => (
            <MarketCard
              key={market.slug}
              market={market}
              livePrice={livePrices[market.tokenId]}
              isWatchlisted={watchlistSlugs.has(market.slug)}
              alert={alertMap.get(market.slug) ?? null}
              onToggleWatchlist={async () => {
                if (watchlistSlugs.has(market.slug)) {
                  await api.removeWatchlistItem(market.slug);
                } else {
                  await api.addWatchlistItem(market.slug, market.question);
                }
                await refreshOperatorState();
              }}
              onEditAlert={() => setAlertMarket(market)}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)" }}>
          No markets matched the current filters.
        </div>
      ) : null}

      <MarketAlertEditor
        open={alertMarket != null}
        slug={alertMarket?.slug ?? ""}
        question={alertMarket?.question ?? ""}
        initialPrice={alertMarket ? livePrices[alertMarket.tokenId]?.yes ?? alertMarket.yesPrice ?? 0.5 : 0.5}
        existingAlert={alertMarket ? alerts.find((alert) => alert.slug === alertMarket.slug) ?? null : null}
        onClose={() => setAlertMarket(null)}
        onSaved={() => void refreshOperatorState()}
      />
    </div>
  );
}
