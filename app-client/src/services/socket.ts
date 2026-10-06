import { BASE_URL } from "./api";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = BASE_URL;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket"],
});
