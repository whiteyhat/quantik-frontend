import type { DemoMode } from "@/lib/api";

// ─── Who is looking ───────────────────────────────────────────────────────────
// Pure decisions behind ViewerProvider and useSignInGate, kept free of React so
// they can be unit-tested.

export type ViewerMode = "loading" | "guest" | "member-no-agent" | "member";
export type GateNeeds = "agent" | "signIn";

export interface ViewerState {
  mode: ViewerMode;
  isSignedIn: boolean;
  /** A real agent of their own (never the demo agent). */
  hasAgent: boolean;
  isOperator: boolean;
  /** Personal pages show demo agent NOVA-7. */
  isDemo: boolean;
  /** May run real actions without being asked to sign in or build an agent. */
  canAct: boolean;
}

export function resolveViewerMode(input: {
  clerkLoaded: boolean;
  signedIn: boolean;
  access: { hasAgent: boolean; isOperator: boolean } | null;
}): ViewerState {
  if (!input.clerkLoaded) {
    return { mode: "loading", isSignedIn: false, hasAgent: false, isOperator: false, isDemo: false, canAct: false };
  }
  if (!input.signedIn) {
    return { mode: "guest", isSignedIn: false, hasAgent: false, isOperator: false, isDemo: true, canAct: false };
  }
  if (!input.access) {
    return { mode: "loading", isSignedIn: true, hasAgent: false, isOperator: false, isDemo: false, canAct: false };
  }
  const { hasAgent, isOperator } = input.access;
  return hasAgent
    ? { mode: "member", isSignedIn: true, hasAgent, isOperator, isDemo: false, canAct: true }
    : { mode: "member-no-agent", isSignedIn: true, hasAgent, isOperator, isDemo: true, canAct: false };
}

export function demoModeFor(mode: ViewerMode): DemoMode {
  if (mode === "guest") return "guest";
  if (mode === "member-no-agent") return "no-agent";
  return "off";
}

/** Cached personal data must be wiped whenever the resolved viewer changes. */
export function shouldResetOnTransition(prev: ViewerMode, next: ViewerMode): boolean {
  return prev !== "loading" && next !== "loading" && prev !== next;
}

export function decideGate(viewer: ViewerState, needs: GateNeeds): "run" | "sign-in" | "create-agent" | "wait" {
  if (viewer.mode === "loading") return "wait";
  if (!viewer.isSignedIn) return "sign-in";
  if (needs === "agent" && !viewer.hasAgent) return "create-agent";
  return "run";
}
