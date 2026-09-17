import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as IOServer } from "socket.io";
import {
  accountSocketRoom,
  setIO,
  APPOINTMENTS_ROOM,
} from "./shared/utils/socket";
import {
  AUTH_COOKIE,
  verifySessionToken,
} from "./shared/utils/session-token";
import { startSriAuthorizationPollWorker } from "./workers/sri-authorization-poll";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function cookieValue(header: string | undefined, name: string) {
  const entry = header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      void handle(req, res, parsedUrl);
    });

    const io = new IOServer(httpServer, {
      path: `${basePath}/socket.io`,
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    setIO(io);

    io.use((socket, nextMiddleware) => {
      const token = cookieValue(socket.handshake.headers.cookie, AUTH_COOKIE);
      const accountId = token ? verifySessionToken(token) : null;
      if (!accountId) {
        nextMiddleware(new Error("No autorizado"));
        return;
      }
      socket.data.accountId = accountId;
      nextMiddleware();
    });

    io.on("connection", (socket) => {
      socket.join(APPOINTMENTS_ROOM);
      socket.join(accountSocketRoom(Number(socket.data.accountId)));
    });

    httpServer.listen(port, hostname, () => {
      console.log(
        `> Scheduly ready on http://${hostname}:${port}${basePath} (socket.io)`,
      );
      console.log("> Runtime: standalone (sin Gestor)");
      startSriAuthorizationPollWorker();
    });
  })
  .catch((err) => {
    console.error("Failed to start custom server", err);
    process.exit(1);
  });
