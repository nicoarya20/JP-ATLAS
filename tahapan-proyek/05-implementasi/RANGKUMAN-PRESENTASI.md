# Rangkuman Pekerjaan Simple PM

> Per 15 Oktober 2026. Ditulis dengan bahasa sehari-hari untuk bahan presentasi. Angka diambil dari `PROGRES.md`, `KEPUTUSAN-MVP-INTI.md`, dan laporan riset di folder ini.

## 1. Simple PM itu apa?
Aplikasi **manajemen proyek untuk tim kecil**, dirancang supaya **mudah dipakai orang awam dan lansia**: huruf bisa diperbesar, bahasanya sehari-hari, tombolnya jelas, dan selalu ada konfirmasi sebelum sesuatu dihapus. Nantinya menjadi bagian dari JP-Atlas.

Kami tidak membangun dari nol. Simple PM dibangun di atas fondasi aplikasi yang sudah berjalan (login, hak akses, penyimpanan data), lalu fitur proyek dan tugas ditambahkan di atasnya.

## 2. Hasil dalam angka
| Yang dihasilkan | Jumlah |
|---|---|
| Laporan riset (keamanan, data, tampilan, jadwal, dll.) | 14 |
| Tinjauan silang untuk mencocokkan laporan | 3 |
| Rencana kerja terperinci | 3 |
| **Tugas yang siap dikerjakan** | **92** |
| Peran pengguna | 4 |
| Perkiraan usaha untuk versi pertama (MVP Inti) | ±128 hari kerja asisten AI, sekitar **8 minggu** kalender |
| Tugas yang sudah dikerjakan | **5 dari 92** (1 sudah masuk, 4 menunggu persetujuan digabung) |
| Pengujian otomatis | dari 687 menjadi **770 lulus, 0 gagal** |

## 3. Yang sudah kami kerjakan
**Tahap 1 — Memahami dan merancang.** Rancangan lama dipelajari: tampilan layar di Penpot, catatan fitur, dan rancangan data. Empat belas bidang diriset **serentak oleh asisten AI**: keamanan, struktur data, tampilan layar, kemudahan untuk lansia, jadwal, pengujian, dan lainnya.

**Tahap 2 — Menyaring dan memutuskan.** Hasil riset saling diperiksa. Ditemukan puluhan hal yang tidak cocok antar laporan (misalnya dua laporan menyebut angka berbeda untuk hal yang sama). Semuanya dirangkum menjadi satu daftar pertanyaan bagi pemilik produk, dan sudah dijawab.

**Tahap 3 — Menyusun rencana kerja.** Seluruh pekerjaan dipecah menjadi 92 tugas kecil. Tiap tugas punya urutan, batas pekerjaan, dan syarat selesai yang bisa diuji.

**Tahap 4 — Mulai membangun.** Gelombang pertama berisi 4 tugas fondasi (lihat bagian 6).

## 4. Keputusan penting
- **Versi pertama hanya yang inti:** login dan hak akses, proyek, dan tugas. Inbox, jadwal acara, dan fitur AI menyusul belakangan.
- **Empat peran:** Super-admin, Admin, Project Manager, dan Member. Masing-masing punya wewenang berbeda.
- **Masuk hanya dengan akun Google**, dan akun baru harus **disetujui Admin** (atau sudah diundang lebih dulu).
- **Menghapus proyek dibatasi:** hanya Super-admin, Admin, dan Project Manager pengelola proyek itu. Proyek yang terhapus masuk **tempat sampah** dan bisa dipulihkan.
- **Tampilan ramah lansia:** ukuran huruf Normal, Besar, atau Sangat besar, dipilih sendiri oleh pengguna.
- **Fokus layar komputer dan tablet.** Tampilan HP disempurnakan oleh rekan tim.
- **Uji nyata sebelum melangkah:** versi tugas baru dianggap lulus kalau minimal 3 dari 5 orang berusia 50+ bisa memakainya tanpa dibantu.

