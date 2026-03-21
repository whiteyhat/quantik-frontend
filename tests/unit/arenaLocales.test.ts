import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routing } from "../../i18n/routing";

const localeFiles = routing.locales.map((l) => `messages/${l}.json`);

const requiredArenaKeys = [
  "ctaForgeContender",
  "ctaRearmContender",
  "ctaStudyArena",
  "telemetryUnavailable",
  "telemetryNoSignal",
  "telemetryProtocolHint",
  "nextRival",
  "nextRivalEmpty",
  "lockOnGap",
  "searchPlaceholder",
  "focusViewer",
  "clearFilters",
  "searchEmptyTitle",
  "searchEmptyDetail",
  "warMetaFiltered",
];

describe("arena locale bundles", () => {
  it("defines a single arena object per locale file", () => {
    for (const file of localeFiles) {
      const raw = readFileSync(file, "utf8");
      const arenaMatches = raw.match(/"arena"\s*:\s*\{/g) ?? [];
      expect(arenaMatches, `${file} should contain one top-level arena object`).toHaveLength(1);
    }
  });

  it("includes the new arena UX keys in every locale", () => {
    for (const file of localeFiles) {
      const raw = readFileSync(file, "utf8");
      const messages = JSON.parse(raw) as { arena: Record<string, string> };

      for (const key of requiredArenaKeys) {
        expect(messages.arena[key], `${file} is missing arena.${key}`).toBeTruthy();
      }
    }
  });
});
