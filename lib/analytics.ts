import posthog from "posthog-js";

/**
 * Track a custom event. Respects DNT and SSR safety.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (navigator.doNotTrack === "1") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.capture(name, properties);
}
