# PROGRES S3-S8 — Status tugas setelah MVP Inti

> Dibuat 18 Oktober 2026. **Berkas ini terpisah dari [`PROGRES.md`](PROGRES.md)** (yang hanya mencatat MVP Inti S0-S2, 91 dari 93 tugas). Jangan menjumlahkan keduanya. Sumber tugas: [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md) dan rencana [`P4`..`P10`](rencana/).

## 1. Status keseluruhan
| Irisan | Menu | Rencana | Tugas | Selesai | Status |
|---|---|---|---|---|---|
| S3 | Inbox | [P5](rencana/P5-s3-inbox.md) | 14 | 0 | rencana selesai, belum dikerjakan |
| S3 | Beranda | [P4](rencana/P4-s3-beranda.md) | 12 | 0 | rencana selesai, belum dikerjakan |
| S4 | Tugas lanjutan (Periksa, dependensi, tag, Papan) | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) | 15 | 0 | rencana selesai, belum dikerjakan |
| S5 | Tugas lanjutan (Tahapan, tenggat, bukti) | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) | 14 | 0 | rencana selesai, belum dikerjakan |
| S6 | Sampah | [P8](rencana/P8-s6-sampah.md) | 8 | 0 | rencana selesai, belum dikerjakan |
| S6 | Tim | [P7](rencana/P7-s6-tim.md) | 10 | 0 | rencana selesai, belum dikerjakan |
| S6 | Pengaturan | [P9](rencana/P9-pengaturan-lanjutan.md) | 9 | 0 | rencana selesai, belum dikerjakan |
| S7 | Event | [P6](rencana/P6-s7-events.md) | 16 | 0 | rencana selesai, belum dikerjakan |
| | **Total** | | **98** | **0** | |

**Syarat sebelum tugas pertama dimulai:**
1. Gerbang S2 lulus (S2-16 uji pengguna nyata, lalu S2-17), kecuali S3a Inbox (I01-I04) bila user menyetujuinya.
2. User menjawab 10 keputusan di [`JADWAL-S3-S8.md`](JADWAL-S3-S8.md) §5.
3. Rencana ini di-merge ke `feature/project-management` atas persetujuan user.

## 2. Gerbang
| Gerbang | Isi | Status |
|---|---|---|
| Gerbang S2 | S2-16 + S2-17 dari `PROGRES.md` | menunggu penguji nyata |
| S3a | Inbox I01-I04 (tabel, `notify()`, API baca) | belum |
| S3 | Demo Inbox dan Beranda; uji pengguna S3 (Beranda ≤10 detik) | belum |
| S4 | Periksa, dependensi, tag, Papan | belum |
| S5 | Tahapan, tenggat, bukti | belum |
| S6 | Sampah, Tim, Pengaturan | belum |
| S7 | Event | belum |
| S8 | Pengerasan dan rilis (belum direncanakan) | belum |

## 3. Migrasi dan kontrak
| Item | Nomor / perubahan | Pemilik | Status |
|---|---|---|---|
| Inbox: `notification`, `notification_pref` | 0017 | I01 | belum |
| Event | 0018 | E-01 | belum |
| Periksa, dependensi, tag | 0019 | L4-01 | belum |
| Tahapan, tenggat, bukti | 0020 | L5-01 | belum |
| Indeks `project_member (project_id, role)` | menurut baton | M05 | belum |
| `contract-v1` + 3 URL Event (13 → 16) | PCC + ADR baru | E-01 | menunggu persetujuan |
| `GET /api/app/home` | tambahan kompatibel | B-06 | belum |

## 4. Daftar tugas per irisan
Aturan pengisian sama dengan `README.md` §5: `berjalan` + cabang saat mulai, `review` + hasil tes saat selesai dikerjakan, `selesai` + hash setelah user menyetujui gelombang, `diblokir` + alasan.


### S3 · Inbox
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| I01 | Skema `notification`, `notification_pref`, migrasi 0017 | belum | – | – | – |
| I02 | Katalog, tipe, penerima | belum | – | – | – |
| I03 | Inti `notify()`, `resolveNotifications()`, `dropForUserInProject()` | belum | – | – | – |
| I04 | Query + API baca/tandai + pengecualian rate limit (**penutup S3a**) | belum | – | – | – |
| I05 | Kait penugasan tugas (buat, ubah penugasan) | belum | – | – | – |
| I06 | Kait transisi status dan komentar | belum | – | – | – |
| I07 | Kait proyek dan anggota | belum | – | – | – |
| I08 | Klien Inbox: API, kunci query, hook hitungan | belum | – | – | – |
| I09 | Lonceng, badge menu, NAV, rute (pemilik tunggal berkas bingkai) | belum | – | – | – |
| I10 | Halaman Inbox | belum | – | – | – |
| I11 | Scheduler pembersih | belum | – | – | – |
| I12 | Kontrak lintas-jalur, keamanan, kinerja, smoke, dokumen | belum | – | – | – |
| I13 | Integrasi dan gerbang demo S3-Inbox | belum | – | – | – |
| I14 | (Opsional, Should) Kartu "Pengguna baru menunggu persetujuan" | belum | – | – | – |

