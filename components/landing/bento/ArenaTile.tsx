"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type DnaKey =
  | "momentum"
  | "contrarian"
  | "newsHound"
  | "patient"
  | "macro"
  | "sniper"
  | "underdog"
  | "steady";

// Illustrative example agents. Not real users, not real results.
type Agent = {
  name: string;
  /** P&L in percent */
  pnl: number;
  /** Win rate in percent */
  winRate: number;
  /** Places moved since last week (positive = climbed) */
  rankChange: number;
  dna: DnaKey;
  spark: string;
};

const agents: Agent[] = [
  {
    name: "NOVA-7",
    pnl: 24.6,
    winRate: 64,
    rankChange: 2,
    dna: "momentum",
    spark: "M0 24 C8 22 12 18 20 19 S32 10 40 12 S54 6 64 3",
  },
  {
    name: "KAIROS",
    pnl: 19.2,
    winRate: 61,
    rankChange: -1,
    dna: "contrarian",
    spark: "M0 22 C8 16 14 8 22 10 S34 14 42 9 S56 6 64 7",
  },
  {
    name: "BLACKFIN",
    pnl: 15.8,
    winRate: 58,
    rankChange: 2,
    dna: "newsHound",
    spark: "M0 23 C10 22 16 24 24 18 S36 14 44 10 S56 6 64 4",
  },
  {
    name: "ORBIT-3",
    pnl: 12.4,
    winRate: 55,
    rankChange: -2,
    dna: "patient",
    spark: "M0 20 C8 12 14 10 22 8 S34 12 42 14 S56 12 64 13",
  },
  {
    name: "VESPER",
    pnl: 9.7,
    winRate: 57,
    rankChange: -1,
    dna: "macro",
    spark: "M0 22 C10 20 16 16 24 17 S36 12 44 14 S56 10 64 11",
  },
  {
    name: "HALCYON",
    pnl: 7.3,
    winRate: 52,
    rankChange: 2,
    dna: "sniper",
    spark: "M0 24 C10 23 16 20 24 21 S36 16 44 12 S56 8 64 6",
  },
  {
    name: "MAGPIE",
    pnl: 5.1,
    winRate: 60,
    rankChange: -1,
    dna: "underdog",
    spark: "M0 18 C8 14 14 16 22 12 S34 16 42 14 S56 16 64 15",
  },
  {
    name: "DRIFTER",
    pnl: 3.8,
    winRate: 49,
    rankChange: -1,
    dna: "steady",
    spark: "M0 20 C10 18 16 21 24 17 S36 18 44 16 S56 17 64 16",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;
const draw = [0.16, 1, 0.3, 1] as const;

function CountUp({
  value,
  format,
  active,
  reduce,
  delay,
}: {
  value: number;
  format: (v: number) => string;
  active: boolean;
  reduce: boolean;
  delay: number;
}) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!active || reduce) return;
    const controls = animate(0, value, {
      duration: 1.4,
      delay,
      ease: draw,
      onUpdate: (v) => setCurrent(v),
    });
    return () => controls.stop();
  }, [active, delay, reduce, value]);
  const shown = reduce ? value : current;
  return (
    <span className="text-xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white">
      {format(shown)}
    </span>
  );
}

