import { GameState } from "./types.js";
import { questions, shuffle } from "./questions.js";

/**
 * In-memory room store.
 * No persistence — rooms vanish when the server restarts.
 */
const rooms = new Map<string, GameState>();

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 100;

/** Generate a random 4-uppercase-letter code that is not already in use. */
export function generateRoomCode(): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Could not generate a unique room code — server may be full.");
}

/**
 * Create a new room with the given host.
 * @param hostId  Socket ID of the host
 * @param hostName Display name of the host
 */
export function createRoom(hostId: string, hostName: string): GameState {
  const code = generateRoomCode();
  const state: GameState = {
    code,
    hostId,
    players: [
      { id: hostId, name: hostName, score: 0 }
    ],
    phase: "lobby",
    currentQuestion: null,
    votes: {},
    questionIndex: -1,
    questionOrder: [],
  };
  rooms.set(code, state);
  return state;
}

/**
 * Add a player to an existing room.
 * @param code  Room code
 * @param playerId  Socket ID of the joining player
 * @param playerName Display name
 */
export function joinRoom(
  code: string,
  playerId: string,
  playerName: string
): { state: GameState } | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: "Room not found." };
  if (state.phase !== "lobby") return { error: "Game already in progress." };
  if (state.players.length >= MAX_PLAYERS) return { error: "Room is full." };
  if (state.players.some((p) => p.id === playerId)) return { state }; // already in

  state.players.push({ id: playerId, name: playerName, score: 0 });
  return { state };
}

/**
 * Remove a player from a room.
 * Returns migration + auto-close signals so socket.ts can emit the right events.
 * Returns null if the player was not found in any room.
 */
export function leaveRoom(
  playerId: string
): {
  code: string;
  state: GameState | null; // null = room deleted (was last player)
  hostChanged: boolean;     // true if host migrated
  newHostName: string | null;
} | null {
  for (const [code, state] of rooms) {
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx === -1) continue;

    state.players.splice(idx, 1);

    // Orphaned-vote cleanup: remove the departing player's own outgoing vote.
    // Votes that targeted them are kept — applyTally skips missing targets already.
    delete state.votes[playerId];

    // Empty room — delete and return early.
    if (state.players.length === 0) {
      rooms.delete(code);
      return { code, state: null, hostChanged: false, newHostName: null };
    }

    // Host migration.
    let hostChanged = false;
    let newHostName: string | null = null;
    if (state.hostId === playerId) {
      state.hostId = state.players[0].id;
      hostChanged = true;
      newHostName = state.players[0].name;
    }

    // All-voted re-check: prevents deadlock when the departing player was the last
    // missing voter (or the room now has exactly as many votes as remaining players).
    if (
      state.phase === "question" &&
      state.players.length > 0 &&
      Object.keys(state.votes).length === state.players.length
    ) {
      applyTally(state);
      state.phase = "results";
    }

    return { code, state, hostChanged, newHostName };
  }
  return null; // player was not in any room
}

/** Retrieve a room by code (read-only reference). */
export function getRoom(code: string): GameState | null {
  return rooms.get(code) ?? null;
}

// ---------------------------------------------------------------------------
// Private helper — votes-received scoring model.
// ---------------------------------------------------------------------------

/**
 * Iterate the current votes map and credit each target with +1 to their score.
 * Silently skips votes that target a player who has since left the room.
 */
function applyTally(state: GameState): void {
  // Count votes received per player in this round
  const voteCounts: Record<string, number> = {};
  for (const player of state.players) {
    voteCounts[player.id] = 0;
  }
  for (const targetId of Object.values(state.votes)) {
    if (targetId in voteCounts) {
      voteCounts[targetId]++;
    }
  }

  // Find max votes received
  const counts = Object.values(voteCounts);
  const maxVotes = counts.length > 0 ? Math.max(...counts) : 0;

  // Award +1 to anyone who has the maximum votes (if votes were actually cast)
  if (maxVotes > 0) {
    for (const player of state.players) {
      if (voteCounts[player.id] === maxVotes) {
        player.score += 1;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Domain functions — pure over the rooms Map; no socket awareness.
// ---------------------------------------------------------------------------

/**
 * Start the game. Host-only, 3-player minimum enforced here (domain owns the rule).
 */
export function startGame(
  code: string,
  requesterId: string
): { state: GameState } | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: "Room not found." };
  if (state.hostId !== requesterId) return { error: "Only the host can start the game." };
  if (state.phase !== "lobby") return { error: "Game already started." };
  if (state.players.length < MIN_PLAYERS)
    return { error: `Need at least ${MIN_PLAYERS} players to start.` };

  // Shuffle questions once; store the order server-side only.
  state.questionOrder = shuffle(questions);
  state.questionIndex = 0;
  state.currentQuestion = state.questionOrder[0];

  // Clear any stale votes and reset all scores for a fresh game.
  state.votes = {};
  for (const player of state.players) {
    player.score = 0;
  }

  state.phase = "question";
  return { state };
}

/**
 * Record a vote. Auto-tallies and transitions to "results" when every player has voted.
 */
export function recordVote(
  code: string,
  voterId: string,
  targetId: string
): { state: GameState } | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: "Room not found." };
  if (state.phase !== "question") return { error: "Not in voting phase." };
  const voter = state.players.find((p) => p.id === voterId);
  if (!voter) return { error: "You are not in this room." };
  if (!state.players.some((p) => p.id === targetId))
    return { error: "Invalid vote target." };
  if (targetId === voterId) return { error: "You cannot vote for yourself." };

  // Record or overwrite the vote.
  state.votes[voterId] = targetId;

  // All-voted check: close the round automatically when every player has voted.
  if (Object.keys(state.votes).length === state.players.length) {
    applyTally(state);
    state.phase = "results";
  }

  return { state };
}

/**
 * Host-only advance: results → leaderboard, leaderboard → (next question | gameover).
 */
export function advanceGame(
  code: string,
  requesterId: string
): { state: GameState } | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: "Room not found." };
  if (state.hostId !== requesterId) return { error: "Only the host can advance the game." };

  if (state.phase === "results") {
    state.phase = "leaderboard";
    return { state };
  }

  if (state.phase === "leaderboard") {
    const hasWinner = state.players.some((p) => p.score >= 5);
    const nextIndex = state.questionIndex + 1;
    if (hasWinner || nextIndex >= state.questionOrder.length) {
      state.phase = "gameover";
    } else {
      state.questionIndex = nextIndex;
      state.currentQuestion = state.questionOrder[nextIndex];
      state.votes = {};
      state.phase = "question";
    }
    return { state };
  }

  return { error: "Cannot advance from the current phase." };
}
