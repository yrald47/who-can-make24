type RateLimitConfig = {
    maxEvents: number;
    windowMs: number;
};

function createRateLimiter(config: RateLimitConfig) {
    return {
        attempts: new Map<string, number[]>(),

        isAllowed(socketId: string): boolean {
            const now = Date.now();
            const timestamps = this.attempts.get(socketId) ?? [];
            const recent = timestamps.filter((t) => now - t < config.windowMs);

            if (recent.length >= config.maxEvents) return false;

            recent.push(now);
            this.attempts.set(socketId, recent);
            return true;
        },

        clear(socketId: string): void {
            this.attempts.delete(socketId);
        },
    };
}

// Game events
export const bellRateLimiter = createRateLimiter({
    maxEvents: 1,
    windowMs: 500,
});
export const chatRateLimiter = createRateLimiter({
    maxEvents: 5,
    windowMs: 3000,
});
export const proofRateLimiter = createRateLimiter({
    maxEvents: 3,
    windowMs: 5000,
});
export const pvpProofRateLimiter = createRateLimiter({
    maxEvents: 10,
    windowMs: 5000,
});
export const surrenderRateLimiter = createRateLimiter({
    maxEvents: 1,
    windowMs: 5000,
});
export const pvpVoteRateLimiter = createRateLimiter({
    maxEvents: 1,
    windowMs: 3000,
});

// Room events
export const createRoomRateLimiter = createRateLimiter({
    maxEvents: 3,
    windowMs: 30000,
});
export const joinRateLimiter = createRateLimiter({
    maxEvents: 3,
    windowMs: 10000,
});

export const pointRateLimiter = createRateLimiter({
    maxEvents: 1,
    windowMs: 2000,
});

export function clearAllRateLimits(socketId: string): void {
    bellRateLimiter.clear(socketId);
    chatRateLimiter.clear(socketId);
    proofRateLimiter.clear(socketId);
    pvpProofRateLimiter.clear(socketId);
    surrenderRateLimiter.clear(socketId);
    pvpVoteRateLimiter.clear(socketId);
    createRoomRateLimiter.clear(socketId);
    joinRateLimiter.clear(socketId);
    pointRateLimiter.clear(socketId);
}
