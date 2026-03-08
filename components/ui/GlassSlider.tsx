"use client";

const LABEL_SIZE = 11;
const BODY_SIZE = 13;

export function GlassSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  accentColor,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accentColor: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: BODY_SIZE, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.30)" }}>{hint}</div>
        </div>
        <span
          style={{
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: 18,
            fontWeight: 700,
            color: accentColor,
          }}
        >
          {format(value)}
        </span>
      </div>

      {/* Slider */}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: 5,
            borderRadius: 3,
            background: accentColor,
            transition: "width 80ms ease",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            height: 20,
            opacity: 0,
            cursor: "pointer",
            margin: 0,
            padding: 0,
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 9px)`,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: accentColor,
            border: "2px solid rgba(0,0,0,0.5)",
            boxShadow: `0 0 12px ${accentColor}66`,
            pointerEvents: "none",
            transition: "left 80ms ease",
            zIndex: 1,
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {format(min)}
        </span>
        <span style={{ fontSize: LABEL_SIZE, color: "rgba(255,255,255,0.20)", fontFamily: "monospace" }}>
          {format(max)}
        </span>
      </div>
    </div>
  );
}
