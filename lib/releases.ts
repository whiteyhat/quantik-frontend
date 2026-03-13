/** Current version — used for the notification dot logic in VersionLog. */
export const CURRENT_VERSION = "v1.3.0";

/** Localized release entry returned by GET /api/versions */
export interface ReleaseEntry {
  version: string;
  date: string;
  highlight: { en: string; es: string; fr: string; de: string };
  features: { en: string[]; es: string[]; fr: string[]; de: string[] };
  fixes: { en: string[]; es: string[]; fr: string[]; de: string[] };
}
