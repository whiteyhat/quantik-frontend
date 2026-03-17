"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function PublicHeader() {
  const t = useTranslations("arena");

  return (
    <motion.header
      className="arena-public-header"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="arena-public-header__inner">
        <Link href="/dashboard" className="arena-public-header__wordmark">
          ◆ QUANTIK
        </Link>
        <nav className="arena-public-header__nav">
          <Link href="/arena" className="arena-public-header__link">
            {t("publicViewArena")}
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
