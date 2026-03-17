import { afterEach, describe, expect, it, vi } from "vitest";
import { initTutorial, resetTutorial } from "../../hooks/useTutorialState";

function createWindowMock() {
  const storage = new Map<string, string>();

  return {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    dispatchEvent: vi.fn(),
  } as unknown as Window;
}

describe("tutorial state bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not overwrite an existing tutorial state unless forced", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    initTutorial({ initialPage: "manage-agent", initialStep: 1 });
    initTutorial({ initialPage: "arena", initialStep: 2 });

    expect(windowMock.localStorage.getItem("quantik_tutorial")).toContain('"currentPage":"manage-agent"');
    expect(windowMock.localStorage.getItem("quantik_tutorial")).toContain('"currentStep":1');
  });

  it("can force a fresh tutorial start on the factory page", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    initTutorial({ initialPage: "manage-agent", initialStep: 1 });
    initTutorial({ force: true, initialPage: "agent-factory", initialStep: 0 });

    expect(windowMock.localStorage.getItem("quantik_tutorial")).toContain('"currentPage":"agent-factory"');
    expect(windowMock.localStorage.getItem("quantik_tutorial")).toContain('"currentStep":0');
  });

  it("clears the stored tutorial state on reset", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    initTutorial({ initialPage: "agent-factory", initialStep: 0 });
    resetTutorial();

    expect(windowMock.localStorage.getItem("quantik_tutorial")).toBeNull();
  });
});
