import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { registerSocketHandlers } from "./socket.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    // In production, same origin — CORS is only needed in dev (Vite proxy handles it).
    origin: process.env.NODE_ENV === "production" ? false : "*",
  },
});

// Routes must be registered before the SPA catch-all or they get shadowed.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Serve the React build in production.
if (process.env.NODE_ENV === "production") {
  const clientDist = join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for any non-API route.
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

registerSocketHandlers(io);

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
