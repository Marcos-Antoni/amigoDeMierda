# Design: Core Game Loop

Technical design for implementing the round lifecycle (start → vote → tally → advance → gameover), host-migration notice, orphaned-vote cleanup, and client-side results tally. The five design forks are resolved upstream (see proposal §Approach); this document designs WITHIN those decisions and resolves the one detail the exploration left fuzzy: where the shuffled question order lives.

## 1. Architecture Approach

### 1.1 Layering and boundaries

The server keeps a strict two-layer split that already exists in the skeleton. This change preserves and reinforces it:

| Layer | File | Responsibility | Knows about sockets? |
|-------|------|----------------|----------------------|
| **State / domain** | `server/src/rooms.ts` | Pure functions over the in-memory `Map<string, GameState>`. All game rules: shuffle, start, vote, tally, advance, leave/migration, orphaned-vote cleanup, all-voted detection. | **No** |
| **Transport / wiring** | `server/src/socket.ts` | Validate payload shape, resolve `socket.id`, call a `rooms.ts` function, branch on its result, emit `room:state` / `host:changed` / `error`. | Yes |
| **Content** | `server/src/questions.ts` | Static question array + pure `shuffle` helper. | No |

**Design rule (testability):** every game rule is a pure function in `rooms.ts` that takes primitives (`code`, `playerId`, `targetId`) and returns a discriminated result object. `socket.ts` does no game logic beyond payload presence checks and emit routing. This keeps `rooms.ts` unit-testable without a Socket.IO harness, which matters because no test framework is wired yet — when one arrives, the domain layer is already pure.

**Result-object pattern (existing convention):** `joinRoom` already returns `{ state } | { error }`. We extend this pattern to all new domain functions so `socket.ts` branches uniformly with `"error" in result`.

### 1.2 Data flow (happy path)

```
host clicks Start
  → socket.emit("game:start", { code })
  → socket.ts: presence check → startGame(code, socket.id)
  → rooms.ts: validate host + min players → shuffle → mutate state → { state }
  → socket.ts: io.to(code).emit("room:state", state)
  → all clients route to Game (phase="question")

each player clicks a name
  → socket.emit("game:vote", { code, targetId })
  → socket.ts: presence check → recordVote(code, socket.id, targetId)
  → rooms.ts: validate phase + self-vote + membership → write votes[voter]=target
              → if all voted: tally (votes-received) → phase="results"
              → { state }
  → socket.ts: io.to(code).emit("room:state", state)

host clicks Next
  → socket.emit("game:next", { code })
  → socket.ts: presence check → advanceGame(code, socket.id)
  → rooms.ts: results→leaderboard | leaderboard→(next question | gameover)
              → { state }
  → socket.ts: io.to(code).emit("room:state", state)
```

Disconnect / leave flows through `handleLeave` → `leaveRoom` (now returns migration + auto-close signals) → `socket.ts` emits `host:changed` and/or `room:state`.

## 2. Type Changes

### 2.1 Server `GameState` (`server/src/types.ts`)

Add **two** fields, not one. The exploration's fork 1 picked `questionIndex` over a `questionQueue`, but `questionIndex` alone is meaningless without a stable shuffled order to index into. Resolving the fuzzy detail: **store the shuffled order per room, server-side only, and do NOT broadcast it.**

```ts
export interface GameState {
  code: string;
  hostId: string;
  players: Player[];
  phase: "lobby" | "question" | "results" | "leaderboard" | "gameover";
  currentQuestion: string | null;
  votes: Record<string, string>; // voterId -> targetId
  questionIndex: number;          // NEW — position into questionOrder; -1 in lobby
  questionOrder: string[];        // NEW — shuffled questions, set at game:start; [] in lobby
}
```

Rationale for keeping `questionOrder` on `GameState` (vs. a separate side-Map):

- It is room-scoped lifecycle data; co-locating it with the room avoids a second `Map` to keep in sync on room deletion.
- `currentQuestion` is derived from `questionOrder[questionIndex]` and remains the only question field the client reads. The client never needs `questionOrder`.
- `createRoom` initializes `questionIndex: -1` and `questionOrder: []` (lobby has no active question; `currentQuestion` stays `null`).

