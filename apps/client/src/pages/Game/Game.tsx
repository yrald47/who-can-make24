import { useState } from "react";
import { useRoomContext } from "../../context/useRoomContext";
import { useGameContext } from "../../context/useGameContext";
import { useSocket } from "../../hooks/useSocket";
import { PlayerArena } from "./components/PlayerArena";
import { Playboard } from "./components/Playboard";
import { ChatLog } from "./components/ChatLog";
import { RulesModal } from "./components/RulesModal";
// import { useEffect } from "react";

type MobileTab = "game" | "players" | "chat";

const RULES_SEEN_KEY = "wmc24_rules_seen";

export function Game() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const { gameState, unreadChat, clearUnreadChat } = useGameContext();
    const { socket } = useSocket();
    const [mobileTab, setMobileTab] = useState<MobileTab>("game");
    // const [showRules, setShowRules] = useState(false);
    const [showRules, setShowRules] = useState(() => {
        const seen = localStorage.getItem(RULES_SEEN_KEY);
        return !seen;
    });

    // useEffect(() => {
    //     if (gameState?.round === 1) {
    //         const seen = localStorage.getItem(RULES_SEEN_KEY);
    //         if (!seen) {
    //             setShowRules(true);
    //             localStorage.setItem(RULES_SEEN_KEY, "1");
    //         }
    //     }
    // }, [gameState?.round]);

    function handleCloseRules() {
        localStorage.setItem(RULES_SEEN_KEY, "1");
        setShowRules(false);
    }


    if (!currentRoom || !gameState) return null;

    const myId = socket.id ?? "";
    const bellPressers = gameState.bellPressers;
    const candidates = gameState.candidates;
    const pointedPlayers = [
        ...new Set(Object.values(gameState.pointingTargets)),
    ];


    return (
        <div className="min-h-screen flex flex-col">
            {/* {showRules && <RulesModal onClose={() => setShowRules(false)} />} */}
            {showRules && <RulesModal onClose={handleCloseRules} />}
            {/* Header */}
            <div className="bg-blue-700 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-white font-bold text-sm md:text-base">
                        Who Can Make24?
                    </h1>
                    <span className="text-blue-200 text-xs bg-blue-800 px-2 py-0.5 rounded-full">
                        {currentRoom.name}
                    </span>
                </div>
                <span className="text-blue-200 text-xs">
                    Ronde {gameState.round}
                </span>
                <button
                    onClick={leaveRoom}
                    className="text-blue-200 hover:text-white text-xs transition-colors"
                >
                    ← Leave
                </button>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex flex-col flex-1 p-3 gap-3">
                {/* Player arena + playboard */}
                <div className="flex-1 min-h-0" style={{ minHeight: 400 }}>
                    <PlayerArena
                        players={currentRoom.players}
                        myId={myId}
                        bellPressers={bellPressers}
                        candidates={candidates}
                        pointedPlayers={pointedPlayers}
                        scores={gameState.scores}
                    >
                        {/* <Playboard /> */}
                        <Playboard onShowRules={() => setShowRules(true)} />
                    </PlayerArena>
                </div>

                {/* Chat + Log — tengah, max width */}
                <div className="flex gap-3 h-36 shrink-0 max-w-3xl mx-auto w-full">
                    <ChatLog alwaysOpen={true} />
                </div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden flex flex-col flex-1">
                {/* Content area */}
                <div className="flex-1 p-3" style={{ minHeight: 500 }}>
                    {mobileTab === "game" && (
                        <Playboard onShowRules={() => setShowRules(true)} />
                    )}
                    {mobileTab === "players" && (
                        <div className="flex flex-col gap-2">
                            {currentRoom.players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl bg-white/10 ${player.id === myId ? "ring-1 ring-yellow-400" : ""}`}
                                >
                                    <span className="text-2xl">
                                        {player.avatar}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-white text-sm font-medium">
                                            {player.name}
                                        </p>
                                        <p className="text-blue-200 text-xs">
                                            {gameState.scores[player.id] ?? 0}pt
                                        </p>
                                    </div>
                                    <div className="flex gap-1 text-sm">
                                        {player.isHost && <span>👑</span>}
                                        {bellPressers.includes(player.id) && (
                                            <span>🔔</span>
                                        )}
                                        {candidates.includes(player.id) && (
                                            <span>💀</span>
                                        )}
                                        {player.rank &&
                                            ["🥇", "🥈", "🥉"][player.rank - 1]}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {mobileTab === "chat" && (
                        <div className="h-full" style={{ minHeight: 400 }}>
                            <ChatLog />
                        </div>
                    )}
                </div>

                {/* Bottom nav */}
                {/* <div className="bg-blue-700 flex shrink-0 border-t border-blue-600">
                    {(
                        [
                            { tab: "game", label: "🎮", text: "Game" },
                            { tab: "players", label: "👥", text: "Pemain" },
                            { tab: "chat", label: "💬", text: "Chat" },
                        ] as { tab: MobileTab; label: string; text: string }[]
                    ).map(({ tab, label, text }) => (
                        <button
                            key={tab}
                            onClick={() => setMobileTab(tab)}
                            className={`
                                flex-1 flex flex-col items-center py-2 text-xs transition-colors
                                ${mobileTab === tab ? "text-yellow-400" : "text-blue-200 hover:text-white"}
                            `}
                        >
                            <span className="text-lg">{label}</span>
                            <span>{text}</span>
                        </button>
                    ))}
                </div> */}
                {/* Bottom nav */}
                <div className="bg-blue-700 flex shrink-0 border-t border-blue-600">
                    <button
                        onClick={() => setMobileTab("game")}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "game" ? "text-yellow-400" : "text-blue-200 hover:text-white"}`}
                    >
                        <span className="text-lg">🎮</span>
                        <span>Game</span>
                    </button>

                    <button
                        onClick={() => setMobileTab("players")}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "players" ? "text-yellow-400" : "text-blue-200 hover:text-white"}`}
                    >
                        <span className="text-lg">👥</span>
                        <span>Pemain</span>
                    </button>

                    <button
                        onClick={() => {
                            setMobileTab("chat");
                            clearUnreadChat();
                        }}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "chat" ? "text-yellow-400" : "text-blue-200 hover:text-white"}`}
                    >
                        <span className="text-lg relative inline-block">
                            💬
                            {unreadChat > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                                    {unreadChat > 9 ? "9+" : unreadChat}
                                </span>
                            )}
                        </span>
                        <span>Chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
