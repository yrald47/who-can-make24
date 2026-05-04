import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { RoomProvider } from "./context/RoomContext.tsx";
import { socket } from "./lib/socket";

socket.onAny((event, ...args) => {
    console.log("[socket global]", event, args);
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RoomProvider>
            <App />
        </RoomProvider>
    </StrictMode>,
);
