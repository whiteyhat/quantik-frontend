"use client";

import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { type ArenaWindow } from "@/lib/api";
import { ARENA_WINDOW_OPTIONS, buildWindowHref } from "@/components/arena/arenaHelpers";
import { cn } from "@/lib/utils";

export function ArenaTabBar({ activeWindow }: { activeWindow: ArenaWindow }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="arena-tabs" role="tablist" aria-label="Arena windows">
      {ARENA_WINDOW_OPTIONS.map((windowOption) => (
        <Link
          key={windowOption.value}
          href={buildWindowHref(pathname, searchParams, windowOption.value)}
          className={cn("arena-tab", activeWindow === windowOption.value && "arena-tab--active")}
          id={`arena-tab-${windowOption.value}`}
          role="tab"
          aria-selected={activeWindow === windowOption.value}
          aria-controls="arena-stage-panel"
          aria-current={activeWindow === windowOption.value ? "page" : undefined}
          tabIndex={activeWindow === windowOption.value ? 0 : -1}
        >
          <span className="arena-tab__label">{windowOption.label}</span>
        </Link>
      ))}
    </div>
  );
}
