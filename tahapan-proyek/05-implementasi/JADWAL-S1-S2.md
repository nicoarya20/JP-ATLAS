# Jadwal peluncuran S1 + S2 (usulan, menunggu persetujuan user)

> Disusun 16 Okt 2026 setelah `contract-v1` (tag lokal `e3ca23c`). Dasar: `rencana/P3-s1-s2-proyek-tugas.md`, `KEPUTUSAN-MVP-INTI.md` (menang), dan kondisi kode terkini, bukan asumsi P3 (ditulis sebelum S0 jalan). **Belum ada yang diluncurkan.** Status per tugas tetap di `PROGRES.md`.

## 1. Ringkasan
- **35 tugas** (S1 = 18, S2 = 17), ≈ 63 hari-AI. Dengan 4 worker dan tugas yang saling bergantung digabung satu worker (dua commit, dua verifikasi), jadwal ini **8 gelombang (G14-G21)**, ditambah sesi uji pengguna manusia (S2-16).
- **Aturan kerja diwarisi dari S0** (terbukti 13 gelombang tanpa 429): 4 worker, satu cabang per worker, merge per gelombang setelah user berkata "merge", uji gabungan di worktree sementara sebelum meminta persetujuan, `smoke:binary` + `smoke:coldboot` untuk perubahan di `server/` atau `app/root.tsx`, 0 baris `error TS` ditempel mentah, tanpa push tanpa perintah.
- **Tidak ada migrasi di S1-S2** (skema beku, expand-only). Kebutuhan skema baru ⇒ berhenti dan lapor.
- **Tidak ada berkas wajib-satu-per-satu** (`auth.ts`, `guard.ts`, `permissions.ts`, migrasi tidak disentuh), kecuali dua jalur yang menghapus data: **S1-05** dan **S1-18** (usul: disetujui satu per satu).
- **Dua lajur** berjalan paralel dan hanya bertemu di S2-11 (butuh pemilih orang S1-04) dan S2-14 (butuh layout proyek S1-10).

## 2. Yang berubah dibanding P3 (karena S0 sudah jalan)
| Tugas | Kondisi sekarang | Dampak |
|---|---|---|
| S1-01 daftarkan modul | S0B-18 sudah membuat 6 stub (`app-profile/projects/projects.members/tasks/tasks.workflow/tasks.detail`). **Belum ada**: `app-team.picker.ts`, `app-projects.trash.ts`, `app-trash.ts` | Mengecil: digabung ke S1-02 sebagai commit pertama (izin menyunting `app.ts`, ≤3 baris `.use`) |
| S1-02 | `tests/support/query-count.ts` belum ada | Dibuat di S1-02 |
| S1-05 | `PROJECT_DELETE_UI_ENABLED` sudah `true` di `server/pm/limits.ts` (keputusan user: opsi B), bukan `false` di `projects.copy.ts` | Konstanta lama P3 diabaikan; tombol baru dipasang S1-18 |
| S1-06 | Kolom profil nyata: `displayName`, `phone`, `jobTitle`, `department` (bukan `name`/`division`). `server/text-size.ts` ada; **penulis cookie di `app/routes/go.tsx` belum ada** | Spesifikasi worker memakai nama kolom nyata |
| S1-07 tema + root | **Sudah dikerjakan S0B-24/25** (`buildTheme`, loader root, cookie dibaca, `lang="id"`) | Tidak jadi tugas; verifikasi skala 1,25/1,5 dilebur ke S1-14 dan S1-16 |
| S1-15 | NAV `/app/settings` sudah ada (S0B-29); tinggal tautan `/profile` di layout admin dan super | Lebih kecil |
| S1-18 | P3 mengira stub `/app/trash` ada dari S0.b: **tidak ada**. `tests/contract-v1.test.ts` mengunci **tepat 11 URL `/app`** | S1-18 menambah 1 rute **dan mengubah snapshot secara sengaja** (protokol ADR 0002 §2, integrator) |
| S2-01 | `ScheduleGroup` **belum ada** | Tetap dikerjakan penuh |
| S2-17 | Agen lain sedang mengubah `app/routes/app/home.tsx` dan `app/components/home/` (cabang `feature/prototype-pm`/`home-dummy-data`) | Perlu koordinasi (lihat §3 butir 6) |
| Seluruh gelombang | Setiap penambahan ekspor di `server/access|metrics|pm/*` mengubah snapshot `tests/contract-v1.test.ts` | Aturan baru di §6 |

