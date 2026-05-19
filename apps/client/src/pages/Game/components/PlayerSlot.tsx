import type { Player } from "@who-can-make24/shared";

interface PlayerSlotProps {
    player?: Player;
    isMe?: boolean;
    isBellPressed?: boolean;
    isCandidate?: boolean;
    isPointed?: boolean;
    size?: "sm" | "md";
    scoreOverride?: number;
}

const RANK_BADGE: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
};

export function PlayerSlot({
    player,
    isMe = false,
    isBellPressed = false,
    isCandidate = false,
    isPointed = false,
    size = "md",
    scoreOverride,
}: PlayerSlotProps) {
    const isSmall = size === "sm";

    // Empty slot
    if (!player) {
        return (
            <div
                className={`flex flex-col items-center gap-1 ${isSmall ? "w-12" : "w-16"}`}
            >
                <div
                    className={`
                        rounded-full border-2 border-dashed border-white/20 bg-white/5
                        ${isSmall ? "w-10 h-10" : "w-14 h-14"}
        `}
                />
                <div className="h-2 w-8 rounded bg-white/10" />
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col items-center gap-1 ${isSmall ? "w-12" : "w-16"}`}
        >
            {/* Avatar */}
            <div
                className={`
        relative rounded-full flex items-center justify-center text-2xl
        transition-all duration-200
        ${isSmall ? "w-10 h-10 text-lg" : "w-14 h-14 text-2xl"}
        ${isMe ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-blue-600" : ""}
        ${isBellPressed ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-blue-600" : ""}
        ${isCandidate ? "ring-2 ring-red-400 ring-offset-2 ring-offset-blue-600" : ""}
        ${isPointed ? "ring-2 ring-green-400 ring-offset-2 ring-offset-blue-600" : ""}
        bg-white/10
        `}
            >
                <span>{player.avatar}</span>

                {/* Host crown */}
                {player.isHost && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
                        👑
                    </span>
                )}

                {/* Rank badge */}
                {player.rank && (
                    <span className="absolute -bottom-1 -right-1 text-xs">
                        {RANK_BADGE[player.rank]}
                    </span>
                )}

                {/* Bell indicator */}
                {isBellPressed && (
                    <span className="absolute -top-1 -right-1 text-xs">🔔</span>
                )}

                {/* Candidate indicator */}
                {isCandidate && (
                    <span className="absolute -top-1 -right-1 text-xs">💀</span>
                )}
            </div>

            {/* Name */}
            <div className="text-center">
                <p
                    className={`text-white font-medium truncate ${isSmall ? "text-xs w-12" : "text-xs w-16"}`}
                >
                    {player.name}
                </p>
                <p
                    className={`text-blue-200 ${isSmall ? "text-xs" : "text-xs"}`}
                >
                    {scoreOverride ?? player.score ?? 0}pt
                </p>
            </div>
        </div>
    );
}
