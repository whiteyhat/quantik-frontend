export type ByoOnboardingStatus = "pending_claim" | "claimed" | "expired" | "failed" | "cancelled";

export function buildByoOnboardingPrompt(onboardingUrl: string): string {
  const url = onboardingUrl.trim();
  return [
    "Open this Quantik onboarding URL and complete the claim flow for this agent.",
    "Read the handshake document from the URL, then POST the agent identity payload back to the same URL.",
    "Store the returned Quantik credentials and heartbeat endpoint for ongoing runtime use.",
    "",
    url,
  ].join("\n");
}

export function formatByoTimeRemaining(expiresAt: number, now = Date.now()): string {
  const remainingMs = Math.max(0, expiresAt - now);
  if (remainingMs === 0) return "Expired";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function isByoSessionReady(status: ByoOnboardingStatus | null): boolean {
  return status === "claimed";
}
