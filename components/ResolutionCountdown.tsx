"use client";

import { useEffect, useState } from "react";
import { fmtDateFull } from "@/lib/formatters";

interface TimeLeft {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(target: Date): TimeLeft {
  const now = new Date();
  const total = target.getTime() - now.getTime();
  if (total <= 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  // Calculate months + remaining days accurately
  let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  // Adjust if the target day hasn't been reached yet in the current month
  const tempDate = new Date(now);
  tempDate.setMonth(tempDate.getMonth() + months);
  if (tempDate > target) months--;

  // Get the date after subtracting full months
  const afterMonths = new Date(now);
  afterMonths.setMonth(afterMonths.getMonth() + Math.max(0, months));
  const remainingMs = target.getTime() - afterMonths.getTime();

  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);

  return { months: Math.max(0, months), days, hours, minutes, seconds, total };
}

export function ResolutionCountdown({ iso }: { iso: string }) {
  const target = new Date(iso);
  const isValid = !isNaN(target.getTime());
  const [time, setTime] = useState<TimeLeft>(() =>
    isValid ? calcTimeLeft(target) : { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  );

  useEffect(() => {
    if (!isValid) return;
    const id = setInterval(() => setTime(calcTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [iso, isValid]);

  if (!isValid) {
    return (
      <div style={wrapperStyle}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 13, fontWeight: 500 }}>
          Resolution date TBD
        </span>
      </div>
    );
  }

  const ended = time.total <= 0;

  if (ended) {
    return (
      <div style={wrapperStyle}>
        <div style={endedBadgeStyle}>
          <span style={endedDotStyle} />
          RESOLVED
        </div>
      </div>
    );
  }

  // Decide which segments to show (always show at least 3)
  const segments: { value: number; label: string }[] = [];
  if (time.months > 0) segments.push({ value: time.months, label: "MO" });
  segments.push({ value: time.days, label: "DAYS" });
  segments.push({ value: time.hours, label: "HRS" });
  if (time.months === 0) segments.push({ value: time.minutes, label: "MIN" });
  if (time.months === 0 && time.days === 0) segments.push({ value: time.seconds, label: "SEC" });

  // Urgency color based on how close we are
  const totalHours = time.total / 3_600_000;
  const accentColor =
    totalHours < 24
      ? "var(--ios-red)"
      : totalHours < 72
        ? "var(--ios-orange, #FF9F0A)"
        : "var(--ios-blue)";

  const glowColor =
    totalHours < 24
      ? "rgba(255,69,58,0.25)"
      : totalHours < 72
        ? "rgba(255,159,10,0.20)"
        : "rgba(0,122,255,0.15)";

  return (
    <div style={wrapperStyle}>
      {/* Label */}
      <div style={labelRowStyle}>
        <span style={{ ...pulseDotStyle, background: accentColor, boxShadow: `0 0 8px ${glowColor}` }} />
        <span style={{ ...labelStyle, color: accentColor }}>RESOLVES IN</span>
      </div>

      {/* Countdown segments */}
      <div style={segmentsRowStyle}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {i > 0 && <span style={colonStyle}>:</span>}
            <div style={segmentStyle}>
              <span
                className="font-mono-data"
                style={{
                  ...digitStyle,
                  color: i === segments.length - 1 && time.months === 0 ? accentColor : "var(--text-primary)",
                }}
              >
                {String(seg.value).padStart(2, "0")}
              </span>
              <span style={unitStyle}>{seg.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Target date subtitle */}
      <div style={targetDateStyle}>
        {fmtDateFull(target.getTime())}
      </div>

      {/* Animated bottom glow bar */}
      <div style={{ ...glowBarStyle, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

      <style>{`
        @keyframes q-countdown-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes q-countdown-glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "16px 20px 14px",
  overflow: "hidden",
};

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginBottom: 10,
};

const pulseDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  animation: "q-countdown-pulse 2s ease-in-out infinite",
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
};

const segmentsRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 2,
};

const segmentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 44,
};

const digitStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: "-0.02em",
};

const unitStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  letterSpacing: "0.10em",
  marginTop: 4,
};

const colonStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "var(--text-tertiary)",
  opacity: 0.4,
  marginTop: -6,
  padding: "0 2px",
};

const targetDateStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  textAlign: "center",
  marginTop: 10,
  fontWeight: 500,
  letterSpacing: "0.02em",
};

const glowBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 2,
  opacity: 0.6,
  animation: "q-countdown-glow 3s ease-in-out infinite",
};

const endedBadgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.10em",
  padding: "8px 0",
};

const endedDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--text-tertiary)",
};
