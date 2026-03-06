"use client";

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
  const gates: Gate[] = [
    (() => {
      const ev = edge ? num(edge.net_ev) : 0;
      const grade = edge?.ev_grade ?? "PASS";
      if (grade === "A" || grade === "B")
        return { label: "Identity Verification", status: "pass" as GateStatus, detail: `EV ${grade}` };
      if (grade === "C")
        return { label: "Identity Verification", status: "watch" as GateStatus, detail: `EV marginal` };
      return { label: "Identity Verification", status: "fail" as GateStatus, detail: edge ? `Grade: ${grade}` : "No data" };
    })(),

    (() => {
      const conf = num(sigma.confidence);
      if (conf >= 60)
        return { label: "Balance Check", status: "pass" as GateStatus, detail: `${conf.toFixed(0)}% conf` };
      if (conf >= 45)
        return { label: "Balance Check", status: "watch" as GateStatus, detail: `${conf.toFixed(0)}% — low` };
      return { label: "Balance Check", status: "fail" as GateStatus, detail: `${conf.toFixed(0)}% — low` };
    })(),

    (() => {
      if (!flux)
        return { label: "Slippage Tolerance", status: "watch" as GateStatus, detail: "No data" };
      const grade = flux.liquidity_grade;
      if (grade === "A" || grade === "B")
        return { label: "Slippage Tolerance", status: "pass" as GateStatus, detail: `Liq ${grade}` };
      if (grade === "C")
        return { label: "Slippage Tolerance", status: "watch" as GateStatus, detail: "Thin" };
      return { label: "Slippage Tolerance", status: "fail" as GateStatus, detail: "Illiquid" };
    })(),

    (() => {
      if (!lucifer)
        return { label: "Gas Fees", status: "watch" as GateStatus, detail: "Estimating..." };
      const da = num(lucifer.devils_advocate_score);
      if (da <= 0.5)
        return { label: "Gas Fees", status: "pass" as GateStatus, detail: "Low" };
      if (da <= 0.7)
        return { label: "Gas Fees", status: "watch" as GateStatus, detail: "Medium" };
      return { label: "Gas Fees", status: "fail" as GateStatus, detail: "High risk" };
    })(),
  ];

  const passCount = gates.filter((g) => g.status === "pass").length;
  const failCount = gates.filter((g) => g.status === "fail").length;
  const finalVerdict =
    failCount > 0 ? "SKIP" : passCount >= 3 ? "TRADE" : "WATCH";
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
            Validator
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
