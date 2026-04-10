"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useSocketEvent } from "@/context/SocketContext";

interface TokenizeModalProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentCode: string | null;
}

type ProgressStep = "creating_token" | "launching_curve" | "confirming" | "done" | "error";

interface ProgressState {
  step: ProgressStep | null;
  progress: number;
  error: string | null;
  tokenMint: string | null;
  poolAddress: string | null;
  explorerUrl: string | null;
}

// Derive symbol from agentCode (default agents) or agentName (BYO)
function deriveSymbol(agentName: string, agentCode: string | null): string {
  const DEFAULT_CODES = ["AURA", "FLUX", "CLAUSE", "ORACLE", "EDGE", "LUCIFER", "SIGMA"];
  if (agentCode && DEFAULT_CODES.includes(agentCode.toUpperCase())) return agentCode.toUpperCase();
  return agentName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5);
}

const STEPS = [
  { id: "creating_token", label: "Creating Token..." },
  { id: "launching_curve", label: "Launching Bonding Curve..." },
  { id: "confirming", label: "Confirming on-chain..." },
];

export function TokenizeModal({ open, onClose, agentId, agentName, agentCode }: TokenizeModalProps) {
  const router = useRouter();
  const symbol = deriveSymbol(agentName, agentCode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ps, setPs] = useState<ProgressState>({
    step: null, progress: 0, error: null, tokenMint: null, poolAddress: null, explorerUrl: null,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setIsProcessing(false);
      setPs({ step: null, progress: 0, error: null, tokenMint: null, poolAddress: null, explorerUrl: null });
    }
  }, [open]);

  // Subscribe to Socket.IO progress events
  useSocketEvent("token:progress", useCallback((data: { step: string; progress: number }) => {
    setPs((prev) => ({ ...prev, step: data.step as ProgressStep, progress: data.progress }));
  }, []));

  useSocketEvent("token:created", useCallback((data: { tokenMint: string; poolAddress: string; explorerUrl: string }) => {
    setPs((prev) => ({
      ...prev, step: "done", progress: 100,
      tokenMint: data.tokenMint, poolAddress: data.poolAddress, explorerUrl: data.explorerUrl,
    }));
    setIsProcessing(false);
  }, []));

  useSocketEvent("token:error", useCallback((data: { agentId: string; error: string }) => {
    if (data.agentId !== agentId) return;
    setPs((prev) => ({ ...prev, step: "error", error: data.error }));
    setIsProcessing(false);
  }, [agentId]));

  const handleLaunch = useCallback(async () => {
    setIsProcessing(true);
    setPs({ step: "creating_token", progress: 5, error: null, tokenMint: null, poolAddress: null, explorerUrl: null });
    try {
      await api.tokenizeAgent(agentId);
      // Backend returns 202 — actual completion comes via Socket.IO
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tokenization failed";
      setPs((prev) => ({ ...prev, step: "error", error: msg }));
      setIsProcessing(false);
    }
  }, [agentId]);

  const handleViewToken = useCallback(() => {
    if (ps.tokenMint) {
      onClose();
      router.push(`/token/${ps.tokenMint}`);
    }
  }, [ps.tokenMint, router, onClose]);

  if (!open) return null;

  const isDone = ps.step === "done";
  const isError = ps.step === "error";

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tokenize ${agentName}`}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={isProcessing ? undefined : onClose}
    >
      {/* Modal container */}
      <div
        style={{
          maxWidth: 480, width: "100%",
          background: "rgba(8,10,18,0.96)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Zap size={18} style={{ color: "#007AFF" }} />
              <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                Tokenize {agentName}
              </span>
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.60)" }}>
              Create trading tokens and launch fair-price bonding curve
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close modal"
            style={{
              background: "none", border: "none", cursor: isProcessing ? "not-allowed" : "pointer",
              color: "rgba(255,255,255,0.40)", padding: 4, borderRadius: 6, flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Token preview (shown before processing) */}
        {!isProcessing && !isDone && !isError && (
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
            {[
              { label: "Token Name:", value: agentName },
              { label: "Token Symbol:", value: `$${symbol}` },
              { label: "Token Supply:", value: "1,000,000 tokens" },
              { label: "Initial Reserve:", value: "0.1 USDC" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}>{label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.90)",
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                }}>{value}</span>
              </div>
            ))}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <CheckCircle size={14} style={{ color: "#30D158", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#30D158" }}>
                Your agent will receive 2% of all trading fees as treasury revenue
              </span>
            </div>
          </div>
        )}

        {/* Progress steps (shown during processing, success, or error) */}
        {(isProcessing || isDone || isError) && (
          <div style={{ marginBottom: 20 }}>
            {/* Overall progress bar */}
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${ps.progress}%`,
                background: isError ? "#FF453A" : "#007AFF",
                borderRadius: 2, transition: "width 400ms ease",
              }} />
            </div>
            {STEPS.map((step, i) => {
              const stepIndex = STEPS.findIndex((s) => s.id === ps.step);
              const isActive = ps.step === step.id;
              const isComplete = !isError && (stepIndex > i || isDone);
              const isFailed = isError && isActive;
              return (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 20, height: 20, flexShrink: 0 }}>
                    {isComplete ? (
                      <CheckCircle size={20} style={{ color: "#30D158" }} />
                    ) : isFailed ? (
                      <AlertCircle size={20} style={{ color: "#FF453A" }} />
                    ) : isActive ? (
                      <Loader2 size={20} style={{ color: "#007AFF", animation: "spin 1s linear infinite" }} />
                    ) : (
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.20)",
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: isComplete ? "#30D158" : isFailed ? "#FF453A" :
                      isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.30)",
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            {isError && ps.error && (
              <div style={{
                fontSize: 13, color: "#FF453A", background: "rgba(255,69,58,0.10)",
                border: "1px solid rgba(255,69,58,0.25)", borderRadius: 8, padding: "8px 12px", marginTop: 8,
              }}>
                {ps.error}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {isDone ? (
            <button
              onClick={handleViewToken}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 10, background: "#007AFF",
                border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >
              View Token
            </button>
          ) : isError ? (
            <>
              <button
                onClick={() => void handleLaunch()}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10, background: "#007AFF",
                  border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 16px", borderRadius: 10, background: "none",
                  border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.60)",
                  fontSize: 15, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => void handleLaunch()}
                disabled={isProcessing}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10,
                  background: isProcessing ? "rgba(0,122,255,0.40)" : "#007AFF",
                  border: "none", color: "#fff", fontSize: 15, fontWeight: 600,
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {isProcessing && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {isProcessing ? "Processing..." : "Launch Token"}
              </button>
              <button
                onClick={onClose}
                disabled={isProcessing}
                style={{
                  padding: "10px 16px", borderRadius: 10, background: "none",
                  border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.60)",
                  fontSize: 15, cursor: isProcessing ? "not-allowed" : "pointer",
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
