"use client";

import { motion, useReducedMotion } from "framer-motion";

const sectionEase = [0.16, 1.15, 0.3, 1] as const;

export function SectionShell({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      id={id}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: sectionEase }}
      className={`py-20 md:py-28 ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 md:px-16 lg:px-[120px]">
        {/* Materializing divider line */}
        <motion.div
          initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            marginBottom: 0,
            transformOrigin: "center",
          }}
        />
        {children}
      </div>
    </motion.section>
  );
}
