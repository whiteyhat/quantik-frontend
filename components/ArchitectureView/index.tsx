"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { ArchitectureCanvas } from "./ArchitectureCanvas";

export function ArchitectureView() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
