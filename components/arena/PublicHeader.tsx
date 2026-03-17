"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function PublicHeader() {
  const t = useTranslations("arena");

  return (
    <header className="arena-public-header">
      <div className="arena-public-header__inner">
        <Link href="/dashboard" className="arena-public-header__wordmark">
          ◆ QUANTIK
        </Link>
        <nav className="arena-public-header__nav">
          <Link href="/arena" className="arena-public-header__link">
            {t("publicViewArena")}
          </Link>
          <Link href="/agent-factory" className="arena-public-header__cta">
            {t("publicJoinCta")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
