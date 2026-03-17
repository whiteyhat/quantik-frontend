"use client";

export function WinRateRing({ winRate, size = 50 }: { winRate: number; size?: number }) {
  const radius = size * 0.4;
  const stroke = size * 0.06;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (winRate / 100) * circumference;
  const color = winRate >= 60 ? "#34d399" : winRate >= 45 ? "#fbbf24" : "#f87171";
  const center = size / 2;
  const fontSize = size * 0.2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="arena-flyout-ring">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
      <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.85)" fontSize={fontSize} fontFamily="'SF Mono', monospace" fontWeight={700}>
        {winRate.toFixed(0)}%
      </text>
    </svg>
  );
}
