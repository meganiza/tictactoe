import type { CellData, ExitInfo, Position, RoomColor, RoomDefinition } from './types';

// ===== ROOM DEFINITIONS =====
export const ROOMS: RoomDefinition[] = [
  { id: 'scarlet',  name: 'Scarlet Gallery',  color: 'red',    description: 'Red-floored gallery' },
  { id: 'mustard',  name: 'Mustard Hall',     color: 'yellow', description: 'Yellow-floored hall' },
  { id: 'plum',     name: 'Plum Parlor',      color: 'purple', description: 'Purple-floored parlor' },
  { id: 'green',    name: 'Green Room',        color: 'green',  description: 'Green-floored room' },
  { id: 'peacock',  name: 'Peacock Lounge',    color: 'blue',   description: 'Blue-floored lounge' },
];

// Board dimensions: 17 rows x 17 cols
export const ROWS = 17;
export const COLS = 17;

// ===== BOARD BUILDER =====
// Layout:
//   Row 0/16: outer walls (top/bottom), with exit cells
//   Rows 1-4: top rooms (Scarlet cols 1-4, Peacock cols 6-10, Mustard cols 12-15)
//   Row 5: narrow corridors connecting top rooms to main hallway
//   Rows 6-10: main central hallway (cols 1-15)
//   Row 11: narrow corridors connecting main hallway to bottom rooms
//   Rows 12-15: bottom rooms (Plum cols 1-4, Green cols 12-15) + south hall (cols 7-9)
//   Col 0/16: outer walls (left/right), with exit cells

export function createBoardLayout(): CellData[][] {
  const board: CellData[][] = [];

  // Initialize all cells as walls
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = {
        walkable: false,
        room: null,
        roomColor: 'gray',
        isWall: true,
        camera: null,
        isPowerRoom: false,
        painting: false,
        exit: null,
      };
    }
  }

  const setRegion = (
    r1: number, c1: number, r2: number, c2: number,
    room: string | null, color: RoomColor
  ) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        board[r][c] = { ...board[r][c], walkable: true, room, roomColor: color, isWall: false };
      }
    }
  };

  const setHallway = (r1: number, c1: number, r2: number, c2: number) => {
    setRegion(r1, c1, r2, c2, null, 'gray');
  };

  const setCell = (r: number, c: number, props: Partial<CellData>) => {
    board[r][c] = { ...board[r][c], ...props };
  };

  // ===== ROOMS =====
  setRegion(1, 1, 4, 4, 'scarlet', 'red');      // top-left
  setRegion(1, 6, 4, 10, 'peacock', 'blue');     // top-center
  setRegion(1, 12, 4, 15, 'mustard', 'yellow');  // top-right
  setRegion(12, 1, 15, 4, 'plum', 'purple');     // bottom-left
  setRegion(12, 12, 15, 15, 'green', 'green');   // bottom-right

  // ===== HALLWAYS =====
  // Main central corridor
  setHallway(6, 1, 10, 15);

  // Top doorway corridors (connecting rooms to main hallway)
  setHallway(5, 2, 5, 3);    // Scarlet doorway
  setHallway(5, 7, 5, 9);    // Peacock doorway
  setHallway(5, 13, 5, 14);  // Mustard doorway

  // Bottom doorway corridors (connecting main hallway to rooms & south hall)
  setHallway(11, 2, 11, 3);    // Plum doorway
  setHallway(11, 7, 11, 9);    // South hall doorway
  setHallway(11, 13, 11, 14);  // Green doorway

  // South hallway (leading to main entrance)
  setHallway(12, 7, 15, 9);

  // ===== POWER ROOM =====
  setCell(8, 8, { isPowerRoom: true });

  // ===== CAMERAS (6 cameras at strategic hallway intersections) =====
  setCell(6, 5, { camera: 1 });    // NW junction
  setCell(6, 11, { camera: 2 });   // NE junction
  setCell(8, 1, { camera: 3 });    // west wall
  setCell(8, 15, { camera: 4 });   // east wall
  setCell(10, 5, { camera: 5 });   // SW junction
  setCell(10, 11, { camera: 6 });  // SE junction

  // ===== EXITS (doors/windows on perimeter walls) =====
  // These are NOT walkable - they are wall cells with exit info.
  // Thief must be on adjacent interior cell to attempt escape.
  const exits: { r: number; c: number; info: ExitInfo }[] = [
    // Top wall
    { r: 0, c: 2,  info: { id: 1,  type: 'window', locked: false, direction: 'north' } },
    { r: 0, c: 8,  info: { id: 2,  type: 'window', locked: false, direction: 'north' } },
    { r: 0, c: 14, info: { id: 3,  type: 'window', locked: false, direction: 'north' } },
    // Bottom wall
    { r: 16, c: 2,  info: { id: 4,  type: 'window', locked: false, direction: 'south' } },
    { r: 16, c: 8,  info: { id: 5,  type: 'door',   locked: false, direction: 'south' } },
    { r: 16, c: 14, info: { id: 6,  type: 'window', locked: false, direction: 'south' } },
    // Left wall
    { r: 3,  c: 0, info: { id: 7,  type: 'window', locked: false, direction: 'west' } },
    { r: 8,  c: 0, info: { id: 8,  type: 'door',   locked: false, direction: 'west' } },
    { r: 13, c: 0, info: { id: 9,  type: 'window', locked: false, direction: 'west' } },
    // Right wall
    { r: 3,  c: 16, info: { id: 10, type: 'window', locked: false, direction: 'east' } },
    { r: 8,  c: 16, info: { id: 11, type: 'door',   locked: false, direction: 'east' } },
    { r: 13, c: 16, info: { id: 12, type: 'window', locked: false, direction: 'east' } },
  ];

  for (const exit of exits) {
    setCell(exit.r, exit.c, { exit: exit.info });
    // Exits remain non-walkable walls; thief escapes from adjacent interior cell
  }

  return board;
}

