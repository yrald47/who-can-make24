import { createContext } from "react";
import type { RoomContextType } from "./RoomContext";

export const RoomContext = createContext<RoomContextType | null>(null);