## 3. Keputusan yang saya butuhkan dari user (berurutan menurut kapan dibutuhkan)
| # | Keputusan | Dibutuhkan sebelum | Default bila tidak dijawab |
|---|---|---|---|
| 1 | **KB-3:** boleh mengubah **tenggat proyek langsung** di S1 (S5 nanti menggantinya dengan perpanjangan beralasan)? | G15 (S1-03) | Ya, dengan catatan riwayat `original_due_date` kosong sampai S5 |
| 2 | **KB-8:** label "**Pengelola utama**" untuk Lead disetujui? | G15 (teks UI pertama, S1-10) | Pakai, satu konstanta `LABEL_LEAD` mudah diganti |
| 3 | **KB-12:** status proyek bebas berpindah antar 5 nilai oleh Pengelola/Admin? | G15 (S1-03) | Ya (asumsi, uji memuat `completed→active`) |
| 4 | Tambah skrip npm `seed:atlas` (membungkus `scripts/seed-dev.ts`) agar data contoh mudah dimuat untuk demo | G16 (titik cek visual pertama) | Saya tambah di merge G14 bila disetujui |
| 5 | **UAT login Google** (`uat/UAT-S0A.md`) dijalankan sebelum titik cek visual pertama | G16 | Tetap terbuka (risiko diterima) |
| 6 | **Koordinasi `home.tsx`** dengan agen lain (beranda berdata contoh): beranda penuh sebenarnya jatah S3 | G20 (S2-17 menyentuhnya) | S2-17 hanya menambah dua tombol besar bila berkasnya sudah di-merge; bila belum, ditunda |
| 7 | **KB-4: nama penguji UP-1** (5 orang awam, usahakan semua ≥ 50 tahun, minimal 3) | **G18** (agar skrip dan lembar catat S2-15 di G20 siap) | UP-1 tergelincir dan memblokir S3 (RS-4) |
| 8 | Persetujuan **satu per satu** untuk S1-05 dan S1-18 (jalur hapus data) | G17 / G18 | Ya |

## 4. Jadwal gelombang
Kolom worker memuat tugas yang digabung (`+`) pada satu cabang dan dua commit. Setiap tugas yang bergantung hanya pada tugas dari gelombang sebelumnya yang **sudah di-merge**.

| Gel. | Worker 1 (S1 API) | Worker 2 (S1 UI / profil) | Worker 3 (S2 API) | Worker 4 (S2 UI / lainnya) | Titik cek |
|---|---|---|---|---|---|
| **G14** | S1-01'+S1-02 baca proyek + stub + `query-count` | S1-06 API profil + cookie `mk-text-size` | S2-01+S2-02 jadwal + query tugas | *(opsional)* T-H1 hutang tes (lihat §8) | |
| **G15** | S1-03 tulis proyek | S1-08+S1-10 klien proyek + layout/Ringkasan | S2-03+S2-04 rute baca (**SP2**) + buat/ubah | S1-14+S1-15 Pengaturan + peleburan `/profile` | |
| **G16** | S1-04 anggota + pemilih orang | S1-09+S1-11 daftar proyek + form baru | S2-05 mesin status | S2-08+S2-09 klien + komponen daftar tugas | **CP1:** user membuka `/app/projects`, `/app/settings`, ukuran teks |
| **G17** | S1-05 hapus ke Sampah (backend) **satu per satu** | S1-12+S1-13 tab Anggota + ubah proyek | S2-06 daftar periksa, komentar, linimasa | S2-10+S2-14 halaman Tugas + tab Tugas proyek | |
| **G18** | S1-18 halaman Sampah + tombol Hapus **satu per satu** (+ snapshot 12 URL) | S2-11 form tugas baru | S2-07 penjaga keamanan + kinerja | S2-12 detail tugas | **CP2:** S1 lengkap untuk dicoba; **nama penguji harus sudah ada** |
| **G19** | S1-16 smoke + QA 3 ukuran teks | S2-13 daftar periksa, komentar, riwayat di detail | *(kosong atau T-H)* | *(kosong atau T-H)* | |
| **G20** | S2-15 smoke S2 + paket uji pengguna | *(integrator)* S1-17 demo S1 (SP-G1) | | | **CP3:** demo S1 oleh user |
| **G21** | *(manusia)* S2-16 UP-1 + perbaikan | *(integrator)* S2-17 gerbang S2 (SP-G2) | | | **Gerbang S2** |

