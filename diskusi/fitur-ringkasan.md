# Diskusi: Menu Ringkasan (Dashboard)

> Bahan yang dibedah: `tahapan-proyek/02-analisis/hasil-orchestrasi/analysis/A1-dashboard-tim-events.md`, §1 Ringkasan eksekutif poin 1 dan 2.
> Tanggal diskusi: 5 Oktober 2026.

---

## 0. Isi Menu Ringkasan saat ini (14 card)

Supaya jelas card mana yang dibahas, berikut daftar 14 card yang sekarang ada di Menu Ringkasan beserta isinya:

| Card | Isinya | Pertanyaan yang dijawab |
|---|---|---|
| **Proyek aktif** | Jumlah proyek yang statusnya masih berjalan | "Ada berapa proyek berjalan?" |
| **Task terbuka** | Jumlah semua task yang belum selesai (open, dikerjakan, dibuka ulang) | "Seberapa besar tumpukan pekerjaan?" |
| **Bug terbuka** | Jumlah task berjenis bug yang belum selesai | "Seberapa buruk kualitasnya?" |
| **Ditugaskan saya** | Jumlah task aktif yang ditugaskan ke saya | "Berapa beban saya?" |
| **Status task saya** | Komposisi task saya per status (dikerjakan, menunggu QC, dibuka ulang, dst.) | "Pekerjaan saya sedang di tahap apa saja?" |
| **Ditutup 14 hari** | Jumlah task yang diselesaikan dalam 14 hari terakhir | "Seberapa produktif?" |
| **Jadwal task** | Task saya dikelompokkan per tenggat: telat / hari ini / besok / minggu ini / nanti / tanpa tenggat | "Kapan tenggat saya?" |
| **Perlu perhatian kamu** | Task yang sudah lewat tenggat dan belum selesai (rencananya ditampilkan 5 teratas) | "Apa yang telat?" |
| **Snapshot minggu ini** | Ringkasan 7 hari terakhir: jumlah selesai, sedang dikerjakan, bug, total aktif | "Apa yang terjadi minggu ini?" |
| **Jatuh tempo 7 hari** | Task dengan tenggat dari hari ini sampai 7 hari ke depan | "Apa yang sebentar lagi jatuh tempo?" |
| **Ghost reminder** | Task yang statusnya "dikerjakan" tapi tidak disentuh lebih dari 3 hari | "Apa yang saya tinggalkan?" |
| **Events mendatang** | Daftar rapat/event dalam 7 hari ke depan | "Rapat apa sebentar lagi?" |
| **Aktivitas terbaru** | Notifikasi: komentar, penugasan, perubahan status, mention | "Apa yang berubah dan menyangkut saya?" |
| **Proyek kamu** | Daftar proyek yang saya miliki/ikuti (maks. 5) | "Proyek saya bagaimana?" |

---

## 1. Pertanyaan: dokumen bilang 4 card berasal dari data yang sama. Bagaimana dengan 10 card lainnya?

### Koreksi atas dokumen A1

Dokumen A1 menyebut **4 card** (Jadwal task, Perlu perhatian kamu, Jatuh tempo 7 hari, Ghost reminder) berasal dari "task aktif saya + tanggal tenggat/terakhir disentuh". Angka ini kurang tepat. Sebenarnya ada **6 card**, karena **Ditugaskan saya** dan **Status task saya** juga mengambil dari sumber yang sama. Bahkan keduanya menjadi induk dari empat card tadi.

Contoh "satu task muncul di 5 tempat" di dokumen juga sebenarnya muncul di card: Ditugaskan saya, Status task saya, Jadwal task, Perlu perhatian kamu, dan Ghost reminder.

> **Contoh konkret:** task *"Fix login SSO"* sedang dikerjakan, tenggatnya kemarin, dan sudah 4 hari tidak disentuh. Task ini muncul sebagai:
> - angka di **Ditugaskan saya**,
> - bagian "dikerjakan" di **Status task saya**,
> - kelompok "telat" di **Jadwal task**,
> - salah satu dari 5 teratas di **Perlu perhatian kamu**,
> - salah satu item di **Ghost reminder**,
> - dan ikut terhitung di **Task terbuka** dan **Snapshot minggu ini**.
>
> User harus menyadari sendiri bahwa semua itu adalah *satu pekerjaan yang sama*.

