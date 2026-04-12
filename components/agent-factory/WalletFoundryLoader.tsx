"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type WalletFoundryTone = "emerald" | "azure" | "sunset";

interface WalletFoundryHighlight {
  label: string;
  value: string;
}

interface WalletFoundryLoaderProps {
  badge: string;
  title: string;
  subtitle: string;
  phases: string[];
  highlights?: WalletFoundryHighlight[];
  distractions?: string[];
  distractionLabel?: string;
  note?: string;
  statusLabel?: string;
  accentEmoji?: string;
  orbitLabels?: string[];
  tone?: WalletFoundryTone;
  sceneHeight?: number;
}

const toneMap: Record<WalletFoundryTone, {
  accent: string;
  accentSoft: string;
  border: string;
  glow: string;
  glowSoft: string;
  shadow: string;
}> = {
  emerald: {
    accent: "#7df7b8",
    accentSoft: "rgba(125,247,184,0.18)",
    border: "rgba(125,247,184,0.24)",
    glow: "rgba(125,247,184,0.22)",
    glowSoft: "rgba(90,160,255,0.14)",
    shadow: "rgba(4,17,28,0.48)",
  },
  azure: {
    accent: "#8fcbff",
    accentSoft: "rgba(143,203,255,0.18)",
    border: "rgba(143,203,255,0.24)",
    glow: "rgba(72,156,255,0.24)",
    glowSoft: "rgba(116,228,255,0.14)",
    shadow: "rgba(3,11,26,0.48)",
  },
  sunset: {
    accent: "#ffc07a",
    accentSoft: "rgba(255,192,122,0.18)",
    border: "rgba(255,192,122,0.24)",
    glow: "rgba(255,140,94,0.24)",
    glowSoft: "rgba(121,170,255,0.14)",
    shadow: "rgba(21,10,15,0.46)",
  },
};

const orbitSlotStyles: CSSProperties[] = [
  { top: 22, right: 26 },
  { top: 120, left: 12 },
  { bottom: 98, right: 18 },
];

