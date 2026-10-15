# Keputusan MVP Inti (S0-S2) — sumber kebenaran untuk perencanaan eksekusi

> Tanggal: 15 Oktober 2026. Dikonfirmasi user dengan jawaban: **"ikut saran semua, Q10 4 hari"**, atas dua pilihan lingkup ("Inti B saja dulu", "gelombang 2 bertahap") dan kuesioner di `tinjauan/X2-keputusan-domain.md` §2A serta pertanyaan di `tinjauan/X1-keputusan-teknis.md` §4.
> Bila dokumen ini bentrok dengan laporan riset (`riset/R01..R14`) atau tinjauan (`tinjauan/X1..X3`), **dokumen ini yang berlaku**. Bila bentrok dengan dokumen desain (`03-desain/`), dokumen ini juga berlaku (lihat X2 §2B untuk daftar dokumen yang perlu disunting).

## 1. Lingkup
**MVP = pilihan B "Inti": S0 (S0.0 prasyarat ops, S0.a akun dan akses, S0.b kontrak beku), S1 (Proyek + profil), S2 (Tugas inti).** Estimasi terhitung ulang (X3 §2c): ±75-112 hari-orang AI, 5-9 minggu kalender. S3 ke atas (Inbox, Beranda, Periksa, dependensi, tag, Papan, Tahapan, tenggat, bukti, Sampah, Tim, Events, AI, template, CSV, cuti) **ditunda**; kontrak S0-S2 tidak boleh menutup jalan ke sana.

## 2. Jawaban kuesioner X2 (semua "ikut saran" = pilihan (a))
| No | Keputusan |
|---|---|
| Q1 | Semua orang memakai WIB; satu zona tunggal lewat konstanta `APP_TIME_ZONE` |
| Q2 | Siapa saja boleh mencoba masuk lewat Google; tanpa undangan harus disetujui Admin. `ALLOWED_EMAIL_DOMAINS` kosong = semua |
| Q3 | Wajib akun Google; keluarga/Admin membantu membuatkan. Email+kata sandi hanya di dev lokal |
| Q4 | Akun anonim (demo) lama ditandai `rejected` saat migrasi (alasan "demo dimatikan"); pembersih demo yang ada menghapusnya |
| Q5 | Tidak ada tugas tanpa proyek: `task.project_id` NOT NULL. Member baru baru bisa membuat tugas setelah diajak ke proyek |
| Q6 | Pengerja (juga Admin) tidak boleh menyetujui hasil sendiri; "Minta diperiksa" ditolak dengan pesan jelas bila tidak ada orang lain. Fitur Periksa baru S4 |
| Q7 | PM yang bukan anggota proyek: boleh melihat saja, tanpa berkomentar |
| Q8 | Email: sesama anggota proyek. HP: pemilik dan Admin saja. Pemilihan anggota hanya menampilkan nama dan jabatan |
| Q9 | Super-admin yang menyamar: aksi merusak (hapus, ubah peran) diblokir |
| **Q10** | **Peninjau manusia ≥ 4 hari per minggu (jawaban user: 4 hari).** Saran peninjau kedua khusus S0.b dan keamanan **diterima**; orangnya belum disebut |
| Q11 | Detail tugas = halaman penuh `/app/tasks/:id` (juga sesuai wireframe Penpot) |
| Q12 | Proyek Selesai/Dibatalkan/Ditunda: tugas tetap boleh ditambah dan diubah; hanya Sampah yang mengunci. Tampilkan catatan lembut |
| Q13 | Ukuran huruf awal akun baru = Normal; dipilih di Profil |
| Q14 | Gerbang S2: ≥3 dari 5 penguji berusia ≥50 selesai tanpa bantuan; rilis S8: ≥4 dari 5 dalam ≤3 menit. **Nama/kelompok penguji BELUM disebut** (butuh sebelum akhir S2) |
| Q15-Q22 | Semua pilihan (a) sesuai saran X2 (Inbox, Events, retensi log, lampiran gambar+PDF maks 10 MB, UU PDP ditinjau sebelum S8, beban Tim). Berlaku untuk S3+, tidak memengaruhi kode S0-S2 |
| D1-D12 | Berlaku semua (X2 §2A "Default yang dipakai") |

