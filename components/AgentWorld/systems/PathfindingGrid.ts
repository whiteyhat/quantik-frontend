import {
  MAP_WIDTH_TILES,
  MAP_HEIGHT_TILES,
  ROOMS,
  CORRIDOR_ROWS,
  type RoomDef,
  type RoomId,
} from "../config/worldMap";

// ─── A* Pathfinding on Tile Grid ──────────────────────────────────────────────
// Lightweight A* implementation. Builds a walkable grid from room/corridor defs.

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export class PathfindingGrid {
  private walkable: boolean[][];

  constructor() {
    this.walkable = this.buildGrid();
  }

  /** Build walkable grid: room interiors + corridors + door tiles are walkable */
  private buildGrid(): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
      grid[y] = [];
      for (let x = 0; x < MAP_WIDTH_TILES; x++) {
        grid[y][x] = false;
      }
    }

    // Mark corridors as walkable (full width)
    for (const cy of CORRIDOR_ROWS) {
      for (let x = 0; x < MAP_WIDTH_TILES; x++) {
        grid[cy][x] = true;
      }
    }

    // Mark room interiors as walkable (excluding walls = 1 tile border)
    for (const room of ROOMS) {
      // Floor all bounds to ensure integer tile indices
      const rx = Math.floor(room.bounds.x);
      const ry = Math.floor(room.bounds.y);
      const w = Math.ceil(room.bounds.w);
      const h = Math.ceil(room.bounds.h);
      // Interior tiles (skip outer wall ring)
      for (let y = ry + 1; y < ry + h - 1; y++) {
        for (let x = rx + 1; x < rx + w - 1; x++) {
          if (y >= 0 && y < MAP_HEIGHT_TILES && x >= 0 && x < MAP_WIDTH_TILES) {
            grid[y][x] = true;
          }
        }
      }

      // Door tile is always walkable (connects room to corridor)
      const dx = Math.floor(room.doorTile.x);
      const dy = Math.floor(room.doorTile.y);
      if (dy >= 0 && dy < MAP_HEIGHT_TILES && dx >= 0 && dx < MAP_WIDTH_TILES) {
        grid[dy][dx] = true;
      }

      // Make a 1-tile-wide path from door into room interior
      const roomCenterY = ry + Math.floor(h / 2);
      const minY = Math.min(dy, roomCenterY);
      const maxY = Math.max(dy, roomCenterY);
      for (let y = minY; y <= maxY; y++) {
        if (y >= 0 && y < MAP_HEIGHT_TILES) {
          grid[y][dx] = true;
        }
      }
    }

    return grid;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH_TILES || y < 0 || y >= MAP_HEIGHT_TILES) return false;
    return this.walkable[y][x];
  }

  /** Find path from (sx,sy) to (ex,ey) using A*. Returns tile coords or null. */
  findPath(sx: number, sy: number, ex: number, ey: number): { x: number; y: number }[] | null {
    // Clamp to bounds
    sx = Math.max(0, Math.min(MAP_WIDTH_TILES - 1, Math.round(sx)));
    sy = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.round(sy)));
    ex = Math.max(0, Math.min(MAP_WIDTH_TILES - 1, Math.round(ex)));
    ey = Math.max(0, Math.min(MAP_HEIGHT_TILES - 1, Math.round(ey)));

    if (!this.walkable[sy]?.[sx] || !this.walkable[ey]?.[ex]) {
      // Try to find nearest walkable tile to start/end
      if (!this.walkable[sy]?.[sx]) {
        const near = this.findNearestWalkable(sx, sy);
        if (!near) return null;
        sx = near.x;
        sy = near.y;
      }
      if (!this.walkable[ey]?.[ex]) {
        const near = this.findNearestWalkable(ex, ey);
        if (!near) return null;
        ex = near.x;
        ey = near.y;
      }
    }

    if (sx === ex && sy === ey) return [{ x: ex, y: ey }];

    const open: Node[] = [];
    const closed = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;

    const heuristic = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);

    const startNode: Node = { x: sx, y: sy, g: 0, h: heuristic(sx, sy), f: 0, parent: null };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    const neighbors = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (open.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;

      // Find node with lowest f
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];

      if (current.x === ex && current.y === ey) {
        // Reconstruct path
        const path: { x: number; y: number }[] = [];
        let node: Node | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closed.add(key(current.x, current.y));

      for (const { dx, dy } of neighbors) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        if (!this.isWalkable(nx, ny)) continue;
        if (closed.has(key(nx, ny))) continue;

        const g = current.g + 1;
        const existing = open.find((n) => n.x === nx && n.y === ny);

        if (!existing) {
          const h = heuristic(nx, ny);
          open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }

    return null; // No path found
  }

  /** Find nearest walkable tile using BFS */
  private findNearestWalkable(x: number, y: number): { x: number; y: number } | null {
    const visited = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x, y }];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const k = `${curr.x},${curr.y}`;
      if (visited.has(k)) continue;
      visited.add(k);

      if (this.isWalkable(curr.x, curr.y)) return curr;

      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        if (nx >= 0 && nx < MAP_WIDTH_TILES && ny >= 0 && ny < MAP_HEIGHT_TILES) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return null;
  }
}
