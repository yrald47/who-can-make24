import { Hono } from "hono";
import { createServer } from "http";
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

// Native HTTP server
const httpServer = createServer();

// Socket.io di atas HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
});

// Hono handle HTTP requests
httpServer.on("request", async (req, res) => {
    // Skip kalau Socket.io sudah handle (path /socket.io/)
    if (req.url?.startsWith("/socket.io")) return;

    const honoRes = await app.fetch(
        new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as any,
        }),
    );
    res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers));
    const body = await honoRes.text();
    res.end(body);
});

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
});

httpServer.listen(3001, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3001");
});
