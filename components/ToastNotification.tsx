"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuantikStore } from "@/store/useQuantikStore";

interface Toast {
  id: number;
  message: string;
  type: "bet" | "pass" | "error";
  phase: "in" | "visible" | "out";
}

let toastId = 0;

export function ToastNotification() {
  const t = useTranslations("toast");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pipeline = useQuantikStore((s) => s.pipeline);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, phase: "in" }]);

    // Transition to visible
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "visible" } : t)));
    }, 50);

    // Start exit
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, phase: "out" } : t)));
    }, 3000);

    // Remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3300);
  }, []);

  // Watch for pipeline completion
  useEffect(() => {
    if (pipeline.source === "live" && !pipeline.running && pipeline.result) {
      const sigma = pipeline.result.sigma;
      if (sigma) {
        if (sigma.decision === "PASS") {
          addToast(`${t("pipelineCompletePass")}${sigma.thesis.slice(0, 60)}...`, "pass");
        } else {
          addToast(
            t("pipelineComplete", { decision: sigma.decision.replace("_", " "), confidence: sigma.confidence }),
            "bet"
          );
        }
      }
    }
  }, [pipeline.running, pipeline.result, pipeline.source, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const bgColor =
          toast.type === "bet"
            ? "var(--ios-green-glow)"
            : toast.type === "pass"
            ? "var(--ios-orange-glow)"
            : "var(--ios-red-glow)";
        const textColor =
          toast.type === "bet"
            ? "var(--ios-green)"
            : toast.type === "pass"
            ? "var(--ios-orange)"
            : "var(--ios-red)";

        return (
          <div
            key={toast.id}
            style={{
              padding: "10px 20px",
              borderRadius: 100,
              background: bgColor,
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: `1px solid ${textColor}`,
              color: textColor,
              fontSize: "var(--text-subhead)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              animation:
                toast.phase === "in"
                  ? "toast-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                  : toast.phase === "out"
                  ? "toast-out 300ms ease-in forwards"
                  : "none",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