### 2.2 Client `RoomState` (`client/src/types.ts`) — DRIFT CALLOUT

`RoomState` is a **manual mirror** of `GameState` with no shared package. This is the standing drift risk (proposal Risk: Type drift, exploration Risk: MEDIUM).

**Decision: the mirror must NOT be a 1:1 copy this change.** The client needs `questionIndex` for NOTHING in scope (results tally uses `votes`; question display uses `currentQuestion`). It needs `questionOrder` for NOTHING. Therefore:

- **Do NOT add `questionOrder` to `RoomState`.** It is server-internal. Even though `room:state` is broadcast with the whole object, the client type intentionally omits it — TypeScript structural typing tolerates extra runtime fields. Adding it to the client type would leak the entire round's questions to clients, defeating any future per-round reveal and bloating payloads.
- **`questionIndex`: optional, additive.** Add as `questionIndex?: number` to `RoomState` only if a future screen needs "Question N of M". For THIS change it is not required by any client screen, so leave `RoomState` unchanged.

**Drift ledger for this change:**

| Field | Server `GameState` | Client `RoomState` | Intentional drift? |
|-------|--------------------|--------------------|--------------------|
| `questionIndex` | added (`number`) | not added | Yes — no client consumer in scope |
| `questionOrder` | added (`string[]`) | not added | Yes — server-internal, must not leak |

This drift is **deliberate and documented**, not accidental. The `room:state` payload will carry `questionIndex` and `questionOrder` at runtime; clients simply ignore them. If a future change surfaces "Question N of M", add `questionIndex?: number` to the client type then.

**Payload-leak note (accepted for MVP):** broadcasting `questionOrder` exposes upcoming questions to anyone inspecting the socket. This is acceptable for a LAN party MVP (fork 5 already accepts exposing the full votes map). If hiding future questions becomes a requirement, the server should strip `questionOrder` before emit (a `toClientState(state)` projection) — flagged as a risk, not implemented now.

## 3. Server Domain Functions (`server/src/rooms.ts`)

All new functions are pure over the module `Map` and return discriminated results. Signatures:

```ts
// Start the game. Host-only, min-players enforced here (domain owns the rule).
export function startGame(
  code: string,
  requesterId: string
): { state: GameState } | { error: string };

// Record a vote; auto-tally + phase→results when every current player has voted.
export function recordVote(
  code: string,
  voterId: string,
  targetId: string
): { state: GameState } | { error: string };

// Host-only advance: results→leaderboard, leaderboard→(question | gameover).
export function advanceGame(
  code: string,
  requesterId: string
): { state: GameState } | { error: string };
```

`leaveRoom` is **extended** (signature changes) to report migration and auto-close so `socket.ts` can emit the right events:

```ts
export function leaveRoom(playerId: string):
  | {
      code: string;
      state: GameState | null;     // null = room deleted (was last player)
      hostChanged: boolean;        // true if host migrated
      newHostName: string | null;  // name of new host when hostChanged
    }
  | null;                          // player was in no room
```

### 3.1 `startGame` responsibilities

1. `const state = rooms.get(code)` → `{ error: "Room not found." }` if absent.
2. `state.hostId !== requesterId` → `{ error: "Only the host can start the game." }`.
3. `state.phase !== "lobby"` → `{ error: "Game already started." }` (idempotency guard; new).
4. `state.players.length < MIN_PLAYERS` → `{ error: "Need at least 3 players to start." }`.
   - **Resolve proposal/stub conflict:** proposal §Scope says 3-player minimum; the current stub enforces `< 2`. Design picks **`MIN_PLAYERS = 3`** per the proposal. Implementer must change the constant in BOTH the (removed) stub guard and the new domain guard — the guard now lives only in `startGame`.
