"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAuthToken, setDemoMode } from "@/lib/api";
import { demoAgent } from "@/lib/demo/agent";
import { demoModeFor, resolveViewerMode, shouldResetOnTransition, type ViewerState } from "@/lib/viewer";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";

type Access = { hasAgent: boolean; isOperator: boolean };

const LOADING = resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null });
const ViewerContext = createContext<ViewerState>(LOADING);

export function useViewer(): ViewerState {
  return useContext(ViewerContext);
}

// One place decides who is looking, keeps the API token fresh, switches the
// API client between demo and real data, and wipes cached data on every switch.
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<{ userId: string; value: Access } | null>(null);
  const prevMode = useRef(LOADING.mode);

  // Access fetched for a previous user never counts for the current one
  const viewer = useMemo(() => {
    const currentAccess = access && access.userId === userId ? access.value : null;
    return resolveViewerMode({ clerkLoaded: isLoaded, signedIn: !!isSignedIn, access: currentAccess });
  }, [isLoaded, isSignedIn, userId, access]);

  // Token + access, re-run whenever the signed-in user changes
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      setAuthToken(null);
      return;
    }
    let active = true;
    const refresh = async (initial: boolean) => {
      const token = await getToken().catch(() => null);
      if (!active) return;
      if (token) setAuthToken(token);
      if (initial) {
        const a = await api.getAccess();
        if (active) setAccess({ userId, value: { hasAgent: a.hasAgent, isOperator: a.isOperator } });
      }
    };
    void refresh(true);
    const iv = setInterval(() => void refresh(false), 50_000); // Clerk JWTs last 60s
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [isLoaded, isSignedIn, userId, getToken]);

  // Agent Factory and BYO fire this after a deploy or delete
  useEffect(() => {
    const onAgentChanged = () => {
      if (!isSignedIn || !userId) return;
      void api.getAccess().then((a) => setAccess({ userId, value: { hasAgent: a.hasAgent, isOperator: a.isOperator } }));
    };
    window.addEventListener("quantik:agent-changed", onAgentChanged);
    return () => window.removeEventListener("quantik:agent-changed", onAgentChanged);
  }, [isSignedIn, userId]);

  // Apply the mode in a layout effect: it runs before any page's data-loading
  // effects, so personal reads never hit the live API with the wrong mode.
  useLayoutEffect(() => {
    const next = viewer;
    if (next.mode === "loading") return;
    const store = useQuantikStore.getState();
    if (shouldResetOnTransition(prevMode.current, next.mode)) {
      queryClient.clear();
      store.resetUserState();
      store.pipelineReset();
      useNotificationsStore.getState().reset();
    }
    setDemoMode(demoModeFor(next.mode));
    if (next.isDemo) {
      store.setMyAgent(demoAgent() as MyAgent);
      store.setMyAgentLoading(false);
    } else {
      store.setMyAgentLoading(true);
      api
        .getMyAgent()
        .then((agent) => useQuantikStore.getState().setMyAgent((agent as unknown as MyAgent | null) ?? null))
        .finally(() => useQuantikStore.getState().setMyAgentLoading(false));
    }
    store.setAuthReady(true);
    prevMode.current = next.mode;
  }, [viewer, queryClient]);

  // Writes refused by the demo adapter ask the guest to sign in
  useEffect(() => {
    const onRequired = () => {
      if (isSignedIn) return;
      clerk.openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
    };
    window.addEventListener("quantik:sign-in-required", onRequired);
    return () => window.removeEventListener("quantik:sign-in-required", onRequired);
  }, [clerk, isSignedIn]);

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}
