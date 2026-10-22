# Jadwal S3-S8 — Ringkasan 8 rencana menu

> Dibuat 18 Oktober 2026 dari tujuh rencana menu (P4-P10); **P11 (area Admin) ditambahkan 21 Oktober 2026 sebagai lajur paralel.** **Status: RENCANA, belum dieksekusi.** S3 tidak boleh dimulai sebelum gerbang S2 (S2-17) lulus, kecuali pengecualian S3a di bawah yang menunggu persetujuan user. Bila bentrok: `KEPUTUSAN-MVP-INTI.md` > dokumen ini > P4-P11.

## 1. Peta menu → rencana → irisan
| Menu | Rencana | Irisan | Tugas | Estimasi (hari-orang AI) | Migrasi usulan |
|---|---|---|---|---|---|
| Inbox | [P5](rencana/P5-s3-inbox.md) | S3 (S3a boleh lebih awal) | I01-I14 (+2 sketsa S4) | ≈26,5 | 0017 `notification` (+ `notification_pref`) |
| Beranda | [P4](rencana/P4-s3-beranda.md) | S3 | B-01..B-12 | ≈11,25 (+2 reviewer) | – |
| Tugas lanjutan | [P10](rencana/P10-s4-s5-tugas-lanjutan.md) | S4 (15 tugas), S5 (14 tugas) | 29 | ≈51-63 | 0019 (S4), 0020 (S5) |
| Sampah penuh | [P8](rencana/P8-s6-sampah.md) | S6 | Z-01..Z-08 | ≈12-14 | – (Proyek+Tugas) |
| Tim | [P7](rencana/P7-s6-tim.md) | S6 | M01-M10 | ≈13,75 | – |
| Pengaturan lanjutan | [P9](rencana/P9-pengaturan-lanjutan.md) | S6 (+ G2/A8 setelah Inbox/Event) | G-01..G-09 | ≈9,75 | memakai baton 0017 |
| Event | [P6](rencana/P6-s7-events.md) | S7 | E-01..E-16 (13 Should, 3 Could) | ≈13,5 (+7 Could) | 0018 |
| Subtotal lajur produk | | S3-S7 | **≈103 tugas** | **≈138-153** (+ Could) | 0017-0020 |
| **Area Admin** | [P11](rencana/P11-area-admin.md) | **lajur paralel** | AD-01..AD-19 | ≈33 (+4 reviewer) | 0021 |
| **Total** | | | **≈122 tugas** | **≈171-186** (+ Could) | 0017-0021 |

## 2. Urutan yang disarankan
1. **Gerbang S2** (S2-16 penguji nyata → S2-17). Tidak berubah.
2. **S3a** (Inbox I01-I04: tabel, `notify()`, API baca): murni berkas baru, boleh lebih awal **bila user setuju** (P5 P-1).
3. **S3**: Inbox UI + kait ke modul Tugas, lalu Beranda (B-12 menyusul setelah S3a). Beranda dapat rilis sebelum baris "Perlu Anda tanggapi".
4. **S4 → S5** (Tugas lanjutan), berurutan karena migrasi 0019 lalu 0020.
5. **S6**: Sampah penuh (Z), Tim (M), Pengaturan (G-01/G-02 dan hapus akun). Saklar Pemberitahuan (G2) menunggu S3a.
6. **S7**: Event. Boleh mendahului S6 bila Sampah-acara minimal disiapkan (P6 Q-E1).
7. **S8**: pengerasan dan rilis (belum direncanakan di sini).

Lajur paralel yang aman: Tim (S6) tidak bergantung pada Inbox; Pengaturan G-01/G-02 hanya bergantung gerbang S2; Sampah Z (Proyek+Tugas) tidak butuh migrasi.

**Lajur admin ([P11](rencana/P11-area-admin.md)), jalan bersamaan dengan urutan 1-7 di atas** (keputusan user 21 Okt 2026). Urutannya sendiri: Tahap 1 Pengaturan (AD-01..AD-10) → Tahap 2 Proyek + Beranda (AD-11..AD-15) → Tahap 3 Pengguna, Aktivitas, gerbang (AD-16..AD-19). Aman diparalelkan karena berkas yang disentuh tidak beririsan dengan lajur produk. Dua hal yang tetap mengikat: migrasi `0021` (AD-05) ikut antrean baton di §3, dan AD-03 (melonggarkan guard setelan ke Admin) butuh persetujuan user satu per satu, di luar merge per gelombang.

