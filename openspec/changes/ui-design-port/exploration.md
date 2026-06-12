# Exploration: ui-design-port

## Current State

The game logic is fully implemented. The React+Vite+TS client has 6 unstyled functional screens rendered by `App.tsx` via a phase-driven switch on `roomState.phase`. There is zero CSS — no stylesheet, no CSS modules, no Tailwind, no fonts declared anywhere. The mockup (`design-reference/mockup-template.html`) contains a complete neo-brutalist design in inline styles covering all 6 screens.

### Design system extracted from the mockup

Colors:
- `#ff0080` — hot pink, primary accent (buttons, highlights, text pops)
- `#0a0a0a` — near-black, primary text + backgrounds
- `#efefef` — light grey page background
- `#dadada` — secondary grey sections
- `#fff` — white for inputs and some cards
- `#777/#888/#666/#999` — muted greys for labels/subheading

Typography — 4 fonts, all loaded from Google Fonts CDN in the mockup (all embedded as base64 woff2 in `AmigosdeMierda.html`):
- **Anton** (400) — display headlines, large titles, room code, button text, vote buttons
- **Oswald** (400/500/600/700) — body text, nav labels, the UI workhorse
- **Permanent Marker** (400) — player names in lobby list, GameOver podium names (handwritten feel)
- **Space Mono** (400/700) — timer display, vote count badge, leaderboard subheading (monospace accent)

Border/shadow system:
- Hard black borders: `3px solid #0a0a0a` (standard), `4px solid #0a0a0a` (buttons)
- Offset shadows: `box-shadow: 5px 5px 0 #0a0a0a`, `7px 7px 0 #0a0a0a`, pink variant `6px 6px 0 rgba(255,0,128,.35)`
- `clip-path: polygon(...)` torn/wavy edges on major dark cards and section dividers

Animation keyframes defined in mockup:
- `adm-blink` — steps(1) toggle, used on timer display
- `adm-pop` — scale + rotate spring, used on GameOver crown
- `adm-jit` — pixel jitter (defined but unused in rendered screens)

Neo-brutalist details: slight card rotations (`-1deg` to `-1.5deg`) with compensating inner-element counter-rotations; noise texture overlay (SVG turbulence, fixed, opacity 10%, mix-blend-mode:multiply).

Layout: `max-width:480px; margin:0 auto; padding:0 0 84px` centred column. Fixed bottom nav: `position:fixed; bottom:0; border-top:4px solid #ff0080`.

## Affected Areas

- `client/index.html` — needs font declarations (CDN link tags or `@font-face` pointing to self-hosted files), and ideally a base `<meta>` viewport already present
- `client/src/App.tsx` — outer container layout, noise overlay, phase indicator strip, error/notice styling
- `client/src/screens/Index.tsx` — largest delta: mockup has no name input; real screen requires name + create/join; must integrate into neo-brutalist card design
- `client/src/screens/Lobby.tsx` — mostly direct mapping; non-host waiting message needs styled treatment
- `client/src/screens/Game.tsx` — vote UX diverges (see below)
- `client/src/screens/Results.tsx` — winner card maps cleanly; full tally list vs finger-fan icons is a design decision
- `client/src/screens/Leaderboard.tsx` — `p.score` maps to "Cartas ganadas"; table + crown icon direct mapping
- `client/src/screens/GameOver.tsx` — podium needs top-3 extraction; remaining players shown as list below
- New: `client/src/styles/globals.css` — reset, CSS variables (design tokens), keyframes, font-face rules
- New: `client/src/styles/screens.css` (or per-screen files) — component-scoped classes
- New: `client/public/fonts/` — self-hosted woff2 files extracted from `AmigosdeMierda.html`

## Key Divergences: Mockup vs Real App

