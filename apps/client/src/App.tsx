import { useRoomContext } from "./context/useRoomContext";
import { useGameContext } from "./context/useGameContext";
import { Landing } from "./pages/Landing/Landing";
import { WaitingRoom } from "./pages/WaitingRoom/WaitingRoom";
import { Game } from "./pages/Game/Game";
import { GameOver } from "./pages/Game/GameOver";

function App() {
    const { currentRoom } = useRoomContext();
    const {gameState, isGameOver} = useGameContext();

    if (currentRoom?.status === "playing" && isGameOver) {
        return <GameOver />;
    }
    
    if (currentRoom?.status === "playing" && gameState) {
        return (
            <Game />
        );
    }

    if (currentRoom?.status === "waiting") {
        return <WaitingRoom />;
    }

    return <Landing />;
}

export default App;
