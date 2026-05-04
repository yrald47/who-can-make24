import {
    useEffect,
    useState,
} from "react";
import type { ReactNode } from "react";
import type { Room } from "@who-can-make24/shared";
import { socket } from "../lib/socket";
import { RoomContext } from "./roomContextInstance";

export interface RoomContextType {
    currentRoom: Room | null;
    rooms: Room[];
    error: string | null;
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

// export const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
    console.log("RoomProvider mounted, socket id:", socket.id);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        socket.on("connect", () => socket.emit("room:list"));
        socket.on("room:list", ({ rooms }) => setRooms(rooms));
        socket.on("room:created", ({ room }) => setCurrentRoom(room));
        socket.on("room:joined", ({ room }) => setCurrentRoom(room));
        socket.on("room:updated", ({ room }) => {
            setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
            setCurrentRoom((prev) => (prev?.id === room.id ? room : prev));
        });
        socket.on("room:error", ({ message }) => setError(message));
        // socket.on("game:started", ({ room }) => setCurrentRoom(room));
        socket.on('game:started', ({ room }) => {
            console.log('game:started received', room)
            setCurrentRoom(room)
        })

        if (socket.connected) socket.emit("room:list");

        socket.onAny((event, ...args) => {
            console.log("socket event received:", event, args);
        });

        return () => {
            socket.off("connect");
            socket.off("room:list");
            socket.off("room:created");
            socket.off("room:joined");
            socket.off("room:updated");
            socket.off("room:error");
            socket.off("game:started");
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
            }}
        >
            {children}
        </RoomContext.Provider>
    );
}
