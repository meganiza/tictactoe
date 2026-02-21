import React, { useMemo } from 'react';
import type { CellData, Position, GameState, Detective } from '../game/types';
import { ROOMS } from '../game/boardData';

interface BoardProps {
  state: GameState;
  highlightedCells: Position[];
  onCellClick: (pos: Position) => void;
  forceShowThief?: boolean;
  isThiefView?: boolean;
}

const CELL_SIZE = 40;

const ROOM_COLORS: Record<string, string> = {
  red: '#ffcccc',
  yellow: '#fffacd',
  purple: '#e8d0f0',
  green: '#ccffcc',
  blue: '#cce0ff',
  gray: '#e8e8e8',
};

const ROOM_BORDER_COLORS: Record<string, string> = {
  red: '#dc143c',
  yellow: '#daa520',
  purple: '#8e4585',
  green: '#228b22',
  blue: '#4169e1',
  gray: '#999',
};

export const Board: React.FC<BoardProps> = ({ state, highlightedCells, onCellClick, forceShowThief, isThiefView }) => {
  const { board, thief, detectives, boardRows, boardCols } = state;

  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of highlightedCells) {
      set.add(`${p.row},${p.col}`);
    }
    return set;
  }, [highlightedCells]);

  // Ghost paintings: paintings that were stolen but still shown to detectives until next thief turn
  const ghostPaintingSet = useMemo(() => {
    const set = new Set<string>();
    if (!isThiefView && state.pendingStolenPaintings) {
      for (const sp of state.pendingStolenPaintings) {
        set.add(`${sp.pos.row},${sp.pos.col}`);
      }
    }
    return set;
  }, [isThiefView, state.pendingStolenPaintings]);

  const width = boardCols * CELL_SIZE;
  const height = boardRows * CELL_SIZE;

  return (
    <div className="board-container">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="board-svg"
      >
        {/* Board cells */}
        {board.map((row, r) =>
          row.map((cell, c) => (
            <BoardCell
              key={`${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              isHighlighted={highlightSet.has(`${r},${c}`)}
              isGhostPainting={ghostPaintingSet.has(`${r},${c}`)}
              onClick={() => onCellClick({ row: r, col: c })}
            />
          ))
        )}

        {/* Room labels */}
        {ROOMS.map(room => {
          const pos = getRoomLabelPosition(room.id, board);
          if (!pos) return null;
          return (
            <text
              key={room.id}
              x={pos.col * CELL_SIZE + CELL_SIZE / 2}
              y={pos.row * CELL_SIZE + CELL_SIZE / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="room-label"
              fontSize="9"
              fill="#555"
              fontWeight="bold"
            >
              {room.name}
            </text>
          );
        })}

        {/* Power room label */}
        <text
          x={8 * CELL_SIZE + CELL_SIZE / 2}
          y={8 * CELL_SIZE + CELL_SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="#c00"
          fontWeight="bold"
        >
          PWR
        </text>

        {/* Detective tokens */}
        {detectives.map(det => (
          <DetectiveToken key={det.id} detective={det} />
        ))}

        {/* Thief token (visible when spotted by detectives OR forced visible during thief's own turn) */}
        {(() => {
          const showThief = forceShowThief && thief.position.row !== -1;
          const showSpotted = thief.visible && thief.visiblePosition;
          if (showThief) {
            return (
              <circle
                cx={thief.position.col * CELL_SIZE + CELL_SIZE / 2}
                cy={thief.position.row * CELL_SIZE + CELL_SIZE / 2}
                r={CELL_SIZE * 0.35}
                fill="#333"
                stroke="#000"
                strokeWidth="2"
                className="thief-token"
              />
            );
          }
          if (showSpotted) {
            return (
              <circle
                cx={thief.visiblePosition!.col * CELL_SIZE + CELL_SIZE / 2}
                cy={thief.visiblePosition!.row * CELL_SIZE + CELL_SIZE / 2}
                r={CELL_SIZE * 0.35}
                fill="#333"
                stroke="#000"
                strokeWidth="2"
                className="thief-token"
              />
            );
          }
          return null;
        })()}
      </svg>
    </div>
  );
};

const BoardCell: React.FC<{
  cell: CellData;
  row: number;
  col: number;
  isHighlighted: boolean;
  isGhostPainting?: boolean;
  onClick: () => void;
}> = React.memo(({ cell, row, col, isHighlighted, isGhostPainting, onClick }) => {
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;

  if (cell.isWall && !cell.exit) {
    return (
      <rect
        x={x} y={y}
        width={CELL_SIZE} height={CELL_SIZE}
        fill="#4a4a4a"
        stroke="#333"
        strokeWidth="0.5"
      />
    );
  }

  // Exit cell (door/window on perimeter)
  if (cell.exit) {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect
          x={x} y={y}
          width={CELL_SIZE} height={CELL_SIZE}
          fill="#4a4a4a"
          stroke="#333"
          strokeWidth="0.5"
        />
        <rect
          x={x + 8} y={y + 8}
          width={CELL_SIZE - 16} height={CELL_SIZE - 16}
          fill={cell.exit.type === 'door' ? '#8B4513' : '#87CEEB'}
          stroke="#333"
          strokeWidth="1"
          rx="2"
        />
        <text
          x={x + CELL_SIZE / 2}
          y={y + CELL_SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fill="#fff"
          fontWeight="bold"
        >
          {cell.exit.id}
        </text>
      </g>
    );
  }

  const bgColor = isHighlighted
    ? '#90EE90'
    : ROOM_COLORS[cell.roomColor] || '#e8e8e8';

  const borderColor = cell.room
    ? ROOM_BORDER_COLORS[cell.roomColor] || '#999'
    : '#ccc';

  return (
    <g onClick={onClick} style={{ cursor: isHighlighted ? 'pointer' : 'default' }}>
      <rect
        x={x} y={y}
        width={CELL_SIZE} height={CELL_SIZE}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={cell.room ? '1' : '0.5'}
        strokeOpacity={cell.room ? '0.5' : '0.3'}
      />

      {/* Camera icon */}
      {cell.camera !== null && (
        <>
          <circle
            cx={x + CELL_SIZE / 2}
            cy={y + CELL_SIZE / 2}
            r={CELL_SIZE * 0.4}
            fill="#ff6600"
            stroke="#cc5500"
            strokeWidth="1.5"
          />
          <text
            x={x + CELL_SIZE / 2}
            y={y + CELL_SIZE / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fill="#fff"
            fontWeight="bold"
          >
            {cell.camera}
          </text>
        </>
      )}

      {/* Painting icon (real or ghost for detective view) */}
      {(cell.painting || isGhostPainting) && (
        <PaintingIcon x={x} y={y} row={row} col={col} />
      )}

      {/* Power room indicator */}
      {cell.isPowerRoom && (
        <circle
          cx={x + CELL_SIZE / 2}
          cy={y + CELL_SIZE / 2}
          r={4}
          fill="#ff0000"
          stroke="#cc0000"
          strokeWidth="1"
        />
      )}

      {/* Highlight pulse */}
      {isHighlighted && (
        <rect
          x={x + 2} y={y + 2}
          width={CELL_SIZE - 4} height={CELL_SIZE - 4}
          fill="none"
          stroke="#00aa00"
          strokeWidth="2"
          rx="4"
          className="highlight-pulse"
        />
      )}
    </g>
  );
});

// Simple renditions of famous paintings, mapped by board position
const PAINTING_STYLES: Record<string, { bg: string; render: (x: number, y: number, s: number) => React.ReactNode }> = {
  // Mona Lisa - face with smile
  '2,2': {
    bg: '#4a3c28',
    render: (x, y, s) => (
      <>
        <ellipse cx={x + s/2} cy={y + s*0.4} rx={s*0.2} ry={s*0.25} fill="#deb887" />
        <path d={`M${x+s*0.35} ${y+s*0.48} Q${x+s*0.5} ${y+s*0.58} ${x+s*0.65} ${y+s*0.48}`} stroke="#5c4033" strokeWidth="0.8" fill="none" />
        <circle cx={x+s*0.42} cy={y+s*0.35} r={1} fill="#3c2415" />
        <circle cx={x+s*0.58} cy={y+s*0.35} r={1} fill="#3c2415" />
        <path d={`M${x+s*0.3} ${y+s*0.55} L${x+s*0.5} ${y+s*0.85} L${x+s*0.7} ${y+s*0.55}`} fill="#2d5a1e" />
      </>
    ),
  },
  // Starry Night - swirls and moon
  '3,3': {
    bg: '#1a237e',
    render: (x, y, s) => (
      <>
        <circle cx={x+s*0.75} cy={y+s*0.25} r={s*0.12} fill="#ffd54f" />
        <path d={`M${x+s*0.15} ${y+s*0.35} Q${x+s*0.35} ${y+s*0.15} ${x+s*0.55} ${y+s*0.35}`} stroke="#64b5f6" strokeWidth="2" fill="none" />
        <path d={`M${x+s*0.25} ${y+s*0.55} Q${x+s*0.45} ${y+s*0.35} ${x+s*0.65} ${y+s*0.55}`} stroke="#42a5f5" strokeWidth="1.5" fill="none" />
        <rect x={x+s*0.1} y={y+s*0.65} width={s*0.8} height={s*0.25} fill="#2e7d32" rx="1" />
      </>
    ),
  },
  // Girl with a Pearl Earring - profile with earring
  '2,7': {
    bg: '#1a1a2e',
    render: (x, y, s) => (
      <>
        <ellipse cx={x+s*0.5} cy={y+s*0.38} rx={s*0.2} ry={s*0.25} fill="#deb887" />
        <ellipse cx={x+s*0.5} cy={y+s*0.2} rx={s*0.22} ry={s*0.18} fill="#1565c0" />
        <circle cx={x+s*0.58} cy={y+s*0.55} r={s*0.06} fill="#e0e0e0" stroke="#fff" strokeWidth="0.5" />
        <circle cx={x+s*0.42} cy={y+s*0.34} r={1} fill="#3c2415" />
      </>
    ),
  },
  // The Scream - figure with open mouth
  '2,9': {
    bg: '#ff6f00',
    render: (x, y, s) => (
      <>
        <path d={`M${x+s*0.1} ${y+s*0.3} Q${x+s*0.5} ${y+s*0.1} ${x+s*0.9} ${y+s*0.3}`} stroke="#d32f2f" strokeWidth="1.5" fill="none" />
        <path d={`M${x+s*0.1} ${y+s*0.5} Q${x+s*0.5} ${y+s*0.3} ${x+s*0.9} ${y+s*0.5}`} stroke="#e65100" strokeWidth="1" fill="none" />
        <ellipse cx={x+s*0.5} cy={y+s*0.45} rx={s*0.13} ry={s*0.17} fill="#deb887" />
        <ellipse cx={x+s*0.5} cy={y+s*0.55} rx={s*0.06} ry={s*0.08} fill="#3e2723" />
        <circle cx={x+s*0.45} cy={y+s*0.4} r={1.2} fill="#3e2723" />
        <circle cx={x+s*0.55} cy={y+s*0.4} r={1.2} fill="#3e2723" />
      </>
    ),
  },
  // Water Lilies - pond with flowers
  '2,13': {
    bg: '#4db6ac',
    render: (x, y, s) => (
      <>
        <rect x={x+s*0.05} y={y+s*0.05} width={s*0.9} height={s*0.9} fill="#26a69a" rx="1" />
        <ellipse cx={x+s*0.3} cy={y+s*0.4} rx={s*0.12} ry={s*0.06} fill="#81c784" />
        <ellipse cx={x+s*0.7} cy={y+s*0.6} rx={s*0.14} ry={s*0.06} fill="#66bb6a" />
        <circle cx={x+s*0.3} cy={y+s*0.38} r={s*0.05} fill="#f48fb1" />
        <circle cx={x+s*0.7} cy={y+s*0.58} r={s*0.05} fill="#fff176" />
        <circle cx={x+s*0.5} cy={y+s*0.7} r={s*0.04} fill="#f8bbd0" />
      </>
    ),
  },
  // The Great Wave - wave pattern
  '3,14': {
    bg: '#e3f2fd',
    render: (x, y, s) => (
      <>
        <rect x={x+s*0.05} y={y+s*0.6} width={s*0.9} height={s*0.35} fill="#1565c0" />
        <path d={`M${x} ${y+s*0.6} Q${x+s*0.25} ${y+s*0.2} ${x+s*0.5} ${y+s*0.45} Q${x+s*0.75} ${y+s*0.65} ${x+s} ${y+s*0.4}`} fill="#1e88e5" />
        <path d={`M${x+s*0.35} ${y+s*0.3} L${x+s*0.4} ${y+s*0.22} L${x+s*0.45} ${y+s*0.3}`} stroke="white" strokeWidth="0.7" fill="none" />
        <circle cx={x+s*0.8} cy={y+s*0.2} r={s*0.08} fill="#ffecb3" />
      </>
    ),
  },
  // The Persistence of Memory - melting clock
  '13,2': {
    bg: '#c8b88a',
    render: (x, y, s) => (
      <>
        <rect x={x+s*0.05} y={y+s*0.55} width={s*0.9} height={s*0.4} fill="#8d6e63" />
        <rect x={x+s*0.05} y={y+s*0.05} width={s*0.9} height={s*0.5} fill="#90caf9" />
        <ellipse cx={x+s*0.5} cy={y+s*0.45} rx={s*0.2} ry={s*0.12} fill="#e0e0e0" stroke="#757575" strokeWidth="0.5" />
        <path d={`M${x+s*0.5} ${y+s*0.35} L${x+s*0.5} ${y+s*0.45} L${x+s*0.62} ${y+s*0.45}`} stroke="#333" strokeWidth="0.8" fill="none" />
        <path d={`M${x+s*0.3} ${y+s*0.55} Q${x+s*0.4} ${y+s*0.7} ${x+s*0.5} ${y+s*0.55}`} fill="#bdbdbd" />
      </>
    ),
  },
  // Sunflowers
  '13,13': {
    bg: '#f9a825',
    render: (x, y, s) => (
      <>
        <rect x={x+s*0.3} y={y+s*0.6} width={s*0.4} height={s*0.35} fill="#6d4c41" rx="2" />
        <circle cx={x+s*0.35} cy={y+s*0.35} r={s*0.15} fill="#fdd835" />
        <circle cx={x+s*0.35} cy={y+s*0.35} r={s*0.07} fill="#795548" />
        <circle cx={x+s*0.65} cy={y+s*0.3} r={s*0.13} fill="#ffee58" />
        <circle cx={x+s*0.65} cy={y+s*0.3} r={s*0.06} fill="#6d4c41" />
        <circle cx={x+s*0.5} cy={y+s*0.18} r={s*0.1} fill="#fbc02d" />
        <circle cx={x+s*0.5} cy={y+s*0.18} r={s*0.05} fill="#795548" />
      </>
    ),
  },
  // American Gothic - two figures
  '14,14': {
    bg: '#8d6e63',
    render: (x, y, s) => (
      <>
        <rect x={x+s*0.25} y={y+s*0.6} width={s*0.5} height={s*0.35} fill="#795548" />
        <circle cx={x+s*0.35} cy={y+s*0.3} r={s*0.1} fill="#deb887" />
        <circle cx={x+s*0.65} cy={y+s*0.3} r={s*0.1} fill="#deb887" />
        <rect x={x+s*0.28} y={y+s*0.4} width={s*0.15} height={s*0.3} fill="#1a1a1a" />
        <rect x={x+s*0.57} y={y+s*0.4} width={s*0.15} height={s*0.3} fill="#4caf50" />
        <line x1={x+s*0.35} y1={y+s*0.4} x2={x+s*0.35} y2={y+s*0.8} stroke="#795548" strokeWidth="1" />
      </>
    ),
  },
};

const PaintingIcon: React.FC<{ x: number; y: number; row: number; col: number }> = ({ x, y, row, col }) => {
  const key = `${row},${col}`;
  const style = PAINTING_STYLES[key];
  const pad = 4;
  const s = CELL_SIZE - pad * 2;
  const px = x + pad;
  const py = y + pad;

  if (style) {
    return (
      <g>
        <rect x={px} y={py} width={s} height={s} fill={style.bg} stroke="#B8860B" strokeWidth="2" rx="2" />
        <clipPath id={`clip-${row}-${col}`}>
          <rect x={px} y={py} width={s} height={s} rx="2" />
        </clipPath>
        <g clipPath={`url(#clip-${row}-${col})`}>
          {style.render(px, py, s)}
        </g>
      </g>
    );
  }

  // Fallback: gold frame
  return (
    <rect x={px} y={py} width={s} height={s} fill="gold" stroke="#B8860B" strokeWidth="2" rx="2" />
  );
};

const DetectiveToken: React.FC<{ detective: Detective }> = ({ detective }) => {
  const cx = detective.position.col * CELL_SIZE + CELL_SIZE / 2;
  const cy = detective.position.row * CELL_SIZE + CELL_SIZE / 2;

  return (
    <g className="detective-token">
      <circle
        cx={cx} cy={cy}
        r={CELL_SIZE * 0.3}
        fill={detective.color}
        stroke="#000"
        strokeWidth="2"
      />
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill={detective.id === 'white' ? '#000' : '#fff'}
        fontWeight="bold"
      >
        {detective.displayName[0]}
      </text>
    </g>
  );
};

function getRoomLabelPosition(roomId: string, board: CellData[][]): Position | null {
  let sumR = 0, sumC = 0, count = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].room === roomId) {
        sumR += r;
        sumC += c;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return { row: Math.round(sumR / count), col: Math.round(sumC / count) };
}

export default Board;