### S3 · Beranda
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| B-01 | DTO, konstanta, salinan, pekan, dan ringkasan murni | belum | – | – | – |
| B-02 | Query Sekilas dan Selesai minggu ini | belum | – | – | – |
| B-03 | Query Fokus saya | belum | – | – | – |
| B-04 | Query Proyek saya (kondisi + progres) | belum | – | – | – |
| B-05 | Layanan komposit `getHome` dan seam Inbox | belum | – | – | – |
| B-06 | Endpoint `GET /api/app/home` | belum | – | – | – |
| B-07 | Klien Beranda (API, kunci, fixture) | belum | – | – | – |
| B-08 | UI blok atas: Sapaan, Ringkasan, Kartu Admin, baris tanggap, Sekilas | belum | – | – | – |
| B-09 | UI blok bawah dan halaman: Fokus, Proyek saya, Selesai minggu ini, `home.tsx` | belum | – | – | – |
| B-10 | Kinerja: seed, hitungan query, EXPLAIN | belum | – | – | – |
| B-11 | QA tiga skala, smoke, dokumen | belum | – | – | – |
| B-12 | Jahitan Inbox: nyalakan baris tanggap dan kalimat ② | belum | – | – | – |

### S4 · Tugas lanjutan (Periksa, dependensi, tag, Papan)
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| L4-01 | Migrasi 0019: Periksa, dependensi, tag [MIG]* | belum | – | – | – |
| L4-02 | Aturan dependensi murni | belum | – | – | – |
| L4-03 | Pengurai mention murni | belum | – | – | – |
| L4-04 | Service dan rute dependensi + "Giliran Anda" | belum | – | – | – |
| L4-05 | Service dan rute Periksa (aktivasi T7) | belum | – | – | – |
| L4-06 | Service dan rute tag | belum | – | – | – |
| L4-07 | Perakitan rute S4 + scope + penjaga (SP-S4a) | belum | – | – | – |
| L4-08 | Klien API S4 | belum | – | – | – |
| L4-09 | UI Periksa | belum | – | – | – |
| L4-10 | UI Tertahan dan dependensi | belum | – | – | – |
| L4-11 | UI Tag | belum | – | – | – |
| L4-12 | Papan | belum | – | – | – |
| L4-13 | Mention di komentar | belum | – | – | – |
| L4-14 | Kartu Inbox "Terlambat" (T16) | belum | – | – | – |
| L4-15 | Smoke, QA, dokumen, gerbang S4 | belum | – | – | – |

### S5 · Tugas lanjutan (Tahapan, tenggat, bukti)
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| L5-01 | Migrasi 0020: Tahapan, tenggat, bukti [MIG]* | belum | – | – | – |
| L5-02 | Kondisi proyek: ≥ 12 kasus tabel | belum | – | – | – |
| L5-03 | Tahapan dan milestone (service + rute) | belum | – | – | – |
| L5-04 | Perpanjang tenggat dan override kondisi | belum | – | – | – |
| L5-05 | Kelola jenis tugas | belum | – | – | – |
| L5-06 | Pengenal tipe berkas (magic bytes) murni | belum | – | – | – |
| L5-07 | Bukti: unggah, daftar, unduh | belum | – | – | – |
| L5-08 | Perakitan rute S5 + scope + penjaga (SP-S5a) | belum | – | – | – |
| L5-09 | Klien API S5 | belum | – | – | – |
| L5-10 | UI Tahapan dan milestone | belum | – | – | – |
| L5-11 | UI Perpanjang tenggat dan kondisi | belum | – | – | – |
| L5-12 | UI Bukti | belum | – | – | – |
| L5-13 | UI kelola jenis tugas | belum | – | – | – |
| L5-14 | Smoke, QA, dokumen, gerbang S5 | belum | – | – | – |

