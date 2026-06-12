import socket from "../socket";
import { RoomState } from "../types";

interface LobbyProps {
  roomState: RoomState;
  isHost: boolean;
}

export default function Lobby({ roomState, isHost }: LobbyProps) {
  function handleStart() {
    socket.emit("game:start", { code: roomState.code });
  }

  const canStart = roomState.players.length >= 2;

  return (
    <div>
      <div className="adm-lobby-code-card">
        <div className="adm-lobby-code-label">Código de sala</div>
        <div className="adm-lobby-code-value">{roomState.code}</div>
      </div>

      <div className="adm-player-list">
        <h3 className="adm-player-list-title">
          SE BUSCA ({roomState.players.length})
        </h3>
        
        <div className="adm-player-rows">
          {roomState.players.map((p, idx) => (
            <div key={p.id} className="adm-player-row">
              <div className="adm-player-left">
                <div className="adm-player-badge">{idx + 1}</div>
                <span className="adm-player-name">{p.name}</span>
                {p.id === roomState.hostId && (
                  <span className="adm-host-badge">HOST</span>
                )}
              </div>
              {p.id === roomState.hostId && (
                <span className="adm-host-tag">Dueño del caos</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="adm-lobby-actions">
        {isHost ? (
          <div>
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`adm-btn adm-btn--primary ${!canStart ? 'adm-btn--disabled' : ''}`}
            >
              {canStart ? "Iniciar caos" : "Esperando jugadores..."}
            </button>
            {!canStart && (
              <p className="adm-vote-instructions" style={{ marginTop: '12px' }}>
                Se necesitan al menos 2 jugadores para iniciar la partida.
              </p>
            )}
          </div>
        ) : (
          <div className="adm-vote-instructions">
            Esperando que el host inicie la partida...
          </div>
        )}
      </div>
    </div>
  );
}
