# Catatan Pagi — Simple PM (poin penting)

> Posisi per 16 Oktober 2026. Sumber: `tahapan-proyek/05-implementasi/PROGRES.md`.

## Apa itu Simple PM
Aplikasi **manajemen proyek untuk tim kecil**, dibuat supaya mudah dipakai orang awam dan lansia (huruf bisa diperbesar, bahasa sehari-hari, ada konfirmasi sebelum menghapus). Dibangun di atas aplikasi template yang sudah jalan, bukan dari nol.

## Posisi sekarang
- **54 dari 93 tugas selesai** (sekitar 58%) dan sudah digabung ke jalur utama.
- Pengujian otomatis: **2.803 lulus, 0 gagal**.
- 11 "gelombang" kerja sudah selesai.
- Analogi rumah: **pondasi, pipa, dan kunci pintu sudah jadi. Ruang tamu dan dapur (layar Proyek dan Tugas) belum dibangun.**

## Yang SUDAH dibuat

**1. Fondasi aman (9/9 selesai)**
- Versi alat dikunci supaya hasil di komputer tim sama dengan di server.
- Server menolak jalan kalau kunci rahasianya lemah.
- Perubahan database dibuat aman bila diulang.
- 7 peringatan keamanan pada pustaka pihak ketiga ditutup (1 kritis, 2 tinggi).

**2. Akun dan hak akses (16/16 selesai)**
- **4 peran**: Super-admin, Admin, Project Manager, Member.
- **Masuk hanya lewat Google** di server produksi (email/password ditutup).
- **Akun baru harus disetujui Admin** dulu. Ada jalur undangan.
- Halaman "Menunggu persetujuan" untuk akun yang belum disetujui.
- Halaman Admin untuk **setujui/tolak akun**, ubah peran, kelola undangan.
- Penanda "N akun menunggu persetujuan" di menu samping.
- Tombol demo anonim dicabut.

**3. Persiapan untuk proyek dan tugas (29/33 selesai)**
- Tempat data **proyek dan tugas** sudah disiapkan di database.
- **Aturan siapa boleh apa** (proyek, anggota, tugas, pemeriksa) sudah jadi kode yang diuji.
- Rumus **kemajuan proyek** dan kondisi proyek (aman / berisiko) sudah jadi.
- **Ukuran huruf Normal / Besar / Sangat besar** sudah tersambung sampai tampilan server.
- Tema warna dan komponen dasar (badge status, tabel, filter, kotak konfirmasi).
- **Kerangka 11 halaman `/app`** (Beranda, Proyek, Tugas, Pengaturan, dll.) dan menunya, masih kosong.
- **Data contoh "Atlas"** untuk mencoba tampilan.

## Yang AKAN dibuat

**Langkah dekat (sisa 4 tugas fondasi)**
- Query keanggotaan proyek, koreksi dokumen panduan, README, lalu **gerbang `contract-v1`**. Gerbang ini butuh **persetujuan kamu** sebelum S1 dan S2 jalan.

**S1 — Proyek dan profil (18 tugas, belum mulai)**
- Daftar proyek, detail proyek (ringkasan), buat dan ubah proyek.
- Kelola anggota proyek.
- Hapus proyek ke **Tempat Sampah** dan bisa dipulihkan.
- Halaman Pengaturan: profil dan pilihan ukuran huruf.

**S2 — Tugas inti (17 tugas, belum mulai)**
- Daftar tugas dan form tugas baru.
- Alur status: Mulai, Selesai, Buka lagi, Batalkan, Pulihkan.
- Daftar periksa, komentar, dan riwayat per tugas.
- Tab Tugas di dalam detail proyek.
- **Uji pengguna**: minimal 3 dari 5 orang berusia 50+ bisa memakainya tanpa dibantu.

**Ditunda (di luar versi pertama):** Inbox, jadwal acara, fitur AI.

## Yang perlu diketahui
- **Login Google asli belum diuji ujung ke ujung.** Skrip ujinya sudah disiapkan, tinggal dijalankan pemilik proyek.
- **Penguji lansia masih data contoh.** Orang aslinya harus ditentukan sebelum uji pengguna.
- Perkiraan total versi pertama: **sekitar 128 hari kerja AI, kira-kira 8 minggu** kalender.
