"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionShell } from "./SectionShell";

const FAQ_KEYS = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
] as const;

export function FAQSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations("landing") as (key: any) => string;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reduced = useReducedMotion();

  return (
    <SectionShell>
      <h2
        className="text-center mb-12"
        style={{ fontSize: 28, fontWeight: 600, color: "#fff", margin: "0 0 48px" }}
      >
        {t("faq.title")}
      </h2>
      <div
        style={{
          maxWidth: 720,
          marginInline: "auto",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--glass-border)",
        }}
      >
        {FAQ_KEYS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              style={{
                borderBottom:
                  i < FAQ_KEYS.length - 1
                    ? "1px solid var(--glass-border)"
                    : "none",
                position: "relative",
              }}
            >
              {/* Active accent bar */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    layoutId="faq-accent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background:
                        "linear-gradient(180deg, #007AFF, #BF5AF2)",
                      borderRadius: 1,
                    }}
                  />
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="landing-faq-item w-full text-left flex items-center justify-between gap-4"
                style={{
                  padding: "18px 24px",
                  paddingLeft: isOpen ? 22 : 24,
                  background: isOpen
                    ? "rgba(255,255,255,0.04)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition:
                    "background 150ms ease, padding-left 200ms ease",
                  borderLeft: isOpen
                    ? "none"
                    : "2px solid transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: isOpen ? "#007AFF" : "#fff",
                    transition: "color 200ms ease",
                  }}
                >
                  {t(faq.q)}
                </span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <ChevronDown
                    className="size-4"
                    style={{
                      color: isOpen
                        ? "#007AFF"
                        : "rgba(255,255,255,0.4)",
                      transition: "color 200ms ease",
                    }}
                  />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={
                      reduced ? { height: "auto" } : { height: 0, opacity: 0 }
                    }
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduced ? {} : { height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      style={{
                        padding: "0 24px 18px",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.7,
                      }}
                    >
                      {t(faq.a)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
