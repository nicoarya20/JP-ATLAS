# UJI MANDIRI MVP 1 — gerbang rilis

> Dibuat 23 Oktober 2026 atas keputusan user: **gerbang "≥3 dari 5 penguji nyata berusia ≥50" dicopot dari MVP 1** dan dipindah ke gerbang rilis ke pengguna luar (S8, lihat [`../HUTANG.md`](../HUTANG.md) H-F). Penggantinya adalah uji mandiri ini: **user sendiri menjalankan seluruh menu `/app` sampai tuntas**, bukan sekadar memastikan datanya bukan data contoh.
>
> **Kenapa bukan "datanya sudah real":** audit 22 Okt membuktikan halaman bisa menampilkan data sungguhan dan tetap rusak. Kolom **Tenggat** berubah jadi "—" dan **Gantt** kosong begitu daftar diambil ulang oleh klien (`PRJ-01`/`T-01`). Halaman pertama dari server selalu benar — yang rusak hanya muncul **setelah** kamu mencari, mengganti filter, atau menekan "Tampilkan lebih banyak". Karena itu tiap skenario di bawah **wajib menyentuh cari/filter/muat-lagi**, bukan hanya membuka halaman.

## Syarat sebelum mulai

| # | Syarat | Kenapa |
|---|---|---|
| 1 | **Dua akun**: satu `project_manager` (atau Admin) dan satu `member` | Member **tidak bisa membuat proyek** (`canCreateProject` → `isPmOrAbove`, `server/access/project.policy.ts:42`). CRUD tugas pun butuh keanggotaan proyek, bukan role global (`canCreateTask`, `task.policy.ts:105`). Satu akun member saja tidak bisa menutup gerbang ini |
| 2 | Akun member **sudah dimasukkan** ke minimal satu proyek | Di luar proyek, member dapat `NOT_MEMBER` dan layar akan terlihat "kosong" padahal benar |
| 3 | Data cukup untuk memaksa paginasi: **≥15 tugas**, **≥10 proyek**, **≥10 acara** | Dengan 1–2 baris, tombol "Tampilkan lebih banyak" tidak muncul dan bug pengambilan-klien tidak akan ketahuan |
| 4 | Tiga bug ini sudah diperbaiki lebih dulu | `PRJ-01`/`T-01` (Eden), `PRJ-02` (header tidak segar), `PD-01` (Gantt macet). Tanpa ini sesi uji habis untuk menemukan ulang yang sudah tertulis di [`../audit/`](../audit/) |

**Di luar lingkup gerbang ini:** area `/dashboard` (Admin) dan `/dev` (Super-admin). Tujuh layar Admin masih pratinjau dengan angka contoh (lihat `../rencana/P13-admin-data-nyata.md`), jadi tidak boleh ikut dinilai.

## Cara mengisi

Kolom **Hasil**: `lulus` / `gagal`. Bila gagal, tulis satu baris apa yang terjadi di kolom Catatan, lalu daftarkan sebagai bug di [`../audit/`](../audit/) folder yang sesuai. **Gerbang lulus bila UM-1..UM-8 semuanya `lulus`** — satu `gagal` berarti MVP 1 belum ditutup.

Jalankan di **dua lebar layar**: desktop dan HP (atau jendela browser dipersempit ke 375 px). Standar mobile wajib di `CLAUDE.md` — kalau ada yang meluber keluar layar atau tombol tidak bisa ditekan, itu `gagal`.

---

## UM-1 · Beranda (`/app`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Buka `/app` sebagai member | Sapaan memakai nama panggilan dan waktu sekarang (pagi/siang/sore/malam), tanggal hari ini | | |
| Baca **Daily Briefing** | Isinya cocok dengan keadaan sungguhan: bila ada tugas terlambat, disebut; bila tidak ada, "Tidak ada yang mendesak hari ini" | | |
| Lihat tiga kartu hitung (Unassigned / In Progress / Completed) | Angkanya cocok bila kamu buka menu Tugas dan hitung sendiri | | |
| Tekan **Selesai** (atau **Mulai kerjakan**) di My Focus | Tugasnya benar-benar berubah statusnya, layar memuat ulang, kartu menyesuaikan | | |
| Tekan tiga tombol **Ask Data** | Tiap jawaban cocok dengan data proyekmu (periksa satu lawan menu Proyek) | | |
| Matikan jaringan sebentar lalu tekan **Coba lagi** di satu bagian | Bagian itu gagal-lunak dengan pesan, bukan layar putih | | |

