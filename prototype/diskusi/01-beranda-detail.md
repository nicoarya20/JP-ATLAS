# Diskusi Wireframe Beranda (detail)

> File yang dibahas: `wireframe/01-beranda.html`
> Tanggal: 7 Oktober 2026
> Rujukan: `diskusi/fitur-ringkasan.md`, `diskusi/debat-ringkasan/99-kesimpulan.md`, `wireframe/05-events.html`, `wireframe/06-tim.html`
> Ringkasan poin: `01-beranda-poin.md`

Beranda terdiri dari 4 zona. Tiap zona menjawab satu pertanyaan:

| Zona | Nama | Pertanyaan |
|---|---|---|
| A | ✦ Briefing harian | "Apa yang berubah atau berisiko sejak kemarin?" |
| B | Fokus saya hari ini (+ Inbox) | "Kerjakan apa duluan, dan kenapa?" |
| C | ✦ Tanyakan ke data proyek | "Saya mau cari hal spesifik" |
| D | Agenda & proyek saya | "Rapat apa hari ini, sudah siap belum? Proyek mana yang bermasalah?" |

---

## Zona A: Briefing harian

### Q1. "Disusun AI dari data proyek": AI-nya bekerja seperti apa?

Isinya tidak hanya dari detail proyek. Sumbernya tiga menu:

| Poin | Sumber data | Siapa yang menentukan |
|---|---|---|
| "Fix login SSO" telat 2 hari, padahal ditandai penting | Task: tenggat, status, prioritas | Aturan / kueri |
| Hasil rapat Review Desain belum dicek (6 temuan) | Menu Rapat: notulen yang sudah diekstrak AI (`05-events.html`, "Perlu dicek (6)") | Status temuan = belum dikonfirmasi |
| Beban Rina diperkirakan 140% minggu depan | Menu Tim: beban dan kapasitas (`06-tim.html`, "Peringatan dini") | Hitungan beban |

Prinsipnya ada di `fitur-ringkasan.md`: **"AI hanya menceritakan data yang sudah dihitung."**
- **Sistem** mendeteksi sinyal dengan aturan biasa.
- **AI** hanya menuliskannya jadi kalimat.
- "Diperbarui 07.30" berarti briefing dihitung sekali tiap pagi, tidak real-time.

Catatan: poin 3 butuh data kapasitas tim. Di debat, kapasitas tim ditandai ❌ karena terasa enterprise untuk segmen awam/lansia.

### Q2. Urutan poin 1–3 berdasarkan apa? Tenggat?

**Belum didefinisikan di wireframe.** Urutan otomatis yang punya rumus hanya Zona B. Zona A belum punya aturan.

Dari contohnya, urutannya kelihatan berdasarkan **dampak**, bukan tenggat:
1. Sudah terjadi (tugas penting telat)
2. Ada input baru yang menunggu tindakan (hasil rapat)
3. Prediksi risiko minggu depan (beban Rina)

Usulan aturan: **sudah terjadi > prediksi**, lalu jumlah orang terdampak, lalu maksimal 1 poin per jenis sinyal supaya isinya beragam.

Inkonsistensi di mode **Mingguan**:
- Judul tetap "Briefing harian" dan pertanyaannya tetap "sejak kemarin", padahal isinya rekap 7 hari.
- Di Harian, pemindahan tugas Rina masih **saran**. Di Mingguan sudah **dipindah** (140% → 105%). Dummy-nya tidak sinkron.
- Harian berisi peringatan, Mingguan berisi laporan. Tombol Harian/Mingguan sebenarnya menjawab dua pertanyaan berbeda.

### Q3. Kalau satu poin diklik, diarahkan ke mana?

Catatan wireframe hanya bilang "tiap poin bisa diklik ke datanya". Usulan:

| Jenis poin | Tujuan klik | Contoh |
|---|---|---|
| Tentang satu hal | Langsung ke halaman hal itu | Poin 1 → detail task "Fix login SSO". Poin 2 → rapat Review Desain bagian "Perlu dicek (6)". Poin 3 → menu Tim bagian Peringatan dini / Saran pindah |
| Agregat | Daftar yang sudah terfilter (bisa pakai chip filter Zona C) | Mingguan "3 mundur dari jadwal" → daftar 3 tugas itu |

### Q4. Bukannya isi Zona A sama dengan Zona B? Apa bedanya?

**Ada yang dobel.** "Fix login SSO" muncul di A poin 1, B baris 1, dan Inbox. Ini melanggar prinsip desain sendiri: **"satu pekerjaan muncul satu kali."**

Maksud pembedanya:
- **A** = apa yang berubah atau berisiko di sekitar saya, termasuk yang bukan tugas saya (rapat, beban Rina). Dibaca sekali, lalu selesai.
- **B** = daftar kerja pribadi yang terurut dan bisa langsung dikerjakan.

