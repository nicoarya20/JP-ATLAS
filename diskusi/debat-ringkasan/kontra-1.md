# KONTRA — Ronde 1

## Tanggapan atas poin lawan

**P1 (duplikasi terbukti).** Diakui: R8 dan R10 bagian dari R7 (A1 §2.1). Itu alasan merapikan dua card, bukan membangun 4 zona, mesin skor, briefing AI, kolom tanya, dan pembagian peran. Duplikasinya pun cuma pindah. Di wireframe A1 §4.1, "Fix login SSO" tampil sebagai "Telat 1h · Memblokir 3 · Mandek 4h", lalu disebut lagi di poin pertama Briefing. Bagi Bu Sri, "1h" itu satu hari atau satu jam?

**P2 (Bu Sri bingung).** Skenario PRO ditandai "bukan data". Yang tertulis justru A1 §8 asumsi 4: pengguna utama "tim produk/engineering kecil–menengah (5–50 orang)". Usulan ini dirancang untuk engineer, lalu dicat ulang untuk lansia. Zona B di A1 §4.1 memuat 4 tab ([Semua][Dikerjakan][Menunggu QC][Dibuka ulang]), toggle [Prioritas|Per tenggat], 3 tombol per task, dan Inbox ringkas. U13 yang dikutip PRO meminta "satu-dua tugas besar, satu tombol besar", dan solusinya sendiri berlabel "hipotesis saya, belum diuji" (`rangkuman-gabungan-usp.md` §13.2).

**P3 (Zona B jadi pembeda).** Terbalik. Baris yang dikutip PRO (`gabungan-core…` §4) mengkritik model *tarik*: "pengguna membuka panel atau kalender, lalu membaca daftar". Dashboard zona apa pun tetap panel yang harus dibuka, sama seperti Asana Dash. Pembeda menurut riset ada di luar aplikasi: "Tidak perlu buka aplikasi. Balas saja pesannya" (§6), dan USP-3 berupa pesan bertombol [Besok saja] [Minta Sari bantu] (§5). "[Update status]" di Zona B malah membuka status seperti "Menunggu QC". Kalau nilai intinya jalan tanpa AI, kenapa dua dari empat zona berbasis AI? Riset segmen menaruh U8 AI Pemandu di "Turun" (`rangkuman-gabungan-usp.md` §13.1).

**P4 (angka tidak cocok).** Ini salah definisi, bukan salah tata letak; A1 sendiri menyerahkannya ke A3 (§7). Seragamkan definisi "aktif" di spesifikasi, selesai tanpa menghapus card. Desain baru malah menambah versi "segera": chip `DUE_SOON` "+2 hari kerja", tampilan *Per tenggat* "minggu ini", Briefing "jatuh tempo Jumat" (A1 §4.1).

**P5 (KPI strip).** `fitur-ringkasan.md` §3 memberi ❌ "terasa enterprise" untuk KPI strip dan peran PM/Member. PRO mengutip tabel itu soal Zona C tapi melewati baris ini. Di koperasi Bu Sri, siapa PM-nya? "Kapasitas tim %" butuh estimasi jam yang menurut A1 §8 asumsi 5 "sering kosong".

**Antisipasi PRO.** (a) Zona C diakui berat, jadi "4 zona" di mosi tinggal 3. (b) Tab terpisah mirip kelemahan "fitur penting disembunyikan" di 5 kompetitor (`rangkuman-gabungan-usp.md` §4). (c) "Keduanya belum diuji": beban bukti ada pada yang mau mengubah. A1 sendiri mempertahankan tampilan *Per tenggat* "bagi user yang terbiasa" (§4.1), artinya kebiasaan user lama itu nyata. (d) "AI hanya bercerita": A1 §6.3 mencatat risiko briefing jadi spam dan biaya token membengkak.

## Argumen utama

Cukup perbaikan kecil, semuanya effort S menurut skala A1 §3:
1. R8 diurutkan "paling telat dulu" dan diberi judul "Kerjakan ini dulu".
2. Satu definisi "aktif" dan satu jendela waktu untuk semua card.
3. R6 diberi pembanding minggu lalu.
4. Jika perlu, R8 dan R10 dilipat jadi tab di R7.

Perombakan berarti N1 (M), N2 (M), N3 (L), N5 (M) (A1 §5), ditambah semua user lama belajar ulang.

## Jawaban atas pertanyaan PRO

1. *Perlu perhatian kamu* (R8), setelah perbaikan 1. "Yang paling telat dulu" bisa dijelaskan ke Bu Sri dalam satu kalimat. Rumus "prioritas × urgensi + bobot…" tidak, dan bobotnya belum ditetapkan di dokumen mana pun.
2. Dengan satu definisi "aktif" (perbaikan 2), kedua angka cocok.
3. Melipat bagian ke card induknya adalah perapian: tidak ada zona baru, AI, atau peran baru.

## Serangan / pertanyaan balik untuk lawan

1. A1 mengasumsikan pengguna tim engineering 5–50 orang. Bagian mana dari 4 zona yang benar-benar dirancang untuk lansia, bukan cuma diberi label bahasa Indonesia?
2. Kalau Zona B tetap panel yang harus dibuka, apa bedanya dengan model *tarik* Asana Dash yang PRO kritik sendiri?
3. Untuk apa membangun Zona A dan C kalau riset segmen menurunkan prioritas AI dan PRO bilang nilai intinya jalan tanpa AI?
4. Berapa bobot rumus skor Fokus, dan bagaimana Bu Sri tahu kenapa task A di atas task B?
