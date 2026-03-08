// ─── World Map Definition ─────────────────────────────────────────────────────
// Defines the 10-room underground compound matching world.png.
// Map is 30×17 tiles (480×272px at 16px/tile). Coordinate system: top-left = (0,0).
// Forest canopy occupies rows 0-3, compound spans rows 4-16.

export type RoomId =
  | "aura"
  | "oracle"
  | "hatchery"
  | "clause"
  | "flux"
  | "stack"
  | "sigma"
  | "edge"
  | "lucifer"
  | "victory";

export interface RoomTheme {
  floorColor: number;      // hex color for fallback rendering
  wallColor: number;
  accentColor: number;
  label: string;           // display name
}

export interface RoomDef {
  id: RoomId;
  label: string;
  bounds: { x: number; y: number; w: number; h: number }; // tile coords
  doorTile: { x: number; y: number };                      // entry tile (on corridor)
  npcSpawn: { x: number; y: number };                      // NPC position inside room
  theme: RoomTheme;
  agentKey?: string;       // maps to pipeline agent name (7 agents only)
}

// ─── Room Definitions ─────────────────────────────────────────────────────────
// Layout: 4 columns × 3 rows of rooms inside an underground compound.
// Columns span tiles 5-8, 10-13, 15-18, 20-23 (4 wide each, 1 tile wall between).
// Row 1: tiles 5-7,  Row 2: tiles 9-11,  Row 3: tiles 13-14.
// Corridors at rows 8 (between R1/R2) and 12 (between R2/R3).

export const ROOMS: RoomDef[] = [
  // ── Row 1 (top) ── rows 5-7
  {
    id: "aura",
    label: "AURA",
    bounds: { x: 7, y: 5, w: 4, h: 3 },
    doorTile: { x: 7, y: 8 },
    npcSpawn: { x: 7, y: 6 },
    theme: {
      floorColor: 0x2d1b4e,
      wallColor: 0x1a0f2e,
      accentColor: 0xbf5af2,
      label: "AURA",
    },
    agentKey: "aura",
  },
  {
    id: "oracle",
    label: "ORACLE",
    bounds: { x: 11, y: 5, w: 4, h: 3 },
    doorTile: { x: 12, y: 8 },
    npcSpawn: { x: 12, y: 6 },
    theme: {
      floorColor: 0x0a1628,
      wallColor: 0x1a0a0a,
      accentColor: 0x0a84ff,
      label: "ORACLE",
    },
    agentKey: "oracle",
  },
  {
    id: "hatchery",
    label: "HATCHERY",
    bounds: { x: 15, y: 5, w: 4, h: 3 },
    doorTile: { x: 17, y: 8 },
    npcSpawn: { x: 17, y: 6 },
    theme: {
      floorColor: 0x0a2818,
      wallColor: 0x3a1a0a,
      accentColor: 0x30d158,
      label: "HATCHERY",
    },
  },
  {
    id: "clause",
    label: "CLAUSE",
    bounds: { x: 20, y: 5, w: 4, h: 3 },
    doorTile: { x: 22, y: 8 },
    npcSpawn: { x: 22, y: 6 },
    theme: {
      floorColor: 0x1a2e1a,
      wallColor: 0x0f1a0f,
      accentColor: 0x30d158,
      label: "CLAUSE",
    },
    agentKey: "clause",
  },

  // ── Row 2 (middle) ── rows 9-11
  {
    id: "flux",
    label: "FLUX",
    bounds: { x: 7, y: 8, w: 4, h: 3 },
    doorTile: { x: 7, y: 8 },
    npcSpawn: { x: 7, y: 10 },
    theme: {
      floorColor: 0x0a1a2e,
      wallColor: 0x0a0f1a,
      accentColor: 0x00d4ff,
      label: "FLUX",
    },
    agentKey: "flux",
  },
  {
    id: "stack",
    label: "STACK",
    bounds: { x: 11, y: 8, w: 4, h: 3 },
    doorTile: { x: 12, y: 8 },
    npcSpawn: { x: 12, y: 10 },
    theme: {
      floorColor: 0x2e2a0a,
      wallColor: 0x1a1a0a,
      accentColor: 0xffd700,
      label: "STACK",
    },
  },
  {
    id: "sigma",
    label: "SIGMA",
    bounds: { x: 15.5, y: 8, w: 4, h: 3 },
    doorTile: { x: 17, y: 8 },
    npcSpawn: { x: 17, y: 10 },
    theme: {
      floorColor: 0x1a0a2e,
      wallColor: 0x0f0a1a,
      accentColor: 0x8a2be2,
      label: "SIGMA",
    },
    agentKey: "sigma",
  },
  {
    id: "edge",
    label: "EDGE",
    bounds: { x: 20, y: 8, w: 4, h: 3 },
    doorTile: { x: 22, y: 8 },
    npcSpawn: { x: 22, y: 10 },
    theme: {
      floorColor: 0x1a1a1a,
      wallColor: 0x0f0f0f,
      accentColor: 0xff9f0a,
      label: "EDGE",
    },
    agentKey: "edge",
  },

  // ── Row 3 (bottom) ── rows 13-15
  {
    id: "lucifer",
    label: "LUCIFER",
    bounds: { x: 9, y: 12, w: 4, h: 2.5 },
    doorTile: { x: 9, y: 12 },
    npcSpawn: { x: 9, y: 13 },
    theme: {
      floorColor: 0x2e0a0a,
      wallColor: 0x1a0505,
      accentColor: 0xff453a,
      label: "LUCIFER",
    },
    agentKey: "lucifer",
  },
  {
    id: "victory",
    label: "VICTORY",
    bounds: { x: 17.7, y: 11.4, w: 6, h: 3},
    doorTile: { x: 20, y: 12 },
    npcSpawn: { x: 20, y: 14 },
    theme: {
      floorColor: 0x0a2e2e,
      wallColor: 0x0a1a1a,
      accentColor: 0x30d158,
      label: "VICTORY",
    },
  },
];

