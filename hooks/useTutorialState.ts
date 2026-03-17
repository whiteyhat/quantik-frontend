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

export interface InitTutorialOptions {
  force?: boolean;
  initialPage?: TutorialPage;
  initialStep?: number;
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

const NULL_SNAPSHOT = "__tutorial_null__";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readSerializedState(): string {
  if (typeof window === "undefined") return NULL_SNAPSHOT;
  try {
    return window.localStorage.getItem(LS_KEY) ?? NULL_SNAPSHOT;
  } catch {
    return NULL_SNAPSHOT;
  }
}

function parseState(serialized: string): TutorialState | null {
  if (serialized === NULL_SNAPSHOT) return null;
  try {
    return JSON.parse(serialized) as TutorialState;
  } catch {
    return null;
  }
}

let cachedSerializedState = NULL_SNAPSHOT;
let cachedState: TutorialState | null = null;

function syncCache(serialized = readSerializedState()): string {
  if (serialized !== cachedSerializedState) {
    cachedSerializedState = serialized;
    cachedState = parseState(serialized);
  }
  return cachedSerializedState;
}

function readState(): TutorialState | null {
  return syncCache() === NULL_SNAPSHOT ? null : cachedState;
}

function writeState(state: TutorialState) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(state);
  cachedSerializedState = serialized;
  cachedState = state;
  window.localStorage.setItem(LS_KEY, serialized);
  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", { detail: { key: LS_KEY } })
  );
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent) || event.key === null || event.key === LS_KEY) {
      syncCache();
      onStoreChange();
    }
  };
  const handleCustom = (event: Event) => {
    if (!(event instanceof CustomEvent) || event.detail?.key === LS_KEY) {
      syncCache();
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

function getStoreSnapshot() {
  return syncCache();
}

function getServerStoreSnapshot() {
  return NULL_SNAPSHOT;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTutorialState() {
  const serializedState = useSyncExternalStore(
    subscribe,
    getStoreSnapshot,
    getServerStoreSnapshot
  );
  const state = serializedState === NULL_SNAPSHOT ? null : cachedState;

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

export function initTutorial(options: InitTutorialOptions = {}) {
  if (typeof window === "undefined") return;
  const { force = false, initialPage = DEFAULT_STATE.currentPage, initialStep = DEFAULT_STATE.currentStep } = options;
  if (!force && window.localStorage.getItem(LS_KEY)) return;
  writeState({
    ...DEFAULT_STATE,
    currentPage: initialPage,
    currentStep: initialStep,
    startedAt: Date.now(),
  });
}

// ─── Reset (called from settings to replay tutorial) ─────────────────────────

export function resetTutorial() {
  if (typeof window === "undefined") return;
  cachedSerializedState = NULL_SNAPSHOT;
  cachedState = null;
  window.localStorage.removeItem(LS_KEY);
  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", { detail: { key: LS_KEY } })
  );
}

export { PAGES_ORDER };
