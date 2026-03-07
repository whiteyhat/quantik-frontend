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
          colorPrimary: "#ffffff",
          colorBackground: "#0e0e18",
          colorInputBackground: "rgba(255,255,255,0.08)",
          colorInputText: "rgba(255,255,255,0.92)",
          colorText: "rgba(255,255,255,0.92)",
          colorTextSecondary: "rgba(255,255,255,0.85)",
          colorTextOnPrimaryBackground: "#000000",
          borderRadius: "12px",
          fontFamily: "'General Sans', sans-serif",
        },
        elements: {
          rootBox: {
            fontFamily: "'General Sans', sans-serif",
          },
          card: {
            background: "#131320",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          },
          headerTitle: {
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
          },
          headerSubtitle: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.85)",
          },
          socialButtonsBlockButton: {
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            color: "rgba(255,255,255,0.90)",
            fontFamily: "'General Sans', sans-serif",
            "&:hover": {
              background: "rgba(255,255,255,0.14)",
            },
          },
          formButtonPrimary: {
            background: "#ffffff",
            color: "#000000",
            borderRadius: "9999px",
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            border: "0.6px solid rgba(255,255,255,0.6)",
            boxShadow: "none",
            "&:hover": {
              background: "rgba(255,255,255,0.90)",
            },
          },
          formFieldInput: {
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            color: "rgba(255,255,255,0.92)",
            fontFamily: "'General Sans', sans-serif",
            "&:focus": {
              borderColor: "rgba(255,255,255,0.30)",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.08)",
            },
          },
          formFieldLabel: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.85)",
            fontSize: "13px",
          },
          footerActionLink: {
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'General Sans', sans-serif",
            "&:hover": {
              color: "#ffffff",
            },
          },
          footerActionText: {
            color: "rgba(255,255,255,0.80)",
            fontFamily: "'General Sans', sans-serif",
          },
          identityPreview: {
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "10px",
          },
          userButtonPopoverCard: {
            background: "#131320",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(40px)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
          userButtonPopoverActionButton: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.80)",
            "&:hover": {
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
            },
          },
          userPreviewMainIdentifier: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.92)",
          },
          userPreviewSecondaryIdentifier: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.85)",
          },
          modalBackdrop: {
            background: "rgba(0,0,0,0.70)",
            backdropFilter: "blur(8px)",
          },
          modalContent: {
            borderRadius: "16px",
          },
          // ─── UserProfile / "Manage account" modal ───
          navbar: {
            background: "rgba(255,255,255,0.03)",
            borderRight: "1px solid rgba(255,255,255,0.10)",
          },
          navbarButton: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.70)",
            "&:hover": {
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
            },
            "&[data-active='true']": {
              color: "#ffffff",
              background: "rgba(255,255,255,0.10)",
            },
          },
          page: {
            background: "transparent",
          },
          pageScrollBox: {
            background: "transparent",
          },
          profileSection: {
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          },
          profileSectionTitleText: {
            fontFamily: "'General Sans', sans-serif",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 600,
          },
          profileSectionContent: {
            color: "rgba(255,255,255,0.80)",
          },
          profileSectionPrimaryButton: {
            color: "rgba(255,255,255,0.80)",
            "&:hover": {
              background: "rgba(255,255,255,0.06)",
              color: "#ffffff",
            },
          },
          accordionTriggerButton: {
            color: "rgba(255,255,255,0.80)",
            "&:hover": {
              background: "rgba(255,255,255,0.04)",
            },
          },
          accordionContent: {
            background: "transparent",
            color: "rgba(255,255,255,0.80)",
          },
          formFieldSuccessText: {
            color: "#30D158",
          },
          badge: {
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.12)",
          },
          menuButton: {
            color: "rgba(255,255,255,0.80)",
            "&:hover": {
              background: "rgba(255,255,255,0.06)",
              color: "#ffffff",
            },
          },
          menuList: {
            background: "#131320",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(40px)",
          },
          menuItem: {
            color: "rgba(255,255,255,0.80)",
            "&:hover": {
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
            },
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
