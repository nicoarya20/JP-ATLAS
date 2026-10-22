# Implementasi — Simple PM, MVP Inti

> Dibuat 15 Oktober 2026. **Mulai dari sini.** Halaman ini adalah indeks: urutan baca, peta dokumen, urutan pengerjaan, dan aturan kerja. Status tugas ada di [`PROGRES.md`](PROGRES.md).

**Lingkup (keputusan user):** MVP Inti = irisan **S0** (prasyarat ops, akun dan akses, kontrak beku), **S1** (Proyek + profil), dan **S2** (Tugas inti). Irisan S3 ke atas ditunda. Estimasi ≈ 128 hari-orang AI, sekitar 8 minggu kalender dengan maksimal 3-4 pekerja serentak.

## 1. Urutan baca
1. [`KEPUTUSAN-MVP-INTI.md`](KEPUTUSAN-MVP-INTI.md) — semua keputusan user. **Bila bentrok dengan dokumen lain, ini yang berlaku.**
2. [`PROGRES.md`](PROGRES.md) — apa yang sudah dan belum.
   Daftar semua yang **belum** dikerjakan (penutup MVP 1, hutang per menu, hutang teknis, keputusan terbuka): [`HUTANG.md`](HUTANG.md).
3. Rencana tugas sesuai irisan: [`rencana/P1`](rencana/P1-s0a-akun-akses.md) (S0.0 dan S0.a), [`rencana/P2`](rencana/P2-s0b-kontrak-beku.md) (S0.b), [`rencana/P3`](rencana/P3-s1-s2-proyek-tugas.md) (S1 dan S2).
4. [`tinjauan/X1`](tinjauan/X1-keputusan-teknis.md) (10 keputusan teknis D1-D10), [`X2`](tinjauan/X2-keputusan-domain.md) (tabel izin final, konstanta asumsi), [`X3`](tinjauan/X3-konsistensi-kontrak.md) (nama kanonik, peta kepemilikan berkas).
5. [`riset/R01..R14`](riset/) — alasan di balik keputusan; baca hanya bagian yang dirujuk tugas.
6. Konvensi kode proyek: `CLAUDE.md` di root repo. Desain: `tahapan-proyek/03-desain/` (acuan, bukan hukum; fondasi kode menang bila bentrok).

## 2. Urutan pengerjaan
| Tahap | Isi | Syarat mulai | Selesai bila |
|---|---|---|---|
| **S0.0** (9 tugas) | Gelombang 1: S0.0-01 (selesai) → gelombang 2: 02, 03, 06, 08 → gelombang 3: 04, 07, 09 → gelombang 4: 05 | – | Gerbang **SP-0.0**: test hijau di worktree bersih, `bun audit` nol high/critical, laporan ke user |
| **S0.a** (15 tugas) dan **S0.b** (33 tugas), **paralel** | S0.a gelombang A-G (jalur kritis ±10-12 hari). S0.b tiga lajur D/K/A dengan titik sinkron SP1a, SP0a, SP0, SY-1..SY-4 | SP-0.0 | **`contract-v1`**: S0B-33 lulus **dan persetujuan user** |
| **S1** (18 tugas) dan **S2** (17 tugas), **paralel** | 7 lajur (proyek API, proyek UI, profil+ukuran teks, tugas API, tugas UI x2, QA), maks 4 pekerja | `contract-v1` | Demo S1 diterima user; **gerbang S2** = uji pengguna dengan penguji nyata |

Detail ketergantungan: P1 §3, P2 §4, P3 §3. Satu-satunya cara menambah tugas atau mengubah urutan adalah mengubah rencananya, lalu `PROGRES.md`.