5. `state.questionOrder = shuffle(questions)`; `state.questionIndex = 0`.
6. `state.currentQuestion = state.questionOrder[0]`.
7. `state.votes = {}`; reset `players[*].score = 0` (fresh game).
8. `state.phase = "question"`.
9. Return `{ state }`.

### 3.2 `recordVote` responsibilities

1. Room exists → else `{ error: "Room not found." }`.
2. `state.phase !== "question"` → `{ error: "Not in voting phase." }`.
3. Voter is a current player (`state.players.some(p => p.id === voterId)`) → else `{ error: "You are not in this room." }`.
4. Target is a current player → else `{ error: "Invalid vote target." }`.
5. **Self-vote guard (server-side):** `targetId === voterId` → `{ error: "You cannot vote for yourself." }`. (Game.tsx disables the button; this is the authoritative guard.)
6. Record / overwrite: `state.votes[voterId] = targetId`. (Re-voting before round close overwrites; acceptable.)
7. **All-voted check:** `Object.keys(state.votes).length === state.players.length`.
   - When true: `applyTally(state)` then `state.phase = "results"`.
8. Return `{ state }`.

`applyTally` (private helper, votes-received model):

```ts
function applyTally(state: GameState): void {
  for (const targetId of Object.values(state.votes)) {
    const target = state.players.find((p) => p.id === targetId);
    if (target) target.score += 1; // each vote = +1 to the target
  }
}
```

Scores accumulate across rounds onto `Player.score`, which `Leaderboard`/`GameOver` already render sorted. No `roundResults` field (fork 5: client computes per-round tally from `votes`).

### 3.3 `advanceGame` responsibilities

1. Room exists → else `{ error: "Room not found." }`.
2. `state.hostId !== requesterId` → `{ error: "Only the host can advance the game." }`.
3. Branch on phase:
   - `phase === "results"` → `state.phase = "leaderboard"`. Return `{ state }`.
   - `phase === "leaderboard"`:
     - `const nextIndex = state.questionIndex + 1`.
     - If `nextIndex >= state.questionOrder.length` → `state.phase = "gameover"`. Return `{ state }`.
     - Else: `state.questionIndex = nextIndex`; `state.currentQuestion = state.questionOrder[nextIndex]`; `state.votes = {}`; `state.phase = "question"`. Return `{ state }`.
   - any other phase → `{ error: "Cannot advance from the current phase." }`.

Index-bounds (question exhaustion) is handled entirely here via `questionOrder.length`.

### 3.4 `leaveRoom` extension — orphaned vote fix + all-voted re-check

This is the high-risk fix. The orphaned-vote bug: a player disconnects mid-`question`, their `votes[departingId]` entry survives but their `players[]` record is gone, so `Object.keys(votes).length === players.length` can never line up correctly (count includes a ghost voter, or a remaining voter is now the last expected and never re-checked).

New `leaveRoom` flow (replaces lines 68-88):

