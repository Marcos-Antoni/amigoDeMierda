# SDD Archive — Core Game Loop

**Change**: `core-game-loop`
**Archived**: 2026-06-11
**Status**: SHIPPED (ready for LAN party MVP)

---

## 1. What Shipped

The full round lifecycle of "Who is most likely to...?" — from lobby start to game-over screen — is now fully playable end-to-end with 3+ players on LAN.

### Server Deliverables

- **`server/src/types.ts`**: Added `questionIndex: number` and `questionOrder: string[]` to `GameState` (server-side only; intentionally not mirrored in client `RoomState`).
- **`server/src/questions.ts`**: Added pure `shuffle<T>()` function (Fisher-Yates) for question randomization.
- **`server/src/rooms.ts`**: Implemented five game-loop domain functions — `startGame()`, `recordVote()`, `advanceGame()`, `applyTally()` (private), and rewrote `leaveRoom()` — all returning discriminated `{ state } | { error }` results. Added `MIN_PLAYERS = 3` and `MAX_PLAYERS = 10` constants.
- **`server/src/socket.ts`**: Implemented three game event handlers (`game:start`, `game:vote`, `game:next`) with minimal payload validation and routing to domain. Updated `handleLeave` to emit `host:changed` event before broadcasting state.

### Client Deliverables

- **`client/src/screens/Results.tsx`**: Replaced vote tally placeholder with live computation: maps votes to vote-counts, filters zero-vote players, sorts descending.
- **`client/src/App.tsx`**: Added `host:changed` listener inside the existing socket effect; renders a transient notice when host migrates; clears notice on next state broadcast.

### Behavior

- **Game Start**: Host-only; enforces 3-player minimum; shuffles questions; clears votes and score accumulation (scores reset per game); transitions to question phase.
- **Voting**: Server-side self-vote guard; vote overwrite allowed before round closes; all-voted detection triggers auto-close to results phase with score tally.
- **Advance**: Results → Leaderboard → Next Question (or Gameover at question exhaustion).
- **Disconnect Handling**: Orphaned-vote cleanup; all-voted re-check during question phase (prevents deadlock); silent host migration with `host:changed` notice to remaining clients.
- **Client UI**: Results screen shows vote tally sorted descending by count; host-changed notice displayed transiently.

---

## 2. Verification Outcome

**Verdict**: PASS WITH WARNINGS (3 non-blocking warnings)

### Build Status
- ✅ `npm run build` in both `server` and `client` workspaces: zero TypeScript errors, zero build errors.

### Task Completion
- ✅ 14/15 automatable tasks complete (100%).
- ✅ 5.2 Manual LAN playthrough (3+ clients): **PASSED** — verified manually by Marco on LAN, 2026-06-11. Funciona bien.
  - All 10 playthrough checklist items marked complete.

### Requirement Compliance
- ✅ 23/23 requirements PASS.
- ✅ 21/21 acceptance scenarios PASS (static verification).
- ✅ 10/10 design constraints PASS.

### Known Warnings (non-blocking)
1. **W-01**: No automated test suite. All 21 scenarios verified by static code inspection, not runtime tests. Risk: subtle off-by-one or mutation bug would not surface until manual play (now covered by 5.2).
2. **W-02**: `host:changed` notice cleared only when next `room:state` arrives. If notice fires without a following state broadcast (theoretically impossible in current code), notice persists. Non-critical edge case.
3. **W-03**: `startGame` resets scores to 0. If a future "play again" flow returns to lobby, this happens silently. No exploit in current code (gameover blocks re-start).

### Post-Verify Hotfixes Applied
Two minor hotfixes were applied after verification and re-verified:
1. **`server/package.json` start script**: Now sets `NODE_ENV=production` to ensure build outputs are used.
2. **`server/src/index.ts` route ordering**: `/health` route moved before the SPA catch-all so health checks return `{ status: "ok" }` instead of the index.html file. Both endpoints verified: `GET /` → 200, `GET /health` → JSON.

---

## 3. Architecture Decisions Locked In

### ADR-1: Server-Internal Question Order
- `questionOrder: string[]` stored on `GameState` (server-side only), populated once per game on `game:start` via `shuffle(questions)`.
- Client `RoomState` intentionally omits `questionOrder` (and `questionIndex`) to avoid leaking upcoming questions and reducing payload size.
- Rationale: Index needs a stable array; co-locating on `GameState` avoids parallel side-maps. Deliberate drift beats reflexive mirroring.

### ADR-2: Pure Domain Layer
- All game rules live in `rooms.ts` as pure functions returning `{ state } | { error }`.
- `socket.ts` only validates payload presence and routes emits — no game logic.
- Rationale: Future testability. When a test framework arrives, domain layer is already pure (no socket harness needed).

