import type { GameState } from '../game/types';
import { ROOMS } from '../game/boardData';

interface ThiefScreenProps {
  state: GameState;
  onReady: () => void;
}

// This overlay is shown during the thief's turn in local multiplayer
// to prevent detectives from seeing the thief's moves.
export const ThiefScreen: React.FC<ThiefScreenProps> = ({ state, onReady }) => {
  const { thief, board } = state;

  return (
    <div className="thief-screen-overlay">
      <div className="thief-screen-card">
        <h2>Thief's Turn</h2>
        <p>Detectives, look away! Pass the device to the thief.</p>

        <div className="thief-info">
          <div className="thief-stat">
            <span>Paintings stolen:</span>
            <strong>{thief.paintingsStolen}</strong>
          </div>
          <div className="thief-stat">
            <span>Cameras disabled:</span>
            <strong>{thief.camerasDisabled.join(', ') || 'None'}</strong>
          </div>
          <div className="thief-stat">
            <span>Wire cuts remaining:</span>
            <strong>{2 - thief.wiresCut}</strong>
          </div>
          <div className="thief-stat">
            <span>Power:</span>
            <strong>{thief.powerOff ? 'OFF' : 'ON'}</strong>
          </div>
          {thief.position.row !== -1 && (
            <div className="thief-stat">
              <span>Current location:</span>
              <strong>
                ({thief.position.row}, {thief.position.col})
                {board[thief.position.row][thief.position.col].room
                  ? ` - ${ROOMS.find(r => r.id === board[thief.position.row][thief.position.col].room)?.name || 'Room'}`
                  : ' - Hallway'}
              </strong>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={onReady}>
          I'm Ready - Show the Board
        </button>
      </div>
    </div>
  );
};

export default ThiefScreen;
