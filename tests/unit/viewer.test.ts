import { describe, expect, it } from "vitest";
import { decideGate, demoModeFor, resolveViewerMode } from "@/lib/viewer";

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

import { resolveAccess, viewerIdentityChanged } from "@/lib/viewer";

const noSleep = async () => {};

describe("resolveAccess", () => {
  it("uses the access check when it answers for a signed-in user", async () => {
    const access = await resolveAccess({
      getAccess: async () => ({ signedIn: true, hasAgent: true, isOperator: true }),
      getMyAgentLive: async () => { throw new Error("should not be called"); },
      refreshToken: async () => {},
      sleep: noSleep,
    });
    expect(access).toEqual({ hasAgent: true, isOperator: true });
  });

  it("retries when the check fails or can't see the session yet", async () => {
    const answers = [null, { signedIn: false, hasAgent: false, isOperator: false }, { signedIn: true, hasAgent: false, isOperator: false }];
    let refreshes = 0;
    const access = await resolveAccess({
      getAccess: async () => answers.shift() ?? null,
      getMyAgentLive: async () => { throw new Error("should not be called"); },
      refreshToken: async () => { refreshes += 1; },
      sleep: noSleep,
    });
    expect(access).toEqual({ hasAgent: false, isOperator: false });
    expect(refreshes).toBe(2);
  });

  it("falls back to the agent lookup when the check keeps failing", async () => {
    const withAgent = await resolveAccess({
      getAccess: async () => null,
      getMyAgentLive: async () => ({ id: "real-agent" }),
      refreshToken: async () => {},
      sleep: noSleep,
    });
    expect(withAgent).toEqual({ hasAgent: true, isOperator: false });

    const withoutAgent = await resolveAccess({
      getAccess: async () => null,
      getMyAgentLive: async () => null,
      refreshToken: async () => {},
      sleep: noSleep,
    });
    expect(withoutAgent).toEqual({ hasAgent: false, isOperator: false });
  });

  it("assumes a real agent exists when nothing answers, so Agent Factory stays locked", async () => {
    const access = await resolveAccess({
      getAccess: async () => null,
      getMyAgentLive: async () => undefined,
      refreshToken: async () => {},
      sleep: noSleep,
    });
    expect(access).toEqual({ hasAgent: true, isOperator: false });
  });
});

describe("viewerIdentityChanged", () => {
  it("ignores the first resolution out of loading", () => {
    expect(viewerIdentityChanged({ mode: "loading", userId: null }, { mode: "guest", userId: null })).toBe(false);
  });
  it("detects sign-in, sign-out and a first agent", () => {
    expect(viewerIdentityChanged({ mode: "guest", userId: null }, { mode: "member", userId: "u1" })).toBe(true);
    expect(viewerIdentityChanged({ mode: "member", userId: "u1" }, { mode: "guest", userId: null })).toBe(true);
    expect(viewerIdentityChanged({ mode: "member-no-agent", userId: "u1" }, { mode: "member", userId: "u1" })).toBe(true);
  });
  it("detects switching accounts without leaving member mode", () => {
    expect(viewerIdentityChanged({ mode: "member", userId: "u1" }, { mode: "member", userId: "u2" })).toBe(true);
  });
  it("ignores repeats", () => {
    expect(viewerIdentityChanged({ mode: "member", userId: "u1" }, { mode: "member", userId: "u1" })).toBe(false);
  });
});
