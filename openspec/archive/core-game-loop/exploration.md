# Exploration: core-game-loop

## Current State

The project is a real-time multiplayer party game ("Who is most likely to...?") built as an npm workspaces monorepo. The JS→TS migration is complete. The skeleton is fully wired — room creation/join/leave work end-to-end — but the three game-loop events (`game:start`, `game:vote`, `game:next`) are stubbed with TODO comments that immediately emit `"not yet implemented"` errors.

### Server-side architecture

`server/src/types.ts` defines `GameState`:

```ts
interface GameState {
  code: string; hostId: string; players: Player[];
  phase: "lobby" | "question" | "results" | "leaderboard" | "gameover";
  currentQuestion: string | null;
  votes: Record<string, string>; // voterId -> targetId
}
```

No `questionIndex` or `roundResults` field exists yet.

`server/src/rooms.ts` is an in-memory `Map<string, GameState>`. `joinRoom` guards room-exists, phase==="lobby", players<10 (max), no duplicate-ID check only. `leaveRoom` does silent host migration (assigns `players[0]`) with no event emitted. Room is deleted when empty.

`server/src/questions.ts` is a static 5-item Spanish string array. No shuffle, no indexing.

`server/src/socket.ts` has all three game events stubbed at lines 55-66 (`game:start`), 73-84 (`game:vote`), 90-100 (`game:next`). `handleLeave` at lines 115-127 does NOT emit a host-changed notification.

### Client-side architecture

`client/src/types.ts` defines `RoomState` — structurally identical to server `GameState` but a separate type (drift risk). `App.tsx` listens to `room:state` and routes by `phase`. All 6 screens exist as stubs. `Results.tsx` line 23 has `[Vote tally placeholder — TODO]`. `Game.tsx` line 37 disables self-vote in UI only (no server guard). `GameOver.tsx` renders sorted final scores correctly.

## Affected Areas

- `server/src/socket.ts` — all three TODO stubs + handleLeave host event
- `server/src/rooms.ts` — leaveRoom needs to clean orphaned votes + re-check all-voted; no minimum player guard after game starts
- `server/src/types.ts` — needs `questionIndex: number`
- `server/src/questions.ts` — needs a shuffle helper
- `client/src/types.ts` — RoomState must be kept in sync (no new fields needed for this change, but drift is ongoing risk)
- `client/src/screens/Results.tsx` — vote tally computation and rendering
- `client/src/screens/Game.tsx` — self-vote server-side guard (UI already done)
- `client/src/App.tsx` — add listener for `host:changed` event (optional UX)

## Approaches

### Fork 1: Question state tracking

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A — `questionIndex: number` in GameState | Minimal state change; easy index bounds check | Must shuffle questions at start and store order (or accept static order) | Low |
| B — `questionQueue: string[]` in GameState | Shuffled per game; remaining rounds visible | Extra field in both GameState and RoomState | Low-Medium |

**Recommendation**: Option A. Add `questionIndex: number` to `GameState`, shuffle on `game:start`, use index to track position.

### Fork 2: Round-advance authority

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A — Host-driven (current stub design) | Already wired; gives host pace control; simpler | Game hangs if host connection issues post-results (mitigated by host migration) | Low |
| B — Server timer auto-advance | No host dependency; better mobile UX | Timer management per room; cleanup complexity; no easy pause | High |

**Recommendation**: Option A. Host-driven. Timer is a post-MVP enhancement.

### Fork 3: Score model

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A — Winner-takes-all (+1 to most-voted) | Simple; clear winner | Tie-breaking logic needed; less differentiation | Low |
| B — Votes-received (each vote = +1 pt) | Rewards consensus; no tie-breaking; natural for "most likely to" | Scores grow larger | Low |
| C — Percentage-based | Normalized scores | Floating-point; awkward in party context | Low |

**Recommendation**: Option B. Votes-received. Natural semantics: if 5 people all agree you'd be most likely to do something, you get 5 points.

### Fork 4: Host migration notification

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A — Silent (current, just room:state broadcast) | Zero new code; works functionally | New host gets no notification; confusing in party context | None |
| B — Emit `host:changed` event with new host name | Clear UX; party games need communication | New socket event; App.tsx listener; toast component | Low |

**Recommendation**: Option B. One extra `io.to(code).emit("host:changed", { newHostName })` on the server; one `useEffect` listener in App.tsx.

### Fork 5: Results tally — client vs server

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A — Client computes from votes map | No server changes; votes already in RoomState | Exposes full voter→target map (no vote anonymity) | Low |
| B — Server sends `roundResults: {playerId, votes}[]` | Single computation; can hide voter identity; cleaner client | New field in GameState + RoomState | Low-Medium |

**Recommendation**: Option A for MVP. Votes map is already present. Add `roundResults` later if anonymity is needed.

## Recommendation

Implement in this order to minimize risk:

1. Add `questionIndex: number` to `server/src/types.ts` `GameState`.
2. Add shuffle helper to `server/src/questions.ts`.
3. Implement `game:start`: enforce 3-player min, shuffle + set `currentQuestion` + `questionIndex=0`, clear votes, phase=`question`, broadcast `room:state`.
4. Implement `game:vote`: validate voter in room, validate target ≠ self (server guard), record vote, detect all-voted, tally scores (votes-received), transition to `results`, broadcast.
5. Fix `handleLeave`/`leaveRoom`: remove orphaned vote on disconnect, re-check all-voted if phase=`question` (could auto-close round).
6. Implement `game:next`: results→leaderboard, leaderboard→(next question OR gameover), broadcast.
7. Emit `host:changed` from `handleLeave` when host migrates.
8. Update `Results.tsx`: compute tally from `roomState.votes`, render sorted list.

## Risks

- **Orphaned votes on disconnect** (HIGH): if a player disconnects mid-vote, their vote entry remains in `votes` but their player record is removed, breaking the all-voted detection (`votes.length === players.length` never fires). Must fix in `handleLeave`.
- **Type drift** (MEDIUM): `GameState` and `RoomState` are manually synced. No shared types package exists. Every field added server-side must be manually mirrored.
- **Only 5 questions** (LOW for logic, HIGH for UX): game will exhaust questions after 5 rounds. Implementation must handle `gameover` at index bounds. Content expansion is out of scope but critical before real use.
- **No server-side self-vote guard** (LOW): `Game.tsx` disables the button, but a client can still emit `game:vote` with `targetId === socket.id`. Add guard in `game:vote` handler.
- **No reconnect support** (KNOWN): socket reconnect creates a new ID; player loses room state. Not in scope but blocks production use.
- **No room TTL** (KNOWN): abandoned rooms live in memory forever. Not a blocker for MVP.

## Ready for Proposal

Yes — all stubs are mapped to concrete logic, design forks are resolved with recommendations, and edge cases are catalogued. The proposal can be written immediately.
