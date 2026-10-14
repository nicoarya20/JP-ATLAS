# Alur Pemakaian 6 USP: Peran, Menu, dan Langkah Detail

**Turunan dari:** `gabungan-core-menu-dan-usp-langkah-lanjut.md` (bagian 5).
**Segmen:** orang awam / lansia, dengan pendamping (anak, keluarga, admin).
**Status:** rancangan. Peran, menu, dan angka default di bawah adalah **usulan saya**, belum ada di riset dan belum diuji ke pengguna.

---

## 1. Kerangka Bersama

### 1.1 Peran

| Peran | Siapa | Punya akun? | Tugas utama di USP |
|---|---|:-:|---|
| **Pemilik** | Orang awam/lansia yang tugasnya dikelola | Ya (ringan) | Mengirim tugas, menjawab tombol, mencentang |
| **Pendamping** | Anak, keluarga, atau admin yang memasang dan biasanya membayar | Ya | Mengatur urutan dan aturan, menerima kabar dan eskalasi, menjawab permintaan |
| **Anggota** | Orang lain yang ikut mengerjakan (saudara, rekan usaha kecil) | Ya | Jadi penanggung jawab tugas, menerima giliran |
| **Tamu** | Orang yang hanya perlu dikabari atau menjawab satu pertanyaan | **Tidak** | Menerima pesan, menekan tombol lewat WhatsApp/SMS/tautan |
| **Sistem** | Asisten di belakang layar | (bukan orang) | Membaca pesan, menyusun pertanyaan, mengubah data, menjadwalkan langkah berikut |

Satu orang bisa punya dua peran (misal Dina: Pendamping untuk Ibu, sekaligus Pemilik untuk tugasnya sendiri).

### 1.2 Menu dan Objek (prinsip 2 level: Proyek → Tugas)

| Menu | Isi | Catatan |
|---|---|---|
| **Hari Ini** (beranda) | Satu-dua tugas aktif, tombol besar "Sudah selesai", tombol "Minta tolong", satu kartu pertanyaan bila ada | Jarang lebih dari 3 kartu |
| **Tugas** | Semua tugas; detail tugas memuat tanggal, penanggung jawab, "Setelah…", "Kabari…" | Level kerja utama |
| **Proyek** | Kumpulan tugas berurutan; ringkasan; "Lihat semua langkah" | Level pengelompok |
| **Orang** | Pemilik, Pendamping, Anggota, Tamu; izin berbagi | Tempat persetujuan |
| **Pengaturan** | Kanal, jam tenang, profil tangga, frekuensi kabar | 3 pilihan per hal, bukan puluhan toggle |
| **Kanal luar** (WhatsApp/SMS/email) | Bukan menu, tapi tempat USP paling sering terjadi | Semua aksi di kanal ada cerminnya di aplikasi |

Tugas yang tidak punya proyek otomatis masuk proyek bawaan **"Harian"** milik orangnya. Tidak ada Inbox.

### 1.3 Status Tugas (model minimal)

`Menunggu giliran` → `Aktif` → `Selesai`. Tambahan turunan: `Belum berjadwal` (belum ada tanggal) dan `Terlambat` (lewat tenggat).

### 1.4 Aturan Pesan (berlaku untuk semua USP)

1. **Satu pesan, satu pertanyaan.**
2. **Maksimal tiga tombol**, salah satunya selalu jalan keluar yang aman.
3. **Tombol = perubahan data.** Menekan tombol langsung mengubah tugas, bukan membuka formulir.
4. **Jam tenang** default 21.00–06.00: pesan ditunda ke pagi.
5. **Batas 3 pesan per tugas.** Sesudah itu sistem berhenti menagih dan mencatatnya di kabar (USP-5).
6. **Batalkan** tersedia setelah setiap aksi yang mengubah data.
7. **Kanal gagal** → turun ke SMS → turun ke kartu di Hari Ini.
8. **Izin eksplisit** dari Pemilik sebelum Pendamping atau Tamu dikabari tentang tugasnya.

---