1. **Bottom nav**: Mockup has free-navigation debug bar (click any tab → go to that screen). Real app is 100% server-phase-driven. The nav CANNOT navigate — it would need to become a read-only phase indicator or be dropped entirely.
2. **Index screen has a name input**: Mockup only shows "Crear sala" + a code input for joining. Real `Index.tsx` requires a name field for both create and join. The name input must be styled within the neo-brutalist card without a mockup reference.
3. **Game vote UX**: Mockup implements two-step: (1) pick player (button goes pink + tilted), (2) press "Yo voto" to confirm. Real `Game.tsx` does a single-click immediate socket emit — no confirm step, no selected state. To match the mockup, a local `selectedPlayer` state would buffer the selection before the `game:vote` emit. This is a UX improvement but changes game flow behaviour (minor, scoped to this screen).
4. **Results: winner display vs full tally**: Mockup shows one large winner card + decorative finger icons pointing at them. Real `Results.tsx` computes and shows a full sorted tally. The winner card is easy to add (top of tally array), but the finger-fan decoration is static in the mockup (hardcoded 4 fingers). In the real app the number of voters is dynamic.
5. **Leaderboard score label**: Mockup says "Cartas ganadas" and shows `{score}/5`. Real `Player.score` is the same concept — direct mapping with label change.
6. **GameOver podium**: Mockup shows exactly 3 players. Real game has 3–10. Strategy: show top 3 on podium, list remaining players below.
7. **GameOver rematch button**: Mockup fires `go_lobby` (socket-based re-lobby). Real code calls `window.location.reload()`. The button can be styled identically; the underlying behaviour difference is pre-existing and out of scope for this change.
8. **Error/notice in App.tsx**: Currently bare `<p style="color:red">` and `<p style="color:blue">`. These need styled banners integrated into the layout — the `host:changed` notice is transient and visually distinct from errors.

## Edge Cases

- **Long player names** (`maxLength={20}`): Lobby list uses Permanent Marker at 26px — 20-char names will overflow. Vote grid buttons at 21px Anton will also clip. Need `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` on name-bearing elements, or controlled truncation at a lower character count visually.
- **10-player vote grid on 360px phone**: 2-column grid = ~170px per column. Anton 21px with 18px padding = ~57px per button tall. 5 rows of 2 = ~285px — fits vertically, but button width for 8-10 char names may clip. Fix: `font-size:clamp(14px,4vw,21px)` or explicit smaller size when player count > 6.
- **`clip-path: polygon()` on variable-height cards**: The torn-edge clip paths use fixed percentage coordinates that work on fixed-height elements. Question cards and player lists are dynamic. If content height changes, the clip path stays — the top and bottom polygon points may cut content. Mitigation: only apply clip-path to fixed-height decorative elements; skip on content cards that can grow.
- **Host badge**: Real code checks `p.id === roomState.hostId` — maps directly to the pink HOST badge in the mockup. No issue.
- **Non-host waiting states**: Lobby, Results, and Leaderboard all have host-only action buttons and non-host "waiting" text. These need consistent styling (e.g., greyed-out button with "Esperando al host..." label instead of an absent button).
- **Game screen "can't vote for yourself"**: `disabled={p.id === myId}` — the disabled style needs to be visually differentiated (greyed vote button) and must survive the two-step UX change if implemented.

## Approaches

### 1. Styling Mechanism

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Plain CSS (globals + screens)** | Zero tooling, Vite handles natively, keyframes/variables in one place, simple | Global namespace (use BEM or consistent prefixes to avoid collision) | Low |
| **B. CSS Modules** | Scoped per component, no collision risk | Fragments keyframes/shared utilities across files, `.module.css` per screen, verbose `styles.className` JSX | Medium |
| **C. Inline styles (match mockup)** | 1:1 translation from mockup | No keyframe animation, no hover states, no pseudo-selectors, verbose JSX, undebuggable | High pain |
| **D. Tailwind** | Utility-first, mobile-ready | Requires install + config, non-standard design tokens need extension config, adds build complexity | High |

**Recommendation: Option A.** One `globals.css` (reset, CSS custom properties for all design tokens, all three keyframes, `@font-face` rules) imported in `main.tsx`. One `screens.css` (or a file per screen) for component layout classes. BEM-style prefix `adm-` keeps everything namespaced without modules overhead.

Proposed CSS variables:

```css
:root {
  --pink: #ff0080;
  --black: #0a0a0a;
  --bg: #efefef;
  --bg2: #dadada;
  --white: #fff;
  --shadow-pink: 6px 6px 0 rgba(255,0,128,.35);
  --shadow-black: 5px 5px 0 var(--black);
  --shadow-black-lg: 7px 7px 0 var(--black);
  --border: 3px solid var(--black);
  --border-thick: 4px solid var(--black);
}
```