1. Find the room containing `playerId`; if none, return `null`.
2. Remove the player from `players` (existing splice).
3. **Orphaned-vote cleanup (NEW):** `delete state.votes[playerId]` (the departing voter's own vote). Also remove any vote that *targeted* the departing player only if you want to avoid scoring a ghost — **decision: keep votes that targeted the leaver** (they were cast in good faith; `applyTally` already skips a missing target via `if (target)`), but **delete the leaver's own outgoing vote** so the all-voted count is correct.
4. Empty room → `rooms.delete(code)`; return `{ code, state: null, hostChanged: false, newHostName: null }`.
5. **Host migration (NEW return data):** if `state.hostId === playerId`, set `state.hostId = state.players[0].id`, `hostChanged = true`, `newHostName = state.players[0].name`. Else `hostChanged = false`, `newHostName = null`.
6. **All-voted re-check (NEW):** if `state.phase === "question"` AND `state.players.length > 0` AND `Object.keys(state.votes).length === state.players.length`:
   - `applyTally(state)`; `state.phase = "results"`.
   - This auto-closes the round when the departing player was the last missing voter, preventing the deadlock.
7. Return `{ code, state, hostChanged, newHostName }`.

Edge case: leaver drops `players.length` below `MIN_PLAYERS` mid-game. **Decision: do NOT abort the game** (out of scope; proposal does not require it). The round still resolves; remaining players continue. A future change can add an abort-to-lobby rule.

### 3.5 Constants

`const MIN_PLAYERS = 3;` and `const MAX_PLAYERS = 10;` declared at the top of `rooms.ts`. `joinRoom`'s `>= 10` literal is replaced by `>= MAX_PLAYERS` for consistency (mechanical, low-risk).

## 4. Question Shuffle (`server/src/questions.ts`)

Add a pure Fisher-Yates helper. It returns a NEW array (does not mutate the shared `questions` export):

```ts
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

**Where the shuffled order is stored (the resolved open detail):** `startGame` calls `shuffle(questions)` once and assigns the result to `state.questionOrder`. From then on, `questionIndex` indexes into `state.questionOrder`, NOT the static `questions` export. This gives per-game randomization with stable advance semantics, satisfying fork 1's `questionIndex` choice while fixing the gap that `questionIndex` alone had no array to index. The static `questions` array is the source pool only.

## 5. Socket Event Contracts (`server/src/socket.ts`)

`socket.ts` handlers shrink to: presence check → call domain → branch → emit. The min-player and host guards MOVE into the domain layer (single source of truth); the handlers only check payload presence.

### 5.1 `game:start`

- **Client → server payload:** `{ code: string }`
- **Handler:**
  ```ts
  socket.on("game:start", ({ code } = {}) => {
    if (!code) return socket.emit("error", { message: "Code is required." });
    const result = startGame(code, socket.id);
    if ("error" in result) return socket.emit("error", { message: result.error });
    io.to(code).emit("room:state", result.state);
  });
  ```
- **Success:** `room:state` broadcast to room (`phase="question"`).
- **Errors (to caller only):** missing code; room not found; non-host; already started; `< 3` players.

### 5.2 `game:vote`

- **Client → server payload:** `{ code: string, targetId: string }`
- **Handler:**
  ```ts
  socket.on("game:vote", ({ code, targetId } = {}) => {
    if (!code || !targetId)
      return socket.emit("error", { message: "Code and targetId are required." });
    const result = recordVote(code, socket.id, targetId);
    if ("error" in result) return socket.emit("error", { message: result.error });
    io.to(code).emit("room:state", result.state);
  });
  ```
- **Success:** `room:state` broadcast. If that vote completed the round, the broadcast already carries `phase="results"` with updated scores — clients route to `Results` automatically.
- **Errors (to caller only):** missing fields; room not found; wrong phase; not a member; invalid target; self-vote.

### 5.3 `game:next`

- **Client → server payload:** `{ code: string }`
- **Handler:**
  ```ts
  socket.on("game:next", ({ code } = {}) => {
    if (!code) return socket.emit("error", { message: "Code is required." });
    const result = advanceGame(code, socket.id);
    if ("error" in result) return socket.emit("error", { message: result.error });
    io.to(code).emit("room:state", result.state);
  });
  ```
- **Success:** `room:state` broadcast (`leaderboard`, next `question`, or `gameover`).
- **Errors (to caller only):** missing code; room not found; non-host; bad phase.

### 5.4 `host:changed` (server → clients, new event)

- **Emitted from:** `handleLeave`, only when `leaveRoom` returns `hostChanged: true`.
- **Server → room payload:** `{ newHostName: string }`
- **Ordering:** emit `host:changed` BEFORE `room:state`, so a client that wants to show a toast has the name in hand before the state-driven re-render. Both target the whole room via `io.to(code)`.

Updated `handleLeave`:

```ts
function handleLeave(socket: Socket, io: Server): void {
  const result = leaveRoom(socket.id);
  if (!result) return;

  const { code, state, hostChanged, newHostName } = result;
  if (state === null) {
    console.log(`[room] deleted (empty): ${code}`);
    return;
  }
  if (hostChanged && newHostName) {
    io.to(code).emit("host:changed", { newHostName });
  }
  io.to(code).emit("room:state", state);
}
```

### 5.5 Ack/error convention

No Socket.IO acknowledgement callbacks are introduced — the codebase uses fire-and-forget emits with an `error` event channel and `room:state` as the success channel. This change keeps that convention:

- **Success channel:** `room:state` (broadcast) — the client's existing `App.tsx` listener already drives all screen routing.
- **Error channel:** `error` event with `{ message: string }`, emitted to the OFFENDING socket only (`socket.emit`, never `io.to`). The client `App.tsx` already renders `error` and clears it on the next `room:state`.

### 5.6 Error-handling pattern for invalid actions

| Invalid action | Where caught | Response |
|----------------|--------------|----------|
| Non-host `game:start` / `game:next` | `rooms.ts` (`startGame` / `advanceGame`) | `error` → caller |
| `< 3` players on start | `rooms.ts` (`startGame`) | `error` → caller |
| Start when not in lobby | `rooms.ts` (`startGame`) | `error` → caller |
| Self-vote (`targetId === voterId`) | `rooms.ts` (`recordVote`) | `error` → caller |
| Vote in non-`question` phase | `rooms.ts` (`recordVote`) | `error` → caller |
| Vote for non-member / invalid target | `rooms.ts` (`recordVote`) | `error` → caller |
| Vote from non-member socket | `rooms.ts` (`recordVote`) | `error` → caller |
| Advance from `question`/`lobby`/`gameover` | `rooms.ts` (`advanceGame`) | `error` → caller |
| Missing payload field | `socket.ts` (presence check) | `error` → caller |

**Single principle:** payload presence is checked in `socket.ts`; every game RULE is checked in `rooms.ts`. No rule is duplicated across layers. All rule violations surface as `{ message }` on the `error` event to the offending socket only.

## 6. Client Changes

### 6.1 `Results.tsx` — client-computed tally (fork 5)

Compute the per-round tally from `roomState.votes` (no server field). The votes map is `voterId → targetId`; the tally counts how many votes each `targetId` received this round.

```tsx
// inside Results component body
const tally = roomState.players
  .map((p) => ({
    name: p.name,
    count: Object.values(roomState.votes).filter((t) => t === p.id).length,
  }))
  .filter((row) => row.count > 0)
  .sort((a, b) => b.count - a.count);
```

Render replaces the `[Vote tally placeholder — TODO]` line with a sorted list (`name — N votes`). Players with zero votes are filtered out (cleaner party UX); keep them if a future spec wants the full board. This reads ONLY existing `RoomState` fields, so no client type change is needed.

### 6.2 `App.tsx` — `host:changed` listener placement

Add the listener inside the **existing** `useEffect` (the one registering `room:state` and `error`), and register the cleanup in the existing return. This keeps a single subscription lifecycle and avoids a second effect.

```tsx
// inside the existing useEffect, alongside room:state / error
socket.on("host:changed", ({ newHostName }: { newHostName: string }) => {
  setNotice(`${newHostName} is now the host.`);
});
// in the existing cleanup return:
socket.off("host:changed");
```

- Add minimal state: `const [notice, setNotice] = useState<string | null>(null);`
- Render the notice near the existing `error` line (e.g. a transient `<p>`); a full toast component is out of scope (proposal calls the toast "optional").
- **Clear timing:** clear `notice` on the next `room:state` (same place `error` is cleared) so it does not linger across phases. Optional: auto-clear via `setTimeout`; not required.

`Game.tsx` needs no change — its UI-level self-vote disable stays; the authoritative guard now lives in `recordVote`. The `// TODO: decide rule` comment can be updated to note the server now enforces it.

## 7. ADR-Style Decisions

### ADR-1: Store shuffled order as server-internal `questionOrder: string[]`
- **Decision:** add `questionOrder` to `GameState`, populated by `shuffle(questions)` at `game:start`; `questionIndex` indexes into it; do not mirror it in `RoomState`.
- **Rationale:** fork 1 chose `questionIndex` but left "where the shuffled order lives" fuzzy. An index needs a stable array. Co-locating on `GameState` avoids a parallel side-`Map` that would need separate deletion bookkeeping.
- **Rejected:** (a) `questionQueue` that shrinks as you `shift()` — loses index-of-M for a future progress UI and mutates length, complicating bounds reasoning. (b) Separate `Map<code, string[]>` — second structure to keep in sync on room delete. (c) Re-shuffle each round — breaks reproducible ordering and risks repeats.

### ADR-2: Keep `RoomState` intentionally NOT 1:1 with `GameState`
- **Decision:** do not add `questionOrder` (or `questionIndex`) to the client type this change; document the drift in a ledger.
- **Rationale:** no client screen in scope consumes them; mirroring `questionOrder` would leak all future questions to clients and bloat the payload type. Deliberate, documented drift beats reflexive mirroring.
- **Rejected:** full 1:1 mirror — leaks content and adds an unused field; the project has no shared-types package to make mirroring free.

### ADR-3: All game rules live in `rooms.ts`, transport-only in `socket.ts`
- **Decision:** move host/min-player/self-vote/phase guards into pure `rooms.ts` functions returning `{ state } | { error }`; `socket.ts` only checks payload presence and routes emits.
- **Rationale:** keeps domain logic unit-testable with zero socket harness (no test framework yet — pay it forward). Single source of truth per rule; matches the existing `joinRoom` result-object convention.
- **Rejected:** keep guards inline in `socket.ts` (current stub style) — couples rules to transport, untestable, and duplicates checks across handlers.

### ADR-4: Votes-received scoring accumulated on `Player.score`
- **Decision:** `applyTally` adds +1 to each voted target's `Player.score`; no `roundResults` field; per-round tally computed client-side from `votes`.
- **Rationale:** fork 3 (votes-received) + fork 5 (client tally). `Leaderboard`/`GameOver` already sort `Player.score`. No new state.
- **Rejected:** winner-takes-all (needs tie-break) and server `roundResults` (extra field both sides; only needed for vote anonymity, which is out of scope).

### ADR-5: Orphaned-vote cleanup + all-voted re-check in `leaveRoom`
- **Decision:** in `leaveRoom`, delete the departing player's outgoing vote, keep votes that targeted them (tally skips missing targets), and re-run the all-voted check when `phase==="question"`, auto-closing the round if they were the last missing voter.
- **Rationale:** fixes the HIGH-risk deadlock where `Object.keys(votes).length` never matches `players.length` after a mid-round disconnect.
- **Rejected:** clean votes in `socket.ts` — would put domain logic in transport and miss the re-check race. Aborting the game when players drop below 3 — out of scope; round still resolves safely.

### ADR-6: `host:changed` emitted before `room:state`, name-only payload
- **Decision:** emit `host:changed { newHostName }` to the room before the `room:state` broadcast, only on actual migration.
- **Rationale:** fork 4. Name-before-state lets the client show a notice without diffing host IDs. Minimal payload.
- **Rejected:** silent migration (confusing in a party game); sending full new-host object (client only needs the name).

## 8. Risks and Assumptions Carried Forward

- **`questionOrder` leaks to clients at runtime** — the broadcast `room:state` carries it even though the client type omits it. Accepted for MVP (same posture as exposing the votes map). Mitigation if needed later: a `toClientState()` projection that strips it before emit.
- **Min-players conflict resolved to 3** — implementer must ensure the old `< 2` stub guard is removed, not left alongside the new `< MIN_PLAYERS` guard, or starts will behave inconsistently.
- **Dropping below 3 players mid-game does not abort** — deliberate scope cut; verify this is acceptable for the demo.
- **Re-voting overwrites silently** — a player can change their vote until the round closes; acceptable, but note it so verify does not flag it as a bug.
- **Manual type drift remains a standing risk** — no shared-types package; every future server field needs a conscious mirror decision. Out of scope to fix structurally here.
- **No tests** — the pure-`rooms.ts` design is the hedge; when a runner lands, `startGame`/`recordVote`/`advanceGame`/`leaveRoom` are testable without sockets.