### Kesimpulan: 14 card hanya berasal dari 4 sumber data, dan 10 di antaranya dari Task

Kalau dihitung dari sumber datanya:

| Sumber data | Card | Jumlah |
|---|---|---|
| **Task** | Kelompok a (6 card) + kelompok b (4 card) | **10** |
| **Proyek** | Proyek aktif, Proyek kamu | 2 |
| **Event** | Events mendatang | 1 |
| **Notifikasi / aktivitas** | Aktivitas terbaru | 1 |

Kelompok a dan b sama-sama mengambil data dari task. Bedanya hanya di **cakupan**: a = task "milik saya", b = task dari semua proyek yang dijumlahkan jadi angka. Notifikasi pun sebagian besar isinya soal task (komentar, penugasan, perubahan status task). Jadi hampir semua isi dashboard sebenarnya bersumber dari task.

> Catatan: di awal diskusi sempat disebut "5 sumber data". Angka itu keliru, karena mencampur sumber data dengan kelompok masalah. Yang benar: **4 sumber data**, dikelompokkan menjadi **4 kelompok masalah** di bawah ini.

### 4 kelompok masalah

**a. Kelompok "task aktif saya" (6 card): masalah paling besar, isinya dobel**
- Ditugaskan saya, Status task saya, Jadwal task, Perlu perhatian kamu, Jatuh tempo 7 hari, Ghost reminder.
- *Jadwal task* sebenarnya sudah mencakup *Perlu perhatian kamu* (sama dengan kelompok "telat") dan *Jatuh tempo 7 hari* (sama dengan kelompok "hari ini sampai minggu ini").
- Satu task bisa muncul di banyak card sekaligus.

**b. Kelompok angka agregat (4 card): angka yang sama dihitung ulang dengan jendela waktu berbeda**
- Task terbuka, Bug terbuka, Ditutup 14 hari, Snapshot minggu ini.
- *Snapshot minggu ini* pada dasarnya gabungan *Task terbuka* + *Bug terbuka* + *Ditutup 14 hari*, hanya saja jendela waktunya 7 hari, bukan 14 hari.

**c. Kelompok event & aktivitas (2 card): tidak dobel di dashboard, tapi dobel dengan menu lain**
- *Events mendatang* = isi Menu Events yang difilter 7 hari ke depan.
- *Aktivitas terbaru* ≈ *Aktivitas tim* di Menu Tim, hanya beda cakupan (saya vs tim).

**d. Kelompok proyek (2 card): bukan soal dobel, tapi isinya kosong konteks**
- *Proyek aktif* hanya angka, dan angka itu sebenarnya cuma jumlah dari isi *Proyek kamu*.
- *Proyek kamu* hanya daftar nama, tanpa info apakah proyeknya sehat atau bermasalah.

**Sinyal yang benar-benar unik hanya dua:**
- **Task mandek** dari *Ghost reminder* (task yang lama tidak disentuh). Tidak ada card lain yang menunjukkan ini.
- **Mention** dari *Aktivitas terbaru* (ada orang yang menunggu balasan saya). Sekarang tercampur dengan notifikasi perubahan status biasa.

Keduanya dipertahankan di desain baru sebagai label alasan *Mandek* dan *Menunggu saya*.

### Temuan tambahan dari dokumen A1 (inkonsistensi di spesifikasi lama)
- **Definisi "aktif" tidak sama.** *Task terbuka* tidak menghitung task yang sedang menunggu QC, sedangkan *Status task saya* menghitungnya. Akibatnya task yang menunggu QC "hilang" dari hitungan tumpukan pekerjaan.
- **Jendela waktu acak:** 14 hari, 7 hari, dan 3 hari dipakai di card berbeda tanpa alasan jelas.
- **Cakupan ambigu:** tidak jelas apakah *Task terbuka*, *Bug terbuka*, dan *Snapshot* menghitung semua proyek, proyek yang saya ikuti, atau hanya task saya.
- **"Perlu perhatian kamu" akan dijadikan 5 teratas**, tapi urutannya berdasarkan apa (paling telat? prioritas?) belum ditentukan.

