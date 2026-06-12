# Proposal: Core Game Loop

## Intent

The room skeleton (create/join/leave) works end-to-end, but the three game events (`game:start`, `game:vote`, `game:next`) are stubbed and emit `"not yet implemented"`. The game is unplayable. This change implements the full round loop — start, vote, tally, advance — so a host plus 2+ players can play "Who is most likely to...?" end-to-end on LAN.

## Scope

### In Scope
- `game:start`: enforce 3-player minimum, shuffle questions, set `questionIndex=0`, clear votes, phase→`question`.
- `game:vote`: validate voter/target, server-side self-vote guard, record vote, detect all-voted, tally (votes-received), phase→`results`.
- `game:next`: `results`→`leaderboard`, `leaderboard`→next question OR `gameover` at index bounds.
- `handleLeave`/`leaveRoom`: remove orphaned votes, re-check all-voted if mid-question, emit `host:changed` on migration.
- `Results.tsx`: client-computed tally from `votes` map, sorted render.
- `App.tsx`: `host:changed` listener (optional toast).

### Out of Scope
- Reconnect support (new socket ID loses room state).
- Room TTL / abandoned-room cleanup.
- Question content expansion beyond the current 5.
- Vote anonymity / server-side `roundResults` field.

## Capabilities

### New Capabilities
- `game-loop`: round lifecycle — start, voting, scoring, advance, gameover.
- `host-migration-notice`: notify clients when host changes on disconnect.

### Modified Capabilities
- None (room create/join/leave behavior unchanged at the spec level).

## Approach

Adopt all five exploration recommendations:
1. **Question tracking** — add `questionIndex: number` to `GameState`; shuffle on start.
2. **Advance authority** — host-driven (`game:next`), already wired.
3. **Score model** — votes-received (each vote = +1 to target). No tie-breaking.
4. **Host migration** — emit `host:changed { newHostName }`.
5. **Results tally** — client-computed from existing `votes` map (no new server field).

Implementation order follows exploration steps 1-8: types → shuffle helper → start → vote → leave fix → next → host event → Results UI.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server/src/types.ts` | Modified | Add `questionIndex: number` to `GameState` |
| `server/src/questions.ts` | Modified | Add shuffle helper |
| `server/src/socket.ts` | Modified | Implement 3 game events + `host:changed` |
| `server/src/rooms.ts` | Modified | Orphaned-vote cleanup, all-voted re-check |
| `client/src/screens/Results.tsx` | Modified | Vote tally compute + render |
| `client/src/App.tsx` | Modified | `host:changed` listener |
| `client/src/types.ts` | Verify | Keep `RoomState` in sync (no new field) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orphaned votes deadlock all-voted detection | High | `leaveRoom` deletes departing voter's vote AND re-checks all-voted before broadcast |
| Type drift `GameState`↔`RoomState` | Medium | No new client field needed; verify sync manually this change |
| Question exhaustion at index bounds | Med (UX) | `game:next` transitions to `gameover` when `questionIndex` exceeds list |
| Client emits self-vote bypassing UI | Low | Server guard `targetId !== voterId` in `game:vote` |

## Rollback Plan

No git repo yet — rollback is per-file. Each event handler is self-contained; revert to the original TODO stub by restoring the `"not yet implemented"` emit. `questionIndex` is additive (optional at type level until used). Revert `Results.tsx` to the placeholder and remove the `host:changed` listener. No data migration — state is in-memory.

## Dependencies

- None new. Uses existing Socket.IO, types, and questions array.

## Success Criteria

- [ ] `npm run build` passes for both `server` and `client` workspaces.
- [ ] Full game playable end-to-end with 3+ clients on LAN (start → vote → results → leaderboard → next → gameover).
- [ ] All-voted detection still fires when a player disconnects mid-question (no deadlock).
- [ ] Server rejects self-votes even if a client emits one directly.
- [ ] Game reaches `gameover` cleanly after the last question.
- [ ] Remaining clients see `host:changed` when the host leaves.
