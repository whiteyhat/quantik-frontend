"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PaperModeProvider } from "@/context/PaperModeContext";
import { SocketProvider } from "@/context/SocketContext";
import { useTradeNotifications } from "@/hooks/useTradeNotifications";

function NotificationInit() {
  useTradeNotifications();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#0a84ff",
          borderRadius: "12px",
          fontFamily: "'General Sans', sans-serif",
        },
        elements: {
          userButtonPopoverCard: {
            background: "rgba(10, 12, 20, 0.75)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255,255,255,0.04)",
          },
          userButtonPopoverFooter: { display: "none" },
          // Manage Account modal
          modalBackdrop: {
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          },
          card: {
            background: "rgba(10, 12, 20, 0.80)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255,255,255,0.04)",
          },
          navbar: {
            background: "rgba(255, 255, 255, 0.03)",
            borderRight: "1px solid rgba(255, 255, 255, 0.07)",
          },
          navbarButton: {
            color: "rgba(255, 255, 255, 0.65)",
          },
          pageScrollBox: {
            background: "transparent",
          },
          profileSectionPrimaryButton: {
            color: "rgba(255, 255, 255, 0.85)",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <NotificationInit />
          <PaperModeProvider>{children}</PaperModeProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