## UM-2 · Inbox (`/app/inbox`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Picu kabar nyata: minta akun satunya menugaskanmu sebuah tugas | Kartunya muncul di **Kabar terbaru** dengan titik belum dibaca | | |
| Lihat lonceng di sidebar dan angka di menu Inbox | Angka di lonceng, menu, dan tab **Perlu Anda tanggapi** sama persis | | |
| Tekan tombol di satu kartu | Membuka tugas/acara/proyek yang benar **dan** menandainya sudah dibaca | | |
| Tekan **Tandai semua dibaca** | Semua titik hilang, angka lonceng jadi 0 | | |
| Tekan **Muat lebih banyak** sampai habis | Tidak ada kartu ganda, tidak ada yang hilang | | |

## UM-3 · Proyek (`/app/projects`) — **butuh akun PM/Admin**

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Sebagai **member**: buka `/app/projects` | Hanya proyek yang kamu ikuti yang tampil; tombol **Proyek baru** tidak ada | | |
| Sebagai **PM/Admin**: buat proyek baru lengkap dengan tanggal mulai dan tenggat | Tersimpan, muncul di daftar dengan tenggat yang benar | | |
| **Ketik di kolom cari, lalu hapus ketikannya** | Kolom **Tenggat** tetap berisi tanggal — **bukan "—"**. Ini jebakan `PRJ-01` | | |
| Ganti ke tampilan **Gantt**, lalu ganti filter | Batang proyek tetap tergambar — **bukan "Belum ada tanggal"** | | |
| Coba isi tenggat dengan tahun salah ketik (mis. 2062) | Ditolak dengan pesan, atau Gantt tetap bisa dibaca — **tidak membeku** (`PD-01`) | | |
| Buka detail proyek → **Ubah proyek** → ganti nama dan status | Header di atas **langsung berubah** tanpa perlu muat ulang (`PRJ-02`) | | |
| Buka keempat tab: Ringkasan, Tugas, Tahapan, Anggota | Tiap tab berisi data proyek itu, bukan kosong atau salah proyek | | |
| Tambah anggota, lalu keluarkan anggota | Dialog konfirmasi muncul; daftar anggota berubah | | |
| Hapus proyek (akun PM-Pengelola/Admin) | Dialog menyebut dampaknya (jumlah tugas dan acara); proyek pindah ke Sampah | | |

## UM-4 · Tugas (`/app/tasks`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Sebagai member di proyeknya: buat tugas baru dengan tenggat dan penanggung jawab | Tersimpan; muncul di daftar dan di tab Tugas proyek | | |
| **Ganti filter (status/proyek/tenggat), lalu kembalikan** | Kolom tenggat tetap tanggal — **bukan "—"** (`T-01`) | | |
| Tekan **Tampilkan lebih banyak** sampai habis | Tidak ada tugas ganda atau hilang | | |
| Buka detail tugas → ubah status lewat tombol langkah berikutnya | Status berubah, riwayat bertambah satu baris yang benar | | |
| Buka riwayat tugas yang tenggatnya pernah diubah | Riwayat tampil utuh — **tidak error** (`T-02`) | | |
| Tulis komentar dan centang checklist | Tersimpan dan tetap ada setelah muat ulang | | |
| Hapus tugas | Langsung terhapus **tanpa dialog**, muncul pesan dengan tombol **Urungkan**; tekan Urungkan → tugas kembali utuh | | |
| Coba ubah tugas di proyek yang **tidak** kamu ikuti (ketik URL-nya langsung) | Ditolak, bukan malah bisa | | |

