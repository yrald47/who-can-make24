import { useGameContext } from "../../../../context/useGameContext";
import { useRoomContext } from "../../../../context/useRoomContext";
import { useSocket } from "../../../../hooks/useSocket";
import { avatarSrc } from "@who-can-make24/shared";

export function PointingPhase() {
    const { gameState, timer, submitPoint } = useGameContext();
    const { currentRoom } = useRoomContext();
    const { socket } = useSocket();

    if (!gameState || !currentRoom) return null;

    const myId = socket.id ?? "";
    const isCandidate = gameState.candidates.includes(myId);
    const myTarget = gameState.pointingTargets[myId];
    const bellPressers = gameState.bellPressers;

    const validTargets = currentRoom.players.filter((p) =>
        bellPressers.includes(p.id),
    );

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
            <h3 className="text-game-text font-heading font-bold text-lg tracking-widest uppercase">
                Fase Menunjuk
            </h3>

            {/* Timer */}
            <div className="flex items-center gap-2">
                <span className="text-game-muted text-sm">Waktu:</span>
                <span
                    className={`font-mono font-bold text-xl ${timer <= 5 ? "text-game-coral" : "text-game-amber"}`}
                >
                    {timer}s
                </span>
            </div>

            {isCandidate ? (
                <div className="w-full max-w-sm flex flex-col gap-3">
                    <p className="text-game-coral text-sm text-center font-medium">
                        💀 Kamu kandidat kalah — tunjuk siapa yang harus
                        buktikan!
                    </p>

                    {myTarget ? (
                        <div className="bg-game-surface2 border border-game-border rounded-[4px] p-3 text-center">
                            <p className="text-game-muted text-xs mb-1">
                                Pilihanmu:
                            </p>
                            <p className="text-game-text font-bold">
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
                                    className="flex items-center gap-3 bg-game-surface border border-game-border hover:border-game-amber/50 hover:bg-game-amber/5 rounded-[4px] p-3 transition-all text-left"
                                >
                                    <img
                                        src={avatarSrc(player.avatar)}
                                        alt={player.name}
                                        className="w-9 h-9 object-contain shrink-0"
                                    />
                                    <div>
                                        <p className="text-game-text font-medium text-sm">
                                            {player.name}
                                        </p>
                                        <p className="text-game-muted text-xs font-mono">
                                            {player.score}pt
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center flex flex-col gap-3 w-full max-w-sm">
                    <p className="text-game-muted text-sm">
                        Kandidat kalah sedang memilih...
                    </p>

                    <div className="flex flex-col gap-2">
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
                                    className="bg-game-surface border border-game-border rounded-[4px] p-3 flex items-center gap-2 text-sm"
                                >
                                    {candidate?.avatar && (
                                        <img
                                            src={avatarSrc(candidate.avatar)}
                                            alt={candidate.name}
                                            className="w-8 h-8 object-contain shrink-0"
                                        />
                                    )}
                                    <span className="text-game-muted">
                                        {candidate?.name}
                                    </span>
                                    <span className="text-game-muted/40 mx-1">
                                        →
                                    </span>
                                    {target ? (
                                        <>
                                            <img
                                                src={avatarSrc(target.avatar)}
                                                alt={target.name}
                                                className="w-8 h-8 object-contain shrink-0"
                                            />
                                            <span className="text-game-text font-medium">
                                                {target.name}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-game-muted/40 italic text-xs">
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
