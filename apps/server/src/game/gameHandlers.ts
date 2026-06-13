import type { Server, Socket } from "socket.io";
import type { ProofStep } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import {
    initGameState,
    getGameState,
    pressBell,
    setCandidates,
    setPointingTarget,
    submitProof,
    nextRound,
    reshuffleCurrentCards,
    deleteGameState,
    resetTimer,
    tickTimer,
    setTimerInterval,
    clearRoomTimer,
    castPvpVote,
    initPvpState,
    submitPvpProof,
    nextPvpRound,
} from "./gameManager";
import {
    getRoomById,
    getRoomByPlayerId,
    updateRoom,
    leaveRoom,
    deleteRoom,
} from "../rooms/roomManager.redis";
import {
    bellRateLimiter,
    chatRateLimiter,
    proofRateLimiter,
    pvpProofRateLimiter,
    surrenderRateLimiter,
    pvpVoteRateLimiter,
    pointRateLimiter,
} from "../lib/rateLimiter";

function getPlayerName(
    room: { players: { id: string; name: string }[] },
    playerId: string,
): string {
    return room.players.find((p) => p.id === playerId)?.name ?? "Unknown";
}

function startTimer(io: Server, roomId: string) {
    clearRoomTimer(roomId);

    const interval = setInterval(() => {
        const remaining = tickTimer(roomId);
        const state = getGameState(roomId);
        if (!state) {
            clearRoomTimer(roomId);
            return;
        }

        if (remaining % 5 === 0 || remaining <= 5) {
            io.to(roomId).emit("game:timer", {
                seconds: remaining,
                startTime: state.startTime,
            });
        }

        if (remaining <= 0) {
            clearRoomTimer(roomId);
            handleTimerExpired(io, roomId);
        }
    }, 1000);

    setTimerInterval(roomId, interval);
}

export function startPvpTimer(io: Server, roomId: string) {
    clearRoomTimer(roomId);

    const interval = setInterval(() => {
        const remaining = tickTimer(roomId);
        const state = getGameState(roomId);
        if (!state) {
            clearRoomTimer(roomId);
            return;
        }

        if (remaining % 5 === 0 || remaining <= 5) {
            io.to(roomId).emit("game:timer", {
                seconds: remaining,
                startTime: state.startTime,
            });
        }

        if (remaining <= 0) {
            clearRoomTimer(roomId);
            handlePvpTimerExpired(io, roomId);
        }
    }, 1000);

    setTimerInterval(roomId, interval);
}

async function handlePvpTimerExpired(io: Server, roomId: string) {
    const state = getGameState(roomId);
    if (!state || state.phase !== "pvp") return;

    io.to(roomId).emit("game:log", {
        text: "Time's up — no one made 24",
        timestamp: Date.now(),
    });

    io.to(roomId).emit("game:round-result", {
        roundScores: Object.fromEntries(
            Object.keys(state.scores).map((id) => [id, 0]),
        ),
        totalScores: state.scores,
        proofs: state.proofs,
    });

    setTimeout(() => {
        const newState = nextPvpRound(roomId);
        if (!newState) return;

        if (newState.phase === "finished") {
            io.to(roomId).emit("game:over", { scores: newState.scores });
            deleteGameState(roomId);
            return;
        }

        io.to(roomId).emit("game:round-start", {
            cards: newState.currentCards,
            round: newState.round,
            deckRemaining: newState.deck.length,
            timer: newState.timer,
            startTime: newState.startTime,
        });

        startPvpTimer(io, roomId);
    }, 3000);
}

