import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";

export function PointingPhase() {
    const { gameState, timer, submitPoint } = useGameContext();
    const { currentRoom } = useRoomContext();
    const { socket } = useSocket();

    if (!gameState || !currentRoom) return null;

    const myId = socket.id ?? "";
    const isCandidate = gameState.candidates.includes(myId);
    const myTarget = gameState.pointingTargets[myId];
    const bellPressers = gameState.bellPressers;

    // Player yang bisa ditunjuk = yang sudah pencet bel
    const validTargets = currentRoom.players.filter((p) =>
        bellPressers.includes(p.id),
    );

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            <h3 className="text-white font-bold text-lg">Fase Menunjuk</h3>

            {/* Timer */}
            <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Waktu:</span>
                <span
                    className={`font-mono font-bold text-xl ${timer <= 5 ? "text-red-300" : "text-yellow-300"}`}
                >
                    {timer}s
                </span>
            </div>

            {isCandidate ? (
                <div className="w-full max-w-sm flex flex-col gap-3">
                    <p className="text-red-300 text-sm text-center font-medium">
                        💀 Kamu kandidat kalah — tunjuk siapa yang harus
                        buktikan!
                    </p>

                    {myTarget ? (
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-white/70 text-xs mb-1">
                                Pilihanmu:
                            </p>
                            <p className="text-white font-bold">
                                {currentRoom.players.find(
                                    (p) => p.id === myTarget,
                                )?.name ?? myTarget}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {validTargets.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => submitPoint(player.id)}
                                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors text-left"
                                >
                                    <span className="text-2xl">
                                        {player.avatar}
                                    </span>
                                    <div>
                                        <p className="text-white font-medium text-sm">
                                            {player.name}
                                        </p>
                                        <p className="text-white/50 text-xs">
                                            {player.score}pt
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center flex flex-col gap-3">
                    <p className="text-white/70 text-sm">
                        Kandidat kalah sedang memilih...
                    </p>

                    {/* Tampilkan siapa sudah menunjuk siapa */}
                    <div className="flex flex-col gap-2 w-full max-w-sm">
                        {gameState.candidates.map((candidateId) => {
                            const candidate = currentRoom.players.find(
                                (p) => p.id === candidateId,
                            );
                            const targetId =
                                gameState.pointingTargets[candidateId];
                            const target = currentRoom.players.find(
                                (p) => p.id === targetId,
                            );
                            return (
                                <div
                                    key={candidateId}
                                    className="bg-white/10 rounded-xl p-3 flex items-center gap-2 text-sm"
                                >
                                    <span>{candidate?.avatar}</span>
                                    <span className="text-white/70">
                                        {candidate?.name}
                                    </span>
                                    <span className="text-white/40 mx-1">
                                        →
                                    </span>
                                    {target ? (
                                        <>
                                            <span>{target.avatar}</span>
                                            <span className="text-white">
                                                {target.name}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-white/40 italic">
                                            memilih...
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
