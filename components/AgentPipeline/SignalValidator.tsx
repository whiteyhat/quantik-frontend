"use client";

import { useTranslations } from "next-intl";
import {
  type SigmaResult,
  type EdgeResult,
  type AuraResult,
  type FluxResult,
  type LuciferResult,
} from "@/lib/api";

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

type GateStatus = "pass" | "fail" | "watch";

interface Gate {
  label: string;
  status: GateStatus;
  detail: string;
}

interface SignalValidatorProps {
  edge?: EdgeResult;
  sigma: SigmaResult;
  aura?: AuraResult;
  flux?: FluxResult;
  lucifer?: LuciferResult;
}

export function SignalValidator({
  edge,
  sigma,
  aura,
  flux,
  lucifer,
}: SignalValidatorProps) {
  const t = useTranslations("agentPipeline");

  const gates: Gate[] = [
    (() => {
      const grade = edge?.ev_grade ?? "PASS";
      if (grade === "A" || grade === "B")
        return { label: t("validator.identityVerification"), status: "pass" as GateStatus, detail: `EV ${grade}` };
      if (grade === "C")
        return { label: t("validator.identityVerification"), status: "watch" as GateStatus, detail: t("validator.evMarginal") };
      return { label: t("validator.identityVerification"), status: "fail" as GateStatus, detail: edge ? `Grade: ${grade}` : t("validator.noData") };
    })(),

    (() => {
      const conf = num(sigma.confidence);
      if (conf >= 60)
        return { label: t("validator.balanceCheck"), status: "pass" as GateStatus, detail: `${conf.toFixed(0)}% conf` };
      if (conf >= 45)
        return { label: t("validator.balanceCheck"), status: "watch" as GateStatus, detail: `${conf.toFixed(0)}% — low` };
      return { label: t("validator.balanceCheck"), status: "fail" as GateStatus, detail: `${conf.toFixed(0)}% — low` };
    })(),

    (() => {
      if (!flux)
        return { label: t("validator.slippageTolerance"), status: "watch" as GateStatus, detail: t("validator.noData") };
      const grade = flux.liquidity_grade;
      if (grade === "A" || grade === "B")
        return { label: t("validator.slippageTolerance"), status: "pass" as GateStatus, detail: `Liq ${grade}` };
      if (grade === "C")
        return { label: t("validator.slippageTolerance"), status: "watch" as GateStatus, detail: t("validator.thin") };
      return { label: t("validator.slippageTolerance"), status: "fail" as GateStatus, detail: t("validator.illiquid") };
    })(),

    (() => {
      if (!lucifer)
        return { label: t("validator.gasFees"), status: "watch" as GateStatus, detail: t("validator.estimating") };
      const da = num(lucifer.devils_advocate_score);
      if (da <= 0.5)
        return { label: t("validator.gasFees"), status: "pass" as GateStatus, detail: t("validator.low") };
      if (da <= 0.7)
        return { label: t("validator.gasFees"), status: "watch" as GateStatus, detail: t("validator.medium") };
      return { label: t("validator.gasFees"), status: "fail" as GateStatus, detail: t("validator.highRisk") };
    })(),
  ];

  const passCount = gates.filter((g) => g.status === "pass").length;
  const failCount = gates.filter((g) => g.status === "fail").length;
  const finalVerdict =
    failCount > 0 ? t("validator.skip") : passCount >= 3 ? t("validator.trade") : t("validator.watch");
  const verdictColor =
    finalVerdict === "TRADE"
      ? "var(--ios-green)"
      : finalVerdict === "SKIP"
      ? "var(--ios-red)"
      : "var(--ios-orange)";

  return (
    <div className="glass-card" style={{ padding: 16 }} data-testid="signal-validator">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>{"✅"}</span>
          <span
            style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}
          >
            {t("validator.title")}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 6,
            color: verdictColor,
            background: `color-mix(in srgb, ${verdictColor} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${verdictColor} 28%, transparent)`,
            letterSpacing: "0.06em",
          }}
        >
          {finalVerdict}
        </span>
      </div>

      {/* Gate list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {gates.map((gate) => {
          const color =
            gate.status === "pass"
              ? "var(--ios-green)"
              : gate.status === "fail"
              ? "var(--ios-red)"
              : "var(--ios-orange)";
          const icon =
            gate.status === "pass"
              ? "\u2713"
              : gate.status === "fail"
              ? "\u2717"
              : "\u26A0";

          return (
            <div
              key={gate.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              data-testid="signal-gate"
            >
              <span
                style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}
              >
                {gate.label}
              </span>
              <span
                className="font-mono-data"
                style={{
                  fontSize: 11,
                  color,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {gate.status === "pass" ? (
                  gate.detail
                ) : (
                  <>
                    {icon} {gate.detail}
                  </>
                )}
                {gate.status === "pass" && (
                  <span style={{ color, fontWeight: 700 }}>{icon}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
