import type { Card } from "@who-can-make24/shared";
import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";

interface PlayingPhaseProps {
    cards: Card[];
    deckRemaining: number;
    round: number;
    totalRounds: number;
}

const SUIT_SYMBOL: Record<string, string> = {
    spades: "♠",
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
};

const SUIT_COLOR: Record<string, string> = {
    spades: "text-gray-800",
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-gray-800",
};

function CardDisplay({ card }: { card: Card }) {
    return (
        <div className="w-16 h-24 bg-white rounded-[6px] border-2 border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center relative select-none">
            <span className={`text-3xl font-bold ${SUIT_COLOR[card.suit]}`}>
                {card.display}
            </span>
            <span
                className={`absolute bottom-2 right-2 text-sm ${SUIT_COLOR[card.suit]}`}
            >
                {SUIT_SYMBOL[card.suit]}
            </span>
        </div>
    );
}

export function PlayingPhase({
    cards,
    deckRemaining,
    round,
    totalRounds,
}: PlayingPhaseProps) {
    const { timer, submitBell, gameState } = useGameContext();
    const { currentRoom } = useRoomContext();
    const { socket } = useSocket();

    const bellPressers = gameState?.bellPressers ?? [];
    const hasPressed = bellPressers.includes(socket.id ?? "");
    const timerUrgent = timer <= 10;
    const totalPlayers = currentRoom?.players.length ?? 0;
    const showSurrender = timer <= 30 && !hasPressed;

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            {/* Round info */}
            <div className="flex items-center gap-3">
                <span className="badge-moco badge-moco-ghost text-[0.6rem]">
                    Ronde {round}/{totalRounds}
                </span>
                <span className="text-game-muted text-xs font-mono">
                    {deckRemaining} kartu tersisa
                </span>
            </div>

            {/* Cards */}
            <div className="flex gap-3 justify-center">
                {cards.map((card, i) => (
                    <CardDisplay key={i} card={card} />
                ))}
            </div>

            {/* Timer bar */}
            <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs mb-1">
                    <span
                        className={
                            timerUrgent
                                ? "text-game-coral font-bold"
                                : "text-game-muted"
                        }
                    >
                        {timerUrgent ? "⚠️ " : ""}Timer
                    </span>
                    <span
                        className={`font-mono font-bold ${timerUrgent ? "text-game-coral" : "text-game-amber"}`}
                    >
                        {timer}s
                    </span>
                </div>
                <div className="h-2 bg-game-surface2 border border-game-border rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${timerUrgent ? "bg-game-coral" : "bg-game-amber"}`}
                        style={{ width: `${(timer / 60) * 100}%` }}
                    />
                </div>
            </div>

            {/* Bell pressers count */}
            {bellPressers.length > 0 && (
                <p className="text-game-muted text-xs font-mono">
                    {bellPressers.length}/{totalPlayers} pemain sudah pencet bel
                </p>
            )}

            {/* Bell button */}
            <button
                onClick={submitBell}
                disabled={hasPressed}
                className={`
                    px-8 py-3 rounded-full font-heading font-bold text-lg tracking-wider transition-all
                    ${
                        hasPressed
                            ? "bg-game-surface2 border border-game-border text-game-muted cursor-not-allowed"
                            : "bg-game-amber text-amber-950 hover:bg-amber-300 active:scale-95 shadow-[0_4px_20px_rgba(251,191,36,0.3)]"
                    }
                `}
            >
                {hasPressed ? "🔔 Sudah pencet" : "🔔 Pencet Bel!"}
            </button>

            {/* Surrender */}
            {showSurrender && (
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => socket.emit("game:surrender")}
                        className="text-game-muted/40 text-xs hover:text-game-muted underline transition-colors"
                    >
                        Nyerah? (tidak ada yang bisa?)
                    </button>
                    {(gameState?.surrenderVotes?.length ?? 0) > 0 && (
                        <p className="text-game-muted/30 text-xs font-mono">
                            {gameState?.surrenderVotes?.length}/
                            {currentRoom?.players.length} vote nyerah
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