## 2. Peta Ringkas: USP × Peran × Menu

### 2.1 USP × Peran

| USP | Pemilik | Pendamping | Anggota | Tamu |
|---|---|---|---|---|
| 1 Tangkap + Tanya Satu Hal | Mengirim pesan, menjawab pertanyaan | Bisa mengirim atas nama Pemilik | Mengirim untuk diri sendiri | Tidak ikut |
| 2 Estafet | Mencentang | Menyusun urutan, penunggu hasil | Menerima "Giliran Anda" | Penunggu hasil atau penerima giliran |
| 3 Tangga Tindak Lanjut | Menjawab tombol | Anak tangga terakhir | Menjawab bila penanggung jawab | Bisa dimintai bantuan |
| 4 Proyek Sepotong-sepotong | Mengerjakan langkah aktif | Membuat proyek, mengubah langkah | Menerima langkah | Tidak ikut |
| 5 Kabar Berujung Tombol | Melihat versi ringkas miliknya | **Penerima utama**, menekan tombol aksi | Penerima untuk timnya | Tidak ikut |
| 6 Minta Tolong Dua Arah | **Peminta** | **Penerima** | Penerima | Penerima tanpa akun |

### 2.2 USP × Menu (● utama, ○ pendukung)

| USP | Hari Ini | Tugas | Proyek | Orang | Pengaturan | Kanal luar |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 Tangkap + Tanya | ○ | ● | | | ○ | ● |
| 2 Estafet | ○ | ● | ● | ○ | | ● |
| 3 Tangga Tindak Lanjut | ○ | ● | | ○ | ● | ● |
| 4 Proyek Sepotong-sepotong | ● | ○ | ● | | | ○ |
| 5 Kabar Berujung Tombol | ○ | | ● | ● | ● | ● |
| 6 Minta Tolong | ● | ○ | | ● | | ● |

### 2.3 Berlaku di level apa

| Level | USP |
|---|---|
| **Tugas** (satu item) | 1, 3, 6 |
| **Hubungan antar tugas** (di dalam proyek) | 2 |
| **Proyek** | 4, 5 |
| **Orang** | 5, 6 (daftar siapa boleh dikabari dan dimintai tolong) |

---

## 3. Alur Detail per USP

### USP-1. Tangkap, lalu Tanya Satu Hal

**Tujuan:** pesan biasa menjadi tugas lengkap tanpa ada daftar yang harus dibereskan.
**Peran:** Pemilik (utama), Pendamping (opsional, kirim atas nama Pemilik), Sistem.
**Menu:** lahir di **Tugas**, tampil di **Hari Ini**. Kanal utama: WhatsApp (fallback email/Telegram).

**Alur**

1. Pemilik mengirim teks, suara, foto, atau teruskan pesan ke nomor/email khusus. Hanya nomor terdaftar yang diterima.
2. Sistem membaca: judul, tanggal, jam, orang, tebakan proyek. **Tugas langsung dibuat**, belum menunggu jawaban apa pun.
3. Sistem memilih **satu** bagian paling penting yang kurang, dengan urutan prioritas: tanggal → penanggung jawab → proyek.
4. Sistem membalas satu pesan:
   > *Dicatat: "Kontrol dokter". Kapan?*
   > `[Kamis pagi]` `[Kamis siang]` `[Hari lain]`
5. Jawaban langsung mengisi tanggal. Sistem memasang pengingat default (malam sebelumnya + pagi hari-H) dan menutup dengan satu baris: *"Sudah. Saya ingatkan Rabu malam."*
6. Bila tanggal sudah jelas dari awal, **tidak ada pertanyaan**, hanya konfirmasi: *"Dicatat: Kontrol dokter, Kamis 10.00. [Ubah]"*

**Bila tidak dijawab:** tugas berstatus `Belum berjadwal` dan hanya muncul sebagai **satu** kartu "Kapan ini?" di Hari Ini. Ditanya ulang sekali besok pagi, lalu diam. Tidak ada daftar yang menumpuk.