Opsi supaya tidak dobel:
1. A mengecualikan tugas yang sudah ada di B.
2. A hanya merujuk ("lihat Fokus #1").
3. A dihapus untuk anggota biasa. Kesimpulan debat juga menyebut "Briefing AI bukan fitur inti".

---

## Zona B: Fokus saya hari ini

### Q5. Apa yang terjadi kalau tombol Ubah status / Tambah catatan / Minta bantuan diklik?

Wireframe baru menggambar tombolnya, perilakunya belum ditulis. Usulan:

| Tombol | Perilaku | Yang perlu diputuskan |
|---|---|---|
| Ubah status | Dropdown status (Dikerjakan, Menunggu diperiksa, Selesai, …), diubah langsung di baris | Kalau Selesai, baris hilang dan urutan dihitung ulang. Orang terkait dapat notifikasi "Status berubah" |
| Tambah catatan | Kolom teks kecil, tersimpan sebagai komentar tugas | Apakah catatan me-reset hitungan "Mandek"? |
| Minta bantuan | Pilih orang + pesan singkat | Masuk ke Inbox orang itu sebagai mention |

Masalah untuk lansia:
- Tombol hanya muncul saat hover, jadi sulit ditemukan.
- Ada dua bentuk kotak di tiap baris: lingkaran di kiri dan kotak kecil di meta. Fungsi keduanya belum jelas.
- Lingkaran (tandai selesai?) tumpang tindih dengan "Ubah status → Selesai".

### Q6. Label alasan itu template atau buatan AI? Apa maksud "Memblokir orang"?

Label **bukan buatan AI**. Isinya kategori tetap yang dihitung dengan aturan.

**Keputusan (7 Okt 2026): jenis "Memblokir orang" diganti "Penting".**
- **Alasan:** "Memblokir orang" (ada orang lain yang tidak bisa lanjut sebelum tugas saya selesai) sulit dipahami. Kata "memblokir" juga mudah disangka fitur blokir kontak di WhatsApp atau media sosial.
- Bedanya dengan "Menunggu saya" juga terlalu tipis bagi orang awam, karena dua-duanya berarti ada orang yang menunggu saya.

Label sekarang:

| Label | Arti | Contoh di wireframe |
|---|---|---|
| Telat | Tenggat sudah lewat, belum selesai | Fix login SSO, telat 2 hari |
| Penting | Ditandai prioritas tinggi | Tulis spesifikasi API |
| Menunggu saya | Ada yang meminta saya memeriksa atau menjawab | Periksa desain onboarding, diminta Rina |
| Segera jatuh tempo | Tenggat sebentar lagi | Laporan progres PT Sinar, besok |
| Mandek | Lama tidak disentuh | Perbarui dokumentasi API, 9 hari |

Perubahan di wireframe:

| Lokasi | Sebelum | Sesudah |
|---|---|---|
| A, Briefing poin 1 | "Fix login SSO" telat 2 hari dan menahan pekerjaan Dodi | "Fix login SSO" telat 2 hari, padahal ditandai penting |
| B, Urutan baris 2 | Kirim spesifikasi API ke Dodi · Dodi menunggu · Memblokir orang | Tulis spesifikasi API · prioritas tinggi · Penting |
| B, Per tenggat (Hari ini) | Kirim spesifikasi API ke Dodi · Memblokir orang | Tulis spesifikasi API · Penting |

Yang masih terbuka:
- **Siapa yang boleh menandai "Penting"?** Pembuat tugas, saya sendiri, atau keduanya? Kalau semua orang bebas menandai, label ini kehilangan arti.
- **Ambang tiap label:** "Segera jatuh tempo" berapa hari? "Mandek" berapa hari? Apakah menambah catatan dihitung "disentuh"?
- **Satu tugas hanya tampil satu label.** "Fix login SSO" sudah telat dan penting, tapi hanya tampil "Telat". Usulan urutan: Telat > Menunggu saya > Penting > Segera jatuh tempo > Mandek.
- **Rumus urutan** di `fitur-ringkasan.md` §2 masih menyebut "bobot memblokir orang". Kalau "Penting" final, rumusnya menjadi: prioritas × kedekatan tenggat + bobot mandek + bobot menunggu saya.

### Q8. Inbox muncul karena apa? Saat seseorang disenggol?

Ya, salah satunya. Inbox adalah pengganti card lama **Aktivitas terbaru**. Pemicunya ada 4:

