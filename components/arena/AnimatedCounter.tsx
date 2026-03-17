"use client";

import { useEffect, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

// Custom easing: cubic-bezier(0.16, 1, 0.3, 1) — matches --ease-out-fast
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedCounter({
  value,
  format = (v) => v.toLocaleString(),
  duration = 600,
  className,
}: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = to;

    // Skip animation if values are the same or user prefers reduced motion
    if (from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = format(to);
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutExpo(progress);
      const current = from + (to - from) * eased;
      el!.textContent = format(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        el!.textContent = format(to);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, format, duration]);

  // Initial render
  return (
    <span ref={spanRef} className={className}>
      {format(value)}
    </span>
  );
}
