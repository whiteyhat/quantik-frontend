import { ImageResponse } from "next/og";
import { api } from "@/lib/api";

export const revalidate = 3600; // 1 hour cache
export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function OGImage({
  params,
}: {
  params: Promise<{ agentCode: string }>;
}) {
  const { agentCode } = await params;
  let profile;
  try {
    profile = await api.getPublicAgentProfile(agentCode);
  } catch {
    profile = null;
  }

  const name = profile?.name ?? agentCode;
  const emoji = profile?.avatarEmoji ?? "?";
  const rank = profile?.rank;
  const pnl = profile?.allTimePnl ?? 0;
  const winRate = profile?.winRate ?? 0;
  const badges = profile?.badges ?? [];
  const pnlColor = pnl >= 0 ? "#34d399" : "#f87171";
  const rankColor = rank === 1 ? "#ffd966" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : "#57d8ff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#050812",
          position: "relative",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${rank === 1 ? "rgba(255,217,102,0.15)" : "rgba(87,216,255,0.12)"}, transparent)`,
          }}
        />

        {/* Top branding strip */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.35)",
            fontSize: 16,
            letterSpacing: "0.1em",
          }}
        >
          ◆ QUANTIK ARENA
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            zIndex: 1,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              fontSize: 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 160,
              height: 160,
              borderRadius: 32,
              background: "rgba(255,255,255,0.05)",
              border: `2px solid ${rankColor}40`,
              boxShadow: `0 0 60px ${rankColor}20`,
            }}
          >
            {emoji}
          </div>

          {/* Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "0.02em" }}>
                {name}
              </span>
              {rank != null && (
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: rankColor,
                    background: `${rankColor}15`,
                    padding: "4px 14px",
                    borderRadius: 12,
                    border: `1px solid ${rankColor}30`,
                  }}
                >
                  #{rank}
                </span>
              )}
            </div>

            {/* PnL */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: pnlColor }}>
                {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
              </span>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)" }}>ALL-TIME PnL</span>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }}>
                Win Rate: {winRate.toFixed(1)}%
              </span>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }}>
                Trades: {profile?.totalTrades ?? 0}
              </span>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {badges.slice(0, 5).map((b, i) => (
                  <span key={i} style={{ fontSize: 24 }}>{b.emoji}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 48,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.25)",
            fontSize: 14,
            letterSpacing: "0.05em",
          }}
        >
          quantik.app
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
