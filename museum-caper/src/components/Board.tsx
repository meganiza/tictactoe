import React, { useMemo } from 'react';
import type { CellData, Position, GameState, Detective } from '../game/types';
import { ROOMS } from '../game/boardData';

interface BoardProps {
  state: GameState;
  highlightedCells: Position[];
  onCellClick: (pos: Position) => void;
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

export const Board: React.FC<BoardProps> = ({ state, highlightedCells, onCellClick }) => {
  const { board, thief, detectives, boardRows, boardCols } = state;

  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of highlightedCells) {
      set.add(`${p.row},${p.col}`);
    }
    return set;
  }, [highlightedCells]);

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

        {/* Thief token (only if visible) */}
        {thief.visible && thief.visiblePosition && (
          <circle
            cx={thief.visiblePosition.col * CELL_SIZE + CELL_SIZE / 2}
            cy={thief.visiblePosition.row * CELL_SIZE + CELL_SIZE / 2}
            r={CELL_SIZE * 0.35}
            fill="#333"
            stroke="#000"
            strokeWidth="2"
            className="thief-token"
          />
        )}
      </svg>
    </div>
  );
};

const BoardCell: React.FC<{
  cell: CellData;
  row: number;
  col: number;
  isHighlighted: boolean;
  onClick: () => void;
}> = React.memo(({ cell, row, col, isHighlighted, onClick }) => {
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
            cx={x + CELL_SIZE - 10}
            cy={y + 10}
            r={7}
            fill="#ff6600"
            stroke="#cc5500"
            strokeWidth="1"
          />
          <text
            x={x + CELL_SIZE - 10}
            y={y + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill="#fff"
            fontWeight="bold"
          >
            {cell.camera}
          </text>
        </>
      )}

      {/* Painting icon */}
      {cell.painting && (
        <rect
          x={x + 6}
          y={y + 6}
          width={CELL_SIZE - 12}
          height={CELL_SIZE - 12}
          fill="gold"
          stroke="#B8860B"
          strokeWidth="2"
          rx="2"
        />
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
