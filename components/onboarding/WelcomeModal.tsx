"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuantikStore } from "@/store/useQuantikStore";
import { useLocalStorageFlag, setLocalStorageFlag } from "@/hooks/useLocalStorageFlag";
import { PillButton } from "@/components/landing/PillButton";

const ONBOARDING_KEY = "hasSeenOnboarding";

const CARDS = [
  { emoji: "🤖", titleKey: "card1Title", descKey: "card1Desc" },
  { emoji: "🧠", titleKey: "card2Title", descKey: "card2Desc" },
  { emoji: "📰", titleKey: "card3Title", descKey: "card3Desc" },
] as const;

export function WelcomeModal() {
  const { isSignedIn } = useAuth();
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const hasSeenOnboarding = useLocalStorageFlag(ONBOARDING_KEY);
  const reduced = useReducedMotion();
  const router = useRouter();
  const t = useTranslations("welcome");

  const visible = isSignedIn && myAgent === null && !myAgentLoading && !hasSeenOnboarding;

  const dismiss = () => {
    setLocalStorageFlag(ONBOARDING_KEY, true);
    router.push("/agent-factory");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: 24,
          }}
        >
          <motion.div
            initial={reduced ? {} : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? {} : { scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              width: "100%",
              maxWidth: 560,
              background: "rgba(10, 12, 20, 0.85)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 20,
              padding: "40px 32px 32px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04)",
            }}
          >
            {/* Skip */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button
                type="button"
                onClick={dismiss}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                {t("skip")}
              </button>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "#fff",
                textAlign: "center",
                margin: "0 0 32px",
              }}
            >
              {t("title")}
            </h2>

            {/* Cards */}
            <div className="flex flex-col gap-4" style={{ marginBottom: 32 }}>
              {CARDS.map((card, i) => (
                <motion.div
                  key={card.titleKey}
                  initial={reduced ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: "16px 20px",
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{card.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                      {t(card.titleKey)}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                      {t(card.descKey)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <PillButton variant="light" onClick={dismiss}>
                {t("getStarted")}
              </PillButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
