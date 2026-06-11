import { useState } from "react";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
import { useSocket } from "../../hooks/useSocket";
import { useRoomContext } from "../../context/useRoomContext";

export function WaitingRoom() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const { socket } = useSocket();
    const [copied, setCopied] = useState(false);

    if (!currentRoom) return <div>currentRoom is null</div>;

    const room = currentRoom;
    const me = room.players.find((p) => p.id === socket.id);
    const isHost = me?.isHost ?? false;
    const minPlayers =
        room.mode === "pvp"
            ? GAME_CONSTANTS.MIN_PLAYERS_PVP
            : GAME_CONSTANTS.MIN_PLAYERS_CASUAL;
    const canStart = room.players.length >= minPlayers;

    function handleStart() {
        socket.emit("game:start");
    }

    function handleShare() {
        const url = `${window.location.origin}?join=${room.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-game-bg/90 backdrop-blur-game-sm border-b border-game-border px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-game-text font-bold text-xl tracking-wide">
                        WHO CAN MAKE<span className="text-game-cyan">24</span>?
                    </h1>
                    <p className="field-label mt-px opacity-60">
                        › Waiting Room
                    </p>
                </div>
                <button
                    onClick={leaveRoom}
                    className="text-game-muted hover:text-game-coral text-xs transition-colors font-heading tracking-wider"
                >
                    ← LEAVE
                </button>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative w-full max-w-lg rounded-[4px] backdrop-blur-game bg-[rgba(18,22,30,0.82)] border border-game-border shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.6)]">
                    {/* Room info */}
                    <div className="p-6 border-b border-game-border">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="font-heading text-game-text text-2xl font-bold tracking-wide">
                                    {room.name}
                                </h2>
                                <p className="text-game-muted text-xs mt-1 flex items-center gap-2">
                                    <span>
                                        {room.players.length}/{room.maxPlayers}{" "}
                                        players
                                    </span>
                                    <span>·</span>
                                    <span className="uppercase tracking-wider">
                                        {room.mode}
                                    </span>
                                    {room.isWild && (
                                        <span className="text-game-amber">
                                            🃏 Wild
                                        </span>
                                    )}
                                    {room.isPrivate && (
                                        <span className="border border-game-border px-1.5 py-0.5 rounded-[3px] text-[0.6rem] text-game-muted">
                                            🔒 {room.code}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Share button */}
                            <button
                                onClick={handleShare}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border text-xs
                                    font-heading tracking-wider transition-all whitespace-nowrap
                                    ${
                                        copied
                                            ? "border-game-cyan/50 bg-game-cyan/10 text-game-cyan"
                                            : "border-game-border text-game-muted hover:border-game-cyan/40 hover:text-game-cyan"
                                    }
                                `}
                            >
                                {copied ? "✓ Copied!" : "🔗 Get a Challenger"}
                            </button>
                        </div>
                    </div>

                    {/* Player list */}
                    <div className="p-6">
                        <p className="section-label mb-3">Players</p>
                        <div className="flex flex-col gap-2">
                            {room.players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-[4px] border transition-all
                                        ${
                                            player.id === socket.id
                                                ? "bg-game-cyan/5 border-game-cyan/30"
                                                : "bg-game-surface border-game-border"
                                        }
                                    `}
                                >
                                    <span className="text-2xl">
                                        {player.avatar}
                                    </span>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-game-text">
                                            {player.name}
                                        </span>
                                        {player.id === socket.id && (
                                            <span className="ml-2 text-xs text-game-muted">
                                                (you)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {player.isHost && (
                                            <span title="Host">👑</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-6">
                        {!canStart && (
                            <p className="text-center text-sm text-game-muted mb-3 opacity-60">
                                Waiting for at least {minPlayers} players...
                            </p>
                        )}

                        {isHost ? (
                            <button
                                onClick={handleStart}
                                disabled={!canStart}
                                className="btn-moco btn-moco-amber w-full disabled:opacity-35 disabled:cursor-not-allowed"
                            >
                                <span>
                                    {canStart
                                        ? "Start Game 🚀"
                                        : `Waiting (${room.players.length}/${minPlayers})`}
                                </span>
                            </button>
                        ) : (
                            <div className="w-full border border-game-border text-game-muted text-center py-3 rounded-[4px] text-sm">
                                Waiting for host to start...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Copied toast */}
            {copied && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[4px] border border-game-cyan/40 bg-game-bg/95 backdrop-blur-game shadow-2xl text-game-cyan text-sm font-heading tracking-wider">
                    ✓ Link copied — share it to invite players
                </div>
            )}
        </div>
    );
}
