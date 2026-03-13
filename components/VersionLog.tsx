"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { CURRENT_RELEASE, RELEASES } from "@/lib/releases";
import { useHydrated } from "@/hooks/useHydrated";

function VersionLogPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("changelog");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 38 }} />

      <div
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 220,
          width: 280,
          zIndex: 39,
          display: "flex",
          flexDirection: "column",
          background: "rgba(5,5,10,0.96)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
          transform: visible ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 240ms cubic-bezier(0.32,0.72,0,1)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "24px 16px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span
              style={{
                fontFamily: '"SF Mono","JetBrains Mono",monospace',
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.10em",
              }}
            >
              {t("title")}
            </span>
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 100,
                background: "rgba(10,132,255,0.12)",
                border: "1px solid rgba(10,132,255,0.22)",
                fontSize: 10,
                fontFamily: "monospace",
                color: "#0a84ff",
              }}
            >
              {RELEASES.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 7,
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 12,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: "6px 0 24px" }}>
          {RELEASES.map((entry, index) => (
            <div
              key={entry.version}
              style={{
                padding: "14px 16px",
                borderBottom: index < RELEASES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "2px 9px",
                    borderRadius: 100,
                    background: index === 0 ? "rgba(10,132,255,0.18)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${index === 0 ? "rgba(10,132,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                    fontFamily: '"SF Mono","JetBrains Mono",monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: index === 0 ? "#0a84ff" : "rgba(255,255,255,0.55)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {entry.version}
                </span>
                {index === 0 ? (
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 100,
                      background: "rgba(48,209,88,0.12)",
                      border: "1px solid rgba(48,209,88,0.22)",
                      fontSize: 9,
                      fontFamily: "monospace",
                      color: "#30d158",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {t("current")}
                  </span>
                ) : null}
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.20)", marginLeft: "auto" }}>
                  {entry.date}
                </span>
              </div>

              <p style={{ margin: "0 0 10px", fontSize: 11, fontStyle: "italic", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
                {entry.highlight}
              </p>

              {entry.features.length > 0 ? (
                <div style={{ marginBottom: entry.fixes.length > 0 ? 10 : 0 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      color: "rgba(48,209,88,0.65)",
                      textTransform: "uppercase",
                      marginBottom: 5,
                      fontFamily: "monospace",
                    }}
                  >
                    {t("newFeatures")}
                  </div>
                  {entry.features.map((feature) => (
                    <div
                      key={feature}
                      style={{
                        marginBottom: 4,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.45,
                      }}
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              ) : null}

              {entry.fixes.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      color: "rgba(255,159,10,0.65)",
                      textTransform: "uppercase",
                      marginBottom: 5,
                      fontFamily: "monospace",
                    }}
                  >
                    {t("bugFixes")}
                  </div>
                  {entry.fixes.map((fix) => (
                    <div
                      key={fix}
                      style={{
                        marginBottom: 4,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.45,
                      }}
                    >
                      {fix}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const SEEN_KEY = "quantik_changelog_seen";

export function VersionLogButton() {
  const t = useTranslations("changelog");
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    setHasUnread(seen !== CURRENT_RELEASE.version);
  }, []);

  function handleOpen() {
    setOpen((previous) => {
      const next = !previous;
      if (next && hasUnread) {
        localStorage.setItem(SEEN_KEY, CURRENT_RELEASE.version);
        setHasUnread(false);
      }
      return next;
    });
  }

  return (
    <>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={handleOpen}
          title={t("viewChangelog", { version: CURRENT_RELEASE.version })}
          aria-label={t("openChangelog")}
          style={{
            background: open ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${open ? "rgba(10,132,255,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 7,
            cursor: "pointer",
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: open ? "#0a84ff" : "rgba(255,255,255,0.35)",
            transition: "all 160ms ease",
          }}
        >
          📋
        </button>

        {hydrated && hasUnread ? (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#0a84ff",
              border: "1.5px solid rgba(5,5,10,1)",
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>

      {hydrated && open ? createPortal(<VersionLogPanel onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}

export default VersionLogPanel;
