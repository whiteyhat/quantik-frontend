"use client";

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
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
          background: "white",
          transition: "left 220ms cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}
