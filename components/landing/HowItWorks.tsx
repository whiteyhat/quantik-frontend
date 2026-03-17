"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { SectionShell } from "./SectionShell";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const STEPS = [
  { emoji: "🏭", titleKey: "step1Title", descKey: "step1Desc" },
  { emoji: "⚙️", titleKey: "step2Title", descKey: "step2Desc" },
  { emoji: "🚀", titleKey: "step3Title", descKey: "step3Desc" },
] as const;

function TiltCard({
  children,
  index,
  reduced,
  isTouch,
}: {
  children: React.ReactNode;
  index: number;
  reduced: boolean | null;
  isTouch: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouch) return;
    const card = cardRef.current;
    const highlight = highlightRef.current;
    if (!card || !highlight) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    highlight.style.opacity = "1";
    highlight.style.background = `radial-gradient(300px circle at ${x}px ${y}px, rgba(255,255,255,0.07), transparent)`;
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const highlight = highlightRef.current;
    if (card)
      card.style.transform =
        "perspective(800px) rotateX(0) rotateY(0) scale(1)";
    if (highlight) highlight.style.opacity = "0";
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={reduced ? {} : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.15,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: "var(--glass-surface)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        padding: 28,
        position: "relative",
        overflow: "hidden",
        transition:
          "transform 150ms ease-out, border-color 300ms ease, box-shadow 300ms ease",
        cursor: "default",
      }}
    >
      {/* Specular highlight overlay */}
      <div
        ref={highlightRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          opacity: 0,
          transition: "opacity 300ms ease",
          pointerEvents: "none",
        }}
      />
      {children}
    </motion.div>
  );
}

export function HowItWorks() {
  const t = useTranslations("landing");
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();

  return (
    <SectionShell>
      <h2
        className="text-center mb-12"
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#fff",
          margin: 0,
          marginBottom: 48,
        }}
      >
        {t("howItWorks.title")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {STEPS.map((step, index) => (
          <TiltCard key={step.titleKey} index={index} reduced={reduced} isTouch={isTouch}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 16,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{step.emoji}</div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#fff",
                margin: "0 0 8px",
              }}
            >
              {t(`howItWorks.${step.titleKey}`)}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {t(`howItWorks.${step.descKey}`)}
            </p>
          </TiltCard>
        ))}
      </div>
    </SectionShell>
  );
}
