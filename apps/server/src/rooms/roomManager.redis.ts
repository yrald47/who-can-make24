import type { Room, Player } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import { redis, KEYS } from "../lib/redis";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createRoom(
    name: string,
    mode: Room["mode"],
    isPrivate: boolean,
    host: Player,
): Promise<Room> {
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

    // Simpan room sebagai JSON string
    await redis.set(KEYS.room(room.id), JSON.stringify(room));
    // Track socket → roomId
    await redis.set(KEYS.playerRoom(host.id), room.id);
    console.log(`Redis: saved playerRoom ${host.id} → ${room.id}`);
    // Tambah ke set semua rooms
    await redis.sadd(KEYS.allRooms, room.id);

    return room;
}

export async function joinRoom(
    roomId: string,
    player: Player,
    code?: string,
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
    const raw = await redis.get<string>(KEYS.room(roomId));
    if (!raw) return { success: false, error: "Room tidak ditemukan" };

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (room.status !== "waiting")
        return { success: false, error: "Game sudah dimulai" };
    if (room.players.length >= room.maxPlayers)
        return { success: false, error: "Room penuh" };
    if (room.isPrivate && room.code !== code)
        return { success: false, error: "Kode salah" };

    room.players.push(player);

    await redis.set(KEYS.room(room.id), JSON.stringify(room));
    await redis.set(KEYS.playerRoom(player.id), room.id);

    return { success: true, room };
}

export async function leaveRoom(
    socketId: string,
): Promise<{ room: Room; wasHost: boolean } | null> {
    const roomId = await redis.get<string>(KEYS.playerRoom(socketId));
    if (!roomId) return null;

    const raw = await redis.get<string>(KEYS.room(roomId as string));
    if (!raw) return null;

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;
    const wasHost = room.players[0]?.id === socketId;

    room.players = room.players.filter((p) => p.id !== socketId);
    await redis.del(KEYS.playerRoom(socketId));

    if (room.players.length === 0) {
        await redis.del(KEYS.room(roomId as string));
        await redis.srem(KEYS.allRooms, roomId);
        return null;
    }

    if (wasHost && room.players.length > 0) {
        const newHost = room.players[0];
        if (newHost) newHost.isHost = true;
    }

    await redis.set(KEYS.room(room.id), JSON.stringify(room));
    return { room, wasHost };
}

export async function getPublicRooms(): Promise<Room[]> {
    const roomIds = await redis.smembers(KEYS.allRooms);
    if (!roomIds || roomIds.length === 0) return [];

    const rooms: Room[] = [];
    for (const id of roomIds) {
        const raw = await redis.get<string>(KEYS.room(id as string));
        if (raw) {
            const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (!room.isPrivate) rooms.push(room);
        }
    }
    return rooms;
}

export async function getRoomByPlayerId(
    socketId: string,
): Promise<Room | undefined> {
    const roomId = await redis.get<string>(KEYS.playerRoom(socketId));
    console.log(`Redis: getRoomByPlayerId ${socketId} → ${roomId}`);

    if (!roomId) return undefined;
    return getRoomById(roomId as string);
}

export async function getRoomById(roomId: string): Promise<Room | undefined> {
    const raw = await redis.get<string>(KEYS.room(roomId));
    if (!raw) return undefined;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function updateRoom(room: Room): Promise<void> {
    await redis.set(KEYS.room(room.id), JSON.stringify(room));
}

export async function rejoinRoom(
    roomId: string,
    player: Player,
    oldSocketId?: string,
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
    const raw = await redis.get<string>(KEYS.room(roomId));
    if (!raw) return { success: false, error: "Room tidak ditemukan" };

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (oldSocketId) {
        room.players = room.players.filter((p) => p.id !== oldSocketId);
        await redis.del(KEYS.playerRoom(oldSocketId));
    }

    if (room.players.length >= room.maxPlayers) {
        return { success: false, error: "Room penuh" };
    }

    room.players.push(player);
    await redis.set(KEYS.room(room.id), JSON.stringify(room));
    await redis.set(KEYS.playerRoom(player.id), room.id);

    return { success: true, room };
}
