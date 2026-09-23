"use client";

import { useTranslations } from "next-intl";
import { PerformancePanel } from "@/components/PerformancePanel";
import { TradeReportsView } from "@/components/reports/TradeReportsView";

export default function ReportsPage() {
  const tReports = useTranslations("reports");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <TradeReportsView
        title={tReports("title")}
        subtitle={tReports("subtitle")}
      />
      <PerformancePanel />
    </div>
  );
}
