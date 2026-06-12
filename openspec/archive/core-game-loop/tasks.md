# Tasks: Core Game Loop

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single milestone (no git repo — local milestone boundary) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Milestone | Notes |
|------|------|-----------|-------|
| 1 | Types + shuffle helper | M1 | Foundation; everything else depends on this |
| 2 | Domain functions in rooms.ts | M2 | Pure logic; depends on M1 |
| 3 | Socket wiring + leaveRoom | M3 | Transport; depends on M2 |
| 4 | Client: Results tally + host:changed | M4 | Depends on M3 being live |
| 5 | Build verification + playthrough | M5 | Final gate |

---

## Phase 1: Types and Shuffle Foundation

- [x] 1.1 **`server/src/types.ts`** — add `questionIndex: number` and `questionOrder: string[]` to `GameState`; update `createRoom` default in the same commit to initialize them (`questionIndex: -1`, `questionOrder: []`). Done when: TypeScript compiler accepts `rooms.ts` without errors after the next task.

- [x] 1.2 **`server/src/rooms.ts` — `createRoom`** — add the two new fields to the literal in `createRoom`: `questionIndex: -1`, `questionOrder: []`. Done when: `createRoom` compiles and returns a valid `GameState` with the new shape. REQ-23.

- [x] 1.3 **`server/src/questions.ts`** — add pure `shuffle<T>(input: readonly T[]): T[]` (Fisher-Yates, returns new array, does not mutate). Done when: function is exported and callable from `rooms.ts`. REQ-04 (shuffle on start).

- [x] 1.4 **`server/src/rooms.ts` — constants** — add `const MIN_PLAYERS = 3` and `const MAX_PLAYERS = 10` at top of file; replace the `>= 10` literal in `joinRoom` with `>= MAX_PLAYERS`. Done when: `joinRoom` uses `MAX_PLAYERS` and file compiles. REQ-01, REQ-03.

---

## Phase 2: Domain Functions (`rooms.ts`)

- [x] 2.1 **`rooms.ts` — `startGame`** — implement `export function startGame(code, requesterId): {state} | {error}` with guards in order: room-not-found → non-host → phase-not-lobby → `players.length < MIN_PLAYERS` → shuffle+assign `questionOrder`/`questionIndex`/`currentQuestion` → clear `votes` → reset `players[*].score` to 0 → `phase="question"` → return `{state}`. Remove the old inline `< 2` guard and the `"not yet implemented"` stub from `socket.ts` (do this together). Done when: all S-01 through S-04 paths are satisfied by the function logic. REQ-02, REQ-03, REQ-04, REQ-05.

- [x] 2.2 **`rooms.ts` — `applyTally` (private helper)** — add `function applyTally(state: GameState): void` that iterates `Object.values(state.votes)` and does `target.score += 1` (skips missing targets). Done when: can be called by `recordVote` and `leaveRoom` without errors. REQ-11.

- [x] 2.3 **`rooms.ts` — `recordVote`** — implement `export function recordVote(code, voterId, targetId): {state} | {error}` with guards: room-not-found → phase-not-question → voter-not-member → target-not-member → self-vote → write `votes[voterId]=targetId` → all-voted check (call `applyTally` + `phase="results"` when true) → return `{state}`. Done when: S-05 through S-09, S-21 paths satisfied. REQ-06–REQ-11.

- [x] 2.4 **`rooms.ts` — `advanceGame`** — implement `export function advanceGame(code, requesterId): {state} | {error}` with guards: room-not-found → non-host → phase-branch (`results`→`leaderboard`; `leaderboard`→next-question-or-gameover using `questionOrder.length`; any-other→error) → return `{state}`. Done when: S-10 through S-14 paths satisfied. REQ-12–REQ-15.

