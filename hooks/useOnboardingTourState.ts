"use client";

import { useSyncExternalStore } from "react";

export type OnboardingTourName = "factory-first-run" | "create-wizard" | "product-tour";

export interface OnboardingTourState {
  tourVersion: number;
  factoryTourCompleted: boolean;
  createWizardTourCompleted: boolean;
  productTourCompleted: boolean;
  resumeProductTourAfterDeploy: boolean;
}

const LS_KEY = "quantik_onboarding_tour_state";
const TOUR_VERSION = 1;
const NULL_SNAPSHOT = "__onboarding_tour_default__";

const DEFAULT_STATE: OnboardingTourState = {
  tourVersion: TOUR_VERSION,
  factoryTourCompleted: false,
  createWizardTourCompleted: false,
  productTourCompleted: false,
  resumeProductTourAfterDeploy: false,
};

let cachedSerializedState = NULL_SNAPSHOT;
let cachedState = DEFAULT_STATE;

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

function sanitizeState(raw: unknown): OnboardingTourState {
  if (!raw || typeof raw !== "object") return DEFAULT_STATE;

  const candidate = raw as Partial<OnboardingTourState>;
  if (candidate.tourVersion !== TOUR_VERSION) {
    return DEFAULT_STATE;
  }

  return {
    tourVersion: TOUR_VERSION,
    factoryTourCompleted: Boolean(candidate.factoryTourCompleted),
    createWizardTourCompleted: Boolean(candidate.createWizardTourCompleted),
    productTourCompleted: Boolean(candidate.productTourCompleted),
    resumeProductTourAfterDeploy: Boolean(candidate.resumeProductTourAfterDeploy),
  };
}

function parseSerializedState(serialized: string): OnboardingTourState {
  if (serialized === NULL_SNAPSHOT) return DEFAULT_STATE;

  try {
    return sanitizeState(JSON.parse(serialized));
  } catch {
    return DEFAULT_STATE;
  }
}

function readSerializedState() {
  if (typeof window === "undefined") return NULL_SNAPSHOT;
  return window.localStorage.getItem(LS_KEY) ?? NULL_SNAPSHOT;
}

function syncCache(serialized = readSerializedState()) {
  if (serialized !== cachedSerializedState) {
    cachedSerializedState = serialized;
    cachedState = parseSerializedState(serialized);
  }

  return cachedState;
}

function emitStateChange(state: OnboardingTourState | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", {
      detail: { key: LS_KEY, value: state },
    })
  );
}

function writeState(state: OnboardingTourState) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(state);
  cachedSerializedState = serialized;
  cachedState = state;
  window.localStorage.setItem(LS_KEY, serialized);
  emitStateChange(state);
}

function updateState(updater: (current: OnboardingTourState) => OnboardingTourState) {
  writeState(updater(syncCache()));
}

export function useOnboardingTourState() {
  return useSyncExternalStore(subscribe, syncCache, () => DEFAULT_STATE);
}

export function getOnboardingTourState() {
  return syncCache();
}

export function completeFactoryTour() {
  updateState((current) => ({
    ...current,
    factoryTourCompleted: true,
  }));
}

export function completeCreateWizardTour() {
  updateState((current) => ({
    ...current,
    createWizardTourCompleted: true,
  }));
}

export function completeProductTour() {
  updateState((current) => ({
    ...current,
    productTourCompleted: true,
    resumeProductTourAfterDeploy: false,
  }));
}

export function requestProductTourResume() {
  updateState((current) => ({
    ...current,
    resumeProductTourAfterDeploy: true,
  }));
}

export function clearProductTourResume() {
  updateState((current) => ({
    ...current,
    resumeProductTourAfterDeploy: false,
  }));
}

export function resetOnboardingTourState(options: { resumeProductTourAfterDeploy?: boolean } = {}) {
  writeState({
    ...DEFAULT_STATE,
    resumeProductTourAfterDeploy: Boolean(options.resumeProductTourAfterDeploy),
  });
}
