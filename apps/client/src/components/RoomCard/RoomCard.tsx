import type { Room } from "@who-can-make24/shared";

interface RoomCardProps {
    room: Room;
    isSelected: boolean;
    onClick: () => void;
    onJoin?: () => void;
    disabled?: boolean;
}

const STATUS_LABEL: Record<Room["status"], string> = {
    waiting: "Open",
    playing: "In Game",
    finished: "Finished",
};

const STATUS_COLOR: Record<Room["status"], string> = {
    waiting: "text-game-green border-game-green/40 bg-game-green/10",
    playing: "text-game-amber border-game-amber/40 bg-game-amber/10",
    finished: "text-game-muted border-game-border bg-black/20",
};

const MODE_LABEL: Record<Room["mode"], string> = {
    casual: "Casual",
    pvp: "PvP",
    "battle-royale": "Battle Royale",
};

export function RoomCard({ room, isSelected, onClick }: RoomCardProps) {
    const isFull = room.players.length >= room.maxPlayers;

    return (
        <div
            onClick={!isFull ? onClick : undefined}
            className={`
                relative flex flex-col gap-2 p-3 rounded-[4px]
                border transition-all
                ${
                    isFull
                        ? "opacity-40 cursor-not-allowed border-game-border bg-black/20"
                        : isSelected
                          ? "border-game-amber bg-game-amber/10 shadow-[0_0_12px_rgba(251,191,36,0.15)] cursor-pointer"
                          : "border-game-border bg-game-surface hover:border-game-border2 hover:bg-game-surface2 cursor-pointer"
                }
            `}
        >
            {/* selected indicator */}
            {isSelected && (
                <div className="absolute top-0 left-0 w-[3px] h-full bg-game-amber rounded-l-[4px]" />
            )}

            {/* top row — name + status */}
            <div className="flex items-start justify-between gap-2">
                <span
                    className={`font-heading font-semibold text-[0.78rem] tracking-wide leading-tight truncate ${isSelected ? "text-game-amber" : "text-game-text"}`}
                >
                    {room.name}
                </span>
                <span
                    className={`text-[0.58rem] px-1.5 py-0.5 rounded-[3px] font-heading font-bold tracking-widest border shrink-0 uppercase ${STATUS_COLOR[room.status]}`}
                >
                    {STATUS_LABEL[room.status]}
                </span>
            </div>

            {/* bottom row — meta */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.68rem] text-game-muted font-mono">
                    {room.players.length}/{room.maxPlayers}
                </span>
                <span className="text-game-muted/30 text-[0.6rem]">·</span>
                <span className="text-[0.68rem] text-game-muted">
                    {MODE_LABEL[room.mode]}
                </span>
                {room.isWild && (
                    <>
                        <span className="text-game-muted/30 text-[0.6rem]">
                            ·
                        </span>
                        <span className="text-[0.65rem] text-game-amber/70">
                            🃏 Wild
                        </span>
                    </>
                )}
                {room.isPrivate && (
                    <>
                        <span className="text-game-muted/30 text-[0.6rem]">
                            ·
                        </span>
                        <span className="text-[0.65rem] text-game-muted/60">
                            🔒
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
