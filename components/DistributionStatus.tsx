"use client";

import type { DistributionRecord } from "@/lib/api";

interface DistributionStatusProps {
  status: DistributionRecord["status"] | "unknown";
  auditStatus?: DistributionRecord["audit_status"];
}

interface StatusConfig {
  label: string;
  color: string;
  title: string;
}

function getStatusConfig(
  status: DistributionRecord["status"] | "unknown",
  auditStatus?: DistributionRecord["audit_status"]
): StatusConfig {
  if (status === "complete" && auditStatus === "verified") {
    return { label: "Verified", color: "#30D158", title: "Audit verified — all checks passed" };
  }
  switch (status) {
    case "pending":
      return { label: "Pending", color: "#FF9F0A", title: "Distribution pending — awaiting weekly cycle" };
    case "auditing":
      return { label: "Auditing", color: "#FF9F0A", title: "Audit in progress — cross-referencing Polymarket API" };
    case "buying":
    case "distributing":
      return { label: "In Progress", color: "#007AFF", title: "Distribution in progress — executing on-chain" };
    case "audit_failed":
      return { label: "Failed", color: "#FF453A", title: "Audit failed — P&L discrepancy detected" };
    case "buyback_failed":
      return { label: "Failed", color: "#FF453A", title: "Buyback failed — manual intervention required" };
    case "skipped":
      return { label: "Skipped", color: "rgba(255,255,255,0.30)", title: "Skipped — weekly P&L below minimum threshold" };
    case "complete":
      return { label: "Complete", color: "#30D158", title: "Distribution complete" };
    default:
      return { label: "Unknown", color: "rgba(255,255,255,0.30)", title: "Status unknown" };
  }
}

export function DistributionStatus({ status, auditStatus }: DistributionStatusProps) {
  const config = getStatusConfig(status, auditStatus);

  return (
    <span
      title={config.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 6,
        background: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
