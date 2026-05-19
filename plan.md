# Rencana Pengembangan Game "Who Can Make24"

## Analisis Rencana

Rencana Anda sangat solid untuk game kartu real-time seperti 24. Struktur state, event socket, dan komponen UI sudah terlihat komprehensif dan mengikuti pola yang baik untuk game multiplayer.

### 1. GameState Type

```typescript
type GameState = {
  phase: GamePhase        // 'playing' | 'pointing' | 'proof' | 'result'
  deck: Card[]            // sisa kartu di deck
  currentCards: Card[]    // 4 kartu aktif ronde ini
  round: number           // ronde ke berapa
  timer: number           // detik tersisa
  bellPressers: string[]  // socketId yang sudah pencet bel, urut by time
  candidates: string[]    // socketId kandidat kalah
  pointingTargets: Map<string, string>  // kandidat → target yang ditunjuk
}
```

**Kelebihan:**
- `phase` sebagai state utama sangat bagus untuk game flow yang kompleks.
- Semua aspek game tercakup (kartu, timer, interaksi pemain).
- Dengan TypeScript, ini akan mencegah banyak bug.

**Saran kecil:**
- Pertimbangkan menambahkan `startTime` untuk timer agar sinkronisasi lebih akurat.
- `Map<string, string>` bagus, tapi pastikan serializable untuk socket.

### 2. Socket Events

**Server → Client:**
- `game:round-start`
- `game:bell-pressed`
- `game:phase-changed`
- `game:timer`
- `game:pointing-done`
- `game:proof-submit`
- `game:round-result`
- `game:over`

**Client → Server:**
- `game:bell`
- `game:point`
- `game:prove`

**Analisis:**
- Arsitektur event-driven sudah tepat untuk real-time game.
- Pemisahan peran server/client sudah baik.
- Payload event tampak minimal dan fokus.
- Pastikan handle race condition bila banyak pemain pencet bel bersamaan.

### 3. Struktur Folder

```
pages/Game/
  Game.tsx
  components/
    PlayerSlot.tsx
    Playboard.tsx
    ChatLog.tsx
```

**Kelebihan:**
- `Game.tsx` sebagai orchestrator utama adalah pola yang tepat.
- Setiap komponen punya tanggung jawab jelas.
- Struktur ini mudah diperluas dan mudah dibaca.

**Saran:**
- Pertimbangkan menambahkan `hooks/` untuk custom hooks seperti `useGameState` dan `useTimer`.
- Tambahkan `utils/` untuk helper functions matematika 24.

### 4. State Management - Volatile vs Stable

**Rencana Anda:**
- `packages/shared/src/game.ts` untuk state volatile.
- `packages/shared/src/index.ts` untuk types/stabil.

**Analisis:**
- Shared package adalah pilihan bagus untuk konsistensi client-server.
- Pemisahan state dinamis dengan static types membantu arsitektur.
- Pastikan semua export diatur agar mudah diimport.

### 5. Timer Management

**Pendekatan:**
- Server sebagai sumber kebenaran (authoritative).
- Client untuk interpolasi dan smooth UX.

**Kelebihan:**
- Mencegah manipulasi timer dari client.
- Memberikan pengalaman visual yang halus.
- Mempermudah sinkronisasi jika reconnect.

**Tips:**
- Server kirim `game:timer` setiap detik.
- Client menggunakan `requestAnimationFrame` untuk countdown halus.
- Jika drift terlalu besar, resync dari server.

### Potensi Tantangan

1. State synchronization antara client dan server.
2. Latency pada action real-time seperti bell press.
3. Penanganan disconnect/reconnect.
4. Performance bila jumlah pemain besar.
5. Testing multiplayer scenario.

## Kesimpulan

Rencana Anda sangat bagus dan siap untuk diimplementasikan.

- **Strengths:** desain state lengkap, event architecture jelas, struktur komponen logis.
- **Ready to implement:** semua konsep utama sudah matang.
- **Scalable:** mudah ditambah fitur baru.

**Rekomendasi langkah selanjutnya:**
1. Buat tipe `GameState` di shared package.
2. Buat skeleton komponen `Game.tsx`, `PlayerSlot.tsx`, `Playboard.tsx`, `ChatLog.tsx`.
3. Implementasi logika timer.
4. Uji dengan 2-3 pemain terlebih dahulu.
