export * from './game'

// Tipe Player
export type Player = {
    id: string;
    name: string;
    avatar: string;
    score: number;
    isHost: boolean;
    isMuted: boolean;
    rank?: 1 | 2 | 3; // badge 🥇🥈🥉, undefined kalau tidak top 3
};

// Tipe Room
export type Room = {
    id: string;
    name: string;
    code?: string; // hanya ada kalau private
    mode: "casual" | "pvp" | "battle-royale";
    isPrivate: boolean;
    players: Player[];
    maxPlayers: 16;
    status: "waiting" | "playing" | "finished";
};

// Tipe Game Phase
// export type GamePhase = "waiting" | "playing" | "pointing" | "proof" | "result";

// Tipe Card (kartu remi)
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Card = {
    value: number; // 1-13, face card = 11/12/13
    suit: Suit;
    display: string; // '8', 'J', 'Q', 'K', 'A'
};

// Konstanta game
export const GAME_CONSTANTS = {
    MAX_PLAYERS: 16,
    MIN_PLAYERS_CASUAL: 3,
    MIN_PLAYERS_PVP: 2,
    DEFAULT_TIMER_SECONDS: 60,
    POINTING_TIMER_SECONDS: 20,
    PROOF_TIMER_SECONDS: 20,
    TARGET_NUMBER: 24,
} as const;

// export type RoomStatus = "waiting" | "playing" | "finished";
