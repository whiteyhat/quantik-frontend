"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import JSConfetti from "js-confetti";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { api, type ByoOnboardingSession } from "@/lib/api";
import { buildByoOnboardingPrompt, formatByoTimeRemaining, isByoSessionReady } from "@/lib/byoImport";
import { useQuantikStore, type MyAgent } from "@/store/useQuantikStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

const BYO_STEPS = [
  { title: "Generate Link", subtitle: "Create a one-time OpenClaw claim URL" },
  { title: "Send to OpenClaw", subtitle: "Paste the prompt into OpenClaw and wait for claim" },
  { title: "Review & Activate", subtitle: "Verify the claimed identity and activate the agent" },
];

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

function ByoStepIndicator({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {BYO_STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = stepNum < currentStep;
        return (
          <button
            key={step.title}
            onClick={() => { if (isCompleted) onStepClick(stepNum); }}
            disabled={!isCompleted}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 12,
              background: isActive ? "rgba(10,132,255,0.10)" : "transparent",
              border: isActive ? "1px solid rgba(10,132,255,0.20)" : "1px solid transparent",
              cursor: isCompleted ? "pointer" : "default",
              textAlign: "left",
              outline: "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: isCompleted ? "#0a84ff" : isActive ? "rgba(10,132,255,0.25)" : "rgba(255,255,255,0.06)",
                color: isCompleted || isActive ? "#fff" : "rgba(255,255,255,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                flexShrink: 0,
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)" }}>
                {step.title}
              </div>
              <div style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.25)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                {step.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: ByoOnboardingSession["status"] }) {
  const tone = {
    pending_claim: { bg: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.24)", text: "#ffb340", label: "Waiting for Claim" },
    claimed: { bg: "rgba(48,209,88,0.12)", border: "rgba(48,209,88,0.24)", text: "#30d158", label: "Claimed" },
    expired: { bg: "rgba(255,69,58,0.12)", border: "rgba(255,69,58,0.24)", text: "#ff6b60", label: "Expired" },
    failed: { bg: "rgba(255,69,58,0.12)", border: "rgba(255,69,58,0.24)", text: "#ff6b60", label: "Failed" },
    cancelled: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)", text: "rgba(255,255,255,0.55)", label: "Cancelled" },
  }[status];

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
      }}
    >
      {tone.label}
    </span>
  );
}

function CopyActionButton({
  label,
  onClick,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === "primary";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: isPrimary ? "8px 12px" : "6px 10px",
        borderRadius: 8,
        border: isPrimary ? "none" : "1px solid rgba(255,255,255,0.10)",
        background: isPrimary
          ? (hovered ? "rgba(10,132,255,0.24)" : "rgba(10,132,255,0.15)")
          : (hovered ? "rgba(255,255,255,0.10)" : "transparent"),
        color: isPrimary ? "#0a84ff" : (hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.70)"),
        boxShadow: hovered ? "0 10px 24px rgba(10,132,255,0.18)" : "none",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        outline: "none",
        transition: "all 160ms ease",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function StepGenerate({
  onboardingUrl,
  expiresLabel,
  isCreating,
  createError,
  onGenerate,
  onCopyUrl,
  onContinue,
}: {
  onboardingUrl: string | null;
  expiresLabel: string | null;
  isCreating: boolean;
  createError: string | null;
  onGenerate: () => void;
  onCopyUrl: () => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={panelStyle}>
        <SectionHeader
          title="OpenClaw Claim Link"
          icon="🦞"
          tooltip="Quantik generates a one-time URL for OpenClaw to complete the BYO claim flow."
        />
        <p style={{ margin: "0 0 12px", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          This flow is agent-first. Generate a one-time onboarding URL, paste it into OpenClaw, and let OpenClaw push its identity back to Quantik.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={onGenerate}
            disabled={isCreating}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: isCreating ? "rgba(255,255,255,0.06)" : "#0a84ff",
              color: isCreating ? "rgba(255,255,255,0.30)" : "#fff",
              fontSize: BODY_SIZE,
              fontWeight: 700,
              cursor: isCreating ? "not-allowed" : "pointer",
              outline: "none",
            }}
          >
            {isCreating ? "Generating..." : onboardingUrl ? "Generate New Link" : "Generate Onboarding Link"}
          </button>
          {onboardingUrl && (
            <button
              onClick={onContinue}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: "rgba(255,255,255,0.78)",
                fontSize: BODY_SIZE,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              Continue →
            </button>
          )}
        </div>
        {createError && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#ff6b60", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
            {createError}
          </div>
        )}
      </div>

      {onboardingUrl && (
        <div style={panelStyle}>
          <SectionHeader title="One-Time URL" icon="🔗" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(10,132,255,0.06)",
              border: "1px solid rgba(10,132,255,0.18)",
            }}
          >
            <code
              style={{
                flex: 1,
                fontSize: 12,
                color: "#0a84ff",
                wordBreak: "break-all",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              }}
            >
              {onboardingUrl}
            </code>
            <CopyActionButton label="Copy" onClick={onCopyUrl} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
            Expires in {expiresLabel ?? "15:00"}. OpenClaw must use it before it expires.
          </p>
        </div>
      )}
    </div>
  );
}

