import { useState } from "react";
import { useGameContext } from "../../../context/useGameContext";
import { PlayingPhase } from "./phases/PlayingPhase";
import { PointingPhase } from "./phases/PointingPhase";
import { ProofPhase } from "./phases/ProofPhase";
import { ResultPhase } from "./phases/ResultPhase";
import { RulesModal } from "./RulesModal";

interface PlayboardProps {
    onShowRules: () => void;
}

export function Playboard({ onShowRules }: PlayboardProps) {
    const { gameState, phase } = useGameContext();
    const [showRules, setShowRules] = useState(false);

    if (!gameState || !phase) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-game-muted text-sm animate-pulse">
                    Memuat game...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full card-moco card-moco-cyan relative overflow-hidden">
            <button
                onClick={onShowRules}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-game-surface2 border border-game-border hover:border-game-cyan/50 text-game-muted hover:text-game-cyan text-sm font-bold flex items-center justify-center transition-all"
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
                    <p className="text-game-cyan font-heading font-bold text-xl tracking-widest">
                        Game Selesai!
                    </p>
                </div>
            )}
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        </div>
    );
}
