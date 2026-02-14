import {
  GameState, GameMode, Detective, DetectiveColor,
  ThiefState, DiceResult, SpecialAction, GameMessage, Position, CellData, ExitInfo,
} from './types';
import {
  createBoardLayout, getDefaultPaintingPositions, getDetectiveStartPositions,
  getReachableCells, hasLineOfSight, getCameraPositions, getAllExits,
  getFloorColorName, getRoomName, ROWS, COLS,
} from './boardData';

// ===== DICE =====

const SPECIAL_DIE_FACES: SpecialAction[] = ['eye', 'eye', 'motion', 'motion', 'scan', null];

export function rollDice(): DiceResult {
  const movement = Math.floor(Math.random() * 6) + 1;
  const special = SPECIAL_DIE_FACES[Math.floor(Math.random() * 6)];
  return { movement, special };
}

// ===== DETECTIVE DEFINITIONS =====

const DETECTIVE_DEFS: { id: DetectiveColor; displayName: string; color: string }[] = [
  { id: 'scarlet', displayName: 'Miss Scarlet', color: '#DC143C' },
  { id: 'mustard', displayName: 'Col. Mustard', color: '#DAA520' },
  { id: 'plum',    displayName: 'Prof. Plum',   color: '#8E4585' },
  { id: 'green',   displayName: 'Mr. Green',    color: '#228B22' },
  { id: 'peacock', displayName: 'Mrs. Peacock', color: '#4169E1' },
  { id: 'white',   displayName: 'Mrs. White',   color: '#F5F5F5' },
];

// ===== GAME INITIALIZATION =====

let messageCounter = 0;

function msg(text: string, type: GameMessage['type'] = 'info', turn = 0): GameMessage {
  return { id: ++messageCounter, text, type, turn };
}

export function createInitialGameState(
  mode: GameMode,
  numDetectives: number,
  lockConfig?: Map<number, boolean>, // exit id -> locked
): GameState {
  messageCounter = 0;
  const board = createBoardLayout();

  // Place paintings
  const paintingPositions = getDefaultPaintingPositions();
  for (const pos of paintingPositions) {
    board[pos.row][pos.col].painting = true;
  }

  // Configure locks
  if (lockConfig) {
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const exit = board[r][c].exit;
        if (exit && lockConfig.has(exit.id)) {
          exit.locked = lockConfig.get(exit.id)!;
        }
      }
    }
  } else {
    // Default: randomly lock ~half the exits
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        const exit = board[r][c].exit;
        if (exit) {
          exit.locked = Math.random() < 0.5;
        }
      }
    }
  }

  // Place detectives
  const startPositions = getDetectiveStartPositions();
  const detectives: Detective[] = [];
  for (let i = 0; i < Math.min(numDetectives, 3); i++) {
    detectives.push({
      ...DETECTIVE_DEFS[i],
      position: { ...startPositions[i] },
    });
  }

  // Initialize thief (starts off-board, will enter on first move)
  const thief: ThiefState = {
    position: { row: -1, col: -1 },
    visible: false,
    visiblePosition: null,
    paintingsStolen: 0,
    camerasDisabled: [],
    wiresCut: 0,
    powerOff: false,
    moveHistory: [],
    hasMoved: false,
  };

  return {
    mode,
    phase: 'playing',
    board,
    boardRows: ROWS,
    boardCols: COLS,
    detectives,
    thief,
    currentDetectiveIndex: 0,
    turnPhase: 'thief-move',
    diceResult: null,
    movesRemaining: 3,
    specialUsed: false,
    canUseSpecialFirst: false,
    paintingsRemaining: paintingPositions.length,
    totalPaintings: paintingPositions.length,
    exits: getAllExits(board).map(e => e.info),
    messages: [msg('The thief has entered the museum! Detectives, be on alert.', 'system')],
    setupPhase: 'ready',
    paintingsToPlace: 0,
  };
}

// ===== THIEF ACTIONS =====

