# Verify Report: core-game-loop

**Change**: core-game-loop
**Date**: 2026-06-11
**Mode**: Standard (no test framework; static inspection + build evidence)
**Verdict**: PASS WITH WARNINGS

---

## Build Evidence

| Workspace | Command | Result |
|-----------|---------|--------|
| client | `npm run build` (Vite) | PASS — 64 modules, zero errors |
| server | `npm run build` (tsc) | PASS — zero TypeScript errors |

---

## Task Completeness

| Task | Status |
|------|--------|
| 1.1 server/src/types.ts — questionIndex + questionOrder | COMPLETE |
| 1.2 rooms.ts createRoom defaults | COMPLETE |
| 1.3 questions.ts shuffle<T> | COMPLETE |
| 1.4 MIN_PLAYERS=3, MAX_PLAYERS=10 constants | COMPLETE |
| 2.1 startGame() domain function | COMPLETE |
| 2.2 applyTally() private helper | COMPLETE |
| 2.3 recordVote() domain function | COMPLETE |
| 2.4 advanceGame() domain function | COMPLETE |
| 2.5 leaveRoom() rewrite | COMPLETE |
| 3.1 socket.ts game:start handler | COMPLETE |
| 3.2 socket.ts game:vote handler | COMPLETE |
| 3.3 socket.ts game:next handler | COMPLETE |
| 3.4 socket.ts handleLeave + imports | COMPLETE |
| 4.1 App.tsx host:changed listener | COMPLETE |
| 4.2 Results.tsx vote tally | COMPLETE |
| 5.1 Build check | COMPLETE |
| 5.2 Manual LAN playthrough | EXPECTED PENDING — requires 3+ physical clients |

**14/15 automatable tasks complete. 5.2 is out-of-automatable scope.**

---

## Design Constraint Audit

| Constraint | Expected | Verified |
|------------|----------|----------|
| No socket.io import in rooms.ts | absent | PASS (rg returns empty) |
| Domain errors returned, not thrown | {error: string} return type | PASS — all guards return error objects |
| Old `< 2` stub guard fully removed | deleted from socket.ts | PASS (rg returns empty) |
| "not yet implemented" stub removed | deleted from socket.ts | PASS (rg returns empty) |
| questionOrder NOT in client RoomState | absent from client/src/types.ts | PASS |
| questionIndex NOT in client RoomState | absent from client/src/types.ts | PASS |
| applyTally is module-private | not exported | PASS — no `export` on the function |
| getRoom removed from socket.ts imports | absent | PASS (rg returns empty) |
| host:changed emitted BEFORE room:state | ordering in handleLeave | PASS — lines 121-125 of socket.ts |
| MIN_PLAYERS = 3 (not 2) | value in rooms.ts | PASS |

---

## Spec Compliance Matrix

### Requirements

| REQ | Description | Location | Status |
|-----|-------------|----------|--------|
| REQ-01 | Player limit 1–10 enforced at joinRoom | rooms.ts:64 `>= MAX_PLAYERS` | PASS |
| REQ-02 | game:start host-only | rooms.ts:158 `hostId !== requesterId` | PASS |
| REQ-03 | game:start enforces MIN_PLAYERS=3 | rooms.ts:160 `< MIN_PLAYERS` | PASS |
| REQ-04 | game:start initializes round state | rooms.ts:164–175 shuffle+assign+clear | PASS |
| REQ-05 | game:start only valid in lobby | rooms.ts:159 `phase !== "lobby"` | PASS |
| REQ-06 | game:vote validates voter membership | rooms.ts:189 | PASS |
| REQ-07 | game:vote rejects self-vote server-side | rooms.ts:193 `targetId === voterId` | PASS |
| REQ-08 | game:vote validates target membership | rooms.ts:191 | PASS |
| REQ-09 | game:vote only in question phase | rooms.ts:188 `phase !== "question"` | PASS |
| REQ-10 | game:vote records and overwrites | rooms.ts:196 `votes[voterId]=targetId` | PASS |
| REQ-11 | All-voted triggers round close + tally | rooms.ts:199–202 | PASS |
| REQ-12 | game:next host-only | rooms.ts:216 `hostId !== requesterId` | PASS |
| REQ-13 | game:next results → leaderboard | rooms.ts:218–220 | PASS |
| REQ-14 | game:next leaderboard → next or gameover | rooms.ts:223–234 | PASS |
| REQ-15 | game:next only in results/leaderboard | rooms.ts:236 else clause | PASS |
| REQ-16 | Disconnect removes orphaned vote | rooms.ts:92 `delete state.votes[playerId]` | PASS |
| REQ-17 | Disconnect triggers all-voted re-check | rooms.ts:111–118 | PASS |
| REQ-18 | Host migration emits host:changed | socket.ts:121–123, rooms.ts:103–107 | PASS |
| REQ-19 | Host leaving lobby doesn't break room | leaveRoom + host migration path | PASS |
| REQ-20 | Host leaving mid-game preserves state | leaveRoom: no state reset in migration | PASS |
| REQ-21 | Results screen sorted vote tally | Results.tsx:19–25 | PASS |
| REQ-22 | host:changed listener in App.tsx | App.tsx:28–30, cleanup line 33 | PASS |
| REQ-23 | Type sync GameState/RoomState | types.ts both present; RoomState excludes questionOrder/questionIndex | PASS |

