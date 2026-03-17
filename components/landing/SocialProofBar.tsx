"use client";

import { useTranslations } from "next-intl";
import { useInView } from "react-intersection-observer";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatedCounter } from "@/components/arena/AnimatedCounter";
import { SectionShell } from "./SectionShell";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const STATS = [
  { key: "agentsDeployed" as const, value: 1_240 },
  { key: "tradesExecuted" as const, value: 48_500 },
  { key: "marketsTracked" as const, value: 320 },
];

function ScrambleStat({
  value,
  triggered,
  label,
}: {
  value: number;
  triggered: boolean;
  label: string;
}) {
  const [scrambleValue, setScrambleValue] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const isTouch = useTouchDevice();

  const handleMouseEnter = useCallback(() => {
    if (isTouch) return;
    let count = 0;
    const interval = setInterval(() => {
      const randomized = Math.floor(
        value * (0.8 + Math.random() * 0.4)
      );
      setScrambleValue(randomized.toLocaleString());
      count++;
      if (count >= 6) {
        clearInterval(interval);
        setScrambleValue(null);
      }
    }, 50);
    timeoutRef.current = interval;
  }, [value, isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    setScrambleValue(null);
  }, []);

  return (
    <div
      className="landing-stat-item flex flex-col items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          transition: "text-shadow 300ms ease",
          textShadow: scrambleValue
            ? "0 0 20px rgba(0,122,255,0.4)"
            : "none",
        }}
      >
        {scrambleValue ?? (
          <AnimatedCounter
            value={triggered ? value : 0}
            format={(v) => Math.round(v).toLocaleString()}
            duration={1200}
          />
        )}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          fontWeight: 500,
          transition: "color 300ms ease",
        }}
        className="group-hover/stat:!text-white/80"
      >
        {label}
      </span>
    </div>
  );
}

export function SocialProofBar() {
  const t = useTranslations("landing");
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const [triggered, setTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inView) setTriggered(true);
  }, [inView]);

  const isTouchDevice = useTouchDevice();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -2;
    const rotateY = ((x - centerX) / centerX) * 2;
    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    const el = containerRef.current;
    if (el) el.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
  }, []);

  return (
    <SectionShell className="!py-12 md:!py-16">
      <div
        ref={(node) => {
          ref(node);
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-24"
        style={{
          background: "var(--glass-surface)",
          border: "1px solid var(--glass-border)",
          borderRadius: 16,
          padding: "32px 24px",
          transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {STATS.map((stat) => (
          <ScrambleStat
            key={stat.key}
            value={stat.value}
            triggered={triggered}
            label={t(`socialProof.${stat.key}`)}
          />
        ))}
      </div>
    </SectionShell>
  );
}
