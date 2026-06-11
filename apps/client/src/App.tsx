import { useRoomContext } from "./context/useRoomContext";
import { useGameContext } from "./context/useGameContext";
import { Landing } from "./pages/Landing/Landing";
import { WaitingRoom } from "./pages/WaitingRoom/WaitingRoom";
import { Game } from "./pages/Game/Game";
import { GameOver } from "./pages/Game/GameOver";

function App() {
    const { currentRoom } = useRoomContext();
    const {gameState, isGameOver, pvpCoward} = useGameContext();

    // if (currentRoom?.status === "playing" && isGameOver) {
    //     return <GameOver />;
    // }
    
    // if (currentRoom?.status === "playing" && gameState) {
    //     return (
    //         <Game />
    //     );
    // }

    // if (currentRoom?.status === "waiting") {
    //     return <WaitingRoom />;
    // }

    // return <Landing />;

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
            {/* Background image */}
            <div className="bg-[url('/bg.svg')] fixed inset-0 bg-cover bg-center -z-10" />
            {/* <div className="fixed inset-0 bg-[url(/bg.svg)] bg-cover bg-center -z-10" /> */}
            {/* <div
                className="fixed inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('http://localhost:5173/bg.svg')",
                }}
            /> */}
            {/* Blue overlay */}
            <div className="fixed inset-0 bg-(--color-accent-coral)/30 -z-10" />
            {content}
        </div>
    );

    // return (
    //     <>
    //         {/* <div
    //             className="fixed inset-0 bg-cover bg-center -z-10"
    //             style={{ backgroundImage: "url('/bg.svg')" }}
    //         /> */}
    //         <img
    //             src="/bg.svg"
    //             className="fixed inset-0 -z-10 w-full h-full object-cover"
    //         />
    //         <div className="fixed inset-0 bg-red-600/80 -z-10" />
    //         <div className="relative min-h-screen">{content}</div>
    //     </>
    // );
}

export default App;
