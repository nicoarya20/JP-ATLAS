# Diskusi: Wireframe & ERD 01 · Login, Registrasi & Beranda

> Tanggal: 7 Oktober 2026.
> Lokasi hasil: Penpot, file **PM-New**
> - Halaman **WIREFRAME NICO**, grup `01 · Login, Registrasi & Beranda — Wireframe`
> - Halaman **ERD NICO**, grup `01 · Login & Registrasi — ERD`
> - Dokumen ERD: `erd/user-profile.md`

---

## 1. Permintaan awal

Buat wireframe login dengan alur:

1. Tampilan awal: user diarahkan ke halaman **Login** yang menampilkan nama PM dan tombol **login dengan akun Google**.
2. User yang **baru pertama kali login** diarahkan ke tampilan **Profil** dengan tulisan **menunggu persetujuan admin**.
3. User yang **sudah terdaftar** langsung masuk ke **Beranda**.

Ditambah **ERD untuk user dan profilnya**. Gaya wireframe mengikuti gambar referensi "Login, Registrasi dan Home" (kanvas abu-abu, frame putih berjajar, panah dengan keterangan di antara layar, tampilan lo-fi abu-abu).

## 2. Keputusan selama diskusi

| # | Keputusan | Asal |
|---|---|---|
| 1 | Login **hanya** dengan akun Google, tanpa form email/password | Permintaan user |
| 2 | User baru masuk dengan status **menunggu persetujuan admin**, belum bisa membuka Beranda | Permintaan user |
| 3 | Halaman ERD NICO yang lama (35 tabel, termasuk `User`, `AuthIdentity`, `Session`) **dihapus manual oleh user**. ERD dibuat ulang **satu per satu, beriringan dengan wireframe**, supaya alurnya jelas | Permintaan user |
| 4 | Penomoran grup di wireframe dan ERD **disamakan** (01, 02, …). Nomor layar ①–④ di wireframe dipakai juga di tabel ERD | Usulan Claude, mengikuti keputusan #3 |
| 5 | Frame dibuat **ukuran desktop** (1280×800), bukan HP seperti referensi, karena prototype Beranda yang sudah ada berbentuk dashboard desktop | Asumsi Claude, belum dikoreksi user |
| 6 | Nama PM belum ada, ditulis **"[Nama PM]"** | Asumsi Claude |
| 7 | Data login dan data diri **dipisah** menjadi tabel `users` dan `profiles` | Usulan Claude |

## 3. Wireframe (halaman WIREFRAME NICO)

### Layar

| No | Layar | Isi |
|---|---|---|
| ① | Login | Kiri: area ilustrasi/gambar. Kanan: logo, "[Nama PM]", tagline "Kelola proyek tim dengan mudah", judul "Masuk ke akun Anda", tombol **Masuk dengan Google**, catatan "Belum punya akun? Cukup masuk dengan Google. Akun baru perlu disetujui admin sebelum bisa dipakai.", tautan Bantuan · Kebijakan Privasi |
| ② | Pilih Akun Google | Layar milik Google (ditampilkan hanya untuk menjelaskan alur): pilih akun, "Gunakan akun lain", dan pemberitahuan bahwa nama, email, dan foto dibagikan ke [Nama PM] |
| ③ | Profil · Menunggu Persetujuan | Top bar tanpa menu (hanya logo, Keluar, avatar). Banner "Akun Anda menunggu persetujuan admin" + chip status **Menunggu**. Form Profil Saya: foto dari Google (bisa diganti), nama lengkap*, email (dari Google, tidak bisa diubah), nama panggilan, No. HP, jabatan, divisi, pilihan **ukuran teks** (Normal / Besar / Sangat besar). Tombol **Cek status** dan **Simpan profil**. Catatan: belum ada menu lain sebelum akun disetujui |
| ④ | Beranda | Top bar (cari, notifikasi, avatar), menu samping (Beranda, Inbox, Proyek, Tugas, Events, Tim, Sampah, Pengaturan), sapaan "Selamat pagi, Nico", 4 zona: A Briefing harian, B Fokus saya, C Tanya data, D Agenda & proyek. Isi detail mengikuti `prototype/01-beranda.html` |

### Alur (panah)

| Dari → Ke | Kondisi |
|---|---|
| ① → ② | Klik "Masuk dengan Google", user diarahkan ke halaman Google |
| ② → ③ | Login pertama: akun dibuat dengan status menunggu, nama/email/foto diambil dari Google. User yang masih menunggu juga diarahkan ke sini |
| ② → ④ | User sudah terdaftar dan disetujui admin |
| ① → ④ | Saat aplikasi dibuka, sesi login masih berlaku: langsung ke Beranda tanpa login ulang |
| ③ → ④ | Setelah admin menyetujui, login berikutnya langsung ke Beranda |
| ② → ① (putus-putus) | Akun ditolak / dinonaktifkan admin: kembali ke Login dengan pesan "Akses ditolak" beserta alasannya |

