// WebGL feature check for decorative three.js effects.
//
// Hardware acceleration can be off, the GPU blocklisted or WebGL disabled by
// policy; three.js then throws while creating its renderer. Decorative effects
// check this first and show a static backdrop instead.

interface ProbeContext {
  getExtension?: (name: string) => unknown;
}

interface ProbeCanvas {
  getContext: (contextId: string) => unknown;
}

function browserCanvas(): ProbeCanvas | null {
  if (typeof document === "undefined") return null;
  return document.createElement("canvas");
}

export function supportsWebGL(
  createCanvas: () => ProbeCanvas | null = browserCanvas,
): boolean {
  try {
    const canvas = createCanvas();
    if (!canvas) return false;

    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as ProbeContext | null;
    if (!gl) return false;

    // Browsers cap live WebGL contexts, so release the probe right away.
    const lose = gl.getExtension?.("WEBGL_lose_context") as { loseContext?: () => void } | null | undefined;
    lose?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}
