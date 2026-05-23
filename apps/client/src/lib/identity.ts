const STORAGE_KEY = "wmc24_identity";

export interface StoredIdentity {
    name: string;
    avatar: string;
    roomId: string | null;
    socketId?: string | null;
} 

export function saveIdentity(
    name: string,
    avatar: string,
    roomId: string | null,
    socketId?: string | null
) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, avatar, roomId, socketId }));
}

export function loadIdentity(): StoredIdentity | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearRoomId() {
    const identity = loadIdentity();
    if (!identity) return;
    saveIdentity(identity.name, identity.avatar, null);
}
