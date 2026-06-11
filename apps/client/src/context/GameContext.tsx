import { useEffect, useState, useRef, type ReactNode } from "react";
import type {
    GameState,
    GamePhase,
    ProofStep,
    PlayerProof,
    Card,
} from "@who-can-make24/shared";

import { socket } from "../lib/socket";
import { GameContext } from "./gameContextInstance";

export interface PvpCowardData {
    loserId: string;
    loserName: string;
    winnerId: string;
    scores: Record<string, number>;
    players: { id: string; name: string; avatar: string }[];
}


export interface GameContextType { 
    gameState: GameState | null;
    phase: GamePhase | null;
    timer: number;
    submitBell: () => void;
    submitPoint: (targetId: string) => void;
    submitProof: (steps: ProofStep[]) => void;
    submitPvpProof: (steps: ProofStep[]) => void;
    isGameOver: boolean;
    finalScores: Record<string, number>;
    logMessages: LogMessage[];
    chatMessages: ChatMessage[];
    unreadChat: number;
    clearUnreadChat: () => void;
    setChatOpen: (open: boolean) => void;
    // PVP
    pvpOffer: PvpOffer | null;
    respondPvpOffer: (accept: boolean) => void;
    pvpVotes: Record<string, boolean>;
    pvpDeclineMsg: string | null;
    // pvpCoward: {
    //     loserId: string;
    //     loserName: string;
    //     winnerId: string;
    //     scores: Record<string, number>;
    // } | null;
    pvpCoward: PvpCowardData | null;
    clearGameOver: () => void;
}

export interface LogMessage {
    id: string;
    text: string;
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    text: string;
    timestamp: number;
}

export interface PvpOffer {
    players: { id: string; name: string }[];
    isWild: boolean;
}

interface RoundStartPayload {
    cards: Card[];
    round: number;
    deckRemaining: number;
    timer: number;
    startTime: number;
}

interface PhaseChangedPayload {
    phase: GamePhase;
    candidates?: string[];
    pointingTargets?: Record<string, string>;
    provers?: string[];
    timer: number;
    startTime: number;
}

interface BellPressedPayload {
    playerId: string;
    pressOrder: number;
    bellPressers: string[];
    timer: number;
    startTime: number;
}

interface PointingUpdatedPayload {
    pointingTargets: Record<string, string>;
    candidateId: string;
    targetId: string;
}

interface ProofSubmittedPayload {
    playerId: string;
    steps: ProofStep[];
    isCorrect: boolean;
}

interface RoundResultPayload {
    roundScores: Record<string, number>;
    totalScores: Record<string, number>;
    proofs: PlayerProof[];
    unsolvable?: boolean;
}

interface SurrenderVotePayload {
    votes: number;
    total: number;
}

interface GameReconnectPayload {
    gameState: GameState;
    phase: GamePhase;
    timer: number;
    startTime: number;
}

const EMPTY_GAME_STATE: Omit<GameState, "isWild" | "isPvp" | "pvpVotes"> = {
    phase: "playing",
    deck: [],
    currentCards: [],
    round: 0,
    totalRounds: 0,
    timer: 0,
    startTime: 0,
    bellPressers: [],
    candidates: [],
    pointingTargets: {},
    proofs: [],
    scores: {},
    roundScores: [],
    surrenderVotes: [],
};