### Scenario Verification

| Scenario | Coverage | Status |
|----------|----------|--------|
| S-01 — Happy path game start | startGame guards + shuffle + phase=question | PASS (static) |
| S-02 — Non-host game:start | hostId !== requesterId guard | PASS (static) |
| S-03 — game:start < 3 players | MIN_PLAYERS guard | PASS (static) |
| S-04 — game:start not in lobby | phase !== "lobby" guard | PASS (static) |
| S-05 — All vote, round closes | recordVote all-voted check + applyTally | PASS (static) |
| S-06 — Self-vote rejected | targetId === voterId guard in recordVote | PASS (static) |
| S-07 — Vote change before close | votes[voterId] overwrite, no double-count | PASS (static) |
| S-08 — Vote for non-existent target | target-not-member guard | PASS (static) |
| S-09 — game:vote outside question phase | phase check in recordVote | PASS (static) |
| S-10 — game:next results→leaderboard | advanceGame results branch | PASS (static) |
| S-11 — game:next leaderboard→next Q | advanceGame leaderboard+hasNext branch | PASS (static) |
| S-12 — game:next leaderboard→gameover | advanceGame leaderboard+noNext branch | PASS (static) |
| S-13 — Non-host game:next | hostId check in advanceGame | PASS (static) |
| S-14 — game:next outside results/leaderboard | else clause returns error | PASS (static) |
| S-15 — Player disconnects, all-voted re-check fires | leaveRoom orphan-clean + re-check | PASS (static) |
| S-16 — Voter disconnects, round stays open | leaveRoom re-check: votes.len < players.len | PASS (static) |
| S-17 — Host leaves lobby, new host can start | host migration + hostChanged flag | PASS (static) |
| S-18 — Host leaves mid-game, state preserved | migration without score/phase reset | PASS (static) |
| S-19 — Results tally sorted descending | Results.tsx filter+sort | PASS (static) |
| S-20 — 10-player join rejected | MAX_PLAYERS >= guard in joinRoom | PASS (static) |
| S-21 — game:vote from non-member | voter-not-member guard in recordVote | PASS (static) |

---

## Issues

### CRITICAL

None.

### WARNING

**W-01 — No runtime test suite; all scenario coverage is static-only**

No automated test framework is configured. All 21 scenarios are verified by static inspection of logic paths rather than by executed tests. The build passing confirms type-correctness only. Runtime behavior (e.g., race conditions on simultaneous votes, actual Fisher-Yates distribution) remains unverified until task 5.2 (manual playthrough) or until a test framework is added.

Affected scenarios: all 21.
Risk: a subtle off-by-one in the all-voted check or a mutation bug in applyTally would not surface until real play.

**W-02 — notice state is not cleared on phase change only via room:state**

`App.tsx` clears `notice` inside the `room:state` handler. This means the `host:changed` notice disappears at the next state broadcast (correct behavior). However, if a `host:changed` event fires without a subsequent `room:state` (which should never happen in the current implementation since `handleLeave` always emits both), the notice would persist indefinitely. This is a theoretical edge case under the current code, not an actual bug, but worth noting.

**W-03 — Score reset on game:start resets mid-session if host clicks "start" again**

`startGame` resets all player scores to 0. The only guard preventing re-start is `phase !== "lobby"`. Once the game reaches `"gameover"`, there is no path back to lobby — so this is not exploitable in normal play. However, if a future feature adds a "play again" flow that returns to lobby, the score reset in `startGame` would silently wipe accumulated scores without warning. Noted for future implementers.

### SUGGESTION

**SG-01 — `getRoom` export still exists in rooms.ts (unused by socket.ts)**

`rooms.ts:126` exports `getRoom` which is no longer imported in `socket.ts`. The export is harmless and not a design violation (no spec forbids exporting it), but it is dead surface area that could confuse future maintainers.

**SG-02 — Results.tsx does not show players with 0 votes**

Spec REQ-21 says "Players with zero votes received MAY be shown but MUST be visually distinguished or listed below the winners." The current implementation filters them out entirely (`filter(row => row.count > 0)`). This is spec-compliant ("MAY"), but showing a "0 votes" section below the tally would improve transparency for players who want to know they were safe.

**SG-03 — Add a test framework**

The project has no test runner. Even a minimal Vitest setup with 5–6 unit tests covering `startGame`, `recordVote`, `advanceGame`, and `leaveRoom` would turn W-01 into a passing gate and dramatically raise confidence in correctness.

---

## Summary

- **23 requirements**: 23 PASS, 0 FAIL
- **21 scenarios**: 21 PASS (static), 0 FAIL, 0 UNTESTED
- **Build**: PASS (both workspaces, zero errors)
- **Design constraints**: 10/10 PASS
- **Tasks**: 14/15 complete; 5.2 expected-pending (manual)
- **CRITICAL**: 0
- **WARNING**: 3 (W-01 no test suite, W-02 notice persistence edge case, W-03 score reset on replay)
- **SUGGESTION**: 3

**Verdict: PASS WITH WARNINGS — ready for sdd-archive.**
