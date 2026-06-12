# SDD Specification — JS to TS Migration

## 1. Environment & Package Requirements

### Client Dependencies (client/package.json)
- `devDependencies` additions:
  - `typescript`
  - `@types/react`
  - `@types/react-dom`

### Server Dependencies (server/package.json)
- `devDependencies` additions:
  - `typescript`
  - `tsx`
  - `@types/express`
  - `@types/node`

### Compilation Constraints
- Client build script: `tsc && vite build`
- Server build script: `tsc`
- Root build script: Build both client and server: `npm run build --workspace=client && npm run build --workspace=server`
- Production run: `node server/dist/index.js` (requires updating `Dockerfile`)

## 2. Code Quality & Strictness
- `"strict": true` enabled in both `client/tsconfig.json` and `server/tsconfig.json`.
- No `any` type usage where avoidable. Proper type safety for Socket.io events.
- Code must build clean without TypeScript errors or warnings.
