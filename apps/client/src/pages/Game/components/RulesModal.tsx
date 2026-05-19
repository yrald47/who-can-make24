// import { useState, useEffect } from "react";

interface RulesModalProps {
    onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
                    <h2 className="font-bold text-lg text-gray-900">
                        How to Play
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 flex flex-col gap-4 text-sm text-gray-700">
                    {/* Goal */}
                    <div>
                        <p className="font-semibold text-blue-600 uppercase tracking-wider text-xs mb-1">
                            Goal
                        </p>
                        <p>
                            Use all 4 cards with any arithmetic operation (
                            <span className="font-mono">+ − × ÷</span>) to make{" "}
                            <span className="font-bold text-blue-600">24</span>.
                        </p>
                    </div>

                    {/* Phases */}
                    <div>
                        <p className="font-semibold text-blue-600 uppercase tracking-wider text-xs mb-2">
                            Round Phases
                        </p>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-3">
                                <span className="text-lg">🔔</span>
                                <div>
                                    <p className="font-medium">Playing Phase</p>
                                    <p className="text-gray-500 text-xs">
                                        4 cards are shown. Press the bell if you
                                        know the answer. The last player who
                                        hasn't pressed becomes the loser
                                        candidate. If nobody presses, the
                                        combination is skipped.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-lg">👆</span>
                                <div>
                                    <p className="font-medium">
                                        Pointing Phase
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        Loser candidates must point to a
                                        bell-presser to prove the answer. If
                                        time runs out, the system picks
                                        randomly.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-lg">🧮</span>
                                <div>
                                    <p className="font-medium">Proof Phase</p>
                                    <p className="text-gray-500 text-xs">
                                        Pointed players must prove the answer by
                                        tapping cards step by step.
                                        Auto-submitted when one card remains.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scoring */}
                    <div>
                        <p className="font-semibold text-blue-600 uppercase tracking-wider text-xs mb-2">
                            Scoring
                        </p>
                        <div className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span>Press the bell</span>
                                <span className="text-green-600 font-medium">
                                    +1
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span>Loser candidate</span>
                                <span className="text-red-500 font-medium">
                                    −1
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span>Pointed & answer correct</span>
                                <span className="text-green-600 font-medium">
                                    +3
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span>Pointed & answer wrong</span>
                                <span className="text-red-500 font-medium">
                                    −4
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span>Pointed someone correct</span>
                                <span className="text-red-500 font-medium">
                                    −2
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span>Pointed someone wrong</span>
                                <span className="text-green-600 font-medium">
                                    +2
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Surrender */}
                    <div>
                        <p className="font-semibold text-blue-600 uppercase tracking-wider text-xs mb-1">
                            Surrender
                        </p>
                        <p className="text-gray-500 text-xs">
                            After 30 seconds, a surrender button appears. If
                            majority surrender and nobody pressed the bell, the
                            combination is skipped with no score change.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-500 text-white font-medium py-2 rounded-xl hover:bg-blue-600 transition-colors"
                    >
                        Got it, let's play!
                    </button>
                </div>
            </div>
        </div>
    );
}
