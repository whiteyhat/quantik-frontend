"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ChartCandlestick,
  Coins,
  Fingerprint,
  Percent,
  Send,
} from "lucide-react";

type SourceId = "polymarket" | "kraken" | "solana" | "ethereum" | "telegram";

// Brand names stay in English in every locale.
const sources: {
  id: SourceId;
  name: string;
  icon: LucideIcon;
}[] = [
  { id: "polymarket", name: "Polymarket", icon: Percent },
  { id: "kraken", name: "Kraken", icon: ChartCandlestick },
  { id: "solana", name: "Solana", icon: Coins },
  { id: "ethereum", name: "Ethereum", icon: Fingerprint },
  { id: "telegram", name: "Telegram", icon: Send },
];

// One curve per column (5 columns across a 400-wide viewBox), all landing on the hub.
const connectorPaths = [
  "M40 0 C40 44 200 22 200 64",
  "M120 0 C120 40 200 30 200 64",
  "M200 0 C200 22 200 42 200 64",
  "M280 0 C280 40 200 30 200 64",
  "M360 0 C360 44 200 22 200 64",
];

const PULSE_DURATION = 2.2;
const PULSE_STAGGER = PULSE_DURATION / connectorPaths.length;

const ease = [0.22, 1, 0.36, 1] as const;

export default function MarketsHubTile() {
  const t = useTranslations("landing.bento.markets");
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered === null ? null : sources[hovered];

  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 py-5"
        >
          <div className="grid w-full max-w-[360px] grid-cols-5 gap-1 @2xl:max-w-[480px]">
            {sources.map((source, index) => {
              const Icon = source.icon;
              const isActive = hovered === index;
              return (
                <div
                  key={source.id}
                  className="relative flex min-w-0 justify-center"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <button
                    type="button"
                    aria-label={t(`sources.${source.id}.aria`)}
                    onClick={() => setHovered(index)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    className={`relative inline-flex max-w-full cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-1.5 text-[9px] font-medium leading-none @[360px]:text-[10px] shadow-sm transition-[transform,color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 @[300px]:px-1 @2xl:text-[11px] ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive
                          ? "text-white dark:text-neutral-900"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    />
                    <span className="hidden max-w-full truncate tracking-tight @[300px]:block">
                      {source.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 400 64"
            preserveAspectRatio="none"
            className="h-12 w-full max-w-[360px] overflow-visible @sm:h-14 @2xl:max-w-[480px]"
          >
            {connectorPaths.map((d, index) => {
              const lit = hovered === index;
              return (
                <g key={d}>
                  <path
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={lit ? 1.75 : 1.25}
                    vectorEffect="non-scaling-stroke"
                    className={`transition-colors duration-300 ${
                      lit
                        ? "text-neutral-900 dark:text-white"
                        : hovered === null
                          ? "text-neutral-200 dark:text-neutral-800"
                          : "text-neutral-100 dark:text-neutral-800/60"
                    }`}
                  />
                  {!reduce && hovered === null && (
                    <motion.path
                      d={d}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      pathLength={100}
                      strokeDasharray="10 90"
                      initial={{ strokeDashoffset: 100 }}
                      animate={{ strokeDashoffset: [100, 0] }}
                      transition={{
                        duration: PULSE_DURATION,
                        repeat: Infinity,
                        ease: "linear",
                        delay: index * PULSE_STAGGER,
                      }}
                      className="text-neutral-900 dark:text-white"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-neutral-900/10 blur-md dark:bg-white/10"
            />
            <motion.span
              animate={
                reduce ? undefined : { scale: hovered === null ? 1 : 1.05 }
              }
              transition={{ duration: 0.3, ease }}
              className="relative inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              <Bot aria-hidden="true" className="h-3.5 w-3.5" />
              {t("hub")}
            </motion.span>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 2 28"
            preserveAspectRatio="none"
            className="h-6 w-[2px] @sm:h-7"
          >
            <line
              x1={1}
              y1={0}
              x2={1}
              y2={28}
              stroke="currentColor"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              className="text-neutral-200 dark:text-neutral-800"
            />
            {!reduce && (
              <motion.line
                x1={1}
                y1={0}
                x2={1}
                y2={28}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pathLength={100}
                strokeDasharray="24 76"
                animate={{ strokeDashoffset: [100, 0] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1.1,
                }}
                className="text-neutral-900 dark:text-white"
              />
            )}
          </svg>

          <div className="w-full max-w-[320px] rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] @2xl:max-w-[380px] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
            <div
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
            >
              <span className="flex items-center gap-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-ping" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {active ? t(`sources.${active.id}.status`) : t("status.idle")}
              </span>
              <span className="text-[11px] tabular-nums text-neutral-500">
                {active
                  ? t(`sources.${active.id}.detail`)
                  : t("status.idleDetail")}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
            >
              <motion.div
                initial={{ scaleX: reduce ? 0.72 : 0.08 }}
                animate={
                  reduce
                    ? undefined
                    : active
                      ? { scaleX: 1 }
                      : { scaleX: [0.08, 0.72, 0.72, 0.08] }
                }
                transition={
                  active
                    ? { duration: 0.6, ease }
                    : {
                        duration: 4.4,
                        times: [0, 0.55, 0.85, 1],
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
                className="h-full w-full origin-left rounded-full bg-neutral-900 will-change-transform dark:bg-white"
              />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
          {t("title")}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t("description")}
        </p>
      </div>
    </article>
  );
}
