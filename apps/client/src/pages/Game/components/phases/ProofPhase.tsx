import { useState } from "react";
import type { ProofStep } from "@who-can-make24/shared";
import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";
// import { GAME_CONSTANTS } from "@who-can-make24/shared";

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

    // Siapa yang harus buktikan
    const provers = [...new Set(Object.values(gameState.pointingTargets))];
    const isMeProver = provers.includes(myId);
    const myProof = gameState.proofs.find((p) => p.playerId === myId);

    function handleCardTap(index: number) {
        if (!isMeProver || submitted || myProof) return;
        if (workingCards.length <= 1) return;

        if (selectedA === null) {
            setSelectedA(index);
            // setSelectedB(null);
        } else if (index === selectedA) {
            setSelectedA(null);
            setPendingOp(null);
            setSelectedB(null);
        }else if(pendingOp != null) {
            setSelectedB(index)
            handleOperator(selectedA, index, pendingOp)
        } else {
            // if (selectedA === index) {
            //     setSelectedA(null);
            //     return;
            // }
            // Dua kartu dipilih, tunggu operator
            // handleOperator(selectedA, index);
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

        // Update working cards — hapus dua yang dipakai, tambah hasil
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
        setPendingOp(null)

        // Auto submit kalau tinggal satu kartu
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
        setPendingOp(null)
        setSubmitted(false);
    }

    const OPERATORS: ("+" | "-" | "*" | "/")[] = ["+", "-", "*", "/"];

    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
            <h3 className="text-white font-bold text-lg">Fase Pembuktian</h3>

            {/* Timer */}
            <div className="flex items-center gap-2">
                <span
                    className={`font-mono font-bold text-xl ${timer <= 10 ? "text-red-300" : "text-yellow-300"}`}
                >
                    {timer}s
                </span>
            </div>

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
                                flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                                ${
                                    proof
                                        ? proof.isCorrect
                                            ? "bg-green-500/30 text-green-300"
                                            : "bg-red-500/30 text-red-300"
                                        : "bg-white/10 text-white/70"
                                }
                                ${proverId === myId ? "ring-1 ring-yellow-400" : ""}
                            `}
                        >
                            <span>{player?.avatar}</span>
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
                                    w-14 h-20 bg-white rounded-xl border-2 shadow-md
                                    flex flex-col items-center justify-center transition-all
                                    ${selectedA === i ? "border-yellow-500 scale-110" : ""}
                                    ${selectedB === i ? "border-green-500 scale-110" : ""}
                                    ${selectedA !== i && selectedB !== i ? "border-gray-200 hover:border-blue-300" : ""}
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

                    {/* Operator buttons — muncul setelah pilih kartu pertama */}
                    {/* {selectedA !== null && (
                        <div className="flex gap-2">
                            {OPERATORS.map((op) => (
                                <button
                                    key={op}
                                    onClick={() => {
                                        // Pilih kartu lain dulu — untuk now pilih kartu selanjutnya otomatis
                                        const nextIndex =
                                            workingCards.findIndex(
                                                (_, i) => i !== selectedA,
                                            );
                                        if (nextIndex !== -1)
                                            handleOperator(
                                                selectedA,
                                                nextIndex,
                                                op,
                                            );
                                    }}
                                    className="w-10 h-10 bg-yellow-400 text-blue-900 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
                                >
                                    {op === "*" ? "×" : op === "/" ? "÷" : op}
                                </button>
                            ))}
                        </div>
                    )} */}
                    {selectedA !== null && (
                        <div className="flex gap-2">
                            {OPERATORS.map((op) => (
                                <button
                                    key={op}
                                    onClick={() => {
                                        if (selectedB !== null) {
                                            // Dua kartu sudah dipilih, langsung eksekusi
                                            handleOperator(
                                                selectedA,
                                                selectedB,
                                                op,
                                            );
                                        } else {
                                            // Baru satu kartu, set pending operator
                                            setPendingOp(op);
                                        }
                                    }}
                                    className={`
                                        w-10 h-10 rounded-lg font-bold text-lg transition-colors
                                        ${
                                            pendingOp === op
                                                ? "bg-blue-500 text-white"
                                                : "bg-yellow-400 text-blue-900 hover:bg-yellow-300"
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
                        <div className="text-white/70 text-xs text-center">
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
                        className="text-white/50 text-xs hover:text-white/80 underline"
                    >
                        Reset
                    </button>
                </div>
            ) : isMeProver && myProof ? (
                <div
                    className={`text-center p-4 rounded-xl ${myProof.isCorrect ? "bg-green-500/20" : "bg-red-500/20"}`}
                >
                    <p className="text-2xl mb-1">
                        {myProof.isCorrect ? "✅" : "❌"}
                    </p>
                    <p
                        className={`font-bold ${myProof.isCorrect ? "text-green-300" : "text-red-300"}`}
                    >
                        {myProof.isCorrect ? "Benar!" : "Salah!"}
                    </p>
                </div>
            ) : (
                <p className="text-white/60 text-sm text-center">
                    Menunggu pemain lain membuktikan...
                </p>
            )}
        </div>
    );
}
