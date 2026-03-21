"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTransition } from "react";

const LOCALE_META: Record<Locale, { flag: string; code: string; name: string }> = {
  en: { flag: "🇺🇸", code: "EN", name: "English" },
  es: { flag: "🇪🇸", code: "ES", name: "Espanol" },
  fr: { flag: "🇫🇷", code: "FR", name: "Francais" },
  de: { flag: "🇩🇪", code: "DE", name: "Deutsch" },
};

interface LanguageSwitcherProps {
  /** "compact" shows just the code (EN) — fits tight spaces like sidebars */
  variant?: "default" | "compact";
}

export function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onLocaleChange(newLocale: string) {
    startTransition(() => {
      router.replace(
        { pathname },
        { locale: newLocale as Locale }
      );
    });
  }

  if (variant === "compact") {
    return (
      <select
        aria-label={t("language")}
        value={locale}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onLocaleChange(e.target.value)}
        disabled={isPending}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          color: "rgba(255,255,255,0.55)",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          letterSpacing: "0.06em",
          padding: "4px 6px",
          cursor: "pointer",
          outline: "none",
          opacity: isPending ? 0.4 : 1,
          transition: "all 200ms ease",
          WebkitAppearance: "none",
          MozAppearance: "none",
          appearance: "none",
          minWidth: 68,
          textAlign: "center",
        }}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} style={{ background: "#1a1a1a" }}>
            {`${LOCALE_META[loc].flag} ${LOCALE_META[loc].code}`}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label
        htmlFor="locale-switcher"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.45)",
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {t("language")}
      </label>
      <select
        id="locale-switcher"
        value={locale}
        onChange={(e) => onLocaleChange(e.target.value)}
        disabled={isPending}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.85)",
          fontSize: 12,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          padding: "6px 10px",
          cursor: "pointer",
          outline: "none",
          opacity: isPending ? 0.5 : 1,
          transition: "all 200ms ease",
        }}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} style={{ background: "#1a1a1a" }}>
            {`${LOCALE_META[loc].flag} ${LOCALE_META[loc].name}`}
          </option>
        ))}
      </select>
    </div>
  );
}
