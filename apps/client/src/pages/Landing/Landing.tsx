import { useEffect, useState } from "react";
import { VALID_AVATARS, avatarSrc } from "@who-can-make24/shared";
import type { Room } from "@who-can-make24/shared";
import { useRoomContext } from "../../context/useRoomContext";
import { useSocket } from "../../hooks/useSocket";
import { Footer } from "../../components/Footer/Footer";
import { RoomCard } from "../../components/RoomCard/RoomCard";
import { TrainingPanel } from "./TrainingPanel";

const MODES: { value: Room["mode"]; label: string; disabled?: boolean }[] = [
    { value: "casual", label: "Casual" },
    { value: "pvp", label: "PvP" },
    { value: "battle-royale", label: "Battle Royale", disabled: true },
];

export function Landing() {
    const { rooms, createRoom, joinRoom, savedIdentity } = useRoomContext();
    const { connected } = useSocket();

    const [name, setName] = useState(savedIdentity?.name ?? "");
    const [avatar, setAvatar] = useState(
        savedIdentity?.avatar ?? VALID_AVATARS[0],
    );
    const [showCreate, setShowCreate] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomMode, setNewRoomMode] = useState<Room["mode"]>("casual");
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);
    const [newRoomWild, setNewRoomWild] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    const [isTrainingMobile, setIsTrainingMobile] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [showRoomList, setShowRoomList] = useState(false);

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get("join");
        if (!joinId || !name.trim()) return;
        window.history.replaceState({}, "", window.location.pathname);
        joinRoom(joinId, name, avatar);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const publicRooms = rooms.filter(
        (r) => !r.isPrivate && r.status === "waiting",
    );

    function handleJumpIn() {
        if (!name.trim() || !connected) return;
        if (selectedRoomId) {
            joinRoom(selectedRoomId, name, avatar);
        } else if (publicRooms.length > 0) {
            const room =
                publicRooms[Math.floor(Math.random() * publicRooms.length)]!;
            joinRoom(room.id, name, avatar);
        } else {
            setShowCreate(true);
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
        <div className="h-screen h-[100dvh] flex flex-col overflow-hidden">
            {/* ── HEADER ── */}
            <header className="relative z-10 bg-game-bg/80 backdrop-blur-game-sm border-b border-game-border/40 px-6 pt-5 pb-3 shrink-0 flex items-start justify-between">
                <div>
                    <h1 className="font-heading font-bold text-2xl md:text-3xl text-game-text tracking-wide leading-none">
                        WHO CAN MAKE<span className="text-game-cyan">24</span>?
                    </h1>
                    <p className="text-game-muted text-xs font-heading tracking-[0.18em] mt-1 uppercase opacity-60">
                        › Real Players. Real Math. Real Battle.
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-game-cyan" : "bg-game-coral"}`}
                    />
                    <span className="text-xs text-game-muted font-heading tracking-wider">
                        {connected ? "Connected" : "Connecting..."}
                    </span>
                </div>
            </header>

            {/* ── MAIN ── */}
            <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6">
                <div className="w-full max-w-6xl mx-auto flex-1 min-h-0 flex flex-col gap-2">
                    {/* Support links */}
                    <div className="flex justify-center gap-3 shrink-0">
                        <span className="text-game-muted/20 text-xs">
                            Deploy locally ·
                        </span>
                        <a
                            href="https://saweria.co/rald"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-game-muted/40 hover:text-game-muted text-xs transition-colors"
                        >
                            Support here
                        </a>
                        <span className="text-game-muted/20 text-xs">
                            · or ·
                        </span>
                        <a
                            href="https://trakteer.id/yudha_restu_alditya"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-game-muted/40 hover:text-game-muted text-xs transition-colors"
                        >
                            Buy me a cendol ☕
                        </a>
                    </div>

                    {/* ── TWO COLUMN ── */}
                    <div className="w-full flex-1 min-h-0 flex flex-col md:flex-row gap-4">
                        {/* ── LEFT — Identity ── */}
                        <div className="card-moco card-moco-cyan corner-accent-moco corner-accent-moco-cyan relative w-full md:w-96 shrink-0 flex flex-col min-h-0">
                            <div className="top-bar-moco top-bar-moco-cyan shrink-0">
                                <span>Your Identity</span>
                            </div>

                            {/* Form area */}
                            <div className="p-4 md:p-5 flex-1 min-h-0 flex flex-col gap-3">
                                <div className="flex flex-col gap-3">
                                    {/* Avatar */}
                                    <div>
                                        <p className="field-label mb-2">
                                            Pick an Avatar
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {VALID_AVATARS.map((a) => (
                                                <button
                                                    key={a}
                                                    onClick={() => setAvatar(a)}
                                                    className={`
                                                        aspect-square rounded-[3px] text-xl flex items-center justify-center
                                                        border transition-all
                                                        ${
                                                            avatar === a
                                                                ? "bg-game-cyan/10 border-game-cyan shadow-[0_0_8px_rgba(56,189,248,0.15)]"
                                                                : "bg-black/40 border-game-border hover:border-game-cyan/40"
                                                        }
                                                    `}
                                                >
                                                    <img
                                                        src={avatarSrc(a)}
                                                        alt={a}
                                                        className="w-15 h-15 object-contain"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <p className="field-label mb-1.5">
                                            Your Name
                                        </p>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)
                                            }
                                            placeholder="Enter your name"
                                            maxLength={20}
                                            className="w-full bg-black/60 border border-game-border rounded-[3px] px-3 py-2 text-game-text text-sm outline-none focus:border-game-cyan/60 transition-colors placeholder:text-game-muted/30"
                                        />
                                    </div>

                                    {/* Google */}
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-[3px] bg-black/40 border border-game-border text-game-muted/40 text-sm cursor-not-allowed"
                                    >
                                        <span className="text-base">G</span>
                                        Sign in with Google
                                    </button>
                                    {/* What is this — desktop only, pushed to bottom */}
                                    <div className="hidden md:block">
                                        <div className="paper-stack">
                                            <div className="paper-front px-4 py-3">
                                                <p className="section-label mb-1.5">
                                                    What is this? 🧠
                                                </p>
                                                <p className="text-xs leading-relaxed text-game-text/80">
                                                    Turn 4 random numbers into{" "}
                                                    <strong className="text-game-cyan">
                                                        24
                                                    </strong>{" "}
                                                    using{" "}
                                                    <strong>+ − × ÷</strong>{" "}
                                                    only. If you think you know
                                                    the math,{" "}
                                                    <strong>
                                                        hit the buzzer fast!
                                                    </strong>
                                                </p>
                                                <p className="text-xs mt-1.5 leading-relaxed text-game-text/80">
                                                    The slowest players become
                                                    the{" "}
                                                    <strong className="text-game-coral">
                                                        "Loser Candidates."
                                                    </strong>{" "}
                                                    They point at you to prove
                                                    your answer. Prove it right
                                                    — you get the points. Fail
                                                    it — they do.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile: What is this / Training flip */}
                                    <div
                                        className="md:hidden"
                                        style={{ perspective: "1000px" }}
                                    >
                                        <div
                                            className="relative transition-all duration-500"
                                            style={{
                                                transformStyle: "preserve-3d",
                                                transform: isTrainingMobile
                                                    ? "rotateY(180deg)"
                                                    : "rotateY(0deg)",
                                                minHeight: "300px",
                                                height: isTrainingMobile
                                                    ? "auto"
                                                    : "auto",
                                            }}
                                        >
                                            {/* FRONT */}
                                            <div
                                                className={`paper-stack ${isTrainingMobile ? "pointer-events-none" : "pointer-events-auto"}`}
                                                style={{
                                                    backfaceVisibility:
                                                        "hidden",
                                                }}
                                            >
                                                <div className="paper-front p-4">
                                                    <p className="section-label mb-2">
                                                        What is this? 🧠
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-game-text/80">
                                                        Turn 4 random numbers
                                                        into{" "}
                                                        <strong className="text-game-cyan">
                                                            24
                                                        </strong>{" "}
                                                        using{" "}
                                                        <strong>+ − × ÷</strong>{" "}
                                                        only. If you think you
                                                        know the math,{" "}
                                                        <strong>
                                                            hit the buzzer fast!
                                                        </strong>
                                                    </p>
                                                    <p className="text-sm mt-2 leading-relaxed text-game-text/80">
                                                        The slowest players
                                                        become the{" "}
                                                        <strong className="text-game-coral">
                                                            "Loser Candidates."
                                                        </strong>{" "}
                                                        They point at you to
                                                        prove your answer. Prove
                                                        it right — you get the
                                                        points. Fail it — they
                                                        do.
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            setIsTrainingMobile(
                                                                true,
                                                            )
                                                        }
                                                        className="mt-3 btn-moco btn-moco-ghost text-[0.7rem]"
                                                    >
                                                        <span>
                                                            🧠 Train Mode →
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* BACK */}
                                            <div
                                                className={`absolute inset-0 bg-game-surface2 rounded-[4px] border border-game-border overflow-y-auto ${isTrainingMobile ? "pointer-events-auto" : "pointer-events-none"}`}
                                                style={{
                                                    backfaceVisibility:
                                                        "hidden",
                                                    transform:
                                                        "rotateY(180deg)",
                                                }}
                                            >
                                                <TrainingPanel
                                                    onBack={() =>
                                                        setIsTrainingMobile(
                                                            false,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile: Jump In bar */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 overflow-hidden px-5 py-3 flex items-center justify-between bg-game-bg/95 backdrop-blur-sm border-t border-game-border">
                                <button
                                    onClick={() =>
                                        setShowRoomList(!showRoomList)
                                    }
                                    className="text-xs text-game-muted opacity-60 hover:opacity-100 transition-opacity font-heading tracking-wider flex items-center gap-1"
                                >
                                    ⊞{" "}
                                    {selectedRoom
                                        ? `${selectedRoom.name}`
                                        : "Random or choose room"}
                                </button>
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

                            {/* Mobile: Room list drawer */}
                            {showRoomList && (
                                <div className="md:hidden absolute inset-x-0 bottom-[52px] bg-game-bg border border-game-border border-b-0 rounded-t-[6px] shadow-[0_-8px_32px_rgba(0,0,0,0.6),0_-1px_0_rgba(56,189,248,0.15)] max-h-[55vh] p-4 z-30 flex flex-col gap-2 overflow-y-auto">
                                    <p className="text-[0.6rem] font-heading tracking-[0.18em] uppercase text-game-muted/40 px-1 shrink-0">
                                        Choose a Room
                                    </p>
                                    {publicRooms.length === 0 ? (
                                        <p className="text-game-muted/40 text-xs text-center py-2 font-heading tracking-widest">
                                            NO ACTIVE ROOMS
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {publicRooms.map((room) => (
                                                <RoomCard
                                                    key={room.id}
                                                    room={room}
                                                    isSelected={
                                                        selectedRoomId ===
                                                        room.id
                                                    }
                                                    onClick={() => {
                                                        setSelectedRoomId(
                                                            selectedRoomId ===
                                                                room.id
                                                                ? null
                                                                : room.id,
                                                        );
                                                        setShowRoomList(false);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowRoomList(false);
                                            setShowCreate(true);
                                        }}
                                        className="btn-moco btn-moco-ghost w-full mt-1"
                                    >
                                        <span>+ Create Room</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT — Rooms / Training desktop ── */}
                        <div
                            className="hidden md:block flex-1 min-w-0 h-full min-h-0"
                            style={{ perspective: "1000px" }}
                        >
                            <div
                                className="relative h-full w-full transition-all duration-500"
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: isTraining
                                        ? "rotateY(180deg)"
                                        : "rotateY(0deg)",
                                }}
                            >
                                {/* FRONT — Room list */}
                                <div
                                    className={`absolute inset-0 flex flex-col ${isTraining ? "pointer-events-none" : "pointer-events-auto"}`}
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <div className="card-moco card-moco-amber corner-accent-moco corner-accent-moco-amber relative flex flex-col h-full">
                                        <div className="top-bar-moco top-bar-moco-amber shrink-0">
                                            <span>Matchmaker Terminal</span>
                                            <button
                                                onClick={() =>
                                                    setIsTraining(true)
                                                }
                                                className="text-amber-950 text-[0.6rem] font-heading tracking-widest opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                TRAIN →
                                            </button>
                                        </div>

                                        {/* Room list */}
                                        <div className="flex-1 min-h-0 flex flex-col gap-2 p-4 overflow-y-auto">
                                            {publicRooms.length === 0 ? (
                                                <p className="text-game-muted/40 text-xs text-center py-6 font-heading tracking-widest">
                                                    NO ACTIVE ROOMS
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {publicRooms.map((room) => (
                                                        <RoomCard
                                                            key={room.id}
                                                            room={room}
                                                            isSelected={
                                                                selectedRoomId ===
                                                                room.id
                                                            }
                                                            onClick={() =>
                                                                setSelectedRoomId(
                                                                    selectedRoomId ===
                                                                        room.id
                                                                        ? null
                                                                        : room.id,
                                                                )
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Create room button */}
                                        <div className="px-4 py-3 border-t border-game-border/40 shrink-0">
                                            <button
                                                onClick={() =>
                                                    setShowCreate(true)
                                                }
                                                className="btn-moco btn-moco-ghost w-full"
                                            >
                                                <span>+ Create Room</span>
                                            </button>
                                        </div>

                                        {/* Jump In bar */}
                                        <div className="relative overflow-hidden px-4 py-3 flex items-center justify-between bg-black/60 border-t border-game-border shrink-0">
                                            <p className="text-xs text-game-muted opacity-60">
                                                {selectedRoom
                                                    ? `${selectedRoom.name} · ${selectedRoom.players.length}/${selectedRoom.maxPlayers} players`
                                                    : "Random matchmaking or choose a room"}
                                            </p>
                                            <button
                                                onClick={handleJumpIn}
                                                disabled={
                                                    !connected || !name.trim()
                                                }
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

                                {/* BACK — Training desktop */}
                                <div
                                    className={`absolute inset-0 flex flex-col ${isTraining ? "pointer-events-auto" : "pointer-events-none"}`}
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateY(180deg)",
                                    }}
                                >
                                    <div className="card-moco card-moco-cyan corner-accent-moco corner-accent-moco-cyan relative flex flex-col h-full">
                                        <div className="top-bar-moco top-bar-moco-cyan shrink-0">
                                            <span>Train Your Brain</span>
                                            <button
                                                onClick={() =>
                                                    setIsTraining(false)
                                                }
                                                className="text-[#001c2d] text-[0.6rem] font-heading tracking-widest opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                ← ROOMS
                                            </button>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <TrainingPanel />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CREATE ROOM MODAL ── */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card-moco card-moco-amber corner-accent-moco corner-accent-moco-amber relative w-full max-w-sm">
                        <div className="top-bar-moco top-bar-moco-amber">
                            <span>Create Room</span>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="text-amber-950 hover:opacity-60 transition-opacity text-xl leading-none font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div>
                                <p className="field-label mb-1.5">Room Name</p>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) =>
                                        setNewRoomName(e.target.value)
                                    }
                                    placeholder="Enter room name..."
                                    maxLength={30}
                                    className="w-full bg-black/60 border border-game-border rounded-[3px] px-3 py-2 text-game-text text-sm outline-none focus:border-game-amber/60 transition-colors placeholder:text-game-muted/30"
                                />
                            </div>
                            <div>
                                <p className="field-label mb-1.5">Mode</p>
                                <div className="flex gap-2">
                                    {MODES.map((m) => (
                                        <button
                                            key={m.value}
                                            onClick={() =>
                                                !m.disabled &&
                                                setNewRoomMode(m.value)
                                            }
                                            disabled={m.disabled}
                                            className={`
                                                flex-1 py-1.5 rounded-[3px] text-[0.72rem]
                                                font-heading tracking-[0.08em] uppercase
                                                border transition-all
                                                ${
                                                    m.disabled
                                                        ? "border-game-border/30 text-game-muted/30 cursor-not-allowed opacity-40"
                                                        : newRoomMode ===
                                                            m.value
                                                          ? "bg-game-cyan/10 border-game-cyan/55 text-game-cyan shadow-[0_0_10px_rgba(56,189,248,0.12)]"
                                                          : "bg-black/50 border-game-border text-game-muted hover:border-game-border/60 hover:text-game-text"
                                                }
                                            `}
                                        >
                                            {m.label}
                                            {m.disabled ? " 🔒" : ""}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-game-muted">
                                    <input
                                        type="checkbox"
                                        checked={newRoomPrivate}
                                        onChange={(e) =>
                                            setNewRoomPrivate(e.target.checked)
                                        }
                                        className="accent-game-amber"
                                    />
                                    Private Room 🔒
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-game-muted">
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
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="btn-moco btn-moco-ghost flex-1"
                                >
                                    <span>Cancel</span>
                                </button>
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={!newRoomName.trim()}
                                    className="btn-moco btn-moco-amber flex-1 disabled:opacity-35 disabled:cursor-not-allowed"
                                >
                                    <span>Create</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PVP decline toast */}
            {pvpMsg && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[3px] border border-game-coral/40 bg-game-bg/95 backdrop-blur-game shadow-2xl text-game-coral text-sm font-heading tracking-wider text-center whitespace-nowrap">
                    ✗ {pvpMsg}
                </div>
            )}

            <Footer className="hidden md:block" />
        </div>
    );
}
