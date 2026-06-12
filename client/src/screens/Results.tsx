import socket from "../socket";
import { RoomState } from "../types";

interface ResultsProps {
  roomState: RoomState;
  isHost: boolean;
}

export default function Results({ roomState, isHost }: ResultsProps) {
  function handleNext() {
    socket.emit("game:next", { code: roomState.code });
  }

  // Get voter lists for each player
  const tallyData = roomState.players
    .map((player) => {
      const voters = Object.entries(roomState.votes)
        .filter(([_, targetId]) => targetId === player.id)
        .map(([voterId]) => roomState.players.find((p) => p.id === voterId)?.name || "Alguien");
      return {
        player,
        voters,
        count: voters.length,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalVotes = Object.keys(roomState.votes).length;

  // Determine winners
  const maxVotes = tallyData.length > 0 ? tallyData[0].count : 0;
  const winners = tallyData.filter((item) => item.count === maxVotes);
  const hasMultipleWinners = winners.length > 1;

  return (
    <div>
      <div className="adm-results-question">
        {roomState.currentQuestion?.question ?? "Sin pregunta"}
      </div>

      <div style={{ textAlign: "center", margin: "26px 16px 0" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: ".04em", textTransform: "uppercase" }}>
          El amigo de mierda
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--pink)" }}>
          de esta ronda es...
        </div>
      </div>

      {winners.length > 0 ? (
        <>
          <div className="adm-winner-card">
            <div className="adm-winner-title">
              {hasMultipleWinners ? "¡EMPATE!" : "SEÑALADO"}
            </div>
            <div className="adm-winner-name" style={{ fontSize: winners.length > 2 ? "32px" : "48px" }}>
              {winners.map((w) => w.player.name).join(" & ")}
            </div>
            <div className="adm-winner-stats">
              {maxVotes} DE {totalVotes} VOTOS
            </div>
          </div>

          {/* Pointing fingers for the winner(s) */}
          <div style={{ margin: "30px 16px 0", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            {winners.flatMap((w) => w.voters).map((voterName, index, arr) => {
              const rotation = (index - (arr.length - 1) / 2) * 15;
              return (
                <div key={index} style={{ textAlign: "center", transform: `rotate(${rotation}deg)` }}>
                  <svg width="42" height="42" viewBox="0 0 64 64" fill="var(--pink)">
                    <path d="M30 8c-3 0-5 2-5 5v20l-6-4c-4-2-8 3-4 7l12 15c2 3 5 4 9 4h8c5 0 9-4 9-9V24c0-3-4-3-4 0v4c0-3-4-3-4 0v-2c0-3-4-3-4 0v-2c0-3-4-3-4 0V13c0-3-2-5-6-5z" />
                  </svg>
                  <div style={{ fontFamily: "var(--font-handwriting)", fontSize: "14px", marginTop: "2px" }}>
                    {voterName}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="adm-card adm-card--dark" style={{ textAlign: "center" }}>
          <h3>Nadie votó</h3>
          <p className="adm-vote-instructions">Cobardes...</p>
        </div>
      )}

      {/* Tally Breakdown */}
      {tallyData.length > 0 && (
        <div className="adm-tally-list">
          <div className="adm-tally-title">Votos detallados</div>
          {tallyData.map(({ player, voters, count }) => (
            <div key={player.id} className="adm-tally-row">
              <strong>{player.name.toUpperCase()} ({count} {count === 1 ? "voto" : "votos"}):</strong>{" "}
              <span className="adm-voter-names">{voters.join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: "28px 16px 0" }}>
        {isHost ? (
          <button onClick={handleNext} className="adm-btn adm-btn--primary">
            Continuar
          </button>
        ) : (
          <div className="adm-vote-instructions">
            Esperando que el host continúe...
          </div>
        )}
      </div>
    </div>
  );
}