export function moveThief(state: GameState, to: Position): GameState {
  const newState = { ...state };
  const thief = { ...state.thief };

  // First move: thief enters from outside, place at 'to'
  if (thief.position.row === -1) {
    thief.position = { ...to };
    thief.moveHistory = [{ ...to }];
    thief.hasMoved = true;
    newState.thief = thief;
    newState.movesRemaining = state.movesRemaining - 1;
    if (newState.movesRemaining <= 0) {
      newState.turnPhase = 'detective-roll';
      newState.messages = [...state.messages, msg('The thief has entered the museum...', 'thief')];
    }
    return newState;
  }

  // Validate: within 1 step and walkable
  const reachable = getReachableCells(thief.position, 1, state.board);
  if (!reachable.find(p => p.row === to.row && p.col === to.col)) {
    return state; // Invalid move
  }

  thief.position = { ...to };
  thief.moveHistory = [...thief.moveHistory, { ...to }];
  thief.hasMoved = true;

  const newBoard = state.board.map(row => row.map(c => ({ ...c })));
  const messages = [...state.messages];
  let remaining = state.movesRemaining - 1;

  // Check for painting on this cell
  const cell = newBoard[to.row][to.col];
  if (cell.painting) {
    // Thief steals the painting (removed next turn per rules, but we simplify)
    cell.painting = false;
    thief.paintingsStolen++;
    messages.push(msg(`A painting has gone missing from ${getRoomName(to, newBoard)}!`, 'alert'));
    newState.paintingsRemaining = state.paintingsRemaining - 1;
  }

  // Check for camera on this cell - thief can disable it
  if (cell.camera !== null && !thief.camerasDisabled.includes(cell.camera)) {
    thief.camerasDisabled = [...thief.camerasDisabled, cell.camera];
    messages.push(msg(`The thief disabled camera ${cell.camera}.`, 'thief'));
  }

  // Check for power room
  if (cell.isPowerRoom && !thief.powerOff) {
    thief.powerOff = true;
    messages.push(msg('The thief has cut the power!', 'thief'));
  }

  // Update visible position if thief was spotted
  if (thief.visible) {
    thief.visiblePosition = { ...to };
  }

  newState.thief = thief;
  newState.board = newBoard;
  newState.movesRemaining = remaining;
  newState.messages = messages;

  if (remaining <= 0) {
    // Check if thief is caught (on same space as a detective)
    const caught = state.detectives.some(d => d.position.row === to.row && d.position.col === to.col);
    if (caught) {
      newState.phase = 'thief-caught';
      newState.messages = [...messages, msg('The thief has been caught!', 'alert')];
    } else {
      newState.turnPhase = 'detective-roll';
      // currentDetectiveIndex is already set by advanceToNextTurn
    }
  }

  return newState;
}

export function thiefAttemptEscape(state: GameState, exitId: number): GameState {
  const exits = getAllExits(state.board);
  const exit = exits.find(e => e.info.id === exitId);
  if (!exit) return state;

  // Thief must be on the interior cell adjacent to this exit
  const { interiorPos, info } = exit;
  if (state.thief.position.row !== interiorPos.row || state.thief.position.col !== interiorPos.col) {
    return state;
  }

  // Must have stolen at least 3 paintings
  if (state.thief.paintingsStolen < 3) {
    return {
      ...state,
      messages: [...state.messages, msg('Need at least 3 paintings to escape!', 'alert')],
    };
  }

  const messages = [...state.messages];

  if (info.locked) {
    messages.push(msg(`Exit ${exitId} is locked! The thief must find another way out.`, 'alert'));
    // Thief's position is revealed when they try a locked exit
    const thief = { ...state.thief, visible: true, visiblePosition: { ...state.thief.position } };
    return { ...state, thief, messages };
  }

  // Escape successful!
  messages.push(msg(`The thief escaped through exit ${exitId} with ${state.thief.paintingsStolen} paintings!`, 'thief'));
  return { ...state, phase: 'thief-escaped', messages };
}

// ===== DETECTIVE ACTIONS =====

export function rollDetectiveDice(state: GameState): GameState {
  if (state.turnPhase !== 'detective-roll') return state;

  const diceResult = rollDice();
  return {
    ...state,
    diceResult,
    movesRemaining: diceResult.movement,
    specialUsed: false,
    canUseSpecialFirst: true,
    turnPhase: 'detective-move',
    messages: [
      ...state.messages,
      msg(
        `${state.detectives[state.currentDetectiveIndex].displayName} rolled ${diceResult.movement} for movement` +
        (diceResult.special ? ` and ${diceResult.special === 'eye' ? 'Eye' : diceResult.special === 'motion' ? 'Motion Detector' : 'Scan'}` : ' (no special action)') + '.',
        'detective',
      ),
    ],
  };
}

export function moveDetective(state: GameState, to: Position): GameState {
  if (state.turnPhase !== 'detective-move') return state;
  if (state.movesRemaining <= 0) return state;

  const detective = state.detectives[state.currentDetectiveIndex];
  const reachable = getReachableCells(detective.position, 1, state.board);
  if (!reachable.find(p => p.row === to.row && p.col === to.col)) {
    return state; // Invalid move
  }

  // Check if another detective is already there
  if (state.detectives.some((d, i) => i !== state.currentDetectiveIndex && d.position.row === to.row && d.position.col === to.col)) {
    return state; // Can't stack detectives
  }

  const newDetectives = state.detectives.map((d, i) =>
    i === state.currentDetectiveIndex ? { ...d, position: { ...to } } : d
  );
  const remaining = state.movesRemaining - 1;
  const messages = [...state.messages];

  // Check if detective lands on thief
  if (state.thief.position.row === to.row && state.thief.position.col === to.col) {
    messages.push(msg(`${detective.displayName} caught the thief!`, 'alert'));
    return { ...state, detectives: newDetectives, phase: 'thief-caught', messages };
  }

  const newState = {
    ...state,
    detectives: newDetectives,
    movesRemaining: remaining,
    messages,
  };

  if (remaining <= 0 && state.specialUsed) {
    return advanceToNextTurn(newState);
  }

  return newState;
}

