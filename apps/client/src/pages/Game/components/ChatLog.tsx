import { useState, useEffect, useRef } from "react";
import { useGameContext} from "../../../context/useGameContext";
// import { useRoomContext } from "../../../context/useRoomContext";
import { useSocket } from "../../../hooks/useSocket";
import { socket } from "../../../lib/socket";

// interface LogMessage {
//     id: string;
//     type: "log";
//     text: string;
//     timestamp: number;
// }

// interface ChatMessage {
//     id: string;
//     type: "chat";
//     playerId: string;
//     playerName: string;
//     text: string;
//     timestamp: number;
// }

// type Message = LogMessage | ChatMessage;

// interface LogPayload {
//     text: string;
//     timestamp: number;
// }

// interface ChatPayload {
//     playerId: string;
//     playerName: string;
//     text: string;
//     timestamp: number;
// }

// interface ChatLogProps {
//     isActive?: boolean;
// }

interface ChatLogProps {
    alwaysOpen?: boolean;
}

// export function ChatLog({ isActive = false }: ChatLogProps) {
export function ChatLog({ alwaysOpen = false }: ChatLogProps) {
    const { phase, logMessages, clearUnreadChat, chatMessages, setChatOpen } =
        useGameContext();
    const { socket: sock } = useSocket();
    // const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const logBottomRef = useRef<HTMLDivElement>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const chatDisabled = phase === "proof";

    // const { clearUnreadChat } = useGameContext();

    useEffect(() => {
        logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logMessages]);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // useEffect(() => {
    //     clearUnreadChat();
    // }, []);

    // useEffect(() => {
    //     if (isActive) clearUnreadChat();
    // }, [chatMessages, isActive]);

    useEffect(() => {
        if (alwaysOpen) return;
        console.log("ChatLog mounted, setChatOpen(true)");

        setChatOpen(true);
        clearUnreadChat();
        return () => {
            console.log("ChatLog unmounted, setChatOpen(false)");
            setChatOpen(false); // cleanup saat unmount
        };
    }, []);

    // useEffect(() => {
    //     const onLog = (data: LogPayload) => {
    //         setMessages((prev) => [
    //             ...prev,
    //             {
    //                 id: `log-${Date.now()}-${Math.random()}`,
    //                 type: "log",
    //                 text: data.text,
    //                 timestamp: data.timestamp,
    //             },
    //         ]);
    //     };

    //     const onChat = (data: ChatPayload) => {
    //         setMessages((prev) => [
    //             ...prev,
    //             {
    //                 id: `chat-${Date.now()}-${Math.random()}`,
    //                 type: "chat",
    //                 playerId: data.playerId,
    //                 playerName: data.playerName,
    //                 text: data.text,
    //                 timestamp: data.timestamp,
    //             },
    //         ]);
    //     };

    //     socket.on("game:log", onLog);
    //     socket.on("game:chat", onChat);

    //     return () => {
    //         socket.off("game:log", onLog);
    //         socket.off("game:chat", onChat);
    //     };
    // }, []);

    function sendChat() {
        if (!input.trim() || chatDisabled) return;
        socket.emit("game:chat", { text: input.trim() });
        setInput("");
    }

    // const logs = messages.filter((m): m is LogMessage => m.type === "log");
    // const chats = messages.filter((m): m is ChatMessage => m.type === "chat");

    const myId = sock.id ?? "";

    return (
        <div className="flex gap-2 h-full">
            {/* LOG */}
            <div className="flex-1 bg-white/10 rounded-xl flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 shrink-0">
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                        Game Log
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {logMessages.length === 0 ? (
                        <p className="text-white/30 text-xs text-center mt-4">
                            No events yet
                        </p>
                    ) : (
                        logMessages.map((m) => (
                            <p
                                key={m.id}
                                className="text-white/60 text-xs leading-relaxed"
                            >
                                {m.text}
                            </p>
                        ))
                    )}
                    <div ref={logBottomRef} />
                </div>
            </div>

            {/* CHAT */}
            <div className="flex-1 bg-white/10 rounded-xl flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 shrink-0">
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                        Chat
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {chatMessages.length === 0 ? (
                        <p className="text-white/30 text-xs text-center mt-4">
                            No messages yet
                        </p>
                    ) : (
                        chatMessages.map((m) => (
                            <div key={m.id}>
                                <span
                                    className={`text-xs font-medium ${m.playerId === myId ? "text-yellow-300" : "text-blue-300"}`}
                                >
                                    {m.playerId === myId ? "You" : m.playerName}
                                    :
                                </span>{" "}
                                <span className="text-white/80 text-xs">
                                    {m.text}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={chatBottomRef} />
                </div>
                <div className="border-t border-white/10 p-2 flex gap-2 shrink-0">
                    {chatDisabled ? (
                        <p className="text-white/30 text-xs w-full text-center py-1">
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
                                className="flex-1 bg-transparent text-white text-xs placeholder-white/30 outline-none"
                                maxLength={200}
                            />
                            <button
                                onClick={sendChat}
                                disabled={!input.trim()}
                                className="text-yellow-400 text-xs font-medium hover:text-yellow-300 disabled:opacity-40"
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