| Jenis | Pemicu | Contoh |
|---|---|---|
| Menyebut Anda | Ada yang menulis @Nico. Ditaruh paling atas karena ada yang menunggu balasan | Rina: "@Nico tolong cek mockup onboarding ya" |
| Komentar baru | Komentar di tugas yang saya pegang atau ikuti | Dodi di "Fix login SSO" |
| Ditugaskan ke Anda | Ada tugas baru untuk saya | Siapkan laporan progres untuk PT Sinar |
| Status berubah | Status tugas yang saya buat atau periksa berubah | "Halaman profil" → Menunggu diperiksa |

- Angka di badge (4) = jumlah yang belum dibaca.
- Aturan "tugas yang saya ikuti" belum didefinisikan.
- **Dobel:** 3 dari 4 item Inbox adalah tugas yang sudah ada di daftar Fokus tepat di atasnya. Alternatifnya, tampilkan penanda "💬 1 komentar baru" di baris tugas, lalu Inbox hanya berisi hal yang belum menjadi tugas.

---

## Zona C: Tanyakan ke data proyek

### Q7. "Dipahami sebagai" muncul sendiri saat mengetik, atau setelah klik Tanya?

Alurnya: ketik pertanyaan → klik **Tanya** → sistem menerjemahkannya jadi chip filter ("Dipahami sebagai") → hasil tampil. Wireframe belum menggambar kondisi sebelum submit.

Setelah itu:
- Hapus chip (×), dan hasil langsung berubah tanpa mengetik ulang.
- "+ Filter" untuk menambah syarat manual.
- Klik hasil untuk membuka tugasnya.

Catatan:
- "Status: Telat" sebenarnya bukan status, tapi kondisi turunan dari tenggat.
- "Login SSO gagal di Safari" (hasil C) dan "Fix login SSO" (Zona B) terlihat seperti tugas yang sama dengan nama berbeda.
- Zona C sudah ditandai ⚠️ untuk lansia dan dikeluarkan dari versi awal oleh kesimpulan debat. Alternatif yang diusulkan: pertanyaan siap-klik atau tanya pakai suara.

---

## Zona D: Agenda & proyek saya

### Q9. Kalau "Siap" / "Belum siap" diklik, apa yang terjadi?

**Itu bukan tombol.** Di HTML-nya, itu label status (`badge`) yang dihitung sistem. Masalahnya, bentuknya pil hitam besar. Di kolom sempit, teks "Belum siap" terlipat sehingga label membulat dan makin terlihat seperti tombol.

Logika yang tersirat:
- **Belum siap** karena "3 tindak lanjut rapat lalu belum selesai".
- **Siap** karena bahannya sudah ada.

**Dummy bertentangan:** Sync Klien PT Sinar (hari ini 14.00) ditandai **Siap** dengan bahan "laporan progres", padahal di Zona B tugas "Siapkan laporan progres untuk PT Sinar" baru jatuh tempo **besok**.

Yang perlu diputuskan:
1. Tetap jadi label (bentuknya dibuat lebih datar, mis. teks kecil "⚠ Belum siap") atau dijadikan tombol.
2. Aturan "Siap". Usulan: semua bahan agenda sudah ada + tindak lanjut rapat sebelumnya sudah selesai.
3. Sumber data "bahan": dicatat manual saat membuat agenda, atau diambil otomatis dari tugas terkait?
4. Kalau bisa diklik: membuka agenda dan menampilkan daftar yang kurang, yang bisa dicentang satu per satu. Kalau semua tercentang, label jadi "Siap".
5. Boleh tidak pengguna menandai "Siap" secara manual?

### Tambahan: Sehat/Berisiko dan progres proyek
- "Proyek Atlas" ditandai **Sehat**, padahal ada 1 tugas telat yang juga ditandai penting (Fix login SSO). Aturan Sehat/Berisiko belum ada.
- Contoh aturan: Berisiko jika ada tugas penting yang telat, **atau** tenggat proyek kurang dari 14 hari dan progres di bawah target.
- **Progres %** dihitung dari apa? Jumlah tugas selesai dibagi semua tugas?
- **Kotak kecil** di depan nama proyek belum jelas fungsinya (ikon proyek? centang?).

---

## Benang merah
1. **Duplikasi belum hilang.** "Fix login SSO" muncul di A, B, Inbox, dan kemungkinan C. Ini persis masalah yang ingin diselesaikan desain ini.
2. **Perilaku dan aturan belum ditulis:** urutan Zona A, tujuan klik, aksi tombol, ambang label, aturan "Siap", dan aturan Sehat/Berisiko.

## Riwayat perubahan wireframe
- **7 Okt 2026:** dummy Zona B dan D sempat diganti ke kasus sehari-hari (syukuran, arisan, renovasi). Itu salah tangkap maksud, lalu dikembalikan ke dummy lama.
- **7 Okt 2026:** jenis "Memblokir orang / menahan pekerjaan Dodi" diganti **"Penting"** di Zona A poin 1 dan Zona B (Urutan dan Per tenggat).
