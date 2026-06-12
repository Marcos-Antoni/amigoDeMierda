# SDD Design — JS to TS Migration

## 1. Type Definitions

We will define `Player` and `GameState` (client-side `RoomState`) as key interfaces:

```typescript
export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface GameState {
  code: string;
  hostId: string;
  players: Player[];
  phase: 'lobby' | 'question' | 'results' | 'leaderboard' | 'gameover';
  currentQuestion: string | null;
  votes: Record<string, string>; // voterId -> targetId
}
```

### Type Sharing Design Decision (Avoid Gotchas)
To avoid the TypeScript compilation gotcha where importing from a root `shared/` directory forces `tsc` on the server to output a nested `dist/server/src/` structure instead of a flat `dist/`, we will define types:
1. Client-side types in `client/src/types.ts`
2. Server-side types in `server/src/types.ts`

This keeps both client and server compilations isolated, clean, and easily runnable/deployable.

## 2. Server tsconfig.json Design
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

## 3. Client tsconfig.json Design
We will use Vite's standard TypeScript configuration:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```
