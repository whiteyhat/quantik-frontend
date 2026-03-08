"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import JSConfetti from "js-confetti";
import { api } from "@/lib/api";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";

// ─── Style constants ──────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
};

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  // Step 1: Basic Identity
  name: string;
  avatar: string;
  personality: "guardian" | "balanced" | "adventurer";
  decisionStyle: "gut" | "analyst" | "observer";
  // Step 2: Trading Style
  tradingInstinct: "trend_chaser" | "reversal_spotter" | "value_hunter" | "speed_demon";
  timePatience: "lightning" | "swing" | "longterm";
  profitDream: "quick_wins" | "big_moves" | "wealth_builder";
  // Step 3: Risk & Money
  moneyApproach: "fixed_safe" | "smart_scaling" | "aggressive";
  protectionMindset: "tight" | "flexible" | "hands_off";
  leverageVibe: "none" | "moderate" | "full_throttle";
  // Step 4: Preferences
  marketSense: "fixed_rules" | "mood_reader";
  assetLove: "stocks" | "forex" | "crypto" | "all_rounder";
}

const DEFAULT_CONFIG: AgentConfig = {
  name: "",
  avatar: "🦊",
  personality: "balanced",
  decisionStyle: "analyst",
  tradingInstinct: "reversal_spotter",
  timePatience: "swing",
  profitDream: "wealth_builder",
  moneyApproach: "smart_scaling",
  protectionMindset: "flexible",
  leverageVibe: "moderate",
  marketSense: "fixed_rules",
  assetLove: "crypto",
};

const STEPS = [
  { title: "Basic Identity", subtitle: "Who your agent is" },
  { title: "Trading Style", subtitle: "How it buys and sells" },
  { title: "Risk & Money", subtitle: "How careful with cash" },
  { title: "Preferences", subtitle: "Favorite markets and rules" },
  { title: "Launch your agent", subtitle: "Review and go live" },
];

const AVATAR_INLINE = ["🦊", "🐱", "🤖", "🐺", "🦁"];
const AVATAR_ALL = [
  "🦊", "🐱", "🐺", "🦁", "🐉",
  "🦅", "🐙", "🦈", "🐍", "🦎",
  "🐻", "🐼", "🦇", "🐬", "🦋",
  "🐝", "🦜", "🐘", "🦔", "🤖",
];

const EMOJI_TO_ANIMAL: Record<string, string> = {
  "🦊": "fox", "🐱": "cat", "🐺": "wolf", "🦁": "lion", "🐉": "dragon",
  "🦅": "eagle", "🐙": "octopus", "🦈": "shark", "🐍": "snake", "🦎": "lizard",
  "🐻": "bear", "🐼": "panda", "🦇": "bat", "🐬": "dolphin", "🦋": "butterfly",
  "🐝": "bee", "🦜": "parrot", "🐘": "elephant", "🦔": "hedgehog", "🤖": "robot",
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, tooltip }: { icon?: string; title: string; tooltip?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {title}
        </span>
      </div>
      {tooltip && <HelpTooltip text={tooltip} />}
    </div>
  );
}

// ─── Radio card ───────────────────────────────────────────────────────────────

function RadioCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 14,
        background: selected ? "rgba(48,209,88,0.05)" : "rgba(255,255,255,0.03)",
        border: selected
          ? "1px solid rgba(48,209,88,0.45)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: selected
          ? "0 0 24px rgba(48,209,88,0.12), inset 0 1px 0 rgba(48,209,88,0.08)"
          : "none",
        cursor: "pointer",
        transition: "all 220ms ease",
        outline: "none",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: selected ? "2px solid #30d158" : "2px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "border-color 220ms ease",
        }}
      >
        {selected && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#30d158",
            }}
          />
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: BODY_SIZE,
            fontWeight: 600,
            color: selected ? "#30d158" : "rgba(255,255,255,0.85)",
            marginBottom: 3,
            transition: "color 220ms ease",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: META_SIZE,
            color: "rgba(255,255,255,0.40)",
            lineHeight: 1.45,
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}

// ─── Glass input ──────────────────────────────────────────────────────────────

