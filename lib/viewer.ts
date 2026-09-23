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

export interface ViewerIdentity {
  mode: ViewerMode;
  userId: string | null;
}

/**
 * Personal data is wiped (and pages remount) when the resolved viewer changes:
 * sign-in, sign-out, a first agent, or switching accounts. The first
 * resolution out of "loading" is not a change: nothing personal loaded yet.
 */
export function viewerIdentityChanged(prev: ViewerIdentity, next: ViewerIdentity): boolean {
  if (prev.mode === "loading" || next.mode === "loading") return false;
  return prev.mode !== next.mode || prev.userId !== next.userId;
}

type AccessAnswer = { signedIn: boolean; hasAgent: boolean; isOperator: boolean } | null;
const ACCESS_ATTEMPTS = 3;

/**
 * Decide hasAgent/isOperator for a signed-in member. A failed or confused
 * check never means "no agent": that would unlock Agent Factory, and creating
 * an agent replaces the existing one. Retries, then asks /agent/me directly,
 * and if nothing answers assumes a real agent exists (the safe side).
 */
export async function resolveAccess(deps: {
  getAccess: () => Promise<AccessAnswer>;
  getMyAgentLive: () => Promise<Record<string, unknown> | null | undefined>;
  refreshToken: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
}): Promise<{ hasAgent: boolean; isOperator: boolean }> {
  for (let attempt = 0; attempt < ACCESS_ATTEMPTS; attempt++) {
    const answer = await deps.getAccess();
    // signedIn:false while Clerk says signed in = the token didn't reach the server yet
    if (answer?.signedIn) return { hasAgent: answer.hasAgent, isOperator: answer.isOperator };
    if (attempt < ACCESS_ATTEMPTS - 1) {
      await deps.sleep(400 * 2 ** attempt);
      await deps.refreshToken();
    }
  }
  const agent = await deps.getMyAgentLive();
  if (agent === undefined) return { hasAgent: true, isOperator: false };
  return { hasAgent: agent !== null, isOperator: false };
}

export function decideGate(viewer: ViewerState, needs: GateNeeds): "run" | "sign-in" | "create-agent" | "wait" {
  if (viewer.mode === "loading") return "wait";
  if (!viewer.isSignedIn) return "sign-in";
  if (needs === "agent" && !viewer.hasAgent) return "create-agent";
  return "run";
}
