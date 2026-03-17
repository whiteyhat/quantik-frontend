"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ────────────────────────────────────────────────────────

export interface TradeEvent {
  orderId: string;
  slug: string;
  direction: string;
  size: number;
  price: number;
  status: string;
  paper: boolean;
  timestamp: number;
}

export interface AgentAlertEvent {
  type: "signal" | "risk" | "insight";
  title: string;
  message: string;
  slug?: string;
  confidence?: number;
  timestamp: number;
}

export interface AutopilotStatusEvent {
  isRunning: boolean;
  lastScan: string | null;
  tradesToday: number;
  circuitBreakerTriggered: boolean;
  timestamp: number;
}

export interface PositionUpdateEvent {
  slug: string;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  timestamp: number;
}

export interface PriceUpdateEventItem {
  slug: string;
  yes: number;
  no: number;
  timestamp: number;
}

export interface NotificationEvent {
  id: string;
  level: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  category?: string;
  timestamp: number;
  action?: {
    label: string;
    href: string;
  };
}

export interface PanicCooldownEvent {
  active: boolean;
  cooldownEndsAt: number | null;
  canRearm: boolean;
  reportId?: string | null;
  reason?: string | null;
  timestamp: number;
}

type EventHandler<T = unknown> = (data: T) => void;

interface SocketContextValue {
  connected: boolean;
  on: <T = unknown>(event: string, handler: EventHandler<T>) => void;
  off: (event: string, handler: EventHandler) => void;
}

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  on: () => {},
  off: () => {},
});

// ── Provider ─────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { userId: user?.id ?? null },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setConnected(true);
      if (process.env.NODE_ENV === "development") console.log("[socket.io] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (process.env.NODE_ENV === "development") console.log("[socket.io] Disconnected:", reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const on = useCallback(<T = unknown,>(event: string, handler: EventHandler<T>) => {
    socketRef.current?.on(event, handler as EventHandler);
  }, []);

  const off = useCallback((event: string, handler: EventHandler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────

export function useSocket() {
  return useContext(SocketContext);
}

/** Subscribe to a Socket.IO event — auto-cleans up on unmount */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, handler as EventHandler);
    return () => off(event, handler as EventHandler);
  }, [event, handler, on, off]);
}
