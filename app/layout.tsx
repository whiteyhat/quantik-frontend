"use client";

import "./globals.css";
import { Providers } from "@/components/Providers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { api, fmtUSDC, type WalletBalance } from "@/lib/api";
import { ToastNotification } from "@/components/ToastNotification";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Markets", href: "/markets", icon: "📊" },
  { label: "Portfolio", href: "/portfolio", icon: "💼" },
  { label: "Trade History", href: "/trades", icon: "📈" },
  { label: "Risk Config", href: "/settings/risk", icon: "🛡️" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "🚨 Panic Mode", href: "/emergency/panic", icon: "🚨" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 220,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        // L006: Sidebar glassmorphism — must float above bg with frosted glass
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: "24px 20px 16px" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.08em",
            }}
          >
            ◆ QUANTIK
          </span>
        </Link>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
          }}
        >
          MISSION CONTROL
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "0 16px 12px",
          background: "rgba(255,255,255,0.05)",
        }}
      />

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "0 10px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                marginBottom: 3,
                borderRadius: 10,
                textDecoration: "none",
                color: isActive
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.45)",
                background: isActive
                  ? "rgba(255,255,255,0.07)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid #0a84ff"
                  : "2px solid transparent",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: "all 180ms ease",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Version footer */}
      <div
        style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.20)",
            fontFamily: "monospace",
          }}
        >
          v0.1.0 · Quantik
        </span>
      </div>
    </aside>
  );
}

// ─── Top Wallet Bar ───────────────────────────────────────────────────────────

// L007: Dot separators with 16px spacing, monospace values, labels above
function Separator() {
  return (
    <span
      style={{
        margin: "0 16px",
        color: "rgba(255,255,255,0.15)",
        fontSize: 16,
        userSelect: "none",
      }}
    >
      ·
    </span>
  );
}

function MetricItem({
  label,
  value,
  valueColor = "rgba(255,255,255,0.92)",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "rgba(255,255,255,0.30)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          fontSize: 13,
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TopWalletBar() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getBalance().then(setWallet).catch(() => {});
    const iv = setInterval(() => {
      api.getBalance().then(setWallet).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  const copyAddress = useCallback(() => {
    const addr = wallet?.address ?? "";
    if (!addr) return;
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [wallet?.address]);

  const truncAddr = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  const pnl = wallet?.pnl ?? 0;
  const pnlPct = wallet?.pnlPct ?? 0;
  const pnlColor = pnl >= 0 ? "#30d158" : "#ff453a";
  const pnlSign = pnl >= 0 ? "+" : "";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        background: "rgba(5,5,8,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    >
      {/* Wallet address — copy on click */}
      <button
        onClick={copyAddress}
        title="Click to copy"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 6,
          cursor: "pointer",
          padding: "4px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: 12,
            color: "rgba(255,255,255,0.60)",
          }}
        >
          {wallet?.address ? truncAddr(wallet.address) : "0x7EE9…4b53"}
        </span>
        {copied ? (
          <span style={{ fontSize: 11, color: "#30d158" }}>✓</span>
        ) : (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>⎘</span>
        )}
      </button>

      <Separator />

      <MetricItem label="USDC" value={wallet ? fmtUSDC(wallet.usdc) : "···"} />

      <Separator />

      <MetricItem label="POL" value="0.00" />

      <Separator />

      <MetricItem
        label="DAILY P&L"
        value={
          wallet
            ? `${pnlSign}${fmtUSDC(pnl)} (${pnlSign}${(pnlPct).toFixed(1)}%)`
            : "···"
        }
        valueColor={pnlColor}
      />

      <Separator />

      <MetricItem
        label="TOTAL VALUE"
        value={wallet ? fmtUSDC(wallet.usdc) : "···"}
      />

      {/* Agent status dot — pushed to right */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            position: "relative",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#30d158",
            display: "inline-block",
            boxShadow: "0 0 8px rgba(48,209,88,0.6)",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
          }}
        >
          ALL SYSTEMS OK
        </span>
      </div>
    </div>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Quantik | Mission Control</title>
        <meta
          name="description"
          content="AI-powered prediction market trading terminal"
        />
      </head>
      <body className="antialiased" style={{ minHeight: "100vh" }}>
        <Providers>
          {/* Animated gradient background */}
          <div className="crystal-bg" />

          {/* Left sidebar */}
          <Sidebar />

          {/* Toast notifications */}
          <ToastNotification />

          {/* Main content — offset by sidebar width */}
          <div
            style={{
              marginLeft: 220,
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Persistent top wallet bar */}
            <TopWalletBar />

            {/* Page content */}
            <main
              style={{
                flex: 1,
                padding: "20px 20px 40px",
                overflowX: "hidden",
              }}
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
