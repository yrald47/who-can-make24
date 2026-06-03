import { useState, useRef } from "react";
import { generateSolvableHand, type TrainingCard } from "../../lib/solver";

type Op = "+" | "-" | "×" | "÷";
const OPS: Op[] = ["+", "-", "×", "÷"];

interface TrainingPanelProps {
    onBack: () => void;
}

interface Step {
    aLabel: string;
    bLabel: string;
    op: Op;
    result: number;
}

interface AvailCard {
    value: number;
    label: string;
    id: number;
    suit: string;
}

const SUIT_COLOR: Record<string, string> = {
    "♥": "text-game-coral",
    "♦": "text-game-coral",
    "♠": "text-game-text",
    "♣": "text-game-text",
};

let idCounter = 100;

export function TrainingPanel({ onBack }: TrainingPanelProps) {
    const [hand, setHand] = useState<TrainingCard[]>(() =>
        generateSolvableHand(),
    );
    const [available, setAvailable] = useState<AvailCard[]>(() =>
        generateSolvableHand().map((c, i) => ({
            value: c.value,
            label: c.rank,
            id: i,
            suit: c.suit,
        })),
    );
    const [selected, setSelected] = useState<number[]>([]);
    const [selectedOp, setSelectedOp] = useState<Op | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);
    const [status, setStatus] = useState<"playing" | "correct" | "wrong">(
        "playing",
    );
    const [solved, setSolved] = useState(0);

    // Refs to hold latest state for use in handlers without stale closures
    const availableRef = useRef<AvailCard[]>(available);
    const selectedRef = useRef<number[]>(selected);
    const selectedOpRef = useRef<Op | null>(null);
    const statusRef = useRef<"playing" | "correct" | "wrong">("playing");

    function syncAvailable(val: AvailCard[]) {
        availableRef.current = val;
        setAvailable(val);
    }
    function syncSelected(val: number[]) {
        selectedRef.current = val;
        setSelected(val);
    }
    function syncOp(val: Op | null) {
        selectedOpRef.current = val;
        setSelectedOp(val);
    }
    function syncStatus(val: "playing" | "correct" | "wrong") {
        statusRef.current = val;
        setStatus(val);
    }

    function resetHand(h: TrainingCard[]) {
        const cards = h.map((c, i) => ({
            value: c.value,
            label: c.rank,
            id: i,
            suit: c.suit,
        }));
        syncAvailable(cards);
        syncSelected([]);
        syncOp(null);
        setSteps([]);
        syncStatus("playing");
    }

    function newHand() {
        const h = generateSolvableHand();
        setHand(h);
        resetHand(h);
    }

    function doApply(sel: number[], op: Op, avail: AvailCard[]) {
        const [idxA, idxB] = sel;
        const cardA = avail[idxA!];
        const cardB = avail[idxB!];
        if (!cardA || !cardB) return;

        let result: number | null = null;
        if (op === "+") result = cardA.value + cardB.value;
        else if (op === "-") result = cardA.value - cardB.value;
        else if (op === "×") result = cardA.value * cardB.value;
        else if (op === "÷") {
            if (cardB.value === 0 || cardA.value % cardB.value !== 0) {
                syncStatus("wrong");
                return;
            }
            result = cardA.value / cardB.value;
        }
        if (result === null) return;

        setSteps((prev) => [
            ...prev,
            { aLabel: cardA.label, bLabel: cardB.label, op, result: result! },
        ]);

        const newAvail: AvailCard[] = [
            ...avail.filter((_, i) => i !== idxA && i !== idxB),
            { value: result, label: `${result}`, id: ++idCounter, suit: "♠" },
        ];

        syncAvailable(newAvail);
        syncSelected([]);
        syncOp(null);

        if (newAvail.length === 1) {
            if (result === 24) {
                syncStatus("correct");
                setSolved((s) => s + 1);
            } else {
                syncStatus("wrong");
            }
        }
    }

    function handleSelectCard(idx: number) {
        if (statusRef.current !== "playing") return;

        const prev = selectedRef.current;
        if (prev.includes(idx)) {
            syncSelected(prev.filter((i) => i !== idx));
            return;
        }
        if (prev.length >= 2) return;

        const next = [...prev, idx];
        syncSelected(next);

        if (next.length === 2 && selectedOpRef.current) {
            doApply(next, selectedOpRef.current, availableRef.current);
        }
    }

    function handleSelectOp(op: Op) {
        if (statusRef.current !== "playing") return;

        if (selectedOpRef.current === op) {
            syncOp(null);
            return;
        }

        syncOp(op);

        if (selectedRef.current.length === 2) {
            doApply(selectedRef.current, op, availableRef.current);
        }
    }

    return (
        <div className="flex flex-col h-full gap-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="section-label flex-1">Train Your Brain</p>
                <span className="text-game-muted text-xs font-heading tracking-widest mr-3">
                    SOLVED: <span className="text-game-cyan">{solved}</span>
                </span>
                <button
                    onClick={onBack}
                    className="text-[0.6rem] font-heading tracking-widest uppercase text-game-muted hover:text-game-cyan border border-game-border hover:border-game-cyan/40 px-2 py-1 rounded-[3px] transition-all whitespace-nowrap"
                >
                    ← Rooms
                </button>
            </div>

            {/* Cards */}
            <div className="flex gap-2 justify-center">
                {available.map((card, idx) => {
                    const isSelected = selected.includes(idx);
                    const isResult = card.id >= 100;
                    return (
                        <button
                            key={card.id}
                            onClick={() => handleSelectCard(idx)}
                            disabled={status !== "playing"}
                            className={`
                                relative w-16 h-24 rounded-[4px] border-6 border-game-amber flex flex-col items-center justify-center p-1.5
                                font-heading font-bold transition-all
                                ${
                                    isSelected
                                        ? "bg-game-cyan/15 border-game-cyan shadow-[0_0_12px_rgba(56,189,248,0.2)] -translate-y-1"
                                        : "bg-black/60 border-game-border hover:border-game-cyan/40 hover:-translate-y-0.5 cursor-pointer"
                                }
                            `}
                        >
                            {!isResult && (
                                <>
                                    <span
                                        className={`text-xs leading-none ${SUIT_COLOR[card.suit] ?? "text-game-text"}`}
                                    >
                                        {card.label}
                                    </span>
                                    <span
                                        className={`text-sm leading-none ${SUIT_COLOR[card.suit] ?? "text-game-text"}`}
                                    >
                                        {card.suit}
                                    </span>
                                </>
                            )}
                            <span
                                className={`font-mono font-bold ${isResult ? "text-game-cyan text-base" : "text-game-muted/70 text-sm"}`}
                            >
                                {card.value}
                            </span>
                        </button>
                    );
                })}
                {/* {Array.from({ length: 4 - available.length }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="w-16 h-24 rounded-[4px] border border-game-border/20 bg-black/20 opacity-20"
                    />
                ))} */}
            </div>

            {/* Operators */}
            <div className="flex gap-2 justify-center">
                {OPS.map((op) => (
                    <button
                        key={op}
                        onClick={() => handleSelectOp(op)}
                        disabled={status !== "playing"}
                        className={`
                            w-12 h-12 rounded-[3px] border text-lg font-bold font-mono transition-all
                            ${
                                selectedOp === op
                                    ? "bg-game-amber/20 border-game-amber text-game-amber shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                                    : "bg-black/50 border-game-border text-game-muted hover:border-game-amber/40 hover:text-game-amber/70"
                            }
                        `}
                    >
                        {op}
                    </button>
                ))}
            </div>

            {/* Steps log */}
            <div className="flex-1 flex flex-col gap-1 min-h-[60px]">
                {steps.map((s, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-center gap-1.5 text-xs font-mono"
                    >
                        <span className="text-game-text">{s.aLabel}</span>
                        <span className="text-game-amber">{s.op}</span>
                        <span className="text-game-text">{s.bLabel}</span>
                        <span className="text-game-muted">=</span>
                        <span
                            className={
                                i === steps.length - 1 && status === "correct"
                                    ? "text-game-cyan font-bold"
                                    : "text-game-text"
                            }
                        >
                            {s.result}
                        </span>
                    </div>
                ))}
            </div>

            {/* Status */}
            {status === "correct" && (
                <div className="text-center">
                    <p className="text-game-cyan font-heading tracking-widest text-sm mb-3">
                        ✓ CORRECT — YOU MADE 24!
                    </p>
                    <button
                        onClick={newHand}
                        className="px-6 py-2 rounded-[3px] text-sm font-heading tracking-widest uppercase bg-game-cyan/15 border border-game-cyan/50 text-game-cyan hover:bg-game-cyan/25 transition-all"
                    >
                        Next Hand →
                    </button>
                </div>
            )}

            {status === "wrong" && (
                <div className="text-center">
                    <p className="text-game-coral font-heading tracking-widest text-sm mb-3">
                        ✗ NOT 24 — TRY AGAIN
                    </p>
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => resetHand(hand)}
                            className="px-5 py-2 rounded-[3px] text-sm font-heading tracking-widest uppercase bg-black/50 border border-game-border text-game-muted hover:border-game-border/60 hover:text-game-text transition-all"
                        >
                            Reset
                        </button>
                        <button
                            onClick={newHand}
                            className="px-5 py-2 rounded-[3px] text-sm font-heading tracking-widest uppercase bg-game-coral/10 border border-game-coral/40 text-game-coral hover:bg-game-coral/20 transition-all"
                        >
                            New Hand
                        </button>
                    </div>
                </div>
            )}

            {status === "playing" && available.length > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-xs text-game-muted opacity-50">
                        {selected.length === 0
                            ? "Select 2 cards"
                            : selected.length === 1
                                ? "Select 1 more"
                                : "Select operator"}
                    </p>
                    <button
                        onClick={() => resetHand(hand)}
                        className="text-xs text-game-muted hover:text-game-text transition-colors"
                    >
                        ↺ Reset
                    </button>
                </div>
            )}
        </div>
    );
}
