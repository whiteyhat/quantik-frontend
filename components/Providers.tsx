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
          userButtonPopoverFooter: { display: "none" },
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
