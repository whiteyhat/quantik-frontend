"use client";

import { type CSSProperties, type ReactNode } from "react";

interface AgentHeatGlowProps {
  heat: number;
  children: ReactNode;
  className?: string;
}

export function AgentHeatGlow({ heat, children, className }: AgentHeatGlowProps) {
  // Skip the wrapper entirely for cold agents
  if (heat <= 0.05) {
    return <>{children}</>;
  }

  const style: CSSProperties = {
    "--agent-heat": heat,
  } as CSSProperties;

  return (
    <div className={`arena-heat-wrap ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
