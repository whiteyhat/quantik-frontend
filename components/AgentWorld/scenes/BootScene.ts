import Phaser from "phaser";
import { MAP_WIDTH_PX, MAP_HEIGHT_PX, ROOMS, CORRIDOR_ROWS, TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from "../config/worldMap";

// ─── Boot Scene ───────────────────────────────────────────────────────────────
// Loads all assets and shows a pixel-art progress bar. Falls back to generated
// textures if sprite files are missing.

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.createProgressBar();
    this.loadAssetsWithFallback();
  }

  create(): void {
    // Generate placeholder textures for anything that failed to load
    this.generatePlaceholderTextures();
    this.scene.start("WorldScene");
    this.scene.launch("UIScene");
  }

  // ── Progress Bar ────────────────────────────────────────────────────

  private createProgressBar(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const barW = 200;
    const barH = 8;
    const x = (w - barW) / 2;
    const y = h / 2;

    const bg = this.add.rectangle(w / 2, y, barW + 4, barH + 4, 0x1a1a2e);
    bg.setStrokeStyle(1, 0x333355);

    const bar = this.add.rectangle(x + 2, y, 0, barH, 0x30d158);
    bar.setOrigin(0, 0.5);

    const label = this.add.text(w / 2, y - 16, "LOADING QUANTIK WORLD", {
      fontSize: "8px",
      fontFamily: '"Press Start 2P", monospace',
      color: "#ffffff",
      resolution: 2,
    });
    label.setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      bar.width = barW * value;
    });

    this.load.on("complete", () => {
      bg.destroy();
      bar.destroy();
      label.destroy();
    });
  }

  // ── Asset Loading ───────────────────────────────────────────────────

  private loadAssetsWithFallback(): void {
    // Single world background image (replaces old world-bg, room-interiors, world-tiles)
    this.load.image("world-map", "/game/tiles/world.png");

    // Main agent character
    this.load.spritesheet("main-agent", "/game/characters/main-agent.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    // NPC sprites
    const npcs = ["aura", "oracle", "flux", "edge", "clause", "lucifer", "sigma"];
    for (const npc of npcs) {
      this.load.spritesheet(`npc-${npc}`, `/game/characters/${npc}-npc.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    // Particle sprites
    this.load.spritesheet("particles", "/game/effects/particles.png", {
      frameWidth: 8,
      frameHeight: 8,
    });

    // Suppress load errors — we'll generate placeholders
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[AgentWorld] Asset not found, using placeholder: ${file.key}`);
    });
  }

  // ── Placeholder Texture Generation ──────────────────────────────────

  private generatePlaceholderTextures(): void {
    // Generate fallback world background if world.png failed to load
    if (!this.textures.exists("world-map") || this.textures.get("world-map").key === "__MISSING") {
      this.generateWorldFallback();
    }

    // Generate main agent placeholder
    if (!this.textures.exists("main-agent") || this.textures.get("main-agent").key === "__MISSING") {
      this.generateCharacterPlaceholder("main-agent", 0x8888aa, 32);
    }

    // Generate NPC placeholders
    const npcColors: Record<string, number> = {
      aura: 0xbf5af2,
      oracle: 0x0a84ff,
      flux: 0x00d4ff,
      edge: 0xff9f0a,
      clause: 0x30d158,
      lucifer: 0xff453a,
      sigma: 0x8a2be2,
    };

    for (const [npc, color] of Object.entries(npcColors)) {
      const key = `npc-${npc}`;
      if (!this.textures.exists(key) || this.textures.get(key).key === "__MISSING") {
        this.generateCharacterPlaceholder(key, color, 32);
      }
    }

    // Generate particle placeholder
    if (!this.textures.exists("particles") || this.textures.get("particles").key === "__MISSING") {
      this.generateParticlePlaceholder();
    }

    // Generate glow circle for ambient lighting
    this.generateGlowCircle();
  }

  /** Generates a minimal fallback background with colored room rectangles */
  private generateWorldFallback(): void {
    const canvas = this.textures.createCanvas("world-map", MAP_WIDTH_PX, MAP_HEIGHT_PX);
    const ctx = canvas!.getContext();

    // Dark earth background
    ctx.fillStyle = "#1a120a";
    ctx.fillRect(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);

    // Forest canopy (top 4 rows)
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, 0, MAP_WIDTH_PX, 4 * TILE_SIZE);

    // Draw corridors
    ctx.fillStyle = "#333333";
    for (const cy of CORRIDOR_ROWS) {
      ctx.fillRect(0, cy * TILE_SIZE, MAP_WIDTH_PX, TILE_SIZE);
    }

    // Draw rooms as colored rectangles
    for (const room of ROOMS) {
      const { x, y, w, h } = room.bounds;
      const color = room.theme.floorColor;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;

      // Room wall
      ctx.fillStyle = `rgb(${(room.theme.wallColor >> 16) & 0xff},${(room.theme.wallColor >> 8) & 0xff},${room.theme.wallColor & 0xff})`;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);

      // Room interior (1 tile border)
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect((x + 1) * TILE_SIZE, (y + 1) * TILE_SIZE, (w - 2) * TILE_SIZE, (h - 2) * TILE_SIZE);
    }

    canvas!.refresh();
  }

  private generateCharacterPlaceholder(key: string, color: number, size: number): void {
    const cols = 4;
    const rows = 4;
    const canvas = this.textures.createCanvas(key, size * cols, size * rows);
    const ctx = canvas!.getContext();

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ox = col * size;
        const oy = row * size;

        // Body
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(ox + 8, oy + 6, 16, 20);

        // Head
        ctx.fillStyle = `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)})`;
        ctx.fillRect(ox + 10, oy + 2, 12, 10);

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ox + 12, oy + 5, 3, 3);
        ctx.fillRect(ox + 18, oy + 5, 3, 3);
        ctx.fillStyle = "#000000";
        ctx.fillRect(ox + 13, oy + 6, 2, 2);
        ctx.fillRect(ox + 19, oy + 6, 2, 2);

        // Antenna
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(ox + 15, oy + 0, 2, 4);
        ctx.fillRect(ox + 14, oy + 0, 4, 2);

        // Legs offset for walk animation
        const legOffset = col % 2 === 0 ? 0 : 2;
        ctx.fillStyle = `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)})`;
        ctx.fillRect(ox + 10, oy + 24 + legOffset, 4, 6 - legOffset);
        ctx.fillRect(ox + 18, oy + 24 - legOffset, 4, 6 + legOffset);
      }
    }

    canvas!.refresh();

    // Add frames
    const tex = this.textures.get(key);
    let frame = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tex.add(frame, 0, col * size, row * size, size, size);
        frame++;
      }
    }
  }

  private generateGlowCircle(): void {
    if (this.textures.exists("glow-circle")) return;
    const size = 64;
    const canvas = this.textures.createCanvas("glow-circle", size, size);
    const ctx = canvas!.getContext();
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.5)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas!.refresh();
  }

  private generateParticlePlaceholder(): void {
    const size = 8;
    const count = 16;
    const canvas = this.textures.createCanvas("particles", size * count, size);
    const ctx = canvas!.getContext();

    const particleColors = [
      0xffffff, 0x30d158, 0xff453a, 0xff9f0a,
      0x0a84ff, 0xbf5af2, 0xffd700, 0x00d4ff,
      0xff6b6b, 0x6bff6b, 0x6b6bff, 0xffff6b,
      0xff6bff, 0x6bffff, 0xaaaaaa, 0x555555,
    ];

    particleColors.forEach((color, i) => {
      const pr = (color >> 16) & 0xff;
      const pg = (color >> 8) & 0xff;
      const pb = color & 0xff;
      ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
      // Draw a small diamond shape
      ctx.fillRect(i * size + 2, 0, 4, 1);
      ctx.fillRect(i * size + 1, 1, 6, 1);
      ctx.fillRect(i * size, 2, 8, 4);
      ctx.fillRect(i * size + 1, 6, 6, 1);
      ctx.fillRect(i * size + 2, 7, 4, 1);
    });

    canvas!.refresh();

    const tex = this.textures.get("particles");
    for (let i = 0; i < count; i++) {
      tex.add(i, 0, i * size, 0, size, size);
    }
  }
}
