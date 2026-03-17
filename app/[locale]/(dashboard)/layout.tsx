"use client";

import { GlobalPanicButton } from "@/components/GlobalPanicButton";
import { usePaperMode } from "@/context/PaperModeContext";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { api, setAuthToken } from "@/lib/api";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";
import { BottomTabBar } from "@/components/BottomTabBar";
import { RelayChatSidebar } from "@/components/RelayChatSidebar";
import { ToastNotification } from "@/components/ToastNotification";
import { VersionLogButton } from "@/components/VersionLog";
import { CURRENT_VERSION } from "@/lib/releases";
import { useHydrated } from "@/hooks/useHydrated";
import { setLocalStorageFlag, useLocalStorageFlag } from "@/hooks/useLocalStorageFlag";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationCenterPanel } from "@/components/NotificationCenter";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";

// ─── Auth Sync ────────────────────────────────────────────────────────────────
// Keeps the API client's Bearer token in sync with Clerk's session token
function AuthSync() {
  const { getToken, isSignedIn } = useAuth();
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const setMyAgentLoading = useQuantikStore((s) => s.setMyAgentLoading);
  const setStoreAuthReady = useQuantikStore((s) => s.setAuthReady);
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const router = useRouter();
  const pathname = usePathname();

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = (isInitial = false) => {
      getToken().then((t) => {
        if (!active) return;
        // Only update the token when we got a real value.
        // During Clerk's mid-rotation refresh window getToken() can return null
        // for a signed-in user. Nulling out _authToken here would silently drop
        // the Authorization header on the next API call (→ 401) while myAgent
        // stays non-null (so the redirect to agent-factory never fires).
        if (t) {
          setAuthToken(t);
        }
        // Mark ready after the first attempt regardless (covers signed-out state).
        if (isInitial) {
          setAuthReady(true);
          setStoreAuthReady(true);
        }
      }).catch(() => {
        if (active && isInitial) {
          setAuthReady(true);
          setStoreAuthReady(true);
        }
      });
    };
    sync(true);
    const iv = setInterval(() => sync(false), 50_000); // refresh before 60s JWT expiry
    return () => { active = false; clearInterval(iv); };
  }, [getToken, setStoreAuthReady]);

  // Fetch the user's agent once authenticated AND auth token is set
  useEffect(() => {
    if (!isSignedIn || !authReady) return;
    setMyAgentLoading(true);
    api.getMyAgent()
      .then((data) => {
        if (data) setMyAgent(data as unknown as MyAgent);
      })
      .catch(() => {})
      .finally(() => setMyAgentLoading(false));
  }, [isSignedIn, authReady, setMyAgent, setMyAgentLoading]);

  // Redirect first-time users (no agent) to Agent Factory
  // Skip redirect if onboarding modal hasn't been seen yet — let the modal show first
  useEffect(() => {
    if (!isSignedIn || myAgentLoading || myAgent !== null) return;
    if (pathname.startsWith("/agent-factory")) return;
    const hasSeenOnboarding = typeof window !== "undefined" && window.localStorage.getItem("hasSeenOnboarding") === "true";
    if (!hasSeenOnboarding) return;
    router.replace("/agent-factory");
  }, [isSignedIn, myAgentLoading, myAgent, pathname, router]);

  return null;
}

