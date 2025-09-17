import type { Server as HTTPServer } from "http";
import type { Socket } from "net";
import type { Server as IOServer } from "socket.io";

export type NextApiResponseServerIO = {
  socket: Socket & {
    server: HTTPServer & {
      io?: IOServer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _rtStore?: any;
    };
  };
  end: (data?: any) => void;
} & import("next").NextApiResponse;
