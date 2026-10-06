# PRO — Ronde 2

## Tanggapan atas poin lawan

**K-P1 (duplikasi cuma pindah).** Saya terima soal "1h": tulis "Sudah lewat 1 hari" (`fitur-ringkasan.md` §3). Penyebutan ulang di Briefing juga dobel, dan Briefing saya tunda (lihat Revisi). Yang saya pertahankan: satu baris dengan tiga alasan tetap satu pekerjaan. Lima card dengan lima angka tetap lima tempat.

**K-P2 (dirancang untuk engineer).** Benar untuk A1 (§8 asumsi 4). Tapi 14 card yang dibela KONTRA berasal dari spesifikasi yang sama: `note.md` menamai menunya "KPI, Overdue, dan Prioritas", dan isinya "ghost reminder", "snapshoot", "bug", "ready for qc". Kalau alasan "dirancang untuk engineer" dipakai, yang paling kena justru 14 card. Soal Zona B terlalu ramai (4 tab, toggle, 3 tombol): saya akui, dan saya pangkas.

**K-P3 (dashboard tetap model tarik).** Sebagian saya akui. Tapi pesan "Hari ini: 1… 2…" ke WhatsApp (U15, USP-3) butuh *satu daftar terurut* sebagai sumbernya. 14 card tidak bisa dijadikan satu pesan. Jadi daftar Fokus adalah mesin di balik pesan dorong, bukan saingannya.

**K-P4 (cuma salah definisi).** Diakui, definisi "aktif" dibereskan di spesifikasi (A1 §7). Tapi definisi yang seragam tidak menghentikan satu task muncul di lima card. Soal "segera" yang punya banyak versi juga saya terima: Tahap 1 hanya memakai satu jendela waktu.

**K-P5 (KPI strip enterprise).** Saya akui melewatkan tanda ❌ di `fitur-ringkasan.md` §3. "Kapasitas tim %" dibuang karena estimasinya "sering kosong" (A1 §8 asumsi 5). Peran PM tidak lagi wajib. Kalau koperasi Bu Sri tidak punya PM, strip itu tidak pernah muncul.

**K-Antisipasi.** (a) Benar, Zona C keluar dari MVP. Di A1 §5 pun N3 masuk v1. (b) "Lihat semua" persis rumusan U13 yang dikutip KONTRA: "Daftar lengkap ada di belakang tombol 'Lihat semua'" (§13.2). (c) Beban bukti saya terima. Uji kedua versi ke 5–8 lansia (`rangkuman-gabungan-usp.md` §13.4 no. 3). Lagi pula, siapa "user lama" di segmen yang belum memakai produk ini? (d) Mitigasinya sudah ada di A1 §6.3: batch harian, cache, bisa dimatikan.

## Argumen utama

**Revisi: rombak bertahap. Arah 4 zona tetap, Tahap 1 jauh lebih ringan.**
1. **Tahap 1, layar "Hari ini":** 1–3 task teratas. Urutannya memakai aturan satu kalimat yang KONTRA usulkan sendiri: *yang paling lama telat dulu, lalu tenggat terdekat*. "Mandek" cukup jadi label, tanpa bobot. Tombol besar [Sudah selesai] [Besok saja] [Minta bantuan] (USP-3). Tidak ada tab maupun toggle. "Lihat semua" membuka daftar per tenggat, jadi pola R7 tetap ada (A1 §4.1). Di bawahnya agenda hari ini.
2. **Tahap 2 (setelah uji):** kabar harian dikirim ke luar aplikasi.
3. **Ditunda:** Zona C, KPI strip, Inbox ringkas.

Sebagian besar Tahap 1 adalah MERGE berlabel S di A1 §3 (R4, R5, R8, R10, R11); hanya R7 yang M. N1, N3, dan N5 keluar dari Tahap 1.

**Biaya mempertahankan 14 card bagi lansia** (penalaran, bukan data terukur):
- Nama asing ("Ghost reminder", "Snapshot", "Bug") mengulang kelemahan 10/10 kompetitor (`rangkuman-gabungan-usp.md` §4).
- U3 Teks Besar ada di peringkat 1 (§13.1). Dengan teks besar, 14 card berarti gulir panjang.
- 14 card tidak bisa dijadikan satu pesan WhatsApp, padahal kanal itulah pembeda kita (`gabungan-core…` §6).

## Serangan / pertanyaan balik untuk lawan

**Jawaban atas pertanyaan KONTRA:**
1. A1 memang tidak dirancang untuk lansia. Yang cocok adalah prinsipnya (satu task muncul sekali, satu daftar, alasan berbahasa polos) dan layar Tahap 1 yang mengambil U13 dan USP-3.
2. Daftar itu bisa *didorong* keluar aplikasi (K-P3).
3. Zona C ditunda. Zona A menjadi kabar dorong di Tahap 2.
4. Bobot dihapus. Aturannya cukup satu kalimat, aturan usulan KONTRA sendiri.

**Pertanyaan balik:**
1. Perbaikan 4 KONTRA menambah tab ke R7, sementara tab di Zona B diserang. Jadi tab itu buruk atau tidak?
2. R8 versi KONTRA hanya memuat task yang telat. Task yang tenggatnya hari ini masuk ke mana? Kalau ke R7 dan R10, bukankah itu dobel lagi?
3. Perbaikan kecil mana yang mengganti "Ghost reminder" dan "Snapshot" dengan bahasa polos? Kalau semua nama diganti dan card dilipat, apa bedanya dengan Tahap 1 saya?