// ─── Map Constants ────────────────────────────────────────────────────────────

export const MAP_WIDTH_TILES = 30;
export const MAP_HEIGHT_TILES = 17;
export const TILE_SIZE = 16;
export const MAP_WIDTH_PX = MAP_WIDTH_TILES * TILE_SIZE;   // 480
export const MAP_HEIGHT_PX = MAP_HEIGHT_TILES * TILE_SIZE; // 272

// Corridor Y positions (tile rows that are walkable paths between room rows)
// Row 8: corridor between top rooms (5-7) and middle rooms (9-11)
// Row 12: corridor between middle rooms (9-11) and bottom rooms (13-14)
export const CORRIDOR_ROWS = [8, 12];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRoomById(id: RoomId): RoomDef | undefined {
  return ROOMS.find((r) => r.id === id);
}

export function getRoomByAgentKey(agentKey: string): RoomDef | undefined {
  return ROOMS.find((r) => r.agentKey === agentKey);
}

/** Returns the 7 rooms that correspond to pipeline agents */
export function getAgentRooms(): RoomDef[] {
  return ROOMS.filter((r) => r.agentKey != null);
}

/** Pipeline execution order: parallel phase then sequential */
export const PIPELINE_ORDER: RoomId[] = [
  "aura", "flux", "clause",   // parallel phase 1
  "oracle",                     // sequential
  "edge",                       // sequential
  "lucifer",                    // sequential
  "sigma",                      // final synthesis
];

export const PARALLEL_PHASE_ROOMS: RoomId[] = ["aura", "flux", "clause"];

/** Waypoint graph for pathfinding between rooms via corridors */
export interface Waypoint {
  x: number;
  y: number;
  roomId?: RoomId;
}

export function getRoomDoorWaypoint(roomId: RoomId): Waypoint {
  const room = getRoomById(roomId)!;
  return { x: room.doorTile.x, y: room.doorTile.y, roomId };
}
