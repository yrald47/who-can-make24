# Review Aplikasi Who Can Make24

Tanggal review: 2026-09-07

Dokumen ini merangkum hasil review client, server, shared package, struktur kode, game rules, accessibility, UI/UX, dan validasi proyek.

## Ringkasan Eksekutif

Aplikasi sudah memiliki fondasi yang cukup baik:

- Pemisahan client, server, dan shared package sudah jelas.
- React context sudah memisahkan room state dan game state.
- Socket event utama sudah terstruktur.
- Ada rate limiter, reconnect flow, ErrorBoundary, dan server-authoritative timer sebagai arah desain.
- Visual UI memiliki identitas yang konsisten dan tidak terasa seperti template default.

Namun aplikasi belum dapat disebut production-ready atau fully clean. Prioritas terbesar adalah validasi game di server, konsistensi state untuk deployment multi-instance, concurrency Redis, compile error server, dan tidak adanya automated test.

## Prioritas Perbaikan

1. Perbaiki validasi proof dan cegah submission/transisi ronde ganda.
2. Tentukan satu sumber kebenaran untuk game state yang kompatibel dengan multi-instance.
3. Perbaiki validasi join, disconnect, authorization, dan konfigurasi CORS.
4. Tambahkan test untuk rules dan event socket.
5. Hapus state manager lama, listener duplikat, backup files, serta debug logging.
6. Perbaiki accessibility modal, kontrol keyboard, label, dan mobile overflow.

---

## 1. Proof Game Dapat Dicurangi

**Severity: Critical**

### Lokasi