// ===== MOVEMENT HELPERS =====

export function getAdjacentCells(pos: Position, board: CellData[][]): Position[] {
  const { row, col } = pos;
  const neighbors: Position[] = [];
  const deltas: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length && board[nr][nc].walkable) {
      neighbors.push({ row: nr, col: nc });
    }
  }
  return neighbors;
}

export function getReachableCells(
  start: Position,
  maxSteps: number,
  board: CellData[][],
): Position[] {
  const visited = new Set<string>();
  const result: Position[] = [];
  const queue: { pos: Position; steps: number }[] = [{ pos: start, steps: 0 }];
  visited.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const { pos, steps } = queue.shift()!;
    if (steps > 0) {
      result.push(pos);
    }
    if (steps < maxSteps) {
      for (const next of getAdjacentCells(pos, board)) {
        const key = `${next.row},${next.col}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ pos: next, steps: steps + 1 });
        }
      }
    }
  }
  return result;
}

// Line of sight: same row or column with no walls blocking
export function hasLineOfSight(a: Position, b: Position, board: CellData[][]): boolean {
  if (a.row === b.row && a.col === b.col) return true;
  if (a.row !== b.row && a.col !== b.col) return false;

  if (a.row === b.row) {
    const minC = Math.min(a.col, b.col);
    const maxC = Math.max(a.col, b.col);
    for (let c = minC; c <= maxC; c++) {
      if (!board[a.row][c].walkable) return false;
    }
    return true;
  }

  const minR = Math.min(a.row, b.row);
  const maxR = Math.max(a.row, b.row);
  for (let r = minR; r <= maxR; r++) {
    if (!board[r][a.col].walkable) return false;
  }
  return true;
}

export function getCameraPositions(board: CellData[][]): Map<number, Position> {
  const cameras = new Map<number, Position>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].camera !== null) {
        cameras.set(board[r][c].camera!, { row: r, col: c });
      }
    }
  }
  return cameras;
}

// Get interior cell adjacent to a perimeter exit
export function getExitInteriorCell(exitPos: Position, board: CellData[][]): Position | null {
  const exit = board[exitPos.row]?.[exitPos.col]?.exit;
  if (!exit) return null;

  let r = exitPos.row, c = exitPos.col;
  switch (exit.direction) {
    case 'north': r += 1; break;
    case 'south': r -= 1; break;
    case 'west':  c += 1; break;
    case 'east':  c -= 1; break;
  }

  return board[r]?.[c]?.walkable ? { row: r, col: c } : null;
}

// Get all exits and their adjacent interior cells
export function getAllExits(board: CellData[][]): { exitPos: Position; interiorPos: Position; info: ExitInfo }[] {
  const results: { exitPos: Position; interiorPos: Position; info: ExitInfo }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell.exit) {
        const interior = getExitInteriorCell({ row: r, col: c }, board);
        if (interior) {
          results.push({ exitPos: { row: r, col: c }, interiorPos: interior, info: cell.exit });
        }
      }
    }
  }
  return results;
}

// Get cells where a painting can be placed (room cells only)
export function getPaintableCells(board: CellData[][]): Position[] {
  const cells: Position[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].walkable && board[r][c].room && !board[r][c].isPowerRoom) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

// Default painting positions (at least 1 per colored room, 9 total)
export function getDefaultPaintingPositions(): Position[] {
  return [
    { row: 2, col: 2 }, { row: 3, col: 3 },   // Scarlet Gallery (2)
    { row: 2, col: 7 }, { row: 2, col: 9 },   // Peacock Lounge (2)
    { row: 2, col: 13 }, { row: 3, col: 14 },  // Mustard Hall (2)
    { row: 13, col: 2 },                        // Plum Parlor (1)
    { row: 13, col: 13 }, { row: 14, col: 14 }, // Green Room (2)
  ];
}

// Detective starting positions (near the south end of main hallway)
export function getDetectiveStartPositions(): Position[] {
  return [
    { row: 10, col: 7 },
    { row: 10, col: 8 },
    { row: 10, col: 9 },
  ];
}

// Room name lookup from position
export function getRoomName(pos: Position, board: CellData[][]): string {
  const cell = board[pos.row]?.[pos.col];
  if (!cell) return 'Unknown';
  if (cell.isPowerRoom) return 'Power Room';
  if (cell.room) {
    const room = ROOMS.find(r => r.id === cell.room);
    return room?.name ?? cell.room;
  }
  return 'Hallway';
}

// Floor color name for motion detector
export function getFloorColorName(pos: Position, board: CellData[][]): string {
  const cell = board[pos.row]?.[pos.col];
  if (!cell) return 'unknown';
  const colorNames: Record<RoomColor, string> = {
    red: 'Red', green: 'Green', blue: 'Blue',
    yellow: 'Yellow', purple: 'Purple', gray: 'Gray',
  };
  return colorNames[cell.roomColor];
}
