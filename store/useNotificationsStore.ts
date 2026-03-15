"use client";

import { create } from "zustand";
import { NotificationItem } from "@/lib/api";

interface NotificationsState {
  open: boolean;
  items: NotificationItem[];
  unread: number;
  hydrated: boolean;
  setOpen: (open: boolean) => void;
  setItems: (items: NotificationItem[]) => void;
  addItem: (item: NotificationItem) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

function countUnread(items: NotificationItem[]): number {
  return items.filter((item) => !item.readAt).length;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  open: false,
  items: [],
  unread: 0,
  hydrated: false,
  setOpen: (open) => set({ open }),
  setItems: (items) =>
    set({
      items,
      unread: countUnread(items),
      hydrated: true,
    }),
  addItem: (item) =>
    set((state) => {
      const deduped = [item, ...state.items.filter((existing) => existing.id !== item.id)]
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 100);
      return {
        items: deduped,
        unread: countUnread(deduped),
        hydrated: true,
      };
    }),
  markRead: (id) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? Date.now() } : item
      );
      return {
        items,
        unread: countUnread(items),
      };
    }),
  markAllRead: () =>
    set((state) => {
      const now = Date.now();
      const items = state.items.map((item) => ({
        ...item,
        readAt: item.readAt ?? now,
      }));
      return {
        items,
        unread: 0,
      };
    }),
}));
