"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Check, Paperclip, Sparkles, Wand2, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Illustrative agent name. Agent names are never translated.
const AGENT_NAME = "NOVA-7";

const ease = [0.22, 1, 0.36, 1] as const;
const TYPE_MS = 36;
const HOLD_MS = 1800;
const ERASE_MS = 16;
const GAP_MS = 260;
const FILL_MS = 11;
const CHIP_COUNT = 3;

function placeholderAt(t: number, length: number) {
  const typeEnd = length * TYPE_MS;
  const holdEnd = typeEnd + HOLD_MS;
  const eraseEnd = holdEnd + length * ERASE_MS;
  if (t < typeEnd) return { count: Math.floor(t / TYPE_MS), done: false };
  if (t < holdEnd) return { count: length, done: false };
  if (t < eraseEnd)
    return {
      count: length - Math.floor((t - holdEnd) / ERASE_MS),
      done: false,
    };
  return { count: 0, done: t >= eraseEnd + GAP_MS };
}

function asStrings(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
}

// Adds the "sharpen" instruction without doubling punctuation ("?." etc.).
function sharpen(base: string, suffix: string) {
  if (base.endsWith(suffix)) return base;
  return /[.?!]$/.test(base) ? `${base} ${suffix}` : `${base}. ${suffix}`;
}

