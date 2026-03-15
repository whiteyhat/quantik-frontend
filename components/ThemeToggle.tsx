"use client";

import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minWidth: compact ? 34 : 88,
        height: compact ? 34 : 36,
        padding: compact ? "0 10px" : "0 12px",
        borderRadius: 12,
        border: "1px solid var(--glass-border)",
        background: "var(--glass-surface)",
        color: "var(--text-primary)",
        cursor: "pointer",
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: compact ? 14 : 11,
        letterSpacing: "0.04em",
      }}
    >
      <span>{theme === "dark" ? "☾" : "☀"}</span>
      {!compact && <span>{theme === "dark" ? "DARK" : "LIGHT"}</span>}
    </button>
  );
}
