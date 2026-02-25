"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── L003 font sizes ──────────────────────────────────────────────────────────
const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;

// ─── Slide-to-confirm component ───────────────────────────────────────────────
function SlideToConfirm({
  label,
  onConfirmed,
  disabled,
}: {
  label: string;
  onConfirmed: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [thumbX, setThumbX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const THUMB_SIZE = 48;

  const getTrackWidth = () => trackRef.current?.clientWidth ?? 280;

  const getMaxX = () => getTrackWidth() - THUMB_SIZE - 4; // 4px padding

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || confirmed) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      startXRef.current = e.clientX - currentXRef.current;
    },
    [disabled, confirmed]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const newX = Math.max(0, Math.min(e.clientX - startXRef.current, getMaxX()));
      currentXRef.current = newX;
      setThumbX(newX);
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    const maxX = getMaxX();
    if (currentXRef.current >= maxX * 0.85) {
      // Confirmed — snap to end
      setThumbX(maxX);
      setConfirmed(true);
      onConfirmed();
    } else {
      // Snap back
      currentXRef.current = 0;
      setThumbX(0);
    }
  }, [dragging, onConfirmed]);

  const progress = getMaxX() > 0 ? thumbX / getMaxX() : 0;

  return (
    <div
      ref={trackRef}
      style={{
        position: "relative",
        height: THUMB_SIZE + 4,
        borderRadius: (THUMB_SIZE + 4) / 2,
        background: confirmed
          ? "rgba(255,69,58,0.30)"
          : "rgba(255,69,58,0.10)",
        border: `1px solid ${confirmed ? "rgba(255,69,58,0.50)" : "rgba(255,69,58,0.25)"}`,
        overflow: "hidden",
        userSelect: "none",
        cursor: disabled ? "not-allowed" : "default",
        transition: "background 300ms, border-color 300ms",
      }}
    >
      {/* Fill track */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${2 + thumbX + THUMB_SIZE / 2}px`,
          background: `rgba(255,69,58,${0.08 + progress * 0.22})`,
          transition: dragging ? "none" : "width 220ms ease",
          borderRadius: "inherit",
        }}
      />

      {/* Track label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: BODY_SIZE,
            fontWeight: 700,
            color: confirmed
              ? "rgba(255,69,58,0.90)"
              : `rgba(255,69,58,${0.40 + progress * 0.50})`,
            letterSpacing: "0.12em",
            fontFamily: '"SF Mono", monospace',
            textTransform: "uppercase",
            transition: "color 200ms",
          }}
        >
          {confirmed ? "CONFIRMED" : label}
        </span>
      </div>

      {/* Thumb */}
      {!confirmed && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: "absolute",
            left: 2 + thumbX,
            top: 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: "50%",
            background: disabled
              ? "rgba(255,69,58,0.25)"
              : `rgba(255,69,58,${0.60 + progress * 0.40})`,
            boxShadow: `0 0 ${12 + progress * 20}px rgba(255,69,58,${0.40 + progress * 0.40})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "not-allowed" : "grab",
            transition: dragging ? "none" : "left 220ms ease, background 150ms, box-shadow 150ms",
            zIndex: 2,
            touchAction: "none",
          }}
        >
          <span style={{ fontSize: 20, pointerEvents: "none" }}>
            {progress > 0.5 ? "☠️" : "→"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Checkbox row ─────────────────────────────────────────────────────────────
function PanicCheckbox({
  checked,
  label,
  sublabel,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  sublabel: string;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${checked ? "rgba(255,69,58,0.35)" : "rgba(255,255,255,0.07)"}`,
        background: checked ? "rgba(255,69,58,0.08)" : "rgba(255,255,255,0.02)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "background 200ms, border-color 200ms",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Checkbox visual */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${checked ? "#ff453a" : "rgba(255,255,255,0.20)"}`,
          background: checked ? "rgba(255,69,58,0.25)" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 180ms ease",
          marginTop: 1,
        }}
      >
        {checked && (
          <span style={{ fontSize: 13, color: "#ff453a", lineHeight: 1 }}>✓</span>
        )}
      </div>

      {/* Labels */}
      <div>
        <div
          style={{
            fontSize: BODY_SIZE,
            fontWeight: 600,
            color: checked ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.60)",
            marginBottom: 3,
            transition: "color 180ms",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: LABEL_SIZE,
            color: "rgba(255,255,255,0.30)",
            lineHeight: 1.5,
          }}
        >
          {sublabel}
        </div>
      </div>
    </button>
  );
}

// ─── Panic Mode Page ──────────────────────────────────────────────────────────
type PanicStatus = "idle" | "activating" | "activated" | "error";

