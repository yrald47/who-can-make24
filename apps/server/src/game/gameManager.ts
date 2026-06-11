import type { GameState, ProofStep } from "@who-can-make24/shared";
import type { Card, Suit } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";

const gameStates = new Map<string, GameState>();
const timerIntervals = new Map<string, ReturnType<typeof setInterval>>();

function generateDeck(isWild: boolean): Card[] {
    const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
    const deck: Card[] = [];

    for (const suit of suits) {
        for (let value = 1; value <= (isWild ? 13 : 10); value++) {
            const display =
                value === 1
                    ? "A"
                    : value === 11
                        ? "J"
                        : value === 12
                        ? "Q"
                        : value === 13
                            ? "K"
                            : String(value);
            deck.push({ value, suit, display });
        }
    }

    return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = a[i]!;
        a[i] = a[j]!;
        a[j] = temp;
    }
    return a;
}

export function initGameState(
    roomId: string,
    playerIds: string[],
    isWild: boolean = false,
): GameState {
    const deck = generateDeck(isWild);
    const currentCards = deck.splice(0, 4);

    const scores: Record<string, number> = {};
    playerIds.forEach((id) => (scores[id] = 0));

    const state: GameState = {
        phase: "playing",
        deck,
        currentCards,
        round: 1,
        totalRounds: Math.floor(deck.length / 4) + 1,
        timer: GAME_CONSTANTS.DEFAULT_TIMER_SECONDS,
        startTime: Date.now(),
        bellPressers: [],
        candidates: [],
        pointingTargets: {},
        proofs: [],
        scores,
        roundScores: [],
        surrenderVotes: [],
        isWild,
        isPvp: false,
        pvpVotes: {},
    };

    gameStates.set(roomId, state);
    return state;
}

// Dipanggil saat game casual switch ke PVP
// Reset scores, deck, dan phase ke pvp
export function initPvpState(roomId: string): GameState | null {
    const state = gameStates.get(roomId);
    if (!state) return null;

    const deck = generateDeck(state.isWild);
    const currentCards = deck.splice(0, 4);

    // Reset scores ke 0
    Object.keys(state.scores).forEach((id) => (state.scores[id] = 0));

    state.phase = "pvp";
    state.isPvp = true;
    state.pvpVotes = {};
    state.deck = deck;
    state.currentCards = currentCards;
    state.round = 1;
    state.totalRounds = Math.floor(deck.length / 4) + 1;
    state.timer = GAME_CONSTANTS.PVP_TIMER_SECONDS;
    state.startTime = Date.now();
    state.bellPressers = [];
    state.candidates = [];
    state.pointingTargets = {};
    state.proofs = [];
    state.roundScores = [];
    state.surrenderVotes = [];

    return state;
}

// Vote PVP — return status votes
export function castPvpVote(
    roomId: string,
    playerId: string,
    accept: boolean,
    activePlayerIds: string[],
): {
    votes: Record<string, boolean>;
    allVoted: boolean;
    allAccepted: boolean;
} | null {
    const state = gameStates.get(roomId);
    if (!state) return null;

    state.pvpVotes[playerId] = accept;

    // const playerIds = Object.keys(state.scores);
    const allVoted = activePlayerIds.every((id) => state.pvpVotes[id] !== undefined);
    const allAccepted = activePlayerIds.every((id) => state.pvpVotes[id] === true);

    return { votes: state.pvpVotes, allVoted, allAccepted };
}

// Submit PVP proof — siapa submit 24 duluan menang ronde
export function submitPvpProof(
    roomId: string,
    playerId: string,
    steps: ProofStep[],
): { isCorrect: boolean; state: GameState } | null {
    const state = gameStates.get(roomId);
    if (!state || state.phase !== "pvp") return null;

    const lastResult = steps[steps.length - 1]?.result;
    const isCorrect = lastResult === GAME_CONSTANTS.TARGET_NUMBER;

    if (isCorrect) {
        state.scores[playerId] = (state.scores[playerId] ?? 0) + 1;
    }

    state.proofs.push({ playerId, steps, isCorrect, submittedAt: Date.now() });
    return { isCorrect, state };
}

