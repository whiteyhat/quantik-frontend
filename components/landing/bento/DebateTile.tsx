"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

type SideKey = "oracle" | "lucifer";
type Side = {
  key: SideKey;
  agent: string;
  ms: number;
  conviction: number;
  scores: readonly number[];
};
type Point = { label: string; note: string };
type SideCopy = {
  role: string;
  aria: string;
  argument: string;
  points: Point[];
  takeaway: string;
};

// Product decision label, shown as-is in every locale (like agent names).
const DECISION = "BET YES";

const sides: Side[] = [
  { key: "oracle", agent: "ORACLE", ms: 2800, conviction: 72, scores: [78, 74, 61] },
  { key: "lucifer", agent: "LUCIFER", ms: 3200, conviction: 61, scores: [66, 81, 70] },
];
const ease = [0.22, 1, 0.36, 1] as const;
const HOLD_MS = 4200;

function Stream({
  text,
  count,
  caret,
}: {
  text: string;
  count: number;
  caret?: boolean;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: i < count ? 1 : 0 }}
        >
          {word}
          {caret && i === count - 1 && (
            <span
              aria-hidden="true"
              className="-mr-[2px] ml-0.5 inline-block h-3 w-[2px] translate-y-[2px] rounded-full bg-current"
            />
          )}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export default function DebateTile() {
  const t = useTranslations("landing.bento.debate");
  const baseId = useId();
  const reduce = !!useReducedMotion();
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(0);
  const [elapsed, setElapsed] = useState(reduce ? Infinity : 0);
  const [vote, setVote] = useState<number | null>(null);
  const currentElapsed = reduce ? Infinity : elapsed;
  const finished = sides.map((s) => currentElapsed >= s.ms);
  const allDone = finished.every(Boolean);
  const stronger = sides[0].conviction >= sides[1].conviction ? 0 : 1;
  const winner = vote ?? (allDone ? stronger : null);
  const clock = useRef(0);

  const copy: Record<SideKey, SideCopy> = {
    oracle: {
      role: t("sides.oracle.role"),
      aria: t("sides.oracle.aria"),
      argument: t("sides.oracle.argument"),
      points: t.raw("sides.oracle.points") as Point[],
      takeaway: t("sides.oracle.takeaway"),
    },
    lucifer: {
      role: t("sides.lucifer.role"),
      aria: t("sides.lucifer.aria"),
      argument: t("sides.lucifer.argument"),
      points: t.raw("sides.lucifer.points") as Point[],
      takeaway: t("sides.lucifer.takeaway"),
    },
  };

  useEffect(() => {
    if (!inView || reduce || (paused && allDone)) return;
    if (!allDone) {
      let frame = 0;
      let last = performance.now();
      const step = (now: number) => {
        clock.current += now - last;
        last = now;
        setElapsed(clock.current);
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => {
      clock.current = 0;
      setElapsed(0);
      setVote(null);
      setRound((r) => r + 1);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [inView, reduce, paused, allDone]);

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
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setPaused(false);
          }}
          className="absolute inset-x-3 top-3 flex min-h-[calc(100%-0.75rem)] flex-col rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800/80">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                {t("tradeLabel")}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-800 dark:text-neutral-200">
                <span className="mr-1.5 inline-block rounded bg-neutral-100 px-1 py-px font-mono text-[9px] font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white">
                  {DECISION}
                </span>
                {t("market")}{" "}
                <span className="text-neutral-500">{t("terms")}</span>
              </p>
            </div>

            <div className="flex min-h-5 items-center self-center">
              <AnimatePresence mode="wait" initial={false}>
                {allDone ? (
                  <motion.p
                    key="verdict"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-800 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300"
                  >
                    <Check aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />
                    <span className="font-mono font-medium">SIGMA</span>
                    <span>
                      <span className="font-medium">{t("verdict.title")}</span>{" "}
                      {t("verdict.detail")}
                    </span>
                  </motion.p>
                ) : (
                  <motion.p
                    key="pending"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease }}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-neutral-500"
                  >
                    <span className="font-mono font-medium text-neutral-900 dark:text-white">
                      SIGMA
                    </span>
                    {t("verdict.pending")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-800/80">
            {sides.map((side, i) => {
              const c = copy[side.key];
              const argumentId = `${baseId}-${side.key}`;
              const progress = Math.min(1, currentElapsed / side.ms);
              const words = c.argument.split(" ");
              const count = reduce
                ? words.length
                : Math.floor(progress * words.length);
              const isWinner = winner === i;
              const conviction = progress * side.conviction;
              return (
                <button
                  key={`${round}-${i}`}
                  type="button"
                  onClick={() => {
                    setVote(i);
                    setElapsed(Infinity);
                  }}
                  aria-pressed={isWinner}
                  aria-label={c.aria}
                  aria-describedby={argumentId}
                  className={`relative flex cursor-pointer flex-col p-3 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 ${
                    isWinner
                      ? "bg-neutral-50 dark:bg-neutral-900"
                      : "bg-white hover:bg-neutral-50/60 dark:bg-neutral-950 dark:hover:bg-neutral-900/60"
                  }`}
                >
                  <div className="flex min-h-5 flex-wrap items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] text-neutral-500">
                      <span className="text-neutral-900 dark:text-white">
                        {side.agent}
                      </span>
                      {" · "}
                      {c.role}
                    </span>
                    <AnimatePresence>
                      {isWinner && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.25, ease }}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[9px] font-medium text-white dark:bg-white dark:text-neutral-900"
                        >
                          <Trophy aria-hidden="true" className="h-2.5 w-2.5" />
                          {vote === i ? t("badges.pick") : t("badges.stronger")}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <p
                    id={argumentId}
                    className={`mt-2 min-h-[54px] text-[11px] leading-relaxed transition-colors duration-300 [@container(min-height:420px)]:min-h-[96px] ${
                      winner !== null && !isWinner
                        ? "text-neutral-600 dark:text-neutral-400"
                        : "text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    <Stream
                      text={c.argument}
                      count={count}
                      caret={!finished[i] && !reduce}
                    />
                  </p>

                  <div className="my-5 hidden flex-1 flex-col justify-center gap-5 [@container(min-height:420px)]:flex">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      {t("scorecard")}
                    </p>
                    {c.points.map((point, j) => {
                      const score = side.scores[j] ?? 0;
                      return (
                        <div key={j}>
                          <div className="mb-2 flex justify-between gap-2 text-[10px] text-neutral-500">
                            <span>{point.label}</span>
                            <span className="tabular-nums">{score}%</span>
                          </div>
                          <div
                            aria-hidden="true"
                            className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                          >
                            <div
                              className="h-full rounded-full bg-neutral-400 dark:bg-neutral-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                            {point.note}
                          </p>
                        </div>
                      );
                    })}
                    <p className="text-[10px] leading-relaxed text-neutral-500">
                      {c.takeaway}
                    </p>
                  </div>

                  <div className="mb-10 mt-auto pt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                      <span>{t("conviction")}</span>
                      <span className="inline-flex shrink-0 items-center justify-end gap-1 tabular-nums">
                        <AnimatePresence>
                          {finished[i] && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.25, ease }}
                            >
                              <Check
                                aria-hidden="true"
                                className="h-2.5 w-2.5 text-neutral-900 dark:text-white"
                              />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {Math.round(conviction)}%
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="relative block h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-neutral-900 transition-[width] duration-100 ease-linear dark:bg-white"
                        style={{ width: `${conviction}%` }}
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
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
