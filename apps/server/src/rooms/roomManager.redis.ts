import type { Room, Player } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import { redis, KEYS } from "../lib/redis";
import { randomBytes } from "crypto";

function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(6);
    return Array.from(bytes)
        .map((b) => chars[b % chars.length]!)
        .join("");
}

function parseRoom(raw: unknown): Room {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as Room);
}

export async function createRoom(
    name: string,
    mode: Room["mode"],
    isPrivate: boolean,
    host: Player,
    isWild: boolean = false,
): Promise<Room> {
    const room: Room = {
        id: generateRoomId(),
        name,
        code: isPrivate ? generateRoomCode() : undefined,
        mode,
        isPrivate,
        isWild,
        players: [host],
        maxPlayers:
            mode === "pvp"
                ? GAME_CONSTANTS.MIN_PLAYERS_PVP
                : GAME_CONSTANTS.MAX_PLAYERS,
        status: "waiting",
    };

    // Pipeline: set room + set playerRoom + sadd allRooms
    const pipeline = redis.pipeline();
    pipeline.set(KEYS.room(room.id), JSON.stringify(room));
    pipeline.set(KEYS.playerRoom(host.id), room.id);
    pipeline.sadd(KEYS.allRooms, room.id);
    await pipeline.exec();

    return room;
}

export async function joinRoom(
    roomId: string,
    player: Player,
    code?: string,
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
    const raw = await redis.get<string>(KEYS.room(roomId));
    if (!raw) return { success: false, error: "Room tidak ditemukan" };

    const room = parseRoom(raw);
    const effectiveMax =
        room.mode === "pvp" ? GAME_CONSTANTS.MIN_PLAYERS_PVP : room.maxPlayers;

    if (room.status !== "waiting")
        return { success: false, error: "Game sudah dimulai" };
    if (room.players.length >= effectiveMax)
        return { success: false, error: "Room penuh" };
    if (room.isPrivate && room.code !== code)
        return { success: false, error: "Kode salah" };

    room.players.push(player);

    // Pipeline: set room + set playerRoom
    const pipeline = redis.pipeline();
    pipeline.set(KEYS.room(room.id), JSON.stringify(room));
    pipeline.set(KEYS.playerRoom(player.id), room.id);
    await pipeline.exec();

    return { success: true, room };
}

export async function leaveRoom(
    socketId: string,
): Promise<{ room: Room; wasHost: boolean } | null> {
    const roomId = await redis.get<string>(KEYS.playerRoom(socketId));
    if (!roomId) return null;

    const raw = await redis.get<string>(KEYS.room(roomId as string));
    if (!raw) return null;

    const room = parseRoom(raw);
    const wasHost = room.players[0]?.id === socketId;

    room.players = room.players.filter((p) => p.id !== socketId);

    if (room.players.length === 0) {
        // Pipeline: del room + del playerRoom + srem allRooms
        const pipeline = redis.pipeline();
        pipeline.del(KEYS.playerRoom(socketId));
        pipeline.del(KEYS.room(roomId as string));
        pipeline.srem(KEYS.allRooms, roomId);
        await pipeline.exec();
        return null;
    }

    if (wasHost && room.players.length > 0) {
        const newHost = room.players[0];
        if (newHost) newHost.isHost = true;
    }

    // Pipeline: set room + del playerRoom
    const pipeline = redis.pipeline();
    pipeline.set(KEYS.room(room.id), JSON.stringify(room));
    pipeline.del(KEYS.playerRoom(socketId));
    await pipeline.exec();

    return { room, wasHost };
}

export async function deleteRoom(roomId: string): Promise<void> {
    const raw = await redis.get<string>(KEYS.room(roomId));

    const pipeline = redis.pipeline();
    if (raw) {
        const room = parseRoom(raw);
        for (const player of room.players) {
            pipeline.del(KEYS.playerRoom(player.id));
        }
    }
    pipeline.del(KEYS.room(roomId));
    pipeline.srem(KEYS.allRooms, roomId);
    await pipeline.exec();
}

export async function getPublicRooms(): Promise<Room[]> {
    const roomIds = await redis.smembers(KEYS.allRooms);
    if (!roomIds || roomIds.length === 0) return [];

    const rooms: Room[] = [];
    for (const id of roomIds) {
        const raw = await redis.get<string>(KEYS.room(id as string));
        if (raw) {
            const room = parseRoom(raw);
            if (!room.isPrivate) rooms.push(room);
        }
    }
    return rooms;
}

export async function getRoomByPlayerId(
    socketId: string,
): Promise<Room | undefined> {
    const roomId = await redis.get<string>(KEYS.playerRoom(socketId));
    if (!roomId) return undefined;
    return getRoomById(roomId as string);
}

export async function getRoomById(roomId: string): Promise<Room | undefined> {
    const raw = await redis.get<string>(KEYS.room(roomId));
    if (!raw) return undefined;
    return parseRoom(raw);
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

    const room = parseRoom(raw);

    if (oldSocketId) {
        room.players = room.players.filter((p) => p.id !== oldSocketId);
        // Del old playerRoom dulu sebelum pipeline write baru
        await redis.del(KEYS.playerRoom(oldSocketId));
    }

    if (room.players.length >= room.maxPlayers) {
        return { success: false, error: "Room penuh" };
    }

    room.players.push(player);

    // Pipeline: set room + set playerRoom
    const pipeline = redis.pipeline();
    pipeline.set(KEYS.room(room.id), JSON.stringify(room));
    pipeline.set(KEYS.playerRoom(player.id), room.id);
    await pipeline.exec();

    return { success: true, room };
}
