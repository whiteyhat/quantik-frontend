"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe hook that detects touch-primary devices via (pointer: coarse).
 * Returns false during SSR/hydration, true on touch devices after mount.
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isTouch;
}
