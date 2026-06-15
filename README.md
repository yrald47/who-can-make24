# who-can-make24

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.13. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

```
who-can-make24
├─ .qodo
│  ├─ agents
│  └─ workflows
├─ ANALYSIS.md
├─ apps
│  ├─ client
│  │  ├─ bun.lock
│  │  ├─ eslint.config.js
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ public
│  │  │  ├─ android-chrome-192x192.png
│  │  │  ├─ android-chrome-512x512.png
│  │  │  ├─ apple-touch-icon.png
│  │  │  ├─ bg.png
│  │  │  ├─ bg.svg
│  │  │  ├─ facivon2.svg
│  │  │  ├─ favicon-16x16.png
│  │  │  ├─ favicon-32x32.png
│  │  │  ├─ favicon.ico
│  │  │  ├─ favicon.svg
│  │  │  ├─ icons.svg
│  │  │  └─ site.webmanifest
│  │  ├─ README.md
│  │  ├─ src
│  │  │  ├─ App.css
│  │  │  ├─ App.tsx
│  │  │  ├─ assets
│  │  │  │  ├─ hero.png
│  │  │  │  ├─ react.svg
│  │  │  │  └─ vite.svg
│  │  │  ├─ components
│  │  │  │  ├─ ErrorBoundary.tsx
│  │  │  │  ├─ Footer
│  │  │  │  │  └─ Footer.tsx
│  │  │  │  └─ RoomCard
│  │  │  │     └─ RoomCard.tsx
│  │  │  ├─ context
│  │  │  │  ├─ GameContext.tsx
│  │  │  │  ├─ gameContextInstance.ts
│  │  │  │  ├─ RoomContext.tsx
│  │  │  │  ├─ roomContextInstance.ts
│  │  │  │  ├─ useGameContext.ts
│  │  │  │  └─ useRoomContext.ts
│  │  │  ├─ hooks
│  │  │  │  ├─ useRooms.ts
│  │  │  │  └─ useSocket.ts
│  │  │  ├─ index.css
│  │  │  ├─ lib
│  │  │  │  ├─ identity.ts
│  │  │  │  ├─ socket.ts
│  │  │  │  └─ solver.ts
│  │  │  ├─ main.tsx
│  │  │  └─ pages
│  │  │     ├─ Game
│  │  │     │  ├─ components
│  │  │     │  │  ├─ ChatLog.tsx
│  │  │     │  │  ├─ phases
│  │  │     │  │  │  ├─ PlayingPhase.tsx
│  │  │     │  │  │  ├─ PointingPhase.tsx
│  │  │     │  │  │  ├─ ProofPhase.tsx
│  │  │     │  │  │  ├─ PvpPhase.tsx
│  │  │     │  │  │  └─ ResultPhase.tsx
│  │  │     │  │  ├─ Playboard.tsx
│  │  │     │  │  ├─ PlayerArena.tsx
│  │  │     │  │  ├─ PlayerSlot.tsx
│  │  │     │  │  └─ RulesModal.tsx
│  │  │     │  ├─ Game.tsx
│  │  │     │  └─ GameOver.tsx
│  │  │     ├─ Landing
│  │  │     │  ├─ Landing.tsx
│  │  │     │  └─ TrainingPanel.tsx
│  │  │     └─ WaitingRoom
│  │  │        └─ WaitingRoom.tsx
│  │  ├─ tsconfig.app.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  └─ vite.config.ts
│  └─ server
│     ├─ bun.lock
│     ├─ package.json
│     ├─ README.md
│     ├─ src
│     │  ├─ game
│     │  │  ├─ gameHandlers.ts
│     │  │  └─ gameManager.ts
│     │  ├─ index.ts
│     │  ├─ lib
│     │  │  ├─ rateLimiter.ts
│     │  │  └─ redis.ts
│     │  └─ rooms
│     │     ├─ roomHandlers.ts
│     │     ├─ roomManager.redis.ts
│     │     └─ roomManager.ts
│     └─ tsconfig.json
├─ bun.lock
├─ index.ts
├─ package.json
├─ packages
│  └─ shared
│     ├─ bun.lock
│     ├─ package.json
│     ├─ README.md
│     ├─ src
│     │  ├─ game.ts
│     │  └─ index.ts
│     └─ tsconfig.json
├─ plan.md
├─ README.md
└─ tsconfig.json

```