"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  rect: SpotlightRect | null;
  visible: boolean;
}

const PADDING = 10;
const BORDER_RADIUS = 14;

export function TutorialSpotlight({ rect, visible }: TutorialSpotlightProps) {
  const reduced = useReducedMotion();

  const maskId = "tutorial-spotlight-mask";
  const borderId = "tutorial-spotlight-border";

  const cutout = rect
    ? {
        x: rect.x - PADDING,
        y: rect.y - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Perimeter for dash animation
  const perimeter = cutout
    ? 2 * (cutout.width + cutout.height)
    : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            pointerEvents: "none",
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              inset: 0,
              width: "100vw",
              height: "100vh",
            }}
          >
            <defs>
              <mask id={maskId}>
                {/* White = visible (the dark overlay) */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black = transparent (the cutout) */}
                {cutout && (
                  <rect
                    x={cutout.x}
                    y={cutout.y}
                    width={cutout.width}
                    height={cutout.height}
                    rx={BORDER_RADIUS}
                    ry={BORDER_RADIUS}
                    fill="black"
                  />
                )}
              </mask>
            </defs>

            {/* Dark overlay with cutout */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.62)"
              mask={`url(#${maskId})`}
            />

            {/* Animated scanning border around cutout */}
            {cutout && (
              <rect
                id={borderId}
                x={cutout.x}
                y={cutout.y}
                width={cutout.width}
                height={cutout.height}
                rx={BORDER_RADIUS}
                ry={BORDER_RADIUS}
                fill="none"
                stroke="rgba(10,132,255,0.45)"
                strokeWidth="2"
                strokeDasharray={`${perimeter * 0.25} ${perimeter * 0.75}`}
                style={{
                  animation: reduced
                    ? "none"
                    : `tutorial-scan ${Math.max(3, perimeter / 400)}s linear infinite`,
                }}
              />
            )}

            {/* Subtle glow around cutout */}
            {cutout && (
              <rect
                x={cutout.x - 1}
                y={cutout.y - 1}
                width={cutout.width + 2}
                height={cutout.height + 2}
                rx={BORDER_RADIUS + 1}
                ry={BORDER_RADIUS + 1}
                fill="none"
                stroke="rgba(10,132,255,0.12)"
                strokeWidth="4"
              />
            )}
          </svg>

          {/* CSS for the scan animation */}
          <style>{`
            @keyframes tutorial-scan {
              to { stroke-dashoffset: -${perimeter}; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
