import { Hono } from "hono";
import { createServer } from "http";
import { serve } from "@hono/node-server";
import { Server } from "socket.io";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import { registerRoomHandlers } from "./rooms/roomHandlers";
import { registerGameHandlers } from "./game/gameHandlers";

const app = new Hono();

app.get("/", (c) => {
    return c.json({
        message: "Who Can Make24? Server is alive!",
        targetNumber: GAME_CONSTANTS.TARGET_NUMBER,
    });
});

// Buat HTTP server via @hono/node-server
const server = serve({ fetch: app.fetch, port: 3001, hostname: "0.0.0.0" }, () => {
    console.log("Server running on http://localhost:3001");
});

// Socket.io duduk di atas server yang sama
const io = new Server(server as any, {
    cors: {
        // origin: "http://localhost:5173",
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
});
