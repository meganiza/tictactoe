import { useState } from 'react';
import type { GameMode } from '../game/types';

interface GameSetupProps {
  onStart: (mode: GameMode, numDetectives: number) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onStart }) => {
  const [mode, setMode] = useState<GameMode>('ai-thief');
  const [numDetectives, setNumDetectives] = useState(2);

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1 className="setup-title">Clue: The Great Museum Caper</h1>
        <p className="setup-subtitle">
          A hidden-movement game of cat and mouse in Mr. Boddy's private art museum
        </p>

        <div className="setup-section">
          <h2>Game Mode</h2>
          <div className="mode-options">
            <button
              className={`mode-btn ${mode === 'ai-thief' ? 'active' : ''}`}
              onClick={() => setMode('ai-thief')}
            >
              <div className="mode-icon">&#x1F916;</div>
              <div className="mode-label">AI Thief</div>
              <div className="mode-desc">
                The computer plays as the invisible thief. You control the detectives.
              </div>
            </button>
            <button
              className={`mode-btn ${mode === 'local-multiplayer' ? 'active' : ''}`}
              onClick={() => setMode('local-multiplayer')}
            >
              <div className="mode-icon">&#x1F465;</div>
              <div className="mode-label">Local Multiplayer</div>
              <div className="mode-desc">
                One player is the thief (hidden screen), others are detectives.
              </div>
            </button>
          </div>
        </div>

        <div className="setup-section">
          <h2>Number of Detectives</h2>
          <div className="detective-options">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                className={`det-btn ${numDetectives === n ? 'active' : ''}`}
                onClick={() => setNumDetectives(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="det-hint">
            {numDetectives === 1 && 'Solo detective vs. thief'}
            {numDetectives === 2 && 'Two detectives working together'}
            {numDetectives === 3 && 'Full detective team (recommended)'}
          </p>
        </div>

        <div className="setup-section">
          <h2>How to Play</h2>
          <div className="rules-summary">
            <div className="rule">
              <strong>Detectives:</strong> Roll two dice each turn. The number die moves your token.
              The special die gives an action: Eye (line of sight check), Motion Detector
              (reveal floor color), or Scan (check all cameras).
            </div>
            <div className="rule">
              <strong>Thief:</strong> Moves 1-3 spaces per turn, invisible to detectives.
              Steal paintings, disable cameras, and cut the power. Escape with 3+ paintings
              through an unlocked exit to win!
            </div>
            <div className="rule">
              <strong>Detectives win</strong> by landing on the thief's space.
              <strong> Thief wins</strong> by escaping with 3+ paintings.
            </div>
          </div>
        </div>

        <button className="btn btn-start" onClick={() => onStart(mode, numDetectives)}>
          Start Game
        </button>
      </div>
    </div>
  );
};

export default GameSetup;
