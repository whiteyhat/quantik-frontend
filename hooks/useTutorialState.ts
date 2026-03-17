"use client";

import { useSyncExternalStore, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TutorialPage = "agent-factory" | "manage-agent" | "dashboard" | "arena";

export interface TutorialState {
  status: "active" | "completed" | "skipped";
  currentPage: TutorialPage;
  currentStep: number;
  startedAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = "quantik_tutorial";

const PAGES_ORDER: TutorialPage[] = ["agent-factory", "manage-agent", "dashboard", "arena"];

const DEFAULT_STATE: TutorialState = {
  status: "active",
  currentPage: "agent-factory",
  currentStep: 0,
  startedAt: Date.now(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readState(): TutorialState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TutorialState;
  } catch {
    return null;
  }
}

function writeState(state: TutorialState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", { detail: { key: LS_KEY } })
  );
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent) || event.key === null || event.key === LS_KEY) {
      onStoreChange();
    }
  };
  const handleCustom = (event: Event) => {
    if (!(event instanceof CustomEvent) || event.detail?.key === LS_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("local-storage-flag-change", handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("local-storage-flag-change", handleCustom);
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTutorialState() {
  const state = useSyncExternalStore(
    subscribe,
    () => readState(),
    () => null
  );

  const nextStep = useCallback((totalStepsOnPage: number) => {
    const s = readState();
    if (!s || s.status !== "active") return null;

    if (s.currentStep < totalStepsOnPage - 1) {
      writeState({ ...s, currentStep: s.currentStep + 1 });
      return { action: "next-step" as const };
    }

    // Move to next page
    const pageIdx = PAGES_ORDER.indexOf(s.currentPage);
    if (pageIdx < PAGES_ORDER.length - 1) {
      const nextPage = PAGES_ORDER[pageIdx + 1];
      writeState({ ...s, currentPage: nextPage, currentStep: 0 });
      return { action: "next-page" as const, page: nextPage };
    }

    // Tutorial complete
    writeState({ ...s, status: "completed" });
    return { action: "complete" as const };
  }, []);

  const prevStep = useCallback(() => {
    const s = readState();
    if (!s || s.status !== "active" || s.currentStep <= 0) return;
    writeState({ ...s, currentStep: s.currentStep - 1 });
  }, []);

  const skipTutorial = useCallback(() => {
    const s = readState();
    if (!s) return;
    writeState({ ...s, status: "skipped" });
  }, []);

  const completeTutorial = useCallback(() => {
    const s = readState();
    if (!s) return;
    writeState({ ...s, status: "completed" });
  }, []);

  return {
    state,
    isActive: state?.status === "active",
    currentPage: state?.currentPage ?? null,
    currentStep: state?.currentStep ?? 0,
    pageIndex: state ? PAGES_ORDER.indexOf(state.currentPage) : -1,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  };
}

// ─── Init (called from agent factory) ────────────────────────────────────────

export function initTutorial() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(LS_KEY)) return; // don't re-init
  writeState({ ...DEFAULT_STATE, startedAt: Date.now() });
}

// ─── Reset (called from settings to replay tutorial) ─────────────────────────

export function resetTutorial() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", { detail: { key: LS_KEY } })
  );
}

export { PAGES_ORDER };