---

## 2. Pertanyaan: kenapa 14 card dirombak jadi 4 zona? Karena tren tahun ini atau ada alasan lain?

### Jawaban singkat
**Alasan utamanya masalah UX, bukan tren.** Tren AI hanya alasan pendukung. Dokumen A1 sendiri menyebutnya sebagai "lanskap pasar *mendukung* arah ini", bukan pemicu.

### Alasan utama
Dashboard lama memberi tahu **"ada masalah"**, tapi tidak memberi tahu **"kerjakan apa dulu, dan kenapa"**. Banyak card menampilkan hal yang sama dengan cara berbeda, sehingga beban berpikir user tinggi tapi tetap tidak ada arahan.

Prinsip penggantinya:
1. **Satu pekerjaan muncul satu kali.**
2. **Setiap angka harus punya tindakan.** Kalau angka tidak bisa ditindaklanjuti, jangan ditampilkan.
3. **AI hanya menceritakan data yang sudah dihitung**, bukan mengarang atau menentukan sendiri.

### Desain baru: 4 zona, tiap zona menjawab satu pertanyaan

| Zona | Pertanyaan user | Isinya | Menggantikan card |
|---|---|---|---|
| **A. Briefing Harian AI** | "Apa yang berubah atau berisiko sejak kemarin?" | 3–5 poin narasi singkat berdasarkan data, tiap poin bisa diklik. Ada mode mingguan. Kalau tidak ada yang penting, cukup "Tidak ada yang mendesak hari ini." | Ditutup 14 hari, Snapshot minggu ini |
| **B. Fokus Saya Hari Ini** | "Kerjakan apa duluan, dan kenapa?" | Satu daftar task terurut. Tiap task muncul sekali, dengan label alasan: *Telat / Segera jatuh tempo / Mandek / Memblokir orang / Menunggu saya*. Ada aksi cepat (update status, tambah catatan, minta bantuan). Tersedia juga tampilan "per tenggat" untuk yang terbiasa dengan Jadwal task. Di bawahnya ada *Inbox ringkas* (mention ditaruh paling atas). | Ditugaskan saya, Status task saya, Jadwal task, Perlu perhatian kamu, Jatuh tempo 7 hari, Ghost reminder, Aktivitas terbaru |
| **C. Tanyakan ke data proyek** | "Saya mau cari hal spesifik" | Kolom tanya pakai bahasa biasa, misal "bug critical yang telat di Proyek Atlas". Sistem menerjemahkannya jadi filter yang bisa dilihat dan diedit, dan hanya menampilkan data yang boleh diakses user. | Tidak menggantikan card tertentu. Ini pengganti kebiasaan "bikin card baru untuk tiap pertanyaan". |
| **D. Agenda & Proyek saya** | "Rapat apa hari ini, sudah siap belum? Proyek mana yang bermasalah?" | Agenda hari ini & besok + bahan persiapan (agenda, tindak lanjut rapat lalu yang belum selesai). Daftar proyek dengan label kesehatan (Sehat/Berisiko), progres, dan status 1 kalimat. | Proyek aktif, Events mendatang, Proyek kamu |

**Task terbuka** dan **Bug terbuka** tidak masuk 4 zona. Keduanya dipindah ke **KPI strip** yang hanya tampil untuk PM.

### Bagaimana urutan di "Fokus Saya" ditentukan
- Urutan dihitung dengan **rumus tetap yang bisa dijelaskan**: prioritas × seberapa dekat tenggat + bobot memblokir orang + bobot mandek + bobot menunggu saya.
- **AI tidak menentukan urutan.** AI hanya menulis satu kalimat alasan, misalnya "kerjakan dulu karena memblokir 3 task QA".
- Artinya, **perbaikan terpenting (Zona B) tetap jalan meskipun AI dimatikan.**

