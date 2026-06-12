import { useState, useEffect } from "react";
import socket from "../socket";
import { RoomState } from "../types";

interface GameProps {
  roomState: RoomState;
  myId?: string;
  onAbandon: () => void;
}

export default function Game({ roomState, myId, onAbandon }: GameProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const hasVoted = myId ? myId in roomState.votes : false;

  // Reset selected player and timer on new round/question
  useEffect(() => {
    setSelectedPlayerId(null);
    setTimeLeft(30);
  }, [roomState.currentQuestion?.question]);

  // Local visual timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleVote() {
    if (!selectedPlayerId) return;
    socket.emit("game:vote", { code: roomState.code, targetId: selectedPlayerId });
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="adm-timer-badge adm-blink">
        TIEMPO: {timeLeft}S
      </div>

      <div className="adm-question-card">
        <h2
          className="adm-question-text"
          style={{ color: roomState.currentQuestion?.hot ? "var(--pink)" : "inherit" }}
        >
          {roomState.currentQuestion?.question ?? "Cargando pregunta..."}
        </h2>
      </div>

      {hasVoted ? (
        <div className="adm-card adm-card--dark adm-card--rotate-left" style={{ textAlign: "center", marginTop: "24px" }}>
          <h3 className="adm-winner-name" style={{ fontSize: "24px", color: "var(--pink)" }}>VOTO REGISTRADO</h3>
          <p className="adm-vote-instructions">Esperando al resto de los sospechosos...</p>
        </div>
      ) : (
        <>
          <div className="adm-vote-instructions">
            SEÑALÁ AL RESPONSABLE:
          </div>

          <div className="adm-vote-grid">
            {roomState.players.map((p) => {
              const isMe = p.id === myId;
              return (
                <button
                  key={p.id}
                  onClick={() => !isMe && setSelectedPlayerId(p.id)}
                  disabled={isMe}
                  className={`adm-vote-btn ${selectedPlayerId === p.id ? "adm-vote-btn--selected" : ""} ${isMe ? "adm-vote-btn--disabled" : ""}`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className="adm-confirm-container">
            <button
              onClick={handleVote}
              disabled={!selectedPlayerId}
              className={`adm-btn adm-btn--primary ${!selectedPlayerId ? "adm-btn--disabled" : ""}`}
            >
              Yo voto
            </button>
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <button
          onClick={onAbandon}
          className="adm-btn adm-btn--secondary"
          style={{ fontSize: "13px", opacity: 0.7 }}
        >
          Abandonar sala
        </button>
      </div>
    </div>
  );
}
