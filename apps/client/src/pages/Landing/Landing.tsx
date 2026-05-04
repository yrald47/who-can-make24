import { useState } from "react";
import type { Room } from "@who-can-make24/shared";
import { useSocket } from "../../hooks/useSocket";
// import { useRooms } from "../../hooks/useRooms";
import { RoomCard } from "../../components/RoomCard/RoomCard";
// import { WaitingRoom } from "../WaitingRoom/WaitingRoom";
import { useRoomContext } from "../../context/useRoomContext";

const AVATARS = ["😀", "🤓", "😎", "🧐", "🥸", "🤩", "😏", "🤯"];
const MODES: { value: Room["mode"]; label: string }[] = [
    { value: "casual", label: "Casual" },
    { value: "pvp", label: "PvP" },
    { value: "battle-royale", label: "Battle Royale" },
];


export function Landing() {
    const { connected } = useSocket();
    const [showRoomSheet, setShowRoomSheet] = useState(false)
    const { rooms, error, createRoom, joinRoom } = useRoomContext();
    // const { rooms, currentRoom, error, createRoom, joinRoom } = useRoomContext();

    const [name, setName] = useState(
        "Player" + Math.floor(Math.random() * 9000 + 1000),
    );
    const [avatar, setAvatar] = useState("😀");
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    // Create room modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomMode, setNewRoomMode] = useState<Room["mode"]>("casual");
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);

    function handleJumpIn() {
        if (!name.trim()) return;

        if (selectedRoom) {
            joinRoom(selectedRoom.id, name, avatar);
        } else {
            // Random room — join room pertama yang available
            const available = rooms.find(
                (r) =>
                    r.status === "waiting" && r.players.length < r.maxPlayers,
            );
            if (available) joinRoom(available.id, name, avatar);
        }
    }

    function handleCreateRoom() {
        if (!newRoomName.trim() || !name.trim()) return;
        createRoom(newRoomName, newRoomMode, newRoomPrivate, name, avatar);
        setShowCreate(false);
        setNewRoomName("");
    }

    // Kalau sudah join room, tampilkan info room (waiting room nanti)
    // if (currentRoom) {
    //     console.log("Rendering WaitingRoom, currentRoom:", currentRoom);
    //     return <WaitingRoom />;
    // }

    return (
        <div className="min-h-screen bg-blue-600 flex flex-col">
            {/* Header */}
            <div className="bg-blue-700 px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-white font-bold text-xl">
                        Who Can Make24?
                    </h1>
                    <p className="text-blue-200 text-xs tracking-widest uppercase">
                        Math · Strategy · Fun
                    </p>
                </div>
                <div
                    className={`text-xs ${connected ? "text-green-300" : "text-red-300"}`}
                >
                    {connected ? "🟢 Connected" : "🔴 Disconnected"}
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-xl">
                    {/* Grid — dua kolom di desktop, satu kolom di mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
                        {/* LEFT — Identity */}
                        <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-widest mb-4">
                                Your Identity
                            </p>

                            <p className="text-xs text-gray-500 mb-2">
                                Pick an avatar
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {AVATARS.map((a) => (
                                    <button
                                        key={a}
                                        onClick={() => setAvatar(a)}
                                        className={`
                    w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all
                    ${avatar === a ? "ring-2 ring-blue-500 ring-offset-1" : "hover:bg-gray-100"}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>

                            <p className="text-xs text-gray-500 mb-1">
                                Your name
                            </p>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={20}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 mb-4"
                            />

                            <button className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                                <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    G
                                </span>
                                Sign in with Google
                            </button>

                            {error && (
                                <p className="text-red-500 text-xs mt-3">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* RIGHT — Rooms (hanya tampil di desktop) */}
                        <div className="hidden md:flex flex-col p-6">
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-widest mb-4">
                                Choose a Room
                            </p>

                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full border-2 border-dashed border-blue-200 rounded-lg py-2 text-sm text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                            >
                                + Create New Room
                            </button>

                            <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto max-h-80 content-start">
                                {rooms.length === 0 ? (
                                    <p className="col-span-2 text-center text-gray-400 text-sm mt-8">
                                        Tidak ada room tersedia
                                    </p>
                                ) : (
                                    rooms.map((room) => (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            isSelected={
                                                selectedRoom?.id === room.id
                                            }
                                            onClick={() =>
                                                setSelectedRoom((prev) =>
                                                    prev?.id === room.id
                                                        ? null
                                                        : room,
                                                )
                                            }
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Jump In bar — desktop */}
                    <div className="hidden md:flex border-t border-gray-100 px-6 py-4 items-center justify-between">
                        <p className="text-xs text-gray-400">
                            {selectedRoom
                                ? `${selectedRoom.name} · ${selectedRoom.players.length}/${selectedRoom.maxPlayers}`
                                : "Random or choose a room"}
                        </p>
                        <button
                            onClick={handleJumpIn}
                            disabled={!connected || !name.trim()}
                            className="bg-yellow-400 text-blue-900 font-semibold px-6 py-2 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Jump In! ↗
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile floating buttons */}
            <div className="md:hidden fixed bottom-6 right-6 flex flex-col items-end gap-2 z-40">
                {/* Choose Room button */}
                <button
                    onClick={() => setShowRoomSheet(true)}
                    className="flex items-center gap-2 bg-white text-blue-600 font-medium px-4 py-2 rounded-full shadow-lg text-sm border border-blue-100"
                >
                    {selectedRoom ? (
                        <>
                            <span>{selectedRoom.name}</span>
                            <span className="text-gray-400">
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

                {/* Jump In button */}
                <button
                    onClick={handleJumpIn}
                    disabled={!connected || !name.trim()}
                    className="bg-yellow-400 text-blue-900 font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                    Jump In! ↗
                </button>
            </div>

            {/* Mobile Bottom Sheet — Room List */}
            {showRoomSheet && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowRoomSheet(false)}
                    />

                    {/* Sheet */}
                    <div className="relative bg-white rounded-t-2xl p-5 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">
                                Choose a Room
                            </h3>
                            <button
                                onClick={() => setShowRoomSheet(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setShowRoomSheet(false);
                                setShowCreate(true);
                            }}
                            className="w-full border-2 border-dashed border-blue-200 rounded-lg py-2 text-sm text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                        >
                            + Create New Room
                        </button>

                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            {rooms.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm mt-8">
                                    Tidak ada room tersedia
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">
                            Create New Room
                        </h3>

                        <p className="text-xs text-gray-500 mb-1">Room name</p>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="My Awesome Room"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 mb-3"
                        />

                        <p className="text-xs text-gray-500 mb-1">Mode</p>
                        <div className="flex gap-2 mb-3">
                            {MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setNewRoomMode(m.value)}
                                    className={`
                                        flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                            newRoomMode === m.value
                                            ? "bg-blue-500 text-white border-blue-500" 
                                            : "border-gray-200 text-gray-600 hover:border-blue-300"
                                        }
                                        `}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newRoomPrivate}
                                onChange={(e) =>
                                    setNewRoomPrivate(e.target.checked)
                                }
                                className="rounded"
                            />
                            Private room (pakai kode)
                        </label>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                disabled={!newRoomName.trim()}
                                className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