function GlassInput({
  label,
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <label
          style={{
            fontSize: BODY_SIZE,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {label}
        </label>
        {error && (
          <span
            style={{
              fontSize: LABEL_SIZE,
              color: "rgba(255,69,58,0.70)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontWeight: 600,
            }}
          >
            {error}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.92)",
          fontSize: BODY_SIZE,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          outline: "none",
          transition: "border-color 180ms ease, box-shadow 180ms ease",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(10,132,255,0.50)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,132,255,0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

// ─── Avatar picker ────────────────────────────────────────────────────────────

function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Compute fixed position above trigger when opening
  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => {
      const next = !prev;
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // 4 rows * 48px + 12px*2 padding ≈ 220px height
        const dropdownHeight = 220;
        setPos({
          top: rect.top - dropdownHeight - 8,
          left: rect.right - 250,
        });
      }
      return next;
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Also check if click is inside the portal dropdown
        const dropdown = document.getElementById("avatar-dropdown-portal");
        if (dropdown && dropdown.contains(e.target as Node)) return;
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontSize: BODY_SIZE,
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          marginBottom: 8,
        }}
      >
        Avatar Symbol
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AVATAR_INLINE.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onChange(emoji); setDropdownOpen(false); }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              background: value === emoji ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.04)",
              border: value === emoji
                ? "2px solid rgba(48,209,88,0.50)"
                : "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              transition: "all 180ms ease",
              transform: value === emoji ? "scale(1.08)" : "scale(1)",
              outline: "none",
            }}
          >
            {emoji}
          </button>
        ))}
        <button
          ref={triggerRef}
          onClick={toggleDropdown}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            background: dropdownOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            border: dropdownOpen
              ? "1px solid rgba(255,255,255,0.15)"
              : "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.40)",
            cursor: "pointer",
            outline: "none",
            fontWeight: 700,
            transition: "all 180ms ease",
          }}
        >
          ...
        </button>
      </div>

      {/* Dropdown grid — portaled to document.body to escape backdrop-filter stacking context */}
      {dropdownOpen && pos && createPortal(
        <div
          id="avatar-dropdown-portal"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: "rgba(30,30,35,0.97)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 -12px 48px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.04)",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
            width: 250,
          }}
        >
          {AVATAR_ALL.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onChange(emoji); setDropdownOpen(false); }}
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                background: value === emoji ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.04)",
                border: value === emoji
                  ? "2px solid rgba(48,209,88,0.50)"
                  : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
                transition: "all 150ms ease",
                outline: "none",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Step indicator (left sidebar) ────────────────────────────────────────────

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div style={{ ...panelStyle, padding: 20 }}>
      <div
        style={{
          fontSize: LABEL_SIZE,
          fontWeight: 700,
          color: "rgba(255,255,255,0.40)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 24,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        }}
      >
        Creation Progress
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((step, i) => {
          const num = i + 1;
          const isActive = num === currentStep;
          const isCompleted = num < currentStep;
          const isFuture = num > currentStep;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={num}>
              <button
                onClick={() => isCompleted && onStepClick(num)}
                disabled={isFuture}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 0",
                  background: "none",
                  border: "none",
                  cursor: isCompleted ? "pointer" : "default",
                  outline: "none",
                  opacity: isFuture ? 0.4 : 1,
                  transition: "opacity 220ms ease",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: isCompleted ? 13 : 12,
                    fontWeight: 700,
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    background: isActive
                      ? "#30d158"
                      : isCompleted
                      ? "rgba(48,209,88,0.15)"
                      : "rgba(255,255,255,0.06)",
                    color: isActive
                      ? "#000"
                      : isCompleted
                      ? "#30d158"
                      : "rgba(255,255,255,0.30)",
                    border: isActive
                      ? "none"
                      : isCompleted
                      ? "1px solid rgba(48,209,88,0.30)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isActive ? "0 0 16px rgba(48,209,88,0.35)" : "none",
                    transition: "all 280ms ease",
                  }}
                >
                  {isCompleted ? "✓" : num}
                </div>
                <div style={{ paddingTop: 2 }}>
                  <div
                    style={{
                      fontSize: BODY_SIZE,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive
                        ? "rgba(255,255,255,0.92)"
                        : isCompleted
                        ? "rgba(255,255,255,0.70)"
                        : "rgba(255,255,255,0.35)",
                      transition: "color 220ms ease",
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: LABEL_SIZE,
                      color: isActive ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.20)",
                      marginTop: 1,
                    }}
                  >
                    {step.subtitle}
                  </div>
                </div>
              </button>
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    height: 20,
                    marginLeft: 13,
                    background: isCompleted ? "rgba(48,209,88,0.30)" : "rgba(255,255,255,0.06)",
                    transition: "background 220ms ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Basic Identity ───────────────────────────────────────────────────

function StepBasicIdentity({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={panelStyle}>
        <SectionHeader icon="🏷️" title="Identity Configuration" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "start",
          }}
        >
          <GlassInput
            label="Designation / Name"
            placeholder="e.g. Tiger the Fast"
            value={config.name}
            onChange={(v) => onChange({ name: v })}
            error={config.name.trim().length === 0 ? "Name required" : undefined}
          />
          <AvatarPicker
            value={config.avatar}
            onChange={(v) => onChange({ avatar: v })}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={panelStyle}>
          <SectionHeader icon="🧬" title="Agent Personality" tooltip="Is your AI Agent a careful player or a bold risk-taker with your money?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.personality === "guardian"}
              title="Careful Guardian"
              description="Prioritizes capital preservation, strictly limits downside risk."
              onClick={() => onChange({ personality: "guardian" })}
            />
            <RadioCard
              selected={config.personality === "balanced"}
              title="Balanced Trader"
              description="Optimal risk/reward ratio, moderate exposure."
              onClick={() => onChange({ personality: "balanced" })}
            />
            <RadioCard
              selected={config.personality === "adventurer"}
              title="Bold Adventurer"
              description="Max yields, high volatility tolerance, accepts larger drawdowns."
              onClick={() => onChange({ personality: "adventurer" })}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionHeader icon="✨" title="Decision Style" tooltip="Does your AI Agent act on gut feeling, deep research, or patience?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.decisionStyle === "gut"}
              title="Gut Instinct"
              description="Acts quickly on immediate market sentiment and momentum shifts."
              onClick={() => onChange({ decisionStyle: "gut" })}
            />
            <RadioCard
              selected={config.decisionStyle === "analyst"}
              title="Deep Analyst"
              description="Data-driven, relies heavily on complex technical indicators."
              onClick={() => onChange({ decisionStyle: "analyst" })}
            />
            <RadioCard
              selected={config.decisionStyle === "observer"}
              title="Patient Observer"
              description="Waits for high-probability setups, ignores market noise."
              onClick={() => onChange({ decisionStyle: "observer" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Trading Style ────────────────────────────────────────────────────

function StepTradingStyle({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Trading Instinct — 2x2 grid */}
      <div style={panelStyle}>
        <SectionHeader icon="✨" title="Trading Instinct" tooltip="What kind of money-making opportunities does your AI Agent chase?" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.tradingInstinct === "trend_chaser"}
            title="Trend Chaser"
            description="Follows momentum and established market directions."
            onClick={() => onChange({ tradingInstinct: "trend_chaser" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "reversal_spotter"}
            title="Reversal Spotter"
            description="Identifies exhaustion points and counter-trend opportunities."
            onClick={() => onChange({ tradingInstinct: "reversal_spotter" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "value_hunter"}
            title="Value Hunter"
            description="Looks for mispriced assets based on fundamental data."
            onClick={() => onChange({ tradingInstinct: "value_hunter" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "speed_demon"}
            title="Speed Demon"
            description="High-frequency scalping on micro-movements."
            onClick={() => onChange({ tradingInstinct: "speed_demon" })}
          />
        </div>
      </div>

      {/* Time Patience + Profit Dream — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={panelStyle}>
          <SectionHeader icon="⏱️" title="Time Patience" tooltip="Does your AI Agent make quick moves or wait days for the right moment?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.timePatience === "lightning"}
              title="Lightning Day Trader"
              description="seconds to minutes"
              onClick={() => onChange({ timePatience: "lightning" })}
            />
            <RadioCard
              selected={config.timePatience === "swing"}
              title="Swing Rider"
              description="hours to days"
              onClick={() => onChange({ timePatience: "swing" })}
            />
            <RadioCard
              selected={config.timePatience === "longterm"}
              title="Long-term Visionary"
              description="days to weeks"
              onClick={() => onChange({ timePatience: "longterm" })}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionHeader icon="📈" title="Profit Dream" tooltip="Do you prefer earning a little often or going for bigger but riskier wins?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.profitDream === "quick_wins"}
              title="Quick Wins"
              description="consistent small gains"
              onClick={() => onChange({ profitDream: "quick_wins" })}
            />
            <RadioCard
              selected={config.profitDream === "big_moves"}
              title="Big Moves"
              description="higher risk for major breakouts"
              onClick={() => onChange({ profitDream: "big_moves" })}
            />
            <RadioCard
              selected={config.profitDream === "wealth_builder"}
              title="Wealth Builder"
              description="steady compounding growth"
              onClick={() => onChange({ profitDream: "wealth_builder" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Risk & Money ─────────────────────────────────────────────────────

function StepRiskMoney({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Money Approach — 3 in a row */}
      <div style={panelStyle}>
        <SectionHeader icon="💰" title="Money Approach" tooltip="How much of your money goes into each trade — safe, smart, or all-in?" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.moneyApproach === "fixed_safe"}
            title="Fixed & Safe"
            description="Consistent position sizes for minimal variance."
            onClick={() => onChange({ moneyApproach: "fixed_safe" })}
          />
          <RadioCard
            selected={config.moneyApproach === "smart_scaling"}
            title="Smart Scaling"
            description="Adjusts size based on signal confidence and win streaks."
            onClick={() => onChange({ moneyApproach: "smart_scaling" })}
          />
          <RadioCard
            selected={config.moneyApproach === "aggressive"}
            title="Aggressive Sizer"
            description="Maximizes capital utilization on high-conviction trades."
            onClick={() => onChange({ moneyApproach: "aggressive" })}
          />
        </div>
      </div>

      {/* Protection Mindset + Leverage Vibe — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={panelStyle}>
          <SectionHeader icon="🔵" title="Protection Mindset" tooltip="How quickly your AI Agent stops a losing trade to protect your money" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.protectionMindset === "tight"}
              title="Tight Guardian"
              description="strict stops, low risk per trade"
              onClick={() => onChange({ protectionMindset: "tight" })}
            />
            <RadioCard
              selected={config.protectionMindset === "flexible"}
              title="Flexible"
              description="dynamic exits based on market volatility"
              onClick={() => onChange({ protectionMindset: "flexible" })}
            />
            <RadioCard
              selected={config.protectionMindset === "hands_off"}
              title="Hands-off"
              description="prioritizes profit-taking over defensive stops"
              onClick={() => onChange({ protectionMindset: "hands_off" })}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionHeader icon="⚡" title="Leverage Vibe" tooltip="Should your AI Agent borrow extra money to make bigger trades? More reward but more risk" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.leverageVibe === "none"}
              title="None"
              description="1x spot only"
              onClick={() => onChange({ leverageVibe: "none" })}
            />
            <RadioCard
              selected={config.leverageVibe === "moderate"}
              title="Moderate Power"
              description="2x - 5x controlled leverage"
              onClick={() => onChange({ leverageVibe: "moderate" })}
            />
            <RadioCard
              selected={config.leverageVibe === "full_throttle"}
              title="Full Throttle"
              description="high leverage for maximum potential"
              onClick={() => onChange({ leverageVibe: "full_throttle" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Market Preferences ───────────────────────────────────────────────

function StepPreferences({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Market Sense — 2 in a row */}
      <div style={panelStyle}>
        <SectionHeader icon="🟢" title="Market Sense" tooltip="Does your AI Agent follow strict math rules or also read news and social buzz?" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.marketSense === "fixed_rules"}
            title="Fixed Rules"
            description="Operates based on strict technical indicators and quantitative logic."
            onClick={() => onChange({ marketSense: "fixed_rules" })}
          />
          <RadioCard
            selected={config.marketSense === "mood_reader"}
            title="Mood Reader"
            description="Incorporates social sentiment, news analysis, and 'aura' research for a holistic view."
            onClick={() => onChange({ marketSense: "mood_reader" })}
          />
        </div>
      </div>

      {/* Asset Love — 2x2 grid */}
      <div style={panelStyle}>
        <SectionHeader icon="💎" title="Asset Love" tooltip="Pick what your AI Agent trades — stocks, currencies, crypto, or everything" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.assetLove === "stocks"}
            title="Stocks Fan"
            description="Specializes in equities and major indices."
            onClick={() => onChange({ assetLove: "stocks" })}
          />
          <RadioCard
            selected={config.assetLove === "forex"}
            title="Forex Pro"
            description="Focuses on global currency pairs and macro volatility."
            onClick={() => onChange({ assetLove: "forex" })}
          />
          <RadioCard
            selected={config.assetLove === "crypto"}
            title="Crypto Rebel"
            description="Expertise in digital assets, altcoins, and on-chain trends."
            onClick={() => onChange({ assetLove: "crypto" })}
          />
          <RadioCard
            selected={config.assetLove === "all_rounder"}
            title="All-Rounder"
            description="A versatile strategy across multiple asset classes for diversification."
            onClick={() => onChange({ assetLove: "all_rounder" })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Agent Deployment Reveal ──────────────────────────────────────────

const INSTINCT_LABELS: Record<string, string> = {
  trend_chaser: "Trend Chaser",
  reversal_spotter: "Reversal Spotter",
  value_hunter: "Value Hunter",
  speed_demon: "Speed Demon",
};
const SENSE_LABELS: Record<string, string> = {
  fixed_rules: "Fixed Rules",
  mood_reader: "Mood Reader",
};
const ASSET_LABELS: Record<string, string> = {
  stocks: "Stocks",
  forex: "Forex",
  crypto: "Crypto",
  all_rounder: "Multi-Asset",
};
const MONEY_LABELS: Record<string, string> = {
  fixed_safe: "Fixed & Safe",
  smart_scaling: "Smart Scaling",
  aggressive: "Aggressive",
};

function StepLaunch({
  config,
  isDeploying,
  privateKeySecured,
  walletAddress,
  isGeneratingWallet,
  walletError,
  onSecureKey,
  onDeploy,
}: {
  config: AgentConfig;
  isDeploying: boolean;
  privateKeySecured: boolean;
  walletAddress: string | null;
  isGeneratingWallet: boolean;
  walletError: string | null;
  onSecureKey: () => void;
  onDeploy: () => void;
}) {
  const agentId = useMemo(() => {
    const num = Math.floor(Math.random() * 900 + 100);
    return `Q-AGENT-X${num}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.name]);

  const displayName = config.name || "Unnamed Agent";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      {/* Ready badge */}
      <div
        style={{
          padding: "6px 18px",
          borderRadius: 20,
          background: "rgba(48,209,88,0.10)",
          border: "1px solid rgba(48,209,88,0.30)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#30d158",
            boxShadow: "0 0 8px rgba(48,209,88,0.50)",
          }}
        />
        <span
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "#30d158",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          Ready for Deployment
        </span>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.02em",
          }}
        >
          Agent Deployment Reveal
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: BODY_SIZE,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Finalize your AI Trading Agent setup.
        </p>
      </div>

      {/* Agent avatar card */}
      <div
        style={{
          ...panelStyle,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 24px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow backdrop */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 200,
            height: 140,
            background: "radial-gradient(ellipse, rgba(48,209,88,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(48,209,88,0.12), rgba(10,132,255,0.08))",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
            marginBottom: 16,
            position: "relative",
            boxShadow: "0 8px 40px rgba(48,209,88,0.12)",
          }}
        >
          {config.avatar}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 4,
          }}
        >
          {displayName}
        </div>
        <span
          style={{
            fontSize: META_SIZE,
            fontWeight: 600,
            color: "#30d158",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.06em",
          }}
        >
          {agentId}
        </span>
      </div>

      {/* Strategy DNA */}
      <div style={{ ...panelStyle, width: "100%" }}>
        <SectionHeader icon="🧬" title="Strategy DNA" />
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "rgba(255,255,255,0.70)",
            lineHeight: 1.65,
          }}
        >
          A high-conviction{" "}
          <strong style={{ color: "rgba(255,255,255,0.92)" }}>
            {INSTINCT_LABELS[config.tradingInstinct]}
          </strong>{" "}
          with a{" "}
          <strong style={{ color: "rgba(255,255,255,0.92)" }}>
            {SENSE_LABELS[config.marketSense]}
          </strong>{" "}
          sentiment lens, specialized in{" "}
          <strong style={{ color: "rgba(255,255,255,0.92)" }}>
            {ASSET_LABELS[config.assetLove]}
          </strong>{" "}
          markets with an{" "}
          <strong style={{ color: "rgba(255,255,255,0.92)" }}>
            {MONEY_LABELS[config.moneyApproach]} Money Approach
          </strong>
          .
        </p>
      </div>

      {/* Assigned WDK Wallet */}
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: BODY_SIZE,
              color: "rgba(255,255,255,0.50)",
            }}
          >
            Assigned WDK Wallet
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: walletAddress ? "#30d158" : isGeneratingWallet ? "#ff9f0a" : "#ff453a",
              }}
            />
            <span
              style={{
                fontSize: LABEL_SIZE,
                color: walletAddress ? "#30d158" : isGeneratingWallet ? "#ff9f0a" : "#ff453a",
                fontWeight: 600,
              }}
            >
              {walletAddress ? "Live" : isGeneratingWallet ? "Generating..." : "Error"}
            </span>
          </div>
        </div>
        <div
          style={{
            ...panelStyle,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🔐
            </div>
            <span
              style={{
                fontSize: BODY_SIZE,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {isGeneratingWallet
                ? "Generating wallet..."
                : walletAddress
                  ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}`
                  : walletError ?? "Failed to generate"}
            </span>
          </div>
          {walletAddress && (
            <button
              onClick={() => navigator.clipboard?.writeText(walletAddress)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "rgba(255,255,255,0.30)",
                fontSize: 16,
                outline: "none",
              }}
              title="Copy address"
            >
              📋
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(255,255,255,0.06)",
        }}
      />

      {/* Download Private Key button */}
      <button
        onClick={onSecureKey}
        disabled={privateKeySecured || !walletAddress || isGeneratingWallet}
        style={{
          width: "100%",
          padding: "14px 24px",
          borderRadius: 14,
          background: privateKeySecured
            ? "rgba(10,132,255,0.15)"
            : !walletAddress || isGeneratingWallet
              ? "rgba(255,255,255,0.04)"
              : "rgba(10,132,255,0.85)",
          border: privateKeySecured
            ? "1px solid rgba(10,132,255,0.30)"
            : "none",
          color: privateKeySecured
            ? "rgba(10,132,255,0.60)"
            : !walletAddress || isGeneratingWallet
              ? "rgba(255,255,255,0.20)"
              : "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: privateKeySecured || !walletAddress || isGeneratingWallet ? "default" : "pointer",
          transition: "all 220ms ease",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {privateKeySecured ? "✓ Private Key Secured" : "🔑 Download Private Key"}
      </button>

      {/* Deploy Agent button */}
      <button
        onClick={onDeploy}
        disabled={!privateKeySecured || isDeploying}
        style={{
          width: "100%",
          padding: "14px 24px",
          borderRadius: 14,
          background:
            !privateKeySecured || isDeploying
              ? "rgba(255,255,255,0.04)"
              : "#30d158",
          border: `1px solid ${
            !privateKeySecured || isDeploying
              ? "rgba(255,255,255,0.06)"
              : "rgba(48,209,88,0.50)"
          }`,
          color:
            !privateKeySecured || isDeploying
              ? "rgba(255,255,255,0.20)"
              : "#000",
          fontSize: 15,
          fontWeight: 700,
          cursor: !privateKeySecured || isDeploying ? "not-allowed" : "pointer",
          transition: "all 220ms ease",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow:
            privateKeySecured && !isDeploying
              ? "0 0 24px rgba(48,209,88,0.20)"
              : "none",
        }}
      >
        🚀 {isDeploying ? "Deploying..." : "Deploy Agent"}
      </button>

      {/* Info note */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 4px",
        }}
      >
        <span style={{ fontSize: 12 }}>ℹ️</span>
        <span
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          Download and secure your private key before deployment. This is your only copy — Quantik never stores it.
        </span>
      </div>
    </div>
  );
}

// ─── Step headers & next labels ───────────────────────────────────────────────

const STEP_HEADERS: Record<number, { title: string; description: string }> = {
  1: {
    title: "Initialize New Agent",
    description: "Define the core identity and behavioral parameters of your trading construct.",
  },
  2: {
    title: "Trading Style",
    description: "Define how your agent identifies and captures market opportunities.",
  },
  3: {
    title: "Risk & Money",
    description: "Establish the capital allocation strategy and safety boundaries for your agent.",
  },
  4: {
    title: "Market Preferences",
    description: "Specify how your agent interprets market sentiment and which asset classes it specializes in.",
  },
  5: {
    title: "Agent Deployment Reveal",
    description: "Finalize your AI Trading Agent setup.",
  },
};

const NEXT_LABELS: Record<number, string> = {
  1: "Continue to Strategy",
  2: "Continue to Risk & Money",
  3: "Continue to Preferences",
  4: "Launch your agent",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentFactoryPage() {
  const router = useRouter();
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [privateKeySecured, setPrivateKeySecured] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // WDK wallet state — private key & seed only live in memory, never persisted
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletPrivateKey, setWalletPrivateKey] = useState<string | null>(null);
  const [walletSeedPhrase, setWalletSeedPhrase] = useState<string | null>(null);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [agentLimitToast, setAgentLimitToast] = useState<string | null>(null);

  const jsConfettiRef = useRef<JSConfetti | null>(null);
  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => { jsConfettiRef.current = null; };
  }, []);

  // ── Check if user already has an agent — redirect if so ────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMyAgent();
        if (data && (data as Record<string, unknown>).id && (data as Record<string, unknown>).status !== "terminated" && !cancelled) {
          setAgentLimitToast("You already have an agent. Delete it first from Manage Agent.");
          setTimeout(() => { if (!cancelled) router.push("/manage-agent"); }, 2500);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const updateConfig = useCallback(
    (updates: Partial<AgentConfig>) => setConfig((prev) => ({ ...prev, ...updates })),
    []
  );

  const isStepValid = useMemo(() => {
    switch (step) {
      case 1:
        return config.name.trim().length > 0;
      default:
        return true;
    }
  }, [step, config.name]);

  const handleNext = useCallback(() => {
    if (step < 5 && isStepValid) setStep((s) => s + 1);
  }, [step, isStepValid]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  const handleSkipRandomize = useCallback(() => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const names = ["Shadow Fang", "Neon Pulse", "Iron Claw", "Volt Runner", "Storm Eye", "Pixel Drift", "Blaze Core", "Frost Bite", "Echo Wave", "Turbo Rex"];
    setConfig({
      name: pick(names),
      avatar: pick(AVATAR_ALL),
      personality: pick(["guardian", "balanced", "adventurer"] as const),
      decisionStyle: pick(["gut", "analyst", "observer"] as const),
      tradingInstinct: pick(["trend_chaser", "reversal_spotter", "value_hunter", "speed_demon"] as const),
      timePatience: pick(["lightning", "swing", "longterm"] as const),
      profitDream: pick(["quick_wins", "big_moves", "wealth_builder"] as const),
      moneyApproach: pick(["fixed_safe", "smart_scaling", "aggressive"] as const),
      protectionMindset: pick(["tight", "flexible", "hands_off"] as const),
      leverageVibe: pick(["none", "moderate", "full_throttle"] as const),
      marketSense: pick(["fixed_rules", "mood_reader"] as const),
      assetLove: pick(["stocks", "forex", "crypto", "all_rounder"] as const),
    });
    setStep(5);
  }, []);

  // Generate WDK wallet when entering Step 5
  useEffect(() => {
    if (step !== 5 || walletAddress) return;
    let cancelled = false;
    setIsGeneratingWallet(true);
    setWalletError(null);
    fetch(`${BASE_URL}/api/wallet/generate`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { address: string; privateKey: string; seedPhrase: string }) => {
        if (cancelled) return;
        setWalletAddress(data.address);
        setWalletPrivateKey(data.privateKey);
        setWalletSeedPhrase(data.seedPhrase);
      })
      .catch((err) => {
        if (cancelled) return;
        setWalletError(err instanceof Error ? err.message : "Failed to generate wallet");
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingWallet(false);
      });
    return () => { cancelled = true; };
  }, [step, walletAddress]);

  const handleSecureKey = useCallback(() => {
    if (!walletAddress || !walletPrivateKey || !walletSeedPhrase) return;
    const now = new Date().toISOString();
    const content = [
      "# Quantik Agent Wallet — KEEP THIS FILE SECURE",
      `# Agent: ${config.name}`,
      `# Generated: ${now}`,
      "# WARNING: This is your only copy. Quantik does NOT store your private key.",
      "",
      `Wallet Address: ${walletAddress}`,
      `Private Key: ${walletPrivateKey}`,
      `Seed Phrase: ${walletSeedPhrase}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantik-agent-${config.name.toLowerCase().replace(/\s+/g, "-") || "unnamed"}-key.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setPrivateKeySecured(true);
    // Clear sensitive data from memory after download
    setWalletPrivateKey(null);
    setWalletSeedPhrase(null);
  }, [config.name, walletAddress, walletPrivateKey, walletSeedPhrase]);

  const handleGenerate = useCallback(async () => {
    const animal = EMOJI_TO_ANIMAL[config.avatar] || "fox";
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/relay/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animal }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (data.image) {
        setGeneratedImage(data.image);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [config.avatar]);

  const handleDeploy = useCallback(async () => {
    if (!walletAddress) return;
    jsConfettiRef.current?.addConfetti({ emojis: [config.avatar], emojiSize: 60, confettiNumber: 40 });
    setIsDeploying(true);
    setDeployError(null);
    try {
      const agentData = await api.createAgent({
        name: config.name,
        avatar: config.avatar,
        animalType: EMOJI_TO_ANIMAL[config.avatar] || "fox",
        generatedImage,
        wallet_address: walletAddress,
        personality: config.personality,
        decisionStyle: config.decisionStyle,
        tradingInstinct: config.tradingInstinct,
        timePatience: config.timePatience,
        profitDream: config.profitDream,
        moneyApproach: config.moneyApproach,
        protectionMindset: config.protectionMindset,
        leverageVibe: config.leverageVibe,
        marketSense: config.marketSense,
        assetLove: config.assetLove,
      });
      setMyAgent(agentData as unknown as MyAgent);
      router.push("/manage-agent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to deploy agent";
      if (msg.includes("409")) {
        setAgentLimitToast("You already have an agent. Delete it first from Manage Agent.");
        setTimeout(() => router.push("/manage-agent"), 2500);
        return;
      }
      setDeployError(msg);
    } finally {
      setIsDeploying(false);
    }
  }, [config, walletAddress, generatedImage, router, setMyAgent]);

  const header = STEP_HEADERS[step];
  const isLaunchStep = step === 5;

  return (
    <>
    {/* Agent limit toast */}
    {agentLimitToast && (
      <div
        style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          padding: "12px 24px",
          borderRadius: 12,
          background: "rgba(255,159,10,0.18)",
          border: "1px solid rgba(255,159,10,0.35)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          color: "#ff9f0a",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          letterSpacing: "0.03em",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        ⚠ {agentLimitToast}
      </div>
    )}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: 1100,
        minHeight: "calc(100vh - 120px)",
      }}
    >
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "rgba(255,255,255,0.92)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            letterSpacing: "0.06em",
          }}
        >
          AGENT FACTORY
        </span>
      </div>

      {/* ── Content row ─────────────────────────────────────────────────────── */}
      <div
        style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}
        className="flex-col md:flex-row"
      >
        {/* Left: Step indicator (desktop) — hidden on path selection */}
        {step > 0 && (
          <div style={{ width: 260, flexShrink: 0 }} className="hidden md:block">
            <div style={{ position: "sticky", top: 72 }}>
              <StepIndicator currentStep={step} onStepClick={setStep} />
            </div>
          </div>
        )}

        {/* Mobile step progress bar — hidden on path selection */}
        {step > 0 && (
          <div className="flex md:hidden" style={{ gap: 6, marginBottom: 8 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i + 1 <= step ? "#30d158" : "rgba(255,255,255,0.08)",
                  transition: "background 220ms ease",
                }}
              />
            ))}
          </div>
        )}

        {/* Right: Step content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Step title — hidden on step 0 (path selection) and step 5 (has its own header) */}
          {step > 0 && !isLaunchStep && (
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  letterSpacing: "-0.01em",
                }}
              >
                {header.title}
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: BODY_SIZE,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.5,
                }}
              >
                {header.description}
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {step === 0 && (
                <div style={{ maxWidth: 720, margin: "0 auto" }}>
                  <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.92)",
                        letterSpacing: "-0.01em",
                        marginBottom: 8,
                      }}
                    >
                      Choose Your Path
                    </h1>
                    <p
                      style={{
                        margin: 0,
                        fontSize: BODY_SIZE,
                        color: "rgba(255,255,255,0.45)",
                        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      }}
                    >
                      Create a new agent from scratch, or connect your own OpenClaw agent.
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="!grid-cols-1 sm:!grid-cols-2">
                    {/* Create from Scratch */}
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        ...panelStyle,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 220ms ease",
                        outline: "none",
                        minHeight: 220,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(48,209,88,0.35)";
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(48,209,88,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ fontSize: 36 }}>🧪</div>
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.92)",
                            marginBottom: 6,
                          }}
                        >
                          Create from Scratch
                        </div>
                        <div
                          style={{
                            fontSize: META_SIZE,
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.5,
                            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                          }}
                        >
                          Configure personality, trading style, and risk tolerance through a guided 5-step wizard
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#30d158",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158" }} />
                        5-STEP WIZARD
                      </div>
                    </button>

                    {/* Bring Your Own Agent */}
                    <button
                      onClick={() => router.push("/agent-factory/byo")}
                      style={{
                        ...panelStyle,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 220ms ease",
                        outline: "none",
                        minHeight: 220,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(10,132,255,0.35)";
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(10,132,255,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ fontSize: 36 }}>🦞</div>
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.92)",
                            marginBottom: 6,
                          }}
                        >
                          Bring Your Own OpenClaw Agent
                        </div>
                        <div
                          style={{
                            fontSize: META_SIZE,
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.5,
                            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                          }}
                        >
                          Connect your external AI agent to Quantik&apos;s tools, pipeline, and trading infrastructure via API
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#0a84ff",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a84ff" }} />
                        OPENCLAW COMPATIBLE
                      </div>
                    </button>
                  </div>
                </div>
              )}
              {step === 1 && <StepBasicIdentity config={config} onChange={updateConfig} />}
              {step === 2 && <StepTradingStyle config={config} onChange={updateConfig} />}
              {step === 3 && <StepRiskMoney config={config} onChange={updateConfig} />}
              {step === 4 && <StepPreferences config={config} onChange={updateConfig} />}
              {step === 5 && (
                <StepLaunch
                  config={config}
                  isDeploying={isDeploying}
                  privateKeySecured={privateKeySecured}
                  walletAddress={walletAddress}
                  isGeneratingWallet={isGeneratingWallet}
                  walletError={walletError}
                  onSecureKey={handleSecureKey}
                  onDeploy={handleDeploy}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer bar ──────────────────────────────────────────────────────── */}
      {step > 0 && !isLaunchStep && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            marginTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: BODY_SIZE,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 180ms ease",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleSkipRandomize}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "none",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.50)",
                fontSize: BODY_SIZE,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 180ms ease",
                outline: "none",
              }}
            >
              Skip (Randomize)
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepValid}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                background: isStepValid ? "#30d158" : "rgba(255,255,255,0.06)",
                border: "none",
                color: isStepValid ? "#000" : "rgba(255,255,255,0.25)",
                fontSize: BODY_SIZE,
                fontWeight: 700,
                cursor: isStepValid ? "pointer" : "not-allowed",
                transition: "all 220ms ease",
                outline: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {NEXT_LABELS[step]} <span style={{ fontSize: 15 }}>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Deploy error */}
      {deployError && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.20)",
            fontSize: META_SIZE,
            color: "#ff453a",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          ✗ {deployError}
        </div>
      )}
    </div>
    </>
  );
}
