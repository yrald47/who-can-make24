import { useState } from "react";
import { useGameContext } from "../../../context/useGameContext";
import { PlayingPhase } from "./phases/PlayingPhase";
import { PointingPhase } from "./phases/PointingPhase";
import { ProofPhase } from "./phases/ProofPhase";
import { ResultPhase } from "./phases/ResultPhase";
import { RulesModal } from "./RulesModal";

// const RULES_SEEN_KEY = "wmc24_rules_seen";

interface PlayboardProps {
    onShowRules: () => void;
}

export function Playboard({ onShowRules }: PlayboardProps) {
    const { gameState, phase } = useGameContext();
    const [showRules, setShowRules] = useState(false);

    // useEffect(() => {
    //     if (phase === "playing" && gameState?.round === 1) {
    //         const seen = localStorage.getItem(RULES_SEEN_KEY);
    //         if (!seen) {
    //             setShowRules(true);
    //             localStorage.setItem(RULES_SEEN_KEY, "1");
    //         }
    //     }
    // }, [phase, gameState?.round]);

    if (!gameState || !phase) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-white/50 text-sm animate-pulse">
                    Memuat game...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full bg-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            <button
                onClick={onShowRules}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-bold flex items-center justify-center transition-colors"
                title="How to play"
            >
                ?
            </button>
            {phase === "playing" && (
                <PlayingPhase
                    cards={gameState.currentCards}
                    deckRemaining={gameState.deck.length}
                    round={gameState.round}
                    totalRounds={gameState.totalRounds}
                />
            )}
            {phase === "pointing" && <PointingPhase />}
            {phase === "proof" && <ProofPhase />}
            {phase === "result" && <ResultPhase />}
            {phase === "finished" && (
                <div className="h-full flex items-center justify-center">
                    <p className="text-white font-bold text-xl">
                        Game Selesai!
                    </p>
                </div>
            )}
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        </div>
    );
}
