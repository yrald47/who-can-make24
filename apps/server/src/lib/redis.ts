import { Redis } from "@upstash/redis";

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key helpers
export const KEYS = {
    room: (roomId: string) => `room:${roomId}`,
    playerRoom: (socketId: string) => `player:${socketId}:room`,
    allRooms: "rooms:all", // Set berisi semua roomId
};