### 2. Fonts: CDN vs Self-Hosted

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Google Fonts CDN** | Zero files, one `<link>` tag | BREAKS on LAN party — critical failure for stated use case | None |
| **B. Extract woff2 from AmigosdeMierda.html** | Offline-safe, ships with app, no external dependency | One-time extraction task: decode base64 blobs → save as `.woff2` in `client/public/fonts/` | Low-Medium |
| **C. fontsource npm packages** | `npm install`, Vite handles the rest | 4 more npm deps, more than needed | Low-Medium |

**Recommendation: Option B — extract woff2 from `AmigosdeMierda.html`.** The LAN-party use case is explicitly stated — CDN is not viable. The fonts are embedded as base64 woff2 in the original mockup HTML. One-time extraction, then `@font-face` declarations in `globals.css` pointing to `/fonts/*.woff2`. Files go in `client/public/fonts/` (Vite serves `public/` as static root).

Fonts needed (Latin subset only to keep file size minimal): `Anton-Regular`, `Oswald-Regular/Medium/SemiBold/Bold`, `PermanentMarker-Regular`, `SpaceMono-Regular/Bold`.

### 3. Bottom Nav

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Remove entirely** | Simplest, no confusion | Players have no phase-at-a-glance signal | None |
| **B. Phase indicator strip** | Honest about what it is; shows current phase in brand style | Needs design and label mapping | Low |
| **C. Disabled tab bar** | Visually matches mockup | Misleading UX — tabs look clickable | Low |

**Recommendation: Option B — phase indicator strip.** A fixed strip at the bottom styled with `border-top:4px solid var(--pink); background:var(--black); color:var(--pink)` showing the current phase label in Oswald. Same visual footprint as the nav (so the `84px` bottom padding on the main container still works), but communicates phase progress without implying interactivity. Phase labels: Inicio / Lobby / Juego / Votos / Ranking / Fin — same strings as the mockup nav.

## Recommendation

**Plain CSS with design tokens + self-hosted fonts + phase indicator strip.**

The port is largely mechanical. Translate each screen's mockup inline styles into CSS classes, wire classNames in TSX, handle the 4 real divergences (name input on Index, two-step vote buffering in Game, dynamic voter display in Results, top-3 podium extraction in GameOver), and implement the phase indicator in App.tsx. The biggest non-visual work item is font extraction; the biggest UX decision is whether the two-step vote confirm gets implemented (recommended: yes, since the visual requires it and the socket call is unchanged).

## Risks

- **Font offline**: CDN fonts must not be used. Font extraction from `AmigosdeMierda.html` is the only viable path for LAN parties.
- **Index name input has no mockup reference**: Must design within the neo-brutalist language without a spec — the name `<input>` should follow the same style as the code input (`Space Mono, background:#fff, border:3px solid #fff, padding:14px`) and be integrated into the dark card.
- **`clip-path` on variable-height elements**: The torn-edge polygon coordinates assume fixed heights. Must audit each usage — skip on question cards, player lists, and any card that grows with content.
- **10-player vote grid on 360px viewports**: Button text will clip. Needs a `font-size` clamping strategy for the vote grid.
- **Two-step vote state**: Adding a `selectedPlayer` local state buffer in `Game.tsx` before the socket emit; the `disabled={p.id === myId}` guard must still apply to the selected state (cannot pick yourself).
- **GameOver podium top-3**: The podium must gracefully handle games that end with fewer than 3 connected players.
- **App.tsx error/notice position**: Error and notice are currently rendered above the screen. In the new layout they'll sit inside the outer container — positioning relative to the fixed nav bottom padding needs thought.

## Ready for Proposal

Yes. The design system is fully inventoried, all 6 screen mappings are clear with their divergences documented, the 3 approach forks have firm recommendations, and the edge cases are catalogued. The proposal phase should define: exact file/directory structure, full CSS variable set, per-screen class naming convention, task breakdown by screen, and the font extraction procedure.
