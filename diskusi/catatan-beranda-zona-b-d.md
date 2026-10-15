# Catatan: Wireframe Beranda, Zona B dan Zona D

> File: `wireframe/01-beranda.html`. Tanggal: 7 Oktober 2026.
> Isinya: (1) apa yang diubah, (2) masalah yang masih terbuka di Zona B dan D, (3) keputusan yang perlu diambil.

---

## 1. Yang diubah: jenis "Memblokir orang" diganti "Penting"

**Alasan:** jenis "memblokir / menahan pekerjaan orang" sulit dipahami. Kata "memblokir" juga mudah disangka fitur blokir kontak di WhatsApp atau media sosial.

| Lokasi | Sebelum | Sesudah |
|---|---|---|
| Zona A, Briefing harian poin 1 | "Fix login SSO" telat 2 hari **dan menahan pekerjaan Dodi** | "Fix login SSO" telat 2 hari, **padahal ditandai penting** |
| Zona B, tampilan Urutan baris 2 | Kirim spesifikasi API ke Dodi · Atlas · hari ini · Dodi menunggu · label **Memblokir orang** | Tulis spesifikasi API · Atlas · hari ini · prioritas tinggi · label **Penting** |
| Zona B, tampilan Per tenggat (Hari ini) | Kirim spesifikasi API ke Dodi · **Memblokir orang** | Tulis spesifikasi API · **Penting** |

Dummy lainnya tetap kasus lama (Fix login SSO, Proyek Atlas, PT Sinar).

**Label Zona B sekarang:**

| Label | Arti | Contoh di wireframe |
|---|---|---|
| Telat | Tenggat sudah lewat, belum selesai | Fix login SSO, telat 2 hari |
| Penting | Ditandai prioritas tinggi oleh pembuat tugas | Tulis spesifikasi API |
| Menunggu saya | Ada orang yang meminta saya memeriksa atau menjawab | Periksa desain onboarding, diminta Rina |
| Segera jatuh tempo | Tenggat sebentar lagi | Laporan progres PT Sinar, besok |
| Mandek | Lama tidak disentuh | Perbarui dokumentasi API, 9 hari |

**Dampak ke dokumen lain:** `diskusi/fitur-ringkasan.md` §2 masih menulis label "Memblokir orang" dan "bobot memblokir orang" di rumus urutan. Bagian itu belum diubah karena merupakan catatan diskusi tanggal 5 Okt. Kalau keputusan ini final, rumusnya menjadi: prioritas × kedekatan tenggat + bobot mandek + bobot menunggu saya.

---

## 2. Masalah yang masih terbuka di Zona B

### 2.1 Aturan tiap label belum tertulis
Label dibuat oleh **aturan tetap, bukan AI**. Ambangnya belum ditentukan:

| Label | Yang belum diputuskan |
|---|---|
| Penting | Siapa yang boleh menandai penting: pembuat tugas, saya sendiri, atau keduanya? Kalau semua orang bebas menandai, label ini kehilangan arti |
| Segera jatuh tempo | Berapa hari batasnya? (dummy: besok) |
| Mandek | Tidak disentuh berapa hari? Apakah menambah catatan dihitung "disentuh"? |
| Menunggu saya | Sumbernya dari mention, status "Menunggu diperiksa", atau keduanya? |

### 2.2 Satu tugas hanya menampilkan satu label
"Fix login SSO" sudah telat **dan** ditandai penting, tapi yang tampil hanya "Telat". Urutan prioritas antar-label perlu ditulis. Usulan: Telat > Menunggu saya > Penting > Segera jatuh tempo > Mandek.

### 2.3 Tiga tombol aksi belum punya perilaku
Usulan:
- **Ubah status:** pilih status baru langsung di baris. Kalau "Selesai", tugas hilang dari daftar dan urutan dihitung ulang.
- **Tambah catatan:** kolom teks kecil, tersimpan sebagai komentar tugas.
- **Minta bantuan:** pilih orang + pesan singkat, lalu masuk ke Inbox orang itu.

