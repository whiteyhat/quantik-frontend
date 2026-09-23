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
import { useRouter } from "@/i18n/navigation";
import AsciiRipple from "@/components/react-bits/ascii-ripple";

const FONT = "'General Sans', sans-serif";

// The hero's background is a live "tape": the swarm's own readouts, rendered as
// ASCII that ripples under the cursor like a market reacting to news.
const TAPE_TEXT = [
  "AURA sentiment +0.42", "FLUX depth A", "CLAUSE rules clear", "ORACLE p=0.58",
  "EDGE kelly 0.25", "LUCIFER risks 2", "SIGMA BET YES @ 0.45", "BTC 150K 2026",
  "FED CUT DEC 38¢", "YES 0.61 NO 0.39", "spread 0.8%", "drawdown 3.1%",
  "circuit ARMED", "paper $120", "POLYMARKET", "KRAKEN spot", "SOLANA", "ERC-8004",
].join(" ");

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
  }, []);

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
  const regex = /(polymarket \+ kraken cli)/i;
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

// ─── Headline ────────────────────────────────────────────────────────────────
// The message marks two words: <mood> wobbles like a market swinging, <accent>
// lands last in the brand gradient. "\n" splits the two lines.

type HeadlinePiece = { kind: "plain" | "mood" | "accent"; text: string };

const HEADLINE_TAG = /<(mood|accent)>(.*?)<\/\1>/g;
const REVEAL_START = 0.3;
const CHAR_STAGGER = 0.02;
const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

function parseHeadlineLine(line: string): HeadlinePiece[] {
  const pieces: HeadlinePiece[] = [];
  let cursor = 0;
  for (const match of line.matchAll(HEADLINE_TAG)) {
    const start = match.index ?? 0;
    if (start > cursor) pieces.push({ kind: "plain", text: line.slice(cursor, start) });
    pieces.push({ kind: match[1] as "mood" | "accent", text: match[2] });
    cursor = start + match[0].length;
  }
  if (cursor < line.length) pieces.push({ kind: "plain", text: line.slice(cursor) });
  return pieces;
}

// Group pieces into words so a line can only wrap at spaces, never mid-word
// or before trailing punctuation.
function toWords(pieces: HeadlinePiece[]): HeadlinePiece[][] {
  const words: HeadlinePiece[][] = [[]];
  for (const piece of pieces) {
    piece.text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) words.push([]);
      else words[words.length - 1].push({ kind: piece.kind, text: part });
    });
  }
  return words.filter((w) => w.length > 0);
}

function RevealChar({ char, delay, wobbleDelay }: { char: string; delay: number; wobbleDelay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, filter: "blur(8px)", y: 20 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ delay, duration: 0.4, ease: REVEAL_EASE }}
      style={{ display: "inline-block" }}
    >
      {wobbleDelay === undefined ? (
        char
      ) : (
        <motion.span
          animate={{ y: ["0em", "-0.05em", "0em", "0.035em", "0em"], rotate: [0, -3, 0, 2.5, 0] }}
          transition={{ delay: wobbleDelay, duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-block" }}
        >
          {char}
        </motion.span>
      )}
    </motion.span>
  );
}