// ─── Wallet Sync ─────────────────────────────────────────────────────────────
// Keeps the global wallet store fresh on every dashboard page (market, pipeline, etc.)
function WalletSync() {
  const setWallet = useQuantikStore((s) => s.setWallet);
  const myAgent = useQuantikStore((s) => s.myAgent);

  useEffect(() => {
    if (!myAgent) return;
    let active = true;
    const fetchWallet = () => {
      api.getBalance().then((w) => {
        if (active && w) setWallet(w);
      }).catch(() => {});
    };
    fetchWallet();
    const iv = setInterval(fetchWallet, 30_000);
    return () => { active = false; clearInterval(iv); };
  }, [myAgent, setWallet]);

  return null;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { labelKey: "dashboard" | "arena" | "myAgent" | "tradeHistory" | "agentFactory" | "settings"; href: string; icon: string; isFactory?: boolean }[] = [
  { labelKey: "dashboard", href: "/dashboard", icon: "🏠" },
  { labelKey: "myAgent", href: "/manage-agent", icon: "🤖" },
  { labelKey: "tradeHistory", href: "/reports", icon: "📈" },
  { labelKey: "agentFactory", href: "/agent-factory", icon: "🏭", isFactory: true },
  { labelKey: "arena", href: "/arena", icon: "⚔️" },
  { labelKey: "settings", href: "/settings", icon: "⚙️" },
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
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const { user } = useUser();
  const { paperMode } = usePaperMode();
  const hydrated = useHydrated();
  const [profileHovered, setProfileHovered] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = useCallback(() => {
    // Find and click the Clerk UserButton's internal button to open the popover
    const clerkBtn = profileRef.current?.querySelector<HTMLButtonElement>(".cl-userButtonTrigger, .cl-avatarBox, button");
    clerkBtn?.click();
  }, []);

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] z-40"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Wordmark + Changelog button */}
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                fontSize: 15,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.08em",
              }}
            >
              ◆ {tNav("wordmark")}
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
            {tNav("tagline")}
          </div>
          {/* Paper mode compact badge */}
          {paperMode && (
            <div
              style={{
                marginTop: 6,
                padding: "2px 8px",
                borderRadius: 100,
                background: "rgba(255,159,10,0.12)",
                border: "1px solid rgba(255,159,10,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#FF9F0A",
                  display: "inline-block",
                  boxShadow: "0 0 5px rgba(255,159,10,0.5)",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#FF9F0A",
                  letterSpacing: "0.06em",
                  fontFamily: "monospace",
                }}
              >
                PAPER
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VersionLogButton />
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
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const isDisabled = !myAgentLoading && !myAgent && !item.isFactory;
          const isLoading = myAgentLoading && !item.isFactory;

          const sharedStyle: React.CSSProperties = {
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
            opacity: isDisabled ? 0.35 : isLoading ? 0.55 : 1,
            cursor: isDisabled ? "not-allowed" : undefined,
            pointerEvents: isDisabled ? "none" as const : undefined,
          };

          const content = (
            <>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              <span>{tNav(item.labelKey)}</span>
              {item.isFactory && (
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "1px 7px",
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    letterSpacing: "0.04em",
                    background: myAgent ? "rgba(48,209,88,0.15)" : "rgba(255,159,10,0.15)",
                    border: `1px solid ${myAgent ? "rgba(48,209,88,0.35)" : "rgba(255,159,10,0.35)"}`,
                    color: myAgent ? "#30d158" : "#FF9F0A",
                    transition: "all 300ms ease",
                  }}
                >
                  {myAgent ? "1/1" : "0/1"}
                </span>
              )}
            </>
          );

          if (isDisabled) {
            return (
              <div key={item.href} style={sharedStyle} title={tSidebar("createAgentFirst")}>
                {content}
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
              {content}
            </Link>
          );
        })}
      </nav>

      {/* ─── User Profile Section ─────────────────────────────────────── */}
      <div
        ref={profileRef}
        onClick={handleProfileClick}
        onMouseEnter={() => setProfileHovered(true)}
        onMouseLeave={() => setProfileHovered(false)}
        style={{
          margin: "0 10px",
          padding: "10px 10px",
          borderRadius: 12,
          background: profileHovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${profileHovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          transition: "all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          cursor: "pointer",
        }}
      >
        {/* Avatar with glow ring */}
        {hydrated && (
          <div
            style={{
              flexShrink: 0,
              borderRadius: "50%",
              boxShadow: profileHovered
                ? "0 0 0 0px rgba(10,132,255,0.35), 0 0 12px rgba(10,132,255,0.15)"
                : "0 0 0 0px transparent",
              transition: "box-shadow 250ms ease",
            }}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: {
                    width: 34,
                    height: 34,
                  },
                },
              }}
            />
          </div>
        )}

        {/* User info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {hydrated ? (user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "User") : "···"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 2,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#30d158",
                display: "inline-block",
                boxShadow: "0 0 6px rgba(48,209,88,0.5)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.30)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                letterSpacing: "0.04em",
              }}
            >
              {tSidebar("online")}
            </span>
          </div>
        </div>

        {/* Language switcher — compact */}
        <div style={{ flexShrink: 0, marginLeft: "auto" }}>
          <LanguageSwitcher variant="compact" />
        </div>
      </div>

      {/* ─── Footer — version + agent chat trigger ────────────────────── */}
      <div
        style={{
          padding: "10px 16px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.16)",
            fontFamily: "monospace",
            letterSpacing: "0.02em",
          }}
        >
          {CURRENT_VERSION} · Quantik
        </span>

        {/* Agent chat trigger */}
        <div className="relative group" style={{ position: "relative" }}>
          {/* Comic speech bubble — visible until first chat open */}
          {relayPulsing && myAgent && (
            <div
              className="speech-bubble-enter"
              style={{
                position: "absolute",
                bottom: "calc(100% + 14px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(10,132,255,0.15)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(10,132,255,0.35)",
                borderRadius: 12,
                padding: "8px 12px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.88)",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  letterSpacing: "0.02em",
                }}
              >
                {tSidebar("hey")} 💬
              </span>
              {/* Speech bubble tail */}
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  transform: "translateX(-50%) rotate(45deg)",
                  width: 10,
                  height: 10,
                  background: "rgba(10,132,255,0.15)",
                  borderRight: "1px solid rgba(10,132,255,0.35)",
                  borderBottom: "1px solid rgba(10,132,255,0.35)",
                }}
              />
            </div>
          )}
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
            aria-label={relayOpen ? `Close ${myAgent?.name ?? "Agent"} chat` : `Chat with ${myAgent?.name ?? "Agent"}`}
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
            {relayOpen ? "✕" : (myAgent?.avatar_emoji ?? "🤝")}
          </button>
          {/* Styled tooltip — hidden when speech bubble is showing */}
          {!(relayPulsing && myAgent) && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-mono text-white bg-zinc-800 border border-white/10 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {myAgent ? tSidebar("chatWith", { name: myAgent.name.toUpperCase() }) : tSidebar("chatDefault")}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [relayOpen, setRelayOpen] = useState(false);
  const relayHasBeenOpened = useLocalStorageFlag(RELAY_LS_KEY, false);
  const relayPulsing = !relayHasBeenOpened;

  const handleToggleRelay = useCallback(() => {
    setRelayOpen((prev) => !prev);
  }, []);

  // Listen for custom event to open agent chat from other pages
  useEffect(() => {
    const openChat = () => setRelayOpen(true);
    window.addEventListener("open-agent-chat", openChat);
    return () => window.removeEventListener("open-agent-chat", openChat);
  }, []);

  const handleRelayFirstOpen = useCallback(() => {
    setLocalStorageFlag(RELAY_LS_KEY, true);
  }, []);

  return (
    <>
      <AuthSync />
      <WalletSync />
      <WelcomeModal />

      {/* Animated gradient background */}
      <div className="crystal-bg" />

      {/* Left sidebar — agent chat button lives in its footer */}
      <Sidebar
        relayOpen={relayOpen}
        relayPulsing={relayPulsing}
        onToggleRelay={handleToggleRelay}
      />

      <RelayChatSidebar
        open={relayOpen}
        onToggle={handleToggleRelay}
        onFirstOpen={handleRelayFirstOpen}
      />

      <NotificationCenterPanel />

      {/* Toast notifications */}
      <ToastNotification />

      {/* Global panic mode floating action button */}
      <GlobalPanicButton />

      <BottomTabBar
        relayOpen={relayOpen}
        relayPulsing={relayPulsing}
        onToggleRelay={handleToggleRelay}
      />

      {/* Main content — offset by sidebar width */}
      <div
        className="md:ml-[220px] min-h-[100vh] flex flex-col relative z-10 pb-[68px] md:pb-0"
      >
        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: "20px 20px 40px",
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
