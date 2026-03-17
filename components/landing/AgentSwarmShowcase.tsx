"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionShell } from "./SectionShell";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import {
  AGENT_ANGLES,
  AGENT_META,
} from "@/components/ArchitectureView/data/architectureData";

const AGENT_ORDER = ["aura", "flux", "clause", "oracle", "edge", "lucifer", "sigma"];

export function AgentSwarmShowcase() {
  const t = useTranslations("landing");
  const reduced = useReducedMotion();
  const isTouch = useTouchDevice();

  return (
    <SectionShell>
      <div className="text-center mb-12">
        <h2
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#fff",
            margin: "0 0 12px",
          }}
        >
          {t("swarm.title")}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            margin: 0,
            maxWidth: 520,
            marginInline: "auto",
          }}
        >
          {t("swarm.subtitle")}
        </p>
      </div>

      {/* Neural Web Mini-Map */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="landing-mini-map-wrapper"
      >
        <div className="dashboard-mini-map">
          <div className="dashboard-mini-map-grid" />
          <div className="dashboard-mini-map-ambient" />
          <div className="dashboard-mini-map-ring dashboard-mini-map-ring--outer" />
          <div className="dashboard-mini-map-ring dashboard-mini-map-ring--inner" />

          {/* Pulse + sweep animations */}
          <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--outer" />
          <div className="dashboard-mini-map-pulse dashboard-mini-map-pulse--inner" />
          <div className="dashboard-mini-map-sweep" />

          {/* Central core */}
          <div className="dashboard-mini-map-core">
            <div className="dashboard-mini-map-core-emoji">◆</div>
            <div className="dashboard-mini-map-core-label">Quantik Core</div>
            <div className="dashboard-mini-map-core-subtitle">Pipeline Active</div>
          </div>

          {/* Agent nodes arranged in circle */}
          {Object.entries(AGENT_ANGLES).map(([agentKey, angle]) => {
            const meta = AGENT_META[agentKey];
            const radians = (angle * Math.PI) / 180;
            const left = 50 + Math.cos(radians) * 36;
            const top = 50 + Math.sin(radians) * 36;

            return (
              <div
                key={agentKey}
                className="dashboard-mini-map-node dashboard-mini-map-node--good"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  ["--mini-map-accent" as string]: meta.color,
                }}
                title={`${meta.label} — ${meta.role}`}
              >
                <span className="dashboard-mini-map-node-emoji">
                  {meta.emoji}
                </span>
                <span className="dashboard-mini-map-node-label">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Agent detail cards below the map */}
      <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-7 gap-3 mt-8 pb-2 md:pb-0"
        style={{
          WebkitOverflowScrolling: "touch",
          ...(isTouch ? { maskImage: "linear-gradient(to right, black calc(100% - 40px), transparent)", WebkitMaskImage: "linear-gradient(to right, black calc(100% - 40px), transparent)" } : {}),
        }}
      >
        {AGENT_ORDER.map((agentKey, index) => {
          const meta = AGENT_META[agentKey];
          return (
            <motion.div
              key={agentKey}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.3 + index * 0.06,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group/agent"
              style={{
                minWidth: 120,
                scrollSnapAlign: "center",
                background: "var(--glass-surface)",
                border: "1px solid var(--glass-border)",
                borderTop: `2px solid ${meta.color}`,
                borderRadius: 14,
                padding: "16px 12px",
                textAlign: "center",
                flexShrink: 0,
                cursor: "default",
                transition:
                  "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease, box-shadow 300ms ease",
              }}
              whileHover={{
                y: -6,
                transition: { type: "spring", stiffness: 400, damping: 15 },
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{meta.emoji}</div>
              <div
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {meta.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: meta.color,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  opacity: 0.8,
                  transition: "opacity 300ms ease",
                }}
              >
                {meta.role}
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionShell>
  );
}