## 4. ERD (halaman ERD NICO)

Rincian kolom ada di `erd/user-profile.md`. Ringkasnya:

**`users`**: identitas login dan hak akses, hanya diubah oleh sistem dan admin.
`id`, `email` (unik), `google_sub` (unik, kunci pencocokan login), `role` (admin · member → diperbarui jadi admin · project_manager · member, lihat 02-proyek.md), `status` (pending · approved · rejected · suspended), `approved_by` (→ users.id), `approved_at`, `rejection_reason`, `last_login_at`, `created_at`, `updated_at`.

**`profiles`**: data diri yang diisi user sendiri di layar ③.
`id`, `user_id` (→ users.id, unik), `full_name`, `display_name`, `avatar_url`, `phone`, `job_title`, `department`, `text_size` (normal · besar · sangat_besar), `created_at`, `updated_at`.

**Relasi**
- `users` 1 ─ 1 `profiles`: setiap user punya tepat satu profil.
- `users.approved_by` N ─ 0..1 `users.id`: admin yang menyetujui user lain.

**Alasan dipisah:** `users` menentukan siapa boleh masuk, `profiles` berisi data diri. Dengan begitu form Profil tidak bisa ikut mengubah `role` atau `status`.

**Alasan `google_sub`, bukan email, sebagai kunci login:** email di akun Google bisa berubah, sedangkan `sub` tetap.

### Status user → layar tujuan

| Kondisi di database | Yang dilakukan sistem | Layar tujuan |
|---|---|---|
| `google_sub` belum ada di `users` | Login pertama. Buat `users` (status = pending) dan `profiles` dari data Google | ③ Profil · Menunggu |
| `status = pending` | Perbarui `last_login_at` | ③ Profil · Menunggu |
| `status = approved` | Perbarui `last_login_at`, buat sesi login | ④ Beranda |
| `status = rejected / suspended` | Tidak membuat sesi | ① Login + pesan akses ditolak (`rejection_reason`) |
| Admin menyetujui (di menu admin) | `status → approved`, isi `approved_by` dan `approved_at` | Login berikutnya langsung ④ Beranda |

## 5. Usulan untuk segmen awam/lansia

- Tombol login besar dan hanya satu pilihan (Google), tanpa password yang harus diingat.
- Pesan menunggu persetujuan memakai bahasa polos dan menjelaskan apa yang bisa dilakukan sambil menunggu.
- Kolom `text_size` dan pilihan ukuran teks di layar Profil. Masih **usulan**, belum diputuskan.

## 6. Kendala teknis selama pengerjaan

| Kendala | Penyebab | Penyelesaian |
|---|---|---|
| MCP Penpot error "No Penpot instance connected for user token" padahal plugin sudah aktif | `.mcp.json` membaca `${PENPOT_TOKEN}` dari environment, bukan dari `.env`. Sesi Claude dijalankan tanpa variabel itu, jadi token yang terkirim kosong | Jalankan ulang Claude dengan `set -a; source .env; set +a; claude --dangerously-skip-permissions --continue` |
| "The Penpot plugin tab appears to be suspended by the browser" | Browser menidurkan tab Penpot yang tidak aktif | Klik/fokus tab Penpot dan biarkan terbuka selama Claude menggambar |
| Gagal menggambar di WIREFRAME NICO ("Cannot modify a page that is not currently active") | User sedang membuka halaman ERD NICO, plugin hanya bisa mengubah halaman yang aktif. Satu kotak uji "TEST" sempat terbuat di ERD NICO | Kotak "TEST" dihapus. ERD digambar dulu di halaman yang aktif, lalu Claude pindah ke WIREFRAME NICO |

## 7. Belum diputuskan

1. **Nama PM**: masih "[Nama PM]".
2. **Ukuran frame**: desktop (sekarang) atau perlu versi HP juga?
3. **Admin pertama**: usulan, daftar email admin awal dari env (`INITIAL_ADMIN_EMAILS`) yang langsung dibuat `role = admin`, `status = approved`.
4. **Kolom wajib di Profil**: apakah No. HP, jabatan, dan divisi wajib diisi sebelum admin bisa menyetujui?
5. **Batas domain email**: hanya email kantor, atau semua akun Google?
6. **Riwayat keputusan admin**: kalau butuh jejak lengkap, perlu tabel tambahan `user_approval_logs`.
7. **Ukuran teks (`text_size`)**: dipakai atau tidak.
8. **Layar admin** untuk menyetujui/menolak user belum dibuat wireframe-nya.

## 8. Langkah berikutnya

- Modul berikutnya dibuat dengan pola yang sama: grup bernomor **02, 03, …** di WIREFRAME NICO dan grup dengan nomor yang sama di ERD NICO.
- Kandidat modul 02: layar admin "Persetujuan user", karena alur 01 bergantung padanya.
