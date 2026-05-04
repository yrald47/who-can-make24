# Who Can Make24 - Architecture & Flow Analysis

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Vite + React)                 │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │ main.tsx     │────▶│ App.tsx      │                  │
│  │ Entry Point  │     │   (Routes)   │                  │
│  └──────────────┘     └──────────────┘                  │
│        │                      │                          │
│        │ socket.onAny()       │ renders                  │
│        │ (logs all events)    │                          │
│        ▼                      ▼                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         RoomContext (Provider)                   │   │
│  │ - Manages: rooms[], currentRoom, error           │   │
│  │ - Listeners: room:list, room:joined,             │   │
│  │             room:created, room:updated,          │   │
│  │             game:started ⭐                      │   │
│  └─────────────────────────────────────────────────┘   │
│        │                      │                          │
│        │                      ▼                          │
│        │              ┌──────────────────┐              │
│        │              │ Landing.tsx      │              │
│        │              │ (rooms list)     │              │
│        │              │                  │              │
│        │              └──────────────────┘              │
│        │                      │                          │
│        │                      │ if currentRoom set      │
│        │                      ▼                          │
│        │              ┌──────────────────┐              │
│        │              │ WaitingRoom.tsx  │              │
│        │              │ (game hasn't     │              │
│        │              │  started yet)    │              │
│        │              └──────────────────┘              │
│        │                                                  │
│        └──▶ socket.emit() ──────────────────────────┐   │
│                                                     │   │
└─────────────────────────────────────────────────────┼───┘
                                                      │
                                  ┌───────────────────┘
                                  │
                    ┌─────────────────────────────┐
                    │  SERVER (Node + Socket.io)  │
                    │  ┌──────────────────────┐   │
                    │  │ roomHandlers.ts      │   │
                    │  │                      │   │
                    │  │ Listeners:           │   │
                    │  │ - room:create        │   │
                    │  │ - room:join          │   │
                    │  │ - game:start ⭐      │   │
                    │  │ - room:leave         │   │
                    │  │ - disconnect         │   │
                    │  └──────────────────────┘   │
                    │           │                 │
                    │           ▼                 │
                    │  ┌──────────────────────┐   │
                    │  │ roomManager.ts       │   │
                    │  │ (in-memory state)    │   │
                    │  │ - rooms Map          │   │
                    │  │ - playerRoomMap      │   │
                    │  └──────────────────────┘   │
                    │                             │
                    └─────────────────────────────┘
```

## DATA FLOW: "Mulai Game!" Click

### Step 1️⃣ User clicks "Mulai Game!" button
**File:** [apps/client/src/pages/WaitingRoom/WaitingRoom.tsx](apps/client/src/pages/WaitingRoom/WaitingRoom.tsx#L24)
```
handleStart() → socket.emit("game:start")
```
✅ **Works** - Event sent to server

---

### Step 2️⃣ Server receives game:start
**File:** [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts#L59)
```javascript
socket.on("game:start", () => {
    console.log(`game:start received from ${socket.id}`);
    const room = getRoomByPlayerId(socket.id);
    
    // Validation checks...
    if (!player?.isHost) { /* error */ }
    if (room.players.length < MIN_PLAYERS) { /* error */ }
    
    room.status = "playing"; // ⭐ State changed
    console.log("rooms in socket:", [...socket.rooms]);
    io.to(room.id).emit("game:started", { room });
    console.log("game:started emitted to room", room.id);
});
```
✅ **Works** - Terminal shows:
```
game:start received from VQXge5HWSnBTLY4cAAAf
room found: WS714B 3
rooms in socket: [ "VQXge5HWSnBTLY4cAAAf", "WS714B" ]
game:started emitted to room WS714B
```

---

### Step 3️⃣ Client receives game:started
**File:** [apps/client/src/context/RoomContext.tsx](apps/client/src/context/RoomContext.tsx#L48)
```javascript
socket.on('game:started', ({ room }) => {
    console.log('game:started received', room)
    setCurrentRoom(room)
})
```
✅ **Works** - Console shows: `game:started received`

---

## 🚨 **THE PROBLEM: Missing Game View**

### Issue: Nothing displays in browser
- RoomContext updates `currentRoom` with `status: "playing"`
- **BUT** `currentRoom` is still NOT null
- App still renders `<WaitingRoom />`
- No UI component exists to display the actual game

### The Logic Flow:
```
Landing.tsx (line 56-58):
if (currentRoom) {
    return <WaitingRoom />;  // ⬅️ Still shows this!
}
```

**The problem:** 
- `currentRoom.status` changes to `"playing"`
- But the component doesn't check the status
- `WaitingRoom` always renders whenever `currentRoom` is not null
- **No `GameBoard` or `GamePlay` component exists to show when status is "playing"**

---

## Component Checklist

| Component | Status | Notes |
|-----------|--------|-------|
| `Landing.tsx` | ✅ Works | Shows room list, join/create |
| `WaitingRoom.tsx` | ⚠️ Incomplete | Shows players but no "what next?" |
| `socket.onAny()` in main.tsx | ✅ Works | Logging all events to console |
| `RoomContext` listeners | ✅ Works | Receives all socket events |
| **GameBoard/GamePlay** | ❌ **MISSING** | No component to show actual game |

---

## Socket Events Verified

### Working Events:
- ✅ `room:list` - Get available rooms
- ✅ `room:create` - Create new room
- ✅ `room:join` - Join existing room
- ✅ `room:updated` - Room players changed
- ✅ `game:start` - Start game (emitted from WaitingRoom)
- ✅ `game:started` - Game started (received from server)

---

## Solution Required

Need to:

1. **Create `GameBoard.tsx` component** - Shows actual game/math puzzle
2. **Update routing logic** - Check `currentRoom.status`
   ```javascript
   if (currentRoom?.status === "playing") {
       return <GameBoard />;
   }
   if (currentRoom?.status === "waiting") {
       return <WaitingRoom />;
   }
   return <Landing />;
   ```
3. **Add console logging** to GameBoard to confirm component is rendered

---

## Files Summary

- **Main Entry:** [apps/client/src/main.tsx](apps/client/src/main.tsx)
- **App Router:** [apps/client/src/App.tsx](apps/client/src/App.tsx)
- **Landing/Router Logic:** [apps/client/src/pages/Landing/Landing.tsx](apps/client/src/pages/Landing/Landing.tsx)
- **Waiting Area:** [apps/client/src/pages/WaitingRoom/WaitingRoom.tsx](apps/client/src/pages/WaitingRoom/WaitingRoom.tsx)
- **State Management:** [apps/client/src/context/RoomContext.tsx](apps/client/src/context/RoomContext.tsx)
- **Server Events:** [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts)
- **Server State:** [apps/server/src/rooms/roomManager.ts](apps/server/src/rooms/roomManager.ts)