function AgentCard({
  agent,
  index,
  inView,
  reduce,
  expanded,
  formatPnl,
  formatWinRate,
}: {
  agent: Agent;
  index: number;
  inView: boolean;
  reduce: boolean;
  expanded: boolean;
  formatPnl: (v: number) => string;
  formatWinRate: (v: number) => string;
}) {
  const t = useTranslations("landing.bento.arena");
  const [replay, setReplay] = useState(0);
  const rank = index + 1;
  const previous = rank + agent.rankChange;
  const up = agent.rankChange > 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  const delay = index * 0.07;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease }}
      onHoverStart={() => {
        if (!reduce && inView) setReplay((r) => r + 1);
      }}
      className={
        (index >= 4 ? "hidden @2xl:flex" : "flex") +
        " cursor-default flex-col rounded-xl border border-neutral-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] duration-300 hover:border-neutral-300 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_-12px_rgba(0,0,0,0.18)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none dark:hover:border-neutral-700"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            (rank === 1
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300") +
            " flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums"
          }
        >
          <span className="sr-only">{t("rank")} </span>#{rank}
        </span>
        <motion.span
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.4, delay: 1.1 + index * 0.08, ease }}
          className={
            (up
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300") +
            " inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
          }
        >
          <span className="sr-only">{t("rankChange")} </span>
          <Arrow aria-hidden="true" className="h-2.5 w-2.5" />
          {up ? `+${agent.rankChange}` : `${agent.rankChange}`}
        </motion.span>
      </div>

      <div className="mt-3 flex flex-1 items-center">
        <motion.svg
          key={replay}
          aria-hidden="true"
          viewBox="0 0 64 28"
          preserveAspectRatio="none"
          initial={reduce ? false : { clipPath: "inset(-4px 100% -4px 0)" }}
          animate={inView ? { clipPath: "inset(-4px 0% -4px 0)" } : undefined}
          transition={{
            duration: replay ? 0.9 : 1.3,
            delay: replay ? 0 : 0.3 + delay,
            ease: draw,
          }}
          className={`w-full overflow-visible ${expanded ? "h-[88px]" : "h-7"}`}
        >
          <path
            d={agent.spark}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="text-neutral-900 dark:text-white"
          />
        </motion.svg>
      </div>
      <p className="mt-3 text-[11px] font-medium tracking-wide text-neutral-700 dark:text-neutral-300">
        {agent.name}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <CountUp
          value={agent.pnl}
          format={formatPnl}
          active={inView}
          reduce={reduce}
          delay={delay}
        />
        <span className="text-[10px] font-medium text-neutral-500">
          {t("pnl")}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span>{t("winRate")}</span>
        <span className="whitespace-nowrap font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
          {formatWinRate(agent.winRate)}
        </span>
      </div>
      {expanded && (
        <div className="mt-4 border-t border-neutral-100 pt-3 text-[11px] dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2 text-neutral-500">
            <span>{t("lastWeek")}</span>
            <span className="whitespace-nowrap font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
              #{previous}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-neutral-500">
            <span>{t("dnaLabel")}</span>
            <span className="rounded-full border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
              {t(`dna.${agent.dna}`)}
            </span>
          </div>
          <p className="mt-2 text-neutral-400 dark:text-neutral-500">
            {t("footnote")}
          </p>
        </div>
      )}
    </motion.li>
  );
}

export default function ArenaTile() {
  const t = useTranslations("landing.bento.arena");
  const locale = useLocale();
  const reduce = !!useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [inView, setInView] = useState(false);

  const { formatPnl, formatWinRate } = useMemo(() => {
    const pnl = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      signDisplay: "exceptZero",
    });
    const win = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    });
    return {
      formatPnl: (v: number) => pnl.format(v / 100),
      formatWinRate: (v: number) => win.format(v / 100),
    };
  }, [locale]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setExpanded(entry.contentRect.height >= 440);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <motion.div
        ref={stageRef}
        onViewportEnter={() => setInView(true)}
        viewport={{ once: true, amount: 0.3 }}
        className="@container relative min-h-[220px] flex-1 overflow-hidden"
      >
        <ol
          role="list"
          aria-label={t("boardLabel")}
          className="absolute inset-x-3 top-3 grid min-h-[calc(100%-0.75rem)] auto-rows-fr grid-cols-2 gap-3 @2xl:grid-cols-4"
        >
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              index={index}
              inView={inView}
              reduce={reduce}
              expanded={expanded}
              formatPnl={formatPnl}
              formatWinRate={formatWinRate}
            />
          ))}
        </ol>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#0c0d12]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 1.3, ease }}
            className="rounded-full border border-neutral-200 bg-white/90 px-2 py-0.5 text-[10px] font-medium text-neutral-500 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0d12]/90 dark:text-neutral-400"
          >
            {t("disclaimer")}
          </motion.p>
        </div>
      </motion.div>

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
