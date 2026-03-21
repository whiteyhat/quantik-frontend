"use client";

import dynamic from "next/dynamic";

const AgentWorldTab = dynamic(
  () => import("@/components/AgentWorld/AgentWorldTab").then((m) => ({ default: m.AgentWorldTab })),
  { ssr: false }
);

export default function WorldPage() {
  return <AgentWorldTab />;
}