**Kasus tepi**
- Pesan bukan tugas (obrolan): tanya *"Jadikan tugas? [Ya] [Bukan]"*.
- Beberapa tugas dalam satu pesan: satu tugas per baris, satu pertanyaan ringkasan.
- Foto (undangan, resep): tugas "Lihat foto" dengan lampiran, lalu tanya kapan.
- Pendamping mengirim atas nama Pemilik: tugas tercatat milik Pemilik, pertanyaan dijawab Pemilik.

**Data yang berubah:** Tugas baru (judul, tanggal, penanggung jawab, proyek "Harian" atau hasil tebakan, sumber = chat).
**Ukuran berhasil:** persentase tugas lengkap dalam satu balasan; jumlah tugas `Belum berjadwal` yang menumpuk (harus mendekati 0).

---

### USP-2. Estafet

**Tujuan:** selesainya satu langkah langsung menyalakan langkah berikut dan mengabari yang menunggu.
**Peran:** Pemilik/Anggota (yang mencentang), penerima giliran (Anggota atau Tamu), penunggu hasil (Pendamping atau Tamu), Sistem.
**Menu:** pengaturan di detail **Tugas** (kolom "Setelah…" dan "Kabari…"), terlihat urutannya di **Proyek**. Pesan terjadi di kanal luar.

**Alur**

1. **Penyiapan.** Pendamping atau Pemilik menghubungkan tugas B "Setelah: tugas A", dan memilih "Kabari: Dina" pada tugas A. Bisa juga terbentuk otomatis dari USP-4. Tugas B berstatus `Menunggu giliran`: tidak muncul di Hari Ini penerimanya dan tidak ada pengingat.
2. **Selesai.** A dicentang di aplikasi, atau dibalas "sudah" di WhatsApp, atau lewat tombol [Sudah selesai] dari USP-3.
3. **Sistem melakukan tiga hal sekaligus:**
   - A menjadi `Selesai`.
   - B menjadi `Aktif`, penerima mendapat:
     > *Giliran Anda: "Daftar ke dokter". Hasil lab sudah diambil.*
     > `[Mulai]` `[Belum bisa, kapan?]`
   - Penunggu hasil mendapat satu kalimat: *"Bapak sudah ambil hasil lab."*
4. **Beberapa pemblokir.** B baru aktif bila semua selesai. Selagi menunggu, penerima bisa diberi info: *"Tinggal menunggu Pak Budi."*
5. **Penerima tidak bereaksi** → tugas B masuk tangga USP-3 dengan tenggatnya sendiri.

**Kasus tepi**
- **Salah centang.** Ada "Batalkan" 30 menit. Bila A dibuka lagi setelah B aktif, sistem kirim koreksi ke penerima: *"Maaf, langkah sebelumnya ternyata belum selesai. Tunggu dulu."* dan B kembali `Menunggu giliran`.
- **Lingkaran urutan** (A setelah B, B setelah A): ditolak saat penyiapan.
- **Tamu tanpa akun:** menerima dan menjawab lewat tombol di WhatsApp/SMS.
- **Privasi:** kalimat ke penunggu hanya memuat judul tugas yang ditandai "Kabari".

**Data yang berubah:** status A dan B; relasi "Setelah"; log pengabaran.
**Ukuran berhasil:** jeda antara A selesai dan B mulai; persentase penerima yang mulai dalam batas waktu; jumlah pesan koreksi (harus kecil).

---

### USP-3. Tangga Tindak Lanjut

**Tujuan:** tugas yang terlewat diselesaikan atau dijadwal ulang lewat satu ketukan, tanpa membuka aplikasi.
**Peran:** Pemilik (penjawab), Pendamping (anak tangga terakhir), Anggota (bila penanggung jawab), Sistem.
**Menu:** terjadi pada **Tugas** (tenggat dan status), kartu di **Hari Ini**, aturan di **Pengaturan**, kontak bantuan di **Orang**.

**Tangga default** (pilihan di Pengaturan: Santai, Biasa, Teliti)

