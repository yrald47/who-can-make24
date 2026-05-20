import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

if (!SERVER_URL) {
    console.error("VITE_SERVER_URL is not set!");
}

export const socket = io(SERVER_URL ?? "http://localhost:3001", {
    transports: ["websocket", "polling"],
    autoConnect: true,
});
