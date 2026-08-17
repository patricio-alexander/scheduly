import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as IOServer } from "socket.io";
import { setIO, TASKS_ROOM, APPOINTMENTS_ROOM } from "./shared/utils/socket";
import { startSriAuthorizationPollWorker } from "./workers/sri-authorization-poll";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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

    io.on("connection", (socket) => {
      socket.join(TASKS_ROOM);
      socket.join(APPOINTMENTS_ROOM);
    });

    httpServer.listen(port, () => {
      console.log(
        `> Scheduly ready on http://${hostname}:${port}${basePath} (socket.io)`,
      );
      startSriAuthorizationPollWorker();
    });
  })
  .catch((err) => {
    console.error("Failed to start custom server", err);
    process.exit(1);
  });
