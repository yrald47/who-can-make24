// import type { Room } from "@who-can-make24/shared";
import { GAME_CONSTANTS } from "@who-can-make24/shared";
// import { useRooms } from "../../hooks/useRooms";
import { useSocket } from "../../hooks/useSocket";
import { useRoomContext } from '../../context/useRoomContext';


export function WaitingRoom() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const { socket } = useSocket();

    console.log("WaitingRoom render, currentRoom:", currentRoom);

    if (!currentRoom) return <div>currentRoom is null</div>;

    const room = currentRoom;
    const me = room.players.find((p) => p.id === socket.id);
    const isHost = me?.isHost ?? false;
    // const canStart = room.players.length >= GAME_CONSTANTS.MIN_PLAYERS_CASUAL;
    const minPlayers =
        room.mode === "pvp"
            ? GAME_CONSTANTS.MIN_PLAYERS_PVP
            : GAME_CONSTANTS.MIN_PLAYERS_CASUAL;

    const canStart = room.players.length >= minPlayers;

    function handleStart() {
        console.log("handleStart called, emitting game:start");
        socket.emit("game:start");
    }

    console.log(
        "isHost:",
        isHost,
        "me:",
        me,
        "socket.id:",
        socket.id,
        "players:",
        room.players.map((p) => ({ id: p.id, isHost: p.isHost })),
    );

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-blue-700 px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-white font-bold text-xl">
                        Who Can Make24?
                    </h1>
                    <p className="text-blue-200 text-xs uppercase tracking-widest">
                        Waiting Room
                    </p>
                </div>
                <button
                    onClick={leaveRoom}
                    className="text-blue-200 hover:text-white text-sm transition-colors"
                >
                    ← Leave
                </button>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                    {/* Room info */}
                    <div className="p-6 border-b border-gray-100 text-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {room.name}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {room.players.length}/{room.maxPlayers} pemain ·{" "}
                            {room.mode}
                            {room.isPrivate && (
                                <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
                                    🔒 {room.code}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Player list */}
                    <div className="p-6">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-widest mb-3">
                            Pemain
                        </p>
                        <div className="flex flex-col gap-2">
                            {room.players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${player.id === socket.id ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}
                                >
                                    <span className="text-2xl">
                                        {player.avatar}
                                    </span>
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            {player.name}
                                        </span>
                                        {player.id === socket.id && (
                                            <span className="ml-2 text-xs text-blue-400">
                                                (kamu)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {player.isHost && (
                                            <span title="Host">👑</span>
                                        )}
                                        {index === 0 && !player.isHost && (
                                            <span title="Rank 1">🥇</span>
                                        )}
                                        {index === 1 && (
                                            <span title="Rank 2">🥈</span>
                                        )}
                                        {index === 2 && (
                                            <span title="Rank 3">🥉</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status & actions */}
                    <div className="px-6 pb-6">
                        {!canStart && (
                            <p className="text-center text-sm text-gray-400 mb-3">
                                Menunggu minimal{" "}
                                {minPlayers} pemain...
                            </p>
                        )}

                        {isHost ? (
                            <button
                                onClick={handleStart}
                                disabled={!canStart}
                                className="w-full bg-yellow-400 text-blue-900 font-semibold py-3 rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {canStart
                                    ? "Mulai Game! 🚀"
                                    : `Menunggu pemain (${room.players.length}/${minPlayers})`}
                            </button>
                        ) : (
                            <div className="w-full bg-gray-100 text-gray-400 text-center py-3 rounded-xl text-sm">
                                Menunggu host memulai...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
