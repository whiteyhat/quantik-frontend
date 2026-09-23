"use client";

import "@/components/arena/arena.css";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function PublicAgentNotFound() {
  const t = useTranslations("arena");
  return (
    <div className="arena-public-empty">
      <h1>{t("publicNotFoundTitle")}</h1>
      <p>{t("publicNotFoundDetail")}</p>
      <Link href="/arena" className="arena-hero-link">
        {t("publicViewArena")}
      </Link>
    </div>
  );
}
