# AmigosDeMierda

Real-time multiplayer party game — "Who is most likely to...?" for 3–10 players.

## What it is

Players join a room with a 4-letter code. The host starts the game. Each round shows a question and everyone votes for a player. Results, leaderboard, and game-over screens follow.

## Stack

- **Backend:** Node.js + Express + Socket.IO
- **Frontend:** React + Vite + socket.io-client
- **Deploy:** Single container — Express serves the Vite build and WebSocket on the same port

## Running in development

```bash
npm install
npm run dev
```

This starts both the Express server (port 3000) and the Vite dev server (port 5173) concurrently. The Vite proxy forwards `/socket.io` requests to the backend automatically.

## Building for production

```bash
npm run build   # builds the React app into client/dist
npm start       # serves client/dist + WebSocket on PORT (default 3000)
```

## Docker

```bash
docker build -t amigos-de-mierda .
docker run -p 3000:3000 amigos-de-mierda
```

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start server + client in dev mode (concurrently) |
| `npm run build` | Build the React client into `client/dist` |
| `npm start` | Run the production server |
