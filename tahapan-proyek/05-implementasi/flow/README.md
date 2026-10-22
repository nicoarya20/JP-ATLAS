# Flow: inventaris, pencocokan, dan rencana diagram

> Dibuat 16 Okt 2026. Tujuan: seluruh alur Simple PM bisa dipresentasikan kepada audiens yang **belum tentu paham proyek dan tidak teknis**, tanpa ada alur atau perilaku yang tersembunyi ("magic") dan baru ketahuan belakangan. Folder ini adalah **sumber kebenaran untuk diagram**; diagram di Penpot (halaman `diagram flow`) diturunkan dari sini.

## Isi folder
| Berkas | Isi |
|---|---|
| `01-inventaris-penpot.md` | 62 layar, 29 catatan wireframe, 21 aturan tertulis, 17 keganjilan (file Penpot `PM-New`, hanya dibaca) |
| `02-inventaris-kode.md` | rute, endpoint, mesin status, izin, penolakan, aturan otomatis, aksi audit, konfigurasi (dibaca dari kode) |
| `03-inventaris-dokumen.md` | fitur, keputusan, alur, aturan, istilah dari dokumen `tahapan-proyek` |
| `04-pencocokan.md` | **matriks keterlacakan 121 unit**, daftar selisih, rencana **15 diagram (D01-D15)**, **58 kartu aturan (R1-R58)**, metrik kelengkapan, 15 pertanyaan |
| `hitung-kelengkapan.py` | menghitung ulang angka kelengkapan: `python3 -I tahapan-proyek/05-implementasi/flow/hitung-kelengkapan.py` |

Keempat berkas `.md` adalah **dokumen turunan** (dibangkitkan agen, 16 Okt 2026) dan dikecualikan dari batas ukuran berkas. Jangan disunting tangan.

## Hierarki kebenaran (bila sumber bertentangan, yang atas menang)
1. Kode yang berjalan (commit `69277e9`)
2. `KEPUTUSAN-MVP-INTI.md`
3. `PROGRES.md`
4. Rencana P1-P3 dan tinjauan X1-X3
5. Riset R01-R14
6. Wireframe Penpot (desain, bukan kenyataan)

## Angka kelengkapan (dapat dihitung ulang)
- **121 unit alur**: 42 konsisten di tiga sumber, 26 hanya di kode (kandidat "magic"), 31 hanya di desain, 3 hanya di dokumen, 19 saling bertentangan.
- **Status MVP Inti**: 42 dibangun, 45 sedang dibangun (S1/S2), 24 ditunda, 10 tidak direncanakan.
- **Rencana**: 15 diagram dan 58 kartu aturan mencakup **189 dari 195 butir kode (96,9%)**; semua 64 layar Penpot terpetakan. Enam butir yang tidak tercakup memiliki alasan di `04-pencocokan.md` bagian 6.
- 29 klaim berisiko tinggi sudah diverifikasi langsung di kode oleh agen pencocok. Aplikasi **tidak dijalankan**, jadi klaim yang bergantung perilaku runtime ditandai "perlu uji".

## Keputusan pemilik (16 Okt 2026: "pakai semua default")
| # | Keputusan |
|---|---|
| Q1 | Tokoh **Super-admin** dan aturan R1 (peran hilang bila email dicabut dari daftar) masuk diagram (D06) |
| Q2 | Semua diagram memakai **tiga penanda jujur**: berjalan / sedang dibangun / ditunda atau tidak direncanakan |
| Q3 | **Diagram menjadi acuan**; wireframe ditandai "desain awal", koreksinya menyusul |
| Q4 | Kartu **Hapus akun** di `/profile` disembunyikan untuk non-Super-admin (sesuai FIT-17) |
| Q5 | **Uji runtime** N04/N05 (akun Menunggu/Ditolak memanggil endpoint Better Auth; Ditolak hapus diri lalu daftar lagi) sebelum presentasi |
| Q6 | Hapus kalimat "Kami akan memberi kabar lewat email" di `PM_ERRORS.ACCOUNT_PENDING` |
| Q7 | **Beranda** digambar seperti yang ada sekarang (kosong + dua tombol) dengan rencana S3 pudar |
| Q8 | Istilah resmi: **"Diblokir"** dan **"Pengelola utama"** |
| Q9 | Sampah: **tidak berjanji tanggal** pemulihan; tulis "belum dihapus otomatis" |
| Q10 | Mode pemeliharaan: tampilkan apa adanya di kartu R22; pengecualian `/waiting` dan `/banned` di rilis berikut |
| Q11 | **KB-3** (tenggat proyek bebas diubah) dan **KB-12** (status proyek bebas 5 nilai) disetujui |
| Q12 | Kelompok **"Minggu ini"** sampai hari Minggu, dijelaskan di kartu R53 |
| Q13 | Demo dimulai dari **`/login`**, bukan `/` (landing templat) |
| Q14 | Alur **Periksa** (ditunda S4): pudar penuh di diagram internal, disembunyikan di versi untuk pengguna akhir |
| Q15 | Satu "dunia" contoh: **Atlas dan Portal Klien PT Sinar** |