export default function PanicModePage() {
  const router = useRouter();
  const [cancelOrders, setCancelOrders] = useState(true);
  const [liquidatePositions, setLiquidatePositions] = useState(false);
  const [panicStatus, setPanicStatus] = useState<PanicStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [slideKey, setSlideKey] = useState(0); // reset slide component on state change

  const neitherSelected = !cancelOrders && !liquidatePositions;
  const isDisabled = panicStatus === "activating" || panicStatus === "activated";

  const handleConfirmed = useCallback(async () => {
    if (neitherSelected) return;

    setPanicStatus("activating");
    setErrorMsg(undefined);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/panic-mode/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelOrders,
          liquidatePositions,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setPanicStatus("activated");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPanicStatus("error");
      // Reset slide after error
      setSlideKey((k) => k + 1);
      setTimeout(() => setPanicStatus("idle"), 6000);
    }
  }, [cancelOrders, liquidatePositions, neitherSelected]);

  // Redirect to dashboard after activation
  useEffect(() => {
    if (panicStatus === "activated") {
      const t = setTimeout(() => router.push("/"), 4000);
      return () => clearTimeout(t);
    }
  }, [panicStatus, router]);

  if (panicStatus === "activated") {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,69,58,0.30)",
            borderRadius: 20,
            padding: "48px 56px",
            textAlign: "center",
            maxWidth: 480,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚨</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#ff453a",
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            EMERGENCY PROTOCOL ACTIVATED
          </div>
          <div
            style={{
              fontSize: BODY_SIZE,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
            }}
          >
            {cancelOrders && "All open orders are being cancelled. "}
            {liquidatePositions && "All positions are being liquidated. "}
            Redirecting to dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* ── UNMISSABLE WARNING HEADER ──────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255,69,58,0.12)",
          border: "2px solid rgba(255,69,58,0.50)",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 0 60px rgba(255,69,58,0.15), inset 0 0 40px rgba(255,69,58,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 28, flexShrink: 0 }}>🚨</span>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#ff453a",
                letterSpacing: "0.08em",
                fontFamily: '"SF Mono", monospace',
                lineHeight: 1,
              }}
            >
              EMERGENCY PROTOCOL
            </div>
            <div
              style={{
                fontSize: META_SIZE,
                fontWeight: 700,
                color: "rgba(255,69,58,0.70)",
                letterSpacing: "0.12em",
                fontFamily: '"SF Mono", monospace',
                marginTop: 4,
                textTransform: "uppercase",
              }}
            >
              ⚠ IRREVERSIBLE — CANNOT BE UNDONE ⚠
            </div>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: BODY_SIZE,
            color: "rgba(255,255,255,0.50)",
            lineHeight: 1.6,
          }}
        >
          This will immediately halt trading activity. Actions taken cannot be reversed.
          Confirm only in a genuine emergency.
        </p>
      </div>

      {/* ── ACTION SELECTION ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Select Actions
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PanicCheckbox
            checked={cancelOrders}
            label="Cancel All Open Orders"
            sublabel="Immediately cancels every pending limit and market order across all venues."
            onChange={setCancelOrders}
            disabled={isDisabled}
          />
          <PanicCheckbox
            checked={liquidatePositions}
            label="Liquidate All Positions"
            sublabel="Market-sells all current positions at best available price. Expect slippage."
            onChange={setLiquidatePositions}
            disabled={isDisabled}
          />
        </div>

        {neitherSelected && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(255,159,10,0.08)",
              border: "1px solid rgba(255,159,10,0.20)",
              fontSize: LABEL_SIZE,
              color: "#ff9f0a",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
            }}
          >
            Select at least one action before confirming.
          </div>
        )}
      </div>

      {/* ── SLIDE TO CONFIRM ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,69,58,0.15)",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,69,58,0.55)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Slide to Confirm Emergency Protocol
        </div>

        <SlideToConfirm
          key={slideKey}
          label="SLIDE TO ACTIVATE →"
          onConfirmed={handleConfirmed}
          disabled={neitherSelected || isDisabled}
        />

        {panicStatus === "activating" && (
          <div
            style={{
              marginTop: 12,
              fontSize: META_SIZE,
              color: "#ff9f0a",
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              textAlign: "center",
            }}
          >
            ⏳ ACTIVATING EMERGENCY PROTOCOL…
          </div>
        )}

        {panicStatus === "error" && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(255,69,58,0.08)",
              border: "1px solid rgba(255,69,58,0.25)",
              fontSize: LABEL_SIZE,
              color: "#ff453a",
              fontFamily: "monospace",
              letterSpacing: "0.06em",
            }}
          >
            ❌ ACTIVATION FAILED: {errorMsg ?? "Unknown error"}. Slide again to retry.
          </div>
        )}
      </div>

      {/* ── SUMMARY OF CONSEQUENCES ──────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            fontSize: LABEL_SIZE,
            fontWeight: 700,
            color: "rgba(255,255,255,0.20)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          What will happen
        </div>
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 16px",
            listStyle: "disc",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            cancelOrders && "All pending orders will be cancelled immediately.",
            liquidatePositions && "All positions will be market-sold — expect slippage.",
            "The trading pipeline will be halted until manually restarted.",
            "A liquidation report will be generated and stored.",
          ]
            .filter(Boolean)
            .map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: META_SIZE,
                  color: "rgba(255,255,255,0.35)",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