### Kenapa angka KPI dipindah ke tampilan PM
- Angka seperti "Task terbuka: 143" **tidak bisa ditindaklanjuti oleh anggota tim biasa**. Mereka tidak tahu harus berbuat apa dengan angka itu.
- "Ditutup 14 hari" termasuk **angka pajangan (vanity metric)**. Tidak ada target atau pembandingnya, dan malah bisa mendorong orang menutup task kecil-kecil supaya angkanya naik.
- Angka baru berguna kalau ada **perubahan** ("naik 12 dari minggu lalu") atau **ambang batas** ("melewati batas aman"). Yang bisa bertindak atas angka itu adalah PM.
- Karena itu KPI strip hanya untuk PM, **maksimal 4 angka**, masing-masing dengan perubahan/ambang dan bisa diklik untuk melihat detail.
- Di versi awal, card tidak bisa ditambah bebas, supaya dashboard tidak kembali gemuk.

### Bagian yang memang mengikuti tren
- **Zona A (narasi)** dan **Zona C (tanya pakai bahasa biasa)** memang mengikuti arah produk lain di 2026:
  - Linear *Pulse*: ringkasan update harian/mingguan dikirim ke Inbox.
  - Asana *Dash*: diposisikan sebagai "AI chief of staff" yang memunculkan langkah berikutnya.
  - Atlassian *Rovo*: memperbarui task dari hasil rapat.
  - Notion *AI Meeting Notes*: transkripsi dan ekstraksi action item.
- Tapi tren ini hanya **pendukung**. Inti perbaikannya (hilangkan dobel + beri urutan dan alasan) tetap valid kapan pun.

---

## 3. Catatan kritis: dicocokkan dengan segmen target (awam/lansia)

> Bagian ini **bukan isi dokumen A1**. Ini kritik dari diskusi, karena A1 tidak menyebut segmen target yang sudah ditetapkan (orang awam/lansia, lihat `tahapan-proyek/01-riset/rangkuman-kompetitor/`).

| Bagian usulan | Cocok untuk awam/lansia? | Catatan |
|---|---|---|
| Briefing narasi (Zona A) | ✅ Cocok | Bahasa polos, tidak perlu menafsirkan angka sendiri. Pastikan kalimatnya pendek dan tanpa istilah asing. |
| Satu daftar + label alasan (Zona B) | ✅ Cocok | Langsung menjawab "kerjakan apa dulu". Label sebaiknya bahasa sehari-hari ("Sudah lewat waktu", bukan "Overdue"). |
| Tanya pakai bahasa biasa (Zona C) | ⚠️ Perlu dipertanyakan | Mengetik pertanyaan bebas lalu mengedit filter hasil tafsiran cukup berat. Alternatif: tanya pakai suara, atau beberapa pertanyaan siap-klik. |
| 4 zona dalam satu layar | ⚠️ Mungkin masih terlalu padat | Pertimbangkan: Briefing + Fokus sebagai layar utama, Agenda & Proyek jadi tab terpisah. |
| KPI strip PM, kapasitas tim, peran PM/Member | ❌ Terasa enterprise | Bertentangan dengan catatan riset sebelumnya: jangan jadikan fitur enterprise sebagai fitur utama. |

---

## 4. Ringkasan akhir

1. **Masalahnya:** 14 card hanya berasal dari 4 sumber data, dan 10 di antaranya dari Task. Enam card menampilkan task saya yang sama berulang kali, empat card menghitung ulang angka yang sama, dua card dobel dengan menu lain, dan dua card isinya tanpa konteks. Hasilnya user melihat banyak hal, tapi tidak tahu harus mengerjakan apa dulu.
2. **Solusinya:** 4 zona yang masing-masing menjawab satu pertanyaan (apa yang berubah, kerjakan apa dulu, cari hal spesifik, rapat & proyek). Angka KPI hanya untuk PM dan hanya kalau bisa ditindaklanjuti.
3. **Soal tren:** AI dipakai sebagai pencerita dan alat tanya, bukan pengambil keputusan. Alasan utama perombakan adalah masalah UX. Tren hanya pendukung.
4. **PR berikutnya:** uji 4 zona ini terhadap segmen awam/lansia, terutama Zona C dan kepadatan layar.
