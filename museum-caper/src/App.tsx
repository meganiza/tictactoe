import React, { useState, useMemo } from 'react';
import { useGameState } from './game/useGameState';
import { GameSetup } from './components/GameSetup';
import { Board } from './components/Board';
import { GameHUD } from './components/GameHUD';
import { ThiefScreen } from './components/ThiefScreen';
import { getAllExits, getReachableCells } from './game/boardData';
import { posEquals } from './game/gameEngine';
import { Position } from './game/types';
import './App.css';

function App() {
  const {
    state, startGame, clickCell, rollDice,
    useSpecial, skipSpecial, endMove, attemptEscape, reset,
  } = useGameState();

  const [thiefScreenVisible, setThiefScreenVisible] = useState(false);

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

  // Handle thief screen for local multiplayer
  const showThiefScreen = state?.mode === 'local-multiplayer'
    && state.phase === 'playing'
    && state.turnPhase === 'thief-move'
    && thiefScreenVisible;

  // Auto-show thief screen when it becomes thief's turn in local multiplayer
  React.useEffect(() => {
    if (state?.mode === 'local-multiplayer' && state.turnPhase === 'thief-move' && state.phase === 'playing') {
      setThiefScreenVisible(true);
    }
  }, [state?.turnPhase, state?.mode, state?.phase]);

  if (!state) {
    return <GameSetup onStart={startGame} />;
  }

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
            highlightedCells={highlightedCells}
            onCellClick={clickCell}
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
            onReset={reset}
          />
        </div>
      </div>

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
