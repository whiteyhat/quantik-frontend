"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { MyAgent } from "@/store/useQuantikStore";
import { api } from "@/lib/api";

const panelStyle: React.CSSProperties = {
  background: "rgba(20,20,22,0.92)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 28,
  width: "100%",
  maxWidth: 420,
};

interface DeleteAgentModalProps {
  agent: MyAgent;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAgentModal({ agent, open, onClose, onDeleted }: DeleteAgentModalProps) {
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setConfirmStep(1);
    setConfirmText("");
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteAgent(agent.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={handleClose}
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,69,58,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {agent.avatar_image ? (
              <img
                src={agent.avatar_image}
                alt={agent.name}
                style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }}
              />
            ) : (
              agent.avatar_emoji || "🤖"
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                letterSpacing: "0.03em",
              }}
            >
              Delete {agent.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {agent.agent_code}
            </div>
          </div>
        </div>

        {confirmStep === 1 && (
          <>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                lineHeight: 1.6,
                margin: "0 0 24px 0",
              }}
            >
              Are you sure you want to permanently delete this agent? All configuration, trading history, and wallet
              association will be removed. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={handleClose}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: '"SF Mono", monospace',
                  letterSpacing: "0.04em",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => setConfirmStep(2)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,69,58,0.30)",
                  background: "rgba(255,69,58,0.12)",
                  color: "#ff453a",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: '"SF Mono", monospace',
                  letterSpacing: "0.04em",
                }}
              >
                CONTINUE
              </button>
            </div>
          </>
        )}

        {confirmStep === 2 && (
          <>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,69,58,0.8)",
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                lineHeight: 1.6,
                margin: "0 0 16px 0",
              }}
            >
              This action is irreversible. Type <strong style={{ color: "#ff453a" }}>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmText === "DELETE" && !isDeleting) {
                  handleDelete();
                }
              }}
              placeholder="Type DELETE"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,69,58,0.25)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.9)",
                fontSize: 13,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                letterSpacing: "0.06em",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 8,
              }}
            />

            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(255,69,58,0.10)",
                  border: "1px solid rgba(255,69,58,0.20)",
                  fontSize: 12,
                  color: "#ff453a",
                  fontFamily: '"SF Mono", monospace',
                  marginBottom: 8,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={handleClose}
                disabled={isDeleting}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.5 : 1,
                  fontFamily: '"SF Mono", monospace',
                  letterSpacing: "0.04em",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || isDeleting}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,69,58,0.40)",
                  background:
                    confirmText === "DELETE" ? "rgba(255,69,58,0.20)" : "rgba(255,69,58,0.06)",
                  color: confirmText === "DELETE" ? "#ff453a" : "rgba(255,69,58,0.35)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: confirmText !== "DELETE" || isDeleting ? "not-allowed" : "pointer",
                  fontFamily: '"SF Mono", monospace',
                  letterSpacing: "0.04em",
                  transition: "all 150ms ease",
                }}
              >
                {isDeleting ? "DELETING..." : "DELETE FOREVER"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
