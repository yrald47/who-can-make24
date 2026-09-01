import { useState, useRef, useEffect } from "react";
import { generateSolvableHand } from "../../lib/solver";
import { createPortal } from "react-dom";

// solver returns suit as symbol string — map to display
type SuitSymbol = "♠" | "♥" | "♦" | "♣";
type TrainingCard = { value: number; rank: string; suit: SuitSymbol };
type AvailCard = {
    value: number;
    label: string;
    id: number;
    suit: SuitSymbol | "result";
};
type ProofStep = { a: number; b: number; operator: string; result: number };
type Status = "playing" | "correct" | "wrong";
type TrainingMode = "no-timer" | "speed-run" | "time-attack";

interface ScoreCardData {
    mode: TrainingMode;
    playerName: string;
    isWild: boolean;
    cases?: number;
    totalTime?: number;
    duration?: number;
    solved?: number;
    timestamp: number;
}

interface TrainingPanelProps {
    onBack?: () => void;
}

const SUIT_COLOR: Record<string, string> = {
    "♠": "text-game-text",
    "♥": "text-game-coral",
    "♦": "text-game-coral",
    "♣": "text-game-text",
};

const OPERATORS = ["+", "-", "×", "÷"] as const;
const OP_MAP: Record<string, string> = { "×": "*", "÷": "/" };

const SPEEDRUN_CASES = 5;
const TIME_ATTACK_SECONDS = 60;

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ── SCORE CARD ────────────────────────────────────────────────────────────────
function ScoreCard({
    data,
    onClose,
}: {
    data: ScoreCardData;
    onClose: () => void;
}) {
    const isSpeedRun = data.mode === "speed-run";
    const mainStat = isSpeedRun
        ? formatTime(data.totalTime ?? 0)
        : `${data.solved ?? 0}`;
    const subStat = isSpeedRun
        ? `${data.cases} cases`
        : `in ${formatTime(data.duration ?? 0)}`;
    const modeLabel = isSpeedRun ? "SPEED RUN" : "TIME ATTACK";
    const modeColor = isSpeedRun ? "#38bdf8" : "#fbbf24";
    const accentColor = isSpeedRun ? "#a855f7" : "#f87171";

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="flex flex-col items-center gap-4 w-full max-w-xs pb-20 md:pb-4">
                {/* Card */}
                <div
                    style={{
                        width: "100%",
                        aspectRatio: "9/16",
                        maxHeight: "75vh",
                        background: "#0d1117",
                        border: `3px solid ${modeColor}`,
                        boxShadow: `6px 6px 0 ${modeColor}`,
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        fontFamily: "var(--font-heading)",
                    }}
                >
                    {/* Top bar */}
                    <div
                        style={{
                            background: modeColor,
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <span
                            style={{
                                color: "#0d1117",
                                fontWeight: 800,
                                fontSize: "0.7rem",
                                letterSpacing: "0.2em",
                            }}
                        >
                            WHO CAN MAKE24?
                        </span>
                        <span
                            style={{
                                color: "#0d1117",
                                fontSize: "0.6rem",
                                letterSpacing: "0.12em",
                                opacity: 0.7,
                            }}
                        >
                            {data.isWild ? "🃏 WILD" : "NORMAL"}
                        </span>
                    </div>

                    {/* Mode badge */}
                    <div style={{ padding: "20px 16px 0" }}>
                        <div
                            style={{
                                display: "inline-block",
                                background: accentColor,
                                color: "#fff",
                                padding: "3px 10px",
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                letterSpacing: "0.2em",
                                clipPath:
                                    "polygon(0 0, 100% 0, 96% 100%, 4% 100%)",
                            }}
                        >
                            {modeLabel}
                        </div>
                    </div>

                    {/* Player name */}
                    <div style={{ padding: "12px 16px 0" }}>
                        <div
                            style={{
                                color: "#8b949e",
                                fontSize: "0.6rem",
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                marginBottom: 4,
                            }}
                        >
                            Player
                        </div>
                        <div
                            style={{
                                color: "#e6edf3",
                                fontSize: "1.3rem",
                                fontWeight: 800,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                lineHeight: 1.1,
                                borderBottom: `2px solid ${modeColor}`,
                                paddingBottom: 8,
                            }}
                        >
                            {data.playerName}
                        </div>
                    </div>

                    {/* Main stat */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 16px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "4.5rem",
                                fontWeight: 900,
                                color: modeColor,
                                lineHeight: 1,
                                letterSpacing: "-0.02em",
                                textShadow: `4px 4px 0 ${accentColor}`,
                            }}
                        >
                            {mainStat}
                        </div>
                        <div
                            style={{
                                color: "#8b949e",
                                fontSize: "0.75rem",
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                marginTop: 8,
                            }}
                        >
                            {subStat}
                        </div>
                        <div
                            style={{
                                width: "60%",
                                height: 2,
                                background: `linear-gradient(90deg, transparent, ${modeColor}, transparent)`,
                                margin: "20px 0",
                            }}
                        />
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                width: "100%",
                            }}
                        >
                            {[
                                { label: "Mode", value: modeLabel },
                                {
                                    label: "Deck",
                                    value: data.isWild
                                        ? "Wild 52"
                                        : "Normal 40",
                                },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    style={{
                                        background: "#161b22",
                                        border: "1px solid #3d5a7a",
                                        padding: "8px 10px",
                                        clipPath:
                                            "polygon(0 0, 100% 0, 97% 100%, 3% 100%)",
                                    }}
                                >
                                    <div
                                        style={{
                                            color: "#8b949e",
                                            fontSize: "0.55rem",
                                            letterSpacing: "0.14em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {label}
                                    </div>
                                    <div
                                        style={{
                                            color: "#e6edf3",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            marginTop: 2,
                                        }}
                                    >
                                        {value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom */}
                    <div
                        style={{
                            padding: "12px 16px",
                            borderTop: "1px solid #3d5a7a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                color: "#8b949e",
                                fontSize: "0.55rem",
                                letterSpacing: "0.1em",
                            }}
                        >
                            {formatDate(data.timestamp)}
                        </div>
                        <div
                            style={{
                                color: modeColor,
                                fontSize: "0.55rem",
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                opacity: 0.7,
                            }}
                        >
                            whocanmake24.my.id
                        </div>
                    </div>

                    {/* Corner accent */}
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 40,
                            height: 40,
                            background: accentColor,
                            clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                            opacity: 0.4,
                        }}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full">
                    <button
                        onClick={onClose}
                        className="btn-moco btn-moco-ghost flex-1"
                    >
                        <span>← Back</span>
                    </button>
                    <button
                        disabled
                        className="btn-moco btn-moco-cyan flex-1 opacity-30 cursor-not-allowed"
                        title="Login required"
                    >
                        <span>💾 Save History</span>
                    </button>
                </div>
                <p className="text-game-muted/40 text-xs text-center -mt-2">
                    Screenshot to share · History requires Google login
                </p>
            </div>
        </div>,
        document.body
    );
}

