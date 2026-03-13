"use client";

const pulseKeyframes = `
@keyframes togglePulseRing {
  0% { box-shadow: 0 0 0 0 rgba(255,159,10,0.5); }
  70% { box-shadow: 0 0 0 10px rgba(255,159,10,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,159,10,0); }
}
@keyframes toggleSpinKnob {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

let pulseStyleInjected = false;
function ensurePulseStyle() {
  if (pulseStyleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
  pulseStyleInjected = true;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  pulse,
  loading,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  pulse?: boolean;
  loading?: boolean;
}) {
  if (pulse || loading) ensurePulseStyle();

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative",
        width: 50,
        height: 28,
        borderRadius: 14,
        border: "none",
        background: checked ? "#30d158" : "rgba(255,255,255,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 220ms ease",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        outline: "none",
        ...(pulse
          ? { animation: "togglePulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite" }
          : {}),
      }}
      aria-label="Toggle"
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 24 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: loading ? "rgba(255,255,255,0.85)" : "white",
          transition: "left 220ms cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          ...(loading ? { animation: "toggleSpinKnob 700ms linear infinite" } : {}),
        }}
      >
        {loading && (
          <div style={{
            position: "absolute",
            inset: 3,
            borderRadius: "50%",
            border: "2.5px solid transparent",
            borderTopColor: checked ? "#30d158" : "rgba(255,255,255,0.5)",
            borderRightColor: checked ? "#30d158" : "rgba(255,255,255,0.5)",
          }} />
        )}
      </div>
    </button>
  );
}
