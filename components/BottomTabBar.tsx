"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Markets", href: "/markets", icon: "📊" },
  { label: "Portfolio", href: "/portfolio", icon: "💼" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

interface BottomTabBarProps {
  relayOpen?: boolean;
  relayPulsing?: boolean;
  onToggleRelay?: () => void;
}

export function BottomTabBar({ relayOpen, relayPulsing, onToggleRelay }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around pb-safe pt-2 bg-[rgba(5,5,8,0.88)] backdrop-blur-[20px] border-t border-[rgba(255,255,255,0.06)] h-[68px]"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 64,
              minHeight: 44,
              color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={onToggleRelay}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 64,
          minHeight: 44,
          color: relayOpen ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
          textDecoration: "none",
          position: "relative",
          background: "transparent",
          border: "none",
        }}
      >
        {relayPulsing && (
          <span
            className="relay-pulse-ring"
            style={{
              position: "absolute",
              top: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "2px solid rgba(10,132,255,0.7)",
              pointerEvents: "none",
            }}
          />
        )}
        <span style={{ fontSize: 20, marginBottom: 4 }}>🤝</span>
        <span style={{ fontSize: 10, fontWeight: relayOpen ? 600 : 400 }}>
          Relay
        </span>
      </button>
    </nav>
  );
}
