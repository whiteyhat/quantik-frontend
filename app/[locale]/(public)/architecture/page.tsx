"use client";

import dynamic from "next/dynamic";

const ArchitectureView = dynamic(
  () => import("@/components/ArchitectureView").then((m) => ({ default: m.ArchitectureView })),
  { ssr: false }
);

export default function ArchitecturePage() {
  return (
    <div
      style={{
        height: "calc(100vh - 120px)",
        minHeight: 500,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      <ArchitectureView />
    </div>
  );
}
