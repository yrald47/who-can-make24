import { useEffect, useState } from "react";
import type { Room } from "@who-can-make24/shared";
import { socket } from "../lib/socket";

export function useRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Minta list room saat pertama connect
        socket.on("connect", () => {
            socket.emit("room:list");
        });

        socket.on("room:list", ({ rooms }) => setRooms(rooms));
        socket.on("room:created", ({ room }) => setCurrentRoom(room));
        socket.on("room:joined", ({ room }) => setCurrentRoom(room));
        socket.on("room:updated", ({ room }) => {
            setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
            setCurrentRoom((prev) => (prev?.id === room.id ? room : prev));
        });
        socket.on("room:error", ({ message }) => setError(message));
        socket.on("game:started", ({ room }) => {
            setCurrentRoom(room);
            // nanti navigate ke game screen
            console.log("Game started!", room);
        });

        // Minta list room langsung kalau sudah connected
        if (socket.connected) socket.emit("room:list");

        return () => {
            socket.off("connect");
            socket.off("room:list");
            socket.off("room:created");
            socket.off("room:joined");
            socket.off("room:updated");
            socket.off("room:error");
            socket.off("game:started");

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

    return { rooms, currentRoom, error, createRoom, joinRoom, leaveRoom };
}
