import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Simple game state management for multiplayer
  const games = new Map<string, {
    players: WebSocket[];
    state: string; // FEN
  }>();

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case "JOIN_ROOM":
            const roomId = data.roomId;
            if (!games.has(roomId)) {
              games.set(roomId, { players: [ws], state: "start" });
            } else {
              const game = games.get(roomId)!;
              if (game.players.length < 2) {
                game.players.push(ws);
                // Notify both players
                game.players.forEach(p => p.send(JSON.stringify({ 
                  type: "GAME_READY", 
                  state: game.state,
                  playerCount: game.players.length
                })));
              } else {
                ws.send(JSON.stringify({ type: "ERROR", message: "Room full" }));
                return;
              }
            }
            currentRoom = roomId;
            break;

          case "MOVE":
            if (currentRoom && games.has(currentRoom)) {
              const game = games.get(currentRoom)!;
              game.state = data.fen;
              // Broadcast move to other players in room
              game.players.forEach(p => {
                if (p !== ws) {
                  p.send(JSON.stringify({ type: "OPPONENT_MOVE", fen: data.fen, move: data.move }));
                }
              });
            }
            break;
            
          case "CHAT":
              if (currentRoom && games.has(currentRoom)) {
                const game = games.get(currentRoom)!;
                game.players.forEach(p => {
                  if (p !== ws) {
                    p.send(JSON.stringify({ type: "CHAT", message: data.message }));
                  }
                });
              }
              break;
          
          default:
            console.log("[SERVER] UNKNOWN MESSAGE TYPE:", data.type);
        }
      } catch (e) {
        console.error("[SERVER] MESSAGE PROCESSING ERROR:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoom && games.has(currentRoom)) {
        const game = games.get(currentRoom)!;
        game.players = game.players.filter(p => p !== ws);
        if (game.players.length === 0) {
          games.delete(currentRoom);
        } else {
          game.players.forEach(p => p.send(JSON.stringify({ type: "PLAYER_DISCONNECTED" })));
        }
      }
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "system_online", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] NEURO-SERVER ONLINE AT PORT ${PORT}`);
  });
}

startServer();
