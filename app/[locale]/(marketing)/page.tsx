"use client";

import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { activeSectionIndex, sectionScrollTop, type SectionBox } from "@/lib/landingSections";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BentoShowcase } from "@/components/landing/BentoShowcase";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";

function AmbientCursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (reduced || !glowRef.current) return;
      glowRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(0,122,255,0.04), rgba(191,90,242,0.02) 40%, transparent 70%)`;
    },
    [reduced]
  );

  useEffect(() => {
    if (isTouch) return;
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove, isTouch]);

  if (reduced || isTouch) return null;

  return (
    <div
      ref={glowRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        willChange: "background",
        transition: "background 150ms ease",
      }}
    />
  );
}

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();

  if (reduced || isTouch) return null;

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "linear-gradient(90deg, #007AFF, #BF5AF2)",
        transformOrigin: "left",
        scaleX: scrollYProgress,
        zIndex: 60,
      }}
    />
  );
}

// Page order. `label` is the key under landing.sectionNav.
const SECTIONS = [
  { id: "hero", label: "hero" },
  { id: "how-it-works", label: "howItWorks" },
  { id: "inside", label: "inside" },
  { id: "social-proof", label: "socialProof" },
  { id: "faq", label: "faq" },
  { id: "cta", label: "cta" },
] as const;

// Springy grow for the active dot, smooth settle for colour and opacity.
const DOT_TRANSITION = [
  "transform 260ms cubic-bezier(0.34, 1.2, 0.64, 1)",
  "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  "background-color 200ms cubic-bezier(0.16, 1, 0.3, 1)",
].join(", ");

function measureSection(id: string): SectionBox {
  const el = document.getElementById(id);
  if (!el) return { top: Number.POSITIVE_INFINITY, height: 0 };
  const rect = el.getBoundingClientRect();
  return { top: rect.top + window.scrollY, height: rect.height };
}

function SectionDotNav() {
  const t = useTranslations("landing.sectionNav");
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();
  const enabled = !reduced && !isTouch;
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  // Scroll-spy: the dot follows the section under the middle of the screen,
  // measured from the real section positions (they differ a lot in height).
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setActive(
        activeSectionIndex(
          SECTIONS.map(({ id }) => measureSection(id)),
          window.scrollY,
          window.innerHeight,
          document.documentElement.scrollHeight,
        ),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // FAQ answers opening and lazy sections settling change section heights.
    const resizes = new ResizeObserver(schedule);
    resizes.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizes.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  const goTo = (id: string) => {
    window.scrollTo({
      top: sectionScrollTop(
        measureSection(id),
        window.innerHeight,
        document.documentElement.scrollHeight,
      ),
      behavior: "smooth",
    });
  };

  return (
    <nav
      aria-label={t("label")}
      style={{
        position: "fixed",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        flexDirection: "column",
        zIndex: 55,
        alignItems: "center",
      }}
      className="hidden md:flex"
      onMouseLeave={() => setHovered(null)}
    >
      {SECTIONS.map(({ id, label }, index) => {
        const isActive = index === active;
        const name = t(label);
        return (
          <button
            key={id}
            type="button"
            aria-label={name}
            title={name}
            aria-current={isActive ? "location" : undefined}
            onClick={() => goTo(id)}
            onMouseEnter={() => setHovered(index)}
            className="grid size-5 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/70"
          >
            <span
              aria-hidden="true"
              style={{
                display: "block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isActive ? "#007AFF" : "rgba(255,255,255,0.8)",
                opacity: isActive ? 1 : hovered === index ? 0.6 : 0.2,
                transform: isActive ? "scale(1.34)" : "scale(1)",
                transition: DOT_TRANSITION,
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Guests see the landing immediately; signed-in visitors are on their way
  // to the dashboard (redirect above), so skip painting it for them.
  if (isLoaded && isSignedIn) {
    return <div style={{ background: "#000", minHeight: "100vh" }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "#000",
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      <AmbientCursorGlow />
      <ScrollProgressBar />
      <SectionDotNav />

      <div id="hero">
        <HeroSection />
      </div>

      {/* Scrollable sections layer */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(5,5,8,0.95) 120px, #050508 240px)",
        }}
      >
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="inside">
          <BentoShowcase />
        </div>
        <div id="social-proof">
          <SocialProofBar />
        </div>
        <div id="faq">
          <FAQSection />
        </div>
        <div id="cta">
          <FinalCTA />
        </div>
      </div>
    </div>
  );
}
