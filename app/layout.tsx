"use client";

import "./globals.css";
import { Providers } from "@/components/Providers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtUSDC } from "@/lib/api";
import { SystemStatus } from "@/components/SystemStatus";
import { ToastNotification } from "@/components/ToastNotification";

function Navbar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [showSystemStatus, setShowSystemStatus] = useState(false);

  useEffect(() => {
    api.getBalance()
      .then((w) => setBalance(w.usdc))
      .catch(() => {});
  }, []);

  const navLinks = [
    { label: "Dashboard", href: "/" },
    { label: "Markets", href: "/#markets" },
  ];

  return (
    <nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-8 px-6"
      style={{
        height: 52,
        borderRadius: 100,
        background: "rgba(10, 10, 20, 0.7)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        maxWidth: 720,
        width: "calc(100% - 32px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2 shrink-0" style={{ textDecoration: "none" }}>
        <span
          className="font-mono-data"
          style={{
            fontSize: "var(--text-headline)",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.05em",
          }}
        >
          ◆ QUANTIK
        </span>
      </Link>

      {/* Center nav links */}
      <div className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href === "/" && pathname === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "var(--text-subhead)",
                fontWeight: 500,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                padding: "6px 14px",
                borderRadius: 8,
                background: isActive ? "rgba(255, 255, 255, 0.10)" : "transparent",
                textDecoration: "none",
                transition: "all 200ms ease",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right side: system status + wallet */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setShowSystemStatus(!showSystemStatus)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--text-body)",
            padding: 4,
            lineHeight: 1,
          }}
          aria-label="System status"
        >
          ⚙
        </button>

        <div
          className="flex items-center gap-2"
          style={{
            padding: "4px 12px",
            borderRadius: 100,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--ios-green)",
              display: "inline-block",
            }}
          />
          <span
            className="font-mono-data"
            style={{
              fontSize: "var(--text-subhead)",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {balance !== null ? fmtUSDC(balance) : "···"}
          </span>
        </div>
      </div>

      {showSystemStatus && (
        <div style={{ position: "absolute", top: 60, right: 0 }}>
          <SystemStatus onClose={() => setShowSystemStatus(false)} />
        </div>
      )}
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Quantik | Trading Terminal</title>
        <meta name="description" content="AI-powered prediction market trading terminal" />
      </head>
      <body className="antialiased" style={{ minHeight: "100vh" }}>
        <Providers>
          {/* Animated gradient background */}
          <div className="crystal-bg" />

          {/* Floating navbar */}
          <Navbar />

          {/* Toast notifications */}
          <ToastNotification />

          {/* Main content */}
          <main
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1200,
              margin: "0 auto",
              padding: "80px 16px 64px",
            }}
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
