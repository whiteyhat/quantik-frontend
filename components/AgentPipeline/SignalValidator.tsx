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

export function SignalValidator({ edge, sigma, aura, flux, lucifer }: SignalValidatorProps) {
  const gates: Gate[] = [
    // 1. Min Edge
    (() => {
      const ev = edge ? num(edge.net_ev) : 0;
      const grade = edge?.ev_grade ?? "PASS";
      if (grade === "A" || grade === "B") return { label: "Min Edge", status: "pass" as GateStatus, detail: `EV ${ev > 0 ? "+" : ""}${ev.toFixed(1)}% (${grade})` };
      if (grade === "C") return { label: "Min Edge", status: "watch" as GateStatus, detail: `EV ${ev.toFixed(1)}% — marginal` };
      return { label: "Min Edge", status: "fail" as GateStatus, detail: edge ? `Grade: ${grade}` : "No edge data" };
    })(),

    // 2. Confidence
    (() => {
      const conf = num(sigma.confidence);
      if (conf >= 70) return { label: "Confidence", status: "pass" as GateStatus, detail: `${conf}%` };
      if (conf >= 50) return { label: "Confidence", status: "watch" as GateStatus, detail: `${conf}% — low` };
      return { label: "Confidence", status: "fail" as GateStatus, detail: `${conf}% — insufficient` };
    })(),

    // 3. Resolution Clarity (from aura echo chamber as proxy)
    (() => {
      if (!aura) return { label: "Resolution Clarity", status: "watch" as GateStatus, detail: "No sentiment data" };
      if (!aura.echo_chamber) return { label: "Resolution Clarity", status: "pass" as GateStatus, detail: "No echo chamber" };
      return { label: "Resolution Clarity", status: "watch" as GateStatus, detail: "Echo chamber detected" };
    })(),

    // 4. DA Check
    (() => {
      if (!lucifer) return { label: "DA Check", status: "watch" as GateStatus, detail: "No DA data" };
      const da = num(lucifer.devils_advocate_score);
      if (da <= 0.5) return { label: "DA Check", status: "pass" as GateStatus, detail: `Score: ${da.toFixed(2)}` };
      if (da <= 0.7) return { label: "DA Check", status: "watch" as GateStatus, detail: `Score: ${da.toFixed(2)} — elevated` };
      return { label: "DA Check", status: "fail" as GateStatus, detail: `Score: ${da.toFixed(2)} — VETO` };
    })(),

    // 5. Liquidity
    (() => {
      if (!flux) return { label: "Liquidity", status: "watch" as GateStatus, detail: "No liquidity data" };
      const grade = flux.liquidity_grade;
      if (grade === "A" || grade === "B") return { label: "Liquidity", status: "pass" as GateStatus, detail: `Grade: ${grade}` };
      if (grade === "C") return { label: "Liquidity", status: "watch" as GateStatus, detail: `Grade: ${grade} — thin` };
      return { label: "Liquidity", status: "fail" as GateStatus, detail: `Grade: ${grade} — illiquid` };
    })(),
  ];

  const passCount = gates.filter((g) => g.status === "pass").length;
  const failCount = gates.filter((g) => g.status === "fail").length;

  const finalVerdict = failCount > 0 ? "SKIP" : passCount >= 4 ? "TRADE" : "WATCH";
  const verdictColor =
    finalVerdict === "TRADE"
      ? "var(--ios-green)"
      : finalVerdict === "SKIP"
      ? "var(--ios-red)"
      : "var(--ios-orange)";

  return (
    <div className="glass-card" style={{ padding: 20, marginTop: 12 }} data-testid="signal-validator">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span
          className="font-mono-data"
          style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.06em" }}
        >
          SIGNAL VALIDATOR
        </span>
        <span
          className="font-mono-data"
          style={{
            fontSize: 14,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 8,
            color: verdictColor,
            background: `color-mix(in srgb, ${verdictColor} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${verdictColor} 25%, transparent)`,
            letterSpacing: "0.05em",
          }}
        >
          {finalVerdict}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {gates.map((gate) => {
          const icon = gate.status === "pass" ? "\u2713" : gate.status === "fail" ? "\u2717" : "\u26A0";
          const color =
            gate.status === "pass"
              ? "var(--ios-green)"
              : gate.status === "fail"
              ? "var(--ios-red)"
              : "var(--ios-orange)";

          return (
            <div
              key={gate.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
              }}
              data-testid="signal-gate"
            >
              <span style={{ fontSize: 14, color, fontWeight: 700, width: 18, textAlign: "center" }}>
                {icon}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>
                {gate.label}
              </span>
              <span className="font-mono-data" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {gate.detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
