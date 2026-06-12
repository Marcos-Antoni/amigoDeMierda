# Specification: UI Design Port

This specification details the design tokens, fonts, responsive requirements, and behavior of the 6 styled client screens and App shell.

## 1. Visual System & Design Tokens

A flat, plain CSS approach (`globals.css` + `screens.css`) will implement the design. No inline styling will be used in the final React components.

### Color Palette

| Token | CSS Custom Property | Value | Role |
|---|---|---|---|
| Pink (Primary Accent) | `--pink` | `#ff0080` | Buttons, borders, highlighted texts, crown icon |
| Black (Primary/Text) | `--black` | `#0a0a0a` | Backgrounds, primary text, dark cards, heavy borders |
| Light Grey (Background) | `--bg` | `#efefef` | Page background |
| Dark Grey (Secondary) | `--bg-secondary` | `#dadada` | Secondary sections, rules containers |
| White | `--white` | `#ffffff` | Input backgrounds, text on dark components, card borders |
| Muted Grey | `--muted` | `#777777` | Subtitles, disabled states, labels |

### Typography & Fonts

All fonts must be self-hosted locally from `client/public/fonts/` for LAN support.

| Font Family | Weight | CSS Custom Property | Usage |
|---|---|---|---|
| **Anton** | 400 | `--font-display` | display headlines, room codes, major buttons |
| **Oswald** | 400, 500, 600, 700 | `--font-sans` | body text, table headers, labels, list items |
| **Permanent Marker** | 400 | `--font-handwriting` | player names, handwritten captions |
| **Space Mono** | 400, 700 | `--font-mono` | timer, vote tallies, metadata labels |

### Borders & Shadows

- **Heavy Black Border**: `3px solid var(--black)` (Standard elements), `4px solid var(--black)` (Buttons, active cards)
- **Heavy White Border**: `3px solid var(--white)` (Pink container child components)
- **Hard Offset Shadow (Black)**: `box-shadow: 5px 5px 0 var(--black)`
- **Hard Offset Shadow (Pink)**: `box-shadow: 6px 6px 0 rgba(255, 0, 128, 0.35)`

### Keyframe Animations

- `@keyframes adm-blink`: Blinks opacity from `1` to `0.2` step-wise for the timer display.
- `@keyframes adm-pop`: Toggles scale and rotation for dynamic crown elements.
- `@keyframes adm-jit`: Tiny jitter effect for interactive elements (optional).

### Layout & Sizing

- **Max Width**: `480px`
- **Centered Layout**: `margin: 0 auto; min-height: 100vh; position: relative;`
- **Bottom Navigation Padding**: `padding-bottom: 84px;`

---

## 2. Screen Specifications

### App Shell & Global Elements
- **Noise Overlay**: A fixed `div` with `inset: 0` and pointer-events disabled, using a SVG turbulence filter, opacity 10%, mix-blend-mode multiply.
- **Phase Indicator (Bottom Nav)**: A fixed bottom bar spanning the viewport width (up to 480px) displaying 6 phase markers: `Inicio`, `Lobby`, `Juego`, `Votos`, `Ranking`, and `Fin`. It is non-interactive (acts as a status bar) and shows a pink border top `4px solid var(--pink)`. The active phase is highlighted in pink.
- **Banners & Notices**: Custom styling for errors/notices. If an error is active, render a block with `--black` background and white text. Host changes appear as a pink top banner.

### Screen 1: Index (Inicio)
- **Logo Area**: "AMIGOS DE MIERDA" text layout with Anton font (62px), incorporating a rotated "DE" badge matching the mockup.
- **Warning Badge**: Rotated yellow/pink badge reading "ALERTA HUMOR NEGRO 18+".
- **Crear/Unirse Sala Container**: Rotated black card with pink drop-shadow and a wavy clip-path border. Contains:
  1. **Name Input**: Integrated at the top of the card. Text labeled "Tu nombre" in Space Mono.
  2. **Crear Sala Button**: High contrast pink button.
  3. **Separator**: "O" text with line decorations.
  4. **Unirse Sala Button & Code Input**: 4-character monospace code input and "Unirse a sala" button.
- **Rules Section**: Wavy clip-path card with 4-step instructions and vector SVGs.
- **Footer Banner**: Black card with 100% width and pink text.

### Screen 2: Lobby (Lobby)
- **Room Code Card**: Rotated black card displaying the 4-digit room code in 72px pink Anton text.
- **Player List**: Styled "SE BUSCA" section. Each row features a round index badge, the player's name in Permanent Marker font (26px) with a minor rotation, and a pink host tag for the owner.
- **Action Button**: "Iniciar caos" button. Hosts see it active (pink with black border and shadow), guests see it disabled (greyed out).

### Screen 3: Game (Juego)
- **Timer Badge**: Blinking timer display (`Space Mono`, 15px, pink, animation: `adm-blink 1s steps(1) infinite`).
- **Question Card**: Large black card containing the target question in bold white uppercase text (30px). Features a custom clip-path wavy edge.
- **Vote Grid**: A 2-column grid of player selection buttons.
  - Selected player highlights pink and rotates `-1.5deg` with a hard black shadow.
  - Mitigates long names (up to 20 chars) and counts up to 10 players using `clamp()` font-size and `text-overflow: ellipsis`.
- **Confirm Button ("Yo voto")**: Activates once a selection is made. Emits the vote event when clicked.

### Screen 4: Results (Votos)
- **Announcer text**: Header echoing the question.
- **Winner Display Card**: Rotated pink card with a heavy black border (5px) and shadow, showing the round winner's name in Anton (64px) and the count statement ("X de Y votos").
- **Fan Graphic**: Pointing-finger SVGs in a hand fan rotation layout.
- **Winner Details / Tally list**: Real room details displaying voter allocations.
- **Action Button**: "Continuar" button to proceed.

### Screen 5: Leaderboard (Ranking)
- **Title Block**: Styled header with game end condition notice.
- **Tally Table**: Alternating rows showing name and cards won. The leader's row features a crown icon next to their name. Suffixes the score with `/5` cards in muted grey.
- **Action Button**: "Continuar" button.

### Screen 6: GameOver (Fin)
- **Crown Graphic**: Dynamic crown SVG header animating on entry.
- **Podium Layout**: 3-column podium presenting the top 3 players (1st in center, tallest, highlighted pink; 2nd and 3rd on left and right, black background).
- **Secondary list**: Lower-ranked players shown below the podium.
- **Action Buttons**: "Revancha · misma sala" (primary pink, triggers page reload/restart) and "Salir al menú" (white).

---

## 3. Divergence Guidelines

1. **Name Input**: Since the mockup doesn't feature it but the real app requires it, index.tsx must contain a text field for "Nombre". It will be styled as a white input block matching the Room Code input's typography (`Space Mono` bold) but with normal casing.
2. **Two-Step Vote**: Game.tsx will maintain local state `selectedPlayerId`. Clicking a player button in the grid updates `selectedPlayerId` (and toggles its active class) but does *not* trigger the socket emit. Clicking the confirmation button "Yo voto" fires the socket event with `selectedPlayerId` and sets `hasVoted = true`. Self-voting remains disabled.
3. **Phase-Driven Bottom Nav**: Since navigation is server-driven, the bottom nav bar is replaced by a read-only progress strip. The active tab corresponds to the current phase and is highlighted, while inactive tabs remain muted and non-clickable.
