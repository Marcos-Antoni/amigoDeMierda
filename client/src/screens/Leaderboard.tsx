import socket from "../socket";
import { RoomState } from "../types";

interface LeaderboardProps {
  roomState: RoomState;
  isHost: boolean;
  onAbandon: () => void;
}

export default function Leaderboard({ roomState, isHost, onAbandon }: LeaderboardProps) {
  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
  const maxScore = sorted.length > 0 ? sorted[0].score : 0;

  function handleNext() {
    socket.emit("game:next", { code: roomState.code });
  }

  return (
    <div>
      <div className="adm-leaderboard-banner">
        <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", lineHeight: "1", textTransform: "uppercase" }}>
          Ranking de <span style={{ color: "var(--pink)" }}>amigos de mierda</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", marginTop: "8px" }}>
          Cartas acumuladas — el primero a 5 gana
        </div>
      </div>

      <div className="adm-score-table">
        <div style={{ display: "flex", background: "var(--black)", color: "var(--white)", fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: ".06em", textTransform: "uppercase" }}>
          <div style={{ flex: 1, padding: "10px 14px" }}>Nombre de jugador</div>
          <div style={{ width: "120px", padding: "10px 14px", textAlign: "center", borderLeft: "3px solid var(--pink)" }}>Cartas ganadas</div>
        </div>

        {sorted.map((p) => {
          const isLeader = p.score === maxScore && maxScore > 0;
          return (
            <div 
              key={p.id} 
              className={`adm-score-row ${isLeader ? "adm-score-row--leader" : ""}`}
              style={{ display: "flex", alignItems: "center" }}
            >
              <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                {isLeader && (
                  <div style={{ width: "38px", height: "38px", flex: "0 0 auto", background: "var(--black)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="18" viewBox="0 0 64 48">
                      <path d="M6 42 L12 12 L24 28 L32 8 L40 28 L52 12 L58 42 Z" fill="none" stroke="var(--pink)" strokeWidth="4"></path>
                      <path d="M5 42 H59" stroke="var(--pink)" strokeWidth="5"></path>
                    </svg>
                  </div>
                )}
                <div className="adm-score-name">{p.name}</div>
              </div>
              
              <div style={{ width: "120px", padding: "12px 14px", textAlign: "center", borderLeft: "3px solid var(--black)", fontFamily: "var(--font-display)", fontSize: "30px", lineHeight: "1", color: "var(--pink)", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                {p.score}
                <span style={{ fontSize: "14px", color: "#999" }}>/5</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: "28px 16px 0" }}>
        {isHost ? (
          <button onClick={handleNext} className="adm-btn adm-btn--primary">
            Siguiente ronda
          </button>
        ) : (
          <div className="adm-vote-instructions">
            Esperando que el host continúe...
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            onClick={onAbandon}
            className="adm-btn adm-btn--secondary"
            style={{ fontSize: "13px", opacity: 0.7 }}
          >
            Abandonar sala
          </button>
        </div>
      </div>
    </div>
  );
}
