"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { statusKey } from "@/components/dashboard/dashboardFit";

/**
 * Translate a status enum that comes from the server ("ARMED", "healthy", "idle", "paper",
 * "edge_below_threshold"…) through common.status. Unknown values fall back to the raw value
 * with underscores turned into spaces, so a new backend status still reads, just in English.
 */
export function useStatusLabel() {
  const t = useTranslations("common.status");
  return useCallback(
    (value: string | null | undefined, fallback = "—") => {
      if (!value) return fallback;
      const key = statusKey(value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return t.has(key as any) ? t(key as any) : value.replace(/_/g, " ");
    },
    [t],
  );
}
