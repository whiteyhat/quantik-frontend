"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useNextStep } from "nextstepjs";
import { SectionHeader, panelStyle, LABEL_SIZE, META_SIZE, BODY_SIZE } from "@/components/agent-factory/shared";
import { WalletFoundryLoader } from "@/components/agent-factory/WalletFoundryLoader";
import JSConfetti from "js-confetti";
import { api } from "@/lib/api";
import { buildWalletDownloadContent } from "@/lib/agentFactory";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";
import { useTranslations } from "next-intl";
import {
  completeFactoryTour,
  requestProductTourResume,
} from "@/hooks/useOnboardingTourState";

// ─── Style constants ──────────────────────────────────────────────────────────

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
  leverageVibe: "none";
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
  leverageVibe: "none",
  marketSense: "fixed_rules",
  assetLove: "crypto",
};

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
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
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
        {label ?? "Avatar Symbol"}
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
  const t = useTranslations("agentFactory");

  const stepKeys = [
    { titleKey: "steps.basicIdentity" as const, descKey: "steps.basicIdentityDesc" as const },
    { titleKey: "steps.tradingStyle" as const, descKey: "steps.tradingStyleDesc" as const },
    { titleKey: "steps.riskMoney" as const, descKey: "steps.riskMoneyDesc" as const },
    { titleKey: "steps.preferences" as const, descKey: "steps.preferencesDesc" as const },
    { titleKey: "steps.launchAgent" as const, descKey: "steps.launchAgentDesc" as const },
  ];

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
        {t("creationProgress")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {stepKeys.map((stepDef, i) => {
          const num = i + 1;
          const isActive = num === currentStep;
          const isCompleted = num < currentStep;
          const isFuture = num > currentStep;
          const isLast = i === stepKeys.length - 1;

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
                    {t(stepDef.titleKey)}
                  </div>
                  <div
                    style={{
                      fontSize: LABEL_SIZE,
                      color: isActive ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.20)",
                      marginTop: 1,
                    }}
                  >
                    {t(stepDef.descKey)}
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
  const t = useTranslations("agentFactory");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div id="tour-wizard-name" style={panelStyle}>
        <SectionHeader icon="🏷️" title={t("identity.sectionTitle")} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "start",
          }}
        >
          <GlassInput
            label={t("identity.nameLabel")}
            placeholder={t("identity.namePlaceholder")}
            value={config.name}
            onChange={(v) => onChange({ name: v })}
            error={config.name.trim().length === 0 ? t("identity.nameRequired") : undefined}
          />
          <AvatarPicker
            value={config.avatar}
            onChange={(v) => onChange({ avatar: v })}
            label={t("identity.avatarLabel")}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div id="tour-wizard-personality" style={panelStyle}>
          <SectionHeader icon="🧬" title={t("identity.personalityTitle")} tooltip={t("identity.personalityTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.personality === "guardian"}
              title={t("identity.guardianTitle")}
              description={t("identity.guardianDesc")}
              onClick={() => onChange({ personality: "guardian" })}
            />
            <RadioCard
              selected={config.personality === "balanced"}
              title={t("identity.balancedTitle")}
              description={t("identity.balancedDesc")}
              onClick={() => onChange({ personality: "balanced" })}
            />
            <RadioCard
              selected={config.personality === "adventurer"}
              title={t("identity.adventurerTitle")}
              description={t("identity.adventurerDesc")}
              onClick={() => onChange({ personality: "adventurer" })}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionHeader icon="✨" title={t("identity.decisionTitle")} tooltip={t("identity.decisionTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.decisionStyle === "gut"}
              title={t("identity.gutTitle")}
              description={t("identity.gutDesc")}
              onClick={() => onChange({ decisionStyle: "gut" })}
            />
            <RadioCard
              selected={config.decisionStyle === "analyst"}
              title={t("identity.analystTitle")}
              description={t("identity.analystDesc")}
              onClick={() => onChange({ decisionStyle: "analyst" })}
            />
            <RadioCard
              selected={config.decisionStyle === "observer"}
              title={t("identity.observerTitle")}
              description={t("identity.observerDesc")}
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
  const t = useTranslations("agentFactory");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Trading Instinct — 2x2 grid */}
      <div id="tour-wizard-instinct" style={panelStyle}>
        <SectionHeader icon="✨" title={t("trading.instinctTitle")} tooltip={t("trading.instinctTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.tradingInstinct === "trend_chaser"}
            title={t("trading.trendTitle")}
            description={t("trading.trendDesc")}
            onClick={() => onChange({ tradingInstinct: "trend_chaser" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "reversal_spotter"}
            title={t("trading.reversalTitle")}
            description={t("trading.reversalDesc")}
            onClick={() => onChange({ tradingInstinct: "reversal_spotter" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "value_hunter"}
            title={t("trading.valueTitle")}
            description={t("trading.valueDesc")}
            onClick={() => onChange({ tradingInstinct: "value_hunter" })}
          />
          <RadioCard
            selected={config.tradingInstinct === "speed_demon"}
            title={t("trading.speedTitle")}
            description={t("trading.speedDesc")}
            onClick={() => onChange({ tradingInstinct: "speed_demon" })}
          />
        </div>
      </div>

      {/* Time Patience + Profit Dream — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={panelStyle}>
          <SectionHeader icon="⏱️" title={t("trading.patienceTitle")} tooltip={t("trading.patienceTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.timePatience === "lightning"}
              title={t("trading.lightningTitle")}
              description={t("trading.lightningDesc")}
              onClick={() => onChange({ timePatience: "lightning" })}
            />
            <RadioCard
              selected={config.timePatience === "swing"}
              title={t("trading.swingTitle")}
              description={t("trading.swingDesc")}
              onClick={() => onChange({ timePatience: "swing" })}
            />
            <RadioCard
              selected={config.timePatience === "longterm"}
              title={t("trading.longtermTitle")}
              description={t("trading.longtermDesc")}
              onClick={() => onChange({ timePatience: "longterm" })}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionHeader icon="📈" title={t("trading.profitTitle")} tooltip={t("trading.profitTooltip")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioCard
              selected={config.profitDream === "quick_wins"}
              title={t("trading.quickWinsTitle")}
              description={t("trading.quickWinsDesc")}
              onClick={() => onChange({ profitDream: "quick_wins" })}
            />
            <RadioCard
              selected={config.profitDream === "big_moves"}
              title={t("trading.bigMovesTitle")}
              description={t("trading.bigMovesDesc")}
              onClick={() => onChange({ profitDream: "big_moves" })}
            />
            <RadioCard
              selected={config.profitDream === "wealth_builder"}
              title={t("trading.wealthTitle")}
              description={t("trading.wealthDesc")}
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
  const t = useTranslations("agentFactory");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Money Approach — 3 in a row */}
      <div id="tour-wizard-money" style={panelStyle}>
        <SectionHeader icon="💰" title={t("risk.moneyTitle")} tooltip={t("risk.moneyTooltip")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.moneyApproach === "fixed_safe"}
            title={t("risk.fixedTitle")}
            description={t("risk.fixedDesc")}
            onClick={() => onChange({ moneyApproach: "fixed_safe" })}
          />
          <RadioCard
            selected={config.moneyApproach === "smart_scaling"}
            title={t("risk.scalingTitle")}
            description={t("risk.scalingDesc")}
            onClick={() => onChange({ moneyApproach: "smart_scaling" })}
          />
          <RadioCard
            selected={config.moneyApproach === "aggressive"}
            title={t("risk.aggressiveTitle")}
            description={t("risk.aggressiveDesc")}
            onClick={() => onChange({ moneyApproach: "aggressive" })}
          />
        </div>
      </div>

      {/* Protection Mindset */}
      <div style={panelStyle}>
        <SectionHeader icon="🔵" title={t("risk.protectionTitle")} tooltip={t("risk.protectionTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.protectionMindset === "tight"}
            title={t("risk.tightTitle")}
            description={t("risk.tightDesc")}
            onClick={() => onChange({ protectionMindset: "tight" })}
          />
          <RadioCard
            selected={config.protectionMindset === "flexible"}
            title={t("risk.flexibleTitle")}
            description={t("risk.flexibleDesc")}
            onClick={() => onChange({ protectionMindset: "flexible" })}
          />
          <RadioCard
            selected={config.protectionMindset === "hands_off"}
            title={t("risk.handsOffTitle")}
            description={t("risk.handsOffDesc")}
            onClick={() => onChange({ protectionMindset: "hands_off" })}
          />
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
  const t = useTranslations("agentFactory");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Market Sense — 2 in a row */}
      <div id="tour-wizard-sense" style={panelStyle}>
        <SectionHeader icon="🟢" title={t("prefs.senseTitle")} tooltip={t("prefs.senseTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.marketSense === "fixed_rules"}
            title={t("prefs.fixedRulesTitle")}
            description={t("prefs.fixedRulesDesc")}
            onClick={() => onChange({ marketSense: "fixed_rules" })}
          />
          <RadioCard
            selected={config.marketSense === "mood_reader"}
            title={t("prefs.moodTitle")}
            description={t("prefs.moodDesc")}
            onClick={() => onChange({ marketSense: "mood_reader" })}
          />
        </div>
      </div>

      {/* Asset Love — 2x2 grid */}
      <div style={panelStyle}>
        <SectionHeader icon="💎" title={t("prefs.assetTitle")} tooltip={t("prefs.assetTooltip", { name: config.name.trim() || t("yourAiAgent") })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <RadioCard
            selected={config.assetLove === "stocks"}
            title={t("prefs.stocksTitle")}
            description={t("prefs.stocksDesc")}
            onClick={() => onChange({ assetLove: "stocks" })}
          />
          <RadioCard
            selected={config.assetLove === "forex"}
            title={t("prefs.forexTitle")}
            description={t("prefs.forexDesc")}
            onClick={() => onChange({ assetLove: "forex" })}
          />
          <RadioCard
            selected={config.assetLove === "crypto"}
            title={t("prefs.cryptoTitle")}
            description={t("prefs.cryptoDesc")}
            onClick={() => onChange({ assetLove: "crypto" })}
          />
          <RadioCard
            selected={config.assetLove === "all_rounder"}
            title={t("prefs.allRounderTitle")}
            description={t("prefs.allRounderDesc")}
            onClick={() => onChange({ assetLove: "all_rounder" })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Agent Deployment Reveal ──────────────────────────────────────────

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
  const t = useTranslations("agentFactory");
  const agentId = useMemo(() => {
    const num = Math.floor(Math.random() * 900 + 100);
    return `Q-AGENT-X${num}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.name]);

  const displayName = config.name || t("launch.unnamedAgent");
  const walletLoaderHighlights = [
    { label: t("launch.foundry.highlights.agent"), value: displayName },
    { label: t("launch.foundry.highlights.instinct"), value: t(`launch.instinctLabels.${config.tradingInstinct}` as const) },
    { label: t("launch.foundry.highlights.market"), value: t(`launch.assetLabels.${config.assetLove}` as const) },
    { label: t("launch.foundry.highlights.money"), value: t(`launch.moneyLabels.${config.moneyApproach}` as const) },
  ];

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
          {t("launch.readyBadge")}
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
          {t("launch.title")}
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: BODY_SIZE,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {t("launch.subtitle")}
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
        <SectionHeader icon="🧬" title={t("launch.strategyDna")} />
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "rgba(255,255,255,0.70)",
            lineHeight: 1.65,
          }}
        >
          {t.rich("launch.strategyDesc", {
            instinct: t(`launch.instinctLabels.${config.tradingInstinct}` as const),
            sense: t(`launch.senseLabels.${config.marketSense}` as const),
            asset: t(`launch.assetLabels.${config.assetLove}` as const),
            money: t(`launch.moneyLabels.${config.moneyApproach}` as const),
            strong: (chunks) => <strong style={{ color: "rgba(255,255,255,0.92)" }}>{chunks}</strong>,
          })}
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
            {t("launch.walletLabel")}
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
              {walletAddress ? t("launch.walletLive") : isGeneratingWallet ? t("launch.walletGenerating") : t("launch.walletError")}
            </span>
          </div>
        </div>
        {isGeneratingWallet ? (
          <WalletFoundryLoader
            badge={t("launch.foundry.badge")}
            title={t("launch.foundry.title")}
            subtitle={t("launch.foundry.subtitle", { name: displayName })}
            statusLabel={t("launch.walletGenerating")}
            accentEmoji={config.avatar}
            tone="emerald"
            orbitLabels={["WDK", "Vault", "Launch"]}
            phases={[
              t("launch.foundry.phases.provision"),
              t("launch.foundry.phases.mint"),
              t("launch.foundry.phases.encrypt"),
              t("launch.foundry.phases.stage"),
            ]}
            highlights={walletLoaderHighlights}
            distractions={[
              t("launch.foundry.distractions.signals", { name: displayName }),
              t("launch.foundry.distractions.backup"),
              t("launch.foundry.distractions.approvals"),
            ]}
            distractionLabel={t("launch.foundry.distractionLabel")}
            note={t("launch.keyBackupNote")}
            sceneHeight={332}
          />
        ) : (
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
                {walletAddress
                  ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}`
                  : walletError ?? t("launch.walletFailed")}
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
                title={t("launch.copyAddress")}
              >
                📋
              </button>
            )}
          </div>
        )}
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
        {privateKeySecured ? "✓ " + t("launch.keySecured") : "🔑 " + t("launch.downloadKey")}
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
        🚀 {isDeploying ? t("launch.deploying") : t("launch.deployAgent")}
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
          {t("launch.keyBackupNote")}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentFactoryPage() {
  const router = useRouter();
  const { closeNextStep } = useNextStep();
  const t = useTranslations("agentFactory");
  const setMyAgent = useQuantikStore((s) => s.setMyAgent);
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [privateKeySecured, setPrivateKeySecured] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // WDK wallet state — generated server-side, private key shown once for user backup
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletPrivateKey, setWalletPrivateKey] = useState<string | null>(null);
  const [walletSeedPhrase, setWalletSeedPhrase] = useState<string | null>(null);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const jsConfettiRef = useRef<JSConfetti | null>(null);
  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => { jsConfettiRef.current = null; };
  }, []);

  const finishFactoryTour = useCallback(() => {
    completeFactoryTour();
    closeNextStep();
  }, [closeNextStep]);

  const handleDelete = useCallback(async () => {
    if (!myAgent) return;
    setIsDeleting(true);
    try {
      await api.deleteAgent(myAgent.id);
      setMyAgent(null);
      setShowDeleteConfirm(false);
    } catch {
      /* ignore */
    } finally {
      setIsDeleting(false);
    }
  }, [myAgent, setMyAgent]);

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

  const handleSelectCreatePath = useCallback(() => {
    finishFactoryTour();
    setStep(1);
    // Signal the ProductTourProvider to start the create-wizard tour
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("quantik:wizard-step-entered"));
    }, 350);
  }, [finishFactoryTour]);

  const handleSelectByoPath = useCallback(() => {
    finishFactoryTour();
    router.push("/agent-factory/byo");
  }, [finishFactoryTour, router]);

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
      leverageVibe: "none",
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
    api.generateWallet()
      .then((data) => {
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
    if (!walletAddress || !walletPrivateKey) return;
    const content = buildWalletDownloadContent(config.name, {
      address: walletAddress,
      privateKey: walletPrivateKey,
      seedPhrase: walletSeedPhrase ?? "",
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantik-agent-${config.name.toLowerCase().replace(/\s+/g, "-") || "unnamed"}-key.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setPrivateKeySecured(true);
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
        // Send keys to backend for encrypted storage (enables server-side Polymarket approvals)
        private_key: walletPrivateKey ?? undefined,
        seed_phrase: walletSeedPhrase ?? undefined,
        personality: config.personality,
        decisionStyle: config.decisionStyle,
        tradingInstinct: config.tradingInstinct,
        timePatience: config.timePatience,
        profitDream: config.profitDream,
        moneyApproach: config.moneyApproach,
        protectionMindset: config.protectionMindset,
        marketSense: config.marketSense,
        assetLove: config.assetLove,
      });
      // Clear sensitive data from memory
      setWalletPrivateKey(null);
      setWalletSeedPhrase(null);
      setMyAgent(agentData as unknown as MyAgent);
      requestProductTourResume();
      router.push("/manage-agent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to deploy agent";
      if (msg.includes("409")) {
        router.push("/manage-agent");
        return;
      }
      setDeployError(msg);
    } finally {
      setIsDeploying(false);
    }
  }, [config, walletAddress, walletPrivateKey, walletSeedPhrase, generatedImage, router, setMyAgent]);

  const isLaunchStep = step === 5;
  const isLocked = !!myAgent && !myAgentLoading;

  if (isLocked) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 1100,
          minHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.06em",
            }}
          >
            {t("pageTitle")}
          </span>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.04em",
              background: "rgba(48,209,88,0.15)",
              border: "1px solid rgba(48,209,88,0.35)",
              color: "#30d158",
            }}
          >
            {t("agentCount")}
          </span>
        </div>

        {/* Locked content */}
        <div
          id="tour-factory-shell"
          style={{
            ...panelStyle,
            maxWidth: 560,
            margin: "40px auto 0",
            textAlign: "center",
            padding: "48px 32px",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>{myAgent.avatar_emoji}</div>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {myAgent.name}
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 100,
              background: myAgent.agent_type === "byo" ? "rgba(10,132,255,0.12)" : "rgba(48,209,88,0.12)",
              border: `1px solid ${myAgent.agent_type === "byo" ? "rgba(10,132,255,0.25)" : "rgba(48,209,88,0.25)"}`,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: myAgent.agent_type === "byo" ? "#0a84ff" : "#30d158",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: myAgent.agent_type === "byo" ? "#0a84ff" : "#30d158",
                letterSpacing: "0.08em",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              }}
            >
              {myAgent.agent_type === "byo" ? t("locked.openclawAgent") : t("locked.quantikAgent")} · {t("locked.active")}
            </span>
          </div>

          <p
            style={{
              margin: "0 0 32px",
              fontSize: 13,
              color: "rgba(255,255,255,0.40)",
              lineHeight: 1.6,
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            }}
          >
            {t("locked.maxReached")}
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {/* Create disabled */}
            <div className="relative group" style={{ position: "relative" }}>
              <button
                id="tour-factory-create"
                disabled
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.20)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "not-allowed",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                🧪 {t("locked.createAgent")}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-mono text-white bg-zinc-800 border border-white/10 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ maxWidth: 240, whiteSpace: "normal", textAlign: "center" }}
              >
                {t("locked.maxTooltip")}
              </div>
            </div>
            {/* Import disabled */}
            <div className="relative group" style={{ position: "relative" }}>
              <button
                id="tour-factory-byo"
                disabled
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.20)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "not-allowed",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                🦞 {t("locked.importOpenClaw")}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-mono text-white bg-zinc-800 border border-white/10 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{ maxWidth: 240, whiteSpace: "normal", textAlign: "center" }}
              >
                {t("locked.maxTooltip")}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />

          {/* Bottom actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/manage-agent")}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                background: "rgba(10,132,255,0.15)",
                border: "1px solid rgba(10,132,255,0.35)",
                color: "#0a84ff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                transition: "all 180ms ease",
              }}
            >
              {t("locked.manageAgent", { name: myAgent.name })} →
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                background: "rgba(255,69,58,0.10)",
                border: "1px solid rgba(255,69,58,0.25)",
                color: "#ff453a",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                transition: "all 180ms ease",
              }}
            >
              {t("locked.deleteAgent")}
            </button>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.60)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                ...panelStyle,
                maxWidth: 400,
                width: "90vw",
                textAlign: "center",
                padding: "32px 28px",
                background: "rgba(20,20,25,0.95)",
                border: "1px solid rgba(255,69,58,0.25)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {t("locked.deleteConfirmTitle", { name: myAgent.name })}
              </h3>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.5,
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}
              >
                {t("locked.deleteConfirmDesc")}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.60)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  }}
                >
                  {t("locked.cancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: isDeleting ? "rgba(255,69,58,0.08)" : "rgba(255,69,58,0.15)",
                    border: "1px solid rgba(255,69,58,0.35)",
                    color: "#ff453a",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    transition: "all 180ms ease",
                  }}
                >
                  {isDeleting ? t("locked.deleting") : t("locked.confirmDelete")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <>
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
          {t("pageTitle")}
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
            {Array.from({ length: 5 }, (_, i) => (
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {t(`stepHeaders.step${step}Title` as any)}
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: BODY_SIZE,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.5,
                }}
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {t(`stepHeaders.step${step}Desc` as any)}
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
                <div id="tour-factory-shell" style={{ maxWidth: 720, margin: "0 auto" }}>
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
                      {t("pathSelection.title")}
                    </h1>
                    <p
                      style={{
                        margin: 0,
                        fontSize: BODY_SIZE,
                        color: "rgba(255,255,255,0.45)",
                        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      }}
                    >
                      {t("pathSelection.subtitle")}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="!grid-cols-1 sm:!grid-cols-2">
                    {/* Create from Scratch */}
                    <button
                      id="tour-factory-create"
                      onClick={handleSelectCreatePath}
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
                          {t("pathSelection.createTitle")}
                        </div>
                        <div
                          style={{
                            fontSize: META_SIZE,
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.5,
                            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                          }}
                        >
                          {t("pathSelection.createDesc")}
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
                        {t("pathSelection.createBadge")}
                      </div>
                    </button>

                    {/* Bring Your Own Agent */}
                    <button
                      id="tour-factory-byo"
                      onClick={handleSelectByoPath}
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
                          {t("pathSelection.byoTitle")}
                        </div>
                        <div
                          style={{
                            fontSize: META_SIZE,
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: 1.5,
                            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                          }}
                        >
                          {t("pathSelection.byoDesc")}
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
                        {t("pathSelection.byoBadge")}
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
                ← {t("footer.back")}
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
              {t("footer.skipRandomize")}
            </button>
            <button
              id="tour-wizard-next"
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(`nextLabels.step${step}` as any)} <span style={{ fontSize: 15 }}>→</span>
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
