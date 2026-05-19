import { io } from "socket.io-client";

// export const socket = io("http://192.168.100.4:3001", {
//     autoConnect: true,
// });

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export const socket = io(SERVER_URL, {
    autoConnect: true,
});