const highlightLabelStyle: CSSProperties = {
  fontSize: 10,
  color: "rgba(255,255,255,0.44)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

export function WalletFoundryLoader({
  badge,
  title,
  subtitle,
  phases,
  highlights = [],
  distractions = [],
  distractionLabel = "While you wait",
  note,
  statusLabel,
  accentEmoji = "🔐",
  orbitLabels = ["Agent", "Vault", "Backup"],
  tone = "emerald",
  sceneHeight = 320,
}: WalletFoundryLoaderProps) {
  const tones = toneMap[tone];
  const safePhases = phases.length > 0 ? phases : [title];
  const safeDistractions = distractions.length > 0 ? distractions : [subtitle];
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [distractionIndex, setDistractionIndex] = useState(0);

  useEffect(() => {
    if (safePhases.length <= 1) return;
    const interval = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % safePhases.length);
    }, 1700);
    return () => window.clearInterval(interval);
  }, [safePhases.length]);

  useEffect(() => {
    if (safeDistractions.length <= 1) return;
    const interval = window.setInterval(() => {
      setDistractionIndex((current) => (current + 1) % safeDistractions.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [safeDistractions.length]);

  const currentDistraction = safeDistractions[distractionIndex] ?? safeDistractions[0];

  return (
    <div
      style={{
        "--wallet-tone": tones.accent,
        "--wallet-tone-soft": tones.accentSoft,
        "--wallet-border": tones.border,
        "--wallet-glow": tones.glow,
        "--wallet-glow-soft": tones.glowSoft,
      } as CSSProperties}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          padding: 24,
          border: `1px solid ${tones.border}`,
          background: [
            `radial-gradient(circle at top left, ${tones.glow}, transparent 34%)`,
            `radial-gradient(circle at 88% 14%, ${tones.glowSoft}, transparent 28%)`,
            "linear-gradient(155deg, rgba(18,28,44,0.95), rgba(8,12,22,0.96))",
          ].join(", "),
          boxShadow: `0 28px 84px ${tones.shadow}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(120deg, rgba(255,255,255,0.06), transparent 28%, transparent 72%, rgba(255,255,255,0.05))",
            pointerEvents: "none",
          }}
        />

        <div className="wallet-foundry-layout" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {badge}
              </span>
              {statusLabel && (
                <span
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: tones.accentSoft,
                    border: `1px solid ${tones.border}`,
                    color: tones.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  }}
                >
                  {statusLabel}
                </span>
              )}
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "rgba(255,255,255,0.96)",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.64)",
                  maxWidth: 560,
                }}
              >
                {subtitle}
              </p>
            </div>

            <div
              aria-live="polite"
              style={{
                display: "grid",
                gap: 10,
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {safePhases.map((phase, index) => {
                const active = index === phaseIndex;
                return (
                  <div
                    key={phase}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                      border: active ? `1px solid ${tones.border}` : "1px solid transparent",
                      transition: "all 220ms ease",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: active ? tones.accent : "rgba(255,255,255,0.16)",
                        boxShadow: active ? `0 0 18px ${tones.accentSoft}` : "none",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 13,
                        color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.42)",
                        fontWeight: active ? 700 : 500,
                        letterSpacing: active ? "-0.01em" : 0,
                      }}
                    >
                      {phase}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                padding: "16px 18px",
                borderRadius: 18,
                background: "rgba(6,12,22,0.56)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={highlightLabelStyle}>{distractionLabel}</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${distractionIndex}-${currentDistraction}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    marginTop: 10,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  {currentDistraction}
                </motion.div>
              </AnimatePresence>
            </div>

            {note && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.50)",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {note}
              </div>
            )}
          </div>

          <div
            style={{
              position: "relative",
              minHeight: sceneHeight,
              alignSelf: "stretch",
              paddingBottom: highlights.length > 0 ? 96 : 0,
            }}
          >
            <div className="wallet-foundry-aurora" />
            <div className="wallet-foundry-orbit wallet-foundry-orbit--outer" />
            <div className="wallet-foundry-orbit wallet-foundry-orbit--middle" />
            <div className="wallet-foundry-orbit wallet-foundry-orbit--inner" />

            {orbitLabels.slice(0, 3).map((label, index) => (
              <div
                key={label}
                className={`wallet-foundry-orbit-chip wallet-foundry-orbit-chip--${index + 1}`}
                style={orbitSlotStyles[index]}
              >
                {label}
              </div>
            ))}

            <div className="wallet-foundry-pulse" />
            <motion.div
              animate={{ scale: [1, 1.06, 1], rotate: [0, -4, 4, 0] }}
              transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="wallet-foundry-core"
            >
              <span style={{ position: "relative", zIndex: 1 }}>{accentEmoji}</span>
            </motion.div>

            {highlights.length > 0 && (
              <div className="wallet-foundry-highlights">
                {highlights.slice(0, 4).map((item) => (
                  <div key={`${item.label}-${item.value}`} className="wallet-foundry-highlight-card">
                    <div style={highlightLabelStyle}>{item.label}</div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: "rgba(255,255,255,0.90)",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .wallet-foundry-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);
          gap: 24px;
          align-items: center;
        }

        .wallet-foundry-aurora {
          position: absolute;
          inset: 20px 28px 86px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.12), transparent 28%),
            radial-gradient(circle at 68% 60%, rgba(255, 255, 255, 0.08), transparent 32%);
          filter: blur(4px);
        }

        .wallet-foundry-orbit {
          position: absolute;
          top: 38%;
          left: 50%;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transform: translate(-50%, -50%);
          transform-origin: center;
        }

        .wallet-foundry-orbit--outer {
          width: 250px;
          height: 250px;
          border-color: rgba(255, 255, 255, 0.06);
          animation: wallet-foundry-spin 14s linear infinite;
        }

        .wallet-foundry-orbit--middle {
          width: 186px;
          height: 186px;
          border-color: var(--wallet-border);
          animation: wallet-foundry-spin-reverse 9s linear infinite;
        }

        .wallet-foundry-orbit--inner {
          width: 126px;
          height: 126px;
          border-color: rgba(255, 255, 255, 0.16);
          animation: wallet-foundry-spin 6s linear infinite;
        }

        .wallet-foundry-pulse {
          position: absolute;
          top: 38%;
          left: 50%;
          width: 170px;
          height: 170px;
          border-radius: 999px;
          background: radial-gradient(circle, var(--wallet-glow), transparent 70%);
          transform: translate(-50%, -50%);
          animation: wallet-foundry-pulse 2.8s ease-in-out infinite;
          filter: blur(1px);
        }

        .wallet-foundry-core {
          position: absolute;
          top: 38%;
          left: 50%;
          width: 112px;
          height: 112px;
          border-radius: 28px;
          display: grid;
          place-items: center;
          font-size: 54px;
          transform: translate(-50%, -50%);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.16), transparent 42%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 24px 56px rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(255, 255, 255, 0.04),
            0 0 36px var(--wallet-tone-soft);
          backdrop-filter: blur(16px);
        }

        .wallet-foundry-orbit-chip {
          position: absolute;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(8, 15, 28, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.82);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: "SF Mono", "JetBrains Mono", monospace;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
        }

        .wallet-foundry-orbit-chip--1 {
          animation: wallet-foundry-float 4.4s ease-in-out infinite;
        }

        .wallet-foundry-orbit-chip--2 {
          animation: wallet-foundry-float 5.6s ease-in-out infinite 0.7s;
        }

        .wallet-foundry-orbit-chip--3 {
          animation: wallet-foundry-float 4.9s ease-in-out infinite 0.3s;
        }

        .wallet-foundry-highlights {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .wallet-foundry-highlight-card {
          min-height: 74px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        @keyframes wallet-foundry-spin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes wallet-foundry-spin-reverse {
          from {
            transform: translate(-50%, -50%) rotate(360deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(0deg);
          }
        }

        @keyframes wallet-foundry-pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(0.92);
          }
          50% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes wallet-foundry-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @media (max-width: 900px) {
          .wallet-foundry-layout {
            grid-template-columns: 1fr;
          }

          .wallet-foundry-orbit-chip {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
