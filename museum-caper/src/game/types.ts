// ===== BOARD TYPES =====

export type RoomColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'gray';

export interface CellData {
  walkable: boolean;
  room: string | null;       // room id or null for hallway/wall
  roomColor: RoomColor;      // floor color (gray for hallways)
  isWall: boolean;
  camera: number | null;     // camera number 1-6, or null
  isPowerRoom: boolean;
  painting: boolean;         // whether a painting is placed here
  exit: ExitInfo | null;     // if this cell is an exit/window
}

export interface ExitInfo {
  id: number;
  type: 'door' | 'window';
  locked: boolean;
  direction: 'north' | 'south' | 'east' | 'west';
}

export interface Position {
  row: number;
  col: number;
}

// ===== GAME STATE TYPES =====

export type GameMode = 'ai-thief' | 'local-multiplayer';

export type GamePhase =
  | 'setup'              // choosing mode, placing paintings/locks
  | 'playing'            // main game loop
  | 'thief-escaped'      // thief won
  | 'thief-caught'       // detectives won
  | 'thief-stuck';       // thief has no valid exits

export type DetectiveColor = 'scarlet' | 'mustard' | 'plum' | 'green' | 'peacock' | 'white';

export interface Detective {
  id: DetectiveColor;
  displayName: string;
  color: string;          // CSS color
  position: Position;
}

export interface ThiefState {
  position: Position;
  visible: boolean;        // true once spotted by Eye
  visiblePosition: Position | null;  // where the gray pawn is shown
  paintingsStolen: number;
  camerasDisabled: number[];   // camera numbers disabled
  wiresCut: number;            // 0, 1, or 2 wire cuts used
  powerOff: boolean;
  moveHistory: Position[];
  hasMoved: boolean;           // has moved since last painting stolen
}

export type SpecialAction = 'eye' | 'motion' | 'scan' | null;

export interface DiceResult {
  movement: number;         // 1-6
  special: SpecialAction;   // special die result
}

export type TurnPhase =
  | 'thief-move'
  | 'detective-roll'
  | 'detective-move'
  | 'detective-special'
  | 'detective-done';

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  board: CellData[][];
  boardRows: number;
  boardCols: number;

  // Players
  detectives: Detective[];
  thief: ThiefState;
  currentDetectiveIndex: number;  // which detective's turn

  // Turn state
  turnPhase: TurnPhase;
  diceResult: DiceResult | null;
  movesRemaining: number;
  specialUsed: boolean;
  canUseSpecialFirst: boolean;  // detective can choose order

  // Paintings & locks
  paintingsRemaining: number;
  totalPaintings: number;
  exits: ExitInfo[];

  // Messages / log
  messages: GameMessage[];
  pendingMessages: PendingMessage[];

  // Detective knowledge (what they've discovered)
  knownDisabledCameras: number[];  // cameras detectives know are disabled
  knownPowerOff: boolean;          // whether detectives know power is off

  // Setup state
  setupPhase: 'mode' | 'detectives' | 'paintings' | 'locks' | 'ready';
  paintingsToPlace: number;
}

export interface GameMessage {
  id: number;
  text: string;
  type: 'info' | 'alert' | 'thief' | 'detective' | 'system';
  turn: number;
  /** If set, message is hidden from detectives until this condition is met */
  revealCondition?: 'next-thief-turn' | 'camera-scan' | 'never';
}

/** Messages queued to appear later (not yet shown in the log) */
export interface PendingMessage {
  message: GameMessage;
  revealOn: 'next-thief-turn' | 'camera-used';
  cameraId?: number; // for camera-related reveals
}

// ===== ROOM DEFINITIONS =====

export interface RoomDefinition {
  id: string;
  name: string;
  color: RoomColor;
  description: string;
}