| Anak tangga | Kapan | Isi pesan |
|:-:|---|---|
| 0 | H-1 malam dan pagi hari-H | Pengingat biasa |
| 1 | Tenggat lewat sekitar 1 jam | *"Belum sempat? `[Sudah selesai]` `[Besok saja]` `[Minta Sari bantu]`"* |
| 2 | Tidak dijawab sekitar 3 jam | Ulangi **sekali**, lebih pendek, tombol sama |
| 3 | Tidak dijawab lagi | Ke Pendamping: *"Ibu belum menandai 'Minum obat sore'. `[Telepon Ibu]` `[Geser ke besok]` `[Biarkan]`"* |
| Berhenti | Setelah 3 pesan | Tugas ditandai `Terlewat`, dicatat ke kabar (USP-5), tidak ditagih lagi |

**Efek tiap tombol**

| Tombol | Yang terjadi pada data |
|---|---|
| Sudah selesai | Status `Selesai`; memicu estafet USP-2 bila ada |
| Besok saja | Tanggal +1 hari, jam tetap; hitungan "digeser" +1 |
| Minta [nama] bantu | Membuat permintaan ke orang itu (mekanisme USP-6); Pemilik tetap penanggung jawab sampai diterima |
| Telepon Ibu | Membuka panggilan di ponsel Pendamping |
| Biarkan | Dicatat, tidak disebut lagi 7 hari |

**Kasus tepi**
- **Digeser 3 kali:** sistem mengganti pertanyaan: *"Sudah 3 kali digeser. `[Masih perlu]` `[Batalkan tugas]` `[Minta bantu]`"*.
- **Tugas Penting** (misal obat): tandanya dua pilihan, Biasa atau Penting. Tangga lebih cepat dan Pendamping dikabari lebih awal.
- **Jam tenang:** pesan ditunda ke pagi.
- **Tombol "jangan ingatkan soal ini"** tersedia di pesan anak tangga 2.

**Data yang berubah:** status, tanggal, penanggung jawab, hitungan geser, log pesan.
**Ukuran berhasil:** persentase tugas terlambat yang selesai atau dijadwal ulang setelah satu pesan; rata-rata pesan per tugas; persentase "jangan ingatkan" (tanda pesan terasa mengganggu).

---

### USP-4. Proyek Sepotong-sepotong

**Tujuan:** proyek yang dibuat AI tidak membanjiri pengguna; hanya satu langkah yang terbuka.
**Peran:** Pendamping atau Pemilik (membuat), Sistem (AI), penanggung jawab tiap langkah.
**Menu:** dibuat di **Proyek**, langkah aktif muncul di **Hari Ini**. Daftar penuh ada di "Lihat semua langkah".

**Alur**

1. Buat Proyek, dengan dua jalan: *"Ceritakan acaranya"* (suara/teks) atau pilih contoh (Kontrol dokter, Arisan, Syukuran, Belanja bulanan).
2. Bila proyek punya hari-H, sistem bertanya **satu hal**: *"Tanggal acaranya?"* Tenggat tiap langkah dihitung mundur dari tanggal itu.
3. AI menyusun 5–12 langkah berurutan, lalu menampilkan **ringkasan kecil**, bukan tabel:
   > *Syukuran: 9 langkah. Mulai dari: tentukan tanggal.*
   > `[Mulai]` `[Lihat semua langkah]` `[Ubah]`
4. Hanya langkah 1 berstatus `Aktif`. Sisanya `Menunggu giliran` (memakai mekanisme USP-2).
5. Tiap langkah selesai → langkah berikut terbuka. Langkah yang boleh bersamaan ditandai AI, dibuka bersama (maksimal 2).
6. Pagi hari sistem mengirim: *"Hari ini: hubungi katering."* Tidak perlu bertanya ke asisten.
7. Pendamping membuka "Lihat semua langkah" untuk menugaskan, menghapus, atau mengurutkan ulang. Pemilik tidak perlu melakukannya.

**Kasus tepi**
- AI memberi lebih dari 12 langkah: sisanya digabung jadi "Langkah lanjutan".
- Langkah sudah dikerjakan: tombol "Sudah dikerjakan" di setiap langkah pada daftar penuh.
- Orang ingin melihat gambaran besar: "Lihat semua langkah" selalu ada.

