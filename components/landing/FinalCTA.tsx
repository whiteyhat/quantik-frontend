"use client";

import { SignInButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { SectionShell } from "./SectionShell";
import { PillButton } from "./PillButton";
import { useTouchDevice } from "@/hooks/useTouchDevice";

function FloatingParticles() {
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();
  const count = isTouch ? 10 : 25;

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        size: 2 + (i % 3),
        opacity: 0.2 + (i % 4) * 0.1,
        duration: 8 + (i % 7) * 1.2,
        delay: (i * 0.7) % 10,
      })),
    [count]
  );

  if (reduced) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        pointerEvents: "none",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            bottom: -10,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.6)",
            ["--p-opacity" as string]: p.opacity,
            animation: `landing-float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

export function FinalCTA() {
  const t = useTranslations("landing");

  return (
    <SectionShell className="!pb-32">
      <div
        className="text-center py-10 sm:py-14"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,122,255,0.12) 0%, rgba(191,90,242,0.12) 100%)",
          border: "1px solid var(--glass-border)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
          animation: "landing-pulse-glow 4s ease-in-out infinite",
        }}
      >
        <FloatingParticles />

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
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <PillButton variant="light">{t("joinNow")}</PillButton>
          </SignInButton>
        </div>
      </div>
    </SectionShell>
  );
}
