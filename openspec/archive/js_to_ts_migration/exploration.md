# SDD Exploration — JS to TS Migration

## Codebase Analysis
- **Monorepo Structure**: Uses npm workspaces linking `client/` and `server/`.
- **Client**: 
  - Uses Vite + React 19.
  - Dependencies: `react`, `react-dom`, `socket.io-client`.
  - Core files: `src/main.jsx`, `src/App.jsx`, `src/socket.js`.
  - Screens in `src/screens/`: `Index.jsx`, `Lobby.jsx`, `Game.jsx`, `GameOver.jsx`, `Leaderboard.jsx`, `Results.jsx`.
- **Server**:
  - Node.js running Express and Socket.IO.
  - Dependencies: `express`, `socket.io`.
  - Core files: `src/index.js`, `src/socket.js`, `src/rooms.js`, `src/questions.js`.

## Migration Plan
1. Add TypeScript, `@types/react`, `@types/react-dom`, `@types/express` as devDependencies.
2. Initialize `tsconfig.json` for client and `tsconfig.json` for server (or a root one referencing them).
3. Convert all files:
   - Server: `.js` -> `.ts`
   - Client: `.js` -> `.ts`, `.jsx` -> `.tsx`
4. Update `package.json` scripts and config files (e.g. `vite.config.js` -> `vite.config.ts`, adjust entry points if necessary).
5. Ensure type definitions align between client and server for socket communications.
