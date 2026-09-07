import { lazy, Suspense } from "react";
import { useRoomContext } from "./context/useRoomContext";
import { useGameContext } from "./context/useGameContext";
import { Landing } from "./pages/Landing/Landing";
import { Toaster } from "sonner";

const WaitingRoom = lazy(() =>
    import("./pages/WaitingRoom/WaitingRoom").then((m) => ({
        default: m.WaitingRoom,
    })),
);
const Game = lazy(() =>
    import("./pages/Game/Game").then((m) => ({ default: m.Game })),
);
const GameOver = lazy(() =>
    import("./pages/Game/GameOver").then((m) => ({ default: m.GameOver })),
);

function App() {
    const { currentRoom } = useRoomContext();
    const { gameState, isGameOver, pvpCoward } = useGameContext();

    let content;
    if ((currentRoom?.status === "playing" && isGameOver) || pvpCoward) {
        content = <GameOver />;
    } else if (currentRoom?.status === "playing" && gameState) {
        content = <Game />;
    } else if (currentRoom?.status === "waiting") {
        content = <WaitingRoom />;
    } else {
        content = <Landing />;
    }

    return (
        <div className="relative min-h-screen">
            <Toaster
                position="top-center"
                theme="dark"
                richColors
                closeButton
            />
            <div className="bg-[url('/bg.svg')] fixed inset-0 bg-cover bg-center -z-10" />
            <div className="fixed inset-0 bg-(--color-accent-coral)/30 -z-10" />
            <Suspense fallback={null}>{content}</Suspense>
        </div>
    );
}

export default App;