**Data yang berubah:** Proyek baru; 5–12 Tugas dengan relasi "Setelah"; tenggat mundur.
**Ukuran berhasil:** langkah 1 selesai dalam 24 jam; persentase proyek ditinggalkan; seberapa sering "Lihat semua" diklik (bila tinggi, orang butuh peta).

---

### USP-5. Kabar Berujung Tombol

**Tujuan:** pendamping tahu keadaan tanpa bertanya terus, dan bisa bertindak dari kabar itu sendiri.
**Peran:** Pendamping (penerima utama); Pemilik (melihat versi ringkasnya dan apa yang dilihat Pendamping); Anggota (penerima untuk timnya).
**Menu:** ringkasan per **Proyek** dan per **Orang**; pengaturan frekuensi di **Pengaturan**; pengiriman lewat kanal luar.

**Alur**

1. **Penyiapan.** Pemilik menyetujui: *"Dina boleh menerima ringkasan tugas saya."* Pendamping memilih frekuensi: Tiap malam, Mingguan, atau **Hanya bila ada masalah** (default).
2. Sistem menyusun satu paragraf dari data: selesai/total, terlambat, digeser berkali-kali, belum dijawab.
3. **Tidak ada masalah:** satu baris (*"Semua lancar hari ini."*) atau diam, sesuai pilihan.
4. **Ada masalah:** maksimal tiga tombol, satu per masalah:
   > *Ibu selesai 4 dari 5 hari ini. "Minum obat sore" terlewat.*
   > `[Kirim pengingat lembut]` `[Geser ke besok]` `[Telepon Ibu]`
5. Tombol langsung menjalankan: pengingat lembut memulai anak tangga 1 USP-3; geser mengubah tanggal; telepon membuka panggilan.
6. Satu baris konfirmasi: *"Sudah saya kirim ke Ibu."*
7. **Biarkan** dicatat dan masalah yang sama tidak disebut 7 hari.

**Kasus tepi**
- **Data kosong:** laporan jujur, *"3 tugas belum punya tanggal. `[Atur tanggal]`"*.
- **Transparansi:** Pemilik bisa melihat "Yang dilihat Dina" kapan saja dan mencabut izin.
- **Banyak Pemilik:** satu kabar per orang, digabung dalam satu pesan dengan judul per orang.

**Data yang berubah:** hanya bila tombol ditekan (tanggal, pemicu pengingat). Kabar sendiri hanya membaca.
**Ukuran berhasil:** persentase kabar yang diikuti tombol; persentase Pendamping yang mematikan kabar (tanda terlalu sering).

---

### USP-6. Minta Tolong Dua Arah

**Tujuan:** meminta bantuan orang lain tanpa formulir dan tanpa harus menelepon; hasilnya tugas yang sudah disepakati.
**Peran:** Pemilik (Peminta); Pendamping, Anggota, atau Tamu (Penerima); Sistem.
**Menu:** tombol **"Minta tolong"** di **Hari Ini**; daftar orang yang boleh dimintai di **Orang**. Objek baru ringan **Permintaan** yang berubah jadi **Tugas** bila disepakati. Tidak ada menu "Formulir".

**Alur**

1. Peminta menekan tombol besar "Minta tolong" (atau berkata/mengetik *"minta tolong beli obat"*).
2. Memilih orang dari tombol berfoto (maksimal 3 default, sesuai daftar yang disetujui).
3. Memilih atau menyebut isi: *Beli obat, Antar ke dokter, Bantu lihat HP*, atau suara bebas.
4. Penerima menerima:
   > *Ibu minta tolong: beli obat.*
   > `[Bisa, Sabtu]` `[Bisa, kapan?]` `[Tidak bisa]`
5. Tiga kemungkinan:

