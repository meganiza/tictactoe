import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameState } from './game/useGameState';
import { GameSetup } from './components/GameSetup';
import { Board } from './components/Board';
import { GameHUD } from './components/GameHUD';
import { ThiefScreen } from './components/ThiefScreen';
import { getAllExits, getReachableCells } from './game/boardData';
import { posEquals } from './game/gameEngine';
import type { Position } from './game/types';
import './App.css';

function App() {
  const {
    state, startGame, clickCell, rollDice,
    useSpecial, skipSpecial, endMove, attemptEscape, thiefEndTurn, wireDecide, reset,
  } = useGameState();

  const [thiefScreenVisible, setThiefScreenVisible] = useState(false);
  // New: detectives must click "Ready" to show the thief modal
  const [detectivesReady, setDetectivesReady] = useState(false);

  // Compute highlighted cells
  const highlightedCells = useMemo((): Position[] => {
    if (!state || state.phase !== 'playing') return [];

    if (state.turnPhase === 'thief-move' && state.mode === 'local-multiplayer' && !thiefScreenVisible) {
      if (state.thief.position.row === -1) {
        return getAllExits(state.board).map(e => e.interiorPos);
      }
      return getReachableCells(state.thief.position, 1, state.board);
    }

    if (state.turnPhase === 'detective-move' && state.movesRemaining > 0) {
      const det = state.detectives[state.currentDetectiveIndex];
      return getReachableCells(det.position, 1, state.board).filter(
        p => !state.detectives.some(d => posEquals(d.position, p))
      );
    }

    return [];
  }, [state, thiefScreenVisible]);

  // Handle thief screen for local multiplayer:
  // Instead of auto-showing, wait for detectives to click "Ready to Switch"
  const showThiefScreen = state?.mode === 'local-multiplayer'
    && state.phase === 'playing'
    && state.turnPhase === 'thief-move'
    && thiefScreenVisible;

  // Show "ready to switch" prompt when transitioning to thief turn
  const showReadyPrompt = state?.mode === 'local-multiplayer'
    && state.phase === 'playing'
    && state.turnPhase === 'thief-move'
    && !thiefScreenVisible
    && !detectivesReady;

  // isThiefView: true when the thief player is actively viewing the board
  const isThiefView = state?.mode === 'local-multiplayer'
    && state.phase === 'playing'
    && (state.turnPhase === 'thief-move' || state.turnPhase === 'thief-wire-decision')
    && detectivesReady;

  // When detectives click ready, show the thief screen modal
  const handleDetectivesReady = useCallback(() => {
    setDetectivesReady(true);
    setThiefScreenVisible(true);
  }, []);

  // Reset detectivesReady when turn changes away from thief
  useEffect(() => {
    if (state?.turnPhase !== 'thief-move') {
      setDetectivesReady(false);
      setThiefScreenVisible(false);
    }
  }, [state?.turnPhase]);

  // Determine which position is "selected" for arrow key movement
  const selectedPos = useMemo((): Position | null => {
    if (!state || state.phase !== 'playing') return null;
    if (state.turnPhase === 'thief-move' && state.mode === 'local-multiplayer' && !thiefScreenVisible && detectivesReady) {
      if (state.thief.position.row === -1) return null; // can't arrow-key from off-board
      return state.thief.position;
    }
    if (state.turnPhase === 'detective-move' && state.movesRemaining > 0) {
      return state.detectives[state.currentDetectiveIndex].position;
    }
    return null;
  }, [state, thiefScreenVisible, detectivesReady]);

  // Arrow key movement
  useEffect(() => {
    if (!selectedPos) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const deltas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const delta = deltas[e.key];
      if (!delta) return;
      e.preventDefault();
      const target: Position = { row: selectedPos.row + delta[0], col: selectedPos.col + delta[1] };
      // Check if target is in highlighted cells (valid move)
      if (highlightedCells.some(p => p.row === target.row && p.col === target.col)) {
        clickCell(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPos, highlightedCells, clickCell]);

  if (!state) {
    return <GameSetup onStart={startGame} />;
  }

  // In local multiplayer during thief's turn, show thief on the board
  const showThiefOnBoard = state.mode === 'local-multiplayer'
    && state.turnPhase === 'thief-move'
    && !thiefScreenVisible
    && detectivesReady;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clue: The Great Museum Caper</h1>
        <button className="btn btn-small" onClick={reset}>New Game</button>
      </header>

      <div className="game-layout">
        <div className="board-wrapper">
          <Board
            state={state}
            highlightedCells={showReadyPrompt ? [] : highlightedCells}
            onCellClick={clickCell}
            forceShowThief={showThiefOnBoard}
            isThiefView={isThiefView || false}
          />
        </div>

        <div className="hud-wrapper">
          <GameHUD
            state={state}
            onRollDice={rollDice}
            onUseSpecial={useSpecial}
            onSkipSpecial={skipSpecial}
            onEndMove={endMove}
            onAttemptEscape={attemptEscape}
            onThiefEndTurn={thiefEndTurn}
            onWireDecide={wireDecide}
            onReset={reset}
            isThiefView={isThiefView || false}
          />
        </div>
      </div>

      {/* Ready prompt: detectives review board, then click to hand off */}
      {showReadyPrompt && (
        <div className="ready-prompt">
          <button className="btn btn-primary btn-ready" onClick={handleDetectivesReady}>
            Ready to Switch to Thief
          </button>
        </div>
      )}

      {showThiefScreen && (
        <ThiefScreen
          state={state}
          onReady={() => setThiefScreenVisible(false)}
        />
      )}
    </div>
  );
}

export default App;
