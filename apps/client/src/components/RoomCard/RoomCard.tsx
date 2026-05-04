import type { Room } from "@who-can-make24/shared";

interface RoomCardProps {
    room: Room;
    isSelected: boolean;
    onClick: () => void;
}

const STATUS_LABEL: Record<Room["status"], string> = {
    waiting: "Open",
    playing: "In Game",
    finished: "Finished",
};

const STATUS_COLOR: Record<Room["status"], string> = {
    waiting: "bg-green-100 text-green-700",
    playing: "bg-yellow-100 text-yellow-700",
    finished: "bg-gray-100 text-gray-500",
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
        border rounded-xl p-4 transition-all cursor-pointer
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}
        ${isFull ? "opacity-50 cursor-not-allowed" : ""}
        `}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-gray-900 leading-height">
                    {room.name}
                </span>
                <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-1 ${STATUS_COLOR[room.status]}`}
                >
                    {STATUS_LABEL[room.status]}
                </span>
            </div>
            <div className="flex flex-col gap-1 text-xs text-gray-500">
                <span>
                    {room.players.length}/{room.maxPlayers} pemain
                </span>
                <span>{MODE_LABEL[room.mode]}</span>
                {room.isPrivate && <span>🔒 Private</span>}
            </div>
        </div>
    );
}
