import { Hono } from "hono";
import { createServer } from "http";
import { Server } from "socket.io";
import { GAME_CONSTANTS } from "@who-can-make24/shared";

// Hono untuk REST API
const app = new Hono();

app.get("/", (c) => {
    return c.json({
        message: "Who Can Make24? Server is alive!",
        targetNumber: GAME_CONSTANTS.TARGET_NUMBER,
    });
});

// Buat HTTP server dari Hono
const server = createServer((req, res) => {
    app.fetch(new Request(`http://localhost${req.url}`)).then((honoRes) => {
        res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers));
        honoRes.text().then((body) => res.end(body));
    });
});

// Socket.io duduk di atas HTTP server yang sama
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // alamat client Vite
        methods: ["GET", "POST"],
    },
});

// Event pertama — test koneksi
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
    });
});

// Jalankan server di port 3001
server.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});