### ADR-3: Votes-Received Scoring
- `applyTally()` increments `Player.score` by +1 per vote received (cumulative across rounds).
- No server-side `roundResults` field; per-round tally computed client-side from `votes` map.
- Rationale: Simple, rewards consensus, no tie-breaking needed. `Leaderboard`/`GameOver` already sort by `Player.score`.

### ADR-4: Orphaned-Vote Cleanup + All-Voted Re-Check
- `leaveRoom()` deletes departing player's outgoing vote, keeps votes that targeted them (tally skips missing targets), and re-runs all-voted check if `phase === "question"`.
- Fixes HIGH-risk deadlock where `Object.keys(votes).length` never matches `players.length` after mid-round disconnect.

### ADR-5: Host Migration with Event
- On host disconnect, `leaveRoom()` reassigns host to `players[0]`, flags `hostChanged: true`, and emits `host:changed { newHostName }` BEFORE `room:state`.
- Rationale: Clients see the name without diffing IDs; server gate prevents silent surprises in a party game.

---

## 4. Post-MVP Backlog

The following work is out of scope for this change but flagged for future sprints:

### High Priority
1. **Reconnect Support**: New socket ID after reconnect loses room state. Client would need to re-join. Blocked on a session/token persistence layer (not in scope for LAN MVP).

2. **Room TTL / Cleanup**: Abandoned rooms live in memory forever. Add a configurable TTL per room with a periodic cleanup interval.

3. **Vitest Unit Tests**: No test framework is wired. Add Vitest with 5–6 unit tests covering `startGame()`, `recordVote()`, `advanceGame()`, and `leaveRoom()` edge cases. This would eliminate W-01 warning.

### Medium Priority
4. **Vote Anonymity** (`toClientState()` projection): `room:state` currently broadcasts `questionOrder` and `votes` map to all clients. For true vote anonymity, add a `toClientState(state: GameState): ClientRoomState` projection that strips `questionOrder` and (optionally) removes the full votes map, replacing it with only aggregate `roundResults: { playerId, voteCount }[]`.

5. **Score Retention / "Play Again"**: Currently, `startGame()` resets scores to 0. If adding a "play again" button that loops to lobby (future feature), add a guard to preserve scores or explicitly warn the player. Implement a session-level score history (out of scope for single-game MVP).

6. **Question Content Expansion**: Codebase limited to 5 hardcoded Spanish questions. Add a question pool or async loader. Consider externalizing to a JSON config or database query (out of scope; LAN demo acceptable with current 5).

### Low Priority (UX/Polish)
7. **Auto-Advance Timer**: Host-driven advance works but adds friction. Add optional server timer (e.g., 10s) to auto-advance from results → leaderboard after all players have voted. Expose as a room option at creation time (out of scope; host-driven is adequate for MVP).

8. **Duplicate Check on Player Join**: `joinRoom()` does not validate duplicate socket IDs. Two clients with the same socket ID would be rejected implicitly (socket namespace handling). Add explicit duplicate detection if socket IDs can be reused across connections (unlikely, but defensive).

---

## 5. Known Risks Carried Forward

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `questionOrder` visible in socket payload | Low | Accepted for MVP. Implement `toClientState()` projection later if vote anonymity required. |
| Manual `GameState` ↔ `RoomState` drift | Medium | Document the drift ledger in design.md. No shared-types package; structural. Revisit if project grows. |
| Dropping below 3 players mid-game doesn't abort | Medium | Deliberate scope cut. Game round still resolves safely. Add abort-to-lobby rule if UX testing shows confusion. |
| Re-voting overwrites silently | Low | Acceptable in party context (player can change vote until all vote). Document in UX copy if needed. |

---

## 6. Files Archived

All SDD artifacts for `core-game-loop` are in this directory:

- ✅ `exploration.md` — problem space, forks, recommendations
- ✅ `proposal.md` — scope, approach, success criteria
- ✅ `spec.md` — 23 requirements + 21 acceptance scenarios
- ✅ `design.md` — technical implementation details, ADRs, architectural decisions
- ✅ `tasks.md` — 15 concrete implementation tasks (14/15 complete, 5.2 manual)
- ✅ `verify-report.md` — build evidence, requirement compliance, warnings
- ✅ `archive.md` — this file (final summary)

---

## 7. SDD Cycle Complete

The change has been:
1. ✅ **Explored** — problem space mapped, design forks resolved.
2. ✅ **Proposed** — scope locked, approach defined, risks and rollback planned.
3. ✅ **Specified** — 23 requirements and 21 scenarios written and verified.
4. ✅ **Designed** — technical architecture, domain functions, socket contracts, ADRs.
5. ✅ **Tasked** — 15 concrete, deliverable work units with clear acceptance criteria.
6. ✅ **Applied** — all code implemented, build passes, manual verification successful.
7. ✅ **Verified** — comprehensive audit against spec, 23/23 requirements pass, 3 non-blocking warnings noted.
8. ✅ **Archived** — all artifacts preserved, change ready for next development cycle.

The game is now playable on LAN. Ship it.