async function handleTimerExpired(io: Server, roomId: string) {
    const state = getGameState(roomId);
    if (!state) return;

    const room = await getRoomById(roomId);
    if (!room) return;

    if (state.phase === "playing") {
        const allPlayerIds = room.players.map((p) => p.id);
        const pressedIds = new Set(state.bellPressers);
        const notPressed = allPlayerIds.filter((id) => !pressedIds.has(id));

        if (state.bellPressers.length === 0) {
            handleUnsolvable(io, roomId, "no-bell");
            return;
        }

        let candidates: string[];
        if (notPressed.length > 0) {
            candidates = notPressed;
        } else {
            candidates = [state.bellPressers[state.bellPressers.length - 1]!];
        }

        setCandidates(roomId, candidates);
        resetTimer(roomId);
        state.timer = GAME_CONSTANTS.POINTING_TIMER_SECONDS;
        state.startTime = Date.now();

        io.to(roomId).emit("game:phase-changed", {
            phase: "pointing",
            candidates,
            bellPressers: state.bellPressers,
            timer: state.timer,
            startTime: state.startTime,
        });

        startTimer(io, roomId);
    } else if (state.phase === "pointing") {
        // Guard: pastikan tidak double-trigger
        if (state.phase !== "pointing") return;

        const validTargets = state.bellPressers;
        state.candidates.forEach((candidateId) => {
            if (!state.pointingTargets[candidateId]) {
                const randomTarget =
                    validTargets[
                        Math.floor(Math.random() * validTargets.length)
                    ];
                if (randomTarget)
                    state.pointingTargets[candidateId] = randomTarget;
            }
        });

        state.phase = "proof";
        state.timer = GAME_CONSTANTS.PROOF_TIMER_SECONDS;
        state.startTime = Date.now();

        const provers = [...new Set(Object.values(state.pointingTargets))];

        io.to(roomId).emit("game:phase-changed", {
            phase: "proof",
            pointingTargets: state.pointingTargets,
            provers,
            timer: state.timer,
            startTime: state.startTime,
        });

        startTimer(io, roomId);
    } else if (state.phase === "proof") {
        calculateAndEmitRoundResult(io, roomId);
    } else if (state.phase === "pvp") {
        handlePvpTimerExpired(io, roomId);
    }
}

async function calculateAndEmitRoundResult(io: Server, roomId: string) {
    const state = getGameState(roomId);
    if (!state) return;

    const room = await getRoomById(roomId);
    if (!room) return;

    const roundScores: Record<string, number> = {};
    room.players.forEach((p) => (roundScores[p.id] = 0));

    state.bellPressers.forEach((id) => {
        roundScores[id] = (roundScores[id] ?? 0) + 1;
    });

    state.candidates.forEach((id) => {
        roundScores[id] = (roundScores[id] ?? 0) - 1;
    });

    Object.entries(state.pointingTargets).forEach(([candidateId, targetId]) => {
        const proof = state.proofs.find((p) => p.playerId === targetId);
        const isCorrect = proof?.isCorrect ?? false;

        if (isCorrect) {
            roundScores[targetId] = (roundScores[targetId] ?? 0) + 3;
            roundScores[candidateId] = (roundScores[candidateId] ?? 0) - 2;
        } else {
            roundScores[targetId] = (roundScores[targetId] ?? 0) - 4;
            roundScores[candidateId] = (roundScores[candidateId] ?? 0) + 2;
        }
    });

    Object.entries(roundScores).forEach(([id, delta]) => {
        state.scores[id] = (state.scores[id] ?? 0) + delta;
    });

    state.roundScores = Object.entries(roundScores).map(
        ([playerId, delta]) => ({ playerId, delta, reason: "" }),
    );

    io.to(roomId).emit("game:log", {
        text: `Round ${state.round} ended`,
        timestamp: Date.now(),
    });

    io.to(roomId).emit("game:round-result", {
        roundScores,
        totalScores: state.scores,
        proofs: state.proofs,
    });

    setTimeout(() => {
        const newState = nextRound(roomId);
        if (!newState) return;

        if (newState.phase === "finished") {
            io.to(roomId).emit("game:over", { scores: newState.scores });
            deleteGameState(roomId);
            return;
        }

        io.to(roomId).emit("game:log", {
            text: `Round ${newState.round} started`,
            timestamp: Date.now(),
        });

        io.to(roomId).emit("game:round-start", {
            cards: newState.currentCards,
            round: newState.round,
            deckRemaining: newState.deck.length,
            timer: newState.timer,
            startTime: newState.startTime,
        });

        startTimer(io, roomId);
    }, 5000);
}

