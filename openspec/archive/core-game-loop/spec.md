# Spec: Core Game Loop

## Change
`core-game-loop`

## Status
`approved`

---

## Overview

This spec describes what MUST be true after implementing the core game loop. It covers the full round lifecycle: start, voting, scoring, advancing, gameover, disconnect handling, and results presentation. It does NOT prescribe implementation details — those belong in the design artifact.

---

## Requirements

### REQ-01 — Player limits enforced at join time

- A room MUST NOT allow fewer than 1 or more than 10 players at any time.
- `joinRoom` MUST reject any join attempt that would bring the player count above 10.
- Player limit enforcement at the join layer means `game:start` does not need to check the upper bound.

### REQ-02 — `game:start` is host-only

- Only the socket whose ID matches `GameState.hostId` MAY emit `game:start`.
- A non-host emitting `game:start` MUST receive an error response and the game state MUST NOT change.

### REQ-03 — `game:start` enforces a 3-player minimum

- `game:start` MUST be rejected when `players.length < 3`.
- The emitting socket MUST receive a descriptive error. No state change occurs.

### REQ-04 — `game:start` initializes round state

- On a valid `game:start`:
  - The questions list MUST be shuffled (Fisher-Yates or equivalent).
  - `questionIndex` MUST be set to `0`.
  - `currentQuestion` MUST be set to `questions[0]` from the shuffled list.
  - `votes` MUST be cleared (empty record).
  - `phase` MUST transition to `"question"`.
  - The updated `GameState` MUST be broadcast to all room members via `room:state`.

### REQ-05 — `game:start` is only valid in lobby phase

- `game:start` MUST be rejected if `phase !== "lobby"`.

### REQ-06 — `game:vote` validates the voter

- The socket emitting `game:vote` MUST be a current member of the room.
- If the voter is not found in `players`, the event MUST be rejected with an error.

### REQ-07 — `game:vote` enforces a server-side self-vote guard

- `game:vote` MUST be rejected when `targetId === voterId` (socket ID comparison).
- This guard operates server-side regardless of client-side UI enforcement.

### REQ-08 — `game:vote` validates the target

- The `targetId` MUST correspond to a current member of the room.
- If the target player is not found, the event MUST be rejected with an error.

### REQ-09 — `game:vote` is only valid in question phase

- `game:vote` MUST be rejected if `phase !== "question"`.

### REQ-10 — `game:vote` records the vote and allows vote change

- A vote MUST be stored as `votes[voterId] = targetId`.
- If a voter emits `game:vote` again before the round closes, the new vote MUST overwrite the previous one (no double-count).

### REQ-11 — All-voted detection triggers round close

- After recording each vote, the server MUST check whether `Object.keys(votes).length === players.length`.
- When all players have voted:
  - Each player's score MUST be incremented by the number of votes they received (votes-received model, +1 per vote received).
  - `phase` MUST transition to `"results"`.
  - The updated `GameState` MUST be broadcast to all room members via `room:state`.

### REQ-12 — `game:next` is host-only

- Only the socket whose ID matches `GameState.hostId` MAY emit `game:next`.
- A non-host emitting `game:next` MUST receive an error and state MUST NOT change.

### REQ-13 — `game:next` from results transitions to leaderboard

- When `phase === "results"` and a valid `game:next` is received:
  - `phase` MUST transition to `"leaderboard"`.
  - `room:state` MUST be broadcast.

### REQ-14 — `game:next` from leaderboard advances or ends game

- When `phase === "leaderboard"` and a valid `game:next` is received:
  - If there is a next question (`questionIndex + 1 < questions.length`):
    - `questionIndex` MUST be incremented by 1.
    - `currentQuestion` MUST be set to `questions[questionIndex]`.
    - `votes` MUST be cleared.
    - `phase` MUST transition to `"question"`.
  - If there is no next question (`questionIndex + 1 >= questions.length`):
    - `phase` MUST transition to `"gameover"`.
  - `room:state` MUST be broadcast in both cases.

### REQ-15 — `game:next` is only valid in results or leaderboard phase

- `game:next` MUST be rejected if `phase` is not `"results"` or `"leaderboard"`.

### REQ-16 — Disconnect removes orphaned votes

- When a player disconnects (`handleLeave` / `leaveRoom`):
  - If the departing player has an entry in `votes`, that entry MUST be removed.

### REQ-17 — Disconnect triggers all-voted re-check during question phase

