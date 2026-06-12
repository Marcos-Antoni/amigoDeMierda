# SDD Archive — JS to TS Migration

## 1. Migration Overview
The JavaScript codebase of "Amigos de Mierda" was fully converted to TypeScript. This includes all React components and hooks in the client, and Express route/socket handlers in the server.

## 2. Deliverables
- **Type Definitions**:
  - `client/src/types.ts`
  - `server/src/types.ts`
- **Client Configuration & Migrated Code**:
  - `client/tsconfig.json`
  - `client/vite.config.ts`
  - `client/src/main.tsx`
  - `client/src/App.tsx`
  - `client/src/socket.ts`
  - All files in `client/src/screens/` migrated to `.tsx`
- **Server Configuration & Migrated Code**:
  - `server/tsconfig.json`
  - `server/src/index.ts`
  - `server/src/questions.ts`
  - `server/src/rooms.ts`
  - `server/src/socket.ts`
- **Monorepo Build & Run Updates**:
  - `package.json` build scripts updated to sequentially run client and server builds.
  - `server/package.json` scripts updated to build with `tsc` and run dev mode with `tsx watch`.
  - `Dockerfile` updated to copy the compiled node target files and launch the server using `node server/dist/index.js`.
