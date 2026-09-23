"use client";
import { useId } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { Check, FlaskConical, OctagonX, Scale, ZapOff } from "lucide-react";

const SIZE = 240;
const shieldPath =
  "M120 34 L192 60 V118 C192 162 162 192 120 208 C78 192 48 162 48 118 V60 Z";
const innerShieldPath =
  "M120 58 L172 77 V118 C172 152 150 176 120 188 C90 176 68 152 68 118 V77 Z";

// Positions are tuned so the longest translations (es/de) never collide
// with each other, the keyhole or the "all clear" seal.
const guardrails = [
  {
    key: "circuitBreaker",
    icon: ZapOff,
    className: "left-[2%] top-[12%]",
    iconClassName: "text-neutral-500 dark:text-neutral-400",
    delay: 0,
    depth: 18,
  },
  {
    key: "kelly",
    icon: Scale,
    className: "right-[2%] top-[27%]",
    iconClassName: "text-neutral-500 dark:text-neutral-400",
    delay: 1.3,
    depth: 26,
  },
  {
    key: "paper",
    icon: FlaskConical,
    className: "right-[-4%] top-[63%]",
    iconClassName: "text-neutral-500 dark:text-neutral-400",
    delay: 2.4,
    depth: 22,
  },
  {
    key: "panic",
    icon: OctagonX,
    className: "left-[-4%] bottom-[9%]",
    iconClassName: "text-[#FF453A]",
    delay: 3.3,
    depth: 20,
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export default function GuardrailsTile() {
  const t = useTranslations("landing.bento.guardrails");
  const reduce = !!useReducedMotion();
  const clipId = useId();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [10, -10]), {
    stiffness: 160,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-12, 12]), {
    stiffness: 160,
    damping: 18,
  });
  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const release = () => {
    px.set(0);
    py.set(0);
  };
  return (
    <article className="group relative flex h-full min-h-[380px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#0c0d12]">
      <div className="@container relative min-h-[220px] flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]"
        />

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease }}
          onPointerMove={track}
          onPointerLeave={release}
          className="absolute inset-0 flex items-center justify-center p-4 [perspective:900px]"
        >
          <motion.div
            style={{ rotateX, rotateY, width: SIZE, height: SIZE }}
            className="relative shrink-0 scale-[0.85] [transform-style:preserve-3d] @sm:scale-100 @2xl:scale-[1.12]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-[14px] rounded-full border border-dashed border-neutral-300 motion-safe:animate-[spin_60s_linear_infinite] dark:border-neutral-700"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[34px] rounded-full bg-neutral-900/[0.04] blur-2xl dark:bg-white/[0.06]"
            />

            <svg
              aria-hidden="true"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <clipPath id={clipId}>
                  <path d={shieldPath} />
                </clipPath>
              </defs>
              <path
                d={shieldPath}
                strokeWidth={1.25}
                className="fill-neutral-100 stroke-neutral-300 dark:fill-neutral-800 dark:stroke-neutral-700"
              />
              <path
                d={innerShieldPath}
                strokeWidth={1}
                className="fill-white stroke-neutral-200 dark:fill-neutral-950 dark:stroke-neutral-800"
              />
              {!reduce && (
                <motion.g clipPath={`url(#${clipId})`}>
                  <motion.rect
                    x={40}
                    width={160}
                    height={28}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: [20, 200], opacity: [0, 0.9, 0.9, 0] }}
                    transition={{
                      duration: 3.4,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.15, 0.85, 1],
                    }}
                    className="fill-neutral-900/[0.08] dark:fill-white/[0.1]"
                  />
                  <motion.line
                    x1={40}
                    x2={200}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: [20, 200], opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 3.4,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.15, 0.85, 1],
                    }}
                    stroke="currentColor"
                    strokeWidth={1.25}
                    className="text-neutral-900 dark:text-white"
                  />
                </motion.g>
              )}
              <g className="fill-neutral-900 dark:fill-white">
                <circle cx={120} cy={116} r={13} />
                <path d="M114 124 h12 l3 22 h-18 z" />
              </g>
              <circle
                cx={120}
                cy={116}
                r={5}
                className="fill-white dark:fill-neutral-950"
              />
            </svg>

            {guardrails.map((guardrail) => {
              const Icon = guardrail.icon;
              return (
                <motion.span
                  key={guardrail.key}
                  animate={reduce ? undefined : { y: [0, -5, 0] }}
                  transition={{
                    duration: 4.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: guardrail.delay,
                  }}
                  style={{ translateZ: guardrail.depth }}
                  className={`absolute inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm will-change-transform dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 ${guardrail.className}`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`h-3 w-3 ${guardrail.iconClassName}`}
                  />
                  {t(`chips.${guardrail.key}`)}
                </motion.span>
              );
            })}

            <motion.span
              aria-hidden="true"
              initial={{ scale: reduce ? 1 : 0.6, opacity: reduce ? 1 : 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              style={{ translateZ: 30 }}
              className="absolute bottom-[11%] right-[16%] flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-neutral-900 text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] dark:border-[#0c0d12] dark:bg-white dark:text-neutral-900 dark:shadow-none"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.span>
          </motion.div>
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
