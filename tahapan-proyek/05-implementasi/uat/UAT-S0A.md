# UAT S0.a — Akun dan akses (skrip uji manual)

> 16 Oktober 2026 · gerbang akhir S0.a (S0A-15). Dijalankan **oleh manusia**, tanpa Playwright dan tanpa skrip peramban. Tujuan: memastikan satu cerita utuh berjalan di layar sungguhan: orang yang diundang langsung masuk, orang yang tidak diundang menunggu, Admin memutuskan, dan batas wewenang bertahan. Tes otomatis sudah hijau; skrip ini menguji hal yang tidak bisa dibuktikan tes: login Google sungguhan dan tampilan.
>
> Jangan menaruh kata sandi, token, atau rahasia di dokumen ini. Tulis hasil di kolom **Hasil** (lulus/gagal) dan catatan singkat bila gagal.

## A. Prasyarat

| # | Yang disiapkan | Catatan |
|---|---|---|
| A1 | Server lokal jalan: `bun run dev`. **Restart** `bun run dev` bila sebelumnya sudah menyala sebelum menarik cabang ini | Dev server `--hot` tidak selalu memuat ulang plugin dan hook baru (gerbang `/api/auth/*`, hook pendaftaran) |
| A2 | `.env` lokal: `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` terisi | Kredensial OAuth dari Google Cloud Console |
| A3 | Di Google Console, **Authorized redirect URI** = `<BETTER_AUTH_URL>/api/auth/callback/google` | Contoh dev: `http://localhost:3000/api/auth/callback/google` |
| A4 | `SUPER_ADMIN_EMAILS` berisi email Google milik Anda (mis. akun **S**) | Email harus sudah terverifikasi di Google. Setelah mengubah `.env`, restart dev server |
| A5 | `ALLOWED_EMAIL_DOMAINS` **kosong** | Kosong = semua domain boleh mencoba masuk |
| A6 | Tiga akun Google uji, selain akun S: **Admin** (A), **Bu Ani** (B, akan diundang), **Orang Asing** (C, tidak diundang) | Pakai akun uji milik sendiri. Jangan memakai data orang sungguhan di dokumen ini |
| A7 | Satu akun Google uji ke-4 (D) untuk skenario penolakan (boleh memakai ulang C bila basis data dibersihkan) | Opsional bila C dipakai untuk skenario 4 dan 5 |
| A8 | Peramban dengan profil terpisah per akun (atau jendela privat) | Supaya sesi tidak saling menimpa |

Catat email yang dipakai (tulis di buku catatan Anda, bukan di berkas ini): S, A, B, C.

## B. Menyiapkan akun Admin

| # | Langkah | Hasil yang diharapkan | Hasil (lulus/gagal) |
|---|---|---|---|
| B1 | Buka `/login` dengan akun S → **Lanjutkan dengan Google** | Masuk, lalu dibawa ke `/dev` (Super-admin) | |
| B2 | Buka `/dashboard/users`, tab **Undangan**, isi email akun A, peran **Admin**, tekan **Buat undangan** | Undangan muncul di daftar dengan status aktif | |
| B3 | Keluar dari akun S. Masuk dengan akun A lewat Google | Langsung masuk, dibawa ke `/dashboard` (tanpa menunggu persetujuan) | |

## C. Skenario inti

### Skenario 1 — Admin mengundang Bu Ani, Bu Ani masuk sebagai Member

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 1.1 | Sebagai Admin (A), buka `/dashboard/users` → tab **Undangan** | Terlihat tab **Persetujuan**, **Semua pengguna**, **Undangan** | |
| 1.2 | Isi **Email orang yang diundang** = email Bu Ani (B), **Peran** = Member, tekan **Buat undangan** | Muncul pemberitahuan sukses; undangan B tampil dengan status aktif | |
| 1.3 | Coba undang email B lagi | Ditolak dengan pesan jelas (undangan aktif sudah ada) | |
| 1.4 | Di jendela lain, masuk dengan akun B lewat Google | Dibawa ke `/app` (tidak ke `/waiting`) | |
| 1.5 | Kembali sebagai Admin, muat ulang tab **Undangan** | Undangan B berstatus terpakai | |
| 1.6 | Di tab **Semua pengguna** cari B | B berperan **Member**, status disetujui | |
| 1.7 | Sebagai B, buka alamat `/dashboard` | Dialihkan ke `/app` (lihat juga Skenario 6) | |