## 3. Aturan kerja
- **Cabang:** satu cabang per tugas, dari `feature/project-management` (S0.0: `chore/pm-s00-<nama>`; selebihnya mengikuti rencana). Commit per tugas dengan format `<type>(<scope>): <english imperative>`, satu tugas = satu concern.
- **Tanpa push, tag, atau deploy** tanpa perintah eksplisit user.
- **Merge per gelombang** (keputusan user 15 Okt): satu gelombang = tugas yang diluncurkan dalam satu batch (2-3 worker) dan ditutup satu laporan. Koordinator melapor ringkasan perubahan, hasil `typecheck`/`test`/`smoke`, dan nama cabang; user menyetujui **sekali per gelombang**. **Pengecualian, wajib disetujui satu per satu:** tugas yang menyentuh `server/auth.ts`, `server/guard.ts`, `server/permissions.ts`, atau berkas migrasi `server/db/migrations/*`.
- **Migrasi:** satu pemegang baton; dua `db:generate` bersamaan dilarang (yang kalah digenerate ulang). Migrasi baru wajib dijalankan ke DB dev **dan** DB test. SQL berguard idempoten.
- **Definisi selesai** (tiap tugas): test tugas hijau; `bun run test` hijau; `bun run typecheck` nol tanpa filter; `bun run lint` bersih; menyentuh `server/`, `app/root.tsx`, `app/entry.server.tsx`, logger, atau skrip build => `bun run smoke:prod` dan `bun run smoke:binary`; poin `CHANGELOG.md` `[Unreleased]` bila berdampak ke pengguna/operator; tanpa TODO tanpa konteks; ukuran berkas dalam batas.
- **Tutup worktree yang sudah selesai** (permintaan user): setelah gelombang di-merge **dan** di-push, worktree gelombang itu dihapus dengan `orca worktree rm --worktree path:<folder>` (tanpa `--force`). Syaratnya: bersih, cabang sudah ter-merge ke `feature/project-management`, dan sudah ada di `origin`. Worktree yang belum ter-merge tidak boleh dihapus. Penghapusan berjalan di latar belakang; cek `git worktree list` sebelum menyimpulkan.
- **Lingkungan test terisolasi:** isi `LOCAL_PG_DIR`, `LOCAL_PG_PORT`, `LOCAL_S3_DIR`, **dan `LOCAL_S3_PORT`** per worker (port berbeda, bukan 54330). RustFS milik user di 54330 membuat test storage gagal bila `LOCAL_S3_PORT` tidak diisi; kode menolak memakainya sehingga data user aman, tetapi test menjadi merah.
- **Kuota token:** luncurkan 2-3 worker per batch, pantau galat 429 di tiap peluncuran, dan simpan hasil per tugas (commit) supaya worker yang mati tidak menghilangkan pekerjaan.
- **Dilarang tanpa izin eksplisit:** Playwright/browser otomatis, menyentuh `.env*`, `.mcp.json`, dan berkas `orca-office`.

## 4. Data dummy yang berlaku
`Penguji-1..5 (dummy)` dan `Peninjau-2 (dummy)` (KEPUTUSAN §5). **Hasil uji dengan dummy tidak memenuhi gerbang S2.** Penguji nyata dibutuhkan sebelum hari ke-12 setelah `contract-v1`.

## 5. Memperbarui `PROGRES.md`
Saat tugas mulai: status `berjalan` + cabang. Saat selesai dikerjakan: `review` + hasil tes. Setelah user menyetujui gelombang: `selesai` + hash commit, dan satu baris di "Log merge per gelombang". Tugas yang terblokir: `diblokir` + alasan. Setiap perubahan dicatat di "Log perubahan".

## 6. Rencana S3 ke atas (menunggu gerbang S2)
Tujuh rencana menu (Inbox, Beranda, Tugas lanjutan, Sampah, Tim, Pengaturan, Event) ada di [`rencana/P4`..`P10`](rencana/); ringkasan urutan, estimasi, migrasi, dan 10 keputusan yang dibutuhkan ada di [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md); status tugasnya dicatat di [`PROGRES-S3-S8.md`](PROGRES-S3-S8.md) (terpisah dari `PROGRES.md`). Lingkup MVP Inti tidak berubah; rencana ini tidak boleh dieksekusi sebelum S2-17 lulus dan user menyetujuinya.

**Lajur admin, paralel** (keputusan user 21 Okt 2026): [`rencana/P11`](rencana/P11-area-admin.md) — area Admin `/dashboard` dari 2 menu menjadi 5, dan kepemilikan setelan organisasi pindah dari `/dev` ke `/dashboard`. Dijalankan **bersamaan** dengan lajur produk di atas, bukan sesudahnya: berkas yang disentuh tidak bertabrakan (`routes/admin/**`, `api/admin*`, `settings*` vs `routes/app/**`, `task*`, `event*`). Yang tetap mengikat: satu baton migrasi untuk semua lajur, dan batas 2-3 worker per batch (§3).