async function handleUnsolvable(
    io: Server,
    roomId: string,
    reason: "no-bell" | "surrender" = "no-bell",
) {
    const state = getGameState(roomId);
    const room = await getRoomById(roomId);
    if (!state || !room) return;

    const logText =
        reason === "surrender"
            ? "Majority surrendered — combination skipped"
            : "No one pressed the bell — combination skipped";

    io.to(roomId).emit("game:log", { text: logText, timestamp: Date.now() });

    io.to(roomId).emit("game:round-result", {
        roundScores: Object.fromEntries(room.players.map((p) => [p.id, 0])),
        totalScores: state.scores,
        proofs: [],
        unsolvable: true,
    });

    setTimeout(() => {
        const newState = reshuffleCurrentCards(roomId);
        if (!newState) return;

        io.to(roomId).emit("game:log", {
            text: `Round ${newState.round} started`,
            timestamp: Date.now(),
        });

        io.to(roomId).emit("game:round-start", {
            cards: newState.currentCards,
            round: newState.round,
            deckRemaining: newState.deck.length,
            timer: newState.timer,
            startTime: newState.startTime,
        });

        startTimer(io, roomId);
    }, 3000);
}

export async function checkAndOfferPvp(io: Server, roomId: string) {
    const state = getGameState(roomId);
    const room = await getRoomById(roomId);
    if (!state || !room) return;
    if (state.isPvp) return;
    if (room.mode !== "casual") return;
    if (room.players.length !== 2) return;

    state.pvpVotes = {};
    clearRoomTimer(roomId);

    io.to(roomId).emit("game:pvp-offer", {
        players: room.players.map((p) => ({ id: p.id, name: p.name })),
        isWild: state.isWild,
    });
}

