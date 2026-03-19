import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearProductTourResume,
  completeCreateWizardTour,
  completeFactoryTour,
  completeProductTour,
  getOnboardingTourState,
  requestProductTourResume,
  resetOnboardingTourState,
} from "../../hooks/useOnboardingTourState";

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

describe("onboarding tour state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks the factory tour as completed so it does not auto-start again", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    resetOnboardingTourState();
    completeFactoryTour();

    expect(getOnboardingTourState().factoryTourCompleted).toBe(true);
    expect(getOnboardingTourState().productTourCompleted).toBe(false);
  });

  it("sets the pending product-tour continuation flag after deploy", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    resetOnboardingTourState();
    requestProductTourResume();

    expect(getOnboardingTourState().resumeProductTourAfterDeploy).toBe(true);
  });

  it("clears the pending continuation flag once the manage-agent resume starts", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    resetOnboardingTourState();
    requestProductTourResume();
    clearProductTourResume();

    expect(getOnboardingTourState().resumeProductTourAfterDeploy).toBe(false);
  });

  it("resets the tour flags for restart while optionally preserving a staged resume", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    completeFactoryTour();
    completeProductTour();
    resetOnboardingTourState({ resumeProductTourAfterDeploy: true });

    expect(getOnboardingTourState()).toEqual({
      tourVersion: 1,
      factoryTourCompleted: false,
      createWizardTourCompleted: false,
      productTourCompleted: false,
      resumeProductTourAfterDeploy: true,
    });
  });

  it("marks the create-wizard tour as completed", () => {
    const windowMock = createWindowMock();
    vi.stubGlobal("window", windowMock);

    resetOnboardingTourState();
    completeCreateWizardTour();

    expect(getOnboardingTourState().createWizardTourCompleted).toBe(true);
    expect(getOnboardingTourState().factoryTourCompleted).toBe(false);
  });
});

