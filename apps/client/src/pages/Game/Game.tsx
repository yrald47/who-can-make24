import { useState } from "react";
import { useRoomContext } from "../../context/useRoomContext";
import { useGameContext } from "../../context/useGameContext";
import { useSocket } from "../../hooks/useSocket";
import { PlayerArena } from "./components/PlayerArena";
import { Playboard } from "./components/Playboard";
import { ChatLog } from "./components/ChatLog";
import { RulesModal } from "./components/RulesModal";
import { PvpPhase } from "./components/phases/PvpPhase";

type MobileTab = "game" | "players" | "chat";

const RULES_SEEN_KEY = "wmc24_rules_seen";

export function Game() {
    const { currentRoom, leaveRoom } = useRoomContext();
    const {
        gameState,
        unreadChat,
        clearUnreadChat,
        pvpOffer,
        respondPvpOffer,
        pvpVotes,
        pvpDeclineMsg,
    } = useGameContext();
    const { socket } = useSocket();
    const [mobileTab, setMobileTab] = useState<MobileTab>("game");
    const [showRules, setShowRules] = useState(() => {
        const seen = localStorage.getItem(RULES_SEEN_KEY);
        return !seen;
    });
    // const [pvpDeclineMsg, setPvpDeclineMsg] = useState<string | null>(null);
    

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
    const isPvp = gameState.isPvp;

    return (
        <div className="min-h-screen flex flex-col">
            {showRules && <RulesModal onClose={handleCloseRules} />}

            {/* PVP Offer Modal */}
            {pvpOffer && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="relative w-full max-w-sm mx-4 p-6 rounded-sm backdrop-blur-game bg-[rgba(18,22,30,0.95)] border border-game-border shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.6)]">
                        <p className="section-label mb-4">
                            ⚡ PVP Mode Offered
                        </p>

                        <p className="text-game-muted text-sm mb-4 leading-relaxed">
                            Only 2 players remain. Switch to{" "}
                            <span className="text-game-amber font-semibold">
                                PVP Mode
                            </span>
                            ? Scores reset to 0. First to make 24 each round
                            wins +1 point.
                            {pvpOffer.isWild && (
                                <span className="text-game-cyan">
                                    {" "}
                                    Wild mode active 🃏
                                </span>
                            )}
                        </p>

                        {/* Vote status */}
                        <div className="flex flex-col gap-1 mb-5">
                            {pvpOffer.players.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="text-game-muted">
                                        {p.name}
                                    </span>
                                    <span
                                        className={
                                            pvpVotes[p.id] === true
                                                ? "text-game-cyan"
                                                : pvpVotes[p.id] === false
                                                    ? "text-game-coral"
                                                    : "text-game-muted/50"
                                        }
                                    >
                                        {pvpVotes[p.id] === true
                                            ? "✓ Accept"
                                            : pvpVotes[p.id] === false
                                                ? "✗ Decline"
                                                : "Waiting..."}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Only show buttons if this player hasn't voted yet */}
                        {/* {pvpVotes[myId] === undefined && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => respondPvpOffer(false)}
                                    className="btn-moco btn-moco-ghost flex-1"
                                >
                                    <span>✗ Decline</span>
                                </button>
                                <button
                                    onClick={() => respondPvpOffer(true)}
                                    className="btn-moco btn-moco-amber flex-1"
                                >
                                    <span>⚡ Accept</span>
                                </button>
                            </div>
                        )}

                        {pvpVotes[myId] !== undefined && (
                            <p className="text-center text-game-muted text-xs">
                                Waiting for other player...
                            </p>
                        )} */}
                        {pvpDeclineMsg ? (
                            <div className="text-center p-3 rounded-[3px] border border-game-coral/40 bg-game-coral/10">
                                <p className="text-game-coral text-sm">
                                    {pvpDeclineMsg}
                                </p>
                                <p className="text-game-muted text-xs mt-1">
                                    Returning to lobby...
                                </p>
                            </div>
                        ) : pvpVotes[myId] === undefined ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => respondPvpOffer(false)}
                                    className="btn-moco btn-moco-ghost flex-1"
                                >
                                    <span>✗ Decline</span>
                                </button>
                                <button
                                    onClick={() => respondPvpOffer(true)}
                                    className="btn-moco btn-moco-amber flex-1"
                                >
                                    <span>⚡ Accept</span>
                                </button>
                            </div>
                        ) : (
                            <p className="text-center text-game-muted text-xs">
                                Waiting for other player...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-game-bg/90 backdrop-blur-game-sm border-b border-game-border px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="font-heading text-game-text font-bold text-sm md:text-base tracking-wide">
                        WHO CAN MAKE<span className="text-game-cyan">24</span>?
                    </h1>
                    <span className="text-game-muted text-xs border border-game-border px-2 py-0.5 rounded-[3px]">
                        {currentRoom.name}
                        {currentRoom.isWild && (
                            <span className="text-game-amber ml-1">🃏</span>
                        )}
                        {isPvp && (
                            <span className="text-game-amber ml-1">⚡PVP</span>
                        )}
                    </span>
                </div>
                <span className="text-game-muted text-xs font-heading tracking-widest">
                    ROUND {gameState.round}
                </span>
                <button
                    onClick={leaveRoom}
                    className="text-game-muted hover:text-game-coral text-xs transition-colors font-heading tracking-wider"
                >
                    ← LEAVE
                </button>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex flex-col flex-1 p-3 gap-3">
                <div className="flex-1 min-h-0" style={{ minHeight: 400 }}>
                    {isPvp ? (
                        <div className="h-full flex flex-col gap-3">
                            <PlayerArena
                                players={currentRoom.players}
                                myId={myId}
                                bellPressers={bellPressers}
                                candidates={candidates}
                                pointedPlayers={pointedPlayers}
                                scores={gameState.scores}
                            >
                                <PvpPhase key={gameState.round} />
                            </PlayerArena>
                        </div>
                    ) : (
                        <PlayerArena
                            players={currentRoom.players}
                            myId={myId}
                            bellPressers={bellPressers}
                            candidates={candidates}
                            pointedPlayers={pointedPlayers}
                            scores={gameState.scores}
                        >
                            <Playboard onShowRules={() => setShowRules(true)} />
                        </PlayerArena>
                    )}
                </div>
                <div className="flex gap-3 h-36 shrink-0 max-w-3xl mx-auto w-full">
                    <ChatLog alwaysOpen={true} />
                </div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden flex flex-col flex-1">
                <div className="flex-1 p-3" style={{ minHeight: 500 }}>
                    {mobileTab === "game" &&
                        (isPvp ? (
                            <PvpPhase key={gameState.round} />
                        ) : (
                            <Playboard onShowRules={() => setShowRules(true)} />
                        ))}
                    {mobileTab === "players" && (
                        <div className="flex flex-col gap-2">
                            {currentRoom.players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-3 p-3 rounded-sm bg-game-surface border border-game-border ${player.id === myId ? "border-game-cyan/40" : ""}`}
                                >
                                    <span className="text-2xl">
                                        {player.avatar}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-game-text text-sm font-medium">
                                            {player.name}
                                        </p>
                                        <p className="text-game-muted text-xs">
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
                <div className="bg-game-bg/90 backdrop-blur-game-sm flex shrink-0 border-t border-game-border">
                    <button
                        onClick={() => setMobileTab("game")}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "game" ? "text-game-amber" : "text-game-muted hover:text-game-text"}`}
                    >
                        <span className="text-lg">🎮</span>
                        <span className="font-heading tracking-wider">
                            Game
                        </span>
                    </button>
                    <button
                        onClick={() => setMobileTab("players")}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "players" ? "text-game-amber" : "text-game-muted hover:text-game-text"}`}
                    >
                        <span className="text-lg">👥</span>
                        <span className="font-heading tracking-wider">
                            Players
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setMobileTab("chat");
                            clearUnreadChat();
                        }}
                        className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${mobileTab === "chat" ? "text-game-amber" : "text-game-muted hover:text-game-text"}`}
                    >
                        <span className="text-lg relative inline-block">
                            💬
                            {unreadChat > 0 && (
                                <span className="absolute -top-1 -right-2 bg-game-coral text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                                    {unreadChat > 9 ? "9+" : unreadChat}
                                </span>
                            )}
                        </span>
                        <span className="font-heading tracking-wider">
                            Chat
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