| Jawaban | Yang terjadi |
|---|---|
| **Bisa, Sabtu** | Permintaan menjadi Tugas (penanggung jawab Penerima, tanggal Sabtu). Peminta mendapat: *"Dina bisa Sabtu. Sudah dicatat."* Peminta dikabari saat selesai (USP-2). |
| **Bisa, kapan?** | Sistem tanya Peminta: *"Kapan dibutuhkan? `[Hari ini]` `[Besok]` `[Akhir pekan]`"*. Jawabannya kembali ke Penerima: `[Bisa]` `[Tidak bisa tanggal itu]`. Maksimal 2 putaran, lalu disarankan telepon. |
| **Tidak bisa** | Peminta dapat: *"Dina belum bisa. Minta ke Rudi? `[Ya]` `[Tidak usah]`"* |

6. Penerima tidak menjawab dalam beberapa jam: diulang sekali, lalu ditawarkan ke orang berikutnya di daftar.

**Kasus tepi**
- **Penerima Tamu:** menjawab lewat tombol WhatsApp tanpa akun.
- **Permintaan uang atau hal sensitif:** tidak diproses sebagai tugas biasa; sistem menyarankan telepon.
- **Hanya orang di daftar persetujuan** yang bisa dimintai dan bisa meminta.

**Data yang berubah:** Permintaan (status: menunggu, disepakati, ditolak); Tugas baru saat disepakati; log putaran.
**Ukuran berhasil:** waktu sampai disepakati; jumlah putaran; persentase yang berakhir di telepon.

---

## 4. Satu Hari Memakai Semuanya (Contoh)

Ibu Sari (72, Pemilik), Dina (anak, Pendamping), Pak Budi (Tamu, tetangga).

| Waktu | Kejadian | USP |
|---|---|:-:|
| Senin 09.00 | Ibu mengirim suara: *"kontrol dokter Kamis"*. Sistem balas: *"Kamis jam berapa? [Pagi] [Siang] [Hari lain]"*. Ibu ketuk [Pagi]. | 1 |
| Senin 10.00 | Dina membuat proyek "Kontrol Mei" dari contoh. Hanya langkah "Ambil hasil lab" yang terbuka; "Daftar ke dokter" menunggu. | 4, 2 |
| Selasa 14.00 | Ibu mencentang "Ambil hasil lab". Ibu dapat "Giliran Anda: Daftar ke dokter". Dina dapat: *"Ibu sudah ambil hasil lab."* | 2 |
| Selasa 18.00 | "Minum obat sore" lewat. Ibu dapat: *"Belum sempat? [Sudah] [Besok saja] [Minta Dina bantu]"*. Ibu tidak menjawab. | 3 |
| Selasa 21.00 | Jam tenang, pesan ditunda. Rabu 07.00 pesan ulang tunggal; Ibu ketuk [Sudah selesai]. | 3 |
| Rabu 19.00 | Dina dapat: *"Ibu selesai 4 dari 5 hari ini."* Tidak ada masalah, cukup satu baris. | 5 |
| Kamis 07.00 | Ibu menekan "Minta tolong" → Pak Budi → *Antar ke dokter*. Pak Budi ketuk [Bisa, Kamis 09.00]. Ibu dapat: *"Pak Budi bisa, Kamis 09.00."* | 6 |

---

## 5. Hal yang Perlu Diputuskan

1. **Kanal utama:** WhatsApp (biaya dan kebijakan API), SMS (biaya), atau email dulu untuk prototipe.
2. **Apakah Tamu benar-benar tanpa akun?** Menentukan cara identitas dan persetujuan tamu diverifikasi.
3. **Model izin:** siapa yang menyetujui Pendamping, bagaimana mencabutnya, apa yang terlihat.
4. **Default tangga:** angka 1 jam, 3 jam, dan 3 pesan di atas adalah tebakan. Harus diuji agar tidak terasa cerewet.
5. **Siapa yang membayar dan memasang:** Pendamping. Berarti onboarding Pendamping perlu alur sendiri, terpisah dari Pemilik.
6. **Kualitas pemahaman tanggal dan suara Bahasa Indonesia** menentukan apakah USP-1 terasa ajaib atau menyebalkan.
