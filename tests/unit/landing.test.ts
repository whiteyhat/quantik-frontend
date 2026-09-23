import { describe, expect, it, vi } from "vitest";
import { activeSectionIndex, sectionScrollTop, type SectionBox } from "@/lib/landingSections";
import { supportsWebGL } from "@/lib/webgl";
import { fmtCount } from "@/lib/formatters";

// Section boxes measured on /en at 1440x900 (hero, how-it-works, inside,
// social-proof, faq, cta). The stats band is short (285px) and sits right
// above the FAQ, which is what the old progress-based dot maths got wrong.
const VIEWPORT = 900;
const DOCUMENT = 4554;
const LAYOUT: SectionBox[] = [
  { top: 0, height: 900 },
  { top: 900, height: 587 },
  { top: 1487, height: 1607 },
  { top: 3094, height: 285 },
  { top: 3379, height: 614 },
  { top: 3992, height: 502 },
];

function centered(section: SectionBox) {
  return section.top + section.height / 2 - VIEWPORT / 2;
}

describe("activeSectionIndex", () => {
  it("lights the hero at the top of the page", () => {
    expect(activeSectionIndex(LAYOUT, 0, VIEWPORT, DOCUMENT)).toBe(0);
  });

  it("lights the section in the middle of the screen, whatever its height", () => {
    // The old floor(progress × 6) lit 'hero' for how-it-works, 'how-it-works'
    // for inside and 'social-proof' for faq.
    LAYOUT.slice(0, 5).forEach((section, index) => {
      expect(activeSectionIndex(LAYOUT, centered(section), VIEWPORT, DOCUMENT)).toBe(index);
    });
  });

  it("lights the last section once the page cannot scroll further", () => {
    expect(activeSectionIndex(LAYOUT, DOCUMENT - VIEWPORT, VIEWPORT, DOCUMENT)).toBe(5);
  });

  it("falls back to the first dot when nothing is measured", () => {
    expect(activeSectionIndex([], 1200, VIEWPORT, DOCUMENT)).toBe(0);
  });
});

describe("sectionScrollTop", () => {
  it("aligns tall sections to the top of the screen", () => {
    expect(sectionScrollTop(LAYOUT[1], VIEWPORT, DOCUMENT)).toBe(900);
    expect(sectionScrollTop(LAYOUT[4], VIEWPORT, DOCUMENT)).toBe(3379);
  });

  it("centres short sections so they are the one in the middle of the screen", () => {
    expect(sectionScrollTop(LAYOUT[3], VIEWPORT, DOCUMENT)).toBe(centered(LAYOUT[3]));
  });

  it("never asks for a scroll position past the ends of the page", () => {
    expect(sectionScrollTop(LAYOUT[5], VIEWPORT, DOCUMENT)).toBe(DOCUMENT - VIEWPORT);
    expect(sectionScrollTop({ top: 20, height: 100 }, VIEWPORT, DOCUMENT)).toBe(0);
  });

  it("lands every dot click on the dot it came from", () => {
    LAYOUT.forEach((section, index) => {
      const scrollY = sectionScrollTop(section, VIEWPORT, DOCUMENT);
      expect(activeSectionIndex(LAYOUT, scrollY, VIEWPORT, DOCUMENT)).toBe(index);
    });
  });
});

describe("supportsWebGL", () => {
  it("is false on the server, where there is no canvas", () => {
    expect(supportsWebGL()).toBe(false);
  });

  it("is false when the browser returns no WebGL context", () => {
    expect(supportsWebGL(() => ({ getContext: () => null }))).toBe(false);
  });

  it("is false when asking for a context throws", () => {
    const canvas = {
      getContext: () => {
        throw new Error("blocked");
      },
    };
    expect(supportsWebGL(() => canvas)).toBe(false);
  });

  it("accepts WebGL 1 when WebGL 2 is missing, and frees the probe context", () => {
    const loseContext = vi.fn();
    const gl = { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null) };
    const canvas = { getContext: (id: string) => (id === "webgl" ? gl : null) };
    expect(supportsWebGL(() => canvas)).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
});

describe("fmtCount", () => {
  it("groups four-digit figures the same way as bigger ones in every locale", () => {
    // Spanish skips the separator on 4-digit numbers by default ('1240' next
    // to '48.500'), which made the landing stats look inconsistent.
    expect(fmtCount(1240, "es")).toBe("1.240");
    expect(fmtCount(48500, "es")).toBe("48.500");
    expect(fmtCount(1240, "en")).toBe("1,240");
    expect(fmtCount(1240, "de")).toBe("1.240");
    expect(fmtCount(320, "fr")).toBe("320");
  });
});
