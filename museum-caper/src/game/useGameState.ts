import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { GameState, GameMode, Position } from './types';
import {
  createInitialGameState, moveThief, moveDetective, rollDetectiveDice,
  useSpecialAction, skipSpecialAction, endDetectiveMove, thiefAttemptEscape,
  posEquals,
} from './gameEngine';
import { getAIThiefMove, getAIEscapeExit } from './aiThief';
import { getReachableCells, getAllExits } from './boardData';

type Action =
  | { type: 'START_GAME'; mode: GameMode; numDetectives: number }
  | { type: 'CELL_CLICK'; pos: Position }
  | { type: 'ROLL_DICE' }
  | { type: 'USE_SPECIAL' }
  | { type: 'SKIP_SPECIAL' }
  | { type: 'END_MOVE' }
  | { type: 'ATTEMPT_ESCAPE'; exitId: number }
  | { type: 'AI_THIEF_TURN' }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'RESET' };

function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'RESET') return null;
  if (action.type === 'START_GAME') {
    return createInitialGameState(action.mode, action.numDetectives);
  }
  if (!state) return null;
  if (state.phase !== 'playing') return state;

  switch (action.type) {
    case 'CELL_CLICK': {
      const { pos } = action;
      if (state.turnPhase === 'thief-move' && state.mode === 'local-multiplayer') {
        return moveThief(state, pos);
      }
      if (state.turnPhase === 'detective-move') {
        return moveDetective(state, pos);
      }
      return state;
    }
    case 'ROLL_DICE':
      return rollDetectiveDice(state);
    case 'USE_SPECIAL':
      return useSpecialAction(state);
    case 'SKIP_SPECIAL':
      return skipSpecialAction(state);
    case 'END_MOVE':
      return endDetectiveMove(state);
    case 'ATTEMPT_ESCAPE':
      return thiefAttemptEscape(state, action.exitId);
    case 'AI_THIEF_TURN': {
      let s = state;

      // Check if thief should attempt escape first
      const escapeExit = getAIEscapeExit(s);
      if (escapeExit !== null) {
        return thiefAttemptEscape(s, escapeExit);
      }

      // Move the AI thief up to 3 steps. Re-plan after entry if needed.
      while (s.phase === 'playing' && s.turnPhase === 'thief-move' && s.movesRemaining > 0) {
        const moves = getAIThiefMove(s);
        if (moves.length === 0) break;
        for (const move of moves) {
          if (s.phase !== 'playing' || s.movesRemaining <= 0) break;
          s = moveThief(s, move);
        }
      }

      // After moving, check for escape
      if (s.phase === 'playing' && s.turnPhase === 'thief-move') {
        const escapeAfter = getAIEscapeExit(s);
        if (escapeAfter !== null) {
          s = thiefAttemptEscape(s, escapeAfter);
        }
      }

      // End thief's turn
      if (s.phase === 'playing' && s.turnPhase === 'thief-move') {
        return {
          ...s,
          turnPhase: 'detective-roll',
          movesRemaining: 0,
        };
      }

      return s;
    }
    case 'SET_STATE':
      return action.state;
    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, null);
  const aiTimeoutRef = useRef<number | null>(null);

  // Auto-trigger AI thief turn
  useEffect(() => {
    if (!state) return;
    if (state.phase !== 'playing') return;
    if (state.mode !== 'ai-thief') return;
    if (state.turnPhase !== 'thief-move') return;

    // Delay AI move for visual feedback
    aiTimeoutRef.current = window.setTimeout(() => {
      dispatch({ type: 'AI_THIEF_TURN' });
    }, 800);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [state?.turnPhase, state?.phase, state?.mode, state?.currentDetectiveIndex]);

  const startGame = useCallback((mode: GameMode, numDetectives: number) => {
    dispatch({ type: 'START_GAME', mode, numDetectives });
  }, []);

  const clickCell = useCallback((pos: Position) => {
    dispatch({ type: 'CELL_CLICK', pos });
  }, []);

  const rollDice = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });
  }, []);

  const useSpecial = useCallback(() => {
    dispatch({ type: 'USE_SPECIAL' });
  }, []);

  const skipSpecial = useCallback(() => {
    dispatch({ type: 'SKIP_SPECIAL' });
  }, []);

  const endMove = useCallback(() => {
    dispatch({ type: 'END_MOVE' });
  }, []);

  const attemptEscape = useCallback((exitId: number) => {
    dispatch({ type: 'ATTEMPT_ESCAPE', exitId });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Get highlights for valid moves
  const getHighlightedCells = useCallback((): Position[] => {
    if (!state || state.phase !== 'playing') return [];

    if (state.turnPhase === 'thief-move' && state.mode === 'local-multiplayer') {
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
  }, [state]);

  return {
    state,
    startGame,
    clickCell,
    rollDice,
    useSpecial,
    skipSpecial,
    endMove,
    attemptEscape,
    reset,
    getHighlightedCells,
  };
}
