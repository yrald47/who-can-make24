import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";
import { avatarSrc } from "@who-can-make24/shared";

export function ResultPhase() {
    const { gameState } = useGameContext();
    const { currentRoom } = useRoomContext();
    const { socket } = useSocket();

    if (!gameState || !currentRoom) return null;

    const sorted = [...gameState.roundScores].sort(
        (a, b) =>
            (gameState.scores[b.playerId] ?? 0) -
            (gameState.scores[a.playerId] ?? 0),
    );

    const RANK_EMOJI: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4 overflow-y-auto">
            <h3 className="text-game-text font-heading font-bold text-lg tracking-widest uppercase">
                Hasil Ronde {gameState.round}
            </h3>

            <div className="flex flex-col gap-2 w-full max-w-sm">
                {sorted.map(({ playerId, delta }, index) => {
                    const player = currentRoom.players.find(
                        (p) => p.id === playerId,
                    );
                    const isMe = playerId === socket.id;
                    if (!player) return null;

                    return (
                        <div
                            key={playerId}
                            className={`
                                flex items-center gap-3 rounded-[4px] p-3 border transition-all
                                ${
                                    isMe
                                        ? "bg-game-amber/10 border-game-amber/40 ring-1 ring-game-amber/30"
                                        : "bg-game-surface border-game-border"
                                }
                            `}
                        >
                            {/* Rank */}
                            <span className="text-sm w-5 text-center text-game-muted shrink-0">
                                {RANK_EMOJI[index] ?? `${index + 1}`}
                            </span>

                            <img
                                src={avatarSrc(player.avatar)}
                                alt={player.name}
                                className="w-8 h-8 object-contain shrink-0"
                            />

                            <div className="flex-1">
                                <p
                                    className={`text-sm font-medium ${isMe ? "text-game-amber" : "text-game-text"}`}
                                >
                                    {player.name}
                                    {isMe && (
                                        <span className="ml-1 text-xs text-game-muted">
                                            (kamu)
                                        </span>
                                    )}
                                </p>
                            </div>

                            <span
                                className={`font-heading font-bold text-sm ${
                                    delta > 0
                                        ? "text-game-green"
                                        : delta < 0
                                            ? "text-game-coral"
                                            : "text-game-muted/50"
                                }`}
                            >
                                {delta > 0 ? "+" : ""}
                                {delta}
                            </span>

                            <span className="text-game-muted text-xs font-mono">
                                {gameState.scores[playerId] ?? 0}pt
                            </span>
                        </div>
                    );
                })}
            </div>

            <p className="text-game-muted/50 text-xs animate-pulse font-heading tracking-wider">
                Ronde berikutnya dalam 5 detik...
            </p>
        </div>
    );
}
 