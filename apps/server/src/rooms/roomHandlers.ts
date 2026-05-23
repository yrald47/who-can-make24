import { Server, Socket } from "socket.io";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import type { Player } from "@who-can-make24/shared";
import {
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicRooms,
    getRoomByPlayerId,
    rejoinRoom,
    getRoomById,
    updateRoom,
} from "./roomManager.redis";
import { registerGameHandlers, startTimer } from "../game/gameHandlers";
import { initGameState, deleteGameState, getGameState } from "../game/gameManager";

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
    socket.on("room:create", async ({ name, roomName, avatar, mode, isPrivate }) => {
        const host: Player = { ...makePlayer(name, avatar), isHost: true };
        const room = await createRoom(roomName, mode, isPrivate, host);

        // Join socket ke room channel Socket.io
        socket.join(room.id);
        if (!isPrivate) {
            io.emit("room:list-update", { room }); // ← tambah ini
        }

        socket.emit("room:created", { room });
        console.log(`Room created: ${room.name} (${room.id}) by ${host.name}`);
    });

    // JOIN ROOM
    socket.on("room:join", async ({ roomId, name, avatar, code }) => {
        const player = makePlayer(name, avatar);
        const result = await joinRoom(roomId, player, code);

        if (!result.success) {
            socket.emit("room:error", { message: result.error });
            return;
        }

        socket.join(roomId);

        // Broadcast ke SEMUA di room termasuk yang baru join
        io.to(roomId).emit("room:updated", { room: result.room });
        io.to(roomId).emit("game:log", {
            text: `${player.name} joined the room`,
            timestamp: Date.now(),
        });

        // Kirim konfirmasi ke yang join
        socket.emit("room:joined", { room: result.room });

        console.log(`${player.name} joined room ${roomId}`);
    });

    // RECONNECT
    socket.on(
        "room:reconnect",
        async ({
            roomId,
            name,
            avatar,
            oldSocketId,
        }: {
            roomId: string;
            name: string;
            avatar: string;
            oldSocketId?: string;
        }) => {
            console.log(
                `room:reconnect received - roomId: ${roomId}, name: ${name}, oldSocketId: ${oldSocketId}`,
            );
            const room = await getRoomById(roomId);
            console.log(
                `room found: ${room?.id}, players: ${JSON.stringify(room?.players.map((p) => p.id))}`,
            );

            if (!room) {
                socket.emit("room:reconnect-failed");
                return;
            }

            const oldPlayer = room.players.find((p) => p.id === oldSocketId);
            const preservedIsHost = oldPlayer?.isHost ?? false;

            const gameState = getGameState(roomId);
            const preservedScore = gameState?.scores[oldSocketId ?? ""] ?? oldPlayer?.score ?? 0;
            
            // const preservedScore = oldPlayer?.score ?? 0;
            const player = makePlayer(name, avatar);
            player.score = preservedScore;
            player.isHost = preservedIsHost;
            const result = await rejoinRoom(roomId, player, oldSocketId);

            if (!result.success) {
                socket.emit("room:reconnect-failed");
                return;
            }

            if (gameState && oldSocketId) {
                const oldScore = gameState.scores[oldSocketId] ?? 0;
                gameState.scores[socket.id] = oldScore;
                delete gameState.scores[oldSocketId];

                gameState.bellPressers = gameState.bellPressers.map((id) =>
                    id === oldSocketId ? socket.id : id,
                );

                gameState.candidates = gameState.candidates.map((id) =>
                    id === oldSocketId ? socket.id : id,
                );
            }

            socket.join(roomId);
            socket.emit("room:joined", { room: result.room });
            io.to(roomId).emit("room:updated", { room: result.room });

            // Kalau game sedang berlangsung, kirim current game state
            if (room.status === "playing" && gameState) {
                // const gameState = getGameState(roomId);
                if (gameState) {
                    socket.emit("game:reconnect", {
                        gameState,
                        phase: gameState.phase,
                        timer: gameState.timer,
                        startTime: gameState.startTime,
                    });
                }
            }
        },
    );

    // START GAME
    socket.on("game:start", async () => {
        console.log(`game:start received from ${socket.id}`);
        const room = await getRoomByPlayerId(socket.id);
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
        await updateRoom(room);
        console.log("rooms in socket:", [...socket.rooms]);
        // io.to(room.id).emit("game:started", { room });
        const playerIds = room.players.map((p) => p.id);
        const gameState = initGameState(room.id, playerIds);

        io.to(room.id).emit("game:started", { room });
        io.to(room.id).emit("game:log", {
            text: `Game started! ${room.players.length} players`,
            timestamp: Date.now(),
        });

        // Mulai ronde pertama setelah 1 detik
        setTimeout(() => {
            io.to(room.id).emit("game:round-start", {
                cards: gameState.currentCards,
                round: gameState.round,
                deckRemaining: gameState.deck.length,
                timer: gameState.timer,
                startTime: gameState.startTime,
            });
            startTimer(io, room.id);
        }, 1000);
        console.log("game:started emitted to room", room.id);
    });

    // LEAVE ROOM
    socket.on("room:leave", async () => {
        const currentRoom = await getRoomByPlayerId(socket.id);
        const roomId = currentRoom?.id;
        const result = await leaveRoom(socket.id);

        if (result) {
            // Room masih ada, broadcast update
            const { room } = result;
            console.log(
                `Player left, room still exists: ${room.id}, players: ${room.players.length}`,
            );
            console.log(`Emitting room:list-update to ALL connected clients`);
            io.to(room.id).emit("room:updated", { room });
            socket.leave(room.id);
            io.emit("room:list-update", { room });
        } else if (roomId) {
            console.log(`Room empty, removing: ${roomId}`);
            // Room kosong dan sudah dihapus — cleanup game state
            socket.leave(roomId);
            deleteGameState(roomId);
            // Broadcast room list update ke semua client di landing page
            io.emit("room:removed", { roomId });
        }

        console.log(`Player ${socket.id} left`);

        // if (!result) return;

        // const { room } = result;
        // socket.leave(room.id);
        // socket.to(room.id).emit("room:updated", { room });

        // if (room.players.length === 0) {
        //     deleteGameState(room.id);
        // }

        // console.log(`Player ${socket.id} left room ${room.id}`);
    });

    socket.on("game:return-to-lobby", async () => {
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        // Hanya host yang bisa trigger return to lobby
        const player = room.players.find((p) => p.id === socket.id);
        if (!player?.isHost) return;

        room.status = "waiting";
        await updateRoom(room);
        deleteGameState(room.id);
        io.to(room.id).emit("game:lobby-returned", { room });
    });

    // LIST ROOMS
    socket.on("room:list", async () => {
        // socket.emit("room:list", { rooms: getPublicRooms() });
        const rooms = await getPublicRooms();
        socket.emit("room:list", { rooms });
    });

    // Auto leave kalau disconnect
    socket.on("disconnect", async () => {
        console.log(`Disconnect handler called for ${socket.id}`);
        const currentRoom = await getRoomByPlayerId(socket.id);
        console.log(`Room found for disconnecting player: ${currentRoom?.id}`);

        if (!currentRoom) return;

        // Tandai player sebagai disconnected tapi JANGAN hapus dari room
        const player = currentRoom.players.find((p) => p.id === socket.id);
        if (player) {
            (player as any).disconnected = true;
            await updateRoom(currentRoom);
            io.to(currentRoom.id).emit("room:updated", { room: currentRoom });
            io.emit("room:list-update", { room: currentRoom });
        }
    });
}
