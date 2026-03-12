import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // All supported locales — add new ones here and create a matching messages/*.json
  locales: ["en", "es", "fr", "de"],

  // Used when no locale prefix is present or detection fails
  defaultLocale: "en",

  // 'always' = every URL has a locale prefix (/en/about, /es/about)
  // 'as-needed' = default locale has no prefix (/about), others do (/es/about)
  localePrefix: "always",
});

// Convenience type used throughout the app
export type Locale = (typeof routing.locales)[number];
