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
} from "./gameManager";
import { getRoomById, getRoomByPlayerId } from "../rooms/roomManager.redis";

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

        // Broadcast timer setiap 5 detik sebagai sync point
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

async function handleTimerExpired(io: Server, roomId: string) {
    const state = getGameState(roomId);
    if (!state) return;

    const room = await getRoomById(roomId);
    if (!room) return;

    if (state.phase === "playing") {
        const allPlayerIds = room.players.map((p) => p.id);
        const pressedIds = new Set(state.bellPressers);

        // Semua yang tidak pencet bel = kandidat kalah
        const notPressed = allPlayerIds.filter((id) => !pressedIds.has(id));

        // if (notPressed.length === 0 && state.bellPressers.length === 0) {
        if (state.bellPressers.length === 0) {
            handleUnsolvable(io, roomId, 'no-bell')
            return
            // Tidak ada yang pencet sama sekali = unsolvable, reshuffle
            // io.to(roomId).emit("game:round-result", {
            //     roundScores: Object.fromEntries(
            //         room.players.map((p) => [p.id, 0]),
            //     ),
            //     totalScores: state.scores,
            //     proofs: [],
            //     unsolvable: true,
            // });

            // setTimeout(() => {
            //     const newState = nextRound(roomId);
            //     if (!newState) return;

            //     if (newState.phase === "finished") {
            //         io.to(roomId).emit("game:over", {
            //             scores: newState.scores,
            //         });
            //         deleteGameState(roomId);
            //         return;
            //     }

            //     io.to(roomId).emit("game:round-start", {
            //         cards: newState.currentCards,
            //         round: newState.round,
            //         deckRemaining: newState.deck.length,
            //         timer: newState.timer,
            //         startTime: newState.startTime,
            //     });
            //     startTimer(io, roomId);
            // }, 3000);
            // return;
        }

        // Ada yang tidak pencet = kandidat kalah
        // Kalau semua pencet, yang paling akhir = kandidat kalah
        let candidates: string[];
        if (notPressed.length > 0) {
            candidates = notPressed;
        } else {
            // Semua pencet — yang paling akhir adalah kandidat
            candidates = [state.bellPressers[state.bellPressers.length - 1]!];
        }

        setCandidates(roomId, candidates);

        // Reset timer untuk fase pointing
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

        // Start pointing timer
        startTimer(io, roomId);
    } else if (state.phase === "pointing") {
        // Timer pointing habis — yang belum pilih, sistem random pilihkan
        const room = await getRoomById(roomId);
        if (!room) return;

        const validTargets = state.bellPressers;
        state.candidates.forEach((candidateId) => {
            if (!state.pointingTargets[candidateId]) {
                // Random pilih dari bellPressers
                const randomTarget =
                    validTargets[
                        Math.floor(Math.random() * validTargets.length)
                    ];
                if (randomTarget) {
                    state.pointingTargets[candidateId] = randomTarget;
                }
            }
        });

        // Masuk fase proof
        state.phase = "proof";
        state.timer = GAME_CONSTANTS.PROOF_TIMER_SECONDS;
        state.startTime = Date.now();

        // Kumpulkan siapa yang harus buktikan
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
        // Timer proof habis — yang belum submit dianggap salah
        calculateAndEmitRoundResult(io, roomId);
    }
}