export default function AskAgentTile() {
  const t = useTranslations("landing.bento.chat");
  // Example asks cycle in the placeholder. The first CHIP_COUNT double as chip prompts.
  const suggestions = asStrings(t.raw("suggestions"));
  const chips = asStrings(t.raw("chips"))
    .slice(0, CHIP_COUNT)
    .map((label, i) => ({ label, prompt: suggestions[i] ?? label }));

  const reduce = !!useReducedMotion();
  const [inView, setInView] = useState(false);
  const [value, setValue] = useState("");
  const [manual, setManual] = useState(false);
  const [sent, setSent] = useState(false);
  const [attached, setAttached] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [which, setWhich] = useState(0);
  const [shown, setShown] = useState(
    reduce ? (suggestions[0]?.length ?? 0) : 0,
  );
  const clock = useRef(0);
  const [fillTarget, setFillTarget] = useState<string | null>(null);

  const placeholder = suggestions.length
    ? suggestions[which % suggestions.length]
    : "";
  const placeholderLength = placeholder.length;

  useEffect(() => {
    if (fillTarget === null) return;
    const timer = window.setTimeout(
      () => {
        if (reduce || value.length + 2 >= fillTarget.length) {
          setValue(fillTarget);
          setFillTarget(null);
        } else {
          setValue(fillTarget.slice(0, value.length + 2));
        }
      },
      reduce ? 0 : FILL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [fillTarget, value, reduce]);

  useEffect(() => {
    if (!inView || reduce || manual || placeholderLength === 0) return;
    let frame = 0;
    let last: number | null = null;
    const step = (now: number) => {
      clock.current += now - (last ?? now);
      last = now;
      const { count, done } = placeholderAt(clock.current, placeholderLength);
      setShown(count);
      if (done) {
        clock.current = 0;
        setWhich((w) => w + 1);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, manual, which, placeholderLength]);

  // Marketing tile: "sending" only plays the confirmation, then resets. Nothing leaves the page.
  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => {
      setSent(false);
      setValue("");
      setAttached(false);
      setManual(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [sent]);

  const fill = (prompt: string) => {
    if (sent || !prompt) return;
    setManual(true);
    setValue("");
    setFillTarget(prompt);
    inputRef.current?.focus();
  };
  const send = () => {
    if (!value.trim() || sent || fillTarget) return;
    setSent(true);
  };
  const active = value.length > 0 || fillTarget !== null;

  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <style>{`@keyframes ask-agent-sweep { to { transform: rotate(360deg) } }`}</style>
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          onViewportEnter={() => setInView(true)}
          transition={{ duration: 0.7, ease }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5"
        >
          <div className="group/composer relative w-full max-w-[400px] rounded-xl p-px">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 overflow-hidden rounded-xl transition-opacity duration-500 ${
                active || sent
                  ? "opacity-100"
                  : "opacity-0 group-focus-within/composer:opacity-60"
              }`}
            >
              <div
                className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgb(0_0_0/0.45)_60deg,transparent_120deg,transparent_180deg,rgb(0_0_0/0.25)_240deg,transparent_300deg)] dark:bg-[conic-gradient(from_0deg,transparent_0deg,rgb(255_255_255/0.55)_60deg,transparent_120deg,transparent_180deg,rgb(255_255_255/0.3)_240deg,transparent_300deg)]"
                style={{
                  animation: reduce
                    ? undefined
                    : `ask-agent-sweep ${sent ? 1.6 : 4}s linear infinite`,
                }}
              />
            </div>
            <div className="relative rounded-[11px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] duration-300 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
              <div className="relative min-h-[64px] px-3.5 pt-3">
                {!value && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3.5 top-3 text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-500"
                  >
                    {placeholder.split("").map((ch, i) => (
                      <span
                        key={`${which}-${i}`}
                        className="transition-opacity duration-200 ease-out"
                        style={{ opacity: reduce || i < shown ? 1 : 0 }}
                      >
                        {ch}
                        {!reduce && i === shown - 1 && (
                          <span className="-mr-[1.5px] ml-px inline-block h-3 w-[1.5px] translate-y-[2px] rounded-full bg-neutral-400 dark:bg-neutral-500" />
                        )}
                      </span>
                    ))}
                    {!reduce && shown === 0 && (
                      <span className="absolute left-0 top-0 inline-block h-3 w-[1.5px] translate-y-[3px] rounded-full bg-neutral-400 dark:bg-neutral-500" />
                    )}
                  </span>
                )}
                <textarea
                  ref={inputRef}
                  readOnly={sent}
                  value={value}
                  onFocus={() => setManual(true)}
                  onChange={(event) => {
                    setManual(true);
                    setFillTarget(null);
                    setValue(event.target.value);
                  }}
                  onBlur={() => {
                    if (!value) setManual(false);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  aria-label={t("inputLabel")}
                  rows={2}
                  className="relative w-full resize-none bg-transparent text-[12px] leading-relaxed text-neutral-900 focus:outline-none dark:text-white"
                />
              </div>
              {attached && (
                <button
                  type="button"
                  onClick={() => setAttached(false)}
                  disabled={sent}
                  className="mx-3.5 mb-2 inline-flex max-w-[calc(100%-1.75rem)] cursor-pointer items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-[10px] text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
                >
                  <Paperclip aria-hidden="true" className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t("attach.market")}</span>
                  <X aria-hidden="true" className="h-3 w-3 shrink-0" />
                  <span className="sr-only">{t("attach.remove")}</span>
                </button>
              )}
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-0.5 text-neutral-500">
                  <button
                    type="button"
                    aria-label={attached ? t("attach.remove") : t("attach.add")}
                    aria-pressed={attached}
                    disabled={sent}
                    onClick={() => setAttached((current) => !current)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:text-white"
                  >
                    {attached ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={t("improve")}
                    title={t("improve")}
                    disabled={sent}
                    onClick={() =>
                      fill(sharpen(value.trim() || placeholder, t("improveSuffix")))
                    }
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:text-white"
                  >
                    <Wand2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <span
                    className={`ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] ${active ? "border border-neutral-200 text-neutral-500 dark:border-neutral-800" : "border border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-[#30D158]"
                    />
                    <span className="sr-only">{t("agentLabel")} </span>
                    {AGENT_NAME}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-live="polite"
                    className="text-[10px] text-neutral-400"
                  >
                    {sent ? t("status") : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={sent ? t("sent") : t("send")}
                    onClick={send}
                    disabled={!value.trim() || sent || fillTarget !== null}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-default ${
                      value
                        ? "bg-neutral-900 text-white shadow-sm hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {sent ? (
                        <motion.span
                          key="sent"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="send"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {sent && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 1.4, ease }}
                    className="absolute inset-x-3 bottom-0 h-px origin-left bg-neutral-900 dark:bg-white"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex w-full max-w-[400px] flex-wrap justify-center gap-1.5">
            {chips.map((chip, i) => (
              <motion.button
                key={chip.label}
                type="button"
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease, delay: 0.25 + i * 0.06 }}
                onClick={() => fill(chip.prompt)}
                disabled={sent}
                aria-pressed={value === chip.prompt}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                  value === chip.prompt
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white"
                }`}
              >
                {chip.label}
              </motion.button>
            ))}
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