### Skenario 2 — Orang tanpa undangan melihat `/waiting`

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 2.1 | Masuk dengan akun C lewat Google | Dibawa ke `/waiting`; judul "Akun Anda menunggu persetujuan", email C tampil | |
| 2.2 | Di `/waiting` tekan **Cek lagi** | Pemberitahuan "Akun Anda masih menunggu persetujuan."; tetap di `/waiting` | |
| 2.3 | Sebagai C, buka langsung `/app` | Dialihkan kembali ke `/waiting` (bukan halaman kosong atau putaran tanpa henti) | |
| 2.4 | Sebagai C, buka `/api/app/whoami` di peramban | Jawaban galat (403) dengan kode `ACCOUNT_PENDING`; tidak ada data | |
| 2.5 | Sebagai Admin, lihat menu samping | Menu **Pengguna** memuat angka oranye (jumlah menunggu) | |

### Skenario 3 — Admin menyetujui, "Cek lagi" membawa ke `/app`

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 3.1 | Sebagai Admin, buka `/dashboard/users`, tab **Persetujuan** | Akun C ada di antrean | |
| 3.2 | Tekan **Setujui** pada C, pilih peran **Member** | Dialog konfirmasi; setelah konfirmasi, C hilang dari antrean dan muncul pemberitahuan sukses | |
| 3.3 | Sebagai C (jendela yang masih di `/waiting`), tekan **Cek lagi** | Dibawa ke `/app` | |
| 3.4 | Angka oranye di menu **Pengguna** | Berkurang satu (hilang bila antrean kosong; tab **Persetujuan** menulis "Tidak ada yang menunggu persetujuan") | |

### Skenario 4 — Penolakan menampilkan alasan

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 4.1 | Masuk dengan akun D (baru, tanpa undangan) | Dibawa ke `/waiting` | |
| 4.2 | Sebagai Admin, tab **Persetujuan**, tekan **Tolak** pada D | Muncul isian **Alasan penolakan** | |
| 4.3 | Coba kirim dengan alasan kosong atau 2 karakter | Ditolak dengan pesan (alasan 3–200 karakter) | |
| 4.4 | Isi alasan, mis. "Email ini bukan milik anggota tim kami.", konfirmasi | Pemberitahuan sukses; D hilang dari antrean | |
| 4.5 | Sebagai D, tekan **Cek lagi** (atau muat ulang `/waiting`) | Judul "Pendaftaran Anda ditolak" dan kotak "Alasan dari Admin" berisi alasan yang diketik | |
| 4.6 | Sebagai D, buka `/app` | Tetap dialihkan ke `/waiting`; tidak ada akses | |
| 4.7 | (Opsional) Admin menyetujui D di **Semua pengguna** dengan filter ditolak, lalu D menekan **Cek lagi** | D masuk ke `/app` (akun ditolak boleh disetujui kemudian) | |

### Skenario 5 — Admin tidak bisa memblokir Admin

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 5.1 | Buat Admin kedua (A2) dengan cara B2–B3, atau naikkan satu Member menjadi Admin lewat akun S di `/dev/users` | Ada dua Admin | |
| 5.2 | Sebagai Admin A, buka tab **Semua pengguna**, cari A2, buka menu aksinya | Aksi **Blokir akun…** tidak bisa dipakai; alasan tertulis: "Hanya super-admin yang dapat mengubah Admin." | |
| 5.3 | Sebagai A, cari baris akun A sendiri | Aksi atas diri sendiri juga tidak tersedia (alasan tertulis) | |
| 5.4 | Sebagai A, cari akun Super-admin S | Tertulis bahwa Super-admin dikelola lewat `SUPER_ADMIN_EMAILS` dan tidak bisa diubah di sini | |
| 5.5 | Sebagai akun S di `/dev/users`, blokir A2 | Berhasil setelah konfirmasi (Super-admin boleh). Buka blokir kembali | |

