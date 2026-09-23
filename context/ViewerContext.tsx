"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAuthToken, setDemoMode } from "@/lib/api";
import { demoAgent } from "@/lib/demo/agent";
import {
  demoModeFor,
  resolveAccess,
  resolveViewerMode,
  viewerIdentityChanged,
  type ViewerIdentity,
  type ViewerState,
} from "@/lib/viewer";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";

type Access = { hasAgent: boolean; isOperator: boolean };

const LOADING = resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null });

// The viewer pages see is published only after its mode has been applied
// (demo flag, caches, store), so no page ever renders or fetches with a
// half-switched viewer. `generation` bumps on real identity changes and keys
// the page content, so pages remount exactly once per sign-in or sign-out.
const useAppliedViewer = create<{ viewer: ViewerState; generation: number }>(() => ({
  viewer: LOADING,
  generation: 0,
}));

export function useViewer(): ViewerState {
  return useAppliedViewer((s) => s.viewer);
}

/** Changes whenever the person looking changes; use it as a React key. */
export function useViewerGeneration(): number {
  return useAppliedViewer((s) => s.generation);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// One place decides who is looking, keeps the API token fresh, switches the
// API client between demo and real data, and wipes cached data on every switch.
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<{ userId: string; value: Access } | null>(null);
  const applied = useRef<ViewerIdentity>({ mode: "loading", userId: null });
  const agentRequest = useRef(0);

  // Token + access, re-run whenever the signed-in user changes
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      setAuthToken(null);
      return;
    }
    let active = true;
    const refreshToken = async () => {
      const token = await getToken().catch(() => null);
      if (active && token) setAuthToken(token);
    };
    const resolve = async () => {
      await refreshToken();
      const value = await resolveAccess({
        getAccess: api.getAccess,
        getMyAgentLive: api.getMyAgentLive,
        refreshToken,
        sleep,
      });
      if (active) setAccess({ userId, value });
    };
    void resolve();
    const iv = setInterval(() => void refreshToken(), 50_000); // Clerk JWTs last 60s
    const onAgentChanged = () => void resolve();
    window.addEventListener("quantik:agent-changed", onAgentChanged);
    return () => {
      active = false;
      clearInterval(iv);
      window.removeEventListener("quantik:agent-changed", onAgentChanged);
    };
  }, [isLoaded, isSignedIn, userId, getToken]);

  // Access fetched for a previous user never counts for the current one
  const viewer = useMemo(() => {
    const currentAccess = access && access.userId === userId ? access.value : null;
    return resolveViewerMode({ clerkLoaded: isLoaded, signedIn: !!isSignedIn, access: currentAccess });
  }, [isLoaded, isSignedIn, userId, access]);

  // Apply the mode, then publish it. Runs before any page's data effects.
  useLayoutEffect(() => {
    if (viewer.mode === "loading") return; // keep showing the last applied viewer
    const identity: ViewerIdentity = { mode: viewer.mode, userId: userId ?? null };
    const changed = viewerIdentityChanged(applied.current, identity);
    const store = useQuantikStore.getState();

    if (changed) {
      queryClient.clear();
      store.resetUserState();
      store.pipelineReset();
      useNotificationsStore.getState().reset();
    }
    setDemoMode(demoModeFor(viewer.mode));

    const request = ++agentRequest.current;
    if (viewer.isDemo) {
      store.setMyAgent(demoAgent() as MyAgent);
      store.setMyAgentLoading(false);
    } else {
      store.setMyAgentLoading(true);
      api
        .getMyAgent()
        .then((agent) => {
          // A later sign-out or account switch owns the store now
          if (request === agentRequest.current) {
            useQuantikStore.getState().setMyAgent((agent as unknown as MyAgent | null) ?? null);
          }
        })
        .finally(() => {
          if (request === agentRequest.current) useQuantikStore.getState().setMyAgentLoading(false);
        });
    }
    store.setAuthReady(true);

    applied.current = identity;
    useAppliedViewer.setState((s) => ({
      viewer,
      generation: changed ? s.generation + 1 : s.generation,
    }));
  }, [viewer, userId, queryClient]);

  // Writes refused by the demo adapter ask the guest to sign in
  useEffect(() => {
    const onRequired = () => {
      if (isSignedIn) return;
      clerk.openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
    };
    window.addEventListener("quantik:sign-in-required", onRequired);
    return () => window.removeEventListener("quantik:sign-in-required", onRequired);
  }, [clerk, isSignedIn]);

  return <>{children}</>;
}
