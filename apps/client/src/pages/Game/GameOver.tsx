import { useRoomContext } from "../../context/useRoomContext";
import { useGameContext } from "../../context/useGameContext";
import { useSocket } from "../../hooks/useSocket";
import { Footer } from "../../components/Footer/Footer";

export function GameOver() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const { finalScores, pvpCoward, clearGameOver } = useGameContext();
    const { socket } = useSocket();

    const myId = socket.id ?? "";

    // Gunakan players dari currentRoom atau dari pvpCoward snapshot
    // const players = currentRoom?.players ?? pvpCoward?.players ?? [];
    const players = pvpCoward
        ? pvpCoward.players
        : (currentRoom?.players ?? []);
    const roomName = currentRoom?.name ?? "PVP Match";

    const sorted = [...players].sort(
        (a, b) => (finalScores[b.id] ?? 0) - (finalScores[a.id] ?? 0),
    );

    const isHost =
        currentRoom?.players.find((p) => p.id === myId)?.isHost ?? false;
    const amICoward = pvpCoward?.loserId === myId;
    const amIWinner = pvpCoward?.winnerId === myId;

    const RANK_EMOJI: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

    function handleReturnToLobby() {
        socket.emit("game:return-to-lobby");
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-game-bg/90 backdrop-blur-game-sm border-b border-game-border px-6 py-3 text-center">
                <h1 className="font-heading text-game-text text-xl font-bold tracking-widest uppercase">
                    {pvpCoward
                        ? amICoward
                            ? "You Ran Away 🏳️"
                            : "Victory! ⚡"
                        : "Game Over 🎉"}
                </h1>
                <p className="text-game-muted text-xs mt-0.5">{roomName}</p>
            </div>

            <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">
                {/* PVP Coward banner */}
                {pvpCoward && (
                    <div
                        className={`w-full max-w-sm p-4 rounded-[4px] border text-center ${
                            amICoward
                                ? "border-game-coral/40 bg-game-coral/10"
                                : "border-game-cyan/40 bg-game-cyan/10"
                        }`}
                    >
                        {amICoward ? (
                            <>
                                <p className="text-game-coral font-heading tracking-widest text-lg mb-1">
                                    🏳️ COWARD
                                </p>
                                <p className="text-game-muted text-sm">
                                    You fled the arena. Shameful.
                                </p>
                            </>
                        ) : amIWinner ? (
                            <>
                                <p className="text-game-cyan font-heading tracking-widest text-lg mb-1">
                                    ⚡ WINNER
                                </p>
                                <p className="text-game-muted text-sm">
                                    {pvpCoward.loserName} fled. Victory is
                                    yours.
                                </p>
                            </>
                        ) : null}
                    </div>
                )}

                {/* Podium — hanya kalau 3+ player dan bukan coward scenario */}
                {!pvpCoward && sorted.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 mt-4">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-4xl">
                                {sorted[1]?.avatar}
                            </span>
                            <span className="text-2xl">🥈</span>
                            <p className="text-game-text text-xs font-medium">
                                {sorted[1]?.name}
                            </p>
                            <p className="text-game-muted text-xs">
                                {finalScores[sorted[1]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-16 bg-game-muted/20 rounded-t-[3px]" />
                        </div>
                        <div className="flex flex-col items-center gap-1 -mb-4">
                            <span className="text-5xl">
                                {sorted[0]?.avatar}
                            </span>
                            <span className="text-3xl">🥇</span>
                            <p className="text-game-text text-sm font-bold">
                                {sorted[0]?.name}
                            </p>
                            <p className="text-game-amber text-xs">
                                {finalScores[sorted[0]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-24 bg-game-amber/20 rounded-t-[3px]" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-3xl">
                                {sorted[2]?.avatar}
                            </span>
                            <span className="text-xl">🥉</span>
                            <p className="text-game-text text-xs font-medium">
                                {sorted[2]?.name}
                            </p>
                            <p className="text-game-muted text-xs">
                                {finalScores[sorted[2]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-10 bg-game-coral/20 rounded-t-[3px]" />
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                <div className="w-full max-w-sm flex flex-col gap-2">
                    <p className="section-label text-[0.6rem]">
                        Final Leaderboard
                    </p>
                    {sorted.map((player, index) => {
                        const isMe = player.id === myId;
                        const isCoward = pvpCoward?.loserId === player.id;
                        const isWinner = pvpCoward?.winnerId === player.id;

                        return (
                            <div
                                key={player.id}
                                className={`
                                    flex items-center gap-3 rounded-[4px] p-3 border
                                    ${isCoward ? "border-game-coral/30 bg-game-coral/5 opacity-70" : ""}
                                    ${isWinner ? "border-game-amber/40 bg-game-amber/5" : ""}
                                    ${isMe && !isCoward && !isWinner ? "border-game-cyan/40 bg-game-cyan/5" : ""}
                                    ${!isCoward && !isWinner && !isMe ? "border-game-border bg-game-surface" : ""}
                                `}
                            >
                                <span className="text-sm w-6 text-center text-game-muted">
                                    {isCoward
                                        ? "🏳️"
                                        : (RANK_EMOJI[index] ?? `${index + 1}`)}
                                </span>
                                <span className="text-2xl">
                                    {player.avatar}
                                </span>
                                <div className="flex-1">
                                    <p
                                        className={`text-sm font-medium ${isMe ? "text-game-cyan" : "text-game-text"}`}
                                    >
                                        {player.name}
                                        {isMe && (
                                            <span className="ml-1 text-xs text-game-muted">
                                                (you)
                                            </span>
                                        )}
                                    </p>
                                    {isCoward && (
                                        <p className="text-game-coral text-xs">
                                            fled the arena
                                        </p>
                                    )}
                                </div>
                                <span className="font-heading font-bold text-sm text-game-amber">
                                    {finalScores[player.id] ?? 0}pt
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="w-full max-w-sm flex flex-col gap-2 mt-2 pb-4">
                    {isHost && currentRoom ? (
                        <button
                            onClick={handleReturnToLobby}
                            className="btn-moco btn-moco-amber w-full"
                        >
                            <span>🔄 Play Again</span>
                        </button>
                    ) : currentRoom ? (
                        <div className="w-full border border-game-border text-game-muted text-center py-3 rounded-[4px] text-sm">
                            Waiting for host to return to lobby...
                        </div>
                    ) : null}
                    <button
                        onClick={() => {
                            clearGameOver();
                            leaveRoom();
                        }}
                        className="btn-moco btn-moco-ghost w-full"
                    >
                        <span>🚪 Leave Room</span>
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