- [x] 2.5 **`rooms.ts` — `leaveRoom` rewrite** — change return signature to `{ code, state, hostChanged, newHostName } | null`; add in order after `players.splice`: (a) `delete state.votes[playerId]` (orphaned-vote cleanup), (b) empty-room early return with new shape, (c) host migration setting `hostChanged`/`newHostName`, (d) all-voted re-check when `phase==="question"` (call `applyTally` + `phase="results"` if triggered). Done when: S-15–S-18, S-17 scenarios pass on paper trace. REQ-16, REQ-17, REQ-18, REQ-19, REQ-20.

---

## Phase 3: Socket Transport Wiring (`socket.ts`)

- [x] 3.1 **`socket.ts` — `game:start` handler** — replace stub body with: presence check on `code` → call `startGame(code, socket.id)` → branch on `"error" in result` → `io.to(code).emit("room:state", result.state)`. Remove `getRoom` usage and inline guards removed in 2.1. Done when: handler calls only `startGame`, payload-presence check, and emit. REQ-02, REQ-03, REQ-04, REQ-05.

- [x] 3.2 **`socket.ts` — `game:vote` handler** — replace stub body with: presence check on `code` + `targetId` → call `recordVote(code, socket.id, targetId)` → branch → broadcast. Remove inline `getRoom` and `phase !== "question"` check (now in domain). Done when: handler is reduced to presence + call + emit. REQ-06–REQ-11.

- [x] 3.3 **`socket.ts` — `game:next` handler** — replace stub body with: presence check on `code` → call `advanceGame(code, socket.id)` → branch → broadcast. Remove inline `getRoom` and inline host check. Done when: handler is reduced to presence + call + emit. REQ-12–REQ-15.

- [x] 3.4 **`socket.ts` — `handleLeave` + new imports** — update `handleLeave` to destructure `{ code, state, hostChanged, newHostName }` from `leaveRoom`; add: `if (hostChanged && newHostName) io.to(code).emit("host:changed", { newHostName })` BEFORE the `room:state` emit. Update import line to include `startGame`, `recordVote`, `advanceGame`. Done when: `handleLeave` emits `host:changed` before `room:state` and compiles. REQ-18, REQ-22.

---

## Phase 4: Client Changes

- [x] 4.1 **`client/src/App.tsx` — `host:changed` listener** — inside the existing `useEffect`, add `socket.on("host:changed", ({ newHostName }) => setNotice(...))` and cleanup `socket.off("host:changed")`; add `const [notice, setNotice] = useState<string | null>(null)`; clear `notice` inside the `room:state` handler (same place `error` is cleared); render `{notice && <p>{notice}</p>}` alongside the error `<p>`. Done when: `host:changed` events surface a transient notice to all clients without persisting across phase changes. REQ-22.

- [x] 4.2 **`client/src/screens/Results.tsx` — vote tally** — replace `[Vote tally placeholder — TODO]` line with computed tally: map `roomState.players` → `{ name, count: votes received }` → filter `count > 0` → sort descending → render list. Done when: S-19 scenario renders correctly (B=2, C=1, A not shown or shown below). REQ-21.

---

## Phase 5: Verification

- [x] 5.1 **Build check** — run `npm run build` in both `server/` and `client/` workspaces. Done when: zero TypeScript errors and zero build errors in both.

- [x] 5.2 **Manual LAN playthrough checklist (3+ clients required)** — Verified manually by Marco on LAN, 2026-06-11. Funciona bien.
  - [x] Room creates, 3 players join → host sees Start button → non-host does not.
  - [x] Host starts → all 3 clients route to Game screen with a question displayed.
  - [x] Each player votes for a different player → Results screen appears with correct tally.
  - [x] Self-vote attempt → client receives error, phase stays "question".
  - [x] Host clicks Next → Leaderboard appears with cumulative scores.
  - [x] Host clicks Next again → next question loads (verify question changed).
  - [x] Play through all 5 questions → GameOver screen appears with final scores.
  - [x] Mid-round disconnect: one player closes tab while 2/3 voted → surviving players auto-advance to Results (all-voted re-check fires).
  - [x] Host disconnect mid-game → surviving clients receive `host:changed` notice → new host can click Next.
  - [x] Attempt game:start with 2 players → error received, phase stays lobby.
