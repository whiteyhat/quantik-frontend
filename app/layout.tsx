"use client";

import "./globals.css";
import { Providers } from "@/components/Providers";
import { GlobalPanicButton } from "@/components/GlobalPanicButton";
import { RelayChatSidebar } from "@/components/RelayChatSidebar";
import { usePaperMode } from "@/context/PaperModeContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { api, fmtUSDC, type WalletBalance } from "@/lib/api";
import { BottomTabBar } from "@/components/BottomTabBar";
import { ToastNotification } from "@/components/ToastNotification";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Markets", href: "/markets", icon: "📊" },
  { label: "Portfolio", href: "/portfolio", icon: "💼" },
  { label: "Trade History", href: "/trade-history", icon: "📈" },
  { label: "Market Analysis", href: "/market-analysis", icon: "🔮" },
  { label: "Risk Config", href: "/settings/risk", icon: "🛡️" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

// localStorage key for relay first-open tracking
const RELAY_LS_KEY = "relay_hasBeenOpened";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  relayOpen: boolean;
  relayPulsing: boolean;
  onToggleRelay: () => void;
}

function Sidebar({ relayOpen, relayPulsing, onToggleRelay }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] z-40"
      style={{
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

      {/* Footer — version text + Relay trigger button (rightmost) */}
      <div
        style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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

        {/* Relay trigger — rightmost in footer */}
        <div className="relative group" style={{ position: "relative" }}>
          {/* Pulse ring */}
          {relayPulsing && (
            <span
              className="relay-pulse-ring"
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "2px solid rgba(10,132,255,0.7)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}
          <button
            onClick={onToggleRelay}
            aria-label={relayOpen ? "Close Relay chat" : "Open Relay chat"}
            style={{
              position: "relative",
              zIndex: 1,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: relayOpen
                ? "rgba(10,132,255,0.25)"
                : relayPulsing
                ? "rgba(10,132,255,0.18)"
                : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${relayOpen ? "rgba(10,132,255,0.45)" : "rgba(255,255,255,0.12)"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              color: "rgba(255,255,255,0.85)",
              outline: "none",
              transition: "all 200ms ease",
              boxShadow: relayPulsing ? "0 0 14px rgba(10,132,255,0.40)" : undefined,
            }}
          >
            {relayOpen ? "✕" : "🤝"}
          </button>
          {/* Styled tooltip replacing native title attribute */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-mono text-white bg-zinc-800 border border-white/10 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            CHAT WITH QUANTIK INTELLIGENCE
          </div>
        </div>
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
  const { paperMode } = usePaperMode();

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

  // Use onChainUsdc if available (new backend), fall back to legacy usdc field
  const usdcValue = wallet ? (wallet.onChainUsdc ?? wallet.usdc ?? 0) : null;
  const usdcDisplay = usdcValue !== null ? fmtUSDC(usdcValue) : "···";

  // POL balance — use formatted string if available, otherwise format the raw number
  const polDisplay = wallet
    ? (wallet.polFormatted ?? (wallet.pol != null ? wallet.pol.toFixed(2) : "0.00"))
    : "···";

  // Total value = on-chain USDC (primary balance)
  const totalDisplay = usdcValue !== null ? fmtUSDC(usdcValue) : "···";

  return (
    <div
      className="sticky top-0 z-30 h-[52px] flex items-center px-4 md:px-[20px] bg-[rgba(5,5,8,0.88)] border-b border-[rgba(255,255,255,0.06)] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide"
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Paper mode badge */}
      {paperMode && (
        <div
          style={{
            marginRight: 12,
            padding: "3px 10px",
            borderRadius: 100,
            background: "rgba(255,159,10,0.15)",
            border: "1px solid rgba(255,159,10,0.35)",
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
              background: "#FF9F0A",
              display: "inline-block",
              boxShadow: "0 0 6px rgba(255,159,10,0.6)",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#FF9F0A",
              letterSpacing: "0.08em",
              fontFamily: "monospace",
            }}
          >
            PAPER MODE
          </span>
        </div>
      )}

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

      {/* USDC — reads onChainUsdc (new) or falls back to legacy usdc */}
      <MetricItem label="USDC" value={usdcDisplay} />

      <Separator />

      {/* POL balance */}
      <MetricItem label="POL" value={polDisplay} />

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

      <MetricItem label="TOTAL VALUE" value={totalDisplay} />

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
  const [relayOpen, setRelayOpen] = useState(false);
  // Always start pulsing; after hydration check localStorage to suppress if already opened
  const [relayPulsing, setRelayPulsing] = useState(true);
  useEffect(() => {
    if (localStorage.getItem(RELAY_LS_KEY) === "true") {
      setRelayPulsing(false);
    }
  }, []);

  const handleToggleRelay = useCallback(() => {
    setRelayOpen((prev) => !prev);
  }, []);

  // Called by RelayChatSidebar on first open to stop pulsing
  const handleRelayFirstOpen = useCallback(() => {
    localStorage.setItem(RELAY_LS_KEY, "true");
    setRelayPulsing(false);
  }, []);

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

          {/* Left sidebar — relay button lives in its footer */}
          <Sidebar
            relayOpen={relayOpen}
            relayPulsing={relayPulsing}
            onToggleRelay={handleToggleRelay}
          />

          {/* Relay chat drawer — controlled by layout state */}
          <RelayChatSidebar
            open={relayOpen}
            onToggle={handleToggleRelay}
            onFirstOpen={handleRelayFirstOpen}
          />

          {/* Toast notifications */}
          <ToastNotification />

          {/* Global panic mode floating action button */}
          <GlobalPanicButton />

          <BottomTabBar />

          {/* Main content — offset by sidebar width */}
          <div
            className="md:ml-[220px] min-h-[100vh] flex flex-col relative z-10 pb-[68px] md:pb-0"
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
