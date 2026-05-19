import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";

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

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4 overflow-y-auto">
            <h3 className="text-white font-bold text-lg">
                Hasil Ronde {gameState.round}
            </h3>

            <div className="flex flex-col gap-2 w-full max-w-sm">
                {sorted.map(({ playerId, delta }, index) => {
                    const player = currentRoom.players.find(
                        (p) => p.id === playerId,
                    );
                    const isMe = playerId === socket.id; // ← cek apakah ini player saya
                    if (!player) return null;

                    return (
                        <div
                            key={playerId}
                            className={`
                                flex items-center gap-3 rounded-xl p-3 transition-all
                                ${
                                    isMe
                                        ? "bg-yellow-400/20 border border-yellow-400/50 ring-1 ring-yellow-400"
                                        : "bg-white/10"
                                }
                            `}
                        >
                            {/* Rank */}
                            <span className="text-sm w-4 text-center text-white/50">
                                {index === 0
                                    ? "🥇"
                                    : index === 1
                                        ? "🥈"
                                        : index === 2
                                        ? "🥉"
                                        : `${index + 1}`}
                            </span>

                            <span className="text-2xl">{player.avatar}</span>

                            <div className="flex-1">
                                <p
                                    className={`text-sm font-medium ${isMe ? "text-yellow-300" : "text-white"}`}
                                >
                                    {player.name}
                                    {isMe && (
                                        <span className="ml-1 text-xs text-yellow-400/70">
                                            (kamu)
                                        </span>
                                    )}
                                </p>
                            </div>

                            <span
                                className={`font-bold text-sm ${delta > 0 ? "text-green-300" : delta < 0 ? "text-red-300" : "text-white/50"}`}
                            >
                                {delta > 0 ? "+" : ""}
                                {delta}
                            </span>

                            <span className="text-white/60 text-xs font-mono">
                                {gameState.scores[playerId] ?? 0}pt
                            </span>
                        </div>
                    );
                })}
            </div>

            <p className="text-white/50 text-xs animate-pulse">
                Ronde berikutnya dalam 5 detik...
            </p>
        </div>
    );
}
