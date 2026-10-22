# Skrip fasilitator — uji pengguna putaran 1 (UP-1)

Dokumen S2-15. Sumber: P3 §6.3, KEPUTUSAN-MVP-INTI Q14 dan §5.
Cabang `feature/pm-s2-15-smoke-user-test-prep`.

> **Penting: hasil dari penguji dummy TIDAK memenuhi gerbang S2.**
> `Penguji-1 (dummy)` sampai `Penguji-5 (dummy)` hanya kerangka untuk menyiapkan skrip, lembar catat, dan data contoh. Gerbang S2 baru terpenuhi bila ≥ 3 penguji **sungguhan** berusia ≥ 50 tahun lulus (KEPUTUSAN Q14, §5). S3 tidak boleh dimulai atas dasar hasil dummy.

## 1. Sebelum sesi

- Data: `SEED_ALLOW=1 bun scripts/seed-dev.ts uji` (hanya database dev). Skenario mengisi "Renovasi Dapur", lima akun `Penguji-N (dummy)` yang sudah disetujui dan berperan Anggota, serta tugas untuk T1, T4, T6, dan T7. Jalankan ulang sebelum tiap penguji agar tanggal "hari ini" dan data bersih.
- Perangkat: tablet 1024×768 atau laptop. Penguji sudah masuk (login Google bukan bagian gerbang S2).
- Penguji **memilih ukuran teks sendiri** (T0); catat pilihannya.
- Siapkan lembar catat (`putaran-1-lembar-catat.md`), pencatat waktu, dan satu salinan tugas per penguji (kartu, satu tugas per kartu).
- Sesi 45 menit per orang. Data fiktif.

## 2. Pembuka (dibacakan)

> "Terima kasih sudah mau membantu. Yang kita uji adalah aplikasinya, bukan Anda. Tidak ada jawaban salah. Saya akan memberi beberapa tugas satu per satu. Kerjakan seperti biasa; bila bingung, katakan apa yang Anda pikirkan. Saya tidak akan membantu selama Anda mengerjakan, karena kami ingin tahu bagian mana yang membingungkan. Anda boleh berhenti kapan saja. Semua data di layar ini fiktif."

Minta izin lisan, dan catat jawabannya di lembar catat:

- "Boleh saya mencatat waktu dan komentar Anda?"
- "Boleh layar ini direkam? Tidak apa-apa bila tidak." (Rekam **hanya** bila setuju.)

## 3. Aturan "tanpa bantuan"

Fasilitator **hanya boleh mengulang kalimat tugas**, persis seperti tertulis. Dilarang:

- menunjuk layar,
- menyebut nama tombol atau menu,
- membenarkan atau mengarahkan ("silakan lanjut menurut Anda", "coba yang itu"),
- memberi isyarat lewat ekspresi atau nada.

Bila penguji bertanya "ini benar?", jawab: "Lakukan seperti menurut Anda." Catat setiap pertanyaan sebagai kutipan.

## 4. Tugas

Bacakan satu per satu; mulai waktu setelah kalimat selesai. Nilai dari **data di aplikasi** (bukan klaim penguji).

| # | Dibacakan | Batas wajar | Inti? |
|---|---|---|:-:|
| T0 | "Kalau tulisan di layar ini kurang nyaman dibaca, atur sampai nyaman." | 90 dtk | – |
| T1 | "Cari tugas Anda yang harus selesai hari ini." | 60 dtk | ✔ |
| T2 | "Mulai kerjakan tugas itu, lalu centang satu langkahnya." | 90 dtk | ✔ |
| T3 | "Tulis catatan 'Sudah saya cek' pada tugas itu." | 60 dtk | – |
| T4 | "Tambahkan tugas baru 'Beli cat dapur' untuk Anda sendiri, tenggatnya besok." | 120 dtk | ✔ |
| T5 | "Tugas 'Beli cat dapur' sudah beres. Tandai selesai." | 60 dtk | ✔ |
| T6 | "Tugas lain ini tidak jadi dikerjakan. Batalkan dan tulis alasannya." | 90 dtk | – |
| T7 | "Lihat seberapa jauh proyek Renovasi Dapur." | 60 dtk | – |

Catatan fasilitator per tugas:

- **T1**: tugas yang benar adalah satu-satunya yang bertenggat hari ini ("Cek ukuran lemari dapur", 3 langkah). Berhasil bila penguji membuka tugas itu.
- **T2**: berhasil bila status menjadi Sedang dikerjakan **dan** satu langkah tercentang.
- **T3**: berhasil bila komentar "Sudah saya cek" tersimpan pada tugas T1.
- **T4**: sebelum sesi tugas "Beli cat dapur" belum ada. Berhasil bila ada satu tugas itu, milik penguji, bertenggat besok.
- **T5**: berhasil bila status tugas itu Selesai.
- **T6**: tugas yang dimaksud ("Pesan keramik lantai tambahan") terlihat di daftar penguji; berhasil bila statusnya Dibatalkan dengan alasan terisi.
- **T7**: berhasil bila penguji membuka Ringkasan proyek dan dapat menyebut kira-kira seberapa jauh (boleh "sekitar sepertiga" dan sejenisnya).

## 5. Kriteria gagal

Satu tugas **gagal** bila penguji:

1. meminta bantuan ("Saya tidak tahu, bisa tolong?"),
2. menyerah atau berkata ingin berhenti pada tugas itu,
3. melewati **3× batas wajar** tanpa kemajuan (T1: 180 dtk, T2: 270 dtk, T3: 180 dtk, T4: 360 dtk, T5: 180 dtk, T6: 270 dtk, T7: 180 dtk, T0: 270 dtk).

Setelah gagal, katakan "Terima kasih, kita lanjut ke tugas berikutnya." Jangan memberi tahu cara yang benar sampai sesi selesai.

Catat juga: salah ketuk, jeda > 15 detik tanpa tindakan, waktu selesai (detik), dan kutipan penguji.

## 6. Tiga pertanyaan penutup

Tanyakan persis, lalu catat jawaban dan kutipannya:

1. "Menurut Anda, mudah atau sulit memakai aplikasi ini?"
2. "Seberapa yakin Anda bahwa yang Anda kerjakan tadi benar?"
3. "Apakah Anda paham apa yang terjadi di layar setiap kali menekan tombol?"

## 7. Penutup

> "Terima kasih. Data di layar ini fiktif dan akan dihapus. Apakah ada hal lain yang ingin Anda sampaikan?"

Setelah sesi: jalankan ulang seed `uji`, isi bagian ringkasan di lembar catat, dan jangan menyimpan nama atau data pribadi penguji di repo (cukup `Penguji-N (dummy)` atau kode).

## 8. Kriteria lulus putaran

- **Lulus gerbang S2**: ≥ 3 penguji sungguhan berusia ≥ 50 menyelesaikan T1, T2, T4, T5 tanpa bantuan.
- **Gagal**: perbaikan ≤ 3 hari, lalu ulang dengan ≥ 2 penguji baru (ASUMSI di P3); S3 tidak dimulai.
- Target S8 (bukan gerbang S2): ≥ 4 dari 5 menyelesaikan T4 dan T5 dalam ≤ 3 menit.
- Temuan yang bukan penghalang masuk daftar S3.
