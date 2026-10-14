# Diskusi & Rencana Kerja: Wireframe 08 · Sampah (per role)

> Tanggal: 13 Oktober 2026. Status: **wireframe PM, Admin, dan Member selesai** (① Daftar, ② Kosong, ③ pesan Urungkan untuk ketiganya, ④ Hapus permanen khusus Admin). Keputusan bertanda "User" sudah dikonfirmasi, sisanya **usulan Claude**.
> Lokasi wireframe: Penpot, file **PM-New**, halaman **WIREFRAME NICO**, bagian **`<Role> · Sampah`** (8080 × 1620) di dalam grup `A · Member`, `B · Project Manager`, `C · Admin`, pada y relatif 22600, di bawah bagian Tim.
> Sumber: `tahapan-proyek/03-desain/erd/diskusi/02-proyek.md` (A2), `03-tugas.md` (#18, matriks izin), `05-events.md` (#11), `tahapan-proyek/02-analisis/hasil-orchestrasi/deliverables/workflow.md` (Sampah global, undo batch). Kalau bertentangan, dokumen ini yang berlaku.

## 1. Keputusan

| # | Keputusan | Asal |
|---|---|---|
| 1 | **Satu halaman Sampah** di menu samping (kelompok bawah, bersama Pengaturan) sebagai satu-satunya tempat memulihkan. Tombol **Hapus** tetap di konteks masing-masing (detail tugas, proyek, event) | User (13 Okt) |
| 2 | Yang masuk Sampah: **Proyek, Tugas, Event**. Semuanya disimpan **30 hari**, lalu hilang selamanya. Alasan satu halaman: item terhapus sudah hilang dari daftarnya, jadi tidak ada halaman detail yang bisa menampung tombol Pulihkan | keputusan modul 02, 03, 05 + Claude |
| 3 | Setelah menghapus, muncul pesan **"... dipindah ke Sampah · Urungkan"** di tempat itu juga, supaya salah ketuk tidak perlu membuka Sampah. Berlaku untuk tugas, proyek, dan event | User |
| 4 | **Hapus proyek** ikut memindahkan tugas dan event di dalamnya, dan **ikut pulih bersamanya**. Tugas atau event yang sudah dihapus sendiri sebelumnya tidak ikut pulih | User |
| 5 | **Hapus permanen** sebelum 30 hari **hanya Admin**, dan selalu meminta konfirmasi (layar ④) | User |
| 6 | **Yang terlihat:** Member hanya item yang **ia hapus sendiri**. PM item yang ia hapus **dan item di proyek yang ia kelola**. Admin semua | User ("sesuai") |
| 7 | **Yang boleh memulihkan** mengikuti aturan yang sudah ada: Admin semua, Pengelola di proyeknya, Anggota hanya yang ia hapus, Pemantau tidak | 03-tugas + Claude |
| 8 | **Pulihkan** mengembalikan item ke keadaan sebelum dihapus (status dan data terakhir) | workflow |
| 9 | Kartu: jenis (Proyek/Tugas/Event), nama, proyek, **dihapus oleh**, tanggal, **sisa hari**. Untuk proyek ada "Termasuk N tugas dan M event". Satu tombol **Pulihkan**; **Hapus permanen** hanya di Admin | Claude |
| 10 | Penyaring jenis satu baris: **Semua · Proyek · Tugas · Event** dengan jumlah. Tidak ada kontrol lain | Claude |
| 11 | **Kolom data tambahan disetujui:** `deleted_by` (di `projects` dan `tasks`) dan `deleted_with_project_id` (di `tasks` dan `events`), supaya kartu bisa menampilkan "Dihapus oleh" dan proyek bisa dipulihkan beserta isinya (#4). Tab Semua/Proyek/Tugas/Event tidak butuh kolom baru karena jenis ditentukan dari tabelnya | User (13 Okt) |
| 12 | **Event berulang:** saat menghapus atau membatalkan event yang berulang, kotak konfirmasi menanyakan dua pilihan besar: **Hanya yang ini** dan **Semua yang berulang**. Bila "Semua yang berulang", seluruh rangkaian masuk Sampah sebagai **satu item** "Sprint review Atlas (tiap 2 minggu)". Event yang tidak berulang tidak berubah. Layar ⑧b di Events | User |
| 13 | **Komentar dan bukti tugas tidak masuk Sampah.** Gantinya, setelah menghapus muncul pesan **Urungkan** beberapa detik (pola yang sama dengan #3), karena bukti dipakai untuk pemeriksaan dan tidak boleh hilang karena salah ketuk | User |
| 14 | **Tugas yang proyeknya masih di Sampah tidak bisa dipulihkan sendiri.** Tombol Pulihkan nonaktif dengan keterangan "Pulihkan proyeknya dulu" dan tautan **Lihat proyeknya** yang menyorot proyek itu di daftar Sampah, supaya user tidak berhenti di tombol mati. Kasus ini muncul bila tugas dihapus sendiri lebih dulu, baru proyeknya dihapus | User + Claude |

## 2. Matriks

| Isi | Admin | Project Manager | Member |
|---|---|---|---|
| Item yang terlihat | Semua | Yang ia hapus + di proyek yang ia kelola | Yang ia hapus |
| Pulihkan | ✅ semua | ✅ yang terlihat | ✅ yang terlihat |
| Hapus permanen | ✅ | ❌ | ❌ |
| Pesan Urungkan setelah menghapus | ✅ | ✅ | ✅ |

## 3. Layar

Frame 1280×800, gaya lo-fi abu-abu sama dengan grup 01–07. Menu samping: **Sampah** aktif.

| No | Layar | Isi |
|---|---|---|
| ① | Sampah · Daftar (default) | Judul Sampah, penyaring **Semua · Proyek · Tugas · Event**, "N item · dihapus otomatis setelah 30 hari", kartu item dengan **Pulihkan** (Admin: juga **Hapus permanen**) |
| ② | Sampah · Kosong | "Sampah kosong" dan "Yang Anda hapus akan disimpan di sini selama 30 hari." |
| ③ | Setelah menghapus: pesan Urungkan | Layar Events dengan pesan gelap di bawah: "Event dipindah ke Sampah" dan **Urungkan** (contoh; pesan sama muncul untuk tugas dan proyek) |
| ④ | Hapus permanen (Admin saja) | Layar ① dengan latar digelapkan dan kotak "Hapus permanen?": isi "Proyek ... beserta 5 tugas dan 1 event akan hilang selamanya. Ini tidak bisa diurungkan." dan tombol **Batal** · **Hapus permanen** |

### Isi contoh (hari ini Rabu 7 Oktober 2026, 30 hari dihitung dari tanggal hapus)

Baris tugas "#7 Cek tombol lama" menunjukkan keputusan #14: proyeknya (Uji coba aplikasi lansia) masih di Sampah, jadi Pulihkan nonaktif.

| Item | Jenis | Dihapus oleh · tanggal · sisa | Dilihat oleh |
|---|---|---|---|
| Rapat coba-coba (tanpa proyek) | Event | Nico · 6 Okt · 29 hari | PM, Admin |
| #21 Tes duplikat login (Atlas) | Tugas | Dodi · 5 Okt · 28 hari | Dodi, PM (Atlas), Admin |
| Uji coba aplikasi lansia (termasuk 8 tugas, 2 event) | Proyek | Nico · 3 Okt · 26 hari | PM, Admin |
| #19 Revisi warna tombol (Atlas) | Tugas | Rina · 1 Okt · 24 hari | PM (Atlas), Admin |
| Portal Klien lama (termasuk 5 tugas, 1 event) | Proyek | Lea · 28 Sep · 21 hari | Admin |
| Latihan presentasi lama (Atlas) | Event | Dodi · 2 Okt · 25 hari | Dodi, PM (Atlas), Admin |
| #7 Cek tombol lama (proyek Uji coba aplikasi lansia, masih di Sampah) | Tugas | Nico · 30 Sep · 23 hari | PM, Admin. Pulihkan nonaktif |

Member (Dodi) melihat 2 item, PM (Nico) 5 item, Admin (Ayu) 6 item (Latihan presentasi lama hanya ada di contoh Member). Nama dan data adalah contoh baru khusus Sampah.

## 4. Data yang dipakai

Memakai kolom yang sudah ada: `projects.deleted_at`, `tasks.deleted_at`, `events.deleted_at` dan `events.deleted_by`. Yang **belum ada dan perlu ditambah** (usulan):

| Usulan | Untuk |
|---|---|
| `projects.deleted_by`, `tasks.deleted_by` (FK `users`, boleh kosong) | Menampilkan "Dihapus oleh" dan membatasi Member ke "yang ia hapus" |
| `tasks.deleted_with_project_id`, `events.deleted_with_project_id` (FK `projects`, boleh kosong) | Memulihkan proyek beserta isinya (#4) tanpa ikut memulihkan item yang dihapus sendiri sebelumnya |
| Tugas harian yang menghapus permanen item dengan `deleted_at` lebih dari 30 hari | Retensi 30 hari |

Sisa hari dihitung (`deleted_at` + 30 hari − hari ini), tidak disimpan.

## 5. Pertanyaan yang sudah dijawab (13 Oktober 2026)

1. Kolom `deleted_by` dan `deleted_with_project_id`: **setuju** (#11). Perlu dituliskan ke `tahapan-proyek/03-desain/erd/project.md`, `tahapan-proyek/03-desain/erd/task.md`, dan `tahapan-proyek/03-desain/erd/event.md` saat ERD-nya digambar.
2. Event berulang: **dua pilihan** Hanya yang ini / Semua yang berulang (#12).
3. Komentar dan bukti: **tidak masuk Sampah**, diganti pesan Urungkan (#13).
4. Tugas yang proyeknya masih di Sampah: **harus pulihkan proyeknya dulu**, dengan tautan Lihat proyeknya (#14).

Masih terbuka: pesan Urungkan untuk komentar dan bukti belum digambar di layar detail tugas (modul 03 tidak diubah dari sini).
