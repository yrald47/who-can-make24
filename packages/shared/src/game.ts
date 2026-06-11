import type { Card } from "./index";

export type GamePhase =
    | "playing" // fase utama, rebutan bel
    | "pointing" // kandidat kalah menunjuk
    | "proof" // pembuktian jawaban
    | "result" // hasil ronde
    | "pvp"
    | "finished"; // game selesai, deck habis

export type ProofStep = {
    a: number;
    b: number;
    operator: "+" | "-" | "*" | "/";
    result: number;
};

export type PlayerProof = {
    playerId: string;
    steps: ProofStep[];
    isCorrect: boolean;
    submittedAt: number;
};

export type RoundScore = {
    playerId: string;
    delta: number; // perubahan poin ronde ini, bisa negatif
    reason: string; // penjelasan singkat
};

export type GameState = {
    phase: GamePhase;
    deck: Card[];
    currentCards: Card[];
    round: number;
    totalRounds: number;
    timer: number; // detik tersisa
    startTime: number; // Date.now() saat timer mulai/reset
    bellPressers: string[]; // socketId urut by time
    candidates: string[]; // socketId kandidat kalah
    pointingTargets: Record<string, string>; // candidateId → targetId
    proofs: PlayerProof[]; // semua proof ronde ini
    scores: Record<string, number>; // socketId → total skor
    roundScores: RoundScore[]; // delta skor ronde ini
    surrenderVotes: string[];
    isWild: boolean;
    isPvp: boolean;
    pvpVotes: Record<string, boolean>; // socketId → pilihan
};
