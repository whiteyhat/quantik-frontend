"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useQuantikStore } from "@/store/useQuantikStore";

const NAV_ITEMS: { label: string; href: string; icon: string; isFactory?: boolean }[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "My Agent", href: "/manage-agent", icon: "🤖" },
  { label: "Markets", href: "/markets", icon: "📊" },
  { label: "Factory", href: "/agent-factory", icon: "🏭", isFactory: true },
  { label: "Trades", href: "/trade-history", icon: "📈" },
];

interface BottomTabBarProps {
  relayOpen?: boolean;
  relayPulsing?: boolean;
  onToggleRelay?: () => void;
}

export function BottomTabBar({ relayOpen, relayPulsing, onToggleRelay }: BottomTabBarProps) {
  const pathname = usePathname();
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around pb-safe pt-2 bg-[rgba(5,5,8,0.88)] backdrop-blur-[20px] border-t border-[rgba(255,255,255,0.06)] h-[68px]"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        const isDisabled = !myAgentLoading && !myAgent && !item.isFactory;

        const inner = (
          <>
            <span style={{ fontSize: 20, marginBottom: 4, position: "relative" }}>
              {item.icon}
              {item.isFactory && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -14,
                    padding: "0px 4px",
                    borderRadius: 100,
                    fontSize: 8,
                    fontWeight: 700,
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    background: myAgent ? "rgba(48,209,88,0.15)" : "rgba(255,159,10,0.15)",
                    border: `1px solid ${myAgent ? "rgba(48,209,88,0.35)" : "rgba(255,159,10,0.35)"}`,
                    color: myAgent ? "#30d158" : "#FF9F0A",
                    lineHeight: "14px",
                  }}
                >
                  {myAgent ? "1/1" : "0/1"}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
              {item.label}
            </span>
          </>
        );

        const sharedStyle: React.CSSProperties = {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 56,
          minHeight: 44,
          color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
          textDecoration: "none",
          opacity: isDisabled ? 0.35 : 1,
          transition: "opacity 180ms ease",
        };

        if (isDisabled) {
          return (
            <div key={item.href} style={{ ...sharedStyle, cursor: "not-allowed", pointerEvents: "none" }}>
              {inner}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={!myAgent && item.isFactory ? "onboarding-glow" : undefined}
            style={sharedStyle}
          >
            {inner}
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
          minWidth: 56,
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
        <span style={{ fontSize: 20, marginBottom: 4 }}>{myAgent?.avatar_emoji ?? "🤝"}</span>
        <span style={{ fontSize: 10, fontWeight: relayOpen ? 600 : 400 }}>
          {myAgent?.name ?? "Chat"}
        </span>
      </button>
    </nav>
  );
}
