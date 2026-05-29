import { useRoomContext } from "../../context/useRoomContext";
import { useGameContext } from "../../context/useGameContext";
import { useSocket } from "../../hooks/useSocket";
import { Footer } from "../../components/Footer/Footer";

export function GameOver() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const { finalScores } = useGameContext();
    const { socket } = useSocket();

    if (!currentRoom) return null;

    // Sort players by final score
    const sorted = [...currentRoom.players].sort(
        (a, b) => (finalScores[b.id] ?? 0) - (finalScores[a.id] ?? 0),
    );

    const myId = socket.id ?? "";
    const isHost =
        currentRoom.players.find((p) => p.id === myId)?.isHost ?? false;

    function handleReturnToLobby() {
        socket.emit("game:return-to-lobby");
    }

    // const PODIUM_STYLE: Record<number, string> = {
    //     0: "text-yellow-400 text-4xl",
    //     1: "text-gray-300 text-3xl",
    //     2: "text-amber-600 text-2xl",
    // };

    // const RANK_EMOJI: Record<number, string> = {
    //     0: "🥇",
    //     1: "🥈",
    //     2: "🥉",
    // };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-blue-700 px-6 py-3 text-center">
                <h1 className="text-white font-bold text-xl">
                    Game Selesai! 🎉
                </h1>
                <p className="text-blue-200 text-xs">{currentRoom.name}</p>
            </div>

            <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">
                {/* Podium top 3 */}
                {sorted.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 mt-4">
                        {/* 2nd place */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-4xl">
                                {sorted[1]?.avatar}
                            </span>
                            <span className="text-gray-300 text-2xl">🥈</span>
                            <p className="text-white text-xs font-medium">
                                {sorted[1]?.name}
                            </p>
                            <p className="text-blue-200 text-xs">
                                {finalScores[sorted[1]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-16 bg-gray-300/20 rounded-t-lg" />
                        </div>

                        {/* 1st place */}
                        <div className="flex flex-col items-center gap-1 -mb-4">
                            <span className="text-5xl">
                                {sorted[0]?.avatar}
                            </span>
                            <span className="text-yellow-400 text-3xl">🥇</span>
                            <p className="text-white text-sm font-bold">
                                {sorted[0]?.name}
                            </p>
                            <p className="text-yellow-300 text-xs">
                                {finalScores[sorted[0]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-24 bg-yellow-400/20 rounded-t-lg" />
                        </div>

                        {/* 3rd place */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-3xl">
                                {sorted[2]?.avatar}
                            </span>
                            <span className="text-amber-600 text-xl">🥉</span>
                            <p className="text-white text-xs font-medium">
                                {sorted[2]?.name}
                            </p>
                            <p className="text-blue-200 text-xs">
                                {finalScores[sorted[2]?.id ?? ""] ?? 0}pt
                            </p>
                            <div className="w-16 h-10 bg-amber-600/20 rounded-t-lg" />
                        </div>
                    </div>
                )}

                {/* Full leaderboard */}
                <div className="w-full max-w-sm flex flex-col gap-2">
                    <p className="text-white/60 text-xs uppercase tracking-widest text-center">
                        Leaderboard Final
                    </p>
                    {sorted.map((player, index) => {
                        const isMe = player.id === myId;
                        return (
                            <div
                                key={player.id}
                                className={`
                                    flex items-center gap-3 rounded-xl p-3
                                    ${isMe ? "bg-yellow-400/20 border border-yellow-400/50 ring-1 ring-yellow-400" : "bg-white/10"}
                                `}
                            >
                                <span className="text-sm w-6 text-center">
                                    {index === 0
                                        ? "🥇"
                                        : index === 1
                                            ? "🥈"
                                            : index === 2
                                            ? "🥉"
                                            : `${index + 1}`}
                                </span>
                                <span className="text-2xl">
                                    {player.avatar}
                                </span>
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
                                <span className="text-white font-bold text-sm font-mono">
                                    {finalScores[player.id] ?? 0}pt
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Action buttons */}
                <div className="w-full max-w-sm flex flex-col gap-2 mt-2 pb-4">
                    {/* Main lagi — semua player bisa klik */}
                    {isHost ? (
                        <button
                            onClick={handleReturnToLobby}
                            className="w-full bg-yellow-400 text-blue-900 font-semibold py-3 rounded-xl hover:bg-yellow-300 transition-colors"
                        >
                            🔄 Main Lagi (Kembali ke Lobi)
                        </button>
                    ) : (
                        <div className="w-full bg-white/10 text-white/60 text-center py-3 rounded-xl text-sm">
                            Menunggu host kembali ke lobi...
                        </div>
                    )}

                    {/* Keluar — semua player bisa */}
                    <button
                        onClick={leaveRoom}
                        className="w-full border border-white/20 text-white/70 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
                    >
                        🚪 Keluar dari Room
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
