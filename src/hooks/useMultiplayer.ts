import { useEffect, useRef, useState } from "react";

export type MultiplayerMessage = 
  | { type: "GAME_READY"; state: string; playerCount: number }
  | { type: "OPPONENT_MOVE"; fen: string; move: any }
  | { type: "PLAYER_DISCONNECTED" }
  | { type: "CHAT"; message: string }
  | { type: "ERROR"; message: string };

export function useMultiplayer(roomId: string | null) {
  const [status, setStatus] = useState<"connecting" | "waiting" | "ready" | "disconnected">("disconnected");
  const [opponentMove, setOpponentMove] = useState<{ fen: string, move: any } | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("connecting");
      socket.send(JSON.stringify({ type: "JOIN_ROOM", roomId }));
    };

    socket.onmessage = (event) => {
      try {
        const data: MultiplayerMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case "GAME_READY":
            setStatus("ready");
            setPlayerCount(data.playerCount);
            break;
          case "OPPONENT_MOVE":
            setOpponentMove({ fen: data.fen, move: data.move });
            break;
          case "PLAYER_DISCONNECTED":
            setStatus("waiting");
            setPlayerCount(1);
            break;
          case "ERROR":
            console.error("SOCKET ERROR:", data.message);
            setStatus("disconnected");
            break;
        }
      } catch (e) {
        console.error("MULTIPLAYER PARSE ERROR:", e);
      }
    };

    socket.onclose = () => {
      setStatus("disconnected");
    };

    return () => {
      socket.close();
    };
  }, [roomId]);

  const sendMove = (fen: string, move: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "MOVE", fen, move }));
    }
  };

  return { status, opponentMove, sendMove, playerCount };
}
