"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "quantik_followed_agents";

function getSnapshot(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch {
    // ignore
  }
  return new Set();
}

function getServerSnapshot(): Set<string> {
  return new Set();
}

let cachedSnapshot = getSnapshot();
let cachedSerialized = "";

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  // Also listen for cross-tab changes
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedSnapshot = getSnapshot();
      cachedSerialized = JSON.stringify([...cachedSnapshot]);
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitChange() {
  for (const listener of listeners) listener();
}

function getStoreSnapshot(): string {
  const next = JSON.stringify([...getSnapshot()]);
  if (next !== cachedSerialized) {
    cachedSerialized = next;
    cachedSnapshot = getSnapshot();
  }
  return cachedSerialized;
}

function getServerStoreSnapshot(): string {
  return "[]";
}

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage full or unavailable
  }
  cachedSnapshot = new Set(ids);
  cachedSerialized = JSON.stringify([...ids]);
  emitChange();
}

export function useFollowedAgents() {
  const serialized = useSyncExternalStore(subscribe, getStoreSnapshot, getServerStoreSnapshot);
  const followed: Set<string> = typeof window === "undefined" ? getServerSnapshot() : cachedSnapshot;

  const isFollowing = useCallback(
    (agentId: string) => followed.has(agentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serialized],
  );

  const toggle = useCallback((agentId: string) => {
    const current = getSnapshot();
    if (current.has(agentId)) {
      current.delete(agentId);
    } else {
      current.add(agentId);
    }
    persist(current);
  }, []);

  const clear = useCallback(() => {
    persist(new Set());
  }, []);

  return { followed, isFollowing, toggle, clear };
}