## 3. Jawaban pertanyaan teknis X1 (§4)
| No | Keputusan |
|---|---|
| X1-Q1 | Hapus tugas/event/lampiran ke Sampah **tanpa dialog** (tombol Urungkan ±10 detik + Sampah 30 hari). Hapus proyek, keluarkan anggota, ubah peran, hapus permanen tetap berdialog. **Mengubah** `CLAUDE.md` bagian UX §1. Karena Sampah baru S6, **S2 tidak memasang hapus tugas** |
| X1-Q2, Q6 | Skala teks 1 / 1,25 / 1,5, berlaku untuk seluruh app (satu provider) |
| X1-Q3 | Mantine diselaraskan ke 9.6.3 persis (patch-only); 9.7.x sesudah S2 |
| X1-Q4 | Sama dengan Q4 di atas (`rejected`) |
| X1-Q5 | **Dianggap**: migrasi 0000-0013 BELUM pernah dijalankan di produksi sungguhan. Rencana migrasi tetap append-only (0014-0016); penggenerasian ulang diizinkan sampai tag rilis pertama. *Fakta ini belum dikonfirmasi eksplisit oleh user; bila ternyata sudah pernah, hentikan dan tanyakan sebelum menyentuh migrasi.* |
| X1-Q7 | Teks `09-pengaturan.md:60` diubah: `ai_enabled` bawaan MATI, kuncinya baru dibuat saat fitur AI (fase 5) |
| X1-Q8 | Narasi editorial README diubah di akhir (S8) oleh integrator, setelah kalimatnya disetujui user |
| X1-Q9 | API key dilarang menghapus proyek, mengelola anggota, mengubah profil/foto (`PM_KEY_DENY`, dipangkas ke rute S0-S2); boleh membuat dan mengubah tugas |

## 4. Keputusan teknis X1 yang berlaku (D1-D10, detail di X1 §2)
D1 Mantine pin 9.6.3 + `@mantine/dates` + `dayjs` hanya untuk `DateInput` (grid kalender buatan sendiri, ditunda) · D2 `theme.scale` dari cookie `mk-text-size`, breakpoint terskala · D3 `ai_enabled` mati · D4 daftar berkas/rute kanonik (R04 server, R05 halaman, R02 skema) · D5 gerbang 401 di `derive` · D6 migrasi 0014 akun (S0.a), 0015 proyek, 0016 tugas (S0.b) lewat wrapper berguard · D7 kolom lama `timestamp`, tabel baru `timestamptz`, sesi DB UTC · D8 urutan perbaikan test: `app-routes` rekursif → ratchet → `installAuthSpies` → konversi 13 berkas `mock.module` (wajib sebelum `contract-v1`) → patch `schema-introspect` · D9 12 koreksi `CLAUDE.md` + kontrak README + CHANGELOG · D10 `PM_KEY_DENY`.

## 5. Masih terbuka
1. **Nama/kelompok 5 penguji ≥50 tahun** (Q14): dibutuhkan sebelum akhir S2.
2. **Siapa peninjau kedua** untuk S0.b dan keamanan (disetujui, belum bernama).
3. **X1-Q5**: konfirmasi bahwa produksi sungguhan belum pernah memakai migrasi lama.
4. Temuan keamanan fondasi (R12) dimasukkan ke S0.a sesuai R10; `proxy-addr` (critical) dan dua high (MCP SDK, `source-map-js`) belum ditangani: pembaruan dependensi aman dijadwalkan di S0.0 kecuali user menyatakan lain.
5. Tiga bagian X3 kosong (ringkasan, risiko, sumber) dan R01 bagian 3-7: diganti oleh rencana tahap 2 (`rencana/P1`).
