"use client";

import { SignInButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { PillButton } from "./PillButton";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const FONT = "'General Sans', sans-serif";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4";

function LiquidGlassWord({
  word,
  reduced,
}: {
  word: string;
  reduced: boolean | null;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const isTouch = useTouchDevice();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouch) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--glass-x", `${x}%`);
    el.style.setProperty("--glass-y", `${y}%`);
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--glass-x", "50%");
    el.style.setProperty("--glass-y", "50%");
  }, [isTouch]);

  return (
    <motion.span
      ref={containerRef}
      initial={reduced ? {} : { opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 1.8,
        duration: 0.7,
        ease: [0.34, 1.2, 0.64, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="liquid-glass-word"
      style={{
        ["--glass-x" as string]: "50%",
        ["--glass-y" as string]: "50%",
      }}
    >
      {/* Specular highlight - top curved reflection */}
      <span className="liquid-glass-specular" aria-hidden="true" />
      {/* Interactive glare overlay */}
      <span className="liquid-glass-glare" aria-hidden="true" />
      {/* Caustic bottom edge light */}
      <span className="liquid-glass-caustic" aria-hidden="true" />
      {/* The text */}
      <span className="liquid-glass-text">{word}</span>
    </motion.span>
  );
}

function AnimatedSubtitle({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const regex = /(polymarket)/i;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <LiquidGlassWord key={i} word={part} reduced={reduced} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function CharacterReveal({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const chars = text.split("");

  if (reduced) {
    return <>{text}</>;
  }

  return (
    <>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(8px)", y: 20 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            delay: 0.3 + i * 0.02,
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            display: "inline-block",
            whiteSpace: char === " " ? "pre" : undefined,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </>
  );
}

export function HeroSection() {
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();

  const { scrollY } = useScroll();
  const videoScale = useTransform(scrollY, [0, 800], [1, 1.15]);
  const overlayOpacity = useTransform(scrollY, [0, 800], [0.5, 0.85]);

  // Sticky navbar scroll state
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Fullscreen background video with parallax zoom */}
      <motion.video
        autoPlay
        muted
        loop
        playsInline
        preload={isTouch ? "metadata" : "auto"}
        poster="/video-poster.jpg"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          scale: reduced ? 1 : videoScale,
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </motion.video>

      {/* Darkening overlay with scroll-linked opacity */}
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,1)",
          zIndex: 1,
          opacity: reduced ? 0.5 : overlayOpacity,
        }}
      />

      {/* Sticky glass navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: scrolled
            ? "max(14px, env(safe-area-inset-top, 0px))"
            : "max(20px, env(safe-area-inset-top, 0px))",
          paddingBottom: scrolled ? 14 : 20,
          background: scrolled
            ? "rgba(5,5,8,0.8)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          transition:
            "background 400ms ease, backdrop-filter 400ms ease, -webkit-backdrop-filter 400ms ease, border-bottom 400ms ease, padding 300ms ease",
        }}
        className="!px-6 md:!px-[120px]"
      >
        <div
          style={{
            width: 187,
            height: 25,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: scrolled ? "0.06em" : "0.04em",
              transition: "letter-spacing 400ms ease",
            }}
          >
            {tNav("wordmark")}
          </span>
        </div>
        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
          <PillButton variant="dark">{t("joinNow")}</PillButton>
        </SignInButton>
      </nav>

      {/* Hero content */}
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
        {/* Hero Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
          className="pt-[140px] sm:pt-[200px] md:pt-[280px] pb-16 md:pb-[102px]"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 40,
            }}
          >
            {/* Badge with shimmer + pulse dot */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="landing-badge-shimmer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.20)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span className="landing-badge-pulse" />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {t("badge")}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#fff",
                }}
              >
                {t("badgeDate")}
              </span>
            </motion.div>

            {/* Heading with character-by-character reveal */}
            <h1
              style={{
                maxWidth: 613,
                fontFamily: FONT,
                fontWeight: 500,
                lineHeight: 1.28,
                margin: 0,
                background:
                  "linear-gradient(144.5deg, #FFFFFF 28%, rgba(255,255,255,0.40) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              className="text-[28px] sm:text-[36px] md:text-[56px] px-4 md:px-0"
            >
              <CharacterReveal text={t("heading")} />
            </h1>

            {/* Subtitle with animated POLYMARKET */}
            <motion.p
              initial={reduced ? {} : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                maxWidth: 720,
                fontFamily: FONT,
                fontWeight: 800,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 2,
                margin: 0,
              }}
              className="text-[18px] sm:text-[22px] md:text-[25px] px-6 md:px-0"
            >
              <AnimatedSubtitle text={t("subtitle")} />
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <PillButton variant="light">{t("joinNow")}</PillButton>
              </SignInButton>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
