"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type OrderBookLevel } from "@/lib/api";

interface OrderBookProps {
  tokenId: string;
  yesPrice: number;
}

function fmtCents(v: number): string {
  return `${(v * 100).toFixed(1)}¢`;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

import { fmtDollar } from "@/lib/formatters";

export function OrderBook({ tokenId, yesPrice }: OrderBookProps) {
  const t = useTranslations("orderBook");
  const { data, isLoading } = useQuery({
    queryKey: ["orderbook", tokenId],
    queryFn: () => api.getOrderBook(tokenId),
    enabled: Boolean(tokenId),
    refetchInterval: 10_000,
  });

  const asks: OrderBookLevel[] = data?.asks?.slice(0, 3) ?? [];
  const bids: OrderBookLevel[] = data?.bids?.slice(0, 3) ?? [];
  const midPrice = yesPrice * 100;

  const bestAsk = asks[0]?.price ?? 0;
  const bestBid = bids[0]?.price ?? 0;
  const spreadCents = bestAsk > 0 && bestBid > 0
    ? ((bestAsk - bestBid) * 100).toFixed(1)
    : null;

  const maxAskTotal = asks.length ? Math.max(...asks.map((a) => a.price * a.size)) : 1;
  const maxBidTotal = bids.length ? Math.max(...bids.map((b) => b.price * b.size)) : 1;

  return (
    <div
      className="glass-card"
      style={{ padding: 20, display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          {t("title")}
        </span>
        {spreadCents && (
          <span className="font-mono-data" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {t("spread")}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{spreadCents}¢</span>
          </span>
        )}
      </div>

      {isLoading ? (
        <OrderBookSkeleton />
      ) : asks.length === 0 && bids.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 6, padding: "0 10px" }}>
            {(["price", "size", "total"] as const).map((key, i) => (
              <span
                key={key}
                className="font-mono-data"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  textAlign: i === 2 ? "right" : "left",
                }}
              >
                {t(key)}
              </span>
            ))}
          </div>

          {/* Asks (sells — red) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
            {asks.map((row, i) => {
              const total = row.price * row.size;
              return (
                <OrderRow
                  key={i}
                  price={fmtCents(row.price)}
                  amount={fmtK(row.size)}
                  total={fmtDollar(total)}
                  color="var(--ios-red)"
                  depth={total / maxAskTotal}
                  side="ask"
                />
              );
            })}
          </div>

          {/* Mid price */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 8,
            }}
          >
            <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {midPrice.toFixed(1)}¢ {t("usd")}
            </span>
          </div>

          {/* Bids (buys — green) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {bids.map((row, i) => {
              const total = row.price * row.size;
              return (
                <OrderRow
                  key={i}
                  price={fmtCents(row.price)}
                  amount={fmtK(row.size)}
                  total={fmtDollar(total)}
                  color="var(--ios-green)"
                  depth={total / maxBidTotal}
                  side="bid"
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function OrderRow({
  price,
  amount,
  total,
  color,
  depth,
  side,
}: {
  price: string;
  amount: string;
  total: string;
  color: string;
  depth: number;
  side: "ask" | "bid";
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 4,
        padding: "5px 10px",
        borderRadius: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: `${depth * 100}%`,
          background: side === "ask" ? "rgba(255,69,58,0.07)" : "rgba(48,209,88,0.07)",
          pointerEvents: "none",
        }}
      />
      <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 600, color, zIndex: 1 }}>{price}</span>
      <span className="font-mono-data" style={{ fontSize: 13, color: "var(--text-secondary)", zIndex: 1 }}>{amount}</span>
      <span className="font-mono-data" style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "right", zIndex: 1 }}>{total}</span>
    </div>
  );
}

function OrderBookSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          style={{
            height: 24,
            borderRadius: 4,
            background: "rgba(255,255,255,0.04)",
            opacity: 1 - i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("orderBook");
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
      {t("noData")}
    </div>
  );
}
