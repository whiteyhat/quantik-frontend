"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTouchDevice } from "@/hooks/useTouchDevice";

const FONT = "'General Sans', sans-serif";

/* ── Particle system ────────────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = [
  "rgba(0, 122, 255, 0.8)",
  "rgba(191, 90, 242, 0.7)",
  "rgba(100, 180, 255, 0.6)",
  "rgba(255, 255, 255, 0.5)",
  "rgba(140, 120, 255, 0.6)",
];

function useParticles(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isHovering: boolean,
  mousePos: React.RefObject<{ x: number; y: number }>
) {
  const particles = useRef<Particle[]>([]);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const spawn = () => {
      const m = mousePos.current;
      if (!m || !isHovering) return;

      // Spawn 2-3 particles per frame while hovering
      const count = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.2;
        const life = 30 + Math.random() * 40;
        particles.current.push({
          x: m.x + (Math.random() - 0.5) * 30,
          y: m.y + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: 1 + Math.random() * 2.5,
          color:
            PARTICLE_COLORS[
              Math.floor(Math.random() * PARTICLE_COLORS.length)
            ],
        });
      }
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      spawn();

      particles.current = particles.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        // Slight upward drift
        p.vy -= 0.01;

        if (p.life <= 0) return false;

        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw glowing dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();

        return true;
      });

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [canvasRef, isHovering, mousePos]);
}

/* ── PillButton ─────────────────────────────────────────── */
export function PillButton({
  children,
  variant = "dark",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "dark" | "light";
  onClick?: () => void;
}) {
  const isDark = variant === "dark";
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouch = useTouchDevice();
  const [isHovering, setIsHovering] = useState(false);

  // Resize canvas to match wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ro = new ResizeObserver(() => {
      canvas.width = wrapper.offsetWidth;
      canvas.height = wrapper.offsetHeight;
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  useParticles(canvasRef, isHovering, mousePos);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isTouch) return;
      const wrapper = wrapperRef.current;
      const btn = btnRef.current;
      if (!wrapper || !btn) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();

      // Mouse position relative to wrapper (for particles)
      mousePos.current = {
        x: e.clientX - wrapperRect.left,
        y: e.clientY - wrapperRect.top,
      };

      // Calculate distance from button center for magnetic pull
      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;
      const distX = e.clientX - btnCenterX;
      const distY = e.clientY - btnCenterY;

      // Magnetic pull — stronger and smoother (max 12px)
      const maxPull = 12;
      const pullX =
        (distX / (wrapperRect.width / 2)) * maxPull;
      const pullY =
        (distY / (wrapperRect.height / 2)) * maxPull;

      btn.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.05)`;

      // Cursor glow position relative to button
      const relX = e.clientX - btnRect.left;
      const relY = e.clientY - btnRect.top;
      btn.style.setProperty("--mx", `${relX}px`);
      btn.style.setProperty("--my", `${relY}px`);
    },
    [isTouch]
  );

  const handleMouseEnter = useCallback(() => {
    if (isTouch) return;
    setIsHovering(true);
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return;
    setIsHovering(false);
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.transform = "translate(0, 0) scale(1)";
  }, [isTouch]);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        /* Magnetic detection area — 80px padding around the button */
        padding: 80,
        margin: -80,
        cursor: "pointer",
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <button
        ref={btnRef}
        onClick={onClick}
        className={`pill-button-magnetic group relative inline-flex cursor-pointer overflow-hidden active:scale-[0.98] ${
          isHovering ? "is-hovering" : ""
        }`}
        style={{
          borderRadius: 9999,
          border: "0.6px solid rgba(255,255,255,0.6)",
          background: "transparent",
          padding: 1,
          transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          zIndex: 2,
        }}
      >
        <span
          className="transition-opacity duration-300"
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 12,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
            borderRadius: "0 0 50% 50%",
            filter: "blur(4px)",
            pointerEvents: "none",
            opacity: isHovering ? 1 : 0.7,
          }}
        />
        <span
          className={`relative inline-flex items-center justify-center transition-colors duration-200 ${
            isDark
              ? "bg-black text-white/90 group-hover:text-white"
              : "bg-white text-black group-hover:bg-white/90"
          }`}
          style={{
            borderRadius: 9999,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 500,
            padding: "11px 29px",
            lineHeight: 1,
          }}
        >
          {children}
        </span>
      </button>
    </div>
  );
}
