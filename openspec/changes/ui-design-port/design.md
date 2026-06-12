# Design: UI Design Port

This document details the concrete implementation plan, file architecture, font extraction design, and component-level modifications for the neo-brutalist styling.

## 1. File Architecture & Styling Strategy

To maintain a clean separation of concerns and avoid introducing complex dependencies (like Tailwind configurations or CSS modules runtime mappings), we will use two global CSS files.

```
client/
├── public/
│   └── fonts/
│       ├── Anton-Regular.woff2
│       ├── Oswald-Regular.woff2
│       ├── Oswald-Medium.woff2
│       ├── Oswald-SemiBold.woff2
│       ├── Oswald-Bold.woff2
│       ├── PermanentMarker-Regular.woff2
│       ├── SpaceMono-Regular.woff2
│       ├── SpaceMono-Bold.woff2
│       └── EXTRACTION.md
├── scripts/
│   └── extract-fonts.mjs (Dev utility)
└── src/
    ├── styles/
    │   ├── globals.css (Tokens, font-face, animations, reset)
    │   └── screens.css (BEM classes for screens)
    ├── main.tsx (Import globals.css + screens.css)
    ├── App.tsx (Main shell and state)
    └── screens/
        ├── Index.tsx (Crear/Unirse, rules)
        ├── Lobby.tsx (Player list, start)
        ├── Game.tsx (Timer, 2-column grid, confirmation)
        ├── Results.tsx (Winner card, finger fan, tallies)
        ├── Leaderboard.tsx (Score ranking table)
        └── GameOver.tsx (SVG crown, 3-column podium, reload)
```

---

## 2. Dev Font Extraction Script

Since the application must work entirely offline in LAN environments, all Google Fonts from the design mockup must be self-hosted. We will extract them from the base64 data embedded in `AmigosdeMierda.html`.

A Node script `client/scripts/extract-fonts.mjs` will parse the CSS `@font-face` blocks, locate base64 strings (matching `src: url("data:font/woff2;base64,...")` or extracted as mapping files), decode the blobs, and write `.woff2` files to `client/public/fonts/`.

---

## 3. Globals and Screens CSS Blueprint

### Globals CSS (`client/src/styles/globals.css`)
- **Variables**: Define custom CSS variables for colors (`--pink`, `--black`, `--bg`, `--bg-secondary`, `--white`, `--muted`), fonts, borders, and shadows.
- **Reset**: Browser margin, padding reset, box-sizing layout.
- **Font-face**: Wire the local `.woff2` files to the font-families.
- **Keyframes**: `@keyframes adm-blink`, `@keyframes adm-pop`, `@keyframes adm-jit`.
- **Noise texture overlay styling**: Uses `.adm-noise-overlay` class with fixed positioning, pointer-events: none, and the base64-encoded SVG turbulence background filter.

### Screens CSS (`client/src/styles/screens.css`)
Provides structured, BEM-like classes:
- `.adm-shell` (Centered column wrapper)
- `.adm-card`, `.adm-card--dark`, `.adm-card--pink`
- `.adm-btn`, `.adm-btn--primary`, `.adm-btn--disabled`
- `.adm-input`
- `.adm-list`, `.adm-list__row`
- `.adm-grid`, `.adm-grid--two-cols`
- `.adm-phase-strip` (Bottom status strip)
- `.adm-podium` (3-column visual structure)

---

## 4. Screen-by-Screen Component Modifications

### Index Screen (`Index.tsx`)
- Wrap layout in `.adm-screen-index`.
- Layout elements: Rotated Warning badge (`.adm-warning-badge`), Main Card (`.adm-card--dark`).
- **Name Input integration**: Inside the dark card, add:
  ```tsx
  <div className="adm-field">
    <label className="adm-label">Tu nombre</label>
    <input 
      type="text" 
      value={name} 
      onChange={e => setName(e.target.value)} 
      placeholder="Tu nombre aquí..." 
      className="adm-input"
      maxLength={20}
    />
  </div>
  ```
- **Rules Container**: Styled list wrapping step numbers in circles next to custom SVG icons (horn, clock, pointing finger, playing cards).

### Lobby Screen (`Lobby.tsx`)
- Room Code card renders `.adm-card--dark` with pink text `.adm-room-code` in Anton.
- Player rows styled as `.adm-player-row`. Circle step visual indicators are reused to show player numbering. Names render using `Permanent Marker` font.
- Host check handles host label badge rendering.
- Start button applies `.adm-btn` and `.adm-btn--primary`. Disabled guests button renders `.adm-btn--disabled`.

### Game Screen (`Game.tsx`)
- Introduce local state: `const [selectedId, setSelectedId] = useState<string | null>(null);`
- Reset selection when the question or state updates (using a `useEffect` keyed on the question).
- Render timer badge with `adm-blink` animation class.
- Question renders inside `.adm-card--dark` with custom polygon clip-path style class.
- Voting buttons in a 2-column grid. Button renders with conditional class:
  ```tsx
  className={`adm-vote-btn ${selectedId === p.id ? 'adm-vote-btn--selected' : ''}`}
  onClick={() => setSelectedId(p.id)}
  ```
- "Yo voto" submit button handles emission:
  ```tsx
  const handleVoteSubmit = () => {
    if (selectedId) {
      socket.emit("game:vote", selectedId);
      // parent state handles hasVoted styling
    }
  }
  ```

### Results Screen (`Results.tsx`)
- Question display styled similarly to the Game screen question card (smaller version).
- Main winner block renders `.adm-card--pink` featuring the winner's name in Anton.
- Fan Graphic: Renders pointing-finger SVG icons in a flex row, fanning out with minor rotations (`transform: rotate(18deg)`, `rotate(8deg)`, etc.).
- Voters Tally: Displays secondary details of who voted for whom.

### Leaderboard Screen (`Leaderboard.tsx`)
- Title styling and scores indicator strip.
- Alternating dark/light rows inside a border box:
  ```tsx
  className={`adm-table-row ${isLeader ? 'adm-table-row--leader' : ''}`}
  ```
- Crown SVG renders next to the name of the leading player.

### GameOver Screen (`GameOver.tsx`)
- Crown SVG scales up dynamically at the top of the viewport.
- Dynamic podium calculation:
  ```typescript
  // Sort players by score
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const first = sorted[0] || null;
  const second = sorted[1] || null;
  const third = sorted[2] || null;
  const rest = sorted.slice(3);
  ```
- Map columns: 2nd place (left, medium height), 1st place (center, tallest, pink styling), 3rd place (right, lowest height).
- Buttons: "Revancha · misma sala" triggers page reload; "Salir al menú" resets local routing context.