function HeroHeadline({ raw }: { raw: string }) {
  const reduced = useReducedMotion();
  const lines = raw.split("\n").map((line) => toWords(parseHeadlineLine(line)));
  const plainText = raw.replace(/<\/?(mood|accent)>/g, "").replace(/\n/g, " ");
  const totalChars = plainText.length;
  const wobbleStart = REVEAL_START + totalChars * CHAR_STAGGER + 0.6;

  let charIndex = 0;
  const nextDelay = () => REVEAL_START + charIndex++ * CHAR_STAGGER;

  return (
    <>
      <span className="sr-only">{plainText}</span>
      <span aria-hidden="true">
        {lines.map((words, lineIndex) => (
          <span key={lineIndex} className={`hero-headline-line hero-headline-line--${lineIndex === 0 ? "lead" : "punch"}`}>
            {words.map((word, wordIndex) => (
              <span key={wordIndex}>
                {wordIndex > 0 && " "}
                <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                  {word.map((piece, pieceIndex) => {
                    if (piece.kind === "accent") {
                      const delay = nextDelay() + 0.12;
                      charIndex += piece.text.length - 1;
                      return (
                        <motion.span
                          key={pieceIndex}
                          initial={reduced ? false : { opacity: 0, scale: 0.86, y: 14, filter: "blur(10px)" }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                          transition={{ delay, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                          style={{ display: "inline-block" }}
                        >
                          <span
                            className="hero-accent-word"
                            style={{ ["--accent-delay" as string]: `${delay + 0.35}s` }}
                          >
                            {piece.text}
                          </span>
                        </motion.span>
                      );
                    }
                    if (reduced) return <span key={pieceIndex}>{piece.text}</span>;
                    return (
                      <span key={pieceIndex}>
                        {piece.text.split("").map((char, i) => (
                          <RevealChar
                            key={i}
                            char={char}
                            delay={nextDelay()}
                            wobbleDelay={piece.kind === "mood" ? wobbleStart + i * 0.12 : undefined}
                          />
                        ))}
                      </span>
                    );
                  })}
                </span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </>
  );
}

export function HeroSection() {
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();
  const router = useRouter();

  const { scrollY } = useScroll();
  const overlayOpacity = useTransform(scrollY, [0, 800], [0.15, 0.85]);

  // Stop the ambient rain once the hero is scrolled away; the loop then idles.
  const [heroInView, setHeroInView] = useState(true);
  useEffect(() => scrollY.on("change", (y) => setHeroInView(y < window.innerHeight * 1.2)), [scrollY]);

  // Sticky navbar scroll state
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Fullscreen ASCII tape: ripples follow the cursor, light rain keeps it alive */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, background: "#050508" }}>
        <AsciiRipple
          text={TAPE_TEXT}
          fontSize={isTouch ? 12 : 14}
          textColor="#c7d2fe"
          rippleColor="#5ac8fa"
          troughColor="#bf5af2"
          backgroundColor="#050508"
          textOpacity={0.1}
          interactive={!isTouch}
          rain={heroInView ? (isTouch ? 0.8 : 0.35) : 0}
          rainStrength={0.5}
          vignette={0.7}
          className="touch-pan-y"
        />
        {/* Quiet the tape behind the copy; it stays vivid toward the edges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 60% 55% at 50% 55%, rgba(5,5,8,0.88) 0%, rgba(5,5,8,0.6) 55%, rgba(5,5,8,0.15) 100%)",
          }}
        />
      </div>

      {/* Darkening overlay with scroll-linked opacity */}
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,1)",
          zIndex: 1,
          opacity: reduced ? 0.15 : overlayOpacity,
          pointerEvents: "none",
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
        <SignInButton mode="modal" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard">
          <PillButton variant="dark">{tNav("signIn")}</PillButton>
        </SignInButton>
      </nav>

      {/* Hero content */}
      <div className="hero-pass-through" style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
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
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {t("badge")}
              </span>
              <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>·</span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {t("badgeDetail")}
              </span>
            </motion.div>

            {/* Heading: character reveal, wobbling "moods", accent lands last */}
            <h1
              style={{
                maxWidth: 820,
                fontFamily: FONT,
                lineHeight: 1.16,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
              className="text-[32px] sm:text-[42px] md:text-[60px] px-4 md:px-0"
            >
              <HeroHeadline raw={t.raw("heading") as string} />
            </h1>

            {/* Subtitle with animated POLYMARKET + KRAKEN CLI */}
            <motion.p
              initial={reduced ? {} : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                maxWidth: 880,
                fontFamily: FONT,
                fontWeight: 800,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 2,
                margin: 0,
                textWrap: "balance",
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
              {/* Straight into the app as a guest: no account needed to look around */}
              <PillButton variant="light" onClick={() => router.push("/dashboard")}>
                {t("exploreApp")}
              </PillButton>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
