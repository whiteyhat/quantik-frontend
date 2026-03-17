"use client";

import { Activity, Shield, TestTube2, Puzzle, User, Globe } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { SectionShell } from "./SectionShell";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const FEATURES = [
  { icon: Activity, titleKey: "realtime", descKey: "realtimeDesc" },
  { icon: Shield, titleKey: "risk", descKey: "riskDesc" },
  { icon: TestTube2, titleKey: "paper", descKey: "paperDesc" },
  { icon: Puzzle, titleKey: "byo", descKey: "byoDesc" },
  { icon: User, titleKey: "profiles", descKey: "profilesDesc" },
  { icon: Globe, titleKey: "i18n", descKey: "i18nDesc" },
] as const;

function FeatureCard({
  icon: Icon,
  titleKey,
  descKey,
  index,
  reduced,
  t,
}: {
  icon: (typeof FEATURES)[number]["icon"];
  titleKey: string;
  descKey: string;
  index: number;
  reduced: boolean | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={reduced ? {} : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseMove={handleMouseMove}
      className="landing-feature-card"
      style={{
        background: "var(--glass-surface)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        padding: 24,
        transition:
          "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      <div
        className="landing-feature-icon"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "rgba(0,122,255,0.1)",
          border: "1px solid rgba(0,122,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icon className="size-5" style={{ color: "#007AFF" }} />
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#fff",
          margin: "0 0 8px",
        }}
      >
        {t(`features.${titleKey}`)}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {t(`features.${descKey}`)}
      </p>
    </motion.div>
  );
}

export function FeatureGrid() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations("landing") as (key: any) => string;
  const reduced = useReducedMotion();

  return (
    <SectionShell>
      <h2
        className="text-center mb-12"
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#fff",
          margin: "0 0 48px",
        }}
      >
        {t("features.title")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feat, index) => (
          <FeatureCard
            key={feat.titleKey}
            icon={feat.icon}
            titleKey={feat.titleKey}
            descKey={feat.descKey}
            index={index}
            reduced={reduced}
            t={t}
          />
        ))}
      </div>
    </SectionShell>
  );
}
