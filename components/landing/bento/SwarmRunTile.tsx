"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Flame,
  Gavel,
  Play,
  Radar,
  Scale,
  Sparkles,
  Target,
} from "lucide-react";

type StepKey = "scan" | "oracle" | "edge" | "lucifer";
type Step = {
  key: StepKey;
  // Agent names are brand names and never translated.
  tool: string;
  icon: LucideIcon;
  ms: number;
};
const steps: Step[] = [
  { key: "scan", tool: "AURA · FLUX · CLAUSE", icon: Radar, ms: 1700 },
  { key: "oracle", tool: "ORACLE", icon: Target, ms: 1500 },
  { key: "edge", tool: "EDGE", icon: Scale, ms: 1300 },
  { key: "lucifer", tool: "LUCIFER", icon: Flame, ms: 1800 },
];

type CheckKey = "resolution" | "liquidity" | "drawdown";
// Each guardrail check flips to "passed" once the agent that owns it finishes.
const checks: { key: CheckKey; after: number }[] = [
  { key: "resolution", after: 0 },
  { key: "liquidity", after: 0 },
  { key: "drawdown", after: 2 },
];

type Phase =
  | {
      kind: "idle";
    }
  | {
      kind: "running";
      step: number;
    }
  | {
      kind: "done";
      step: number;
    }
  | {
      kind: "decided";
    };
