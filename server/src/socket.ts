import { Server, Socket } from "socket.io";
import { RateLimiterMemory } from "rate-limiter-flexible";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  recordVote,
  advanceGame,
  reconnectPlayer,
} from "./rooms.js";

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

const NAME_MAX = 30;
const CODE_RE = /^[A-Z]{4}$/;

function validateName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) return null;
  return trimmed;
}

function validateCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const upper = code.trim().toUpperCase();
  return CODE_RE.test(upper) ? upper : null;
}

// ---------------------------------------------------------------------------
// Rate limiters — keyed by socket.handshake.address (client IP)
// ---------------------------------------------------------------------------

const createLimiter = new RateLimiterMemory({ points: 5, duration: 60 });
const joinLimiter = new RateLimiterMemory({ points: 20, duration: 60 });

// ---------------------------------------------------------------------------
// Socket↔clientId bidirectional Maps and disconnect timeout tracking
// ---------------------------------------------------------------------------

const socketIdToClientId = new Map<string, string>();
const clientIdToSocketId = new Map<string, string>();
const disconnectTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const DISCONNECT_TIMEOUT_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------------
// Shared leave logic
// ---------------------------------------------------------------------------

/**
 * Shared leave/disconnect logic.
 * Emits host:changed (if host migrated) BEFORE room:state so clients have the
 * new host name in hand before the state-driven re-render.
 */
function handleLeave(clientId: string, io: Server): void {
  const result = leaveRoom(clientId);
  if (!result) return; // player wasn't in a room

  const { code, state, hostChanged, newHostName } = result;

  if (state === null) {
    // Room was deleted (last player left) — nothing to broadcast.
    console.log(`[room] deleted (empty): ${code}`);
    return;
  }

  if (hostChanged && newHostName) {
    io.to(code).emit("host:changed", { newHostName });
  }

  io.to(code).emit("room:state", state);
  console.log(`[room] player ${clientId} left room ${code}; new state broadcast.`);
}

/**
 * Attach all Socket.IO event handlers to the server instance.
 */
