interface RulesModalProps {
    onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-moco card-moco-cyan corner-accent-moco corner-accent-moco-cyan w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="top-bar-moco top-bar-moco-cyan shrink-0">
                    <span>How to Play</span>
                    <button
                        onClick={onClose}
                        className="text-[#001c2d] hover:opacity-60 transition-opacity text-lg font-bold leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
                    {/* Goal */}
                    <div>
                        <p className="section-label mb-1.5">Goal</p>
                        <p className="text-game-muted text-sm leading-relaxed">
                            Use all 4 cards with any arithmetic operation (
                            <span className="font-mono text-game-cyan">
                                + − × ÷
                            </span>
                            ) to make{" "}
                            <span className="font-bold text-game-cyan">24</span>
                            .
                        </p>
                    </div>

                    {/* Phases */}
                    <div>
                        <p className="section-label mb-2">Round Phases</p>
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    icon: "🔔",
                                    title: "Playing Phase",
                                    desc: "4 cards are shown. Press the bell if you know the answer. The last player who hasn't pressed becomes the loser candidate. If nobody presses, the combination is skipped.",
                                },
                                {
                                    icon: "👆",
                                    title: "Pointing Phase",
                                    desc: "Loser candidates must point to a bell-presser to prove the answer. If time runs out, the system picks randomly.",
                                },
                                {
                                    icon: "🧮",
                                    title: "Proof Phase",
                                    desc: "Pointed players must prove the answer by tapping cards step by step. Auto-submitted when one card remains.",
                                },
                            ].map(({ icon, title, desc }) => (
                                <div
                                    key={title}
                                    className="flex gap-3 p-3 bg-game-surface2 border border-game-border rounded-[4px]"
                                >
                                    <span className="text-xl shrink-0">
                                        {icon}
                                    </span>
                                    <div>
                                        <p className="text-game-text text-sm font-semibold mb-0.5">
                                            {title}
                                        </p>
                                        <p className="text-game-muted text-xs leading-relaxed">
                                            {desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scoring */}
                    <div>
                        <p className="section-label mb-2">Scoring</p>
                        <div className="border border-game-border rounded-[4px] overflow-hidden">
                            {[
                                {
                                    label: "Press the bell",
                                    score: "+1",
                                    pos: true,
                                },
                                {
                                    label: "Loser candidate",
                                    score: "−1",
                                    pos: false,
                                },
                                {
                                    label: "Pointed & answer correct",
                                    score: "+3",
                                    pos: true,
                                },
                                {
                                    label: "Pointed & answer wrong",
                                    score: "−4",
                                    pos: false,
                                },
                                {
                                    label: "Pointed someone correct",
                                    score: "−2",
                                    pos: false,
                                },
                                {
                                    label: "Pointed someone wrong",
                                    score: "+2",
                                    pos: true,
                                },
                            ].map(({ label, score, pos }, i, arr) => (
                                <div
                                    key={label}
                                    className={`flex justify-between items-center px-3 py-2 text-xs ${i < arr.length - 1 ? "border-b border-game-border" : ""}`}
                                >
                                    <span className="text-game-muted">
                                        {label}
                                    </span>
                                    <span
                                        className={`font-heading font-bold ${pos ? "text-game-green" : "text-game-coral"}`}
                                    >
                                        {score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Surrender */}
                    <div>
                        <p className="section-label mb-1.5">Surrender</p>
                        <p className="text-game-muted text-xs leading-relaxed">
                            After 30 seconds, a surrender button appears. If
                            majority surrender and nobody pressed the bell, the
                            combination is skipped with no score change.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-game-border shrink-0">
                    <button
                        onClick={onClose}
                        className="btn-moco btn-moco-cyan w-full"
                    >
                        <span>Got it, let's play!</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