async function calculateAndEmitRoundResult(io: Server, roomId: string) {
    const state = getGameState(roomId);
    if (!state) return;

    const room = await getRoomById(roomId);
    if (!room) return;

    const roundScores: Record<string, number> = {};
    room.players.forEach((p) => (roundScores[p.id] = 0));

    // +1 untuk semua yang pencet bel
    state.bellPressers.forEach((id) => {
        roundScores[id] = (roundScores[id] ?? 0) + 1;
    });

    // -1 untuk kandidat kalah
    state.candidates.forEach((id) => {
        roundScores[id] = (roundScores[id] ?? 0) - 1;
    });

    // Hitung skor dari proof
    Object.entries(state.pointingTargets).forEach(([candidateId, targetId]) => {
        const proof = state.proofs.find((p) => p.playerId === targetId);
        const isCorrect = proof?.isCorrect ?? false;

        if (isCorrect) {
            // Target benar: target +3, kandidat -2
            roundScores[targetId] = (roundScores[targetId] ?? 0) + 3;
            roundScores[candidateId] = (roundScores[candidateId] ?? 0) - 2;
        } else {
            // Target salah: target -3, kandidat +2
            roundScores[targetId] = (roundScores[targetId] ?? 0) - 4;
            roundScores[candidateId] = (roundScores[candidateId] ?? 0) + 2;
        }
    });

    // Update total scores
    Object.entries(roundScores).forEach(([id, delta]) => {
        state.scores[id] = (state.scores[id] ?? 0) + delta;
    });

    state.roundScores = Object.entries(roundScores).map(
        ([playerId, delta]) => ({
            playerId,
            delta,
            reason: "",
        }),
    );

    // Emit hasil rondean ke semua player
    io.to(roomId).emit("game:log", {
        text: `Round ${state.round} ended`,
        timestamp: Date.now(),
    });

    io.to(roomId).emit("game:round-result", {
        roundScores,
        totalScores: state.scores,
        proofs: state.proofs,
    });

    // Lanjut ronde berikutnya setelah 5 detik
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

    io.to(roomId).emit("game:log", {
        text: logText,
        timestamp: Date.now(),
    });

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

export function registerGameHandlers(io: Server, socket: Socket) {
    // CHAT
    socket.on("game:chat", async ({ text }: { text: string }) => {
        // const { getRoomByPlayerId } = await import("../rooms/roomManager");
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        // Validasi panjang
        const trimmed = String(text).trim().slice(0, 200);
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
        // const { getRoomByPlayerId } = await import("../rooms/roomManager");
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const totalPlayers = room.players.length;
        console.log(
            `bell from ${socket.id}, totalPlayers: ${totalPlayers}, bellPressers before: ${JSON.stringify(room.players.map((p: { id: string }) => p.id))}`,
        );

        const state = pressBell(room.id, socket.id, totalPlayers);
        console.log(
            `pressBell result: ${state ? "accepted" : "rejected"}, bellPressers after: ${JSON.stringify(state?.bellPressers)}`,
        );

        if (!state) return;

        // Reset timer saat ada yang pencet bel
        resetTimer(room.id);

        const allPlayerIds = room.players.map((p: { id: string }) => p.id);
        // const allPressed = allPlayerIds.every((id: string) => state.bellPressers.includes(id))
        const notPressed = allPlayerIds.filter(
            (id: string) => !state.bellPressers.includes(id),
        );

        console.log(
            `notPressed: ${JSON.stringify(notPressed)}, length: ${notPressed.length}`,
        );

        io.to(room.id).emit("game:bell-pressed", {
            playerId: socket.id,
            pressOrder: state.bellPressers.length,
            bellPressers: state.bellPressers,
            timer: state.timer,
            startTime: state.startTime,
        });

        // Log siapa yang pencet bel
        const playerName = getPlayerName(room, socket.id);
        io.to(room.id).emit("game:log", {
            text: `${playerName} pressed the bell`,
            timestamp: Date.now(),
        });

        // if (allPressed) {
        //     clearRoomTimer(room.id)
        //     // Yang paling akhir pencet = kandidat kalah
        //     const lastPresser = state.bellPressers[state.bellPressers.length - 1]
        //     if (lastPresser) {
        //     setCandidates(room.id, [lastPresser])
        //     resetTimer(room.id)
        //     state.timer = GAME_CONSTANTS.POINTING_TIMER_SECONDS
        //     state.startTime = Date.now()

        //     io.to(room.id).emit('game:phase-changed', {
        //         phase: 'pointing',
        //         candidates: [lastPresser],
        //         bellPressers: state.bellPressers,
        //         timer: state.timer,
        //         startTime: state.startTime,
        //     })

        //     startTimer(io, room.id)
        //     }
        // }
        if (notPressed.length === 1) {
            // Satu player tersisa = otomatis kandidat kalah
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
            // Semua pencet — yang paling akhir = kandidat
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

    socket.on("game:surrender", async () => {
        // const { getRoomByPlayerId } = await import("../rooms/roomManager");
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

        // Unsolvable hanya kalau tidak ada yang pencet bel DAN mayoritas nyerah
        if (nobodyPressed && majorityGaveUp) {
            clearRoomTimer(room.id);
            handleUnsolvable(io, room.id, 'surrender');
            return;
        }

        // Kalau ada yang pencet bel, cek apakah semua sudah bersikap
        // Yang nyerah dianggap tidak pencet bel → flow normal ke fase menunjuk
        if (state.bellPressers.length > 0) {
            const allAccounted = room.players.every(
                (p: { id: string }) =>
                    state.bellPressers.includes(p.id) ||
                    state.surrenderVotes.includes(p.id),
            );

            if (allAccounted) {
                // Semua sudah bersikap, tidak perlu tunggu timer
                clearRoomTimer(room.id);
                handleTimerExpired(io, room.id);
            }
        }
    });

    // MENUNJUK TARGET
    socket.on("game:point", async ({ targetId }: { targetId: string }) => {
        // const { getRoomByPlayerId } = await import("../rooms/roomManager");
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const state = getGameState(room.id);
        if (!state || state.phase !== "pointing") return;

        // Pastikan yang menunjuk adalah kandidat kalah
        if (!state.candidates.includes(socket.id)) return;

        setPointingTarget(room.id, socket.id, targetId);

        io.to(room.id).emit("game:pointing-updated", {
            pointingTargets: state.pointingTargets,
            candidateId: socket.id,
            targetId,
        });

        // Log siapa menunjuk siapa
        const candidateName = getPlayerName(room, socket.id);
        const targetName = getPlayerName(room, targetId);
        io.to(room.id).emit("game:log", {
            text: `${candidateName} pointed at ${targetName}`,
            timestamp: Date.now(),
        });

        // Cek apakah semua kandidat sudah menunjuk
        const allPointed = state.candidates.every(
            (id) => state.pointingTargets[id],
        );
        if (allPointed) {
            clearRoomTimer(room.id);
            handleTimerExpired(io, room.id);
        }
    });

    // SUBMIT PROOF
    socket.on("game:prove", async ({ steps }: { steps: ProofStep[] }) => {
        // const { getRoomByPlayerId } = await import("../rooms/roomManager");
        const room = await getRoomByPlayerId(socket.id);
        if (!room) return;

        const result = submitProof(room.id, socket.id, steps);
        if (!result) return;

        io.to(room.id).emit("game:proof-submitted", {
            playerId: socket.id,
            steps,
            isCorrect: result.isCorrect,
        });

        // Log proof yang diajukan
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

        const resultIcon = result.isCorrect ? "✓" : "✗";
        const resultText = result.isCorrect ? "Correct!" : "Wrong!";

        io.to(room.id).emit("game:log", {
            text: `${playerName}: ${stepsText} [${resultIcon}] ${resultText}`,
            timestamp: Date.now(),
        });

        // Cek apakah semua prover sudah submit
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
}

// Export startTimer supaya bisa dipanggil dari roomHandlers saat game:start
export { startTimer };
