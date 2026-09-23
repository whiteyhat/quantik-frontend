import { describe, expect, it } from "vitest";
import { decideGate, demoModeFor, resolveViewerMode, shouldResetOnTransition } from "@/lib/viewer";

const member = { hasAgent: true, isOperator: false };
const noAgent = { hasAgent: false, isOperator: false };

describe("resolveViewerMode", () => {
  it("waits for Clerk", () => {
    expect(resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null }).mode).toBe("loading");
  });
  it("treats signed-out visitors as guests", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: false, access: null });
    expect(v).toMatchObject({ mode: "guest", isDemo: true, canAct: false, isOperator: false });
  });
  it("waits for access before deciding a signed-in member", () => {
    expect(resolveViewerMode({ clerkLoaded: true, signedIn: true, access: null }).mode).toBe("loading");
  });
  it("shows members without an agent the demo", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: noAgent });
    expect(v).toMatchObject({ mode: "member-no-agent", isDemo: true, canAct: false, isSignedIn: true, hasAgent: false });
  });
  it("gives members with an agent the real app", () => {
    const v = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: { ...member, isOperator: true } });
    expect(v).toMatchObject({ mode: "member", isDemo: false, canAct: true, isOperator: true });
  });
});

describe("demoModeFor", () => {
  it("maps viewer modes to adapter modes", () => {
    expect(demoModeFor("guest")).toBe("guest");
    expect(demoModeFor("member-no-agent")).toBe("no-agent");
    expect(demoModeFor("member")).toBe("off");
    expect(demoModeFor("loading")).toBe("off");
  });
});

describe("shouldResetOnTransition", () => {
  it("resets when a guest signs in or a member signs out", () => {
    expect(shouldResetOnTransition("guest", "member")).toBe(true);
    expect(shouldResetOnTransition("member", "guest")).toBe(true);
    expect(shouldResetOnTransition("member-no-agent", "member")).toBe(true);
  });
  it("ignores the first resolution and repeats", () => {
    expect(shouldResetOnTransition("loading", "guest")).toBe(false);
    expect(shouldResetOnTransition("guest", "guest")).toBe(false);
  });
});

describe("decideGate", () => {
  const guest = resolveViewerMode({ clerkLoaded: true, signedIn: false, access: null });
  const noAgentMember = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: noAgent });
  const fullMember = resolveViewerMode({ clerkLoaded: true, signedIn: true, access: member });
  it("asks guests to sign in", () => {
    expect(decideGate(guest, "agent")).toBe("sign-in");
    expect(decideGate(guest, "signIn")).toBe("sign-in");
  });
  it("sends members without an agent to the factory only for agent actions", () => {
    expect(decideGate(noAgentMember, "agent")).toBe("create-agent");
    expect(decideGate(noAgentMember, "signIn")).toBe("run");
  });
  it("runs for members with an agent", () => {
    expect(decideGate(fullMember, "agent")).toBe("run");
  });
  it("does nothing while loading", () => {
    expect(decideGate(resolveViewerMode({ clerkLoaded: false, signedIn: false, access: null }), "agent")).toBe("wait");
  });
});
