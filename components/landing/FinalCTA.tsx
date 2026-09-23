"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SectionShell } from "./SectionShell";
import { PillButton } from "./PillButton";
import { RainBackdrop } from "./RainBackdrop";

export function FinalCTA() {
  const t = useTranslations("landing");
  const router = useRouter();

  return (
    <SectionShell className="!pb-32">
      <div
        className="text-center py-10 sm:py-14"
        style={{
          background: "#050508",
          border: "1px solid var(--glass-border)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <RainBackdrop />
        </div>
        {/* Scrim keeps the copy readable over the brightest streaks */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, rgba(5,5,8,0.78) 0%, rgba(5,5,8,0.35) 70%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#fff",
              margin: "0 0 12px",
            }}
          >
            {t("cta.title")}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              margin: "0 0 32px",
              maxWidth: 480,
              marginInline: "auto",
            }}
          >
            {t("cta.subtitle")}
          </p>
          <PillButton variant="light" onClick={() => router.push("/dashboard")}>
            {t("exploreApp")}
          </PillButton>
        </div>
      </div>
    </SectionShell>
  );
}
