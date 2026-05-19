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
        <div className="w-16 h-24 bg-white rounded-xl border-2 border-gray-200 shadow-md flex flex-col items-center justify-center relative select-none">
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
    const allPlayers = currentRoom?.players ?? [];
    const totalPlayers = allPlayers.length;
    const showSurrender = timer <= 30 && !hasPressed

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            {/* Round info */}
            <div className="flex items-center gap-3">
                <span className="text-white/70 text-sm">
                    Ronde {round}/{totalRounds}
                </span>
                <span className="text-white/50 text-xs">
                    {deckRemaining} kartu tersisa
                </span>
            </div>

            {/* Cards */}
            <div className="flex gap-3 justify-center">
                {cards.map((card, i) => (
                    <CardDisplay key={i} card={card} />
                ))}
            </div>

            {/* Timer */}
            <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs mb-1">
                    <span
                        className={
                            timerUrgent
                                ? "text-red-300 font-bold"
                                : "text-white/70"
                        }
                    >
                        {timerUrgent ? "⚠️ " : ""}Timer
                    </span>
                    <span
                        className={`font-mono font-bold ${timerUrgent ? "text-red-300" : "text-white"}`}
                    >
                        {timer}s
                    </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${timerUrgent ? "bg-red-400" : "bg-yellow-400"}`}
                        style={{ width: `${(timer / 60) * 100}%` }}
                    />
                </div>
            </div>

            {/* Bell pressers info */}
            {bellPressers.length > 0 && (
                <p className="text-white/60 text-xs">
                    {bellPressers.length}/{totalPlayers} pemain sudah pencet bel
                </p>
            )}

            {/* Bell button */}
            <button
                onClick={submitBell}
                disabled={hasPressed}
                className={`
                    px-8 py-3 rounded-full font-bold text-lg transition-all
                    ${
                        hasPressed
                            ? "bg-blue-300/30 text-white/50 cursor-not-allowed"
                            : "bg-yellow-400 text-blue-900 hover:bg-yellow-300 active:scale-95 shadow-lg"
                    }
                `}
            >
                {hasPressed ? "🔔 Sudah pencet" : "🔔 Pencet Bel!"}
            </button>

            {showSurrender && (
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => socket.emit("game:surrender")}
                        className="text-white/40 text-xs hover:text-white/70 underline transition-colors"
                    >
                        Nyerah? (tidak ada yang bisa?)
                    </button>
                    {(gameState?.surrenderVotes?.length ?? 0) > 0 && (
                        <p className="text-white/30 text-xs">
                            {gameState?.surrenderVotes?.length}/
                            {currentRoom?.players.length} vote nyerah
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
