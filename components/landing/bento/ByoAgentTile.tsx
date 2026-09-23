"use client";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Play, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";

type Token = {
  text: string;
  kind?: "kw" | "fn" | "str" | "prop" | "cm" | "pun";
};
type CallId = "trade" | "analyze";
type Call = {
  id: CallId;
  endpoint: string;
  lines: Token[][];
  response: string;
};

// Code, JSON, endpoints and event names are real API surface: never translated.
const setup: Token[][] = [
  [
    { text: "const ", kind: "kw" },
    { text: "api", kind: "prop" },
    { text: " = ", kind: "pun" },
    { text: '"https://api.quantik.fun/api/v1"', kind: "str" },
    { text: ";", kind: "pun" },
  ],
  [
    { text: "const ", kind: "kw" },
    { text: "auth", kind: "prop" },
    { text: " = ", kind: "pun" },
    { text: '"Bearer qk_live_…"', kind: "str" },
    { text: ";", kind: "pun" },
  ],
  [],
];

const fetchLine = (path: string): Token[] => [
  { text: "await ", kind: "kw" },
  { text: "fetch", kind: "fn" },
  { text: "(", kind: "pun" },
  { text: "`", kind: "str" },
  { text: "${api}", kind: "prop" },
  { text: `${path}\``, kind: "str" },
  { text: ", {", kind: "pun" },
];

const requestLines: Token[][] = [
  [
    { text: "  method: ", kind: "prop" },
    { text: '"POST"', kind: "str" },
    { text: ",", kind: "pun" },
  ],
  [
    { text: "  headers: ", kind: "prop" },
    { text: "{ ", kind: "pun" },
    { text: "Authorization: ", kind: "prop" },
    { text: "auth", kind: "prop" },
    { text: " },", kind: "pun" },
  ],
  [
    { text: "  body: ", kind: "prop" },
    { text: "JSON.stringify", kind: "fn" },
    { text: "({", kind: "pun" },
  ],
];

const calls: Call[] = [
  {
    id: "trade",
    endpoint: "/place_trade",
    lines: [
      ...setup,
      fetchLine("/tools/place_trade"),
      ...requestLines,
      [
        { text: "    slug: ", kind: "prop" },
        { text: '"fed-cut-december"', kind: "str" },
        { text: ",", kind: "pun" },
      ],
      [
        { text: "    direction: ", kind: "prop" },
        { text: '"YES"', kind: "str" },
        { text: ", ", kind: "pun" },
        { text: "size: ", kind: "prop" },
        { text: "120", kind: "str" },
        { text: " }),", kind: "pun" },
      ],
      [{ text: "});", kind: "pun" }],
    ],
    response: `{\n  "success": true,\n  "status": "paper",\n  "direction": "YES",\n  "size": 120,\n  "fill": 0.45\n}`,
  },
  {
    id: "analyze",
    endpoint: "/run_analysis",
    lines: [
      ...setup,
      fetchLine("/tools/run_analysis"),
      ...requestLines,
      [
        { text: "    slug: ", kind: "prop" },
        { text: '"fed-cut-december"', kind: "str" },
        { text: " }),", kind: "pun" },
      ],
      [{ text: "});", kind: "pun" }],
    ],
    response: `{\n  "success": true,\n  "decision": "BET YES",\n  "probability": 0.58,\n  "market": 0.45,\n  "size": 120\n}`,
  },
];

// Real Quantik webhook event names (X-Quantik-Event). Latencies are illustrative.
const events = [
  { name: "trade:executed", status: "200", ms: "38ms" },
  { name: "position:update", status: "200", ms: "24ms" },
  { name: "pipeline:complete", status: "200", ms: "41ms" },
  { name: "market:signal", status: "200", ms: "17ms" },
  { name: "agent:alert", status: "202", ms: "12ms" },
];

const tone: Record<NonNullable<Token["kind"]>, string> = {
  kw: "text-neutral-900 dark:text-white",
  fn: "font-medium text-neutral-900 dark:text-neutral-100",
  str: "text-neutral-500 dark:text-neutral-400",
  prop: "text-neutral-700 dark:text-neutral-300",
  cm: "italic text-neutral-400 dark:text-neutral-600",
  pun: "text-neutral-400 dark:text-neutral-500",
};

