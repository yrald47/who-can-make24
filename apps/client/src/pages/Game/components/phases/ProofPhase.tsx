import { useState } from "react";
import type { ProofStep } from "@who-can-make24/shared";
import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";
import { avatarSrc } from "@who-can-make24/shared";

const SUIT_COLOR: Record<string, string> = {
    spades: "text-gray-800",
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-gray-800",
};

export function ProofPhase() {
    const { gameState, timer, submitProof } = useGameContext();
    const { currentRoom } = useRoomContext();
    const { socket } = useSocket();

    const [workingCards, setWorkingCards] = useState<
        { value: number; display: string; originalIndex: number }[]
    >(
        () =>
            gameState?.currentCards.map((c, i) => ({
                value: c.value,
                display: c.display,
                originalIndex: i,
            })) ?? [],
    );
    const [selectedA, setSelectedA] = useState<number | null>(null);
    const [selectedB, setSelectedB] = useState<number | null>(null);
    const [pendingOp, setPendingOp] = useState<"+" | "-" | "*" | "/" | null>(
        null,
    );
    const [steps, setSteps] = useState<ProofStep[]>([]);
    const [submitted, setSubmitted] = useState(false);

    if (!gameState || !currentRoom) return null;

    const myId = socket.id ?? "";
    const provers = [...new Set(Object.values(gameState.pointingTargets))];
    const isMeProver = provers.includes(myId);
    const myProof = gameState.proofs.find((p) => p.playerId === myId);

    function handleCardTap(index: number) {
        if (!isMeProver || submitted || myProof) return;
        if (workingCards.length <= 1) return;
        if (selectedA === null) {
            setSelectedA(index);
        } else if (index === selectedA) {
            setSelectedA(null);
            setPendingOp(null);
            setSelectedB(null);
        } else if (pendingOp != null) {
            setSelectedB(index);
            handleOperator(selectedA, index, pendingOp);
        } else {
            setSelectedB(index);
        }
    }

    function handleOperator(
        indexA: number,
        indexB: number,
        op?: "+" | "-" | "*" | "/",
    ) {
        if (op === undefined) return;
        const cardA = workingCards[indexA];
        const cardB = workingCards[indexB];
        if (!cardA || !cardB) return;

        let result: number;
        if (op === "+") result = cardA.value + cardB.value;
        else if (op === "-") result = cardA.value - cardB.value;
        else if (op === "*") result = cardA.value * cardB.value;
        else result = cardA.value / cardB.value;

        const step: ProofStep = {
            a: cardA.value,
            b: cardB.value,
            operator: op,
            result: Math.round(result * 10000) / 10000,
        };

        const newSteps = [...steps, step];
        setSteps(newSteps);

        const newCards = workingCards.filter(
            (_, i) => i !== indexA && i !== indexB,
        );
        newCards.push({
            value: result,
            display: String(Math.round(result * 100) / 100),
            originalIndex: -1,
        });

        setWorkingCards(newCards);
        setSelectedA(null);
        setSelectedB(null);
        setPendingOp(null);

        if (newCards.length === 1) {
            setSubmitted(true);
            submitProof(newSteps);
        }
    }

    function handleReset() {
        if (!gameState) return;
        setWorkingCards(
            gameState.currentCards.map((c, i) => ({
                value: c.value,
                display: c.display,
                originalIndex: i,
            })),
        );
        setSteps([]);
        setSelectedA(null);
        setSelectedB(null);
        setPendingOp(null);
        setSubmitted(false);
    }

    const OPERATORS: ("+" | "-" | "*" | "/")[] = ["+", "-", "*", "/"];

    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
            <h3 className="text-game-text font-heading font-bold text-lg tracking-widest uppercase">
                Fase Pembuktian
            </h3>

            {/* Timer */}
            <span
                className={`font-mono font-bold text-xl ${timer <= 10 ? "text-game-coral" : "text-game-amber"}`}
            >
                {timer}s
            </span>

            {/* Status semua prover */}
            <div className="flex gap-2 flex-wrap justify-center">
                {provers.map((proverId) => {
                    const player = currentRoom.players.find(
                        (p) => p.id === proverId,
                    );
                    const proof = gameState.proofs.find(
                        (p) => p.playerId === proverId,
                    );
                    return (
                        <div
                            key={proverId}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-medium border
                                ${
                                    proof
                                        ? proof.isCorrect
                                            ? "bg-game-green/10 border-game-green/40 text-game-green"
                                            : "bg-game-coral/10 border-game-coral/40 text-game-coral"
                                        : "bg-game-surface border-game-border text-game-muted"
                                }
                                ${proverId === myId ? "ring-1 ring-game-amber" : ""}
                            `}
                        >
                            {player?.avatar && (
                                <img
                                    src={avatarSrc(player.avatar)}
                                    alt={player.name}
                                    className="w-5 h-5 object-contain"
                                />
                            )}
                            <span>{player?.name}</span>
                            {proof ? (proof.isCorrect ? " ✓" : " ✗") : " ..."}
                        </div>
                    );
                })}
            </div>

            {isMeProver && !myProof ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    {/* Working cards */}
                    <div className="flex gap-2 justify-center">
                        {workingCards.map((card, i) => (
                            <button
                                key={i}
                                onClick={() => handleCardTap(i)}
                                className={`
                                    w-14 h-20 bg-white rounded-[6px] border-2 shadow-md
                                    flex flex-col items-center justify-center transition-all
                                    ${selectedA === i ? "border-game-amber scale-110 shadow-[0_0_12px_rgba(251,191,36,0.4)]" : ""}
                                    ${selectedB === i ? "border-game-green scale-110 shadow-[0_0_12px_rgba(63,185,80,0.4)]" : ""}
                                    ${selectedA !== i && selectedB !== i ? "border-gray-200 hover:border-gray-400" : ""}
                                `}
                            >
                                <span
                                    className={`text-2xl font-bold ${SUIT_COLOR[gameState.currentCards[card.originalIndex]?.suit ?? "spades"]}`}
                                >
                                    {card.display}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Operators */}
                    {selectedA !== null && (
                        <div className="flex gap-2">
                            {OPERATORS.map((op) => (
                                <button
                                    key={op}
                                    onClick={() => {
                                        if (selectedB !== null) {
                                            handleOperator(
                                                selectedA,
                                                selectedB,
                                                op,
                                            );
                                        } else {
                                            setPendingOp(op);
                                        }
                                    }}
                                    className={`
                                        w-10 h-10 rounded-[4px] font-heading font-bold text-lg transition-all
                                        ${
                                            pendingOp === op
                                                ? "bg-game-cyan text-[#001c2d] shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                                                : "bg-game-amber text-amber-950 hover:bg-amber-300"
                                        }
                                    `}
                                >
                                    {op === "*" ? "×" : op === "/" ? "÷" : op}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Steps trail */}
                    {steps.length > 0 && (
                        <div className="text-game-muted text-xs text-center font-mono">
                            {steps.map((s, i) => (
                                <span key={i}>
                                    {s.a}{" "}
                                    {s.operator === "*"
                                        ? "×"
                                        : s.operator === "/"
                                          ? "÷"
                                          : s.operator}{" "}
                                    {s.b} = {s.result}
                                    {i < steps.length - 1 ? " → " : ""}
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        className="text-game-muted/50 text-xs hover:text-game-muted underline transition-colors"
                    >
                        Reset
                    </button>
                </div>
            ) : isMeProver && myProof ? (
                <div
                    className={`text-center p-4 rounded-[4px] border ${
                        myProof.isCorrect
                            ? "bg-game-green/10 border-game-green/40"
                            : "bg-game-coral/10 border-game-coral/40"
                    }`}
                >
                    <p className="text-2xl mb-1">
                        {myProof.isCorrect ? "✅" : "❌"}
                    </p>
                    <p
                        className={`font-heading font-bold tracking-wider ${myProof.isCorrect ? "text-game-green" : "text-game-coral"}`}
                    >
                        {myProof.isCorrect ? "Benar!" : "Salah!"}
                    </p>
                </div>
            ) : (
                <p className="text-game-muted text-sm text-center">
                    Menunggu pemain lain membuktikan...
                </p>
            )}
        </div>
    );
}
