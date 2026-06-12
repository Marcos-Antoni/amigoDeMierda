import { Server, Socket } from "socket.io";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  recordVote,
  advanceGame,
} from "./rooms.js";

/**
 * Attach all Socket.IO event handlers to the server instance.
 */
export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ------------------------------------------------------------------ //
    // room:create
    // Client sends: { name: string }
    // Server emits back to socket: room:state with the full GameState
    // ------------------------------------------------------------------ //
    socket.on("room:create", ({ name }: { name?: string } = {}) => {
      if (!name) return socket.emit("error", { message: "Name is required." });

      const state = createRoom(socket.id, name);
      socket.join(state.code);
      socket.emit("room:state", state);
      console.log(`[room] created: ${state.code} by ${name} (${socket.id})`);
    });

    // ------------------------------------------------------------------ //
    // room:join
    // Client sends: { code: string, name: string }
    // Server emits room:state to the entire room on success,
    //   or error to the socket on failure.
    // ------------------------------------------------------------------ //
    socket.on("room:join", ({ code, name }: { code?: string; name?: string } = {}) => {
      if (!code || !name)
        return socket.emit("error", { message: "Code and name are required." });

      const result = joinRoom(code.toUpperCase(), socket.id, name);
      if ("error" in result) return socket.emit("error", { message: result.error });

      socket.join(code.toUpperCase());
      io.to(code.toUpperCase()).emit("room:state", result.state);
      console.log(`[room] ${name} (${socket.id}) joined: ${code}`);
    });

    // ------------------------------------------------------------------ //
    // room:leave
    // Client sends: {} (implicit — the socket's ID identifies the player)
    // ------------------------------------------------------------------ //
    socket.on("room:leave", () => {
      handleLeave(socket, io);
    });

    // ------------------------------------------------------------------ //
    // game:start
    // Only the host may start the game. All guards live in startGame().
    // ------------------------------------------------------------------ //
    socket.on("game:start", ({ code }: { code?: string } = {}) => {
      if (!code) return socket.emit("error", { message: "Code is required." });
      const result = startGame(code, socket.id);
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
      const result = recordVote(code, socket.id, targetId);
      if ("error" in result) return socket.emit("error", { message: result.error });
      io.to(code).emit("room:state", result.state);
    });

    // ------------------------------------------------------------------ //
    // game:next
    // Host advances: results → leaderboard → next question or gameover.
    // ------------------------------------------------------------------ //
    socket.on("game:next", ({ code }: { code?: string } = {}) => {
      if (!code) return socket.emit("error", { message: "Code is required." });
      const result = advanceGame(code, socket.id);
      if ("error" in result) return socket.emit("error", { message: result.error });
      io.to(code).emit("room:state", result.state);
      console.log(`[game] advanced room: ${code} to phase: ${result.state.phase}`);
    });

    // ------------------------------------------------------------------ //
    // disconnect
    // ------------------------------------------------------------------ //
    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      handleLeave(socket, io);
    });
  });
}

/**
 * Shared leave/disconnect logic.
 * Emits host:changed (if host migrated) BEFORE room:state so clients have the
 * new host name in hand before the state-driven re-render.
 */
function handleLeave(socket: Socket, io: Server): void {
  const result = leaveRoom(socket.id);
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
  console.log(`[room] player ${socket.id} left room ${code}; new state broadcast.`);
}
