import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import type { Room } from "@who-can-make24/shared";
import { socket } from "../lib/socket";
import { RoomContext } from "./roomContextInstance";
import { loadIdentity, clearRoomId, saveIdentity } from "../lib/identity";

export interface RoomContextType {
    currentRoom: Room | null;
    rooms: Room[];
    error: string | null;
    savedIdentity: { name: string; avatar: string } | null;
    createRoom: (
        roomName: string,
        mode: Room["mode"],
        isPrivate: boolean,
        name: string,
        avatar: string,
    ) => void;
    joinRoom: (
        roomId: string,
        name: string,
        avatar: string,
        code?: string,
    ) => void;
    leaveRoom: () => void;
}

// const STORAGE_KEY = "wmc24_identity";

// interface StoredIdentity {
//     name: string;
//     avatar: string;
//     roomId: string | null;
// }

// function saveIdentity(name: string, avatar: string, roomId: string | null) {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, avatar, roomId }));
// }

// function loadIdentity(): StoredIdentity | null {
//     try {
//         const raw = localStorage.getItem(STORAGE_KEY);
//         if (!raw) return null;
//         return JSON.parse(raw);
//     } catch {
//         return null;
//     }
// }

// function clearRoomId() {
//     const identity = loadIdentity();
//     if (!identity) return;
//     saveIdentity(identity.name, identity.avatar, null);
// }
// export const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
    console.log("RoomProvider mounted, socket id:", socket.id);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedIdentity] = useState(() => loadIdentity());
    const currentRoomRef = useRef<Room | null>(null);

    useEffect(() => {
        currentRoomRef.current = currentRoom;
    }, [currentRoom]);


    useEffect(() => {
        const onLobbyReturned = ({ room }: { room: Room }) => {
            setCurrentRoom(room);
        };

        const onRoomRemoved = ({ roomId }: { roomId: string }) => {
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
        };

        // const onConnect = () => socket.emit("room:list");
        const onConnect = () => {
            socket.emit("room:list");

            if (currentRoomRef.current) return;

            // Coba reconnect kalau ada roomId tersimpan
            const identity = loadIdentity();
            if (identity?.roomId && identity.name && identity.avatar) {
                socket.emit("room:reconnect", {
                    roomId: identity.roomId,
                    name: identity.name,
                    avatar: identity.avatar,
                    oldSocketId: identity.socketId,
                });
            }
        };
        const onReconnectFailed = () => {
            clearRoomId();
        };

        const onRoomList = ({ rooms }: { rooms: Room[] }) => setRooms(rooms);
        const onRoomCreated = ({ room }: { room: Room }) => {
            setCurrentRoom(room);
            // Simpan identity — name dan avatar dari room.players
            const me = room.players.find((p) => p.id === socket.id);
            if (me) saveIdentity(me.name, me.avatar, room.id);
        };
        // const onRoomJoined = ({ room }: { room: Room }) => setCurrentRoom(room);
        const onRoomJoined = ({ room }: { room: Room }) => {
            setCurrentRoom(room);
            const me = room.players.find((p) => p.id === socket.id);
            if (me) saveIdentity(me.name, me.avatar, room.id);
        };
        const onRoomUpdated = ({ room }: { room: Room }) => {
            setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
            setCurrentRoom((prev) => {
                if (!prev || prev.id !== room.id) return prev;
                const stillInRoom = room.players.some(
                    (p) => p.id === socket.id,
                );
                return stillInRoom ? room : null;
            });
        };
        const onRoomError = ({ message }: { message: string }) =>
            setError(message);
        const onGameStarted = ({ room }: { room: Room }) => {
            console.log("game:started received", room);
            setCurrentRoom(room);
        };

        const onRoomListUpdate = ({ room }: { room: Room }) => {
            console.log(
                "room:list-update received",
                room.id,
                room.players.length,
            );

            setRooms((prev) => {
                const exists = prev.find((r) => r.id === room.id);
                if (exists)
                    return prev.map((r) => (r.id === room.id ? room : r));
                if (!room.isPrivate) return [...prev, room];
                return prev;
            });
        };

        socket.on("connect", onConnect);
        socket.on("room:list", onRoomList);
        socket.on("room:created", onRoomCreated);
        socket.on("room:joined", onRoomJoined);
        socket.on("room:updated", onRoomUpdated);
        socket.on("room:error", onRoomError);
        socket.on("game:started", onGameStarted);
        socket.on("game:lobby-returned", onLobbyReturned);
        socket.on("room:removed", onRoomRemoved);
        socket.on("room:list-update", onRoomListUpdate);
        socket.on("room:reconnect-failed", onReconnectFailed);

        // socket.on("connect", () => socket.emit("room:list"));
        // socket.on("room:list", ({ rooms }) => setRooms(rooms));
        // socket.on("room:created", ({ room }) => setCurrentRoom(room));
        // socket.on("room:joined", ({ room }) => setCurrentRoom(room));
        // socket.on("room:updated", ({ room }) => {
        //     setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
        //     setCurrentRoom((prev) => (prev?.id === room.id ? room : prev));
        // });
        // socket.on("room:error", ({ message }) => setError(message));
        // socket.on("game:started", ({ room }) => setCurrentRoom(room));
        // socket.on('game:started', ({ room }) => {
        //     console.log('game:started received', room)
        //     setCurrentRoom(room)
        // })
        // socket.on("game:lobby-returned", onLobbyReturned);

        // socket.on("room:removed", onRoomRemoved);

        // if (socket.connected) socket.emit("room:list");
        if (socket.connected) {
            socket.emit("room:list");
            // Coba reconnect kalau ada roomId tersimpan
            if (!currentRoomRef.current) {
                const identity = loadIdentity();
                if (identity?.roomId && identity.name && identity.avatar) {
                    socket.emit("room:reconnect", {
                        roomId: identity.roomId,
                        name: identity.name,
                        avatar: identity.avatar,
                        oldSocketId: identity.socketId,
                    });
                }
            }
        }

        socket.onAny((event, ...args) => {
            console.log("socket event received:", event, args);
        });

        return () => {
            socket.off("connect", onConnect);
            socket.off("room:list", onRoomList);
            socket.off("room:created", onRoomCreated);
            socket.off("room:joined", onRoomJoined);
            socket.off("room:updated", onRoomUpdated);
            socket.off("room:error", onRoomError);
            socket.off("game:started", onGameStarted);
            socket.off("game:lobby-returned", onLobbyReturned);
            socket.off("room:removed", onRoomRemoved);
            socket.off("room:list-update", onRoomListUpdate);
            socket.off("room:reconnect-failed", onReconnectFailed);

            socket.offAny();
        };
    }, []);

    function createRoom(
        roomName: string,
        mode: Room["mode"],
        isPrivate: boolean,
        name: string,
        avatar: string,
    ) {
        setError(null);
        socket.emit("room:create", { roomName, mode, isPrivate, name, avatar });
    }

    function joinRoom(
        roomId: string,
        name: string,
        avatar: string,
        code?: string,
    ) {
        setError(null);
        socket.emit("room:join", { roomId, name, avatar, code });
    }

    function leaveRoom() {
        socket.emit("room:leave");
        setCurrentRoom(null);
        clearRoomId();
        setTimeout(() => {
            socket.emit("room:list");
        }, 100);
    }

    return (
        <RoomContext.Provider
            value={{
                currentRoom,
                rooms,
                error,
                createRoom,
                joinRoom,
                leaveRoom,
                savedIdentity,
            }}
        >
            {children}
        </RoomContext.Provider>
    );
}
