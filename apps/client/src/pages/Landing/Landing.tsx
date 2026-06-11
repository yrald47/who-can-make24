import { useState, useEffect } from "react";
import type { Room } from "@who-can-make24/shared";
import { useSocket } from "../../hooks/useSocket";
import { RoomCard } from "../../components/RoomCard/RoomCard";
import { useRoomContext } from "../../context/useRoomContext";
import { loadIdentity } from "../../lib/identity";
import { Footer } from "../../components/Footer/Footer";
import { TrainingPanel } from "./TrainingPanel";

const AVATARS = ["😀", "🤓", "😎", "🧐", "🥸", "🤩", "😏", "🤯"];
const MODES: { value: Room["mode"]; label: string; disabled?: boolean }[] = [
    { value: "casual", label: "Casual" },
    { value: "pvp", label: "PvP" },
    { value: "battle-royale", label: "Battle Royale", disabled: true },
];

export function Landing() {
    const { connected } = useSocket();
    const [showRoomSheet, setShowRoomSheet] = useState(false);
    const { rooms, error, createRoom, joinRoom } = useRoomContext();

    const [name, setName] = useState(() => {
        const identity = loadIdentity();
        return (
            identity?.name ?? "Player" + Math.floor(Math.random() * 9000 + 1000)
        );
    });
    const [avatar, setAvatar] = useState(() => {
        const identity = loadIdentity();
        return identity?.avatar ?? "😀";
    });
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomMode, setNewRoomMode] = useState<Room["mode"]>("casual");
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [isTrainingMobile, setIsTrainingMobile] = useState(false);
    const [newRoomWild, setNewRoomWild] = useState(false);

    const [pvpMsg, setPvpMsg] = useState(() => {
        const msg = localStorage.getItem("pvp_decline_msg");
        if (msg) localStorage.removeItem("pvp_decline_msg");
        return msg;
    });

    useEffect(() => {
        if (!pvpMsg) return;
        const t = setTimeout(() => setPvpMsg(null), 4000);
        return () => clearTimeout(t);
    }, [pvpMsg]);

    function handleJumpIn() {
        if (!name.trim()) return;
        if (selectedRoom) {
            joinRoom(selectedRoom.id, name, avatar);
        } else {
            const available = rooms.find(
                (r) =>
                    r.status === "waiting" && r.players.length < r.maxPlayers,
            );
            if (available) joinRoom(available.id, name, avatar);
        }
    }

    function handleCreateRoom() {
        if (!newRoomName.trim() || !name.trim()) return;
        createRoom(
            newRoomName,
            newRoomMode,
            newRoomPrivate,
            name,
            avatar,
            newRoomWild,
        );
        setShowCreate(false);
        setNewRoomName("");
        setNewRoomWild(false);
    }

    return (
        <div className="bg-game-surface/50 min-h-screen flex flex-col">
            {/* Header */}
            <header className="backdrop-blur-game-sm bg-game-bg/85 border-b border-game-border px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-game-text text-2xl font-bold">
                        WHO CAN MAKE<span className="text-game-cyan">24</span>?
                    </h1>
                    <p className="field-label mt-px opacity-60">
                        › Real Players. Real Math. Real Battle.
                    </p>
                </div>
                <div
                    className={`flex items-center gap-2 text-xs font-medium ${connected ? "text-game-cyan" : "text-game-coral"}`}
                >
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-game-cyan animate-pulse" : "bg-game-coral"}`}
                    />
                    {connected ? "Connected" : "Disconnected"}
                </div>
            </header>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div
                    className="
                    relative w-full max-w-4xl rounded-sm
                    backdrop-blur-game bg-[rgba(18,22,30,0.82)]
                    border border-game-border
                    shadow-[0_0_0_1px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.6)]
                    before:absolute before:top-0 before:right-0 before:w-4 before:h-4 before:z-10
                    before:bg-[linear-gradient(225deg,rgba(13,17,23,0.95)_50%,transparent_50%)]
                "
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
                        {/* LEFT — Identity */}
                        <div className="p-6 flex flex-col gap-5 border-b border-game-border md:border-b-0 md:border-r md:border-game-border">
                            <p className="section-label">Your Identity</p>

                            {/* Avatar */}
                            <div>
                                <p className="field-label mb-2">
                                    Pick an avatar
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {AVATARS.map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => setAvatar(a)}
                                            className={`
                                                w-10 h-10 text-xl flex items-center justify-center rounded-[3px]
                                                border transition-all duration-100
                                                ${
                                                    avatar === a
                                                        ? "bg-game-cyan/10 border-game-cyan/60 shadow-[0_0_8px_rgba(56,189,248,0.15),inset_0_0_6px_rgba(56,189,248,0.05)]"
                                                        : "bg-black/50 border-game-border hover:border-game-cyan/30 hover:bg-game-cyan/5"
                                                }
                                            `}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <p className="field-label mb-1.5">Your name</p>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={20}
                                    placeholder="Enter callsign..."
                                    className="
                                        w-full px-3 py-2 text-sm rounded-[3px] transition-all
                                        bg-black/70 text-game-text placeholder:text-game-muted/40
                                        border border-game-border 
                                        focus:outline-none focus:border-game-cyan/50
                                        focus:shadow-[0_0_0_2px_rgba(56,189,248,0.06),inset_0_1px_3px_rgba(0,0,0,0.3)]
                                    "
                                />
                            </div>

                            {/* Google */}
                            <button
                                className="
                                w-full px-3 py-2 text-sm rounded-[3px] flex items-center justify-center gap-2
                                bg-black/50 border border-game-border text-game-muted
                                hover:border-game-border/60 hover:text-game-text transition-all 
                                rounded-xl
                                [clip-path:polygon(100%_0%,_91%_100%,_3%_93%,_0%_6%)]
                                
                            "
                            >
                                <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                    G
                                </span>
                                Sign in with Google
                            </button>

                            {error && (
                                <p className="text-xs text-game-coral">
                                    {error}
                                </p>
                            )}

                            {/* What is this — worn paper */}
                            {/* What is this / Training — flip di mobile */}
                            <div
                                className="mt-auto md:hidden"
                                style={{ perspective: "1000px" }}
                            >
                                <div
                                    className="relative transition-all duration-500"
                                    style={{
                                        transformStyle: "preserve-3d",
                                        transform: isTrainingMobile
                                            ? "rotateY(180deg)"
                                            : "rotateY(0deg)",
                                        minHeight: "200px",
                                        height: isTrainingMobile
                                            ? "420px"
                                            : "auto",
                                    }}
                                >
                                    {/* FRONT — What is this */}
                                    <div
                                        className={`paper-stack ${isTrainingMobile ? "pointer-events-none" : "pointer-events-auto"}`}
                                        style={{ backfaceVisibility: "hidden" }}
                                    >
                                        <div className="paper-front">
                                            <div className="paper-content">
                                                <p className="paper-label">
                                                    What is this? 🧠
                                                </p>
                                                <p
                                                    className="text-sm leading-relaxed"
                                                    style={{ color: "#3d2200" }}
                                                >
                                                    Turn 4 random numbers into{" "}
                                                    <span
                                                        className="font-bold"
                                                        style={{
                                                            color: "#1a4a6e",
                                                        }}
                                                    >
                                                        24
                                                    </span>{" "}
                                                    using{" "}
                                                    <span
                                                        className="font-mono font-bold"
                                                        style={{
                                                            color: "#2d1800",
                                                        }}
                                                    >
                                                        + − × ÷
                                                    </span>{" "}
                                                    only. If you think you know
                                                    the math,{" "}
                                                    <span
                                                        className="font-semibold"
                                                        style={{
                                                            color: "#2d1800",
                                                        }}
                                                    >
                                                        hit the buzzer fast!
                                                    </span>
                                                </p>
                                                <p
                                                    className="text-sm leading-relaxed mt-2"
                                                    style={{ color: "#3d2200" }}
                                                >
                                                    The slowest players become
                                                    the{" "}
                                                    <span
                                                        className="font-semibold"
                                                        style={{
                                                            color: "#8b1a00",
                                                        }}
                                                    >
                                                        "Loser Candidates."
                                                    </span>{" "}
                                                    They point at you to prove
                                                    your answer. Prove it right
                                                    — you get the points. Fail
                                                    it — they do.
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        setIsTrainingMobile(
                                                            true,
                                                        )
                                                    }
                                                    className="mt-3 text-[0.6rem] font-heading tracking-widest uppercase px-2 py-1 rounded-[3px] border transition-all"
                                                    style={{
                                                        color: "#3d1f00",
                                                        borderColor:
                                                            "rgba(61,31,0,0.3)",
                                                    }}
                                                >
                                                    🧠 Train Mode →
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BACK — Training */}
                                    <div
                                        className={`absolute inset-0 bg-game-surface2 rounded-sm border border-game-border ${isTrainingMobile ? "pointer-events-auto" : "pointer-events-none"}`}
                                        style={{
                                            backfaceVisibility: "hidden",
                                            transform: "rotateY(180deg)",
                                        }}
                                    >
                                        <TrainingPanel
                                            onBack={() =>
                                                setIsTrainingMobile(false)
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* What is this — desktop only (no flip) */}
                            <div className="paper-stack mt-auto hidden md:block">
                                <div className="paper-front">
                                    <div className="paper-content">
                                        <p className="paper-label">
                                            What is this? 🧠
                                        </p>
                                        <p
                                            className="text-sm leading-relaxed"
                                            style={{ color: "#3d2200" }}
                                        >
                                            Turn 4 random numbers into{" "}
                                            <span
                                                className="font-bold"
                                                style={{ color: "#1a4a6e" }}
                                            >
                                                24
                                            </span>{" "}
                                            using{" "}
                                            <span
                                                className="font-mono font-bold"
                                                style={{ color: "#2d1800" }}
                                            >
                                                + − × ÷
                                            </span>{" "}
                                            only. If you think you know the
                                            math,{" "}
                                            <span
                                                className="font-semibold"
                                                style={{ color: "#2d1800" }}
                                            >
                                                hit the buzzer fast!
                                            </span>
                                        </p>
                                        <p
                                            className="text-sm leading-relaxed mt-2"
                                            style={{ color: "#3d2200" }}
                                        >
                                            The slowest players become the{" "}
                                            <span
                                                className="font-semibold"
                                                style={{ color: "#8b1a00" }}
                                            >
                                                "Loser Candidates."
                                            </span>{" "}
                                            They point at you to prove your
                                            answer. Prove it right — you get the
                                            points. Fail it — they do.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — Rooms / Training (flip) */}
                        <div
                            className="hidden md:flex flex-col relative"
                            style={{ perspective: "1000px" }}
                        >
                            {/* Flip container */}
                            <div
                                className="flex-1 relative transition-all duration-500"
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: isTraining
                                        ? "rotateY(180deg)"
                                        : "rotateY(0deg)",
                                }}
                            >
                                {/* FRONT — Room list */}
                                <div
                                    className={`absolute inset-0 flex flex-col p-6 gap-4 ${isTraining ? "pointer-events-none" : "pointer-events-auto"}`}
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="section-label flex-1">
                                            Choose a Room
                                        </p>
                                        <button
                                            onClick={() => setIsTraining(true)}
                                            className="ml-3 text-[0.6rem] font-heading tracking-widest uppercase text-game-muted hover:text-game-cyan border border-game-border hover:border-game-cyan/40 px-2 py-1 rounded-[3px] transition-all whitespace-nowrap"
                                        >
                                            🧠 Train Mode
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setShowCreate(true)}
                                        className="w-full py-2.5 rounded-[3px] text-sm border border-dashed border-game-cyan/30 text-game-cyan/70 hover:border-game-cyan/60 hover:bg-game-cyan/5 hover:text-game-cyan transition-all"
                                    >
                                        + Create New Room
                                    </button>

                                    <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto content-start max-h-80 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-game-border [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {rooms.length === 0 ? (
                                            <p className="col-span-2 text-center text-sm mt-8 text-game-muted opacity-50">
                                                No rooms available
                                            </p>
                                        ) : (
                                            rooms.map((room) => (
                                                <RoomCard
                                                    key={room.id}
                                                    room={room}
                                                    isSelected={
                                                        selectedRoom?.id ===
                                                        room.id
                                                    }
                                                    onClick={() =>
                                                        setSelectedRoom(
                                                            (prev) =>
                                                                prev?.id ===
                                                                room.id
                                                                    ? null
                                                                    : room,
                                                        )
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* BACK — Training */}
                                <div
                                    className={`absolute inset-0 flex flex-col ${isTraining ? "pointer-events-auto" : "pointer-events-none"}`}
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateY(180deg)",
                                    }}
                                >
                                    <TrainingPanel
                                        onBack={() => setIsTraining(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Jump In bar */}
                    <div className="hidden md:flex relative overflow-hidden px-6 py-4 items-center justify-between bg-black/60 border-t border-game-border">
                        <p className="text-xs text-game-muted opacity-60">
                            {selectedRoom
                                ? `${selectedRoom.name} · ${selectedRoom.players.length}/${selectedRoom.maxPlayers} players`
                                : "Random matchmaking or choose a room"}
                        </p>
                        <button
                            onClick={handleJumpIn}
                            disabled={!connected || !name.trim()}
                            className="
                                absolute -right-1 -bottom-0
                                px-8 py-2.5 text-sm rounded-[3px]
                                font-heading font-semibold tracking-[0.12em] uppercase
                                bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950
                                border border-amber-400/40
                                shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_-4px_0_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]
                                hover:from-amber-200 hover:to-amber-400
                                hover:shadow-[0_4px_20px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]
                                hover:-translate-y-px transition-all
                                disabled:opacity-35 disabled:cursor-not-allowed [clip-path:polygon(3%_20%,_100%_5%,_100%_100%,_0%_100%)]
                            "
                        >
                            <span>Jump In ↗</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile floating */}
            <div className="md:hidden fixed bottom-6 right-6 flex flex-col items-end gap-2 z-40">
                <button
                    onClick={() => setShowRoomSheet(true)}
                    className="
                        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[3px]
                        backdrop-blur-game bg-game-surface/90 border border-game-accent text-game-cyan
                    "
                >
                    {selectedRoom ? (
                        <>
                            <span>{selectedRoom.name}</span>
                            <span className="text-game-muted">
                                {selectedRoom.players.length}/
                                {selectedRoom.maxPlayers}
                            </span>
                        </>
                    ) : (
                        <>
                            <span>🔀</span>
                            <span>Random or choose room</span>
                        </>
                    )}
                </button>
                <button
                    onClick={handleJumpIn}
                    disabled={!connected || !name.trim()}
                    className="
                        px-6 py-3 text-base rounded-[3px]
                        font-heading font-semibold tracking-[0.12em] uppercase
                        bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950
                        border border-amber-400/40
                        shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
                        hover:from-amber-200 hover:to-amber-400 hover:-translate-y-px transition-all
                        disabled:opacity-35 disabled:cursor-not-allowed 
                        [clip-path:shape(from_97.3%_4.1%,line_to_84.7%_84.2%,curve_to_80.5%_97.4%_with_82%_99%,line_to_15.7%_87.9%,curve_to_4.5%_85.0%_with_4%_86%,line_to_1.5%_26.5%,curve_to_2.3%_13.9%_with_1%_16%,line_to_85.3%_4.1%,curve_to_97.3%_4.1%_with_100%_2%)]
                        
                    "
                >
                    Jump In ↗
                </button>
            </div>

            {/* Mobile Bottom Sheet */}
            {showRoomSheet && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowRoomSheet(false)}
                    />
                    <div className="relative p-5 max-h-[80vh] flex flex-col bg-game-surface border-t border-game-accent rounded-t-[4px]">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label flex-none">
                                Choose a Room
                            </p>
                            <button
                                onClick={() => setShowRoomSheet(false)}
                                className="text-game-muted hover:text-game-text"
                            >
                                ✕
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setShowRoomSheet(false);
                                setShowCreate(true);
                            }}
                            className="w-full py-2 mb-3 rounded-[3px] text-sm border border-dashed border-game-cyan/30 text-game-cyan/70 hover:border-game-cyan/60 hover:bg-game-cyan/5 hover:text-game-cyan transition-all"
                        >
                            + Create New Room
                        </button>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            {rooms.length === 0 ? (
                                <p className="text-center text-sm mt-8 text-game-muted opacity-50">
                                    No rooms available
                                </p>
                            ) : (
                                rooms.map((room) => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        isSelected={
                                            selectedRoom?.id === room.id
                                        }
                                        onClick={() => {
                                            setSelectedRoom((prev) =>
                                                prev?.id === room.id
                                                    ? null
                                                    : room,
                                            );
                                            setShowRoomSheet(false);
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Room Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
                    <div
                        className="
                        relative w-full max-w-sm mx-4 p-6 rounded-sm
                        backdrop-blur-game bg-[rgba(18,22,30,0.95)]
                        border border-game-border
                        shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.6)]
                        before:absolute before:top-0 before:right-0 before:w-4 before:h-4 before:z-10
                        before:bg-[linear-gradient(225deg,rgba(13,17,23,0.95)_50%,transparent_50%)]
                    "
                    >
                        <p className="section-label mb-5">Create New Room</p>

                        <p className="field-label mb-1.5">Room name</p>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="My Arena"
                            className="
                                w-full px-3 py-2 text-sm rounded-[3px] mb-4 transition-all
                                bg-black/70 text-game-text placeholder:text-game-muted/40
                                border border-game-border
                                focus:outline-none focus:border-game-cyan/50
                                focus:shadow-[0_0_0_2px_rgba(56,189,248,0.06)]
                            "
                        />

                        <p className="field-label mb-2">Mode</p>
                        <div className="flex gap-2 mb-4">
                            {MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() =>
                                        !m.disabled && setNewRoomMode(m.value)
                                    }
                                    disabled={m.disabled}
                                    className={`
                                        flex-1 py-1.5 rounded-[3px] text-[0.72rem]
                                        font-heading tracking-[0.08em] uppercase
                                        border transition-all
                                        ${
                                            newRoomMode === m.value
                                                ? "bg-game-cyan/10 border-game-cyan/55 text-game-cyan shadow-[0_0_10px_rgba(56,189,248,0.12)]"
                                                : "bg-black/50 border-game-border text-game-muted hover:border-game-border/60 hover:text-game-text"
                                        }
                                    `}
                                >
                                    {m.label}
                                    {m.disabled ? " (Soon)" : ""}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-sm mb-5 cursor-pointer text-game-muted">
                            <input
                                type="checkbox"
                                checked={newRoomPrivate}
                                onChange={(e) =>
                                    setNewRoomPrivate(e.target.checked)
                                }
                                className="accent-game-cyan"
                            />
                            Private room (invite code)
                        </label>

                        <label className="flex items-center gap-2 text-sm mb-5 cursor-pointer text-game-muted">
                            <input
                                type="checkbox"
                                checked={newRoomWild}
                                onChange={(e) =>
                                    setNewRoomWild(e.target.checked)
                                }
                                className="accent-game-amber"
                            />
                            Wild Mode 🃏{" "}
                            <span className="text-game-muted/50 text-xs">
                                (J=11, Q=12, K=13)
                            </span>
                        </label>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-2 text-sm rounded-[3px] bg-white/[0.03] border border-game-border text-game-muted hover:bg-white/[0.06] hover:text-game-text transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                disabled={!newRoomName.trim()}
                                className="
                                    flex-1 py-2 text-sm rounded-[3px]
                                    font-heading tracking-[0.12em] uppercase
                                    bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950
                                    border border-amber-400/40
                                    shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
                                    hover:from-amber-200 hover:to-amber-400 transition-all
                                    disabled:opacity-35 disabled:cursor-not-allowed
                                "
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            {pvpMsg && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-sm border border-game-coral/40 bg-game-bg/95 backdrop-blur-game shadow-2xl text-game-coral text-sm font-heading tracking-wider text-center">
                    ✗ {pvpMsg}
                </div>
            )}
        </div>
    );
}
