import { io, Socket } from "socket.io-client";

// Connect to the same origin so it works both in dev (via Vite proxy) and
// in production (Express serves both the app and the WebSocket).
const socket: Socket = io();

export default socket;