Pemeriksaan kecukupan (dependensi): G15 butuh S1-02 (G14), S1-06 (G14), S2-02 (G14); G16 butuh S1-03, S1-08, S2-03, S2-04 (G15); G17 butuh S1-04 (G16), S1-10 (G15), S1-11 (G16), S2-04 (G15), S2-09 (G16); G18 butuh S1-05 (G17), S1-10, S2-05 (G16), S2-06 (G17), S2-10 (G17), S1-04 (G16); G19 butuh S1-12 (G17), S2-12 (G18), S2-06; G20 butuh S2-13 (G19), S2-14 (G17), S1-16 (G19), S1-18 (G18), S1-13 (G17).

**Jalur kritis:** S2: S2-01→02 (G14) → 03/04 (G15) → 05 (G16) → 12 (G18) → 13 (G19) → 15 (G20) → UP-1 (G21). S1 selesai lebih awal (G20 sebagai demo) dan tidak memblokir S2. Pemotongan bila kalender mendesak (urutan dari P3 RS-3): S1-15 → S1-13 → sorotan S2-14 → tugas T6 uji pengguna.

## 5. Bentuk hasil per gelombang (apa yang kamu lihat)
- **G14:** hampir tanpa layar: API baca proyek dan query tugas teruji; profil bisa disimpan.
- **G15:** `/app/settings` (profil + ukuran teks 3 pilihan) dan kerangka detail proyek; API tulis proyek, rute baca tugas.
- **G16 (CP1):** `/app/projects` (daftar, filter, kartu mobile), form **Proyek baru**, anggota via API. Dengan data `seed:atlas` terlihat Atlas 17%.
- **G17:** tab Anggota, ubah proyek, halaman **Tugas** dan tab **Tugas** di proyek (membaca), mesin status di API.
- **G18 (CP2):** halaman Sampah proyek dan tombol Hapus proyek (dialog dampak); form tugas baru; detail tugas dengan tombol langkah berikutnya.
- **G19-G20:** daftar periksa, komentar, riwayat; QA 3 ukuran teks; smoke; demo S1.
- **G21:** uji dengan penguji sungguhan.