const ease = [0.22, 1, 0.36, 1] as const;
export default function SwarmRunTile() {
  const t = useTranslations("landing.bento.swarm");
  const reduce = !!useReducedMotion();
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    if (!inView || reduce || (paused && phase.kind === "decided") || reviewing)
      return;
    let timer = 0;
    const next = () => {
      setPhase((current) => {
        if (current.kind === "idle") return { kind: "running", step: 0 };
        if (current.kind === "running")
          return { kind: "done", step: current.step };
        if (current.kind === "done") {
          return current.step + 1 < steps.length
            ? { kind: "running", step: current.step + 1 }
            : { kind: "decided" };
        }
        return { kind: "idle" };
      });
    };
    const delayFor = (p: Phase) => {
      if (p.kind === "idle") return round === 0 ? 900 : 250;
      if (p.kind === "running") return steps[p.step].ms;
      if (p.kind === "done") return 650;
      return 3800;
    };
    timer = window.setTimeout(() => {
      if (phase.kind === "decided") setRound((r) => r + 1);
      next();
    }, delayFor(phase));
    return () => window.clearTimeout(timer);
  }, [inView, reduce, paused, phase, round, reviewing]);
  const visibleSteps =
    phase.kind === "idle"
      ? reduce
        ? steps.length
        : 0
      : phase.kind === "decided"
        ? steps.length
        : phase.step + 1;
  const finished = (i: number) =>
    reduce ||
    phase.kind === "decided" ||
    (phase.kind === "done" && i <= phase.step) ||
    (phase.kind === "running" && i < phase.step);
  const showDecision = reduce || phase.kind === "decided";
  const progress = `${Math.min(visibleSteps, steps.length)}/${steps.length}`;
  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <div
        className="@container relative min-h-[220px] flex-1 overflow-hidden"
        style={{ containerType: "size" }}
      >
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          onViewportEnter={() => setInView(true)}
          transition={{ duration: 0.7, ease }}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          className="absolute inset-x-3 -bottom-3 top-3 flex flex-col rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
        >
          <div className="flex items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800/80">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
            >
              <Sparkles className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white">
                {t("market")}
              </p>
              <p className="truncate text-[10px] text-neutral-500">
                {t("status.label")} ·{" "}
                {phase.kind === "decided" || reduce
                  ? t("status.decided")
                  : phase.kind === "idle"
                    ? t("status.queued")
                    : t("status.working")}
              </p>
            </div>
            <button
              type="button"
              disabled={!showDecision}
              aria-pressed={showDecision ? reviewing : undefined}
              aria-label={
                showDecision ? undefined : `${t("header.progress")} ${progress}`
              }
              onClick={() => setReviewing((current) => !current)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                showDecision
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {showDecision ? (
                <Check aria-hidden="true" className="h-2.5 w-2.5" />
              ) : (
                <Play aria-hidden="true" className="h-2.5 w-2.5" />
              )}
              {showDecision
                ? reviewing
                  ? t("header.back")
                  : t("header.review")
                : progress}
            </button>
          </div>

          <div
            className={`mx-3 mt-3 min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-100 dark:border-neutral-800 ${reviewing ? "flex" : "hidden [@container(min-height:420px)]:flex"}`}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-[10px] dark:border-neutral-800">
              <span className="font-mono text-neutral-600 dark:text-neutral-400">
                SIGMA · {t("review.heading")}
              </span>
              <span className="tabular-nums text-neutral-500">
                {t("review.edge")}
              </span>
            </div>
            <div
              tabIndex={reviewing ? 0 : undefined}
              role={reviewing ? "region" : undefined}
              aria-label={reviewing ? t("review.heading") : undefined}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neutral-50 p-4 font-mono text-[11px] leading-loose text-neutral-600 [@container(min-height:420px)]:justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-400"
            >
              <span className="text-neutral-400">
                {"// "}
                {t("review.comment")}
              </span>
              <span>{t("review.lines.context")}</span>
              <span className="pl-3 text-neutral-400 line-through">
                {t("review.lines.market")}
              </span>
              <span className="-mx-4 border-l-2 border-neutral-900 bg-neutral-200/70 px-4 py-1 text-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-white">
                {t("review.lines.swarm")}
              </span>
              <span>{t("review.lines.risk")}</span>
              <div className="mt-5 hidden border-t border-neutral-200 pt-3 font-sans text-[10px] [@container(min-height:420px)]:block dark:border-neutral-800">
                <p className="mb-2 font-medium text-neutral-500">
                  {t("review.checksTitle")}
                </p>
                {checks.map((check) => {
                  const passed = finished(check.after);
                  return (
                    <div
                      key={check.key}
                      className="flex items-center justify-between gap-3 py-1"
                    >
                      <span>{t(`review.checks.${check.key}`)}</span>
                      <span className="flex items-center gap-1 text-neutral-500">
                        {passed ? (
                          <Check
                            aria-hidden="true"
                            className="h-3 w-3 text-emerald-500"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="h-1 w-1 rounded-full bg-neutral-400"
                          />
                        )}
                        {passed ? t("review.passed") : t("review.pending")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-[45px] z-10 h-8 bg-gradient-to-b from-white to-transparent dark:from-neutral-950 ${visibleSteps > 1 || showDecision ? "" : "hidden"}`}
          />

          <ol
            className={`flex min-h-0 flex-col justify-end gap-2 overflow-hidden p-3 pb-12 ${reviewing ? "hidden" : "flex-1 [@container(min-height:420px)]:flex-none"}`}
          >
            <AnimatePresence initial={false}>
              {steps.map((step, i) => {
                const Icon = step.icon;
                const done = finished(i);
                const pending = i >= visibleSteps;
                return (
                  <motion.li
                    key={`${round}-${i}`}
                    layout={reduce ? false : "position"}
                    initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                    animate={{ opacity: pending ? 0.45 : 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className={`flex gap-2.5 rounded-lg border border-neutral-100 px-2.5 dark:border-neutral-800/80 ${pending ? "items-center py-1.5" : "items-start py-2"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                        done
                          ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                          : "border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p
                        className={`${pending ? "hidden" : "flex"} items-center gap-1.5 text-[10px] text-neutral-500`}
                      >
                        <span className="font-mono">{step.tool}</span>
                        {!done && !pending && !reduce && (
                          <span aria-hidden="true" className="inline-flex gap-0.5">
                            {[0, 1, 2].map((d) => (
                              <motion.span
                                key={d}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: d * 0.18,
                                }}
                                className="h-1 w-1 rounded-full bg-neutral-400"
                              />
                            ))}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-neutral-800 dark:text-neutral-200">
                        {t(`steps.${step.key}.action`)}
                      </p>
                      <AnimatePresence initial={false}>
                        {done && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease }}
                            className="truncate pt-0.5 text-[10px] tabular-nums text-neutral-500"
                          >
                            <Check
                              aria-hidden="true"
                              className="mr-1 inline h-2.5 w-2.5 text-emerald-500"
                            />
                            {t(`steps.${step.key}.result`)}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.li>
                );
              })}

              {showDecision && (
                <motion.li
                  key={`${round}-decision`}
                  layout={reduce ? false : "position"}
                  initial={{
                    opacity: 0,
                    y: reduce ? 0 : 10,
                    scale: reduce ? 1 : 0.98,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease }}
                  className="flex items-center gap-2.5 rounded-lg bg-neutral-900 px-3 py-2.5 text-white dark:bg-white dark:text-neutral-900"
                >
                  <Gavel aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[11px] font-semibold tabular-nums">
                      SIGMA · {t("decision.title")}
                    </p>
                    <p className="truncate text-[10px] opacity-70">
                      {t("decision.meta")}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={reviewing}
                    onClick={() => setReviewing((current) => !current)}
                    className="shrink-0 cursor-pointer rounded-md bg-white/15 px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 dark:bg-neutral-900/10 dark:hover:bg-neutral-900/20 dark:focus-visible:ring-neutral-900/40"
                  >
                    {reviewing ? t("decision.back") : t("decision.review")}
                  </button>
                </motion.li>
              )}
            </AnimatePresence>
          </ol>
        </motion.div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#0c0d12]"
        />
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
