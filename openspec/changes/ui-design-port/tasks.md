# Tasks: UI Design Port

This document details the checklist and tasks required to port the neo-brutalist styling system onto the AmigosDeMierda application.

## Task Breakdown

### Phase 1: Setup & Font Extraction
- [ ] Create font extraction script at `client/scripts/extract-fonts.mjs` to extract base64 font blobs from `AmigosdeMierda.html` in the root workspace directory.
- [ ] Run the extraction script via Node.js to populate `client/public/fonts/` with `.woff2` files.
- [ ] Validate that all 8 font weights and files are written successfully.
- [ ] Add `client/public/fonts/EXTRACTION.md` documenting the source and mapping IDs of each font.

### Phase 2: Core Style System
- [ ] Create `client/src/styles/globals.css` with reset, design tokens, `@font-face` bindings, keyframes, and global utilities (noise overlay).
- [ ] Create `client/src/styles/screens.css` with empty shell classes for each screen.
- [ ] Modify `client/src/main.tsx` to import both CSS sheets.
- [ ] Confirm no compilation errors with simple imports.

### Phase 3: App Shell & Layout
- [ ] Update `client/src/App.tsx` to wrap components in `.adm-shell`.
- [ ] Add noise overlay SVG container and background bindings inside `App.tsx`.
- [ ] Replace bottom nav tabs with a read-only phase indicator strip using CSS classes.
- [ ] Style application-level error and notification banner elements.

### Phase 4: Screen 1 — Index (Inicio)
- [ ] Modify `client/src/screens/Index.tsx` to align with the neo-brutalist card design.
- [ ] Integrate a styled name input inside the creation/joining card.
- [ ] Style the rules explanation block at the bottom, referencing mockup vector assets.

### Phase 5: Screen 2 — Lobby
- [ ] Modify `client/src/screens/Lobby.tsx` to format the room code card and player listing rows.
- [ ] Implement name truncation and ellipsis rules for long player names.
- [ ] Ensure host start button renders active while guests see a disabled state button.

### Phase 6: Screen 3 — Game (Juego)
- [ ] Modify `client/src/screens/Game.tsx` to include the blinking timer layout.
- [ ] Setup local `selectedPlayerId` state and tie grid buttons to it.
- [ ] Add the "Yo voto" confirm CTA button and wire it to submit the vote payload.
- [ ] Refine long-name mitigations on player selection grid blocks.

### Phase 7: Screen 4 — Results (Votos)
- [ ] Modify `client/src/screens/Results.tsx` to format the repeated question banner, winner card, and fanned pointing SVGs.
- [ ] Display player allocations and tally breakdown list.

### Phase 8: Screen 5 — Leaderboard (Ranking)
- [ ] Modify `client/src/screens/Leaderboard.tsx` to structure the score table with alternating rows.
- [ ] Render the crown icon next to the top player.

### Phase 9: Screen 6 — GameOver (Fin)
- [ ] Modify `client/src/screens/GameOver.tsx` to render the dynamic podium sorted by scores.
- [ ] Add lists for lower ranking players.
- [ ] Wire the rematch button to trigger page reload, and return menu button to navigate out.

### Phase 10: Validation
- [ ] Check build stability of client project (`npm run build`).
- [ ] Verify build stability of server project.
- [ ] Confirm offline operation by verifying that zero network calls to Google Fonts or CDN assets are made.
- [ ] Verify 10-player scaling and mobile responsive view scaling.
