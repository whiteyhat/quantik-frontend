"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { supportsWebGL } from "@/lib/webgl";

// WebGL digital rain; loaded only in the browser so three.js stays out of the
// initial bundle.
const PixelRain = dynamic(() => import("@/components/react-bits/pixel-rain"), { ssr: false });

// Checked once per page load: probing creates a (released) GL context.
let webglSupport: boolean | undefined;
function readWebGLSupport() {
  webglSupport ??= supportsWebGL();
  return webglSupport;
}
const neverChanges = () => () => {};

/**
 * Static stand-in for the rain when WebGL is unavailable (hardware
 * acceleration off, blocklisted GPU, locked-down browser): the same blue and
 * violet glow over faint rain columns.
 */
function StaticRain() {
  return (
    <div
      data-testid="cta-static-backdrop"
      style={{
        position: "absolute",
        inset: 0,
        background: [
          "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(10,132,255,0.24), transparent 70%)",
          "radial-gradient(ellipse 45% 50% at 85% 100%, rgba(191,90,242,0.16), transparent 70%)",
          "radial-gradient(ellipse 40% 45% at 12% 100%, rgba(10,132,255,0.12), transparent 70%)",
          "repeating-linear-gradient(90deg, rgba(10,132,255,0.07) 0 1px, transparent 1px 7px)",
          "#050508",
        ].join(", "),
      }}
    />
  );
}

/** Keeps a failing effect inside its card instead of taking the page down. */
class EffectBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function RainBackdrop() {
  // null while server rendering and hydrating; decided on the client.
  const webgl = useSyncExternalStore(neverChanges, readWebGLSupport, () => null);

  if (webgl === null) return null;
  if (!webgl) return <StaticRain />;

  return (
    <EffectBoundary fallback={<StaticRain />}>
      <PixelRain
        color="#0a84ff"
        hotColor="#bf5af2"
        backgroundColor="#050508"
        speed={0.18}
        trail={7}
        vignette={0.45}
        brightness={0.9}
      />
    </EffectBoundary>
  );
}