- After removing the departing player and their orphaned vote, if `phase === "question"`:
  - The server MUST re-run the all-voted check (`votes.length === players.length`).
  - If the remaining players have all voted, the round MUST close normally (score, phase→results, broadcast).
  - This prevents a deadlock where the last needed vote was already cast before the other player left.

### REQ-18 — Host migration emits `host:changed`

- When the host disconnects and there is at least one remaining player:
  - The server MUST assign a new host (first remaining player, i.e., `players[0]` after removal).
  - The server MUST emit `host:changed` to the room with payload `{ newHostName: string }`.
  - The `room:state` broadcast that follows reflects the updated `hostId`.

### REQ-19 — Host leaving in lobby does not break the room

- If the host leaves while `phase === "lobby"`, the room MUST remain accessible and the new host MUST be able to start the game (assuming ≥ 3 players remain).

### REQ-20 — Host leaving mid-game migrates host without resetting state

- If the host leaves while `phase` is `"question"`, `"results"`, or `"leaderboard"`:
  - Game state (votes, scores, phase, questionIndex) MUST NOT be reset.
  - The new host inherits advance authority immediately.

### REQ-21 — Results screen renders a sorted vote tally

- The Results screen MUST compute vote counts from the `votes` map in `RoomState` (client-side, no new server field).
- The tally MUST display each player who received at least one vote, sorted by votes received (descending).
- Players with zero votes received MAY be shown but MUST be visually distinguished or listed below the winners.

### REQ-22 — `host:changed` listener in client

- `App.tsx` MUST register a listener for the `host:changed` event for the duration of the session.
- The listener MUST update local UI state so the client knows if it has become the host (enabling `game:next` controls).

### REQ-23 — Type sync: `GameState` and `RoomState`

- After adding `questionIndex: number` to server `GameState`, the client `RoomState` MUST be kept structurally compatible.
- No new field is required on `RoomState` for this change beyond what the server already broadcasts.

---

## Acceptance Scenarios

### S-01 — Successful game start (happy path)

```
Given  a room in "lobby" phase with 3 players (host + 2 others)
When   the host emits game:start
Then   phase becomes "question"
And    currentQuestion is set to a question from the shuffled list
And    questionIndex is 0
And    votes is empty
And    all clients receive room:state with the updated game
```

### S-02 — Non-host attempts game:start

```
Given  a room in "lobby" phase with 3 players
When   a non-host player emits game:start
Then   the server emits an error to that socket only
And    phase remains "lobby"
And    no room:state broadcast occurs
```

### S-03 — game:start rejected with fewer than 3 players

```
Given  a room in "lobby" phase with 2 players
When   the host emits game:start
Then   the server emits an error to the host socket
And    phase remains "lobby"
```

### S-04 — game:start rejected when not in lobby

```
Given  a room in "question" phase
When   the host emits game:start
Then   the server emits an error
And    phase remains "question"
```

### S-05 — All players vote, round closes

```
Given  a room in "question" phase with 3 players (A, B, C)
When   A votes for B, B votes for C, C votes for B
Then   B's score increases by 2, C's score increases by 1, A's score is unchanged
And    phase becomes "results"
And    all clients receive room:state
```

### S-06 — Self-vote rejected server-side

```
Given  a room in "question" phase
When   player A emits game:vote with targetId === A's own socket ID
Then   the server emits an error to A
And    no vote is recorded
And    phase remains "question"
```

### S-07 — Vote change before round closes

```
Given  a room in "question" phase with 3 players (A, B, C)
And    A has already voted for B
When   A emits game:vote with targetId = C (before all have voted)
Then   A's vote is updated to C (no double-count for B)
And    phase remains "question" (round has not yet closed)
```

### S-08 — Vote for non-existent target

```
Given  a room in "question" phase
When   player A emits game:vote with a targetId not in players
Then   the server emits an error to A
And    no vote is recorded
```

### S-09 — game:vote rejected outside question phase

```
Given  a room in "results" phase
When   any player emits game:vote
Then   the server emits an error
And    votes map is unchanged
```

### S-10 — game:next: results to leaderboard

```
Given  a room in "results" phase
When   the host emits game:next
Then   phase becomes "leaderboard"
And    all clients receive room:state
```

### S-11 — game:next: leaderboard to next question

