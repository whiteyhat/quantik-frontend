"use client";

import { useSyncExternalStore } from "react";

function subscribeToFlag(key: string, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent) || event.key === null || event.key === key) {
      onStoreChange();
    }
  };

  const handleCustom = (event: Event) => {
    if (!(event instanceof CustomEvent) || event.detail?.key === key) {
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

export function setLocalStorageFlag(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "true" : "false");
  window.dispatchEvent(
    new CustomEvent("local-storage-flag-change", {
      detail: { key, value },
    })
  );
}

export function useLocalStorageFlag(key: string, fallback = false) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToFlag(key, onStoreChange),
    () => {
      if (typeof window === "undefined") return fallback;
      return window.localStorage.getItem(key) === "true";
    },
    () => fallback
  );
}
