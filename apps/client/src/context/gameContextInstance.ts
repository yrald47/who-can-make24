import { createContext } from "react";
import type { GameContextType } from "./GameContext";

export const GameContext = createContext<GameContextType | null>(null);
