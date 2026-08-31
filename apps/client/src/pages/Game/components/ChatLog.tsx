import { useState, useEffect, useRef } from "react";
import { useGameContext } from "../../../context/useGameContext";
import { useSocket } from "../../../hooks/useSocket";
import { socket } from "../../../lib/socket";

interface ChatLogProps {
    alwaysOpen?: boolean;
}

export function ChatLog({ alwaysOpen = false }: ChatLogProps) {
    const { phase, logMessages, clearUnreadChat, chatMessages, setChatOpen } =
        useGameContext();
    const { socket: sock } = useSocket();
    const [input, setInput] = useState("");
    const logBottomRef = useRef<HTMLDivElement>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const chatDisabled = phase === "proof";

    useEffect(() => {
        logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logMessages]);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    useEffect(() => {
        if (alwaysOpen) return;
        setChatOpen(true);
        clearUnreadChat();
        return () => {
            setChatOpen(false);
        };
    }, []);

    function sendChat() {
        if (!input.trim() || chatDisabled) return;
        socket.emit("game:chat", { text: input.trim() });
        setInput("");
    }

    const myId = sock.id ?? "";

    return (
        <div className="flex gap-2 h-full">
            {/* LOG */}
            <div className="flex-1 card-moco card-moco-cyan flex flex-col overflow-hidden">
                <div className="top-bar-moco top-bar-moco-cyan shrink-0">
                    <span>Game Log</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {logMessages.length === 0 ? (
                        <p className="text-game-muted/40 text-xs text-center mt-4 font-heading tracking-widest">
                            NO EVENTS YET
                        </p>
                    ) : (
                        logMessages.map((m) => (
                            <p
                                key={m.id}
                                className="text-game-muted text-xs leading-relaxed"
                            >
                                {m.text}
                            </p>
                        ))
                    )}
                    <div ref={logBottomRef} />
                </div>
            </div>

            {/* CHAT */}
            <div className="flex-1 card-moco card-moco-amber flex flex-col overflow-hidden">
                <div className="top-bar-moco top-bar-moco-amber shrink-0">
                    <span>Chat</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {chatMessages.length === 0 ? (
                        <p className="text-game-muted/40 text-xs text-center mt-4 font-heading tracking-widest">
                            NO MESSAGES YET
                        </p>
                    ) : (
                        chatMessages.map((m) => (
                            <div key={m.id}>
                                <span
                                    className={`text-xs font-heading tracking-wider ${m.playerId === myId ? "text-game-amber" : "text-game-cyan"}`}
                                >
                                    {m.playerId === myId ? "You" : m.playerName}
                                    :
                                </span>{" "}
                                <span className="text-game-text text-xs">
                                    {m.text}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={chatBottomRef} />
                </div>
                <div className="border-t border-game-border p-2 flex gap-2 shrink-0">
                    {chatDisabled ? (
                        <p className="text-game-muted/30 text-xs w-full text-center py-1 font-heading tracking-wider">
                            Chat disabled during proof phase
                        </p>
                    ) : (
                        <>
                            <input
                                value={input}
                                onChange={(e) =>
                                    setInput(e.target.value.slice(0, 200))
                                }
                                onKeyDown={(e) =>
                                    e.key === "Enter" && sendChat()
                                }
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent text-game-text text-xs placeholder:text-game-muted/30 outline-none"
                                maxLength={200}
                            />
                            <button
                                onClick={sendChat}
                                disabled={!input.trim()}
                                className="text-game-amber text-xs font-heading tracking-wider hover:text-amber-300 disabled:opacity-30 transition-colors"
                            >
                                Send
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
