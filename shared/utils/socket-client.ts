"use client";

import { io, type Socket } from "socket.io-client";

let shared: Socket | null = null;

function socketPath() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/socket.io`;
}

/** Una sola conexión Socket.io compartida en el cliente */
export function getClientSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("getClientSocket solo en el navegador");
  }
  if (!shared) {
    shared = io({
      path: socketPath(),
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  if (!shared.connected) {
    shared.connect();
  }
  return shared;
}