### S6 · Sampah
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| Z-01 | Kebijakan, kode galat, audit, penolakan kunci API · Dep: – · S (1) | belum | – | – | – |
| Z-02 | Hapus tugas ke Sampah (backend) · Dep: Z-01 · M (1,5) · PARALEL dgn Z-03, Z-04 | belum | – | – | – |
| Z-03 | Daftar Sampah gabungan + pulihkan tugas · Dep: Z-01 · L (2) · PARALEL | belum | – | – | – |
| Z-04 | Hapus permanen (Admin) · Dep: Z-01 · M (1,5) · PARALEL | belum | – | – | – |
| Z-05 | Purge otomatis 30 hari · Dep: Z-04 · M (1,5) | belum | – | – | – |
| Z-06 | UI halaman Sampah (daftar, penyaring, pulihkan, hapus permanen) · Dep: Z-03 (kontrak API), Z-04 untuk tombol · L (2,5) | belum | – | – | – |
| Z-07 | UI hapus tugas dengan Urungkan (T1) · Dep: Z-02, Z-03 (endpoint restore) · M (1,5) · PARALEL dgn Z-06 | belum | – | – | – |
| Z-08 | Gerbang S6-Sampah: uji lintas, dokumen, demo · Dep: Z-05, Z-06, Z-07 · S (1) · titik sinkron | belum | – | – | – |

### S6 · Tim
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| M01 | Kebijakan murni visibilitas Tim (D10) | belum | – | – | – |
| M02 | Kueri Tim (orang, peran, beban, ringkasan) ≤ 4 kueri | belum | – | – | – |
| M03 | Rute daftar `GET /api/app/team` + tes privasi per peran | belum | – | – | – |
| M04 | Rute detail `GET /api/app/team/:userId` | belum | – | – | – |
| M05 | Migrasi indeks `project_member (project_id, role)` — *sinkron: pemegang baton* | belum | – | – | – |
| M06 | Halaman daftar Tim + NAV + rute | belum | – | – | – |
| M07 | Halaman detail orang | belum | – | – | – |
| M08 | A7 — Pra-cek hapus akun pengelola tunggal | belum | – | – | – |
| M09 | A8 — Pengaturan tim Admin: pengingat acara bawaan *(BERSYARAT: setelah S7 Events; Could)* | belum | – | – | – |
| M10 | Demo, smoke, dokumen kontrak (integrator) | belum | – | – | – |

### S6 · Pengaturan
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| G-01 | Rapikan Lanjutan → "Keamanan dan perangkat" | belum | – | – | – |
| G-02 | Pra-cek penghalang hapus akun (server) | belum | – | – | – |
| G-03 | UI hapus akun (T3) untuk pengguna sesuai keputusan | belum | – | – | – |
| G-04 | Hook server `before delete` (penegakan semua jalur) | belum | – | – | – |
| G-05 | Saklar Pemberitahuan (API + kartu) | belum | – | – | – |
| G-06 | Efek saklar di Inbox & pengingat (titik sinkron S3a/S4) | belum | – | – | – |
| G-07 | Pengaturan tim: pengingat acara bawaan (A8) | belum | – | – | – |
| G-08 | Form Event membaca bawaan tim (titik sinkron S4) | belum | – | – | – |
| G-09 | QA, smoke, dokumen, gerbang | belum | – | – | – |

### S7 · Event
| ID | Tugas | Status | Cabang | Hash | Catatan |
|---|---|---|---|---|---|
| E-01 | Skema acara + migrasi 0018 + Permintaan Perubahan Kontrak | belum | – | – | – |
| E-02 | Kebijakan akses & kemampuan acara | belum | – | – | – |
| E-03 | Servis & kueri acara (CRUD, peserta, batal) | belum | – | – | – |
| E-04 | Pengingat T-1 hari & T-30 menit + kait notifikasi | belum | – | – | – |
| E-05 | Notulensi ketik dengan kunci optimis | belum | – | – | – |
| E-06 | Rute API acara + pemetaan scope | belum | – | – | – |
| E-07 | Hapus ke Sampah + Urungkan + ikut hapus proyek | belum | – | – | – |
| E-08 | Klien, kunci kueri, dan komponen bersama acara | belum | – | – | – |
| E-09 | Halaman Daftar Acara | belum | – | – | – |
| E-10 | Form 2 tahap | belum | – | – | – |
| E-11 | Detail acara, peserta, notulensi, Agenda Beranda | belum | – | – | – |
| E-12 | Integrasi, README kontrak, CHANGELOG — Integrator · S7 · S · 0,75 hari · dep E-06..E-11 · ★ SP-E3 | belum | – | – | – |
| E-13 | Tugas dari rapat (E4, Could) | belum | – | – | Could; geser bila waktu tidak cukup |
| E-14 | Kalender Bulan/Minggu (E5, Could) | belum | – | – | Could |
| E-15 | QA, smoke, uji gerbang S7 | belum | – | – | – |
| E-16 | Acara berulang (E6, Could) | belum | – | – | Could |


## 5. Log merge per gelombang
| Gelombang | Tugas | Hash | Tanggal |
|---|---|---|---|
| (belum ada) | | | |

## 6. Log perubahan
- **18 Okt 2026** — Berkas dibuat dari tujuh rencana menu (run `run_ae24b153ade5`). Semua tugas berstatus `belum`.