Catatan: persetujuan ini mengubah rencana, tetapi **belum ada kode yang diubah**. Q4, Q5, dan Q6 adalah pekerjaan kode (lihat tabel temuan di bawah) dan baru dikerjakan saat gelombang G15 diluncurkan atas konfirmasi pemilik.

## Temuan yang bukan soal gambar (dilacak di sini)
Status: **belum dikerjakan** kecuali disebut lain. Detail dan bukti di `04-pencocokan.md` bagian 2.
| # | Temuan | Rencana |
|---|---|---|
| N01 | Kalimat "kabar lewat email" di `PM_ERRORS.ACCOUNT_PENDING` menjanjikan email yang tidak ada | Hapus kalimat (Q6) |
| N02 | Wireframe menjanjikan notifikasi padahal mesinnya baru S3 | Koreksi wireframe menyusul (Q3) |
| N03 | Kartu Hapus akun tampil untuk semua orang; anggota proyek ikut terhapus, tanpa pra-cek Pengelola terakhir | Sembunyikan untuk non-Super-admin (Q4); sebaiknya bersama S1-15 (peleburan `/profile`) |
| N04 | Akun Menunggu/Ditolak dapat memanggil endpoint Better Auth non-admin (gerbang hanya menutup `/admin/*`) | Uji runtime (Q5); pertimbangkan gerbang status |
| N05 | Akun Ditolak mungkin bisa hapus diri lalu daftar lagi, catatan penolakan hilang | Uji runtime (Q5) |
| N06 | Saklar "Pendaftaran publik" di `/dev/settings` tidak mencegah pendaftaran di server | Ubah label atau hapus saklar |
| N07 | Mode pemeliharaan menutup `/waiting` dan `/banned` | Dicatat di kartu R22; kecualikan di rilis berikut (Q10) |
| N08 | Akun Menunggu yang emailnya baru masuk daftar Super-admin bisa naik peran namun status tetap Menunggu | Uji runtime; catat sebagai risiko |
| N09 | API khusus Super-admin menjawab 302, bukan JSON 401/403 | Catat untuk S8; bukan untuk audiens |
| N10 | `REASON_REQUIRED` memakai teks "alasan penolakan" juga untuk Kembalikan dan Buka lagi | Perbaiki saat fitur dibangun |
| N11 | Layar `/` dan judul tab masih "Fullstack Template" | Demo dimulai dari `/login` (Q13); narasi di S8 |
| N12 | Dokumen basi: CHANGELOG (tag `contract-v1`), `RANGKUMAN-PRESENTASI.md` ("9 dari 92 tugas"), P3 §6.1, dan beberapa dokumen desain | Koreksi dokumen |
| N13 | Kata tombol: kode "Lanjutkan dengan Google", glosarium dan wireframe "Masuk dengan Google" | Samakan teks |

## Cara membaca diagram yang akan dibuat
- Satu diagram, satu pertanyaan, maksimal sekitar 12 kotak, bahasa sehari-hari, memakai istilah glosarium proyek.
- Jalur bawah **"Yang dilakukan sistem sendiri"** di setiap diagram.
- Aturan yang jalan sendiri ditulis sebagai **kartu aturan bernomor** (R1-R58) dan ditandai pada langkah yang terkena, bukan disembunyikan di panah.
- Tiga gaya: garis tegas = berjalan; ikon palu = sedang dibangun (S1/S2); putus-putus dan pudar = ditunda atau tidak direncanakan.

## Cara memperbarui
Bangkitkan ulang bila ada perubahan kode, keputusan, atau wireframe: (1) inventaris kode dari commit terbaru, (2) inventaris Penpot, (3) inventaris dokumen, (4) pencocokan, lalu jalankan `hitung-kelengkapan.py`. Bagian yang berubah paling cepat adalah status "sedang dibangun" yang berpindah menjadi "berjalan" tiap gelombang S1/S2.

## Status diagram
Belum digambar. Rencana tiga tahap, pemilik memeriksa di antaranya: (1) peta besar dan alur masuk (D01, D07, D06); (2) perjalanan peran dan status (D02-D05, D12-D14); (3) alur modul dan kartu aturan (sisanya). Halaman Penpot tujuan: `diagram flow` (kosong); halaman `WIREFRAME NICO` tidak diubah.
