"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { cn } from "@/lib/utils";

export type PixelRainDirection = "down" | "up";

export interface PixelRainProps {
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
  /** Content rendered above the effect */
  children?: React.ReactNode;
  /** Width of one rain column in CSS pixels */
  columnWidth?: number;
  /** How fast the columns sweep */
  speed?: number;
  /** Spread of the per-column scatter. Higher values decorrelate neighbours */
  scatter?: number;
  /** Frequency of the slow wave riding across the columns */
  waveFrequency?: number;
  /** Strength of the slow wave riding across the columns */
  waveAmplitude?: number;
  /** Length of each streak. Higher values give shorter streaks */
  trail?: number;
  /** Ambient level held between streaks */
  ambient?: number;
  /** Colour of the streaks */
  color?: string;
  /** Colour the brightest part of a streak shifts toward */
  hotColor?: string;
  /** Background fill colour. Accepts "transparent" */
  backgroundColor?: string;
  /** Travel direction of the streaks */
  direction?: PixelRainDirection;
  /** Overall gain */
  brightness?: number;
  /** Contrast curve applied at the end */
  gamma?: number;
  /** Darkening toward the edges from 0 to 1 */
  vignette?: number;
  /** Master alpha from 0 to 1 */
  opacity?: number;
  /** Let the pointer brighten nearby columns */
  cursorInteraction?: boolean;
  /** How much nearby columns brighten */
  cursorGlow?: number;
  /** Reach of the pointer highlight from 0 to 1 */
  cursorReach?: number;
  /** Drop resolution when the frame rate falls short */
  adaptiveQuality?: boolean;
  /** Frame rate the adaptive pass aims for */
  targetFps?: number;
  /** Upper bound on device pixel ratio */
  dpr?: number;
  /** Hold the animation still */
  paused?: boolean;
}

const rainVertex = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const rainFragment = `
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uColumn;
uniform float uScatter;
uniform float uWaveFreq;
uniform float uWaveAmp;
uniform float uTrail;
uniform float uAmbient;
uniform vec3 uInk;
uniform vec3 uHot;
uniform float uDownward;
uniform float uGain;
uniform float uGamma;
uniform float uVignette;
uniform float uOpacity;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform vec2 uPointer;
uniform float uCursorGlow;
uniform float uCursorReach;

void main() {
  vec2 pixel = vPlane * uCanvas;
  float lane = floor(pixel.x / max(uColumn, 1.0));

  float seed = lane * uScatter;
  float drift = fract(tan(seed) + sin(uWaveFreq * seed) * uWaveAmp);
  float pace = 1.0 + floor(fract(tan(seed * 1.7)) * 3.0);
  float span = (0.45 + fract(tan(seed * 2.3)) * 1.1) / max(uTrail, 0.01);

  float axis = mix(1.0 - vPlane.y, vPlane.y, uDownward);
  float travel = fract(uClock * pace + drift);
  float head = (1.0 + span) - travel * (1.0 + 2.0 * span);
  float depth = axis - head;

  float aa = 1.5 / max(uCanvas.y, 1.0);
  float streak = max(1.0 - depth / span, 0.0) * smoothstep(-aa, aa, depth);

  float centre = (lane + 0.5) * max(uColumn, 1.0) / max(uCanvas.x, 1.0);
  float reach = max(uCursorReach, 0.001);
  float near = exp(-pow((centre - uPointer.x) / reach, 2.0));
  streak *= 1.0 + near * uCursorGlow * uPointer.y * 2.0;

  float level = max(uAmbient + streak, 0.0);

  vec3 tint = mix(uInk, uHot, smoothstep(0.55, 1.0, streak));

  vec2 off = vPlane - 0.5;
  float edge = 1.0 - uVignette * smoothstep(0.2, 0.75, length(off));

  float cover = clamp(pow(max(level, 0.0), uGamma) * uGain * edge, 0.0, 1.0);
  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(tint * cover + uBackdrop * rest, cover + rest) * uOpacity;
}
`;

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

const subscribeToScreen = () => () => {};

