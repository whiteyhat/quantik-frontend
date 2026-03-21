"use client";

import { useEffect, useCallback } from "react";
import { useSocketEvent, TradeEvent, AgentAlertEvent, NotificationEvent } from "@/context/SocketContext";

/** Request browser notification permission on mount */
function useNotificationPermission() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);
}

function showNotification(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // Only notify when backgrounded

  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: tag ?? "quantik",
      silent: false,
    });
  } catch {
    // Notification API not supported in this context
  }
}

/**
 * Hook that subscribes to real-time trade and alert events via Socket.IO
 * and shows browser notifications when the tab is in the background.
 */
export function useTradeNotifications() {
  useNotificationPermission();

  const handleTrade = useCallback((trade: TradeEvent) => {
    const mode = trade.paper ? "Paper" : "Live";
    showNotification(
      `${mode} Trade Executed`,
      `${trade.direction} on ${trade.slug} — $${trade.size} USDC`,
      `trade-${trade.orderId}`
    );
  }, []);

  const handleAlert = useCallback((alert: AgentAlertEvent) => {
    showNotification(
      alert.title,
      alert.message,
      `alert-${alert.timestamp}`
    );
  }, []);

  const handleNotification = useCallback((notification: NotificationEvent) => {
    showNotification(
      notification.title,
      notification.message,
      notification.id
    );
  }, []);

  useSocketEvent<TradeEvent>("trade:executed", handleTrade);
  useSocketEvent<AgentAlertEvent>("agent:alert", handleAlert);
  useSocketEvent<NotificationEvent>("notification:new", handleNotification);
}
