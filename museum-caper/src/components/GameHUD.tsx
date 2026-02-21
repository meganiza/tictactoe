import { useState } from 'react';
import type { GameState } from '../game/types';
import { getAdjacentExits } from '../game/gameEngine';

interface GameHUDProps {
  state: GameState;
  onRollDice: () => void;
  onUseSpecial: (eyeTarget?: 'self' | number) => void;
  onSkipSpecial: () => void;
  onEndMove: () => void;
  onAttemptEscape: (exitId: number) => void;
  onThiefEndTurn: () => void;
  onWireDecide: (cut: boolean) => void;
  onReset: () => void;
  isThiefView?: boolean;
}

export const GameHUD = ({
  state, onRollDice, onUseSpecial, onSkipSpecial, onEndMove, onAttemptEscape,
  onThiefEndTurn, onWireDecide, onReset, isThiefView,
}: GameHUDProps) => {
  const [showEyeChoices, setShowEyeChoices] = useState(false);
  const {
    phase, turnPhase, thief, detectives, currentDetectiveIndex,
    diceResult, movesRemaining, specialUsed, mode,
  } = state;

  const currentDetective = detectives[currentDetectiveIndex];
  const adjacentExits = (mode === 'local-multiplayer' && turnPhase === 'thief-move' && thief.position.row !== -1)
    ? getAdjacentExits(thief.position, state.board)
    : [];

  const isGameOver = phase !== 'playing';

  // For detective view: subtract pending paintings from display
  const pendingCount = state.pendingStolenPaintings?.length ?? 0;
  const displayedStolen = isThiefView ? thief.paintingsStolen : thief.paintingsStolen - pendingCount;
  const displayedRemaining = isThiefView ? state.paintingsRemaining : state.paintingsRemaining + pendingCount;

  // Power / cameras display: detectives only see what they've discovered
  const displayPowerOff = isThiefView ? thief.powerOff : state.knownPowerOff;
  const displayCamerasDisabled = isThiefView ? thief.camerasDisabled.length : state.knownDisabledCameras.length;

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
            {turnPhase === 'thief-wire-decision' && (
              <span className="thief-turn">Thief's Decision</span>
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

          {turnPhase === 'detective-move' && diceResult && (
            <div className="dice-action-grid">
              {/* Row 1: Movement die + End Move */}
              <div className="dice-action-row">
                <DiceFace value={diceResult.movement} />
                <button className="btn btn-secondary" onClick={onEndMove}>
                  End Move
                </button>
              </div>

              {/* Row 2: Special die + action buttons */}
              <div className="dice-action-row">
                <SpecialDieFace action={diceResult.special} />
                {!specialUsed ? (
                  <>
                    {diceResult.special === 'eye' && !showEyeChoices ? (
                      <button className="btn btn-accent" onClick={() => setShowEyeChoices(true)}>
                        Use {getSpecialName(diceResult.special)}
                      </button>
                    ) : diceResult.special === 'eye' && showEyeChoices ? (
                      <div className="eye-choices">
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Look from:</span>
                        <button className="btn btn-accent" onClick={() => { onUseSpecial('self'); setShowEyeChoices(false); }}>
                          My Position
                        </button>
                        {[1, 2, 3, 4, 5, 6].map(camId => (
                          <button
                            key={camId}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => { onUseSpecial(camId); setShowEyeChoices(false); }}
                          >
                            Cam {camId}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button className="btn btn-accent" onClick={() => onUseSpecial()}>
                        Use {getSpecialName(diceResult.special)}
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => { onSkipSpecial(); setShowEyeChoices(false); }}>
                      Skip
                    </button>
                  </>
                ) : (
                  <span className="special-used-label">Used</span>
                )}
              </div>
            </div>
          )}

          {/* Wire cutting decision (local multiplayer) */}
          {turnPhase === 'thief-wire-decision' && (
            <div className="wire-decision">
              <p>Motion Detector activated! Cut a wire to avoid detection?</p>
              <p className="wire-info">Wire cuts remaining: {2 - thief.wiresCut}</p>
              <div className="wire-buttons">
                <button className="btn btn-accent" onClick={() => onWireDecide(true)}>
                  Cut Wire
                </button>
                <button className="btn btn-secondary" onClick={() => onWireDecide(false)}>
                  Don't Cut
                </button>
              </div>
            </div>
          )}

          {/* Thief actions (local multiplayer) — only show when thief is viewing the board */}
          {turnPhase === 'thief-move' && mode === 'local-multiplayer' && isThiefView && (
            <>
              {adjacentExits.length > 0 && thief.paintingsStolen >= 3 && (
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
              {thief.position.row !== -1 && (
                <button className="btn btn-secondary" onClick={onThiefEndTurn}>
                  End Turn ({movesRemaining} moves left)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="hud-stats">
        <div className="stat">
          <span className="stat-label">Paintings Stolen</span>
          <span className="stat-value">{displayedStolen} / {state.totalPaintings}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Remaining</span>
          <span className="stat-value">{displayedRemaining}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cameras Disabled</span>
          <span className="stat-value">{displayCamerasDisabled} / 6</span>
        </div>
        {isThiefView && (
          <div className="stat">
            <span className="stat-label">Wire Cuts Left</span>
            <span className="stat-value">{2 - thief.wiresCut}</span>
          </div>
        )}
        <div className="stat">
          <span className="stat-label">Power</span>
          <span className={`stat-value ${displayPowerOff ? 'power-off' : ''}`}>
            {displayPowerOff ? 'OFF' : 'ON'}
          </span>
        </div>
        {isThiefView && (
          <div className="stat">
            <span className="stat-label">Thief</span>
            <span className="stat-value">{thief.visible ? 'VISIBLE' : 'HIDDEN'}</span>
          </div>
        )}
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

const DiceFace = ({ value }: { value: number }) => (
  <div className="die movement-die">
    <span>{value}</span>
  </div>
);

const SpecialDieFace = ({ action }: { action: string }) => (
  <div className={`die special-die ${action}`}>
    <span>{getSpecialIcon(action)}</span>
  </div>
);

function getSpecialName(action: string): string {
  switch (action) {
    case 'eye': return 'Eye';
    case 'motion': return 'Motion Detector';
    case 'scan': return 'Scan';
    default: return 'Nothing';
  }
}

function getSpecialIcon(action: string): string {
  switch (action) {
    case 'eye': return '\u{1F441}';
    case 'motion': return '\u{1F4E1}';
    case 'scan': return '\u{1F4F7}';
    default: return '-';
  }
}

export default GameHUD;
