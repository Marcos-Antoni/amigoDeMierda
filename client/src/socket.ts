import { io, Socket } from "socket.io-client";

// Connect to the same origin so it works both in dev (via Vite proxy) and
// in production (Express serves both the app and the WebSocket).

function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem("adm_clientId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("adm_clientId", id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browser) — session-only UUID
    return crypto.randomUUID();
  }
}

export const clientId = getOrCreateClientId();

const socket: Socket = io({ auth: { clientId } });

export default socket;
