import type { Player } from "@who-can-make24/shared";
import { PlayerSlot } from "./PlayerSlot";

interface PlayerArenaProps {
    players: Player[];
    myId: string;
    bellPressers: string[];
    candidates: string[];
    pointedPlayers: string[];
    maxPlayers?: number;
    children: React.ReactNode; // playboard di tengah
    scores?: Record<string, number>;
}

export function PlayerArena({
    players,
    myId,
    bellPressers,
    candidates,
    pointedPlayers,
    maxPlayers = 16,
    children,
    scores,
}: PlayerArenaProps) {
    // Buat array 16 slot, isi dengan player atau undefined
    const slots: (Player | undefined)[] = Array(maxPlayers).fill(undefined);
    players.forEach((p, i) => {
        slots[i] = p;
    });

    // Distribusi slot: 6 atas, 5 kiri, 5 kanan
    const topSlots = slots.slice(0, 6);
    const leftSlots = slots.slice(6, 11);
    const rightSlots = slots.slice(11, 16);

    function slotProps(player: Player | undefined) {
        if (!player) return {};
        return {
            isMe: player.id === myId,
            isBellPressed: bellPressers.includes(player.id),
            isCandidate: candidates.includes(player.id),
            isPointed: pointedPlayers.includes(player.id),
            scoreOverride: scores?.[player.id],
        };
    }

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Top row — 6 players */}
            <div className="flex justify-center gap-2">
                {topSlots.map((p, i) => (
                    <PlayerSlot
                        key={p?.id ?? `top-${i}`}
                        player={p}
                        {...slotProps(p)}
                    />
                ))}
            </div>

            {/* Middle row — left players + playboard + right players */}
            <div className="flex flex-1 gap-2 items-stretch">
                {/* Left column — 5 players */}
                <div className="flex flex-col justify-around gap-1">
                    {leftSlots.map((p, i) => (
                        <PlayerSlot
                            key={p?.id ?? `left-${i}`}
                            player={p}
                            size="sm"
                            {...slotProps(p)}
                        />
                    ))}
                </div>

                {/* Playboard — center */}
                <div className="flex-1 min-w-0">{children}</div>

                {/* Right column — 5 players */}
                <div className="flex flex-col justify-around gap-1">
                    {rightSlots.map((p, i) => (
                        <PlayerSlot
                            key={p?.id ?? `right-${i}`}
                            player={p}
                            size="sm"
                            {...slotProps(p)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
