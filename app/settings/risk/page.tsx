"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Risk configuration has been merged into /settings.
// This page redirects there automatically.
export default function RiskConfigRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "40vh",
        fontSize: 13,
        color: "rgba(255,255,255,0.30)",
        fontFamily: "monospace",
      }}
    >
      Redirecting to Settings…
    </div>
  );
}
