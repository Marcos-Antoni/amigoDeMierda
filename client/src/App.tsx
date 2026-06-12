import { useEffect, useState } from "react";
import socket, { clientId } from "./socket";
import { RoomState } from "./types";

import Index from "./screens/Index";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import Results from "./screens/Results";
import Leaderboard from "./screens/Leaderboard";
import GameOver from "./screens/GameOver";

export default function App() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    socket.on("room:state", (state: RoomState) => {
      setRoomState(state);
      setError(null);
      setNotice(null); // clear transient notice on every state update
    });

    socket.on("error", ({ message }: { message: string }) => {
      setError(message);
      // Auto-clear error after 4 seconds to not block view
      setTimeout(() => setError(null), 4000);
    });

    socket.on("host:changed", ({ newHostName }: { newHostName: string }) => {
      setNotice(`${newHostName} es el nuevo host.`);
      setTimeout(() => setNotice(null), 5000);
    });

    return () => {
      socket.off("room:state");
      socket.off("error");
      socket.off("host:changed");
    };
  }, []);

  const isHost = roomState?.hostId === clientId;

  function handleAbandon() {
    if (!roomState) return;
    socket.emit("room:abandon", { code: roomState.code });
    localStorage.removeItem("adm_clientId");
    setRoomState(null);
  }

  function renderScreen() {
    if (!roomState) return <Index />;

    switch (roomState.phase) {
      case "lobby":
        return <Lobby roomState={roomState} isHost={isHost} onAbandon={handleAbandon} />;
      case "question":
        return <Game roomState={roomState} myId={clientId} onAbandon={handleAbandon} />;
      case "results":
        return <Results roomState={roomState} isHost={isHost} onAbandon={handleAbandon} />;
      case "leaderboard":
        return <Leaderboard roomState={roomState} isHost={isHost} onAbandon={handleAbandon} />;
      case "gameover":
        return <GameOver roomState={roomState} />;
      default:
        return <p>Fase desconocida: {roomState.phase}</p>;
    }
  }

  return (
    <div className="adm-shell">
      <div className="adm-noise-overlay" />
      {notice && <div className="adm-banner">{notice}</div>}
      {error && <div className="adm-error-box">{error}</div>}
      {renderScreen()}
    </div>
  );
}