export function useSpecialAction(state: GameState): GameState {
  if (state.specialUsed || !state.diceResult?.special) return state;

  const special = state.diceResult.special;
  const detective = state.detectives[state.currentDetectiveIndex];
  const thief = state.thief;
  const messages = [...state.messages];

  let newThief = { ...thief };

  switch (special) {
    case 'eye': {
      // Check line of sight from detective to thief
      if (hasLineOfSight(detective.position, thief.position, state.board)) {
        newThief.visible = true;
        newThief.visiblePosition = { ...thief.position };
        messages.push(msg(
          `${detective.displayName} spotted the thief at ${getRoomName(thief.position, state.board)}!`,
          'alert',
        ));
      } else {
        messages.push(msg(`${detective.displayName} looked around but couldn't see the thief.`, 'detective'));
      }
      break;
    }
    case 'motion': {
      if (thief.powerOff) {
        messages.push(msg('Motion detectors are offline - the power has been cut!', 'alert'));
        break;
      }
      if (thief.wiresCut < 2) {
        // Thief CAN choose to cut wires (handled via AI or player choice)
        // For now, we reveal the floor color
        const floorColor = getFloorColorName(thief.position, state.board);
        messages.push(msg(`Motion detector triggered! The thief is on ${floorColor} flooring.`, 'detective'));
      } else {
        const floorColor = getFloorColorName(thief.position, state.board);
        messages.push(msg(`Motion detector triggered! The thief is on ${floorColor} flooring.`, 'detective'));
      }
      break;
    }
    case 'scan': {
      if (thief.powerOff) {
        messages.push(msg('Camera system is offline - the power has been cut!', 'alert'));
        break;
      }
      const cameras = getCameraPositions(state.board);
      const disabledCams: number[] = [];
      const seenByCams: number[] = [];
      cameras.forEach((pos, num) => {
        if (thief.camerasDisabled.includes(num)) {
          disabledCams.push(num);
        } else if (hasLineOfSight(pos, thief.position, state.board)) {
          seenByCams.push(num);
        }
      });
      if (disabledCams.length > 0) {
        messages.push(msg(`Camera(s) ${disabledCams.join(', ')} have been disconnected!`, 'alert'));
      }
      if (seenByCams.length > 0) {
        newThief.visible = true;
        newThief.visiblePosition = { ...thief.position };
        messages.push(msg(`Camera(s) ${seenByCams.join(', ')} spotted the thief!`, 'alert'));
      } else if (disabledCams.length === 0) {
        messages.push(msg('All cameras operational. No sign of the thief.', 'detective'));
      } else {
        messages.push(msg('Remaining cameras show no sign of the thief.', 'detective'));
      }
      break;
    }
  }

  const newState: GameState = {
    ...state,
    thief: newThief,
    specialUsed: true,
    messages,
  };

  // If movement is also done, advance
  if (state.movesRemaining <= 0) {
    return advanceToNextTurn(newState);
  }

  return newState;
}

export function skipSpecialAction(state: GameState): GameState {
  const newState = { ...state, specialUsed: true };
  if (state.movesRemaining <= 0) {
    return advanceToNextTurn(newState);
  }
  return newState;
}

export function endDetectiveMove(state: GameState): GameState {
  const newState = { ...state, movesRemaining: 0 };
  if (state.specialUsed) {
    return advanceToNextTurn(newState);
  }
  return newState;
}

function advanceToNextTurn(state: GameState): GameState {
  const nextThiefTurn: GameState = {
    ...state,
    turnPhase: 'thief-move',
    movesRemaining: 3,
    diceResult: null,
    specialUsed: false,
  };

  // After each detective, the thief gets a turn
  // After the thief's turn, the next detective goes
  const nextDetIdx = state.currentDetectiveIndex + 1;
  if (nextDetIdx >= state.detectives.length) {
    // All detectives have gone. Thief gets a turn, then cycle restarts.
    return { ...nextThiefTurn, currentDetectiveIndex: 0 };
  } else {
    return { ...nextThiefTurn, currentDetectiveIndex: nextDetIdx };
  }
}

// ===== THIEF WIRE CUT (response to motion detector) =====

export function thiefCutWire(state: GameState): GameState {
  if (state.thief.wiresCut >= 2) return state;
  const thief = { ...state.thief, wiresCut: state.thief.wiresCut + 1 };
  return {
    ...state,
    thief,
    messages: [...state.messages, msg('The thief cut a wire! Motion detector avoided.', 'thief')],
  };
}

// ===== UTILITY =====

export function posEquals(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getAdjacentExits(pos: Position, board: CellData[][]): ExitInfo[] {
  const exits: ExitInfo[] = [];
  const deltas: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of deltas) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (r >= 0 && r < board.length && c >= 0 && c < board[0].length) {
      const cell = board[r][c];
      if (cell.exit) {
        exits.push(cell.exit);
      }
    }
  }
  return exits;
}