## 6. Aturan khusus S1-S2 (tambahan atas aturan S0)
1. **Snapshot kontrak:** tugas yang menambah ekspor publik di `server/access|metrics|pm/*` atau rute `/app/*` memperbarui `tests/contract-v1.test.ts` pada commit yang sama (tambah baris, jangan hapus). Dua worker di satu gelombang yang sama-sama mengubah snapshot menyebabkan konflik baris: integrator menyelesaikannya saat merge. Perubahan nama atau tanda tangan yang ada = Permintaan Perubahan Kontrak, berhenti dan lapor.
2. **Spesifikasi worker ≤ ±12 KB** (batas pengiriman terbukti di G13); arahan panjang masuk berkas rujukan `/tmp/` yang wajib dibaca.
3. **Berkas bersama** (`app/routes.ts`, `app/routes/app/layout.tsx`, `server/api/app.ts`, `scopes.ts`, `schema.*.ts`) hanya disentuh tugas yang tercantum di §2/§4 dan integrator; selain itu dilarang.
4. **Nama kolom nyata** dibaca dari skema; jangan memakai nama dari dokumen lama (contoh `division` ⇒ `department`).
5. **Dua tugas yang digabung** satu worker tetap dilaporkan terpisah (commit, hasil tes, laporan per tugas) agar bisa dipotong bila perlu.
6. **Merge dan commit koordinator** dilakukan dari worktree terpisah (`/tmp/sp-coord`, cabang `feature/project-management`) karena worktree utama dipakai agen lain.
7. **UI-DoD** (CLAUDE.md + P3 §1): Mantine, `requireUser` pertama, izin dari `can{}` server, `meta()`, `loading`, empty state, `confirmAction`, ikon `1.25em`, `wrap="wrap"`, kartu mobile; tombol utama satu per layar; teks awam tanpa jargon.
8. **Typecheck Eden (RS-2):** catat waktu `typecheck` di S2-03 dan S2-06; bila > 9 detik, hentikan penambahan rute dan eskalasi.

## 7. Gerbang
- **SP-G1 (demo S1, G20):** enam skenario di P3 §6.1 (Nico/Dodi/Renovasi Dapur, anggota, IDOR 404, ukuran teks "Sangat besar", `/profile` mengalihkan). Demo dilakukan user; mesin memeriksa angka (progres 17%, 404 identik, 409 pengelola terakhir).
- **UP-1 (G21):** 5 penguji, sesi 45 menit, tugas T0-T7 (P3 §6.3); lulus bila ≥ 3 penguji berusia ≥ 50 menyelesaikan T1, T2, T4, T5 **tanpa bantuan**. Gagal ⇒ perbaikan ≤ 3 hari dan ulang dengan ≥ 2 penguji baru; S3 tidak dimulai.
- **SP-G2:** S2-17 setelah UP-1 lulus; S3 boleh dimulai (S3 ditunda dari MVP Inti).

## 8. Tugas pengisi opsional (slot kosong, risiko rendah)
Dipakai hanya bila kuota dan perhatian review mengizinkan; tidak ada yang bergantung padanya.
- **T-H1 (G14, hanya tes):** perbaiki ketergantungan urutan antar tes lama (`bun test --randomize` masih 38 kegagalan) dan tambah tes permanen "rute statis `/app/projects/new` didahulukan atas `:projectId`" (bukti #5 yang baru terbukti lewat probe).
- **T-H2 (G19):** rapikan dua pembantu notifikasi (`app/lib/notify.ts` dan `ui/notify`) dan klien API lama vs `http.ts` setelah S1 memakainya.
- **T-H3 (G19):** audit ikon piksel di halaman admin (`size={14|16}`) ke `1.25em` bila relevan.

## 9. Risiko utama
| Risiko | Mitigasi |
|---|---|
| Tipe Eden lambat/rusak dengan ~40 rute (RS-2) | ≤ 10 rute per instance, DTO eksplisit, ukur di S2-03/S2-06 |
| Nama penguji tak kunjung ada (RS-4) | Keputusan #7 diminta paling lambat G18 |
| Skala huruf 1,5 merusak tata letak (RS-6) | QA 3 skala × 3 lebar di S1-14, S1-16, S2-15; dilihat di browser oleh user di CP1/CP2 |
| UAT Google belum dijalankan | Keputusan #5; bila tetap terbuka, demo S1 memakai sesi uji |
| Konflik snapshot kontrak antar worker | Aturan §6 butir 1; integrator menyelesaikan |
| Pengguna mencari tombol Hapus tugas yang memang tidak ada (RS-7) | Keterangan di menu ⋯; dicatat sebagai temuan UP-1 |
| Kehilangan koneksi worker | Commit per langkah; pesan lanjutan lewat terminal berhasil di G9 |
