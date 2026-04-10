"use client";

import { ReferenceLine } from "recharts";

interface MigrationMarkerProps {
  migrationTimestamp: number;
}

export function MigrationMarker({ migrationTimestamp }: MigrationMarkerProps) {
  return (
    <ReferenceLine
      x={migrationTimestamp}
      stroke="#FF9F0A"
      strokeDasharray="4 2"
      strokeWidth={1.5}
      label={{
        value: "→ DAMM v2",
        position: "insideTopRight",
        fill: "#FF9F0A",
        fontSize: 10,
        fontWeight: 600,
      }}
    />
  );
}
