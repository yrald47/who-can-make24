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
import {
    registerGameHandlers,
    startTimer,
    checkAndOfferPvp,
    startPvpTimer,
} from "../game/gameHandlers";
import {
    initGameState,
    deleteGameState,
    getGameState,
    clearRoomTimer,
    initPvpState,
} from "../game/gameManager";

export function registerRoomHandlers(io: Server, socket: Socket) {
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
    socket.on(
        "room:create",
        async ({ name, roomName, avatar, mode, isPrivate, isWild }) => {
            const host: Player = { ...makePlayer(name, avatar), isHost: true };
            const room = await createRoom(
                roomName,
                mode,
                isPrivate,
                host,
                isWild ?? false,
            ); // ← isWild

            socket.join(room.id);
            if (!isPrivate) {
                io.emit("room:list-update", { room });
            }

            socket.emit("room:created", { room });
            console.log(
                `Room created: ${room.name} (${room.id}) by ${host.name} [wild: ${room.isWild}]`,
            );
        },
    );

    // JOIN ROOM
    socket.on("room:join", async ({ roomId, name, avatar, code, viaLink }) => {
        const player = makePlayer(name, avatar);
        const result = await joinRoom(roomId, player, code);

        if (!result.success) {
            socket.emit("room:error", { message: result.error });
            return;
        }

        socket.join(roomId);
        io.to(roomId).emit("room:updated", { room: result.room });
        io.to(roomId).emit("game:log", {
            text: viaLink
                ? `${player.name} joined via share link 🔗`
                : `${player.name} joined the room`,
            timestamp: Date.now(),
        });
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
            const preservedScore =
                gameState?.scores[oldSocketId ?? ""] ?? oldPlayer?.score ?? 0;

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

            if (room.status === "playing" && gameState) {
                socket.emit("game:reconnect", {
                    gameState,
                    phase: gameState.phase,
                    timer: gameState.timer,
                    startTime: gameState.startTime,
                });
            }
        },
    );

    // START GAME
    socket.on("game:start", async () => {
        console.log(`game:start received from ${socket.id}`);
        const room = await getRoomByPlayerId(socket.id);
        console.log(`room found:`, room?.id, room?.players.length);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player?.isHost) {
            socket.emit("room:error", {
                message: "Hanya host yang bisa memulai game",
            });
            return;
        }

        const minPlayers =
            room.mode === "pvp"
                ? GAME_CONSTANTS.MIN_PLAYERS_PVP
                : GAME_CONSTANTS.MIN_PLAYERS_CASUAL;

        if (room.players.length < minPlayers) {
            socket.emit("room:error", {
                message: `Minimal ${minPlayers} pemain`,
            });
            return;
        }

        room.status = "playing";
        await updateRoom(room);

        const playerIds = room.players.map((p) => p.id);
        const gameState = initGameState(room.id, playerIds, room.isWild); // ← pass isWild

        if (room.mode === "pvp") {
            initPvpState(room.id);
        }

        const currentState = getGameState(room.id)!;

        io.to(room.id).emit("game:started", { room });
        io.to(room.id).emit("game:log", {
            text: `Game started! ${room.players.length} players${room.isWild ? " • Wild Mode 🃏" : ""}`,
            timestamp: Date.now(),
        });

        if (room.mode === "pvp") {
            io.to(room.id).emit("game:pvp-started", {
                scores: currentState.scores,
                isWild: currentState.isWild,
            });
        }

        setTimeout(() => {
            io.to(room.id).emit("game:round-start", {
                cards: gameState.currentCards,
                round: gameState.round,
                deckRemaining: gameState.deck.length,
                timer: gameState.timer,
                startTime: gameState.startTime,
            });
            // startTimer(io, room.id);
            if (room.mode === "pvp") {
                startPvpTimer(io, room.id);
            } else {
                startTimer(io, room.id);
            }
        }, 1000);

        console.log("game:started emitted to room", room.id);
    });

    // LEAVE ROOM
    socket.on("room:leave", async () => {
        const currentRoom = await getRoomByPlayerId(socket.id);
        const roomId = currentRoom?.id;

        // Cek apakah sedang PVP — kalau iya, yang leave = coward
        if (currentRoom?.status === "playing") {
            const gameState = getGameState(currentRoom.id);
            if (gameState?.isPvp) {
                clearRoomTimer(currentRoom.id);

                // Yang stay menang otomatis
                const winner = currentRoom.players.find(
                    (p) => p.id !== socket.id,
                );
                const loser = currentRoom.players.find(
                    (p) => p.id === socket.id,
                );

                if (winner && loser) {
                    // const finalScores = { ...gameState.scores };
                    const finalScores: Record<string, number> = {};
                    for (const p of currentRoom.players) {
                        finalScores[p.id] = gameState.scores[p.id] ?? 0;
                    }
                    finalScores[loser.id] = 0;
                    io.to(currentRoom.id).emit("game:log", {
                        text: `${loser.name} left the game — coward! ${winner.name} wins!`,
                        timestamp: Date.now(),
                    });

                    io.to(currentRoom.id).emit("game:pvp-coward", {
                        loserId: loser.id,
                        loserName: loser.name,
                        winnerId: winner.id,
                        scores: finalScores,
                        players: currentRoom.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
                    });
                }

                deleteGameState(currentRoom.id);
            }
        }

        const result = await leaveRoom(socket.id);

        if (result) {
            const { room } = result;
            io.to(room.id).emit("room:updated", { room });
            socket.leave(room.id);
            io.emit("room:list-update", { room });

            // Cek apakah perlu offer PVP
            if (room.status === "playing" && room.players.length === 2) {
                await checkAndOfferPvp(io, room.id);
            }
        } else if (roomId) {
            socket.leave(roomId);
            deleteGameState(roomId);
            io.emit("room:removed", { roomId });
        }

        console.log(`Player ${socket.id} left`);
    });

    // RETURN TO LOBBY
    socket.on("game:return-to-lobby", async () => {
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player?.isHost) return;

        room.status = "waiting";
        await updateRoom(room);
        deleteGameState(room.id);
        io.to(room.id).emit("game:lobby-returned", { room });
    });

    // LIST ROOMS
    socket.on("room:list", async () => {
        const rooms = await getPublicRooms();
        socket.emit("room:list", { rooms });
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
        console.log(`Disconnect handler called for ${socket.id}`);
        const currentRoom = await getRoomByPlayerId(socket.id);
        console.log(`Room found for disconnecting player: ${currentRoom?.id}`);

        if (!currentRoom) return;

        const player = currentRoom.players.find((p) => p.id === socket.id);
        if (player) {
            (player as any).disconnected = true;
            await updateRoom(currentRoom);
            io.to(currentRoom.id).emit("room:updated", { room: currentRoom });
            io.emit("room:list-update", { room: currentRoom });

            // Cek apakah perlu offer PVP
            // Hitung player yang masih aktif (tidak disconnected)
            const activePlayers = currentRoom.players.filter(
                (p) => !(p as any).disconnected,
            );
            if (
                currentRoom.status === "playing" &&
                activePlayers.length === 2
            ) {
                await checkAndOfferPvp(io, currentRoom.id);
            }
        }
    });
}
