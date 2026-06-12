import { RoomState } from "../types";

interface GameOverProps {
  roomState: RoomState;
}

export default function GameOver({ roomState }: GameOverProps) {
  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
  
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const rest = sorted.slice(3);

  return (
    <div>
      <div className="adm-gameover-crown-container">
        <svg className="adm-gameover-crown" viewBox="0 0 64 48">
          <path d="M6 42 L12 12 L24 28 L32 8 L40 28 L52 12 L58 42 Z" fill="none" stroke="var(--pink)" strokeWidth="4"></path>
          <path d="M5 42 H59" stroke="var(--pink)" strokeWidth="5"></path>
        </svg>
      </div>

      <h2 className="adm-gameover-title">PARTIDA</h2>
      <h2 className="adm-gameover-title" style={{ color: "var(--pink)", marginBottom: "20px" }}>FINALIZADA</h2>

      <div className="adm-podium">
        {/* 2nd Place */}
        {second && (
          <div className="adm-podium-col">
            <span className="adm-podium-name">{second.name}</span>
            <div className="adm-podium-block adm-podium-block--2nd">2</div>
          </div>
        )}
        
        {/* 1st Place */}
        {first && (
          <div className="adm-podium-col">
            <span className="adm-podium-name" style={{ fontWeight: "700", color: "var(--pink)" }}>{first.name}</span>
            <div className="adm-podium-block adm-podium-block--1st">1</div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="adm-podium-col">
            <span className="adm-podium-name">{third.name}</span>
            <div className="adm-podium-block adm-podium-block--3rd">3</div>
          </div>
        )}
      </div>

      {/* Other Players List */}
      {rest.length > 0 && (
        <div className="adm-podium-rest">
          <div className="adm-podium-rest-title">Otros sospechosos</div>
          {rest.map((p) => (
            <div key={p.id} className="adm-podium-rest-row">
              <span className="adm-podium-rest-name">{p.name}</span>
              <span className="adm-score-val">{p.score} {p.score === 1 ? "carta" : "cartas"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="adm-gameover-actions">
        <button 
          onClick={() => window.location.reload()} 
          className="adm-btn adm-btn--primary"
        >
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