- [apps/server/src/game/gameManager.ts](apps/server/src/game/gameManager.ts#L132)
- [apps/server/src/game/gameManager.ts](apps/server/src/game/gameManager.ts#L249)
- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L559)
- [apps/client/src/pages/Game/components/phases/ProofPhase.tsx](apps/client/src/pages/Game/components/phases/ProofPhase.tsx)

### Temuan

Server menentukan jawaban benar hanya dari hasil terakhir:

```ts
const lastResult = steps[steps.length - 1]?.result;
const isCorrect = lastResult === TARGET_NUMBER;
```

Server tidak memastikan bahwa:

- semua empat kartu ronde dipakai;
- setiap kartu hanya dipakai sekali;
- angka pada langkah memang berasal dari kartu atau hasil langkah sebelumnya;
- operator valid untuk operand tersebut;
- pembagian dengan nol tidak terjadi;
- hasil setiap langkah benar;
- pemain yang submit memang pemain yang ditunjuk;
- pemain hanya submit satu kali per ronde.

Pada PVP, pemain dapat mengirim proof benar lebih dari satu kali sebelum `nextPvpRound()` berjalan. Ini berpotensi menambah skor lebih dari sekali.

### Penyebab

Client mengirim `ProofStep[]`, lalu server mempercayai nilai `result` di payload tanpa melakukan rekonstruksi dan validasi ulang.

### Solusi yang direkomendasikan

Buat validator proof authoritative di server, misalnya `validateProof(steps, currentCards)`:

1. Validasi bentuk payload dan batas nilai numerik.
2. Validasi tiga langkah maksimum dan penggunaan tepat empat kartu.
3. Simulasikan setiap langkah di server.
4. Pastikan operand tersedia dan tidak dipakai dua kali.
5. Hitung ulang hasil operasi server-side.
6. Bandingkan hasil akhir dengan 24 menggunakan aturan precision yang eksplisit.
7. Pastikan player adalah anggota `provers` atau pemain yang berhak submit.
8. Simpan `submittedPlayerIds` atau gunakan `proofs.some(...)` sebagai guard sebelum menerima submission kedua.
9. Ubah phase ke state terminal/transisi sebelum menjadwalkan `setTimeout` ronde berikutnya.

### Alternatif

- **Validasi ringan di server:** hanya cek struktur dan hasil tiap langkah. Implementasi lebih cepat, tetapi masih dapat dicurangi jika penggunaan kartu tidak divalidasi.
- **Kirim expression string lalu parse di server:** payload lebih sederhana, tetapi membutuhkan parser expression yang aman. Jangan gunakan `eval`.

### Trade-off dan risiko

- Validator server menambah kode domain, tetapi ini satu-satunya pilihan yang layak untuk fairness.
- Aturan pecahan dan pembulatan harus diputuskan sejak awal. Floating point dapat membuat hasil seperti `23.999999999` ambigu.
- Jika client dan server memakai aturan operasi berbeda, UI dapat menampilkan jawaban valid tetapi server menolaknya. Shared validator atau test contract dapat mengurangi risiko ini.

---

## 2. Game State Tidak Aman untuk Multi-Instance

**Severity: Critical**

### Lokasi

- [apps/server/src/game/gameManager.ts](apps/server/src/game/gameManager.ts#L5)
- [apps/server/src/rooms/roomManager.redis.ts](apps/server/src/rooms/roomManager.redis.ts#L44)
- [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts#L215)

### Temuan

Room disimpan di Redis, tetapi `gameStates` dan `timerIntervals` disimpan di memory proses:

```ts
const gameStates = new Map<string, GameState>();
```

Dengan dua server instance, event yang masuk ke instance berbeda tidak akan menemukan game state yang dibuat instance pertama. Timer juga hanya hidup di instance yang membuatnya.

### Penyebab

Room state dan game state memakai dua storage model yang berbeda. Socket.IO event juga belum menunjukkan konfigurasi adapter Redis untuk broadcast antar-instance.

### Solusi yang direkomendasikan

Pindahkan state game authoritative ke Redis atau gunakan storage terdistribusi yang memiliki atomic update. Gunakan Redis adapter untuk Socket.IO dan scheduler terdistribusi untuk timer.

Pisahkan:

- state game persistent/authoritative di Redis;
- timer scheduler yang dapat di-restart;
- event broadcast melalui Socket.IO Redis adapter.

Timer sebaiknya dihitung dari `startTime` dan deadline, bukan mengandalkan decrement memory lokal.

### Alternatif

- **Tetap single-instance:** paling sederhana dan murah untuk tahap awal, tetapi harus diberi batas deployment yang jelas.
- **Sticky sessions:** dapat mengurangi event berpindah instance, tetapi tidak menyelesaikan masalah restart/crash dan bukan pengganti shared state.

### Trade-off dan risiko

- Redis state menambah latency, serialization, dan kompleksitas atomic update.
- Single-instance lebih mudah dirawat, tetapi menjadi single point of failure.
- Scheduler terdistribusi membutuhkan idempotency agar timeout tidak memproses ronde dua kali.

---

## 3. Race Condition pada Join, Leave, dan Rejoin

**Severity: High**

### Lokasi

- [apps/server/src/rooms/roomManager.redis.ts](apps/server/src/rooms/roomManager.redis.ts#L53)
- [apps/server/src/rooms/roomManager.redis.ts](apps/server/src/rooms/roomManager.redis.ts#L87)
- [apps/server/src/rooms/roomManager.redis.ts](apps/server/src/rooms/roomManager.redis.ts#L170)

### Temuan

Join dan leave menggunakan pola:

1. baca room;
2. ubah object di memory;
3. tulis kembali ke Redis.

Dua request bersamaan dapat membaca snapshot yang sama lalu saling menimpa. Dampaknya dapat berupa kapasitas room terlewati, player hilang, atau mapping `playerRoom` tidak konsisten.

### Solusi yang direkomendasikan

Gunakan Lua script Redis atau transaction dengan optimistic locking (`WATCH/MULTI/EXEC`) untuk operasi join/leave/rejoin. Validasi kapasitas dan update room plus player mapping harus menjadi satu operasi atomic.

### Alternatif

- Distributed lock per room menggunakan Redis.
- Queue per room.

Lock lebih mudah dipahami, tetapi perlu expiry dan penanganan lock yang hilang. Queue menjaga urutan tetapi menambah latency dan infrastruktur.

---

## 4. Validasi Join Tidak Konsisten

**Severity: High**

### Lokasi

- [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts#L115)
- [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts#L34)

### Temuan

`room:create` memvalidasi nama, avatar, dan mode, tetapi `room:join` langsung memanggil `makePlayer(name, avatar)`. Client atau caller arbitrary dapat mengirim nama/avatar invalid.

Socket yang sama juga dapat membuat atau join room baru tanpa memastikan membership sebelumnya dibersihkan.

### Solusi yang direkomendasikan

Buat schema validation bersama untuk semua socket payload. Jalankan validasi yang sama pada create, join, reconnect, dan event game. Sebelum join/create, cek membership aktif dan lakukan leave atomically jika product memang mengizinkan pindah room.

### Trade-off

Validasi schema menambah dependency atau boilerplate, tetapi mengurangi branch validation manual dan membuat kontrak event lebih mudah dites.

---

## 5. Disconnect Hanya Ditandai, Tidak Menyelesaikan Eligibility

**Severity: High**

### Lokasi

- [apps/server/src/rooms/roomHandlers.ts](apps/server/src/rooms/roomHandlers.ts#L388)
- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L162)

### Temuan

Saat disconnect, player diberi properti dinamis `disconnected`, tetapi banyak logic game masih memakai `room.players` seluruhnya. Player yang sudah disconnect dapat tetap dihitung dalam timer, kandidat, majority vote, dan participant game.

### Solusi yang direkomendasikan

Tambahkan status koneksi ke tipe `Player`, misalnya `connectionState: "connected" | "disconnected"`, lalu buat helper tunggal `getActivePlayers(room)`. Semua perhitungan game harus memakai helper tersebut.

Tentukan kebijakan reconnect secara eksplisit:

- grace period;
- player tetap mempertahankan slot atau tidak;
- game pause atau lanjut;
- apa yang terjadi jika host disconnect.

### Trade-off

Grace period meningkatkan pengalaman reconnect, tetapi room dapat menunggu player yang tidak kembali. Mengeluarkan player segera lebih sederhana, tetapi dapat menghukum koneksi mobile yang sementara putus.

---

## 6. CORS Socket.IO Terbuka

**Severity: High**

### Lokasi

- [apps/server/src/index.ts](apps/server/src/index.ts#L29)

### Temuan

Konfigurasi menggunakan `origin: "*"`, sementara event game belum memakai autentikasi pemain yang kuat.

### Solusi yang direkomendasikan

Gunakan allowlist origin melalui environment variable, misalnya `CLIENT_ORIGINS`. Tambahkan session token atau signed player identity untuk authorization event sensitif. CORS bukan pengganti authentication, tetapi allowlist mengurangi permukaan akses yang tidak perlu.

### Trade-off

Allowlist membutuhkan konfigurasi berbeda per environment. Authentication menambah flow login/session, tetapi diperlukan jika game akan dipercaya untuk kompetisi atau scoring publik.

---

## 7. Transisi Ronde Dapat Terjadi Lebih dari Sekali

**Severity: Medium-High**

### Lokasi

- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L230)
- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L559)
- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L729)

### Temuan

Beberapa jalur memanggil `setTimeout` lalu `nextRound()` atau `nextPvpRound()`. Belum ada idempotency guard yang kuat untuk memastikan satu ronde hanya memiliki satu transition.

### Solusi yang direkomendasikan

Tambahkan state transition atomik:

- `phase: "result"` sebelum menjadwalkan next round;
- `roundTransitionScheduled` atau `roundVersion`;
- validasi room/round version sebelum callback berjalan;
- clear timeout saat game dihapus.

Semua jalur result, timeout, surrender, dan PVP proof harus memakai satu fungsi transition bersama.

### Trade-off

State machine sedikit lebih formal, tetapi mengurangi branch race condition dan membuat perilaku lebih mudah dites.

---

## 8. Timer Client Dapat Drift

**Severity: Medium**

### Lokasi

- [apps/client/src/context/GameContext.tsx](apps/client/src/context/GameContext.tsx#L471)
- [apps/server/src/game/gameHandlers.ts](apps/server/src/game/gameHandlers.ts#L45)

### Temuan

Client melakukan `timer - 1` setiap satu detik. Browser dapat menunda interval saat tab background atau device sibuk. Server sudah mengirim `startTime`, tetapi client belum menghitung timer berdasarkan clock.

### Solusi yang direkomendasikan

Hitung sisa waktu dari `deadline` atau `startTime + duration`:

```ts
const remaining = Math.max(0, deadline - Date.now());
```

Gunakan server event sebagai resynchronization, dan gunakan `requestAnimationFrame` hanya jika perlu tampilan sub-second.

### Trade-off

Clock-based timer lebih akurat, tetapi perbedaan clock client-server tetap ada. Server harus tetap menjadi sumber kebenaran untuk menerima atau menolak action.

---

## 9. Training Panel Menggunakan Dua Hand Berbeda

**Severity: Medium**

### Lokasi

- [apps/client/src/pages/Landing/TrainingPanel.tsx](apps/client/src/pages/Landing/TrainingPanel.tsx#L458)

### Temuan

`hand` dan `available` masing-masing memanggil `freshHand()`. Karena generator dapat menghasilkan hand berbeda, kartu yang disimpan sebagai `hand` dapat berbeda dengan kartu yang tersedia di board.

### Solusi yang direkomendasikan

Buat satu `initialHand`, lalu derive `available` dari hand yang sama. Atau buat helper `toAvailableCards(hand)` dan panggil hanya setelah hand dibuat.

### Trade-off

Tidak ada trade-off berarti. Ini perbaikan kecil dengan risiko rendah dan sebaiknya dilakukan segera.

---

## 10. Modal Belum Aksesibel

**Severity: Medium**

### Lokasi

- [apps/client/src/components/ConfirmModal/ConfirmModal.tsx](apps/client/src/components/ConfirmModal/ConfirmModal.tsx#L20)
- [apps/client/src/pages/Game/components/RulesModal.tsx](apps/client/src/pages/Game/components/RulesModal.tsx#L5)
- Modal create room di [apps/client/src/pages/Landing/Landing.tsx](apps/client/src/pages/Landing/Landing.tsx#L600)

### Temuan

Modal belum memiliki:

- `role="dialog"`;
- `aria-modal="true"`;
- accessible title melalui `aria-labelledby`;
- focus dipindahkan ke modal saat dibuka;
- focus trap;
- close dengan Escape;
- restore focus ke trigger saat ditutup;
- pengelolaan background agar tidak dapat diakses keyboard.

### Solusi yang direkomendasikan

Buat satu komponen `Dialog` reusable yang menangani seluruh behavior di atas. Gunakan komponen itu untuk Confirm, Rules, dan Create Room.

### Alternatif

Gunakan library dialog aksesibel yang sudah stabil. Ini mengurangi risiko implementasi focus trap yang salah, tetapi menambah dependency dan perlu disesuaikan dengan visual system.

---

## 11. Kontrol Interaktif dan Keyboard Navigation

**Severity: Medium**

### Lokasi

- Avatar picker di [apps/client/src/pages/Landing/Landing.tsx](apps/client/src/pages/Landing/Landing.tsx#L155)
- Rules button di [apps/client/src/pages/Game/components/Playboard.tsx](apps/client/src/pages/Game/components/Playboard.tsx#L27)
- Player target controls di [apps/client/src/pages/Game/components/PlayerSlot.tsx](apps/client/src/pages/Game/components/PlayerSlot.tsx#L62)
- Room card di [apps/client/src/components/RoomCard/RoomCard.tsx](apps/client/src/components/RoomCard/RoomCard.tsx#L22)

### Temuan

`RoomCard` adalah `div` clickable, sehingga tidak otomatis dapat diakses dengan keyboard. Beberapa icon/button tidak memiliki `aria-label`. Avatar `alt` berisi ID teknis seperti `avatar-001`, bukan deskripsi yang bermakna.

### Solusi yang direkomendasikan

- Ubah clickable `div` menjadi `button` atau tambahkan semantics keyboard yang lengkap.
- Tambahkan `aria-label`, `aria-pressed`, dan `aria-disabled` sesuai konteks.
- Gunakan label avatar yang bermakna atau `alt="Avatar pilihan 1"`.
- Pastikan focus ring terlihat dan kontras.
- Tambahkan automated accessibility scan dan keyboard smoke test.

### Trade-off

Mengubah layout card menjadi button mungkin membutuhkan styling tambahan, tetapi lebih aman daripada meniru semantics button secara manual.

---

## 12. Mobile Overflow dan Fixed Bottom Bar

**Severity: Medium**

### Lokasi

- [apps/client/src/pages/Landing/Landing.tsx](apps/client/src/pages/Landing/Landing.tsx#L89)
- [apps/client/src/pages/Landing/Landing.tsx](apps/client/src/pages/Landing/Landing.tsx#L336)

### Temuan

Root landing memakai `h-screen` dan `overflow-hidden`, sementara mobile memiliki drawer dan fixed bottom bar. Konten panjang atau keyboard virtual dapat membuat bagian form tertutup atau tidak dapat discroll.

Terdapat juga kombinasi class `h-screen h-[100dvh]` yang redundan.

### Solusi yang direkomendasikan

Gunakan `min-h-[100dvh]` pada root, izinkan scrolling pada container utama, dan beri `padding-bottom` yang cukup untuk fixed bar. Uji viewport kecil dengan keyboard virtual serta mode landscape.

### Trade-off

Scroll page menjadi lebih panjang, tetapi lebih dapat dipakai pada device kecil. `100dvh` lebih akurat untuk mobile modern, tetapi fallback perlu dipertimbangkan untuk browser lama.

---

## 13. Duplikasi State dan Implementasi Lama

**Severity: Low-Medium**

### Lokasi

- [apps/client/src/context/RoomContext.tsx](apps/client/src/context/RoomContext.tsx#L68)
- [apps/client/src/hooks/useRooms.ts](apps/client/src/hooks/useRooms.ts#L8)
- [apps/server/src/rooms/roomManager.ts](apps/server/src/rooms/roomManager.ts#L1)
- `apps/client/src/pages/Landing/Landing_backup.tsx`
- `apps/client/src/components/RoomCard/RoomCard_backup.tsx`

### Temuan

`RoomContext` dan `useRooms` mengelola listener room yang sama. Server memiliki `roomManager.ts` in-memory yang tidak dipakai oleh handler Redis. Backup files dan blok komentar lama masih berada di source tree.

### Solusi yang direkomendasikan

- Tetapkan `RoomContext` sebagai satu-satunya room state owner.
- Hapus `useRooms` jika benar-benar tidak digunakan.
- Hapus atau pindahkan `roomManager.ts` legacy setelah memastikan tidak ada import aktif.
- Hapus backup files dari source tree; gunakan Git untuk histori.
- Hapus commented-out implementation dan pertahankan hanya alasan desain penting di dokumentasi.

### Trade-off

Penghapusan file lama berisiko jika masih ada import tersembunyi, sehingga lakukan grep/reference check dan build setelahnya. Manfaatnya adalah ownership dan behavior menjadi jauh lebih jelas.

---

## 14. Debug Logging Terlalu Agresif

**Severity: Low-Medium**

### Lokasi

- [apps/client/src/main.tsx](apps/client/src/main.tsx#L10)
- [apps/client/src/context/RoomContext.tsx](apps/client/src/context/RoomContext.tsx#L261)
- [apps/client/src/lib/socket.ts](apps/client/src/lib/socket.ts#L5)
- [apps/server/src/game/gameManager.ts](apps/server/src/game/gameManager.ts#L261)

### Temuan

Semua socket event dan `import.meta.env` dicetak ke console. Payload dapat berisi nama pemain, room data, chat, dan state game. Ini membuat production console bising dan berpotensi mengekspos data.

### Solusi yang direkomendasikan

Buat logger dengan level dan feature flag development. Jangan mencetak seluruh environment object. Gunakan structured server logger untuk event penting dan redaksi data sensitif.

### Trade-off

Logging lebih sedikit dapat mempersulit debugging production. Solusinya bukan mempertahankan `console.log` global, tetapi menyediakan logging terstruktur dengan level yang dapat dikonfigurasi.

---

## 15. Server Typecheck Gagal

**Severity: Medium**

### Lokasi

- [apps/server/src/rooms/roomManager.ts](apps/server/src/rooms/roomManager.ts#L22)
- [packages/shared/src/index.ts](packages/shared/src/index.ts#L24)

### Temuan

`Room.isWild` wajib di shared type, tetapi implementasi legacy `roomManager.ts` membuat `Room` tanpa properti tersebut.

Error yang ditemukan:

```text
Property 'isWild' is missing in type ... but required in type 'Room'.
```

### Solusi yang direkomendasikan

Jika `roomManager.ts` sudah tidak dipakai, hapus file legacy. Jika masih dibutuhkan, tambahkan `isWild` dan pastikan seluruh behavior mengikuti Redis manager. Tambahkan script `typecheck` atau `build` pada package server agar error tidak mudah terlewat.

### Trade-off

Menghapus manager lama lebih bersih. Memperbaikinya lebih aman jika ada consumer tersembunyi, tetapi mempertahankan dua implementation meningkatkan risiko drift.

---

## 16. Testing Belum Memadai

**Severity: High untuk reliability**

### Kondisi saat review

Tidak ada test script atau dependency test yang terlihat pada package client/server. Area penting belum dilindungi automated test:

- proof validation;
- penggunaan kartu dan operasi pecahan;
- duplicate submission;
- timer expiry;
- transition phase;
- join/leave/reconnect;
- disconnect dan host transfer;
- Redis concurrent update;
- authorization event socket;
- keyboard navigation dan modal focus;
- responsive behavior.

### Solusi yang direkomendasikan

Mulai dari unit test domain tanpa Socket.IO:

1. `validateProof` dan game scoring.
2. State transition ronde.
3. Room mutation atomic behavior.
4. Socket handler integration test.
5. Browser test untuk flow create/join/start/proof.
6. Accessibility test menggunakan axe atau Playwright.

Gunakan test runner yang sudah sesuai dengan toolchain Bun/TypeScript, atau Vitest jika kebutuhan browser integration lebih kuat.

### Trade-off

Test menambah waktu setup dan maintenance. Namun untuk game real-time, biaya tidak memiliki test jauh lebih besar karena race condition dan scoring bug sulit ditemukan melalui manual testing saja.

---

## Penilaian Prinsip Kode

| Prinsip | Penilaian | Catatan |
|---|---|---|
| DRY | Belum | Listener room, timer path, state mutation, dan modal behavior berulang. |
| Clean code | Sebagian | Nama cukup jelas, tetapi dead code dan legacy implementation masih ada. |
| Simplicity first | Belum konsisten | UI cukup langsung, server flow memiliki banyak branch dan jalur transisi paralel. |
| Goal driven | Sebagian | Goal game jelas, tetapi fairness dan lifecycle belum diperlakukan sebagai invariant utama. |
| Readability | Cukup | Struktur folder baik, komentar lama dan logging mengganggu signal-to-noise. |
| Accessibility | Perlu perbaikan | Modal semantics, focus management, labels, dan keyboard card belum lengkap. |
| UI/UX | Cukup kuat secara visual | Identitas visual bagus, tetapi mobile overflow, feedback, dan keyboard UX perlu diuji. |
| Security/correctness | Belum siap produksi | Proof validation, authorization, CORS, disconnect, dan atomicity perlu diperbaiki. |
| Testing | Kurang | Belum ada regression safety untuk domain dan socket flow. |

## Validasi yang Dilakukan

- Client lint berhasil dengan 0 error dan 2 warning React Hook dependency.
- Server typecheck gagal karena `roomManager.ts` tidak mengisi `isWild`.
- Root package tidak memiliki script `lint` atau `build`.
- Client memiliki script `lint` dan `build`; build penuh belum selesai dijalankan pada sesi review karena execution dihentikan.

## Rekomendasi Tahapan Implementasi

### Tahap 1: Correctness dan fairness

- Implementasikan server-side proof validator.
- Cegah duplicate proof dan duplicate round transition.
- Tambahkan unit test game rules.
- Perbaiki timer berbasis deadline.

### Tahap 2: State dan concurrency

- Putuskan single-instance atau multi-instance sebagai target deployment.
- Jika multi-instance, pindahkan game state ke Redis dan pasang Socket.IO adapter.
- Atomic-kan join/leave/rejoin.
- Definisikan reconnect/disconnect policy.

### Tahap 3: Security dan contracts

- Validasi seluruh socket payload.
- Tambahkan authorization berdasarkan membership dan session identity.
- Ganti CORS wildcard dengan allowlist.
- Tambahkan server package scripts untuk typecheck, build, dan test.

### Tahap 4: Maintainability

- Satukan room state owner.
- Hapus legacy manager, backup files, dan dead code.
- Ganti global console logging dengan logger berlevel.
- Extract shared transition/dialog helpers bila behavior memang sama.

### Tahap 5: Accessibility dan UX

- Buat reusable accessible Dialog.
- Perbaiki labels, focus state, keyboard navigation, dan semantics card.
- Perbaiki mobile scrolling dan fixed bar spacing.
- Tambahkan Playwright flow test dan accessibility scan.

## Kesimpulan

Aplikasi ini sudah mempunyai arah produk dan visual yang jelas, tetapi belum cukup kuat pada invariant game dan lifecycle real-time. Perbaikan paling bernilai bukan refactor kosmetik, melainkan memastikan server benar-benar menjadi sumber kebenaran, event idempotent, storage konsisten, dan behavior utama dilindungi test. Setelah itu, cleanup DRY dan accessibility akan lebih aman dilakukan karena kontrak behavior sudah jelas.
