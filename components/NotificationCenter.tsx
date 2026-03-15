"use client";

import { useEffect } from "react";
import { api, NotificationItem } from "@/lib/api";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { useSocketEvent } from "@/context/SocketContext";
import { useRouter } from "@/i18n/navigation";

function levelColor(level: NotificationItem["level"]): string {
  switch (level) {
    case "success":
      return "var(--ios-green)";
    case "warning":
      return "var(--ios-orange)";
    case "error":
      return "var(--ios-red)";
    default:
      return "var(--ios-blue)";
  }
}

export function NotificationCenterButton({ compact = false }: { compact?: boolean }) {
  const unread = useNotificationsStore((state) => state.unread);
  const open = useNotificationsStore((state) => state.open);
  const setOpen = useNotificationsStore((state) => state.setOpen);

  return (
    <button
      onClick={() => setOpen(!open)}
      aria-label="Open notifications"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: compact ? 36 : 38,
        height: compact ? 36 : 38,
        borderRadius: 12,
        border: "1px solid var(--glass-border)",
        background: "var(--glass-surface)",
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 16 }}>🔔</span>
      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            background: "var(--ios-red)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            boxShadow: "0 6px 18px rgba(255,69,58,0.35)",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

export function NotificationCenterPanel() {
  const router = useRouter();
  const open = useNotificationsStore((state) => state.open);
  const items = useNotificationsStore((state) => state.items);
  const hydrated = useNotificationsStore((state) => state.hydrated);
  const setItems = useNotificationsStore((state) => state.setItems);
  const addItem = useNotificationsStore((state) => state.addItem);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const setOpen = useNotificationsStore((state) => state.setOpen);

  useEffect(() => {
    if (hydrated) return;
    api.getNotifications().then((response) => {
      setItems(response.notifications);
    }).catch(() => {});
  }, [hydrated, setItems]);

  useSocketEvent<NotificationItem>("notification:new", (notification) => {
    addItem(notification);
  });

  if (!open) return null;

  return (
    <>
      <button
        aria-label="Close notifications"
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          border: "none",
          zIndex: 80,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          bottom: 16,
          width: "min(420px, calc(100vw - 24px))",
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          background: "var(--panel-surface)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          zIndex: 81,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Notifications</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Live operator feed</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                markAllRead();
                void api.markAllNotificationsRead().catch(() => {});
              }}
              style={{
                border: "1px solid var(--glass-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "8px 10px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              }}
            >
              MARK ALL
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid var(--glass-border)",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--glass-border)",
                borderRadius: 18,
                padding: 24,
                color: "var(--text-secondary)",
                textAlign: "center",
                fontSize: 13,
              }}
            >
              No notifications yet.
            </div>
          ) : (
            items.map((item) => {
              const unread = !item.readAt;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    markRead(item.id);
                    void api.markNotificationRead(item.id).catch(() => {});
                    if (item.action?.href) {
                      router.push(item.action.href as any);
                    }
                  }}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 18,
                    border: `1px solid ${unread ? `${levelColor(item.level)}55` : "var(--glass-border)"}`,
                    background: unread ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: levelColor(item.level), fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
                      {(item.category ?? item.level).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>
                    {item.title}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
                    {item.message}
                  </div>
                  {item.action?.label && (
                    <span style={{ color: "var(--ios-blue)", fontSize: 12, fontWeight: 600 }}>
                      {item.action.label} →
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
