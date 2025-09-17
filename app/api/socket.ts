import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "../../types/next";
import { Server as IOServer, Socket } from "socket.io";

type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: number;
};

type ServerStore = {
  rooms: Map<string, ChatMessage[]>;
};

const getStore = (res: NextApiResponseServerIO): ServerStore => {
  // @ts-ignore - attach store to server instance
  if (!res.socket.server._rtStore) {
    // @ts-ignore
    res.socket.server._rtStore = { rooms: new Map<string, ChatMessage[]>() };
  }
  // @ts-ignore
  return res.socket.server._rtStore as ServerStore;
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: { origin: true, credentials: true },
    });
    res.socket.server.io = io;

    const store = getStore(res);

    const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

    io.on("connection", (socket: Socket) => {
      socket.on("join", (roomId: string) => {
        socket.join(roomId);
        const history = store.rooms.get(roomId) ?? [];
        socket.emit("history", { roomId, messages: history.slice(-100) });
      });

      socket.on("leave", (roomId: string) => {
        socket.leave(roomId);
      });

      socket.on("message:send", (payload: { roomId: string; senderId: string; content: string; clientId?: string }) => {
        const { roomId, senderId, content, clientId } = payload;
        const msg: ChatMessage = {
          id: makeId(),
          roomId,
          senderId,
          content,
          timestamp: Date.now(),
        };
        const list = store.rooms.get(roomId) ?? [];
        list.push(msg);
        store.rooms.set(roomId, list);
        // Echo back to sender for ack (tie to optional clientId)
        socket.emit("message:ack", { roomId, clientId, serverId: msg.id, timestamp: msg.timestamp });
        // Broadcast to room
        socket.to(roomId).emit("message:new", msg);
      });

      socket.on("disconnect", () => {
        // no-op
      });
    });
  }

  res.end();
}
