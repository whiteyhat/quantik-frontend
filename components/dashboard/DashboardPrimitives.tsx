"use client";

import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommandCenterCard({
  children,
  className,
  accent = "blue",
  ...props
}: ComponentProps<"section"> & {
  accent?: "blue" | "green" | "orange" | "red" | "neutral";
}) {
  return (
    <section
      className={cn("command-center-card", `command-center-card--${accent}`, className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CommandCenterHeader({
  title,
  eyebrow,
  subtitle,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="command-center-eyebrow">{eyebrow}</div> : null}
        <h2 className="command-center-title">{title}</h2>
        {subtitle ? <p className="command-center-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const STATUS_DOT_COLOR: Record<string, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-red-400",
  info: "bg-sky-400",
  neutral: "bg-white/30",
};

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  return (
    <span className={cn("command-center-badge", `command-center-badge--${tone}`)}>
      <span
        className={cn(
          "inline-block size-2 shrink-0 rounded-full",
          STATUS_DOT_COLOR[tone],
          tone === "good" && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

export function MetricBlock({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  return (
    <div className={cn("command-center-metric", `command-center-metric--${tone}`)}>
      <div className="command-center-metric-label">{label}</div>
      <div className="command-center-metric-value">{value}</div>
      {hint ? <div className="command-center-metric-hint">{hint}</div> : null}
    </div>
  );
}

export function PanelEmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="command-center-state">
      <div className="command-center-state-title">{title}</div>
      <div className="command-center-state-detail">{detail}</div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function PanelErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("dashboard.primitives");
  return (
    <div className="command-center-state command-center-state--error">
      <div className="flex items-center gap-2 text-sm font-medium text-[#ffb4ac]">
        <AlertTriangle className="size-4" />
        <span>{title}</span>
      </div>
      <div className="command-center-state-detail">{detail}</div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
