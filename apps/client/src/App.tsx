import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
    const [connected, setConnected] = useState(false);
    const [socketId, setSocketId] = useState("");

    useEffect(() => {
        socket.on("connect", () => {
            setConnected(true);
            setSocketId(socket.id ?? "");
            console.log("Connected to server:", socket.id);
        });

        socket.on("disconnect", () => {
            setConnected(false);
            setSocketId("");
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
        };
    }, []);

    return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
            <h1>Who Can Make24?</h1>
            <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>
            {connected && <p>Socket ID: {socketId}</p>}
        </div>
    );
}

export default App;