Masalah untuk lansia: tombol baru muncul saat kursor diarahkan ke baris (hover), jadi sulit ditemukan. Selain itu ada **dua bentuk kotak** di tiap baris: lingkaran di kiri dan kotak kecil di depan nama proyek. Fungsinya belum jelas, dan lingkaran (tandai selesai?) tumpang tindih dengan "Ubah status → Selesai".

### 2.4 Masih ada yang dobel dengan Zona A dan Inbox
Prinsip desainnya "satu pekerjaan muncul satu kali". Tapi "Fix login SSO" masih muncul di Briefing (A poin 1), Fokus (B baris 1), dan Inbox (komentar Dodi).

---

## 3. Masalah di Zona D

### 3.1 "Siap / Belum siap" itu label, tapi kelihatan seperti tombol
- Di kode, itu label status yang dihitung sistem, bukan tombol. Mengekliknya tidak melakukan apa-apa.
- Tapi bentuknya pil hitam besar. Di kolom sempit, teks "Belum siap" terlipat sehingga label membulat dan makin terlihat seperti tombol.
- **Perlu diputuskan:** tetap jadi label (bentuknya dibuat lebih datar, mis. teks kecil "⚠ Belum siap"), atau dijadikan tombol yang membuka daftar kekurangan.

### 3.2 Aturan "Siap" belum tertulis
Usulan aturan: **Siap = semua bahan agenda sudah ada, dan tindak lanjut dari rapat sebelumnya sudah selesai.**

- **Rapat Mingguan Proyek Atlas** → Belum siap, karena 3 tindak lanjut rapat lalu belum selesai. Ini sudah sesuai aturan.
- **Sync Klien PT Sinar** → ditandai **Siap**, padahal bahannya "laporan progres", dan di Zona B tugas "Siapkan laporan progres untuk PT Sinar" baru jatuh tempo **besok** (belum selesai). **Dummy ini bertentangan dengan aturan.** Seharusnya Belum siap, atau tugasnya dibuat sudah selesai.

Pertanyaan yang tersisa: siapa yang mencatat "bahan" sebuah agenda? Dicatat manual saat membuat agenda, atau diambil otomatis dari tugas yang terkait?

### 3.3 Kalau dibuat bisa diklik, apa isinya?
Usulan: klik "Belum siap" → membuka agenda itu dan menampilkan daftar yang kurang (mis. 3 tindak lanjut rapat lalu). Tiap baris bisa langsung dicentang. Kalau semua tercentang, label berubah jadi "Siap". Perlu diputuskan juga apakah pengguna boleh menandai "Siap" secara manual.

### 3.4 Label Sehat/Berisiko dan angka progres belum punya aturan
- "Proyek Atlas" ditandai **Sehat** padahal ada "1 tugas telat" (Fix login SSO, yang juga ditandai penting). Kapan tugas telat sudah cukup membuat proyek Berisiko?
- Contoh aturan: Berisiko jika ada tugas penting yang telat, **atau** tenggat proyek kurang dari 14 hari dan progres di bawah target.
- **Progres %** dihitung dari apa? Jumlah tugas selesai dibagi semua tugas?
- Ada **kotak kecil** di depan nama proyek. Fungsinya juga belum jelas (ikon proyek? centang?).

---

## 4. Keputusan yang perlu diambil

- [x] Ganti jenis "Memblokir orang" → **Penting** (7 Okt 2026)
- [ ] Siapa yang boleh menandai tugas "Penting"
- [ ] Batas hari "Segera jatuh tempo" dan "Mandek"
- [ ] Urutan prioritas label kalau satu tugas memenuhi lebih dari satu label
- [ ] Perilaku tiga tombol aksi, dan cara menampilkannya tanpa hover
- [ ] Arti lingkaran dan kotak kecil di baris tugas/proyek
- [ ] "Siap/Belum siap": label atau tombol?
- [ ] Aturan "Siap" dan sumber data "bahan" agenda (lalu perbaiki dummy Sync PT Sinar)
- [ ] Aturan Sehat/Berisiko dan cara hitung progres %
- [ ] Perbarui rumus urutan di `fitur-ringkasan.md` §2 kalau "Penting" sudah final
