import { Server, Socket } from "socket.io";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import type { Player } from "@who-can-make24/shared";
import {
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicRooms,
    getRoomByPlayerId,
} from "./roomManager";

export function registerRoomHandlers(io: Server, socket: Socket) {
    // Buat player object dari data yang dikirim client
    function makePlayer(name: string, avatar: string): Player {
        return {
            id: socket.id,
            name,
            avatar,
            score: 0,
            isHost: false,
            isMuted: false,
        };
    }

    // CREATE ROOM
    socket.on("room:create", ({ name, roomName, avatar, mode, isPrivate }) => {
        const host: Player = { ...makePlayer(name, avatar), isHost: true };
        const room = createRoom(roomName, mode, isPrivate, host);

        // Join socket ke room channel Socket.io
        socket.join(room.id);

        socket.emit("room:created", { room });
        console.log(`Room created: ${room.name} (${room.id}) by ${host.name}`);
    });

    // JOIN ROOM
    socket.on("room:join", ({ roomId, name, avatar, code }) => {
        const player = makePlayer(name, avatar);
        const result = joinRoom(roomId, player, code);

        if (!result.success) {
            socket.emit("room:error", { message: result.error });
            return;
        }

        socket.join(roomId);

        // Broadcast ke SEMUA di room termasuk yang baru join
        io.to(roomId).emit("room:updated", { room: result.room });

        // Kirim konfirmasi ke yang join
        socket.emit("room:joined", { room: result.room });

        console.log(`${player.name} joined room ${roomId}`);
    });

    // START GAME
    socket.on("game:start", () => {
        console.log(`game:start received from ${socket.id}`);
        const room = getRoomByPlayerId(socket.id);
        console.log(`room found:`, room?.id, room?.players.length);
        // const room = getRoomByPlayerId(socket.id);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player?.isHost) {
            socket.emit("room:error", {
                message: "Hanya host yang bisa memulai game",
            });
            return;
        }

        if (room.players.length < GAME_CONSTANTS.MIN_PLAYERS_CASUAL) {
            socket.emit("room:error", {
                message: `Minimal ${GAME_CONSTANTS.MIN_PLAYERS_CASUAL} pemain`,
            });
            return;
        }

        room.status = "playing";
        console.log("rooms in socket:", [...socket.rooms]);
        io.to(room.id).emit("game:started", { room });
        console.log("game:started emitted to room", room.id);
    });

    // LEAVE ROOM
    socket.on("room:leave", () => {
        const result = leaveRoom(socket.id);
        if (!result) return;

        const { room } = result;
        socket.leave(room.id);
        socket.to(room.id).emit("room:updated", { room });
        console.log(`Player ${socket.id} left room ${room.id}`);
    });

    // LIST ROOMS
    socket.on("room:list", () => {
        socket.emit("room:list", { rooms: getPublicRooms() });
    });

    // Auto leave kalau disconnect
    socket.on("disconnect", () => {
        const result = leaveRoom(socket.id);
        if (!result) return;

        const { room } = result;
        socket.to(room.id).emit("room:updated", { room });
    });
}
