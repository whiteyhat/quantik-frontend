import { describe, expect, it } from "vitest";
import { buildByoOnboardingPrompt, formatByoTimeRemaining, isByoSessionReady } from "../../lib/byoImport";

describe("BYO onboarding helpers", () => {
  it("builds an OpenClaw prompt that includes the onboarding URL", () => {
    const prompt = buildByoOnboardingPrompt(" https://quantik.app/api/v1/agents/byo/claim/abc123 ");
    expect(prompt).toContain("https://quantik.app/api/v1/agents/byo/claim/abc123");
    expect(prompt).toContain("POST the agent identity payload back to the same URL");
    expect(prompt).toContain("Include the public OpenClaw agent_url");
  });

  it("formats countdown values and expired state", () => {
    const now = 1_700_000_000_000;
    expect(formatByoTimeRemaining(now + 65_000, now)).toBe("1:05");
    expect(formatByoTimeRemaining(now - 1, now)).toBe("Expired");
  });

  it("only marks claimed sessions as ready for activation", () => {
    expect(isByoSessionReady("pending_claim")).toBe(false);
    expect(isByoSessionReady("failed")).toBe(false);
    expect(isByoSessionReady("claimed")).toBe(true);
  });
});
