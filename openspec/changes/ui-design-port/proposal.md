# Proposal: UI Design Port — Neo-Brutalist Skin for the 6 Game Screens

## Intent

The 6 client screens are functional but completely unstyled (zero CSS). The mockup (`design-reference/mockup-template.html`) holds a finished neo-brutalist design. We need to port that visual language onto the real, server-phase-driven app so it is presentation-ready for LAN parties — where there is NO internet, so all assets (fonts included) must be self-hosted.

## Scope

### In Scope
- Plain CSS layer: `globals.css` (tokens, reset, `@font-face`, keyframes) + screen classes, all `adm-`-prefixed.
- Self-host the 4 fonts (Anton, Oswald, Permanent Marker, Space Mono) extracted from base64 blobs in `AmigosdeMierda.html` into `client/public/fonts/`.
- Skin all 6 screens + `App.tsx` shell (noise overlay, error/notice banners).
- Bottom nav → read-only phase indicator strip (Inicio/Lobby/Juego/Votos/Ranking/Fin).
- Two-step vote confirm in `Game.tsx` (local `selectedPlayer` state buffers before the SAME `game:vote` emit — only behavior change; client-local).
- Index name input + GameOver top-3 podium + Results winner card, styled within the design language.

### Out of Scope
- Server code, socket event names/payloads, rematch behavior (`window.location.reload()` stays), new features.
- CSS Modules / Tailwind / inline styles. No new runtime npm deps.

## Capabilities

### New Capabilities
- `ui-styling`: neo-brutalist visual system (tokens, fonts, screen classes, phase strip) ported onto all 6 screens.

### Modified Capabilities
- None at the spec level. The two-step vote is a client-local UX buffer over an unchanged `game:vote` emit.

## Approach

Exploration recommendations adopted as-is (Plain CSS + self-hosted fonts + phase strip). Translate mockup inline styles into `adm-`-prefixed classes; CSS custom properties hold all design tokens; keyframes (`adm-blink`, `adm-pop`) and `@font-face` live in `globals.css`, imported once in `main.tsx`. Font extraction is a one-time build step documented in `client/public/fonts/EXTRACTION.md` with a Node helper at `client/scripts/extract-fonts.mjs` (decodes base64 woff2 from `AmigosdeMierda.html` → `.woff2` files); the script is dev-only, not a runtime dependency. `clip-path` torn edges apply ONLY to fixed-height decorative elements, never content cards. Vote grid uses `font-size: clamp(...)` + ellipsis truncation for 10-player / long-name safety.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `client/src/styles/globals.css` | New | Reset, tokens, `@font-face`, keyframes |
| `client/src/styles/screens.css` | New | `adm-` screen/layout classes |
| `client/public/fonts/` | New | Self-hosted woff2 + `EXTRACTION.md` |
| `client/scripts/extract-fonts.mjs` | New | Dev-only base64→woff2 extractor |
| `client/src/main.tsx` | Modified | Import `globals.css` + `screens.css` |
| `client/src/App.tsx` | Modified | Shell, noise overlay, banners, phase strip |
| `client/src/screens/*.tsx` (6) | Modified | className wiring + 3 divergence handlers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `clip-path` cuts variable-height content cards | Med | Apply only to fixed-height decorative elements; skip content cards |
| 10-player vote grid clips on 360px | Med | `clamp()` font-size + ellipsis; smaller size when count > 6 |
| Long names (≤20 char) overflow Marker/Anton | Med | `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` |
| Font extraction fidelity (wrong glyphs/weights) | Med | Verify each `@font-face` renders in devtools; keep Latin subset; commit checksums |
| Two-step vote breaks self-vote guard | Low | `disabled={p.id === myId}` enforced on selection AND confirm |

## Rollback Plan

Not a git repo — treat as a local milestone. Revert by removing the two CSS imports from `main.tsx` and the two `client/src/styles/*.css` files; screens degrade to their current unstyled-but-functional state. `client/public/fonts/` and the extractor script are inert when unimported. The `selectedPlayer` buffer in `Game.tsx` is self-contained and can be reverted to the single-click emit independently.

## Dependencies

- `AmigosdeMierda.html` (repo root) — source of base64 woff2 fonts. Confirmed present.

## Success Criteria

- [ ] `npm run build` green in BOTH workspaces (client + server).
- [ ] All 6 screens visually match the mockup at 360–480px viewport.
- [ ] App fully usable offline on LAN — ZERO external network requests (verify in devtools Network tab).
- [ ] 10-player vote grid does not clip on a 360px viewport.
- [ ] Bottom strip shows current phase, is non-interactive, preserves the 84px bottom padding.
- [ ] Two-step vote confirm emits the unchanged `game:vote`; self-vote stays disabled.