## 5. Temuan penting
- **Tiga celah keamanan di fondasi yang sudah ada** (misalnya pendaftaran lewat email masih terbuka). Sudah dijadwalkan ditutup di tahap akun.
- **Tujuh peringatan keamanan pada pustaka pihak ketiga** (1 kritis, 2 tinggi). Perbaikannya sudah ada dan dijadwalkan.
- **Contoh data di rancangan keliru:** kemajuan proyek tertulis 70%, padahal hitungannya 17%. Dikoreksi sebelum dipakai.
- **Estimasi naik** dari 71–101 menjadi sekitar 128 hari kerja setelah dirinci. Lebih jujur dan lebih bisa dipercaya.

## 6. Pekerjaan teknis pertama (4 tugas fondasi)
| Tugas | Manfaat bagi pengguna dan tim |
|---|---|
| **Mengunci satu versi alat pembangun** | Semua orang dan server memakai versi yang sama, jadi tidak ada lagi "di komputer saya jalan, di server tidak". |
| **Memeriksa kekuatan kunci rahasia aplikasi** | Server menolak berjalan jika kunci rahasianya masih contoh atau terlalu pendek. Mencegah kelalaian yang berbahaya. |
| **Pembuat perubahan database yang aman** | Setiap perubahan struktur database otomatis dibuat aman bila diulang dan dijaga aturan. Mencegah data rusak saat pembaruan. |
| **Perintah khusus untuk memperbarui database** | Pembaruan database di server dilakukan secara sengaja dan terkendali, bukan otomatis bersamaan oleh banyak server. |

Hasilnya: keempat tugas dikerjakan di ruang kerja terpisah, **digabung percobaan tanpa bentrok**, dan seluruh pengujian hijau (770 lulus, 0 gagal).

## 7. Cara kami bekerja
- **Tim asisten AI bekerja paralel**, masing-masing di ruang kerja sendiri. **Manusia yang memutuskan dan menyetujui**, dan tidak ada yang digabung atau dikirim tanpa persetujuan.
- **Setiap hasil diperiksa ulang secara independen**, tidak sekadar percaya laporan asistennya: cabang kerja, batas berkas, dan pengujian dicek sendiri.
- **Aturan keamanan selalu berjalan:** pemindaian rahasia sebelum menyimpan perubahan dan laporan jaminan sebelum mengirim ke GitHub.
- **Kendala yang kami temui:** saat 14 asisten dijalankan bersamaan, jatah penggunaan AI habis dan 8 di antaranya berhenti di tengah jalan. Solusinya: peluncuran bertahap 2–3 asisten, hasil disimpan berkala, dan dipantau di setiap peluncuran. Setelah itu berjalan stabil.

## 8. Posisi sekarang dan langkah berikutnya
**Sekarang:** 4 tugas fondasi selesai dan teruji, menunggu persetujuan untuk digabung ke jalur utama.

**Berikutnya:**
1. Fondasi lanjutan: pembaruan pustaka yang rawan, penyelarasan versi tampilan, dan penjaga pengujian.
2. **Akun dan hak akses** (login Google, persetujuan Admin, undangan) bersama **kontrak dasar data dan aturan izin**.
3. **Proyek dan Tugas**, yaitu fitur yang pertama terlihat oleh pengguna, lalu uji dengan lima orang berusia 50+.

**Yang masih dibutuhkan dari tim:** lima penguji berusia 50+ (saat ini masih data contoh), satu peninjau kedua untuk bagian keamanan, desain logo Simple PM yang baru, dan keputusan alamat repositori rilis.

## 9. Catatan jujur
- **Belum ada fitur yang terlihat pengguna.** Yang sudah selesai adalah rencana dan fondasi. Fitur Proyek dan Tugas dikerjakan setelah fondasi siap.
- **Estimasi ±8 minggu masih kasar** dan bisa bergeser.
- **Hasil uji dengan penguji contoh tidak dihitung.** Syarat lulus baru terpenuhi setelah diuji dengan orang sungguhan.

## Kamus kecil
- **MVP:** versi pertama yang paling inti tetapi sudah bisa dipakai.
- **Merge / digabung:** hasil kerja satu cabang dimasukkan ke jalur utama setelah disetujui.
- **Migrasi database:** pembaruan struktur tempat data disimpan.
- **Asisten AI (agent):** program AI yang mengerjakan satu tugas tertentu di ruang kerjanya sendiri.