const readScreenDpr = () => window.devicePixelRatio || 1;

const isClear = (paint: string) => {
  const tidy = paint.trim().toLowerCase();
  return tidy === "transparent" || tidy === "none" || tidy === "";
};

interface PointerState {
  x: number;
  reach: number;
  toReach: number;
}

interface RainFieldProps {
  awake: boolean;
  ceiling: number;
  readPointer: () => PointerState;
  columnWidth: number;
  speed: number;
  scatter: number;
  waveFrequency: number;
  waveAmplitude: number;
  trail: number;
  ambient: number;
  color: string;
  hotColor: string;
  backgroundColor: string;
  direction: PixelRainDirection;
  brightness: number;
  gamma: number;
  vignette: number;
  opacity: number;
  cursorInteraction: boolean;
  cursorGlow: number;
  cursorReach: number;
  adaptiveQuality: boolean;
  targetFps: number;
  paused: boolean;
}

const RainField = ({
  ceiling,
  readPointer,
  columnWidth,
  speed,
  scatter,
  waveFrequency,
  waveAmplitude,
  trail,
  ambient,
  color,
  hotColor,
  backgroundColor,
  direction,
  brightness,
  gamma,
  vignette,
  opacity,
  cursorInteraction,
  cursorGlow,
  cursorReach,
  adaptiveQuality,
  targetFps,
  paused,
}: RainFieldProps) => {
  const { gl, invalidate, setDpr } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const elapsed = useRef(0);
  const clock = useRef(0);
  const budget = useRef({
    scale: ceiling,
    frames: 0,
    span: 0,
    wins: 0,
    roof: Infinity,
  });
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const meter = budget.current;
    meter.scale = ceiling;
    meter.roof = Infinity;
    meter.wins = 0;
    setDpr(ceiling);
  }, [ceiling, setDpr]);

  const uniforms = useMemo(
    () => ({
      uCanvas: { value: new THREE.Vector2(1, 1) },
      uClock: { value: 0 },
      uColumn: { value: 3 },
      uScatter: { value: 1 },
      uWaveFreq: { value: 0.2 },
      uWaveAmp: { value: 1 },
      uTrail: { value: 3 },
      uAmbient: { value: 0.08 },
      uInk: { value: new THREE.Color("#16a34a") },
      uHot: { value: new THREE.Color("#22c55e") },
      uDownward: { value: 1 },
      uGain: { value: 1 },
      uGamma: { value: 1 },
      uVignette: { value: 0 },
      uOpacity: { value: 1 },
      uBackdrop: { value: new THREE.Color("#0a0a0a") },
      uBackdropAlpha: { value: 1 },
      uPointer: { value: new THREE.Vector2(0.5, 0) },
      uCursorGlow: { value: 0.35 },
      uCursorReach: { value: 0.12 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const u = material.uniforms;

    const beat = Math.min(delta, 0.05);
    elapsed.current += beat;
    if (!paused && !calm)
      clock.current = (clock.current + beat * speed * 0.32) % 1;

    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    u.uCanvas.value.set(size.x, size.y);
    u.uClock.value = clock.current;
    u.uColumn.value = Math.max(columnWidth, 1) * gl.getPixelRatio();
    u.uScatter.value = scatter;
    u.uWaveFreq.value = waveFrequency;
    u.uWaveAmp.value = waveAmplitude;
    u.uTrail.value = Math.max(trail, 0.01);
    u.uAmbient.value = ambient;
    u.uInk.value.set(color);
    u.uHot.value.set(hotColor);
    u.uDownward.value = direction === "down" ? 1 : 0;
    u.uGain.value = brightness;
    u.uGamma.value = Math.max(gamma, 0.05);
    u.uVignette.value = vignette;
    u.uOpacity.value = opacity;

    if (isClear(backgroundColor)) {
      u.uBackdropAlpha.value = 0;
    } else {
      u.uBackdrop.value.set(backgroundColor);
      u.uBackdropAlpha.value = 1;
    }

    const pointer = readPointer();
    pointer.reach += (pointer.toReach - pointer.reach) * Math.min(beat * 5, 1);
    u.uPointer.value.set(pointer.x, cursorInteraction ? pointer.reach : 0);
    u.uCursorGlow.value = cursorGlow;
    u.uCursorReach.value = cursorReach;

    const meter = budget.current;
    meter.frames += 1;
    meter.span += delta;
    if (meter.span >= 0.75) {
      const fps = meter.frames / meter.span;
      meter.frames = 0;
      meter.span = 0;
      if (adaptiveQuality && elapsed.current > 0.5) {
        if (fps < targetFps * 0.85 && meter.scale > 0.5) {
          meter.roof = meter.scale;
          meter.scale = Math.max(0.5, meter.scale * 0.75);
          meter.wins = 0;
          setDpr(meter.scale);
        } else if (fps >= targetFps * 0.95 && meter.scale < ceiling) {
          meter.wins += 1;
          const next = Math.min(ceiling, meter.scale * 1.25);
          if (meter.wins >= 3 && next < meter.roof * 0.98) {
            meter.scale = next;
            meter.wins = 0;
            setDpr(next);
          }
        } else {
          meter.wins = 0;
        }
      }
    }

    invalidate();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={rainVertex}
        fragmentShader={rainFragment}
        transparent
        premultipliedAlpha
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

const PixelRain = ({
  width = "100%",
  height = "100%",
  className,
  children,
  columnWidth = 3,
  speed = 0.2,
  scatter = 2.5,
  waveFrequency = 0.2,
  waveAmplitude = 0.6,
  trail = 6,
  ambient = 0,
  color = "#a54693",
  hotColor = "#a54693",
  backgroundColor = "#0a0a0a",
  direction = "down",
  brightness = 1,
  gamma = 1,
  vignette = 0,
  opacity = 1,
  cursorInteraction = true,
  cursorGlow = 0.9,
  cursorReach = 0.12,
  adaptiveQuality = true,
  targetFps = 60,
  dpr = 2,
  paused = false,
}: PixelRainProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<PointerState>({ x: 0.5, reach: 0, toReach: 0 });
  const [awake, setAwake] = useState(false);
  const screenDpr = useSyncExternalStore(
    subscribeToScreen,
    readScreenDpr,
    () => 1,
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const watcher = new IntersectionObserver(
      ([entry]) => setAwake(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, []);

  const readPointer = useCallback(() => pointer.current, []);

  const aimAt = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const node = rootRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    if (!box.width) return;
    pointer.current.x = (event.clientX - box.left) / box.width;
    pointer.current.toReach = 1;
  }, []);

  const release = useCallback(() => {
    pointer.current.toReach = 0;
  }, []);

  const ceiling = useMemo(
    () => clamp(Math.min(screenDpr, dpr), 0.5, 2),
    [screenDpr, dpr],
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        width,
        height,
        backgroundColor: isClear(backgroundColor) ? undefined : backgroundColor,
      }}
      onPointerMove={cursorInteraction ? aimAt : undefined}
      onPointerLeave={cursorInteraction ? release : undefined}
    >
      <Canvas
        className="absolute inset-0"
        dpr={ceiling}
        frameloop={awake ? "always" : "demand"}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        orthographic
      >
        <RainField
          awake={awake}
          ceiling={ceiling}
          readPointer={readPointer}
          columnWidth={columnWidth}
          speed={speed}
          scatter={scatter}
          waveFrequency={waveFrequency}
          waveAmplitude={waveAmplitude}
          trail={trail}
          ambient={ambient}
          color={color}
          hotColor={hotColor}
          backgroundColor={backgroundColor}
          direction={direction}
          brightness={brightness}
          gamma={gamma}
          vignette={vignette}
          opacity={opacity}
          cursorInteraction={cursorInteraction}
          cursorGlow={cursorGlow}
          cursorReach={cursorReach}
          adaptiveQuality={adaptiveQuality}
          targetFps={targetFps}
          paused={paused}
        />
      </Canvas>
      {children ? (
        <div className="relative z-10 h-full w-full">{children}</div>
      ) : null}
    </div>
  );
};

export default PixelRain;
