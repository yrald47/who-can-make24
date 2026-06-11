import { useState } from "react";
import type { ProofStep } from "@who-can-make24/shared";
import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";

const SUIT_COLOR: Record<string, string> = {
    spades: "text-game-text",
    hearts: "text-game-coral",
    diamonds: "text-game-coral",
    clubs: "text-game-text",
};

export function PvpPhase() {
    const { gameState, timer, submitPvpProof } = useGameContext();
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
    const [skipped, setSkipped] = useState(false);

    if (!gameState || !currentRoom) return null;

    const myId = socket.id ?? "";
    const myProof = gameState.proofs.find((p) => p.playerId === myId);
    const winnerProof = gameState.proofs.find((p) => p.isCorrect);
    const winner = winnerProof
        ? currentRoom.players.find((p) => p.id === winnerProof.playerId)
        : null;

    function handleCardTap(index: number) {
        if (submitted || myProof) return;
        if (submitted || myProof || winnerProof) return;
        if (workingCards.length <= 1) return;

        if (selectedA === null) {
            setSelectedA(index);
        } else if (index === selectedA) {
            setSelectedA(null);
            setPendingOp(null);
            setSelectedB(null);
        } else if (pendingOp !== null) {
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
            submitPvpProof(newSteps);
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
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <p className="section-label">⚡ PVP — Race to 24</p>
            </div>

            {/* Timer */}
            <div
                className={`ont-bold text-2xl font-heading ${timer <= 10 ? "text-game-coral" : "text-game-amber"}`}
            >
                {timer}s
            </div>

            {/* Score board */}
            <div className="flex gap-4">
                {currentRoom.players.map((player) => (
                    <div
                        key={player.id}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-[3px] border text-xs
                            ${
                                player.id === myId
                                    ? "border-game-cyan/50 bg-game-cyan/10 text-game-cyan"
                                    : "border-game-border bg-game-surface text-game-muted"
                            }
                        `}
                    >
                        <span>{player.avatar}</span>
                        <span className="font-heading tracking-wider">
                            {player.name}
                        </span>
                        <span className="font-bold text-game-amber">
                            {gameState.scores[player.id] ?? 0}
                        </span>
                        {gameState.proofs.find(
                            (p) => p.playerId === player.id,
                        ) && (
                            <span>
                                {gameState.proofs.find(
                                    (p) => p.playerId === player.id,
                                )?.isCorrect
                                    ? "✓"
                                    : "✗"}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Opponent menang duluan — tampil di atas cards */}
            {!myProof && winnerProof && winner && (
                <div className="text-center p-3 rounded-sm border border-game-amber/40 bg-game-amber/10 w-full max-w-xs">
                    <p className="text-game-amber font-heading tracking-widest text-sm">
                        ⚡ {winner.id === myId ? "YOU" : winner.name} MADE 24
                        FIRST!
                    </p>
                    <p className="text-game-muted text-xs mt-1">
                        Next round in 3s...
                    </p>
                </div>
            )}

            {/* Cards */}
            {!myProof ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    <div className="flex gap-2 justify-center">
                        {workingCards.map((card, i) => (
                            <button
                                key={i}
                                onClick={() => handleCardTap(i)}
                                disabled={!!myProof || !!winnerProof}
                                className={`
                                    w-16 h-24 rounded-sm border flex flex-col items-center justify-center
                                    font-heading font-bold transition-all
                                    ${
                                        selectedA === i
                                            ? "bg-game-cyan/15 border-game-cyan shadow-[0_0_12px_rgba(56,189,248,0.2)] -translate-y-1"
                                            : selectedB === i
                                              ? "bg-game-amber/15 border-game-amber -translate-y-1"
                                              : "bg-black/60 border-game-border hover:border-game-cyan/40 hover:-translate-y-0.5"
                                    }
                                `}
                            >
                                {card.originalIndex >= 0 && (
                                    <>
                                        <span
                                            className={`text-xs leading-none ${SUIT_COLOR[gameState.currentCards[card.originalIndex]?.suit ?? "spades"]}`}
                                        >
                                            {card.display}
                                        </span>
                                        <span
                                            className={`text-sm leading-none ${SUIT_COLOR[gameState.currentCards[card.originalIndex]?.suit ?? "spades"]}`}
                                        >
                                            {gameState.currentCards[
                                                card.originalIndex
                                            ]?.suit === "hearts"
                                                ? "♥"
                                                : gameState.currentCards[
                                                        card.originalIndex
                                                    ]?.suit === "diamonds"
                                                    ? "♦"
                                                    : gameState.currentCards[
                                                            card.originalIndex
                                                        ]?.suit === "spades"
                                                        ? "♠"
                                                    : "♣"}
                                        </span>
                                    </>
                                )}
                                <span
                                    className={`font-mono font-bold ${card.originalIndex < 0 ? "text-game-cyan text-xl" : "text-game-muted/70 text-sm mt-1"}`}
                                >
                                    {card.value}
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
                                    disabled={!!myProof || !!winnerProof}
                                    className={`
                                        w-12 h-12 rounded-[3px] border text-lg font-bold font-mono transition-all
                                        ${
                                            pendingOp === op
                                                ? "bg-game-amber/20 border-game-amber text-game-amber"
                                                : "bg-black/50 border-game-border text-game-muted hover:border-game-amber/40 hover:text-game-amber/70"
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
                        className="text-game-muted/50 text-xs hover:text-game-muted transition-colors"
                    >
                        ↺ Reset
                    </button>
                </div>
            ) : (
                <div
                    className={`text-center p-4 rounded-sm border w-full max-w-xs ${
                        myProof.isCorrect
                            ? "border-game-cyan/40 bg-game-cyan/10"
                            : "border-game-coral/40 bg-game-coral/10"
                    }`}
                >
                    <p className="text-2xl mb-1">
                        {myProof.isCorrect ? "✓" : "✗"}
                    </p>
                    <p
                        className={`font-heading tracking-widest text-sm ${myProof.isCorrect ? "text-game-cyan" : "text-game-coral"}`}
                    >
                        {myProof.isCorrect
                            ? "YOU MADE 24!"
                            : "OPPONENT MADE 24 FIRST"}
                    </p>
                    {winner && (
                        <p className="text-game-muted text-xs mt-1">
                            {winner.id === myId
                                ? "You got it! +1 point"
                                : `${winner.name} got it first`}
                        </p>
                    )}
                    <p className="text-game-muted/50 text-xs mt-1">
                        Next round in 3s...
                    </p>
                </div>
            )}

            {/* {timer <= 30 && !myProof && (
                <button
                    onClick={() => socket.emit("game:pvp-surrender")}
                    className="text-game-muted/50 text-xs hover:text-game-coral transition-colors"
                >
                    Skip hand
                </button>
            )} */}
            {timer <= 30 && !myProof && !skipped && (
                <button
                    onClick={() => {
                        setSkipped(true);
                        socket.emit("game:pvp-surrender");
                    }}
                    className="text-game-muted/50 text-xs hover:text-game-coral transition-colors"
                >
                    Skip hand
                </button>
            )}
            {skipped && (
                <p className="text-game-muted/50 text-xs">Skipping...</p>
            )}
        </div>
    );
}
