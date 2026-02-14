import type { GameState, Position, CellData } from './types';
import {
  getAdjacentCells, hasLineOfSight, getAllExits,
} from './boardData';

// AI Thief strategy:
// 1. Enter the museum from a random unlocked exit (or any exit)
// 2. Move toward the nearest painting, avoiding detectives' line of sight
// 3. After stealing 3+ paintings, head for the nearest unlocked exit
// 4. Disable cameras when opportunistically on camera cells
// 5. Visit power room if convenient

interface ScoredMove {
  pos: Position;
  score: number;
}

export function getAIThiefMove(state: GameState): Position[] {
  const { thief } = state;

  // First move: pick entry point
  if (thief.position.row === -1) {
    return getEntryMoves(state);
  }

  // Plan up to remaining moves
  const moves = planMoves(state, state.movesRemaining);
  return moves;
}

function getEntryMoves(state: GameState): Position[] {
  const exits = getAllExits(state.board);

  // Prefer exits far from detectives
  let bestEntry: Position | null = null;
  let bestDist = -1;

  for (const exit of exits) {
    const pos = exit.interiorPos;
    const minDist = Math.min(
      ...state.detectives.map(d =>
        Math.abs(d.position.row - pos.row) + Math.abs(d.position.col - pos.col)
      )
    );
    if (minDist > bestDist) {
      bestDist = minDist;
      bestEntry = pos;
    }
  }

  if (bestEntry) return [bestEntry];

  // Fallback: first available exit
  if (exits.length > 0) return [exits[0].interiorPos];
  return [];
}

function planMoves(state: GameState, maxSteps: number): Position[] {
  const { thief, board } = state;
  const moves: Position[] = [];
  let currentPos = thief.position;

  for (let step = 0; step < maxSteps; step++) {
    const candidates = getAdjacentCells(currentPos, board);
    if (candidates.length === 0) break;

    const scored = candidates.map(pos => ({
      pos,
      score: scorePosition(pos, currentPos, state, moves),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick the best move (with some randomness for unpredictability)
    const best = pickWeighted(scored);
    moves.push(best.pos);
    currentPos = best.pos;
  }

  return moves;
}

function scorePosition(
  pos: Position,
  _currentPos: Position,
  state: GameState,
  plannedMoves: Position[],
): number {
  const { thief, board } = state;
  let score = 0;

  const cell = board[pos.row][pos.col];

  // ===== OBJECTIVES =====

  // Painting on this cell: high value
  if (cell.painting) {
    score += 50;
  }

  // If we have 3+ paintings, score exits highly
  if (thief.paintingsStolen >= 3 || (thief.paintingsStolen >= 2 && cell.painting)) {
    const exits = getAllExits(board);
    for (const exit of exits) {
      if (pos.row === exit.interiorPos.row && pos.col === exit.interiorPos.col) {
        score += exit.info.locked ? 5 : 100; // Huge bonus for being at an unlocked exit
      }
    }
  }

  // Move toward nearest painting
  if (thief.paintingsStolen < 3) {
    const nearestPaintingDist = findNearestPaintingDistance(pos, board);
    if (nearestPaintingDist >= 0) {
      score += Math.max(0, 20 - nearestPaintingDist * 2);
    }
  } else {
    // Move toward nearest unlocked exit
    const nearestExitDist = findNearestUnlockedExitDistance(pos, state);
    if (nearestExitDist >= 0) {
      score += Math.max(0, 30 - nearestExitDist * 2);
    }
  }

  // Camera: disable it (moderate value)
  if (cell.camera !== null && !thief.camerasDisabled.includes(cell.camera)) {
    score += 15;
  }

  // Power room: high value if not already cut
  if (cell.isPowerRoom && !thief.powerOff) {
    score += 25;
  }

  // ===== AVOIDANCE =====

  // Avoid detectives (heavily penalize being in line of sight)
  for (const det of state.detectives) {
    const dist = Math.abs(pos.row - det.position.row) + Math.abs(pos.col - det.position.col);

    // Direct line of sight: bad
    if (hasLineOfSight(det.position, pos, board)) {
      score -= 40;
    }

    // Being close: bad
    if (dist <= 2) {
      score -= 30;
    } else if (dist <= 4) {
      score -= 10;
    }
  }

  // Avoid revisiting cells we just came from
  const allRecent = [...thief.moveHistory.slice(-3), ...plannedMoves];
  if (allRecent.some(p => p.row === pos.row && p.col === pos.col)) {
    score -= 5;
  }

  // Slight randomness
  score += Math.random() * 8;

  return score;
}

function findNearestPaintingDistance(pos: Position, board: CellData[][]): number {
  // BFS to find nearest painting
  const visited = new Set<string>();
  const queue: { pos: Position; dist: number }[] = [{ pos, dist: 0 }];
  visited.add(`${pos.row},${pos.col}`);

  while (queue.length > 0) {
    const { pos: cur, dist } = queue.shift()!;
    if (board[cur.row][cur.col].painting) return dist;
    if (dist > 20) break; // Don't search too far

    for (const next of getAdjacentCells(cur, board)) {
      const key = `${next.row},${next.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ pos: next, dist: dist + 1 });
      }
    }
  }
  return -1;
}

function findNearestUnlockedExitDistance(pos: Position, state: GameState): number {
  const exits = getAllExits(state.board);
  let minDist = Infinity;

  for (const exit of exits) {
    if (!exit.info.locked) {
      const dist = Math.abs(pos.row - exit.interiorPos.row) + Math.abs(pos.col - exit.interiorPos.col);
      minDist = Math.min(minDist, dist);
    }
  }

  return minDist === Infinity ? -1 : minDist;
}

function pickWeighted(scored: ScoredMove[]): ScoredMove {
  if (scored.length === 0) throw new Error('No moves available');
  if (scored.length === 1) return scored[0];

  // Mostly pick the best, occasionally pick second best for unpredictability
  const r = Math.random();
  if (r < 0.7 || scored.length === 1) return scored[0];
  if (r < 0.9 || scored.length === 2) return scored[1];
  return scored[Math.min(2, scored.length - 1)];
}

// Decide whether to cut wire when motion detector is rolled
export function shouldAICutWire(state: GameState): boolean {
  const { thief, board } = state;

  // If no wires left, can't cut
  if (thief.wiresCut >= 2) return false;

  // If on a colored (non-gray) floor, cutting wire is valuable
  // because it would reveal which room the thief is in
  const cell = board[thief.position.row][thief.position.col];
  if (cell.roomColor !== 'gray') return true;

  // If on gray, revealing gray isn't very helpful to detectives
  // Save wire cuts for when in colored rooms
  return false;
}

// Pick an exit for AI thief to attempt escape
export function getAIEscapeExit(state: GameState): number | null {
  const { thief, board } = state;
  if (thief.paintingsStolen < 3) return null;

  const exits = getAllExits(board);
  for (const exit of exits) {
    if (
      exit.interiorPos.row === thief.position.row &&
      exit.interiorPos.col === thief.position.col
    ) {
      return exit.info.id;
    }
  }
  return null;
}