## 3. Titik bersama yang harus diatur koordinator
| Hal | Rincian | Keputusan |
|---|---|---|
| Baton migrasi | 0017 (Inbox) → 0018 (Event) → 0019 (**S5a: Tahapan/milestone**, sudah dipakai) → 0020+ (S4 Tugas lanjutan, lalu Bukti) → **0021 (P11 AD-05: kolom `announcement` + `working_days` di `settings`)**. Satu pemegang baton, dua `db:generate` bersamaan dilarang — berlaku lintas lajur, termasuk lajur admin | tetap aturan README §3 |
| Perubahan kontrak | Menu Event menambah 3 URL `/app/events*` → Permintaan Perubahan Kontrak (13 → 16 URL, ADR baru). Beranda menambah `GET /api/app/home` (tambahan kompatibel). P10 semula tanpa URL baru (Tahapan = seksi di Ringkasan, Papan = `?tampilan=papan`); **Tahapan kini tab sendiri `/app/projects/:id/phases` (keputusan user 19 Okt 2026, S5a): URL `/app` 16 → 17, dicatat di `docs/decisions/0002 §6`** | butuh persetujuan user (Q-E2) |
| `PM_KEY_DENY` | Tambah: `DELETE trash/*`, `DELETE tasks/:id`, hapus acara, Approve/Return | per rencana |
| Berkas sempit | `task.service.ts` 290/300 baris → kait Inbox ≤ 10 baris atau pecah dulu | P5 |
| Sampah multi-jenis | Dipasang lewat registri `TrashKind` (P8) agar Event (S7) dan Lampiran (S5) tinggal mendaftar | P8 |

## 4. Kontradiksi antar rencana (belum diputuskan, default konservatif)
- **Tabel preferensi notifikasi:** P5 menamai `notification_pref`, P9 `notification_preferences`. Pakai satu nama di migrasi 0017 (usulan: `notification_pref`, P5 pemilik).
- **Retensi kartu Inbox:** R07 30 hari vs R12 90 hari → P5 usul 30 hari.
- **Hapus akun:** kode membatasi ke Super-admin; P9 usul tetap sampai uji pengguna.
- **K2 (pemeriksa menyetujui tugasnya sendiri):** kode sudah `SELF_REVIEW`; usul tetap ditolak (P10 Q1).
- **Filter "Orang" di Semua tugas vs D10 (privasi beban):** P7 Q1 — D10 hanya melindungi angka lintas proyek dan menu Tim.

## 5. Keputusan yang dibutuhkan dari user (ringkas, jawaban usulan di tiap rencana)
| # | Pertanyaan | Usulan | Sumber |
|---|---|---|---|
| 1 | S3a Inbox boleh mulai sebelum gerbang S2 lulus? | Ya | P5 P-1 |
| 2 | Tambah 3 URL Event ke `contract-v1` (PCC)? | Ya | P6 Q-E2 |
| 3 | S7 Event boleh mendahului S6 dengan Sampah-acara minimal? | Ya | P6 Q-E1 |
| 4 | Siapa boleh menghapus tugas, dan boleh lewat kunci API? | Pembuat+Pengelola+Admin; kunci API tidak | P8 Q1-Q2 |
| 5 | Pemeriksa boleh menyetujui tugasnya sendiri? | Tidak | P10 Q1 |
| 6 | Bukti: gambar saja atau +PDF 10 MB? | Gambar+PDF | P10 Q3 |
| 7 | Hapus akun sendiri untuk siapa? | Super-admin saja dulu | P9 P-1 |
| 8 | Beranda rilis dua tahap tanpa "Perlu Anda tanggapi" dulu? | Ya | P4 #1 |
| 9 | Lonceng Inbox di sidebar+header mobile (bukan top bar baru)? | Ya | P5 P-2 |
| 10 | Menu Tim ikut uji pengguna lansia? | Ya, satu skenario | P7 Q4 |

Pertanyaan lain yang lebih kecil ada di §10 tiap rencana.
