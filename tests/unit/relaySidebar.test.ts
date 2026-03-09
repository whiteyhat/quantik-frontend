import { describe, expect, it } from "vitest";
import {
  extractLatestSignalTimestamp,
  getRelaySidebarLastSeenSignalAt,
  getRelaySidebarSessionId,
  parseRelaySidebarEvent,
  setRelaySidebarLastSeenSignalAt,
} from "../../lib/relaySidebar";

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("relay sidebar helpers", () => {
  it("parses trace, context, token, and done events", () => {
    expect(parseRelaySidebarEvent('{"type":"trace","key":"signal_scout","label":"Signal Scout","status":"Checking cache","state":"running"}')).toEqual({
      type: "trace",
      key: "signal_scout",
      label: "Signal Scout",
      status: "Checking cache",
      state: "running",
      detail: undefined,
    });

    expect(parseRelaySidebarEvent('{"type":"context","kind":"scanner","data":{"count":2}}')).toEqual({
      type: "context",
      kind: "scanner",
      data: { count: 2 },
    });

    expect(parseRelaySidebarEvent('{"type":"token","token":"Hello"}')).toEqual({
      type: "token",
      token: "Hello",
    });

    expect(parseRelaySidebarEvent('{"type":"done","reply":"Complete","latencyMs":123,"model":"gemini","suggestions":["Show positions"],"contexts":{"scanner":{"count":1}}}')).toEqual({
      type: "done",
      reply: "Complete",
      latencyMs: 123,
      model: "gemini",
      suggestions: ["Show positions"],
      contexts: { scanner: { count: 1 } },
      agentName: undefined,
      agentEmoji: null,
    });
  });

  it("persists session id and last seen signal timestamp", () => {
    const storage = new MemoryStorage();

    const firstSessionId = getRelaySidebarSessionId(storage);
    const secondSessionId = getRelaySidebarSessionId(storage);

    expect(firstSessionId).toBe(secondSessionId);

    setRelaySidebarLastSeenSignalAt(storage, 1_741_405_600_000);
    expect(getRelaySidebarLastSeenSignalAt(storage)).toBe(1_741_405_600_000);
  });

  it("extracts the latest signal timestamp from scanner contexts", () => {
    const latest = extractLatestSignalTimestamp({
      lastScannedAt: 100,
      signals: [
        { scannedAt: 50 },
        { scannedAt: 200 },
        { scannedAt: 150 },
      ],
    });

    expect(latest).toBe(200);
  });
});
