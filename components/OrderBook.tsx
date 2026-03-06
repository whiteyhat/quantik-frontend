"use client";

interface OrderBookProps {
  yesPrice: number;
  spread?: number;
}

function fmtCents(v: number): string {
  return `${(v * 100).toFixed(1)}\u00A2`;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDollar(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function OrderBook({ yesPrice, spread = 0.02 }: OrderBookProps) {
  const p = yesPrice;
  const s = spread / 100; // spread is in cents, convert to fraction

  // Asks: prices above market (sells)
  const asks = [
    { price: p + s * 0.4, amount: 1500 },
    { price: p + s * 1.0, amount: 8100 },
    { price: p + s * 2.0, amount: 4200 },
  ];

  // Bids: prices below market (buys)
  const bids = [
    { price: p - s * 0.05, amount: 12400 },
    { price: p - s * 0.25, amount: 6200 },
    { price: p - s * 0.5, amount: 24100 },
  ];

  const midPrice = p * 100;

  const maxAskTotal = Math.max(...asks.map((a) => a.price * a.amount));
  const maxBidTotal = Math.max(...bids.map((b) => b.price * b.amount));

  return (
    <div
      className="glass-card"
      style={{ padding: 20, display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <span
          style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}
        >
          Order Book
        </span>
        <span
          className="font-mono-data"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
        >
          Spread:{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {spread.toFixed(1)}\u00A2
          </span>
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
          marginBottom: 6,
          padding: "0 10px",
        }}
      >
        {["PRICE", "AMOUNT", "TOTAL"].map((h) => (
          <span
            key={h}
            className="font-mono-data"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-tertiary)",
              letterSpacing: "0.08em",
              textAlign: h === "TOTAL" ? "right" : "left",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Asks (sells — red) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
        {asks.map((row, i) => {
          const total = row.price * row.amount;
          const depth = total / maxAskTotal;
          return (
            <OrderRow
              key={i}
              price={fmtCents(row.price)}
              amount={fmtK(row.amount)}
              total={fmtDollar(total)}
              color="var(--ios-red)"
              depth={depth}
              side="ask"
            />
          );
        })}
      </div>

      {/* Mid price separator */}
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
        <span
          className="font-mono-data"
          style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}
        >
          {midPrice.toFixed(1)}\u00A2 USD
        </span>
      </div>

      {/* Bids (buys — green) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {bids.map((row, i) => {
          const total = row.price * row.amount;
          const depth = total / maxBidTotal;
          return (
            <OrderRow
              key={i}
              price={fmtCents(row.price)}
              amount={fmtK(row.amount)}
              total={fmtDollar(total)}
              color="var(--ios-green)"
              depth={depth}
              side="bid"
            />
          );
        })}
      </div>
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
      {/* Depth background bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: `${depth * 100}%`,
          background:
            side === "ask"
              ? "rgba(255,69,58,0.07)"
              : "rgba(48,209,88,0.07)",
          pointerEvents: "none",
        }}
      />
      <span
        className="font-mono-data"
        style={{ fontSize: 13, fontWeight: 600, color, zIndex: 1 }}
      >
        {price}
      </span>
      <span
        className="font-mono-data"
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          zIndex: 1,
        }}
      >
        {amount}
      </span>
      <span
        className="font-mono-data"
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          textAlign: "right",
          zIndex: 1,
        }}
      >
        {total}
      </span>
    </div>
  );
}
