import type { GameState, GamePhase, ProofStep } from "@who-can-make24/shared";
import type { Card, Suit } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";

// Map roomId → GameState
const gameStates = new Map<string, GameState>();

// Timer intervals per room
const timerIntervals = new Map<string, ReturnType<typeof setInterval>>();

function generateDeck(includeFaceCards: boolean): Card[] {
    const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
    const deck: Card[] = [];

    for (const suit of suits) {
        for (let value = 1; value <= (includeFaceCards ? 13 : 10); value++) {
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

export function initGameState(roomId: string, playerIds: string[]): GameState {
    const deck = generateDeck(false);
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
    };

    gameStates.set(roomId, state);
    return state;
}

export function getGameState(roomId: string): GameState | undefined {
    return gameStates.get(roomId);
}

export function pressBell(roomId: string, playerId: string, totalPlayers: number): GameState | null {
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

    // Kembalikan kartu aktif ke deck lalu shuffle
    state.deck.push(...state.currentCards);
    state.deck = shuffle(state.deck);

    // Ambil 4 kartu baru
    const newCards = state.deck.splice(0, 4);
    state.currentCards = newCards;
    state.round += 1;

    // Reset state ronde, TIDAK increment round
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

// export function submitProof(
//     roomId: string,
//     playerId: string,
//     steps: ProofStep[],
// ): { isCorrect: boolean; state: GameState } | null {
//     const state = gameStates.get(roomId);
//     if (!state || state.phase !== "proof") return null;

//     // Validasi: angka yang dipakai harus sesuai currentCards
//     const cardValues = state.currentCards.map((c) => c.value).sort();
//     const usedValues = extractUsedValues(steps).sort();
//     const isCorrect =
//         state.timer > 0 &&
//         JSON.stringify(cardValues) === JSON.stringify(usedValues) &&
//         steps[steps.length - 1]?.result === GAME_CONSTANTS.TARGET_NUMBER;

//     state.proofs.push({ playerId, steps, isCorrect, submittedAt: Date.now() });
//     console.log("cardValues:", cardValues);
//     console.log("usedValues:", usedValues);
//     console.log("lastResult:", steps[steps.length - 1]?.result);
//     console.log("isCorrect:", isCorrect);
//     return { isCorrect, state };
// }

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

// function extractUsedValues(steps: ProofStep[]): number[] {
//     if (steps.length === 0) return [];

//     const firstStep = steps[0]!;
//     const values: number[] = [firstStep.a, firstStep.b];

//     for (let i = 1; i < steps.length; i++) {
//         const currentStep = steps[i]!;
//         const prevStep = steps[i - 1]!;
//         const prevResult = prevStep.result;
//         const newVal =
//             currentStep.a === prevResult ? currentStep.b : currentStep.a;
//         values.push(newVal);
//     }
//     return values;
// }

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
