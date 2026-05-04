import { useRoomContext } from "./context/useRoomContext";
import { Landing } from "./pages/Landing/Landing";
import { WaitingRoom } from "./pages/WaitingRoom/WaitingRoom";

function App() {
    const { currentRoom } = useRoomContext();

    if (currentRoom?.status === "playing") {
        return (
            <div className="min-h-screen bg-blue-600 flex items-center justify-center text-white text-2xl">
                Game Screen — Coming Soon
            </div>
        );
    }

    if (currentRoom?.status === "waiting") {
        return <WaitingRoom />;
    }

    return <Landing />;
}

export default App;