const EASE = [0.22, 1, 0.36, 1] as const;
const LINE_MS = 220;
const HOLD_MS = 4600;

export default function ByoAgentTile() {
  const t = useTranslations("landing.bento.byo");
  const reduce = !!useReducedMotion();
  const baseId = useId();
  const [inView, setInView] = useState(false);
  const [callIndex, setCallIndex] = useState(0);
  const call = calls[callIndex];
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);

  const tabs: Record<CallId, string> = {
    trade: t("calls.trade.tab"),
    analyze: t("calls.analyze.tab"),
  };

  const traces: Record<
    CallId,
    {
      title: string;
      summary: string;
      entries: { lead: string; label: string; detail: string }[];
    }
  > = {
    trade: {
      title: t("calls.trade.traceTitle"),
      summary: t("calls.trade.summary"),
      entries: [
        { lead: "00:00.001", label: t("calls.trade.steps.request"), detail: "POST /place_trade" },
        { lead: "00:00.003", label: t("calls.trade.steps.auth"), detail: "qk_live_…" },
        { lead: "00:00.009", label: t("calls.trade.steps.guardrails"), detail: t("calls.trade.details.guardrails") },
        { lead: "00:00.031", label: t("calls.trade.steps.fill"), detail: "YES @ 0.45" },
        { lead: "00:00.038", label: t("calls.trade.steps.webhooks"), detail: "trade:executed" },
        { lead: "00:00.042", label: t("calls.trade.steps.sent"), detail: "200 OK" },
      ],
    },
    analyze: {
      title: t("calls.analyze.traceTitle"),
      summary: t("calls.analyze.summary"),
      entries: [
        { lead: "AURA", label: t("calls.analyze.steps.aura"), detail: t("calls.analyze.details.aura") },
        { lead: "FLUX", label: t("calls.analyze.steps.flux"), detail: t("calls.analyze.details.flux") },
        { lead: "CLAUSE", label: t("calls.analyze.steps.clause"), detail: t("calls.analyze.details.clause") },
        { lead: "ORACLE", label: t("calls.analyze.steps.oracle"), detail: "58% vs 45%" },
        { lead: "EDGE", label: t("calls.analyze.steps.edge"), detail: "$120" },
        { lead: "LUCIFER", label: t("calls.analyze.steps.lucifer"), detail: t("calls.analyze.details.lucifer") },
        { lead: "SIGMA", label: t("calls.analyze.steps.sigma"), detail: "BET YES" },
      ],
    },
  };
  const trace = traces[call.id];

  useEffect(() => {
    if (!inView || reduce) return;
    let i = 0;
    let restart = 0;
    const tick = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= call.lines.length) {
        window.clearInterval(tick);
        restart = window.setTimeout(() => {
          setShown(0);
          setRun((r) => r + 1);
        }, HOLD_MS);
      }
    }, LINE_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(restart);
    };
  }, [inView, reduce, run, call]);

  const replay = () => {
    if (reduce) return;
    setShown(0);
    setRun((r) => r + 1);
  };

  const switchCall = (index: number) => {
    if (index === callIndex) return;
    setCallIndex(index);
    setShown(0);
    setRun((r) => r + 1);
  };

  const done = reduce || shown >= call.lines.length;
  const tabId = (id: CallId) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;

  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <motion.div
        onViewportEnter={() => setInView(true)}
        viewport={{ once: true, amount: 0.3 }}
        className="@container relative min-h-[220px] flex-1 overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="absolute inset-x-3 top-3 flex min-h-[calc(100%-0.75rem)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] @2xl:flex-row dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
        >
          <div className="flex min-w-0 shrink-0 flex-col @2xl:flex-1">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 pr-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div
                role="tablist"
                aria-label={t("tabsLabel")}
                className="flex text-[11px] font-medium"
              >
                {calls.map((c, index) => (
                  <button
                    key={c.id}
                    id={tabId(c.id)}
                    type="button"
                    role="tab"
                    aria-selected={index === callIndex}
                    aria-controls={panelId}
                    onClick={() => switchCall(index)}
                    className={`cursor-pointer border-r border-neutral-200 px-3.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:border-neutral-800 ${
                      index === callIndex
                        ? "bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                    }`}
                  >
                    {tabs[c.id]}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.button
                    key="ok"
                    type="button"
                    onClick={replay}
                    aria-label={`200 OK. ${t("replay")}`}
                    title={t("replay")}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-emerald-600 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-400"
                  >
                    <Check aria-hidden="true" className="h-3 w-3" />
                    200 OK
                  </motion.button>
                ) : (
                  <motion.button
                    key="run"
                    type="button"
                    onClick={replay}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    <Play aria-hidden="true" className="h-2.5 w-2.5" />
                    {t("run")}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <pre
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId(call.id)}
              className="shrink-0 overflow-hidden px-3 py-3 font-mono text-[11px] leading-[20px]"
            >
              <code>
                {call.lines.map((tokens, index) => {
                  const visible = reduce || index < shown;
                  const isCursorLine = index === shown - 1 && !done;
                  return (
                    <div
                      key={`${call.id}-${index}`}
                      className={`flex whitespace-pre transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 shrink-0 select-none text-right text-neutral-300 dark:text-neutral-700"
                      >
                        {index + 1}
                      </span>
                      <span className="pl-3.5">
                        {tokens.map((token, i) => (
                          <span
                            key={i}
                            className={token.kind ? tone[token.kind] : ""}
                          >
                            {token.text}
                          </span>
                        ))}
                        {isCursorLine && (
                          <span
                            aria-hidden="true"
                            className="ml-px inline-block h-[13px] w-[6px] translate-y-[2px] bg-neutral-900 motion-safe:animate-pulse dark:bg-white"
                          />
                        )}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
            <div className="hidden min-h-[180px] flex-1 flex-col border-t border-neutral-200 px-3 py-3 @2xl:flex dark:border-neutral-800">
              <div className="flex items-center justify-between text-[10px] font-medium text-neutral-500">
                <span>{trace.title}</span>
                <span className="tabular-nums">
                  {done ? trace.summary : t("running")}
                </span>
              </div>
              <ul className="mt-2 flex flex-1 flex-col justify-around gap-2">
                {trace.entries.map((entry, index) => (
                  <li
                    key={`${call.id}-${entry.lead}`}
                    className="flex items-center gap-2 font-mono text-[10px]"
                  >
                    <span className="min-w-[9ch] shrink-0 tabular-nums text-neutral-400 dark:text-neutral-500">
                      {entry.lead}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">
                      {entry.label}
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      {done || index === 0 ? entry.detail : t("pending")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-1 flex-col border-t border-neutral-200 @2xl:w-[42%] @2xl:flex-none @2xl:border-l @2xl:border-t-0 dark:border-neutral-800">
            <div className="flex items-center justify-between px-3 pt-3 text-[10px] font-medium text-neutral-500">
              <span>
                {t("response")}{" "}
                <span className="font-mono text-neutral-400 dark:text-neutral-600">
                  {call.endpoint}
                </span>
              </span>
              <span className="tabular-nums">
                {done ? "application/json" : t("waiting")}
              </span>
            </div>
            <motion.pre
              animate={{ opacity: done ? 1 : 0.3 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="whitespace-pre px-3 pb-3 pt-2 font-mono text-[11px] leading-[18px] text-neutral-600 dark:text-neutral-400"
            >
              <code>{call.response}</code>
            </motion.pre>

            <div className="flex flex-1 flex-col border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
                <Webhook aria-hidden="true" className="h-3 w-3" />
                {t("webhooks")}
              </div>
              <ul className="mt-2 flex flex-1 flex-col justify-around gap-1.5">
                {events.map((event, index) => (
                  <motion.li
                    key={event.name}
                    animate={{
                      opacity: done ? 1 : 0.3,
                      x: done ? 0 : -4,
                    }}
                    transition={{
                      duration: 0.35,
                      ease: EASE,
                      delay: done ? index * 0.12 : 0,
                    }}
                    className="flex items-center justify-between gap-3 font-mono text-[10px]"
                  >
                    <span className="truncate text-neutral-700 dark:text-neutral-300">
                      {event.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums text-neutral-500">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {event.status}
                      </span>
                      {event.ms}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#0c0d12]"
        />
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