export function nextPvpRound(roomId: string): GameState | null {
    const state = gameStates.get(roomId);
    if (!state || !state.isPvp) return null;

    if (state.deck.length < 4) {
        state.phase = "finished";
        return state;
    }

    const newCards = state.deck.splice(0, 4);
    state.currentCards = newCards;
    state.round += 1;
    state.phase = "pvp";
    state.bellPressers = [];
    state.candidates = [];
    state.pointingTargets = {};
    state.proofs = [];
    state.roundScores = [];
    state.timer = GAME_CONSTANTS.PVP_TIMER_SECONDS;
    state.startTime = Date.now();
    state.surrenderVotes = [];

    return state;
}

export function getGameState(roomId: string): GameState | undefined {
    return gameStates.get(roomId);
}

export function pressBell(
    roomId: string,
    playerId: string,
    totalPlayers: number,
): GameState | null {
    const state = gameStates.get(roomId);
    if (!state || state.phase !== "playing") return null;
    if (state.bellPressers.includes(playerId)) return null;

    const remainingPlayers = totalPlayers - state.bellPressers.length;
    if (remainingPlayers <= 1) return null;

    state.bellPressers.push(playerId);
    return state;
}

export function tickTimer(roomId: string): number {
    const state = gameStates.get(roomId);
    if (!state) return 0;
    state.timer -= 1;
    return state.timer;
}

export function resetTimer(roomId: string): void {
    const state = gameStates.get(roomId);
    if (!state) return;
    state.timer = GAME_CONSTANTS.DEFAULT_TIMER_SECONDS;
    state.startTime = Date.now();
}

export function reshuffleCurrentCards(roomId: string): GameState | null {
    const state = gameStates.get(roomId);
    if (!state) return null;

    state.deck.push(...state.currentCards);
    state.deck = shuffle(state.deck);
    const newCards = state.deck.splice(0, 4);
    state.currentCards = newCards;
    state.round += 1;
    state.phase = "playing";
    state.bellPressers = [];
    state.candidates = [];
    state.pointingTargets = {};
    state.proofs = [];
    state.roundScores = [];
    state.surrenderVotes = [];
    state.timer = GAME_CONSTANTS.DEFAULT_TIMER_SECONDS;
    state.startTime = Date.now();

    return state;
}

export function setCandidates(roomId: string, playerIds: string[]): void {
    const state = gameStates.get(roomId);
    if (!state) return;
    state.candidates = playerIds;
    state.phase = "pointing";
}

export function setPointingTarget(
    roomId: string,
    candidateId: string,
    targetId: string,
): void {
    const state = gameStates.get(roomId);
    if (!state) return;
    state.pointingTargets[candidateId] = targetId;
}

export function submitProof(
    roomId: string,
    playerId: string,
    steps: ProofStep[],
): { isCorrect: boolean; state: GameState } | null {
    const state = gameStates.get(roomId);
    if (!state || state.phase !== "proof") return null;

    const lastResult = steps[steps.length - 1]?.result;
    const isCorrect =
        state.timer > 0 && lastResult === GAME_CONSTANTS.TARGET_NUMBER;

    console.log("lastResult:", lastResult, "isCorrect:", isCorrect);

    state.proofs.push({ playerId, steps, isCorrect, submittedAt: Date.now() });
    return { isCorrect, state };
}

export function nextRound(roomId: string): GameState | null {
    const state = gameStates.get(roomId);
    if (!state) return null;

    if (state.deck.length < 4) {
        state.phase = "finished";
        return state;
    }

    const newCards = state.deck.splice(0, 4);
    state.currentCards = newCards;
    state.round += 1;
    state.phase = "playing";
    state.bellPressers = [];
    state.candidates = [];
    state.pointingTargets = {};
    state.proofs = [];
    state.roundScores = [];
    state.timer = GAME_CONSTANTS.DEFAULT_TIMER_SECONDS;
    state.startTime = Date.now();
    state.surrenderVotes = [];

    return state;
}

export function deleteGameState(roomId: string): void {
    gameStates.delete(roomId);
    clearRoomTimer(roomId);
}

export function setTimerInterval(
    roomId: string,
    interval: ReturnType<typeof setInterval>,
): void {
    timerIntervals.set(roomId, interval);
}

export function clearRoomTimer(roomId: string): void {
    const interval = timerIntervals.get(roomId);
    if (interval) {
        clearInterval(interval);
        timerIntervals.delete(roomId);
    }
}
