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
  /** Called when user clicks on the dark overlay area (not the cutout) */
  onOverlayClick: () => void;
}

const PADDING = 10;
const BORDER_RADIUS = 14;

export function TutorialSpotlight({ rect, visible, onOverlayClick }: TutorialSpotlightProps) {
  const reduced = useReducedMotion();

  const maskId = "tutorial-spotlight-mask";

  const cutout = rect
    ? {
        x: rect.x - PADDING,
        y: rect.y - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  const perimeter = cutout ? 2 * (cutout.width + cutout.height) : 0;

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
            // pointerEvents on the SVG dark area captures clicks,
            // the cutout allows clicks to pass through to the target element
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
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
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

            {/* Dark overlay — clicks here advance the tutorial */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="var(--tutorial-overlay-bg, rgba(0,0,0,0.62))"
              mask={`url(#${maskId})`}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
              onClick={onOverlayClick}
            />

            {/* Animated scanning border */}
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.width}
                height={cutout.height}
                rx={BORDER_RADIUS}
                ry={BORDER_RADIUS}
                fill="none"
                stroke="var(--ios-blue, #0a84ff)"
                strokeOpacity={0.45}
                strokeWidth="2"
                strokeDasharray={`${perimeter * 0.25} ${perimeter * 0.75}`}
                style={{
                  pointerEvents: "none",
                  animation: reduced
                    ? "none"
                    : `tutorial-scan ${Math.max(3, perimeter / 400)}s linear infinite`,
                }}
              />
            )}

            {/* Subtle glow */}
            {cutout && (
              <rect
                x={cutout.x - 1}
                y={cutout.y - 1}
                width={cutout.width + 2}
                height={cutout.height + 2}
                rx={BORDER_RADIUS + 1}
                ry={BORDER_RADIUS + 1}
                fill="none"
                stroke="var(--ios-blue, #0a84ff)"
                strokeOpacity={0.12}
                strokeWidth="4"
                style={{ pointerEvents: "none" }}
              />
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
