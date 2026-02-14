import type { GameState } from '../game/types';
import { getAdjacentExits } from '../game/gameEngine';

interface GameHUDProps {
  state: GameState;
  onRollDice: () => void;
  onUseSpecial: () => void;
  onSkipSpecial: () => void;
  onEndMove: () => void;
  onAttemptEscape: (exitId: number) => void;
  onReset: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state, onRollDice, onUseSpecial, onSkipSpecial, onEndMove, onAttemptEscape, onReset,
}) => {
  const {
    phase, turnPhase, thief, detectives, currentDetectiveIndex,
    diceResult, movesRemaining, specialUsed, mode,
  } = state;

  const currentDetective = detectives[currentDetectiveIndex];
  const adjacentExits = (mode === 'local-multiplayer' && turnPhase === 'thief-move' && thief.position.row !== -1)
    ? getAdjacentExits(thief.position, state.board)
    : [];

  const isGameOver = phase !== 'playing';

  return (
    <div className="game-hud">
      {/* Status bar */}
      <div className="hud-status">
        {isGameOver ? (
          <div className={`game-over ${phase}`}>
            {phase === 'thief-escaped' && `The thief escaped with ${thief.paintingsStolen} paintings!`}
            {phase === 'thief-caught' && 'The thief has been caught! Detectives win!'}
            {phase === 'thief-stuck' && 'The thief is trapped! Detectives win!'}
            <button className="btn btn-primary" onClick={onReset} style={{ marginLeft: 12 }}>
              Play Again
            </button>
          </div>
        ) : (
          <div className="turn-info">
            {turnPhase === 'thief-move' && (
              <span className="thief-turn">
                Thief's Turn
                {mode === 'ai-thief' ? ' (AI thinking...)' : ` - ${movesRemaining} moves left`}
              </span>
            )}
            {(turnPhase === 'detective-roll' || turnPhase === 'detective-move') && currentDetective && (
              <span className="detective-turn" style={{ color: currentDetective.color }}>
                {currentDetective.displayName}'s Turn
                {turnPhase === 'detective-roll' && ' - Roll the dice!'}
                {turnPhase === 'detective-move' && ` - ${movesRemaining} moves left`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dice & Actions */}
      {!isGameOver && (
        <div className="hud-actions">
          {turnPhase === 'detective-roll' && (
            <button className="btn btn-primary" onClick={onRollDice}>
              Roll Dice
            </button>
          )}

          {turnPhase === 'detective-move' && (
            <>
              {diceResult && (
                <div className="dice-result">
                  <DiceFace value={diceResult.movement} />
                  <SpecialDieFace action={diceResult.special} />
                </div>
              )}

              {!specialUsed && diceResult?.special && (
                <>
                  <button className="btn btn-accent" onClick={onUseSpecial}>
                    Use {getSpecialName(diceResult.special)}
                  </button>
                  <button className="btn btn-secondary" onClick={onSkipSpecial}>
                    Skip
                  </button>
                </>
              )}

              <button className="btn btn-secondary" onClick={onEndMove}>
                End Move
              </button>
            </>
          )}

          {/* Thief escape (local multiplayer) */}
          {turnPhase === 'thief-move' && mode === 'local-multiplayer' && adjacentExits.length > 0 && thief.paintingsStolen >= 3 && (
            <div className="escape-options">
              <span>Try to escape:</span>
              {adjacentExits.map(exit => (
                <button
                  key={exit.id}
                  className="btn btn-accent"
                  onClick={() => onAttemptEscape(exit.id)}
                >
                  Exit {exit.id} ({exit.type})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="hud-stats">
        <div className="stat">
          <span className="stat-label">Paintings Stolen</span>
          <span className="stat-value">{thief.paintingsStolen} / {state.totalPaintings}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Remaining</span>
          <span className="stat-value">{state.paintingsRemaining}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cameras Disabled</span>
          <span className="stat-value">{thief.camerasDisabled.length} / 6</span>
        </div>
        <div className="stat">
          <span className="stat-label">Wire Cuts Left</span>
          <span className="stat-value">{2 - thief.wiresCut}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Power</span>
          <span className={`stat-value ${thief.powerOff ? 'power-off' : ''}`}>
            {thief.powerOff ? 'OFF' : 'ON'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Thief</span>
          <span className="stat-value">{thief.visible ? 'VISIBLE' : 'HIDDEN'}</span>
        </div>
      </div>

      {/* Message log */}
      <div className="message-log">
        <h3>Event Log</h3>
        <div className="messages">
          {state.messages.slice(-10).reverse().map(m => (
            <div key={m.id} className={`message msg-${m.type}`}>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DiceFace: React.FC<{ value: number }> = ({ value }) => (
  <div className="die movement-die">
    <span>{value}</span>
  </div>
);

const SpecialDieFace: React.FC<{ action: string | null }> = ({ action }) => (
  <div className={`die special-die ${action || 'blank'}`}>
    <span>{getSpecialIcon(action)}</span>
  </div>
);

function getSpecialName(action: string | null): string {
  switch (action) {
    case 'eye': return 'Eye';
    case 'motion': return 'Motion Detector';
    case 'scan': return 'Scan';
    default: return 'Nothing';
  }
}

function getSpecialIcon(action: string | null): string {
  switch (action) {
    case 'eye': return '\u{1F441}';
    case 'motion': return '\u{1F4E1}';
    case 'scan': return '\u{1F4F7}';
    default: return '-';
  }
}

export default GameHUD;
