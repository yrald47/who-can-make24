import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { RoomProvider } from "./context/RoomContext.tsx";
import { GameProvider } from "./context/GameContext.tsx";
import { socket } from "./lib/socket";
import { ErrorBoundary } from "./components/ErrorBoundary";

socket.onAny((event, ...args) => {
    console.log("[socket global]", event, args);
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ErrorBoundary>
            <RoomProvider>
                <GameProvider>
                    <App />
                </GameProvider>
            </RoomProvider>
        </ErrorBoundary>
    </StrictMode>,
);
