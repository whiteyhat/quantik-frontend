"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AgentSwarmShowcase } from "@/components/landing/AgentSwarmShowcase";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
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

const SECTION_IDS = [
  "hero",
  "social-proof",
  "how-it-works",
  "agent-swarm",
  "features",
  "faq",
  "cta",
];

function SectionDotNav() {
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();
  const { scrollYProgress } = useScroll();
  const dotContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || isTouch) return;

    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (!dotContainerRef.current) return;
      const dots = dotContainerRef.current.children;
      const activeIndex = Math.min(
        Math.floor(v * SECTION_IDS.length),
        SECTION_IDS.length - 1
      );
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i] as HTMLElement;
        const isActive = i === activeIndex;
        dot.style.opacity = isActive ? "1" : "0.2";
        dot.style.width = isActive ? "8px" : "6px";
        dot.style.height = isActive ? "8px" : "6px";
        dot.style.background = isActive
          ? "#007AFF"
          : "rgba(255,255,255,0.8)";
      }
    });
    return unsubscribe;
  }, [scrollYProgress, reduced, isTouch]);

  if (reduced || isTouch) return null;

  return (
    <div
      ref={dotContainerRef}
      style={{
        position: "fixed",
        right: 20,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 55,
        alignItems: "center",
      }}
      className="hidden md:flex"
    >
      {SECTION_IDS.map((id) => (
        <div
          key={id}
          role="button"
          aria-label={id}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            opacity: 0.2,
            transition: "all 300ms ease",
            cursor: "pointer",
          }}
          onClick={() => {
            const el = document.getElementById(id);
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      ))}
    </div>
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

  if (!isLoaded || isSignedIn) {
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
        <div id="social-proof">
          <SocialProofBar />
        </div>
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="agent-swarm">
          <AgentSwarmShowcase />
        </div>
        <div id="features">
          <FeatureGrid />
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
