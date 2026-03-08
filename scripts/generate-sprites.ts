#!/usr/bin/env tsx
/**
 * Quantik Agent World — Sprite Generation Script
 *
 * Calls Gemini (Nano Banana Pro) to generate pixel art assets, then post-processes
 * them to exact dimensions with transparent backgrounds for Phaser.
 *
 * Usage:
 *   npx tsx scripts/generate-sprites.ts            # Generate all missing sprites
 *   npx tsx scripts/generate-sprites.ts --force     # Regenerate everything
 *   npx tsx scripts/generate-sprites.ts --only=main-agent  # Generate one sprite
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY
  ?? readEnvFile()
  ?? (() => { throw new Error("GEMINI_API_KEY not found. Set env var or check .env.production"); })();

const MODEL = "nano-banana-pro-preview";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const OUTPUT_DIR = path.resolve(__dirname, "../public/game");
const RETRY_COUNT = 3;
const DELAY_MS = 4000; // Between API calls to avoid rate limits

// ─── CLI Flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find(a => a.startsWith("--only="))?.split("=")[1] ?? null;

// ─── Sprite Definitions ──────────────────────────────────────────────────────

interface SpriteDef {
  name: string;
  outputPath: string;
  prompt: string;
  expectedWidth: number;
  expectedHeight: number;
  stripBackground: boolean; // true = replace near-black/magenta with transparent
}

const STYLE_RULES = `
Style rules (CRITICAL — follow exactly):
- Stardew Valley / Terraria 16-bit pixel art style
- Top-down perspective with slight 3/4 view for characters
- Clean, crisp pixel art with absolutely NO anti-aliasing, NO smooth gradients, NO blur
- Hard pixel edges only — every pixel should be deliberately placed
- Limited color palette per sprite (max 16-24 colors)
- Rich, saturated colors with good contrast
- TRANSPARENT background (alpha channel). If transparency is not possible, use bright magenta (#FF00FF) as chroma key background
`.trim();

const SPRITE_DEFS: SpriteDef[] = [
  // ── 1. World Tile Sheet ──────────────────────────────────────────
  {
    name: "world-tiles",
    outputPath: "tiles/world-tiles.png",
    expectedWidth: 256,
    expectedHeight: 16,
    stripBackground: true,
    prompt: `Create a pixel art tile sheet sprite image. The image must be EXACTLY 256 pixels wide and 16 pixels tall.

It contains 16 tiles arranged in a single horizontal row, each tile exactly 16×16 pixels.

The tiles from left to right:
1. Light grass tile — bright green (#3a6b35) with subtle 2-shade pixel noise texture, a few darker green pixels scattered
2. Dark grass tile — deeper green (#2d5a28) with similar pixel noise, slight variation from tile 1
3. Stone path tile — medium gray (#666666) flat stone with subtle edge lines marking individual pavers
4. Stone path variant — slightly lighter gray (#777777) with different paver pattern
5. Wood wall tile — warm brown (#8b6914) horizontal plank pattern with darker grain lines
6. Metal wall tile — dark gunmetal gray (#444444) with subtle rivet dots in corners
7. Hell floor tile — deep crimson red (#4a1010) with subtle orange (#662200) cracks suggesting lava beneath
8. Tech floor tile — dark teal (#0a2a3a) with subtle grid line pattern in slightly lighter teal
9. Purple floor tile — deep purple (#2d1b4e) with mystical shimmer pixels in lighter purple (#4a2d7a)
10. Vault floor tile — dark gold/bronze (#3a3010) with subtle metallic sheen
11. Tree canopy tile — rich green (#2a5a20) round leafy pattern, dense pixel clusters suggesting foliage
12. Tree trunk tile — brown (#5a3a1a) vertical bark texture with darker vertical lines
13. Fence horizontal — brown wood (#8b6914) picket fence viewed from top, showing horizontal rail and post tops
14. Fence vertical — same brown wood but oriented vertically
15. Water tile — deep blue (#1a4a6a) with lighter blue (#3a7aaa) pixel highlights suggesting ripples
16. Door frame tile — medium gray (#555555) stone doorway arch frame

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  // ── 2. Main Agent Character ─────────────────────────────────────
  {
    name: "main-agent",
    outputPath: "characters/main-agent.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art character sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is a cute robot trading agent in Stardew Valley style:
- Silver/light gray (#aaaabb) metallic boxy-rounded body
- Small antenna on top of head (2px wide, 4px tall) with a tiny cyan (#00d4ff) glowing tip
- Round white eyes (3×3 pixels) with small dark pupils
- Compact torso with a small green (#30d158) LED on chest
- Stubby arms and legs in darker gray (#777788)
- About 24px tall, centered in each 32×32 frame

Grid layout (4 columns × 4 rows):
Row 1 (frames 0-3): Walking DOWN — 4 frames of walk cycle facing the viewer, legs alternating
Row 2 (frames 4-7): Walking LEFT — 4 frames of walk cycle facing left, arms swinging
Row 3 (frames 8-11): Walking RIGHT — 4 frames of walk cycle facing right, arms swinging
Row 4 (frames 12-15): Walking UP — 4 frames of walk cycle facing away, showing back of head

Each walk cycle should have clear leg movement: frame 1 (stand), frame 2 (left step), frame 3 (stand), frame 4 (right step).

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  // ── 3-9. NPC Sprites ────────────────────────────────────────────
  {
    name: "aura-npc",
    outputPath: "characters/aura-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is AURA — a mystical sentiment-reading robot in Stardew Valley style:
- Purple/violet (#bf5af2) metallic body with crystal-like facets
- Glowing purple eyes
- Small floating crystal orbs around the head (1-2 tiny cyan/purple pixels orbiting)
- Antenna with a crystal shard tip instead of a ball
- Mystical/psychic aesthetic — think fortune teller robot
- About 24px tall, centered in each 32×32 frame

Grid layout (4 columns × 4 rows):
Row 1 (frames 0-3): IDLE animation — gentle floating/bobbing motion, crystals orbit slowly, 4 frames looping
Row 2 (frames 4-7): WORKING animation — eyes glow bright, crystal orbs spin fast, energy waves emanate, 4 frames
Row 3 (frames 8-11): CELEBRATE animation — jumping up and down, sparkle particles, crystals pulse, 4 frames
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up (static poses)

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "oracle-npc",
    outputPath: "characters/oracle-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is ORACLE — a stargazing probability-forecasting robot in Stardew Valley style:
- Blue (#0a84ff) metallic body with telescope attachment
- A small brass telescope mounted on one shoulder or held in hand
- Star-patterned markings on body (tiny white dots)
- Wise/scholarly appearance — maybe a small pointed hat or observatory dome on head
- Glowing blue eyes
- About 24px tall, centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — looking through telescope, slight sway, stars twinkle around head
Row 2 (frames 4-7): WORKING — telescope scanning rapidly, star charts appear, calculating
Row 3 (frames 8-11): CELEBRATE — telescope raised triumphantly, stars burst around
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "flux-npc",
    outputPath: "characters/flux-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is FLUX — a chemistry/liquidity analysis robot in Stardew Valley style:
- Cyan/teal (#00d4ff) metallic body
- Carrying or wearing test tubes and beakers (tiny colored liquid vials attached to belt/back)
- Lab goggles or visor over eyes
- Liquid-filled transparent belly section showing bubbling colors
- Mad scientist vibe but cute robot version
- About 24px tall, centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — mixing beakers, liquids slosh gently, bubble particles
Row 2 (frames 4-7): WORKING — tubes bubbling frantically, liquids changing colors, steam
Row 3 (frames 8-11): CELEBRATE — holding beaker up high, colorful explosion of particles
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "edge-npc",
    outputPath: "characters/edge-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is EDGE — an industrial position-sizing robot in Stardew Valley style:
- Orange/amber (#ff9f0a) and dark gray metallic body
- Yellow hazard stripe markings on torso
- Heavy-duty industrial build — bulkier than other robots
- Calculator or abacus held in one hand
- Warning light on head (small orange blinking pixel)
- Safety goggles or hardhat
- About 24px tall, centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — monitoring gauges, tapping calculator, slight head movement
Row 2 (frames 4-7): WORKING — warning light flashing, rapid calculations, numbers floating
Row 3 (frames 8-11): CELEBRATE — punching air, gauge goes to max, sparks fly
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "clause-npc",
    outputPath: "characters/clause-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is CLAUSE — a contract-analyzing garden robot in Stardew Valley style:
- Green (#30d158) metallic body with leaf/vine decorative accents
- Carrying a scroll or document in one hand
- Magnifying glass accessory (either held or mounted as monocle)
- Plant growing from top of head (small sprout with 2-3 leaves)
- Gentle, scholarly gardener appearance
- About 24px tall, centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — reading scroll, gently swaying, plant sways
Row 2 (frames 4-7): WORKING — magnifying glass examining document closely, stamping
Row 3 (frames 8-11): CELEBRATE — scroll unfurls with checkmark, plant blooms flower
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "lucifer-npc",
    outputPath: "characters/lucifer-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is LUCIFER — a devil's advocate demon robot in Stardew Valley style:
- Dark red/crimson (#ff453a) and dark brown metallic body
- Two prominent curved horns on head (brown #5a2a0a, 6-8px tall each)
- Glowing red (#ff0000) eyes
- Small demonic wings on back (dark red, folded)
- Forked tail visible
- Menacing but still cute in pixel art style (like a chibi demon robot)
- Fire/ember particles near feet
- About 26px tall (with horns), centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — standing menacingly by pentagram, fire flickers at feet, tail swishes
Row 2 (frames 4-7): WORKING — eyes glow bright red, fire erupts around, dark energy
Row 3 (frames 8-11): CELEBRATE — rare smile, fire becomes warm gold, relaxed horns
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  {
    name: "sigma-npc",
    outputPath: "characters/sigma-npc.png",
    expectedWidth: 128,
    expectedHeight: 128,
    stripBackground: true,
    prompt: `Create a pixel art NPC sprite sheet. The image must be EXACTLY 128 pixels wide and 128 pixels tall.

It contains a 4×4 grid of character frames, each frame exactly 32×32 pixels.

The character is SIGMA — a wolf-commander synthesis robot in Stardew Valley style:
- Deep purple (#8a2be2) and dark gray metallic body
- Wolf-like features: pointed ear-like antenna, sharp angular face plate
- Cape or cloak draped over one shoulder (dark purple)
- Command insignia on chest (gold star or sigma symbol)
- Stern, authoritative pose — the leader/general
- Holographic data visor over one eye
- About 24px tall, centered in each 32×32 frame

Grid layout:
Row 1 (frames 0-3): IDLE — seated at command chair or standing at attention, cape billows slightly
Row 2 (frames 4-7): WORKING — holographic maps appear around, issuing commands, data streams
Row 3 (frames 8-11): CELEBRATE — cape flourish, triumphant pose, gold sparkles
Row 4 (frames 12-15): DIRECTIONAL — facing down, left, right, up

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  // ── 10. Room Objects Atlas ──────────────────────────────────────
  {
    name: "room-objects",
    outputPath: "objects/room-objects.png",
    expectedWidth: 256,
    expectedHeight: 256,
    stripBackground: true,
    prompt: `Create a pixel art object sprite sheet atlas. The image must be EXACTLY 256 pixels wide and 256 pixels tall.

It contains room decoration objects for a Stardew Valley style trading agent game. ALL objects are 32×32 pixels each, arranged in a grid of 8 columns × 8 rows.

Layout (top to bottom, left to right):

Row 1 (y=0) — AURA room objects (32×32 each):
- Purple crystal ball on stand | Sentiment wave monitor screen | Purple velvet couch (side view) | Floating cyan crystal orb | Mood meter display | Purple floor cushion | Wall-mounted wave display | Candle/incense

Row 2 (y=32) — ORACLE + HATCHERY objects:
- Brass telescope on tripod | Star chart scroll | Celestial globe | Book stack | Robotic arm (green) | Green containment tube | Conveyor belt segment | Spawn pod with green glow

Row 3 (y=64) — FLUX + STACK objects:
- Test tube rack (colorful) | Large bubbling vat (blue) | Large bubbling vat (green) | Industrial valve/pipe | Gold coin stack (tall) | Vault door (ornate bronze) | Treasure chest | Ticker display screen

Row 4 (y=96) — SIGMA + EDGE objects:
- Holographic table (green glow) | Multi-screen command display | Command chair | Radar dish | Hazard warning sign (yellow triangle) | Radiation barrel | Gauge panel | Calculator machine

Row 5 (y=128) — LUCIFER + VICTORY objects:
- Pentagram floor decal (red) | Fire brazier (with flames) | Dark horned throne | Ancient dark tome | Fountain (blue water) | Victory arch/banner | Trophy case | Confetti launcher

Row 6 (y=160) — CLAUSE/NURSERY objects:
- Scroll rack | Stamp pad with ink | Potted plant (green) | Contract document stack | Magnifying glass | Vine hanging decoration | Wooden crate | Wooden barrel

Row 7 (y=192) — Environment props:
- Pink flower bush | Purple flower bush | Small rock | Large rock | Mushroom cluster | Garden bench | Path lamp post | Signpost

Row 8 (y=224) — More props:
- Fence gate | Well with bucket | Small flag (green) | Small flag (red) | Torch on stand | Potion bottle (blue) | Gear/cog | Treasure gem

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF). Every object should be clearly distinguishable and recognizable at small scale.`,
  },

  // ── 11. Particle Sprites ────────────────────────────────────────
  {
    name: "particles",
    outputPath: "effects/particles.png",
    expectedWidth: 128,
    expectedHeight: 8,
    stripBackground: true,
    prompt: `Create a pixel art particle sprite sheet. The image must be EXACTLY 128 pixels wide and 8 pixels tall.

It contains 16 tiny particle sprites in a row, each exactly 8×8 pixels.

The particles from left to right:
1. White sparkle (diamond shape, bright white center fading to transparent edges)
2. Green sparkle (#30d158) — success particle
3. Red ember (#ff453a) — fire/error particle
4. Orange ember (#ff9f0a) — warning/fire particle
5. Blue sparkle (#0a84ff) — water/info particle
6. Purple sparkle (#bf5af2) — magic/aura particle
7. Gold sparkle (#ffd700) — coin/treasure particle
8. Cyan sparkle (#00d4ff) — tech/flux particle
9. Pink heart — tiny 5px heart shape
10. Green leaf — tiny leaf shape, 2 pixels wide
11. Blue water drop — tear drop shape
12. Yellow star — tiny 5-point star
13. Magenta energy — small energy ball
14. Teal data — binary/matrix style dots
15. Gray smoke — small puffy cloud shape
16. Dark dust — even darker small puff

Each particle should be a tiny, recognizable shape with 2-3 colors (bright center, medium edge, dark outline).

${STYLE_RULES}
Background: TRANSPARENT (alpha channel). If not possible, use magenta (#FF00FF).`,
  },

  // ── 12. Full World Background ───────────────────────────────────
  {
    name: "world-bg",
    outputPath: "tiles/world-bg.png",
    expectedWidth: 480,
    expectedHeight: 272,
    stripBackground: false, // This is a full scene — no transparency needed
    prompt: `Create a pixel art top-down game world map background. The image must be EXACTLY 480 pixels wide and 272 pixels tall.

This is the full world background for a Stardew Valley style trading agent compound. It shows the ENVIRONMENT ONLY — grass, paths, trees, fences. NO room interiors, NO buildings, just the outdoor environment.

Layout:
- The compound is a rectangular area in the center
- Lush green grass covers the entire image (#3a6b35 light, #2d5a28 dark, with pixel noise texture)
- IMPORTANT: Gray stone paths MUST be clearly visible as light gray (#888888 to #999999) walkways that contrast strongly with the green grass. Paths should be at least 2 tiles (32px) wide. Do NOT make paths dark or similar in color to the grass.
- Gray stone paths form a grid pattern:
  - Horizontal corridors at approximately y=80-96 and y=176-192 (spanning full width)
  - Vertical connector paths between room areas
- Trees line the left edge, right edge, and fill corners:
  - Rich green round canopies (#2a5a20 to #3a8a30)
  - Brown trunks (#5a3a1a)
  - 8-12 trees total, varying sizes
- Brown wooden picket fence (#8b6914) along bottom edge
- Scattered decorative elements on grass: small flowers (pink, purple), bushes, rocks
- A few wooden barrels and crates near path intersections

The paths should form clear walkways that create spaces where rooms will be overlaid:
- Top row: 4 rectangular spaces (each ~7×5 tiles = ~112×80px)
- Middle row: 4 rectangular spaces (each ~6×5 tiles = ~96×80px)
- Bottom row: 2 larger rectangular spaces

${STYLE_RULES}
This should look like a lush, detailed pixel art game world map viewed from directly above, reminiscent of Stardew Valley's farm layout.`,
  },

  // ── 13. Room Interiors ──────────────────────────────────────────
  {
    name: "room-interiors",
    outputPath: "tiles/room-interiors.png",
    expectedWidth: 480,
    expectedHeight: 272,
    stripBackground: true,
    prompt: `Create a pixel art top-down game world room interiors overlay. The image must be EXACTLY 480 pixels wide and 272 pixels tall.

This shows ONLY the room interiors for 10 themed rooms, positioned to overlay on a green grass background. Areas BETWEEN rooms MUST be bright magenta (#FF00FF) — this will be removed to create transparency. Only the room rectangles contain actual detail.

Room layout (approximate pixel positions):

TOP ROW (y ≈ 0 to 80):
1. AURA (x=16 to 128): Purple (#2d1b4e) floor, dark purple walls, neon pink wave pattern on back wall screen, floating crystal orbs (cyan), purple couches, "Sentiment" sign
2. ORACLE (x=144 to 240): Dark blue (#0a1628) floor with star pattern, wooden walls, telescope on platform, star charts on wall, observatory feel
3. HATCHERY (x=256 to 352): Teal tech (#0a2818) floor, brown wooden walls with red-brown roof accent, green robotic arms, containment tubes with green glow, spawn pods
4. NURSERY (x=368 to 464): Green (#1a2e1a) floor, wooden walls, conveyor belts, plant pots, scroll racks, contract stacks, magnifying glass on desk

MIDDLE ROW (y ≈ 112 to 192):
5. FLUX (x=16 to 112): Teal (#0a1a2e) floor, metal walls, colorful test tube rack, large bubbling vats (blue, green liquids), pipes, "TICKER" sign
6. STACK (x=128 to 208): Gold (#2e2a0a) floor, dark metal walls, tall gold coin stacks, large ornate vault door (bronze), treasure chests
7. SIGMA (x=224 to 320): Purple-tech (#1a0a2e) floor, metal walls, holographic green command table, multiple screens with charts, command chair
8. EDGE (x=336 to 432): Dark gray (#1a1a1a) floor, metal walls, yellow hazard signs, radiation barrels, gauge panels, warning lights

BOTTOM ROW (y ≈ 208 to 272):
9. LUCIFER (x=16 to 128): Crimson (#2e0a0a) floor, dark walls, glowing red pentagram on floor, fire braziers with flames on sides, dark throne
10. VICTORY (x=160 to 320): Blue-green (#0a2e2e) floor, stone arch entrance with "VICTORY" text, blue water fountain in center, trophy pedestals, energy beam pillar

Each room should have:
- Clearly defined walls (1-tile border darker than floor)
- Themed floor tiles with texture
- 3-5 furniture/decoration items matching the theme
- A door opening on the side facing the corridor

${STYLE_RULES}
Areas outside rooms MUST be bright magenta (#FF00FF). This will be chroma-keyed to transparent. Each room should be richly detailed with themed furniture matching a Stardew Valley interior.`,
  },
];

// ─── Post-Processing ─────────────────────────────────────────────────────────

async function postProcess(buffer: Buffer, def: SpriteDef): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const origW = metadata.width ?? 0;
  const origH = metadata.height ?? 0;

  if (origW !== def.expectedWidth || origH !== def.expectedHeight) {
    console.log(`     ⚠ Resizing ${origW}×${origH} → ${def.expectedWidth}×${def.expectedHeight} (nearest-neighbor)`);
  }

  // Resize to exact expected dimensions using nearest-neighbor (preserves pixel art)
  let processed = await sharp(buffer)
    .resize(def.expectedWidth, def.expectedHeight, {
      fit: "fill",
      kernel: "nearest",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Strip background: replace near-black and magenta pixels with transparent
  if (def.stripBackground) {
    const { data, info } = await sharp(processed)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    let stripped = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Near-black: r < 10, g < 10, b < 10
      const isNearBlack = r < 10 && g < 10 && b < 10;
      // Magenta chroma key: r > 240, g < 15, b > 240
      const isMagenta = r > 240 && g < 15 && b > 240;

      if (isNearBlack || isMagenta) {
        data[i + 3] = 0; // set alpha to 0
        stripped++;
      }
    }

    const totalPixels = info.width * info.height;
    const pct = ((stripped / totalPixels) * 100).toFixed(1);
    console.log(`     🔍 Stripped ${stripped} background pixels (${pct}% of image)`);

    processed = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  return processed;
}

// ─── Gemini API Caller ────────────────────────────────────────────────────────

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: { mimeType: string; data: string };
        text?: string;
      }[];
    };
  }[];
}

async function callGemini(prompt: string): Promise<Buffer> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.8,
    },
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000), // 2 min timeout for image gen
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData) {
    const textPart = parts.find((p) => p.text);
    throw new Error(`No image returned. Text response: ${textPart?.text?.slice(0, 200) ?? "none"}`);
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// ─── File Writer ──────────────────────────────────────────────────────────────

function saveSprite(relativePath: string, buffer: Buffer): string {
  const fullPath = path.join(OUTPUT_DIR, relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

// ─── Env File Reader ──────────────────────────────────────────────────────────

function readEnvFile(): string | undefined {
  const envPaths = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env.production"),
    path.resolve(__dirname, "../.env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/GEMINI_API_KEY\s*=\s*"?([^"\n]+)"?/);
      if (match?.[1]) return match[1];
    }
  }
  return undefined;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateSprite(def: SpriteDef, index: number, total: number): Promise<boolean> {
  const fullPath = path.join(OUTPUT_DIR, def.outputPath);

  // Skip if file exists (unless --force)
  if (!FORCE && fs.existsSync(fullPath)) {
    console.log(`  ⏭  [${index + 1}/${total}] ${def.name} — already exists, skipping`);
    return true;
  }

  console.log(`  🎨 [${index + 1}/${total}] Generating ${def.name}...`);

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const rawBuffer = await callGemini(def.prompt);
      const processed = await postProcess(rawBuffer, def);
      const savedPath = saveSprite(def.outputPath, processed);
      const sizeKB = (processed.length / 1024).toFixed(1);
      console.log(`  ✅ ${def.name} — saved (${sizeKB} KB) → ${savedPath}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${def.name} attempt ${attempt}/${RETRY_COUNT} failed: ${msg}`);

      if (attempt < RETRY_COUNT) {
        const backoff = DELAY_MS * attempt;
        console.log(`     Retrying in ${backoff / 1000}s...`);
        await sleep(backoff);
      }
    }
  }

  console.error(`  💀 ${def.name} — FAILED after ${RETRY_COUNT} attempts`);
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   QUANTIK AGENT WORLD — Sprite Generator        ║");
  console.log(`║   Model: ${MODEL.padEnd(33)}║`);
  console.log(`║   Force: ${FORCE ? "YES" : "NO"}  |  Only: ${ONLY ?? "ALL"}${" ".repeat(Math.max(0, 23 - (ONLY ?? "ALL").length))}║`);
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Filter sprites if --only flag
  const defs = ONLY
    ? SPRITE_DEFS.filter((d) => d.name === ONLY)
    : SPRITE_DEFS;

  if (defs.length === 0) {
    console.error(`No sprite found with name "${ONLY}". Available sprites:`);
    SPRITE_DEFS.forEach((d) => console.log(`  - ${d.name}`));
    process.exit(1);
  }

  console.log(`Generating ${defs.length} sprite(s)...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < defs.length; i++) {
    const ok = await generateSprite(defs[i], i, defs.length);
    if (ok) success++;
    else failed++;

    // Rate limiting between calls
    if (i < defs.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log(`Done! ✅ ${success} succeeded, ❌ ${failed} failed`);

  if (failed > 0) {
    console.log("\nTo retry failed sprites, run again (existing files will be skipped).");
    console.log("To regenerate a specific sprite: --only=<name>");
    console.log("To regenerate all: --force");
  }

  console.log("\nGenerated files are in: public/game/");
  console.log("══════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