export function GameProvider({ children }: { children: ReactNode }) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timer, setTimer] = useState(0);
    const [phase, setPhase] = useState<GamePhase | null>(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [finalScores, setFinalScores] = useState<Record<string, number>>({});
    const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [unreadChat, setUnreadChat] = useState(0);
    const [pvpOffer, setPvpOffer] = useState<PvpOffer | null>(null);
    const [pvpVotes, setPvpVotes] = useState<Record<string, boolean>>({});
    const [pvpDeclineMsg, setPvpDeclineMsg] = useState<string | null>(null);
    const [pvpCoward, setPvpCoward] = useState< PvpCowardData | null> (null);


    const isChatOpenRef = useRef(false);

    function clearUnreadChat() {
        setUnreadChat(0);
    }
    function setChatOpen(open: boolean) {
        isChatOpenRef.current = open;
    }

    function clearGameOver() {
        setIsGameOver(false);
        setPvpCoward(null);
        setFinalScores({});
        setPhase(null);
        setGameState(null);
    }

    useEffect(() => {
        const onGameStarted = () => {
            setLogMessages([]);
            setChatMessages([]);
            setIsGameOver(false);
            setFinalScores({});
            setPvpOffer(null);
            setPvpVotes({});
            setGameState({
                ...EMPTY_GAME_STATE,
                startTime: Date.now(),
                isWild: false,
                isPvp: false,
                pvpVotes: {},
            });
        };

        const onRoundStart = (data: RoundStartPayload) => {
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            currentCards: data.cards,
                            round: data.round,
                            deck: Array(data.deckRemaining).fill(null),
                            phase: prev.isPvp ? "pvp" : "playing",
                            bellPressers: [],
                            candidates: [],
                            pointingTargets: {},
                            proofs: [],
                            roundScores: [],
                            surrenderVotes: [],
                            timer: data.timer,
                            startTime: data.startTime,
                        }
                    : null,
            );
            setPhase((prev) => (prev === "pvp" ? "pvp" : "playing"));
            setTimer(data.timer);
        };

        const onGameReconnect = (data: GameReconnectPayload) => {
            setGameState(data.gameState);
            setPhase(data.phase);
            setTimer(data.timer);
            setIsGameOver(false);
        };

        const onPhaseChanged = (data: PhaseChangedPayload) => {
            setPhase(data.phase);
            setTimer(data.timer);
            setGameState((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    phase: data.phase,
                    candidates: data.candidates ?? prev.candidates,
                    pointingTargets:
                        data.pointingTargets ?? prev.pointingTargets,
                    timer: data.timer,
                    startTime: data.startTime,
                } satisfies GameState;
            });
        };

        const onTimer = (data: { seconds: number; startTime: number }) => {
            setTimer(data.seconds);
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            timer: data.seconds,
                            startTime: data.startTime,
                        }
                    : null,
            );
        };

        const onBellPressed = (data: BellPressedPayload) => {
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            bellPressers: data.bellPressers,
                            timer: data.timer,
                            startTime: data.startTime,
                        }
                    : null,
            );
            setTimer(data.timer);
        };

        const onPointingUpdated = (data: PointingUpdatedPayload) => {
            setGameState((prev) =>
                prev
                    ? { ...prev, pointingTargets: data.pointingTargets }
                    : null,
            );
        };

        const onProofSubmitted = (data: ProofSubmittedPayload) => {
            setGameState((prev) => {
                if (!prev) return null;
                if (prev.proofs.find((p) => p.playerId === data.playerId))
                    return prev;
                return {
                    ...prev,
                    proofs: [
                        ...prev.proofs,
                        {
                            playerId: data.playerId,
                            steps: data.steps,
                            isCorrect: data.isCorrect,
                            submittedAt: Date.now(),
                        },
                    ],
                };
            });
        };

        const onRoundResult = (data: RoundResultPayload) => {
            setPhase("result");
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            phase: "result",
                            scores: data.totalScores,
                            roundScores: Object.entries(
                                data.roundScores as Record<string, number>,
                            ).map(([playerId, delta]) => ({
                                playerId,
                                delta,
                                reason: "",
                            })),
                        }
                    : null,
            );
        };

        const onSurrenderVote = (data: SurrenderVotePayload) => {
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            surrenderVotes: Array(data.votes).fill("vote"),
                        }
                    : null,
            );
        };

        const onGameOver = (data: { scores: Record<string, number> }) => {
            setIsGameOver(true);
            setFinalScores(data.scores);
            setPhase("finished");
            setPvpOffer(null);
        };

        const onLog = (data: { text: string; timestamp: number }) => {
            setLogMessages((prev) => [
                ...prev,
                {
                    id: `log-${Date.now()}-${Math.random()}`,
                    text: data.text,
                    timestamp: data.timestamp,
                },
            ]);
        };

        const onChat = (data: {
            playerId: string;
            playerName: string;
            text: string;
            timestamp: number;
        }) => {
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `chat-${Date.now()}-${Math.random()}`,
                    playerId: data.playerId,
                    playerName: data.playerName,
                    text: data.text,
                    timestamp: data.timestamp,
                },
            ]);
            if (data.playerId !== socket.id && !isChatOpenRef.current) {
                setUnreadChat((prev) => prev + 1);
            }
        };

        // PVP EVENTS
        const onPvpOffer = (data: PvpOffer) => {
            setPvpOffer(data);
            setPvpVotes({});
        };

        const onPvpVoteUpdate = (data: {
            votes: Record<string, boolean>;
            playerId: string;
            accept: boolean;
        }) => {
            setPvpVotes(data.votes);
        };

        const onPvpStarted = (data: {
            scores: Record<string, number>;
            isWild: boolean;
        }) => {
            setPvpOffer(null);
            setPhase("pvp");
            setGameState((prev) =>
                prev
                    ? {
                            ...prev,
                            phase: "pvp",
                            isPvp: true,
                            isWild: data.isWild,
                            scores: data.scores,
                            pvpVotes: {},
                        }
                    : null,
            );
            setLogMessages((prev) => [
                ...prev,
                {
                    id: `log-${Date.now()}`,
                    text: "⚡ PVP Mode activated!",
                    timestamp: Date.now(),
                },
            ]);
        };

        // const onPvpDeclined = () => {
        //     setPvpOffer(null);
        //     socket.emit("client:pvp-declined-cleanup");
        //     // RoomContext akan handle kick ke landing via room:removed atau disconnect
        // };

        const onPvpDeclined = (data: { declinedBy: string }) => {
            setPvpOffer(null);
            setPvpDeclineMsg(`${data.declinedBy} declined PVP mode`);
            // Auto clear setelah 3 detik
            setTimeout(() => setPvpDeclineMsg(null), 3000);
        };

        const onPvpCoward = (data: PvpCowardData) => {
            setPvpCoward(data);
            setIsGameOver(true);
            setFinalScores(data.scores);
            setPhase("finished");
            setPvpOffer(null);
        };

        socket.on("game:started", onGameStarted);
        socket.on("game:round-start", onRoundStart);
        socket.on("game:reconnect", onGameReconnect);
        socket.on("game:phase-changed", onPhaseChanged);
        socket.on("game:timer", onTimer);
        socket.on("game:bell-pressed", onBellPressed);
        socket.on("game:pointing-updated", onPointingUpdated);
        socket.on("game:proof-submitted", onProofSubmitted);
        socket.on("game:round-result", onRoundResult);
        socket.on("game:surrender-vote", onSurrenderVote);
        socket.on("game:over", onGameOver);
        socket.on("game:log", onLog);
        socket.on("game:chat", onChat);
        socket.on("game:pvp-offer", onPvpOffer);
        socket.on("game:pvp-vote-update", onPvpVoteUpdate);
        socket.on("game:pvp-started", onPvpStarted);
        socket.on("game:pvp-declined", onPvpDeclined);
        socket.on("game:pvp-coward", onPvpCoward);

        return () => {
            socket.off("game:started", onGameStarted);
            socket.off("game:round-start", onRoundStart);
            socket.off("game:reconnect", onGameReconnect);
            socket.off("game:phase-changed", onPhaseChanged);
            socket.off("game:timer", onTimer);
            socket.off("game:bell-pressed", onBellPressed);
            socket.off("game:pointing-updated", onPointingUpdated);
            socket.off("game:proof-submitted", onProofSubmitted);
            socket.off("game:round-result", onRoundResult);
            socket.off("game:surrender-vote", onSurrenderVote);
            socket.off("game:over", onGameOver);
            socket.off("game:log", onLog);
            socket.off("game:chat", onChat);
            socket.off("game:pvp-offer", onPvpOffer);
            socket.off("game:pvp-vote-update", onPvpVoteUpdate);
            socket.off("game:pvp-started", onPvpStarted);
            socket.off("game:pvp-declined", onPvpDeclined);
            socket.off("game:pvp-coward", onPvpCoward);
        };
    }, []);

    // Client-side timer interpolation
    useEffect(() => {
        if (!gameState || !phase) return;
        if (phase === "result" || phase === "finished") return;

        const interval = setInterval(() => {
            setTimer((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState?.startTime, phase]);

    function submitBell() {
        socket.emit("game:bell");
    }
    function submitPoint(targetId: string) {
        socket.emit("game:point", { targetId });
    }
    function submitProof(steps: ProofStep[]) {
        socket.emit("game:prove", { steps });
    }
    function submitPvpProof(steps: ProofStep[]) {
        socket.emit("game:pvp-prove", { steps });
    }
    function respondPvpOffer(accept: boolean) {
        socket.emit("game:pvp-vote", { accept });
    }

    return (
        <GameContext.Provider
            value={{
                gameState,
                phase,
                timer,
                isGameOver,
                finalScores,
                submitBell,
                submitPoint,
                submitProof,
                submitPvpProof,
                logMessages,
                chatMessages,
                unreadChat,
                clearUnreadChat,
                setChatOpen,
                pvpOffer,
                respondPvpOffer,
                pvpVotes,
                pvpDeclineMsg,
                pvpCoward,
                clearGameOver,
            }}
        >
            {children}
        </GameContext.Provider>
    );
}