```
Given  a room in "leaderboard" phase with questionIndex < (total questions - 1)
When   the host emits game:next
Then   questionIndex increments by 1
And    currentQuestion is updated to the next shuffled question
And    votes is empty
And    phase becomes "question"
And    all clients receive room:state
```

### S-12 — game:next: leaderboard triggers gameover at question exhaustion

```
Given  a room in "leaderboard" phase with questionIndex === (total questions - 1)
When   the host emits game:next
Then   phase becomes "gameover"
And    all clients receive room:state
And    scores are final
```

### S-13 — Non-host attempts game:next

```
Given  a room in "results" phase
When   a non-host player emits game:next
Then   the server emits an error to that socket only
And    phase remains "results"
```

### S-14 — game:next rejected outside results/leaderboard

```
Given  a room in "question" phase
When   the host emits game:next
Then   the server emits an error
And    phase remains "question"
```

### S-15 — Player disconnects mid-vote (orphaned vote removed, no deadlock)

```
Given  a room in "question" phase with 3 players (A, B, C)
And    A and B have voted, C has not voted
When   C disconnects
Then   C is removed from players
And    C's absence does not leave an orphaned vote (C had not voted)
And    the all-voted check fires: votes.length (2) === players.length (2)
And    phase transitions to "results" without manual intervention
```

### S-16 — Voter disconnects mid-round (orphaned vote removed, re-check)

```
Given  a room in "question" phase with 3 players (A, B, C)
And    A has voted for B, C has not voted
When   A disconnects
Then   A's vote is removed from the votes map
And    A is removed from players
And    the all-voted check fires: votes.length (1) === players.length (2) → false
And    phase remains "question" (round still open, C must still vote)
```

### S-17 — Host leaves in lobby, new host can start

```
Given  a room in "lobby" phase with 4 players where A is host
When   A disconnects
Then   players[0] (B) becomes the new host
And    host:changed is emitted with { newHostName: B's name }
And    B can now emit game:start successfully (if 3 players remain)
```

### S-18 — Host leaves mid-game, state preserved

```
Given  a room in "question" phase with 4 players where A is host
And    2 players have already voted
When   A disconnects
Then   B becomes the new host (host:changed emitted)
And    questionIndex, currentQuestion, votes, and scores are unchanged
And    A's vote is removed if A had voted (orphaned vote cleanup)
And    all-voted re-check runs
And    B can emit game:next when the time comes
```

### S-19 — Results screen tally (client-computed)

```
Given  a room in "results" phase with votes: { A→B, B→C, C→B }
When   the Results screen renders
Then   B shows 2 votes (received from A and C)
And    C shows 1 vote (received from B)
And    A shows 0 votes (or is listed separately)
And    the list is sorted descending by vote count
```

### S-20 — Room with 10 players: join rejected at limit

```
Given  a room already containing 10 players
When   an 11th player attempts to join
Then   the server rejects the join with an error
And    room player count remains 10
```

### S-21 — game:vote by socket not in room

```
Given  a socket not currently in any room (or a different room)
When   that socket emits game:vote with a valid-looking payload
Then   the server emits an error to that socket
And    no room state changes
```

---

## Out of Scope (for this spec)

- Reconnect support (new socket ID loses room state — known limitation).
- Room TTL / abandoned-room cleanup.
- Vote anonymity / server-side `roundResults` aggregation.
- Question content expansion beyond the current 5.
- Server-driven timer auto-advance.
- Tie-breaking logic in scoring.

---

## Open Questions / Spec Assumptions

| # | Assumption | Rationale |
|---|------------|-----------|
| A1 | Questions are shuffled once on `game:start` and the shuffled order is stored in memory (not persisted to `GameState` as a field) — the `questionIndex` indexes into the in-memory array on the server | Exploration recommended `questionIndex` only; the shuffled array itself is a server-side implementation detail |
| A2 | Score increments are cumulative across rounds (not reset per round) | Proposal says "votes-received" scoring model; `GameOver.tsx` already renders sorted final scores |
| A3 | A single player remaining after disconnects does NOT auto-end the game | The spec only mandates all-voted re-check; lobby minimum (3) does not apply after the game has started |
| A4 | `host:changed` payload is `{ newHostName: string }` — player name, not ID | Matches exploration recommendation; clients need a human-readable name for toast/notification |
| A5 | Player limit upper bound (10) is already enforced by `joinRoom`; no additional check is needed in `game:start` | Exploration confirms `players<10` guard exists in `joinRoom` |
