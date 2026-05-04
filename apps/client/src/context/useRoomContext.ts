import { useContext } from "react";
import { RoomContext } from "./roomContextInstance";

export function useRoomContext() {
    const ctx = useContext(RoomContext);
    if (!ctx)
        throw new Error("useRoomContext must be used inside RoomProvider");
    return ctx;
}