export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    // ------------------------------------------------------------------ //
    // Read clientId from auth — reject connection if missing
    // ------------------------------------------------------------------ //
    const clientId: string | undefined = socket.handshake.auth?.clientId;
    if (!clientId) {
      socket.emit("error", { message: "clientId is required." });
      socket.disconnect(true);
      return;
    }

    // Cancel any pending disconnect timeout for this clientId
    const pendingTimeout = disconnectTimeouts.get(clientId);
    if (pendingTimeout !== undefined) {
      clearTimeout(pendingTimeout);
      disconnectTimeouts.delete(clientId);
    }

    // Evict stale socketId entry if this clientId was previously mapped
    const previousSocketId = clientIdToSocketId.get(clientId);
    if (previousSocketId !== undefined) {
      socketIdToClientId.delete(previousSocketId);
    }

    // Bind both Maps to the new socket
    socketIdToClientId.set(socket.id, clientId);
    clientIdToSocketId.set(clientId, socket.id);

    // Attempt reconnect — if this clientId is already in a room, restore session
    const reconnectResult = reconnectPlayer(clientId);
    if ("code" in reconnectResult) {
      socket.join(reconnectResult.code);
      socket.emit("room:state", reconnectResult.state);
      console.log(`[socket] reconnected: ${socket.id} (clientId: ${clientId}) → room ${reconnectResult.code}`);
    } else {
      console.log(`[socket] connected: ${socket.id} (clientId: ${clientId})`);
    }

    // ------------------------------------------------------------------ //
    // room:create
    // Client sends: { name: string }
    // Server emits back to socket: room:state with the full GameState
    // ------------------------------------------------------------------ //
    socket.on("room:create", async ({ name }: { name?: string } = {}) => {
      try {
        await createLimiter.consume(socket.handshake.address);
      } catch {
        return socket.emit("error", { message: "Too many requests. Please wait." });
      }

      const cleanName = validateName(name);
      if (!cleanName) return socket.emit("error", { message: "Invalid name." });

      const state = createRoom(clientId, cleanName);
      socket.join(state.code);
      socket.emit("room:state", state);
      console.log(`[room] created: ${state.code} by ${cleanName} (${clientId})`);
    });

    // ------------------------------------------------------------------ //
    // room:join
    // Client sends: { code: string, name: string }
    // Server emits room:state to the entire room on success,
    //   or error to the socket on failure.
    // ------------------------------------------------------------------ //
    socket.on("room:join", async ({ code, name }: { code?: string; name?: string } = {}) => {
      try {
        await joinLimiter.consume(socket.handshake.address);
      } catch {
        return socket.emit("error", { message: "Too many requests. Please wait." });
      }

      const cleanCode = validateCode(code);
      const cleanName = validateName(name);
      if (!cleanCode || !cleanName)
        return socket.emit("error", { message: "Invalid code or name." });

      const result = joinRoom(cleanCode, clientId, cleanName);
      if ("error" in result) return socket.emit("error", { message: result.error });

      socket.join(cleanCode);
      io.to(cleanCode).emit("room:state", result.state);
      console.log(`[room] ${cleanName} (${clientId}) joined: ${cleanCode}`);
    });

    // ------------------------------------------------------------------ //
    // room:abandon
    // Client emits when they intentionally leave. Cancels pending timeout,
    // cleans Maps, and immediately removes them from the room.
    // ------------------------------------------------------------------ //
    socket.on("room:abandon", ({ code: _code }: { code?: string } = {}) => {
      const t = disconnectTimeouts.get(clientId);
      if (t !== undefined) {
        clearTimeout(t);
        disconnectTimeouts.delete(clientId);
      }
      socketIdToClientId.delete(socket.id);
      clientIdToSocketId.delete(clientId);
      handleLeave(clientId, io);
    });

    // ------------------------------------------------------------------ //
    // game:start
    // Only the host may start the game. All guards live in startGame().
    // ------------------------------------------------------------------ //
    socket.on("game:start", ({ code }: { code?: string } = {}) => {
      if (!code) return socket.emit("error", { message: "Code is required." });
      const result = startGame(code, clientId);
      if ("error" in result) return socket.emit("error", { message: result.error });
      io.to(code).emit("room:state", result.state);
      console.log(`[game] started room: ${code}`);
    });

    // ------------------------------------------------------------------ //
    // game:vote
    // Client sends: { code: string, targetId: string }
    // ------------------------------------------------------------------ //
    socket.on("game:vote", ({ code, targetId }: { code?: string; targetId?: string } = {}) => {
      if (!code || !targetId)
        return socket.emit("error", { message: "Code and targetId are required." });
      const result = recordVote(code, clientId, targetId);
      if ("error" in result) return socket.emit("error", { message: result.error });
      io.to(code).emit("room:state", result.state);
    });

    // ------------------------------------------------------------------ //
    // game:next
    // Host advances: results → leaderboard → next question or gameover.
    // ------------------------------------------------------------------ //
    socket.on("game:next", ({ code }: { code?: string } = {}) => {
      if (!code) return socket.emit("error", { message: "Code is required." });
      const result = advanceGame(code, clientId);
      if ("error" in result) return socket.emit("error", { message: result.error });
      io.to(code).emit("room:state", result.state);
      console.log(`[game] advanced room: ${code} to phase: ${result.state.phase}`);
    });

    // ------------------------------------------------------------------ //
    // disconnect
    // Does NOT immediately remove player — starts a 2-minute grace period.
    // ------------------------------------------------------------------ //
    socket.on("disconnect", () => {
      const cId = socketIdToClientId.get(socket.id);
      socketIdToClientId.delete(socket.id);
      if (cId) {
        clientIdToSocketId.delete(cId);
        const t = setTimeout(() => {
          disconnectTimeouts.delete(cId);
          handleLeave(cId, io);
        }, DISCONNECT_TIMEOUT_MS);
        disconnectTimeouts.set(cId, t);
        console.log(`[socket] disconnected: ${socket.id} (clientId: ${cId}) — 2min grace period started`);
      }
    });
  });
}
