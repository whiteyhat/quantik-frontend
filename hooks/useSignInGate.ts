"use client";

import { useCallback } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { useViewer } from "@/context/ViewerContext";
import { decideGate, type GateNeeds } from "@/lib/viewer";

/**
 * Wraps a real action. Guests get the Clerk sign-in popup (and come back to
 * this page); members without an agent go to Agent Factory for agent actions.
 * The action never runs automatically after sign-in.
 */
export function useSignInGate() {
  const viewer = useViewer();
  const clerk = useClerk();
  const router = useRouter();

  return useCallback(
    (action: () => void | Promise<unknown>, opts?: { needs?: GateNeeds }) => {
      switch (decideGate(viewer, opts?.needs ?? "agent")) {
        case "run":
          void action();
          return;
        case "sign-in":
          clerk.openSignIn({ forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
          return;
        case "create-agent":
          router.push("/agent-factory");
          return;
        case "wait":
          return;
      }
    },
    [viewer, clerk, router],
  );
}