// ── MODE SELECTOR (di luar component utama) ───────────────────────────────────
function ModeSelector({
    mode,
    onChange,
}: {
    mode: TrainingMode;
    onChange: (m: TrainingMode) => void;
}) {
    const modes: { value: TrainingMode; label: string }[] = [
        { value: "no-timer", label: "Free" },
        { value: "speed-run", label: "Speed" },
        { value: "time-attack", label: "Attack" },
    ];

    return (
        <div className="flex gap-1 p-1 bg-black/40 rounded-[3px] border border-game-border/50">
            {modes.map((m) => (
                <button
                    key={m.value}
                    onClick={() => onChange(m.value)}
                    className={`
                        flex-1 py-1 text-[0.6rem] font-heading tracking-[0.1em] uppercase
                        rounded-[2px] transition-all
                        ${
                            mode === m.value
                                ? m.value === "no-timer"
                                    ? "bg-game-surface2 text-game-text border border-game-border"
                                    : m.value === "speed-run"
                                    ? "bg-game-cyan/15 text-game-cyan border border-game-cyan/40"
                                    : "bg-game-amber/15 text-game-amber border border-game-amber/40"
                                : "text-game-muted/50 hover:text-game-muted"
                        }
                    `}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
}

// ── TIMER DISPLAY (di luar component utama) ───────────────────────────────────
function TimerDisplay({
    mode,
    sessionStarted,
    elapsedTime,
    timeLeft,
}: {
    mode: TrainingMode;
    sessionStarted: boolean;
    elapsedTime: number;
    timeLeft: number;
}) {
    if (mode === "no-timer" || !sessionStarted) return null;

    if (mode === "speed-run") {
        return (
            <div className="flex items-center justify-between">
                <span className="text-game-muted text-xs font-heading tracking-wider">
                    TIME
                </span>
                <span className="font-heading font-bold text-game-cyan text-sm tabular-nums">
                    {formatTime(elapsedTime)}
                </span>
            </div>
        );
    }

    const urgent = timeLeft <= 10;
    return (
        <div className="flex items-center justify-between">
            <span className="text-game-muted text-xs font-heading tracking-wider">
                TIME LEFT
            </span>
            <span
                className={`font-heading font-bold text-sm tabular-nums ${urgent ? "text-game-coral animate-pulse" : "text-game-amber"}`}
            >
                {formatTime(timeLeft)}
            </span>
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export function TrainingPanel({ onBack }: TrainingPanelProps) {
    const [isWild, setIsWild] = useState(false);
    function freshHand() {
        return generateSolvableHand(isWild) as TrainingCard[];
    }

    const [hand, setHand] = useState<TrainingCard[]>(() => freshHand());
    const [available, setAvailable] = useState<AvailCard[]>(() =>
        freshHand().map((c, i) => ({
            value: c.value,
            label: c.rank,
            id: i,
            suit: c.suit,
        })),
    );
    const [selectedA, setSelectedA] = useState<AvailCard | null>(null);
    const [selectedOp, setSelectedOp] = useState<string | null>(null);
    const [steps, setSteps] = useState<ProofStep[]>([]);
    const [status, setStatus] = useState<Status>("playing");
    const [solvedCount, setSolvedCount] = useState(0);

    const [mode, setMode] = useState<TrainingMode>("no-timer");
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);

    const [elapsedTime, setElapsedTime] = useState(0);
    const elapsedRef = useRef(0);
    const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_SECONDS);
    const timeLeftRef = useRef(TIME_ATTACK_SECONDS);
    const solvedRef = useRef(0);

    const [scoreCard, setScoreCard] = useState<ScoreCardData | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const idCounterRef = useRef(100);

    const [playerName] = useState<string>(() => {
        try {
            const raw = localStorage.getItem("wmc24_identity");
            if (raw) {
                const parsed = JSON.parse(raw) as { name?: string };
                return parsed.name?.trim() || "Anonymous";
            }
            //eslint-disable-next-line
        } catch (_e) {
            /* localStorage not available */
        }
        return "Anonymous";
    });

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    function newHand() {
        const h = freshHand();
        setHand(h);
        setAvailable(
            h.map((c, i) => ({
                value: c.value,
                label: c.rank,
                id: i,
                suit: c.suit,
            })),
        );
        setSelectedA(null);
        setSelectedOp(null);
        setSteps([]);
        setStatus("playing");
    }

    function resetHand(currentHand: TrainingCard[]) {
        setAvailable(
            currentHand.map((c, i) => ({
                value: c.value,
                label: c.rank,
                id: i,
                suit: c.suit,
            })),
        );
        setSelectedA(null);
        setSelectedOp(null);
        setSteps([]);
        setStatus("playing");
    }

    function handleModeChange(m: TrainingMode) {
        setMode(m);
        setSessionStarted(false);
        setSessionActive(false);
        setSolvedCount(0);
        solvedRef.current = 0;
        if (timerRef.current) clearInterval(timerRef.current);
    }

    function startSession() {
        setSessionActive(true);
        setSessionStarted(true);
        setSolvedCount(0);
        solvedRef.current = 0;
        setElapsedTime(0);
        elapsedRef.current = 0;
        setTimeLeft(TIME_ATTACK_SECONDS);
        timeLeftRef.current = TIME_ATTACK_SECONDS;

        if (timerRef.current) clearInterval(timerRef.current);

        if (mode === "speed-run") {
            timerRef.current = setInterval(() => {
                elapsedRef.current += 1;
                setElapsedTime(elapsedRef.current);
            }, 1000);
        } else if (mode === "time-attack") {
            timerRef.current = setInterval(() => {
                timeLeftRef.current -= 1;
                setTimeLeft(timeLeftRef.current);
                if (timeLeftRef.current <= 0) {
                    clearInterval(timerRef.current!);
                    setSessionActive(false);
                    setScoreCard({
                        mode: "time-attack",
                        playerName,
                        isWild,
                        timestamp: Date.now(),
                        duration: TIME_ATTACK_SECONDS,
                        solved: solvedRef.current,
                    });
                }
            }, 1000);
        }

        newHand();
    }

    function handleCardClick(card: AvailCard) {
        if (status !== "playing") return;
        if (!selectedA) {
            setSelectedA(card);
        } else if (selectedA.id === card.id) {
            setSelectedA(null);
            setSelectedOp(null);
        } else if (selectedOp) {
            applyOp(selectedA, card, selectedOp);
        } else {
            setSelectedA(card);
        }
    }

    function handleOpClick(op: string) {
        if (status !== "playing" || !selectedA) return;
        setSelectedOp(op === selectedOp ? null : op);
    }

    function applyOp(a: AvailCard, b: AvailCard, op: string) {
        const realOp = OP_MAP[op] ?? op;
        let result: number;
        if (realOp === "+") result = a.value + b.value;
        else if (realOp === "-") result = a.value - b.value;
        else if (realOp === "*") result = a.value * b.value;
        else result = b.value !== 0 ? a.value / b.value : NaN;

        if (isNaN(result) || !isFinite(result)) return;

        const step: ProofStep = {
            a: a.value,
            b: b.value,
            operator: op,
            result: Math.round(result * 10000) / 10000,
        };
        const newSteps = [...steps, step];
        setSteps(newSteps);

        idCounterRef.current += 1;
        const newId = idCounterRef.current;
        const newAvail: AvailCard[] = [
            ...available.filter((c) => c.id !== a.id && c.id !== b.id),
            {
                value: result,
                label: String(Math.round(result * 100) / 100),
                // id: Date.now(),
                id: newId,
                suit: "result" as const,
            },
        ];
        setSelectedA(null);
        setSelectedOp(null);
        setAvailable(newAvail);

        if (newAvail.length === 1) {
            const correct = Math.abs(result - 24) < 1e-9;
            setStatus(correct ? "correct" : "wrong");

            if (correct) {
                const newSolved = solvedRef.current + 1;
                solvedRef.current = newSolved;
                setSolvedCount(newSolved);

                if (mode === "speed-run" && newSolved >= SPEEDRUN_CASES) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setSessionActive(false);
                    setScoreCard({
                        mode: "speed-run",
                        playerName,
                        isWild,
                        // eslint-disable-next-line
                        timestamp: Date.now(),
                        cases: SPEEDRUN_CASES,
                        totalTime: elapsedRef.current,
                    });
                    return;
                }

                setTimeout(() => newHand(), 900);
            }
        }
    }

    function handleScoreCardClose() {
        setScoreCard(null);
        setSessionStarted(false);
        setSolvedCount(0);
        solvedRef.current = 0;
        setElapsedTime(0);
        setTimeLeft(TIME_ATTACK_SECONDS);
        newHand();
    }

    const showBoard = mode === "no-timer" || sessionActive || sessionStarted;

    return (
        <>
            {scoreCard && (
                <ScoreCard data={scoreCard} onClose={handleScoreCardClose} />
            )}

            <div className="flex flex-col h-full gap-2 p-4 overflow-y-auto">
                {/* Header — back button + mode selector */}
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="text-game-muted hover:text-game-text transition-colors text-xs font-heading tracking-wider shrink-0"
                        >
                            ← ROOMS
                        </button>
                    )}
                    <div className="flex-1">
                        <ModeSelector mode={mode} onChange={handleModeChange} />
                        {/* Wild toggle */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-game-muted text-xs font-heading tracking-wider">
                                {isWild
                                    ? "🃏 Wild (J=11 Q=12 K=13)"
                                    : "Normal deck"}
                            </span>
                            <button
                                onClick={() => {
                                    setIsWild((w) => !w);
                                    setSessionStarted(false);
                                    setSessionActive(false);
                                    setSolvedCount(0);
                                    solvedRef.current = 0;
                                    if (timerRef.current)
                                        clearInterval(timerRef.current);
                                    newHand(); // generate ulang dengan deck baru
                                }}
                                className={`
            text-[0.65rem] font-heading tracking-widest px-3 py-1
            rounded-[2px] border transition-all
            ${
                isWild
                    ? "bg-game-amber/15 border-game-amber/40 text-game-amber"
                    : "bg-black/40 border-game-border text-game-muted/50 hover:text-game-muted"
            }
        `}
                            >
                                {isWild ? "WILD ON" : "WILD OFF"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats + timer row */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-game-muted text-xs font-heading tracking-widest uppercase">
                        {mode === "speed-run"
                            ? `${solvedCount}/${SPEEDRUN_CASES}`
                            : `Solved: ${solvedCount}`}
                    </span>
                    <TimerDisplay
                        mode={mode}
                        sessionStarted={sessionStarted}
                        elapsedTime={elapsedTime}
                        timeLeft={timeLeft}
                    />
                </div>

                {/* Start button */}
                {mode !== "no-timer" && !sessionActive && !sessionStarted && (
                    <button
                        onClick={startSession}
                        className={`btn-moco w-full ${mode === "speed-run" ? "btn-moco-cyan" : "btn-moco-amber"}`}
                    >
                        <span>
                            {mode === "speed-run"
                                ? `⚡ Start — ${SPEEDRUN_CASES} Cases`
                                : `⏱ Start — ${TIME_ATTACK_SECONDS}s`}
                        </span>
                    </button>
                )}

                {/* Board */}
                {showBoard && (
                    <>
                        {/* Cards */}
                        <div className="grid grid-cols-4 justify-items-center gap-2 max-w-xs mx-auto w-full">
                            {available.map((card) => (
                                <button
                                    key={card.id}
                                    onClick={() => handleCardClick(card)}
                                    disabled={status !== "playing"}
                                    className={`
                                        w-14 h-20 rounded-[3px] border flex flex-col items-center justify-center gap-0.5
                                        font-heading transition-all
                                        ${
                                            selectedA?.id === card.id
                                                ? "bg-game-cyan/15 border-game-cyan shadow-[0_0_12px_rgba(56,189,248,0.2)] -translate-y-1"
                                                : "bg-black/60 border-game-border hover:border-game-cyan/40 hover:-translate-y-0.5"
                                        }
                                        ${status !== "playing" ? "opacity-40" : ""}
                                    `}
                                >
                                    {card.suit !== "result" ? (
                                        <>
                                            <span
                                                className={`text-xs font-bold leading-none ${SUIT_COLOR[card.suit] ?? "text-game-text"}`}
                                            >
                                                {card.label}
                                            </span>
                                            <span
                                                className={`text-sm leading-none ${SUIT_COLOR[card.suit] ?? "text-game-text"}`}
                                            >
                                                {card.suit}
                                            </span>
                                            <span className="text-game-muted/60 text-[0.6rem] font-mono">
                                                {card.value}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-game-cyan font-mono font-bold text-lg">
                                            {card.label}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Operators */}
                        <div className="flex gap-2 justify-center">
                            {OPERATORS.map((op) => (
                                <button
                                    key={op}
                                    onClick={() => handleOpClick(op)}
                                    disabled={
                                        !selectedA || status !== "playing"
                                    }
                                    className={`
                                        w-11 h-11 rounded-[3px] border text-base font-bold font-mono transition-all
                                        ${
                                            selectedOp === op
                                                ? "bg-game-amber/20 border-game-amber text-game-amber"
                                                : "bg-black/50 border-game-border text-game-muted hover:border-game-amber/40 hover:text-game-amber/70"
                                        }
                                        disabled:opacity-30
                                    `}
                                >
                                    {op}
                                </button>
                            ))}
                        </div>

                        {/* Steps */}
                        {steps.length > 0 && (
                            <div className="text-game-muted text-xs text-center font-mono max-h-[48px] overflow-y-auto">
                                {steps.map((s, i) => (
                                    <span key={i}>
                                        {s.a} {s.operator} {s.b} = {s.result}
                                        {i < steps.length - 1 ? " → " : ""}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Result message */}
                        {status !== "playing" && (
                            <div
                                className={`text-center text-sm font-heading tracking-widest ${status === "correct" ? "text-game-cyan" : "text-game-coral"}`}
                            >
                                {status === "correct"
                                    ? "✓ CORRECT — YOU MADE 24!"
                                    : "✗ WRONG — TRY AGAIN"}
                            </div>
                        )}

                        {/* Controls */}
                        {status === "playing" && available.length > 1 && (
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => resetHand(hand)}
                                    className="btn-moco btn-moco-ghost text-[0.6rem] py-1 px-3"
                                >
                                    <span>↺ Reset</span>
                                </button>
                                <button
                                    onClick={newHand}
                                    className="btn-moco btn-moco-ghost text-[0.6rem] py-1 px-3"
                                >
                                    <span>Next →</span>
                                </button>
                            </div>
                        )}

                        {status === "wrong" && (
                            <button
                                onClick={() => resetHand(hand)}
                                className="btn-moco btn-moco-ghost text-[0.6rem] py-1 px-3 mx-auto"
                            >
                                <span>↺ Try Again</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
