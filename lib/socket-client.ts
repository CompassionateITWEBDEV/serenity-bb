import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  // Important: hit the API route once to ensure server is initialized in dev
  if (typeof window !== "undefined") {
    fetch("/api/socket");
  }

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
    path: "/api/socket_io",
    transports: ["websocket"],
  });

  return socket;
}
