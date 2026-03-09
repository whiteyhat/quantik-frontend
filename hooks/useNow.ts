"use client";

import { useSyncExternalStore } from "react";

interface ClockStore {
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
}

const clockStores = new Map<number, ClockStore>();

function createClockStore(intervalMs: number): ClockStore {
  let current = typeof window === "undefined" ? 0 : Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  const start = () => {
    if (timer !== null || typeof window === "undefined") return;
    timer = setInterval(() => {
      current = Date.now();
      for (const listener of listeners) listener();
    }, intervalMs);
  };

  const stop = () => {
    if (timer === null || listeners.size > 0) return;
    clearInterval(timer);
    timer = null;
  };

  return {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        current = Date.now();
        start();
      }

      return () => {
        listeners.delete(listener);
        stop();
      };
    },
  };
}

function getClockStore(intervalMs: number) {
  const existing = clockStores.get(intervalMs);
  if (existing) return existing;

  const store = createClockStore(intervalMs);
  clockStores.set(intervalMs, store);
  return store;
}

export function useNow(intervalMs = 5_000) {
  const store = getClockStore(intervalMs);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
}