function StepSend({
  onboardingUrl,
  prompt,
  session,
  expiresLabel,
  onCopyUrl,
  onCopyPrompt,
  onRegenerate,
}: {
  onboardingUrl: string | null;
  prompt: string;
  session: ByoOnboardingSession | null;
  expiresLabel: string | null;
  onCopyUrl: () => void;
  onCopyPrompt: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={panelStyle}>
        <SectionHeader title="Send This to OpenClaw" icon="💬" />
        <p style={{ margin: "0 0 12px", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          Paste the ready-made prompt into OpenClaw. It instructs OpenClaw to read the claim URL, POST its identity, and store the returned Quantik credentials.
        </p>
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.24)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.72)",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {prompt}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <CopyActionButton label="Copy Prompt" onClick={onCopyPrompt} />
          <CopyActionButton label="Copy URL" onClick={onCopyUrl} variant="secondary" />
        </div>
      </div>

      <div style={panelStyle}>
        <SectionHeader title="Claim Status" icon="🛰" tooltip="Quantik polls the onboarding session until OpenClaw completes the claim." />
        {session ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <StatusPill status={session.status} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                {session.status === "pending_claim" ? `Expires in ${expiresLabel ?? "15:00"}` : session.claimed_at ? `Claimed ${new Date(session.claimed_at).toLocaleString()}` : "One-time session"}
              </span>
            </div>
            <div style={{ marginTop: 14, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)", lineHeight: 1.7 }}>
              {session.status === "pending_claim" && "OpenClaw has not claimed the session yet. Leave this tab open while it completes the handshake."}
              {session.status === "claimed" && "OpenClaw finished the claim. Quantik has the imported identity and OpenClaw has the runtime credentials."}
              {session.status === "expired" && "This onboarding link expired before OpenClaw completed the claim. Generate a fresh link and resend it."}
              {session.status === "failed" && `The claim failed${session.last_error ? `: ${session.last_error}` : "."} Generate a fresh link after fixing the issue.`}
              {session.status === "cancelled" && "This onboarding session was cancelled. Generate a fresh link to continue."}
            </div>
            {session.identity && (
              <div
                style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>{session.identity.avatar}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>{session.identity.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                      {session.identity.description ?? "No description provided"}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(session.status === "expired" || session.status === "failed" || session.status === "cancelled") && (
              <button
                onClick={onRegenerate}
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0a84ff",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                Generate New Link
              </button>
            )}
          </>
        ) : (
          <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.40)" }}>
            Generate a session first to track claim status.
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>{label}</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: '"SF Mono", "JetBrains Mono", monospace', textAlign: "right", wordBreak: "break-word" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function StepReview({
  session,
  onDeploy,
  isDeploying,
  deployError,
}: {
  session: ByoOnboardingSession | null;
  onDeploy: () => void;
  isDeploying: boolean;
  deployError: string | null;
}) {
  if (!session?.identity) {
    return (
      <div style={panelStyle}>
        <SectionHeader title="Awaiting Claim" icon="⏳" />
        <p style={{ margin: 0, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.50)", lineHeight: 1.7 }}>
          OpenClaw has not claimed this onboarding session yet. Once the claim is complete, the imported identity and connection metadata will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ ...panelStyle, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{session.identity.avatar}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 4 }}>
          {session.identity.name}
        </div>
        <div style={{ fontSize: META_SIZE, color: "rgba(255,255,255,0.45)", fontFamily: '"SF Mono", "JetBrains Mono", monospace', maxWidth: 480, margin: "0 auto" }}>
          {session.identity.description ?? "No description provided"}
        </div>
        <div style={{ marginTop: 14 }}>
          <StatusPill status={session.status} />
        </div>
      </div>

      <div style={panelStyle}>
        <SectionHeader title="Claimed Metadata" icon="📦" tooltip="OpenClaw now has the sensitive Quantik credentials. The dashboard only shows non-secret confirmation." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetaRow label="Claimed At" value={session.claimed_at ? new Date(session.claimed_at).toLocaleString() : null} />
          <MetaRow label="Agent URL" value={session.agent_url} />
          <MetaRow label="Webhook URL" value={session.endpoint_url} />
          <MetaRow label="Webhook Events" value={session.webhook_events.join(", ")} />
          <MetaRow label="API Key Prefix" value={session.api_key_prefix} />
          <MetaRow label="Wallet Address" value={session.wallet_address} />
          <MetaRow label="Connection State" value={session.connection_status} />
        </div>
      </div>

      <div style={panelStyle}>
        <SectionHeader title="Activate Agent" icon="🚀" />
        <p style={{ margin: "0 0 12px", fontSize: BODY_SIZE, color: "rgba(255,255,255,0.60)", lineHeight: 1.7 }}>
          The OpenClaw handshake is complete. Activate the agent when you are ready for it to begin using Quantik with the credentials it already received.
        </p>
        <button
          onClick={onDeploy}
          disabled={!isByoSessionReady(session.status) || isDeploying}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: isByoSessionReady(session.status) && !isDeploying ? "#0a84ff" : "rgba(255,255,255,0.06)",
            color: isByoSessionReady(session.status) && !isDeploying ? "#fff" : "rgba(255,255,255,0.25)",
            fontSize: BODY_SIZE,
            fontWeight: 700,
            cursor: isByoSessionReady(session.status) && !isDeploying ? "pointer" : "not-allowed",
            outline: "none",
          }}
        >
          {isDeploying ? "Activating..." : "Activate BYO Agent"}
        </button>
        {deployError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#ff6b60", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
            {deployError}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ByoAgentPage() {
  const router = useRouter();
  const setMyAgent = useQuantikStore((state) => state.setMyAgent);

  const [step, setStep] = useState(1);
  const [session, setSession] = useState<ByoOnboardingSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [agentLimitToast, setAgentLimitToast] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const jsConfettiRef = useRef<JSConfetti | null>(null);

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => { jsConfettiRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const existing = await api.getMyAgent();
      if (!existing || cancelled) return;
      if (existing.id && existing.status !== "terminated") {
        setAgentLimitToast("You already have an agent. Delete it first from Manage Agent.");
        setTimeout(() => { if (!cancelled) router.push("/manage-agent"); }, 2500);
      }
    })().catch(() => {});

    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getByoOnboardingSession(sessionId);
        if (cancelled) return;
        setSession(data);
        if (data.status === "claimed") {
          setStep(3);
        }
      } catch {
        // ignore transient polling failures
      }
    };

    poll().catch(() => {});
    const interval = window.setInterval(() => { poll().catch(() => {}); }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session || session.status !== "pending_claim") return;
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!copyToast) return;
    const timeout = window.setTimeout(() => setCopyToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyToast]);

  const prompt = useMemo(() => buildByoOnboardingPrompt(onboardingUrl ?? ""), [onboardingUrl]);
  const expiresLabel = session?.expires_at ? formatByoTimeRemaining(session.expires_at, nowTick) : null;

  const copyText = useCallback((value: string, successMessage: string) => {
    navigator.clipboard.writeText(value)
      .then(() => setCopyToast(successMessage))
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsCreating(true);
    setCreateError(null);
    setDeployError(null);

    try {
      const data = await api.createByoOnboardingSession();
      const nextSession: ByoOnboardingSession = {
        session_id: data.session_id,
        status: "pending_claim",
        expires_at: data.expires_at,
        claimed_at: null,
        agent_id: null,
        identity: null,
        agent_url: null,
        endpoint_url: null,
        webhook_events: ["*"],
        api_key_prefix: null,
        wallet_address: null,
        connection_status: null,
        last_error: null,
      };
      setSession(nextSession);
      setSessionId(data.session_id);
      setOnboardingUrl(data.onboarding_url);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate onboarding link";
      setCreateError(message);
      if (message.includes("AGENT_LIMIT_REACHED")) {
        setAgentLimitToast("You already have an agent. Delete it first from Manage Agent.");
        setTimeout(() => router.push("/manage-agent"), 2500);
      }
    } finally {
      setIsCreating(false);
    }
  }, [router]);

  const handleDeploy = useCallback(async () => {
    if (!session?.agent_id || !isByoSessionReady(session.status)) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      await api.deployAgent(session.agent_id);
      const freshAgent = await api.getMyAgent();
      if (freshAgent) {
        setMyAgent(freshAgent as unknown as MyAgent);
      }
      jsConfettiRef.current?.addConfetti({
        emojis: [session.identity?.avatar ?? "🤖"],
        emojiSize: 60,
        confettiNumber: 40,
      });
      setTimeout(() => router.push("/manage-agent"), 1500);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Failed to activate BYO agent");
    } finally {
      setIsDeploying(false);
    }
  }, [router, session, setMyAgent]);

  return (
    <>
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
            color: "#ffb340",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          ⚠ {agentLimitToast}
        </div>
      )}

      {copyToast && (
        <div
          style={{
            position: "fixed",
            top: agentLimitToast ? 76 : 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            padding: "10px 18px",
            borderRadius: 12,
            background: "rgba(10,132,255,0.18)",
            border: "1px solid rgba(10,132,255,0.30)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "#7fc0ff",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          }}
        >
          {copyToast}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1100, minHeight: "calc(100vh - 120px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => router.push("/agent-factory")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "none",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.50)",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              ← Back
            </button>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "rgba(255,255,255,0.92)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                letterSpacing: "0.06em",
              }}
            >
              BYO AGENT
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }} className="flex-col md:flex-row">
          <div style={{ width: 260, flexShrink: 0 }} className="hidden md:block">
            <div style={{ position: "sticky", top: 72 }}>
              <ByoStepIndicator currentStep={step} onStepClick={setStep} />
            </div>
          </div>

          <div className="flex md:hidden" style={{ gap: 6, marginBottom: 8 }}>
            {BYO_STEPS.map((_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: index + 1 <= step ? "#0a84ff" : "rgba(255,255,255,0.08)",
                  transition: "background 220ms ease",
                }}
              />
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.01em" }}>
                {BYO_STEPS[step - 1]?.title}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: META_SIZE, color: "rgba(255,255,255,0.40)", fontFamily: '"SF Mono", "JetBrains Mono", monospace' }}>
                {BYO_STEPS[step - 1]?.subtitle}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {step === 1 && (
                  <StepGenerate
                    onboardingUrl={onboardingUrl}
                    expiresLabel={expiresLabel}
                    isCreating={isCreating}
                    createError={createError}
                    onGenerate={handleGenerate}
                    onCopyUrl={() => { if (onboardingUrl) copyText(onboardingUrl, "Onboarding URL copied"); }}
                    onContinue={() => setStep(2)}
                  />
                )}

                {step === 2 && (
                  <StepSend
                    onboardingUrl={onboardingUrl}
                    prompt={prompt}
                    session={session}
                    expiresLabel={expiresLabel}
                    onCopyUrl={() => { if (onboardingUrl) copyText(onboardingUrl, "Onboarding URL copied"); }}
                    onCopyPrompt={() => copyText(prompt, "OpenClaw prompt copied")}
                    onRegenerate={handleGenerate}
                  />
                )}

                {step === 3 && (
                  <StepReview
                    session={session}
                    onDeploy={handleDeploy}
                    isDeploying={isDeploying}
                    deployError={deployError}
                  />
                )}
              </motion.div>
            </AnimatePresence>

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
                    onClick={() => setStep((current) => Math.max(1, current - 1))}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: BODY_SIZE,
                      fontWeight: 600,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    ← Back
                  </button>
                )}
              </div>

              {step === 1 && onboardingUrl && (
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "#0a84ff",
                    color: "#fff",
                    fontSize: BODY_SIZE,
                    fontWeight: 700,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Continue →
                </button>
              )}

              {step === 2 && session?.status === "claimed" && (
                <button
                  onClick={() => setStep(3)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "#0a84ff",
                    color: "#fff",
                    fontSize: BODY_SIZE,
                    fontWeight: 700,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Review Claim →
                </button>
              )}

              {step === 2 && session?.status !== "claimed" && (
                <a
                  href="/agent-factory/byo/docs"
                  style={{
                    color: "#0a84ff",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  }}
                >
                  View Full BYO Docs →
                </a>
              )}

              {step === 3 && (
                <a
                  href={`${BASE_URL}/api/skill.md`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#0a84ff",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  }}
                >
                  Open skill.md →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
