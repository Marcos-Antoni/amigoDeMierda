# SDD Proposal — JS to TS Migration

## 1. Objectives
- Convert the entire monorepo from JavaScript to TypeScript.
- Set up proper compilation and type checking.
- Keep the runtime behavior identical (0 functional changes).

## 2. Structural Changes

### Client (Vite + React)
- Install dev dependencies: `typescript`, `@types/react`, `@types/react-dom`.
- Add `client/tsconfig.json` and `client/tsconfig.node.json`.
- Rename `client/src/main.jsx` -> `client/src/main.tsx`.
- Update `client/index.html` script reference: `src/main.jsx` -> `src/main.tsx`.
- Rename all components in `client/src/screens/` and `client/src/App.jsx` to `.tsx`.
- Rename `client/src/socket.js` to `client/src/socket.ts`.

### Server (Node.js + Express + Socket.io)
- Install dev dependencies: `typescript`, `@types/express`, `@types/node`, `tsx`.
- Add `server/tsconfig.json`.
- Rename `server/src/index.js` -> `server/src/index.ts`.
- Rename other files to `.ts`.
- Update dev command to use `tsx watch src/index.ts` for native TypeScript execution.
- Update start/build commands.

### Shared / Socket Types
- Define a unified `types.ts` (or share typing for `RoomState` / `Player`).