## UM-5 · Events (`/app/events`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Buat acara baru (tahap 1 saja: judul, waktu, lokasi, peserta) | Jam selesai otomatis +1 jam, kamu otomatis jadi peserta | | |
| Buat satu lagi lewat **Tambahkan rincian** (jenis, proyek, tautan, agenda, pengingat) | Semuanya tersimpan dan tampil di detail | | |
| Ganti tab **Akan datang** / **Sudah lewat**, pakai cari dan saringan jenis + proyek | Pengelompokan Hari ini / Besok / Kemarin benar; acara yang **sedang berlangsung** tetap di Akan datang | | |
| Batalkan satu acara dengan alasan | Acara tetap ada dengan lencana **Dibatalkan** dan alasannya terbaca peserta | | |
| Hapus satu acara | Pindah ke Sampah + tombol **Urungkan**; Urungkan mengembalikan beserta pesertanya | | |
| Buka detail acara | Catat bila kamu butuh **Ubah acara** / kelola peserta — UI-nya memang belum ada (H-D3g) | | |

## UM-6 · Tim (`/app/team`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Buka `/app/team` | Daftar orang sungguhan; urutan Nama dan "Tugas aktif terbanyak" dua-duanya benar | | |
| Pakai kolom cari | Hasil menyempit dengan benar, tidak ada baris rusak | | |
| Buka profil satu orang (`/app/team/:userId`) | Data orang itu, tugas aktifnya cocok dengan menu Tugas | | |
| Sebagai member, lihat kartu orang lain | Peran akun hanya tampil bagi Admin/Super-admin | | |

## UM-7 · Sampah (`/app/trash`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Buka `/app/trash`, periksa keempat tab (Semua, Proyek, Tugas, Event) beserta jumlahnya | Jumlah tiap tab cocok dengan isinya | | |
| Lihat kartu | Ada jenis, judul, nama proyek, siapa yang menghapus, tanggal, dan **Sisa N hari** | | |
| Pulihkan satu tugas | Kembali ke proyeknya dalam keadaan utuh | | |
| Coba pulihkan tugas yang **proyeknya masih di Sampah** | **Pulihkan** nonaktif + "Pulihkan proyeknya dulu." + tombol **Lihat proyeknya** yang menyorot proyek itu | | |
| Pulihkan proyek, lalu periksa tugas dan acaranya | Ikut kembali bersama proyeknya | | |

## UM-8 · Pengaturan (`/app/settings`)

| Langkah | Hasil yang diharapkan | Hasil | Catatan |
|---|---|---|---|
| Buka **Ubah profil**, ganti nama panggilan, simpan | Sapaan di Beranda ikut berubah | | |
| Ganti foto profil | Foto baru tampil di sidebar dan menu Tim | | |
| Ganti ukuran teks (Normal / Besar / Sangat besar) | Seluruh `/app` ikut membesar, tidak ada tombol yang terpotong atau meluber | | |
| Geser saklar **Pemberitahuan**, lalu picu kabar jenis itu | Kabar yang dimatikan benar-benar **tidak** masuk Inbox | | |
| Tekan **Keluar** | Dialog konfirmasi muncul lebih dulu, lalu benar-benar keluar | | |
| *(sementara)* Buka bagian **Cuti** | Catat saja apa adanya — alur ini akan dibongkar oleh `../rencana/P14-cuti-status-admin.md`, jadi **tidak menggugurkan gerbang** | | |

---

## Hasil

| | |
|---|---|
| Tanggal uji | |
| Penguji | user (uji mandiri) |
| Lulus / gagal | |
| Bug baru yang ditemukan | (daftarkan ke `../audit/`) |

**Setelah gerbang ini lulus:** lanjut ke sisa H-A di [`../HUTANG.md`](../HUTANG.md) — `smoke:binary` + `smoke:coldboot` (butuh Bun 1.4.2), `bun audit`, CHANGELOG berversi, lalu tag rilis.