export function registerGameHandlers(io: Server, socket: Socket) {
    // CHAT
    socket.on("game:chat", async ({ text }: { text: string }) => {
        if (!chatRateLimiter.isAllowed(socket.id)) return;
        if (typeof text !== "string") return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const trimmed = text.trim().slice(0, 200);
        if (!trimmed) return;

        const playerName = getPlayerName(room, socket.id);

        io.to(room.id).emit("game:chat", {
            playerId: socket.id,
            playerName,
            text: trimmed,
            timestamp: Date.now(),
        });
    });

    // PENCET BEL
    socket.on("game:bell", async () => {
        if (!bellRateLimiter.isAllowed(socket.id)) return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const totalPlayers = room.players.length;
        const state = pressBell(room.id, socket.id, totalPlayers);
        if (!state) return;

        resetTimer(room.id);

        const allPlayerIds = room.players.map((p: { id: string }) => p.id);
        const notPressed = allPlayerIds.filter(
            (id: string) => !state.bellPressers.includes(id),
        );

        io.to(room.id).emit("game:bell-pressed", {
            playerId: socket.id,
            pressOrder: state.bellPressers.length,
            bellPressers: state.bellPressers,
            timer: state.timer,
            startTime: state.startTime,
        });

        const playerName = getPlayerName(room, socket.id);
        io.to(room.id).emit("game:log", {
            text: `${playerName} pressed the bell`,
            timestamp: Date.now(),
        });

        if (notPressed.length === 1) {
            clearRoomTimer(room.id);
            const candidate = notPressed[0]!;
            setCandidates(room.id, [candidate]);
            state.timer = GAME_CONSTANTS.POINTING_TIMER_SECONDS;
            state.startTime = Date.now();

            io.to(room.id).emit("game:phase-changed", {
                phase: "pointing",
                candidates: [candidate],
                bellPressers: state.bellPressers,
                timer: state.timer,
                startTime: state.startTime,
            });

            startTimer(io, room.id);
        } else if (notPressed.length === 0) {
            clearRoomTimer(room.id);
            const lastPresser =
                state.bellPressers[state.bellPressers.length - 1]!;
            setCandidates(room.id, [lastPresser]);
            state.timer = GAME_CONSTANTS.POINTING_TIMER_SECONDS;
            state.startTime = Date.now();

            io.to(room.id).emit("game:phase-changed", {
                phase: "pointing",
                candidates: [lastPresser],
                bellPressers: state.bellPressers,
                timer: state.timer,
                startTime: state.startTime,
            });

            startTimer(io, room.id);
        }
    });

    // SURRENDER
    socket.on("game:surrender", async () => {
        if (!surrenderRateLimiter.isAllowed(socket.id)) return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const state = getGameState(room.id);
        if (!state || state.phase !== "playing") return;
        if (state.timer > 30) return;
        if (state.surrenderVotes.includes(socket.id)) return;

        state.surrenderVotes.push(socket.id);

        io.to(room.id).emit("game:surrender-vote", {
            votes: state.surrenderVotes.length,
            total: room.players.length,
            playerId: socket.id,
        });

        const majority = Math.ceil(room.players.length / 2);
        const nobodyPressed = state.bellPressers.length === 0;
        const majorityGaveUp = state.surrenderVotes.length >= majority;

        if (nobodyPressed && majorityGaveUp) {
            clearRoomTimer(room.id);
            handleUnsolvable(io, room.id, "surrender");
            return;
        }

        if (state.bellPressers.length > 0) {
            const allAccounted = room.players.every(
                (p: { id: string }) =>
                    state.bellPressers.includes(p.id) ||
                    state.surrenderVotes.includes(p.id),
            );

            if (allAccounted) {
                clearRoomTimer(room.id);
                handleTimerExpired(io, room.id);
            }
        }
    });

    // MENUNJUK TARGET
    socket.on("game:point", async ({ targetId }: { targetId: string }) => {
        // Rate limiter — cegah spam ke Redis
        if (!pointRateLimiter.isAllowed(socket.id)) return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const state = getGameState(room.id);

        // Guard race condition: pastikan masih di fase pointing
        if (!state || state.phase !== "pointing") return;

        // Pastikan yang menunjuk adalah kandidat
        if (!state.candidates.includes(socket.id)) return;

        // Validasi targetId — harus player valid di room, bukan diri sendiri
        if (!room.players.some((p) => p.id === targetId)) return;
        if (targetId === socket.id) return;

        // Kandidat hanya boleh menunjuk sekali
        if (state.pointingTargets[socket.id]) return;

        setPointingTarget(room.id, socket.id, targetId);

        io.to(room.id).emit("game:pointing-updated", {
            pointingTargets: state.pointingTargets,
            candidateId: socket.id,
            targetId,
        });

        const candidateName = getPlayerName(room, socket.id);
        const targetName = getPlayerName(room, targetId);
        io.to(room.id).emit("game:log", {
            text: `${candidateName} pointed at ${targetName}`,
            timestamp: Date.now(),
        });

        // Cek semua kandidat sudah menunjuk
        const allPointed = state.candidates.every(
            (id) => state.pointingTargets[id],
        );
        if (allPointed) {
            clearRoomTimer(room.id);
            handleTimerExpired(io, room.id);
        }
    });

    // SUBMIT PROOF (casual)
    socket.on("game:prove", async ({ steps }: { steps: ProofStep[] }) => {
        if (!proofRateLimiter.isAllowed(socket.id)) return;

        // Validasi steps array
        if (!Array.isArray(steps) || steps.length === 0 || steps.length > 3)
            return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const result = submitProof(room.id, socket.id, steps);
        if (!result) return;

        io.to(room.id).emit("game:proof-submitted", {
            playerId: socket.id,
            steps,
            isCorrect: result.isCorrect,
        });

        const playerName = getPlayerName(room, socket.id);
        const stepsText = steps
            .map((s, i) => {
                const opSymbol =
                    s.operator === "*"
                        ? "×"
                        : s.operator === "/"
                          ? "÷"
                          : s.operator;
                return i === steps.length - 1
                    ? `${s.a} ${opSymbol} ${s.b} = ${s.result}`
                    : `${s.a} ${opSymbol} ${s.b} → ${s.result}`;
            })
            .join(", ");

        io.to(room.id).emit("game:log", {
            text: `${playerName}: ${stepsText} [${result.isCorrect ? "✓" : "✗"}] ${result.isCorrect ? "Correct!" : "Wrong!"}`,
            timestamp: Date.now(),
        });

        const provers = [
            ...new Set(Object.values(result.state.pointingTargets)),
        ];
        const allSubmitted = provers.every((id) =>
            result.state.proofs.some((p) => p.playerId === id),
        );

        if (allSubmitted) {
            clearRoomTimer(room.id);
            calculateAndEmitRoundResult(io, room.id);
        }
    });

    // PVP VOTE
    socket.on("game:pvp-vote", async ({ accept }: { accept: boolean }) => {
        if (!pvpVoteRateLimiter.isAllowed(socket.id)) return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const state = getGameState(room.id);
        if (!state) return;

        if (!accept) {
            clearRoomTimer(room.id);
            deleteGameState(room.id);

            const decliner = room.players.find((p) => p.id === socket.id);

            io.to(room.id).emit("game:pvp-declined", {
                declinedBy: decliner?.name ?? "Someone",
            });

            for (const p of room.players) {
                await leaveRoom(p.id);
            }
            await deleteRoom(room.id);
            io.emit("room:removed", { roomId: room.id });
            return;
        }

        state.pvpVotes[socket.id] = true;

        io.to(room.id).emit("game:pvp-vote-update", {
            votes: state.pvpVotes,
            playerId: socket.id,
            accept: true,
        });

        const activePlayerIds = room.players.map((p) => p.id);
        const allAccepted = activePlayerIds.every(
            (id) => state.pvpVotes[id] === true,
        );
        if (!allAccepted) return;

        const newState = initPvpState(room.id);
        if (!newState) return;

        io.to(room.id).emit("game:pvp-started", {
            scores: newState.scores,
            isWild: newState.isWild,
        });

        io.to(room.id).emit("game:log", {
            text: "⚡ PVP Mode activated! Scores reset. First to 24 wins each round!",
            timestamp: Date.now(),
        });

        setTimeout(() => {
            io.to(room.id).emit("game:round-start", {
                cards: newState.currentCards,
                round: newState.round,
                deckRemaining: newState.deck.length,
                timer: newState.timer,
                startTime: newState.startTime,
            });
            startPvpTimer(io, room.id);
        }, 1000);
    });

    // PVP SURRENDER
    socket.on("game:pvp-surrender", async () => {
        if (!surrenderRateLimiter.isAllowed(socket.id)) return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const state = getGameState(room.id);
        if (!state || state.phase !== "pvp") return;
        if (state.timer > 30) return;

        clearRoomTimer(room.id);

        const playerName = getPlayerName(room, socket.id);

        io.to(room.id).emit("game:log", {
            text: `${playerName} skipped this hand`,
            timestamp: Date.now(),
        });

        io.to(room.id).emit("game:round-result", {
            roundScores: Object.fromEntries(
                Object.keys(state.scores).map((id) => [id, 0]),
            ),
            totalScores: state.scores,
            proofs: [],
        });

        setTimeout(() => {
            const newState = nextPvpRound(room.id);
            if (!newState) return;

            if (newState.phase === "finished") {
                io.to(room.id).emit("game:over", { scores: newState.scores });
                deleteGameState(room.id);
                return;
            }

            io.to(room.id).emit("game:round-start", {
                cards: newState.currentCards,
                round: newState.round,
                deckRemaining: newState.deck.length,
                timer: newState.timer,
                startTime: newState.startTime,
            });

            startPvpTimer(io, room.id);
        }, 3000);
    });

    // PVP SUBMIT PROOF
    socket.on("game:pvp-prove", async ({ steps }: { steps: ProofStep[] }) => {
        if (!pvpProofRateLimiter.isAllowed(socket.id)) return;

        // Validasi steps array
        if (!Array.isArray(steps) || steps.length === 0 || steps.length > 3)
            return;

        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const result = submitPvpProof(room.id, socket.id, steps);
        if (!result) return;

        const playerName = getPlayerName(room, socket.id);

        io.to(room.id).emit("game:proof-submitted", {
            playerId: socket.id,
            steps,
            isCorrect: result.isCorrect,
        });

        if (!result.isCorrect) {
            io.to(room.id).emit("game:log", {
                text: `${playerName} submitted wrong answer`,
                timestamp: Date.now(),
            });
            return;
        }

        clearRoomTimer(room.id);

        io.to(room.id).emit("game:log", {
            text: `${playerName} made 24! +1 point`,
            timestamp: Date.now(),
        });

        io.to(room.id).emit("game:round-result", {
            roundScores: Object.fromEntries(
                Object.keys(result.state.scores).map((id) => [
                    id,
                    id === socket.id ? 1 : 0,
                ]),
            ),
            totalScores: result.state.scores,
            proofs: result.state.proofs,
        });

        setTimeout(() => {
            const newState = nextPvpRound(room.id);
            if (!newState) return;

            if (newState.phase === "finished") {
                io.to(room.id).emit("game:over", { scores: newState.scores });
                deleteGameState(room.id);
                return;
            }

            io.to(room.id).emit("game:round-start", {
                cards: newState.currentCards,
                round: newState.round,
                deckRemaining: newState.deck.length,
                timer: newState.timer,
                startTime: newState.startTime,
            });

            startPvpTimer(io, room.id);
        }, 3000);
    });
}

export { startTimer };
