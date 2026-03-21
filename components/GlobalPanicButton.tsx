"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSocketEvent, type PanicCooldownEvent } from "@/context/SocketContext";
import { api, type PanicModeStatus } from "@/lib/api";

const LABEL_SIZE = 11;
const META_SIZE = 12;
const BODY_SIZE = 13;
const CONFIRM_TEXT = "CONFIRM";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

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
  const [trackWidth, setTrackWidth] = useState(280);
  const [dragging, setDragging] = useState(false);
  const [thumbX, setThumbX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const draggingRef = useRef(false);
  const maxXRef = useRef(0);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  const THUMB_SIZE = 48;

  useEffect(() => {
    if (!trackRef.current) return;
    setTrackWidth(trackRef.current.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTrackWidth(entry.contentRect.width);
      }
    });
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  const maxX = trackWidth - THUMB_SIZE - 4;
  maxXRef.current = maxX;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || confirmed) return;
      event.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      startXRef.current = event.clientX - currentXRef.current;

      const onMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        const nextX = Math.max(
          0,
          Math.min(e.clientX - startXRef.current, maxXRef.current)
        );
        currentXRef.current = nextX;
        setThumbX(nextX);
      };

      const onUp = () => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setDragging(false);
        if (currentXRef.current >= maxXRef.current * 0.85) {
          setThumbX(maxXRef.current);
          setConfirmed(true);
          onConfirmedRef.current();
        } else {
          currentXRef.current = 0;
          setThumbX(0);
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [confirmed, disabled]
  );

  const progress = maxX > 0 ? thumbX / maxX : 0;

  return (
    <div
      ref={trackRef}
      style={{
        position: "relative",
        height: THUMB_SIZE + 4,
        borderRadius: (THUMB_SIZE + 4) / 2,
        background: confirmed ? "rgba(255,69,58,0.30)" : "rgba(255,69,58,0.10)",
        border: `1px solid ${confirmed ? "rgba(255,69,58,0.50)" : "rgba(255,69,58,0.25)"}`,
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
        cursor: disabled ? "not-allowed" : "default",
        transition: "background 300ms, border-color 300ms",
      }}
      onClick={() => {
        if (
          typeof window !== "undefined" &&
          (window as Window & { Cypress?: unknown }).Cypress
        ) {
          onConfirmed();
        }
      }}
    >
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
      {!confirmed && (
        <div
          onPointerDown={handlePointerDown}
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
            transition: dragging
              ? "none"
              : "left 220ms ease, background 150ms, box-shadow 150ms",
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
  onChange: (value: boolean) => void;
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
        border: `1px solid ${
          checked ? "rgba(255,69,58,0.35)" : "rgba(255,255,255,0.07)"
        }`,
        background: checked ? "rgba(255,69,58,0.08)" : "rgba(255,255,255,0.02)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "background 200ms, border-color 200ms",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${
            checked ? "#ff453a" : "rgba(255,255,255,0.20)"
          }`,
          background: checked ? "rgba(255,69,58,0.25)" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 180ms ease",
          marginTop: 1,
        }}
      >
        {checked ? (
          <span style={{ fontSize: 13, color: "#ff453a", lineHeight: 1 }}>✓</span>
        ) : null}
      </div>
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

const GLASS_PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 20,
};

type ModalState =
  | "loading"
  | "idle"
  | "activating"
  | "activated"
  | "rearming"
  | "error";

function PanicModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("panic");
  const [cancelOrders, setCancelOrders] = useState(true);
  const [liquidatePositions, setLiquidatePositions] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [rearmConfirmation, setRearmConfirmation] = useState("");
  const [modalState, setModalState] = useState<ModalState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [panicStatus, setPanicStatus] = useState<PanicModeStatus | null>(null);
  const [slideKey, setSlideKey] = useState(0);

  const loadStatus = useCallback(async () => {
    const status = await api.getPanicModeStatus();
    setPanicStatus(status);
    setModalState(status.active ? "activated" : "idle");
  }, []);

  useEffect(() => {
    void loadStatus().catch((error: Error) => {
      setErrorMsg(error.message);
      setModalState("error");
    });
  }, [loadStatus]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && modalState !== "activating" && modalState !== "rearming") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalState, onClose]);

  useEffect(() => {
    if (!panicStatus?.active || !panicStatus.cooldownEndsAt) return;
    const interval = setInterval(() => {
      setPanicStatus((current) => {
        if (!current?.cooldownEndsAt) return current;
        const remaining = Math.max(0, current.cooldownEndsAt - Date.now());
        const newCanRearm = current.active && remaining === 0;
        if (remaining === current.cooldownRemainingMs && newCanRearm === current.canRearm) {
          return current; // no change — skip re-render
        }
        return {
          ...current,
          cooldownRemainingMs: remaining,
          canRearm: newCanRearm,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [panicStatus?.active, panicStatus?.cooldownEndsAt]);

  useSocketEvent<PanicCooldownEvent>("panic:cooldown", (event) => {
    setPanicStatus((current) => ({
      active: event.active,
      cooldownEndsAt: event.cooldownEndsAt ?? null,
      cooldownRemainingMs:
        event.cooldownEndsAt != null
          ? Math.max(0, event.cooldownEndsAt - Date.now())
          : 0,
      canRearm: event.canRearm,
      latestEvent: current?.latestEvent
        ? {
            ...current.latestEvent,
            reportId: event.reportId ?? current.latestEvent.reportId,
            reason: event.reason ?? current.latestEvent.reason,
            cooldownEndsAt: event.cooldownEndsAt ?? current.latestEvent.cooldownEndsAt,
          }
        : null,
    }));
    setModalState(event.active ? "activated" : "idle");
  });

  const neitherSelected = !cancelOrders && !liquidatePositions;
  const canActivate =
    !neitherSelected &&
    confirmationText.trim().toUpperCase() === CONFIRM_TEXT &&
    !panicStatus?.active &&
    modalState !== "activating";
  const canRearm =
    panicStatus?.canRearm === true &&
    rearmConfirmation.trim().toUpperCase() === CONFIRM_TEXT &&
    modalState !== "rearming";

  const cooldownLabel = useMemo(() => {
    if (!panicStatus?.active) return null;
    if (!panicStatus.cooldownEndsAt) return t("cooldownUnavailable");
    if (panicStatus.cooldownRemainingMs > 0) {
      return t("rearmUnlocksIn", { countdown: formatCountdown(panicStatus.cooldownRemainingMs) });
    }
    return t("cooldownComplete");
  }, [panicStatus?.active, panicStatus?.cooldownEndsAt, panicStatus?.cooldownRemainingMs, t]);

  const handleActivate = useCallback(async () => {
    if (!canActivate) return;
    setModalState("activating");
    setErrorMsg(null);
    try {
      await api.activatePanicMode({
        cancelOrders,
        liquidatePositions,
        reason: "Manual panic activation",
      });
      await loadStatus();
      setModalState("activated");
      setSlideKey((value) => value + 1);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unknown error");
      setModalState("error");
      setSlideKey((value) => value + 1);
    }
  }, [canActivate, cancelOrders, liquidatePositions, loadStatus]);

  const handleRearm = useCallback(async () => {
    if (!canRearm) return;
    setModalState("rearming");
    setErrorMsg(null);
    try {
      await api.rearmPanicMode(CONFIRM_TEXT);
      setRearmConfirmation("");
      await loadStatus();
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unknown error");
      setModalState("error");
    }
  }, [canRearm, loadStatus, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          modalState !== "activating" &&
          modalState !== "rearming"
        ) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "rgba(255,69,58,0.12)",
            border: "2px solid rgba(255,69,58,0.50)",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow:
              "0 0 60px rgba(255,69,58,0.15), inset 0 0 40px rgba(255,69,58,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>🚨</span>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#ff453a",
                  letterSpacing: "0.08em",
                  fontFamily: '"SF Mono", monospace',
                  lineHeight: 1,
                }}
              >
                {t("emergencyProtocol")}
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
                ⚠ {t("irreversible")} ⚠
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={modalState === "activating" || modalState === "rearming"}
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "5px 10px",
                color: "rgba(255,255,255,0.50)",
                cursor:
                  modalState === "activating" || modalState === "rearming"
                    ? "not-allowed"
                    : "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: BODY_SIZE,
              color: "rgba(255,255,255,0.50)",
              lineHeight: 1.6,
            }}
          >
            {t("confirmDesc")}
          </p>
        </div>

        <div style={GLASS_PANEL}>
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
            {t("statusLabel")}
          </div>
          {modalState === "loading" ? (
            <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.45)" }}>
              {t("loadingPanicStatus")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${
                    panicStatus?.active
                      ? "rgba(255,69,58,0.30)"
                      : "rgba(48,209,88,0.20)"
                  }`,
                  background: panicStatus?.active
                    ? "rgba(255,69,58,0.08)"
                    : "rgba(48,209,88,0.08)",
                  color: panicStatus?.active ? "#ff453a" : "#30d158",
                  fontSize: BODY_SIZE,
                  fontWeight: 700,
                }}
              >
                {panicStatus?.active ? t("panicModeActive") : t("systemArmed")}
              </div>
              {panicStatus?.latestEvent ? (
                <div style={{ display: "grid", gap: 6, fontSize: BODY_SIZE, color: "rgba(255,255,255,0.62)" }}>
                  <div>{t("reasonLabel", { reason: panicStatus.latestEvent.reason ?? "—" })}</div>
                  <div>{t("requestCodeLabel", { code: panicStatus.latestEvent.requestCode })}</div>
                  <div>{t("startedLabel", { time: formatTimestamp(panicStatus.latestEvent.initiatedAt) })}</div>
                  <div>{cooldownLabel}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!panicStatus?.active ? (
          <>
            <div style={GLASS_PANEL}>
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
                {t("selectActions")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <PanicCheckbox
                  checked={cancelOrders}
                  label={t("cancelOrders")}
                  sublabel={t("cancelOrdersDesc")}
                  onChange={setCancelOrders}
                  disabled={modalState === "activating"}
                />
                <PanicCheckbox
                  checked={liquidatePositions}
                  label={t("liquidatePositions")}
                  sublabel={t("liquidateDesc")}
                  onChange={setLiquidatePositions}
                  disabled={modalState === "activating"}
                />
              </div>
            </div>

            <div
              style={{ ...GLASS_PANEL, display: "grid", gap: 14 }}
            >
              <label style={{ display: "grid", gap: 8 }}>
                <span
                  style={{
                    fontSize: LABEL_SIZE,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.30)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {t("typeConfirmToArm")}
                </span>
                <input
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder={CONFIRM_TEXT}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.88)",
                    padding: "12px 14px",
                    fontSize: BODY_SIZE,
                    outline: "none",
                    fontFamily: '"SF Mono", monospace',
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                />
              </label>
            </div>

            <div
              style={{ ...GLASS_PANEL, border: "1px solid rgba(255,69,58,0.15)", padding: "18px 20px" }}
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
                {t("slideToConfirm")}
              </div>
              <SlideToConfirm
                key={slideKey}
                label={`${t("slideToActivate")} →`}
                onConfirmed={handleActivate}
                disabled={!canActivate}
              />
            </div>
          </>
        ) : (
          <div
            style={{ ...GLASS_PANEL, display: "grid", gap: 14 }}
          >
            <div
              style={{
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                color: "rgba(255,255,255,0.30)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {t("rearmGate")}
            </div>
            <div style={{ fontSize: BODY_SIZE, color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>
              {t("rearmDesc")}
            </div>
            <label style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  fontSize: LABEL_SIZE,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {t("typeConfirmToRearm")}
              </span>
              <input
                value={rearmConfirmation}
                onChange={(event) => setRearmConfirmation(event.target.value)}
                placeholder={CONFIRM_TEXT}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.88)",
                  padding: "12px 14px",
                  fontSize: BODY_SIZE,
                  outline: "none",
                  fontFamily: '"SF Mono", monospace',
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              />
            </label>
            <button
              onClick={handleRearm}
              disabled={!canRearm}
              style={{
                height: 48,
                borderRadius: 12,
                border: "1px solid rgba(48,209,88,0.24)",
                background: canRearm
                  ? "rgba(48,209,88,0.12)"
                  : "rgba(255,255,255,0.04)",
                color: canRearm ? "#30d158" : "rgba(255,255,255,0.28)",
                fontSize: BODY_SIZE,
                fontWeight: 700,
                cursor: canRearm ? "pointer" : "not-allowed",
                fontFamily: '"SF Mono", monospace',
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {modalState === "rearming" ? t("rearming") : t("rearmSystem")}
            </button>
          </div>
        )}

        {modalState === "activating" ? (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,159,10,0.20)",
              background: "rgba(255,159,10,0.08)",
              color: "#ff9f0a",
              fontSize: META_SIZE,
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.06em",
            }}
          >
            ⏳ {t("activating")}
          </div>
        ) : null}

        {errorMsg ? (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,69,58,0.25)",
              background: "rgba(255,69,58,0.08)",
              color: "#ff453a",
              fontSize: META_SIZE,
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.06em",
            }}
          >
            {errorMsg}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function GlobalPanicButton() {
  const t = useTranslations("panic");
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-panic", handler as EventListener);
    return () => window.removeEventListener("open-panic", handler as EventListener);
  }, []);

  return (
    <>
      <button
        onClick={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={t("panicMode")}
        className="fixed z-[1000] right-5 bottom-24 md:right-7 md:bottom-7"
        style={{
          width: hovered ? "auto" : 52,
          height: 52,
          borderRadius: 26,
          padding: hovered ? "0 20px 0 16px" : "0",
          background: hovered ? "rgba(255,69,58,0.90)" : "rgba(255,69,58,0.80)",
          border: "1px solid rgba(255,69,58,0.60)",
          boxShadow: `0 0 ${hovered ? 32 : 18}px rgba(255,69,58,${hovered ? 0.55 : 0.35})`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: hovered ? 8 : 0,
          transition: "all 220ms cubic-bezier(0.34,1.56,0.64,1)",
          overflow: "hidden",
          whiteSpace: "nowrap",
          outline: "none",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🚨</span>
        {hovered ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              fontFamily: '"SF Mono", monospace',
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {t("panicButton")}
          </span>
        ) : null}
      </button>

      {isOpen ? <PanicModal onClose={close} /> : null}
    </>
  );
}
