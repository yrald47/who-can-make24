import type { Room, Player, GamePhase } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";

// State in-memory — nanti bisa dipindah ke Redis
const rooms = new Map<string, Room>();
const playerRoomMap = new Map<string, string>(); // socketId → roomId

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function createRoom(
    name: string,
    mode: Room["mode"],
    isPrivate: boolean,
    host: Player,
): Room {
    const room: Room = {
        id: generateRoomId(),
        name,
        code: isPrivate ? generateRoomCode() : undefined,
        mode,
        isPrivate,
        players: [host],
        maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
        status: "waiting",
    };
    rooms.set(room.id, room);
    playerRoomMap.set(host.id, room.id);
    return room;
}

export function joinRoom(
    roomId: string,
    player: Player,
    code?: string,
): { success: true; room: Room } | { success: false; error: string } {
    const room = rooms.get(roomId);

    if (!room) return { success: false, error: "Room tidak ditemukan" };
    if (room.status !== "waiting")
        return { success: false, error: "Game sudah dimulai" };
    if (room.players.length >= room.maxPlayers)
        return { success: false, error: "Room penuh" };
    if (room.isPrivate && room.code !== code)
        return { success: false, error: "Kode salah" };

    room.players.push(player);
    playerRoomMap.set(player.id, room.id);
    return { success: true, room };
}

export function leaveRoom(
    socketId: string,
): { room: Room; wasHost: boolean } | null {
    const roomId = playerRoomMap.get(socketId);
    if (!roomId) return null;

    const room = rooms.get(roomId);
    if (!room) return null;

    const wasHost = room.players[0]?.id === socketId;
    room.players = room.players.filter((p) => p.id !== socketId);
    playerRoomMap.delete(socketId);

    // Kalau room kosong, hapus
    if (room.players.length === 0) {
        rooms.delete(roomId);
        return null;
    }

    // Kalau host keluar, host dialihkan ke player berikutnya
    if (wasHost && room.players.length > 0) {
        const newHost = room.players[0];
        if (newHost) newHost.isHost = true;
    }

    return { room, wasHost };
}

export function getPublicRooms(): Room[] {
    return Array.from(rooms.values()).filter((r) => !r.isPrivate);
}

export function getRoomByPlayerId(socketId: string): Room | undefined {
    const roomId = playerRoomMap.get(socketId);
    if (!roomId) return undefined;
    return rooms.get(roomId);
}

export function getRoomById(roomId: string): Room | undefined {
    return rooms.get(roomId);
}