### Skenario 6 — Member membuka `/dashboard`

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 6.1 | Sebagai Bu Ani (B, Member), ketik `/dashboard` di peramban | Dialihkan ke `/app` | |
| 6.2 | Ketik `/dashboard/users` | Dialihkan ke `/app` | |
| 6.3 | Ketik `/dev` | Dialihkan ke `/app` | |
| 6.4 | Buka `/api/admin/users` di peramban | Galat (bukan daftar pengguna) | |

### Skenario 7 — Super-admin melihat antrean di `/dev/users`

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 7.1 | Pastikan ada satu akun baru menunggu (masuk dengan akun Google lain, atau tunda Skenario 3) | Akun itu `pending` | |
| 7.2 | Sebagai S, lihat menu samping bagian "Area lain" | Tautan **Antrean persetujuan** (deskripsi "Akun baru yang menunggu persetujuan") yang membuka `/dashboard/users` | |
| 7.3 | Lihat menu **Users** (`/dev/users`) | Penanda oranye "N akun menunggu persetujuan", didahulukan dari penanda "diblokir" | |
| 7.4 | Setelah antrean kosong | Penanda hilang, tampilan seperti semula | |

## D. Pemeriksaan produksi (butuh terminal)

Jalankan di server atau binary berstatus produksi (`NODE_ENV=production`, mis. `bun run build` lalu `bun run start`, atau binary `simple-pm`). Ganti `<URL>` dengan alamat server uji. **Jangan** mengarahkan perintah ini ke produksi sungguhan kecuali sudah disepakati.

| # | Perintah / langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| D1 | `curl -i -X POST <URL>/api/auth/sign-up/email -H 'content-type: application/json' -d '{"email":"uji@example.test","password":"contoh-1234","name":"Uji"}'` | `404` (tidak ada akun dibuat) | |
| D2 | `curl -i -X POST <URL>/api/auth/sign-in/email -H 'content-type: application/json' -d '{"email":"uji@example.test","password":"contoh-1234"}'` | `404` | |
| D3 | `curl -i <URL>/api/auth/admin/list-users` | `404` | |
| D4 | Buka `<URL>/login` | Hanya tombol **Lanjutkan dengan Google**; tidak ada form email dan tidak ada tab Daftar | |
| D5 | Cek basis data: tidak ada akun baru dari D1 | Tidak ada baris dengan email contoh | |
| D6 | (Opsional) Buat API key milik Admin di `/profile`; panggil `curl -i -X POST <URL>/api/admin/users/<id>/approve -H 'X-API-Key: <key>'` | `403` "Endpoint ini tidak bisa diakses dengan API key" | |

## E. Pemeriksaan tambahan (opsional)

| # | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| E1 | Isi `ALLOWED_EMAIL_DOMAINS=contoh.id`, restart, masuk dengan Google domain lain | Dikembalikan ke `/login` dengan pesan "Email ini tidak diizinkan masuk. Hubungi Admin." Kosongkan lagi setelahnya | |
| E2 | Di dev (bukan produksi), daftar dengan email+kata sandi lewat `/login` | Akun dibuat sebagai Member menunggu persetujuan (kecuali email diundang) | |
| E3 | Undang email, lalu **Cabut** sebelum dipakai; orang itu masuk | Masuk sebagai menunggu (`/waiting`), bukan langsung disetujui | |
| E4 | Admin memblokir Member; Member membuka `/app` | Dialihkan ke `/banned` (bukan `/waiting`) | |

## F. Penutup

| Butir | Isi |
|---|---|
| Penguji dan tanggal | |
| Cabang / commit yang diuji | |
| Jumlah lulus / gagal | |
| Temuan (nomor langkah + apa yang terlihat) | |
| Keputusan | ☐ Setuju merge (M1) ☐ Perbaiki dulu |

Catatan: hasil UAT ini **tidak** menggantikan gerbang S2 (uji pengguna dengan penguji nyata berusia ≥50); itu terpisah.
