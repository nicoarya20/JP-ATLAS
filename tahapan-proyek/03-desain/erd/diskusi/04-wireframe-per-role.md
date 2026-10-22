# Wireframe per role: Member · Project Manager · Admin

> Tanggal: 8 Oktober 2026. Lokasi: Penpot, file **PM-New**, halaman **WIREFRAME NICO**.
> Latar belakang: grup 01–04 (Login, Proyek, Tugas, Beranda) berisi layar dari semua role yang tercampur. Atas permintaan user, wireframe dipisah per role, **gambar penuh tiap layar per role**.
> Grup lama 01–04 **tidak dihapus** (tinggal dihapus user setelah hasil per role diterima).

## Keputusan user

| # | Keputusan |
|---|---|
| 1 | Tiga role: **Member**, **Project Manager (PM)**, **Admin**. Tiap role punya satu grup berisi layarnya sendiri |
| 2 | Layar yang sama untuk beberapa role digambar penuh di tiap role (salinan), bukan dipakai bersama |
| 3 | Login ①–③ disalin ke tiap role |
| 4 | **Impor CSV dan Unduh CSV boleh dipakai Member** (supaya bisa membuat banyak tugas sekaligus). Pemantau tetap tidak. Sudah diubah di `tahapan-proyek/03-desain/erd/task.md`, `tahapan-proyek/03-desain/erd/diskusi/03-tugas.md`, dan grup 03 |
| 5 | Beranda dibuat 3 versi (isi per role, lihat di bawah). Acuan: `tahapan-proyek/04-prototype/prototype/01-beranda-gabungan.html` |
| 6 | Layar Admin baru dibuat sekarang: **Persetujuan user** dan **Kelola peran** |

## Grup di Penpot

Ketiganya di halaman WIREFRAME NICO, di sebelah kanan grup 01–04, x awal ≈ 10000, 22800, 35600 (jarak antar grup 12800). Ukuran 12200 × 14400 (Admin 12200 × 16200). Posisi absolut bisa bergeser karena user menata ulang kanvas; pakai nama grup.

| Grup | Tokoh contoh | Bagian di dalamnya (y relatif) |
|---|---|---|
| `A · Member — Wireframe` | Dodi | Login (400) · Beranda (3120) · Proyek (5420) · Tugas (9800) |
| `B · Project Manager — Wireframe` | Nico | sama |
| `C · Admin — Wireframe` | Ayu | sama, ditambah Persetujuan user dan Kelola peran di sebelah kanan Beranda (x 1740 dan 3380, y 3120) |

## Siapa melihat apa

| Layar | Member | PM | Admin |
|---|---|---|---|
| Login ①②③ | ✅ | ✅ | ✅ |
| Proyek ① daftar | hanya proyek yang diikuti, tanpa "+ Proyek baru" | semua, ada tombol | semua, ada tombol |
| Proyek ② kosong | ✅ | tidak tersedia | tidak tersedia |
| Proyek ③–⑦ buat proyek | tidak tersedia | ✅ | ✅ |
| Proyek ⑧–⑪ detail | tanpa tombol ubah (kecuali ditunjuk Pengelola) | ubah di proyek yang dikelola, hanya baca di proyek lain | ubah di semua proyek |
| Proyek ⑫ perpanjang tenggat | tidak tersedia | ✅ proyek yang dikelola | ✅ |
| Tugas ① ② ③ ④ daftar, Papan | ✅ (data Dodi) | ✅ | ✅ (data Ayu) |
| Tugas ⑤ ⑥ buat tugas | ✅, tombol Perlu diperiksa hanya bisa dinyalakan | ✅ | ✅ |
| Tugas ⑦ Impor CSV | ✅ | ✅ | ✅ |
| Tugas ⑧ ⑨ ⑩ detail | tugas Dodi (#16, #18, #17), tanpa Setujui/Kembalikan, tombol periksa terkunci | ✅ | ✅ |
| Tugas ⑪ modal | Kembalikan tidak tersedia, Batalkan hanya tugas sendiri | ✅ | ✅ |
| Tugas ⑫ pengaturan | tidak tersedia | ✅ proyek yang dikelola | ✅ |
| Persetujuan user, Kelola peran | – | – | ✅ (baru) |

## Beranda per role

| Bagian | Member (Dodi) | PM (Nico) | Admin (Ayu) |
|---|---|---|---|
| Sekilas | tugas Anda yang aktif/selesai | proyek yang saya kelola | Proyek berjalan 4 · Tugas terlambat 2 · Menunggu persetujuan 2 |
| Briefing A | hal milik sendiri | termasuk proyek yang dikelola | 2 pengguna menunggu, 1 proyek terlambat |
| My Focus B | tugas saya | tugas saya + baris **Periksa** (menunggu diperiksa saya) | baris **Setujui 2 pengguna baru** di atas |
| Ask Data C | tanpa "Siapa paling banyak tugas?" | lengkap | lengkap |
| Completed / Activity | milik sendiri | tim proyek yang dikelola | seluruh sistem (versi gambar masih contoh yang sama dengan PM) |
| Menu samping | tanpa Pengguna | tanpa Pengguna | ditambah **Pengguna** (badge jumlah menunggu) |

Layar Admin baru:
- **Persetujuan user:** filter Menunggu / Disetujui / Ditolak / Dinonaktifkan, kartu user (foto, nama, email, profil yang diisi), pilih peran awal (default Member), tombol **Setujui** dan **Tolak** (alasan wajib, tampil ke user saat ia mencoba masuk).
- **Kelola peran:** daftar user dengan peran (Admin / Project Manager / Member), tombol Nonaktifkan. Aturan: Admin terakhir tidak bisa diturunkan atau dinonaktifkan.

## Yang berubah di dokumen
- `tahapan-proyek/03-desain/erd/task.md` dan `tahapan-proyek/03-desain/erd/diskusi/03-tugas.md`: izin CSV untuk Anggota, dan aturan `needsReview` pada CSV.
- `tahapan-proyek/03-desain/erd/user-profile.md`: item "layar admin untuk peran project_manager belum ada wireframe" kini punya wireframe.

## Belum dikerjakan / perlu diketahui
1. **Panah dan keterangan** Beranda per role dan antar layar Admin baru hanya sebagian (Beranda Admin → Persetujuan ↔ Kelola peran). Panah Login/Proyek/Tugas ikut tergandakan dari grup aslinya.
2. **Beranda PM dan Member:** isi data memakai contoh prototype (Hajatan Keluarga, Renovasi Dapur) yang berbeda dari data Atlas di layar Proyek/Tugas. Belum diseragamkan.
3. **Latest Activity dan Completed untuk Admin** masih contoh yang sama dengan PM.
4. Ekspor PNG frame Beranda per role sering kehabisan waktu di server Penpot (frame besar). Verifikasi dilakukan per elemen dan lewat ekspor bagian lebih kecil.
5. Grup 01–04 campur-role belum dihapus (menunggu keputusan user).
