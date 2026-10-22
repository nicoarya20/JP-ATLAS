# X2 — Keputusan domain, izin, dan produk S0–S2 (Simple PM)

> Tanggal: 15 Oktober 2026 · Gelombang 2, tinjauan silang tahap 1 · Lingkup: S0.0, S0.a, S0.b, S1 (Proyek + profil), S2 (Tugas inti).
> STATUS: lengkap (v1). S3 ke atas hanya muncul di Kelompok 3 kuesioner.

## 1. Ringkasan
1. Hasil: **kuesioner 34 butir** (22 pertanyaan Q1-Q22 + 12 default D1-D12), dalam 3 kelompok: **10 wajib sebelum S0**, **4 sebelum S1/S2**, **8 boleh nanti**. Pilihan (a) tiap butir = saran saya, jadi user bisa menjawab "ikut saran" dan hanya mengisi Q10 (kapasitas peninjau).
2. **Yang benar-benar mengubah kode S0.a/S0.b** (jawab dulu): zona waktu (Q1), batas email Google (Q2), orang tanpa akun Google (Q3), nasib akun anonim lama (Q4), tugas tanpa proyek (Q5, mengubah `project_id` NOT NULL), pengerja menyetujui sendiri (Q6), PM bukan anggota (Q7), visibilitas email/HP (Q8, bentuk respons API), impersonasi (Q9).
3. **Kontradiksi desain** (2B): 19 baris R03 yang menyentuh S0-S2 + 5 temuan lintas laporan (N1-N5), tiap baris punya default dan daftar dokumen yang perlu disunting pemiliknya. Dokumen terbanyak: `project.md`, `task.md`, `diskusi/00`, `diskusi/03-tugas`.
4. **Atlas (2C):** progres benar **17%** (1 selesai dari 6 tugas), bukan 70%. Tabel tugas tidak diubah; angka tahapan juga salah (Pengembangan "60%" sebenarnya "waktu berjalan"; hitungannya 0%), dan tab Tugas ⑨ kehilangan #17.
5. **Asumsi (2D):** semua P-A1..P-A3, T-A1..T-A10 punya konstanta (R03 §3.5) dengan keputusan "dipakai"; P-A4/P-A5 ditunda ke fase 5 tanpa kode. Ada 6 konstanta baru bertanda ★.
6. **Tabel izin final (2E):** 3 tabel (akun/area, proyek, tugas). Selisih penting terhadap fondasi kode: Admin boleh ubah Member↔PM (kini hanya super-admin), `TARGET_PROTECTED` untuk super-admin, `SELF_TARGET`, blok aksi merusak saat menyamar, `/api/auth/admin/*` ditutup, sign-up email ditutup di server.
7. Temuan baru yang tidak ada di R03: **Member tidak bisa membuat proyek**, jadi Member baru tak bisa membuat tugas sampai diajak ke proyek (disengaja, ditanyakan di Q5). R10 menulis dua kriteria uji pengguna berbeda (≥3/5 dan ≥4/5; Q14). R10 menguji "12 transisi" di S2 padahal tombol Periksa baru S4 (N3).

## 2. Isi utama
### 2A. Kuesioner untuk user (Q1..Qn)
**Cara menjawab:** cukup tulis nomor dan huruf, mis. "Q1 a, Q2 a, Q10 = 4 hari". Jawab "ikut saran" untuk semua bila ragu: **pilihan (a) di setiap butir adalah saran saya** (kecuali Q10, jawaban angka dari Anda). Total **34 butir**: 22 pertanyaan (Q1-Q22) + 12 default (D1-D12) yang berlaku kecuali Anda bantah. Dedup: butir yang sama di beberapa laporan digabung dan sumbernya dicatat (R03/R07/R08/R09/R10/R12, `00-role-dan-area §8`, `user-profile.md`, `task.md`). Pertanyaan teknis murni (pustaka tes, CI, versi Bun, squash migrasi) bukan di sini; itu milik X1.

#### Kelompok 1 — WAJIB DIJAWAB SEBELUM S0 (mengubah kontrak beku S0.a/S0.b)

| No | Pertanyaan | Pilihan | Saran dan alasan | Dampak bila salah | Irisan |
|---|---|---|---|---|---|
| Q1 | Apakah semua orang di tim memakai jam yang sama (WIB)? (R03 K22/Q5, R07 Q2, R08 Q5, R09 Q2, R10 Q9) | **(a)** Ya, semua WIB · (b) Ada yang di WITA/WIT | **(a).** Seluruh dokumen desain dan data contoh berpatokan WIB; satu zona membuat "Hari ini/Terlambat" sama untuk semua. Bisa diganti ke zona tunggal lain lewat `APP_TIME_ZONE`. | Tim lintas zona melihat tugas "hari ini" terlambat/belum selama 1-2 jam; zona per orang berarti mengubah semua rumus dan test (±2-3 hari) | S0.b (konstanta), S1, S2 |
| Q2 | Siapa yang boleh mencoba masuk lewat Google? (`00 §8.2`, `user-profile` Q3, R12 Q1) | **(a)** Siapa saja; tanpa undangan harus disetujui Admin · (b) Hanya email kantor tertentu · (c) Hanya yang diundang | **(a).** Persetujuan Admin sudah menjadi pagar; mengunci domain menyulitkan tamu dan keluarga yang pakai Gmail. Daftar domain boleh diisi kelak (`ALLOWED_EMAIL_DOMAINS`, kosong = semua). | Terlalu longgar: banyak permintaan menunggu; terlalu ketat: orang sah ditolak. Mengubah cukup satu setelan, tetapi akun yang sudah masuk tidak ikut tercabut | S0.a |
| Q3 | Bagaimana dengan orang yang tidak punya akun Google (mis. orang tua yang dibantu keluarga)? (R10 Q7) | **(a)** Wajib akun Google; keluarga/Admin membantu membuatkan · (b) Sediakan masuk dengan email + kata sandi juga di produksi | **(a).** Kata sandi membuka kembali celah daftar sendiri (R12 F1) dan mudah terlupa oleh lansia. Dicatat sebagai temuan uji pengguna. | Sebagian calon pengguna tidak bisa masuk (masalah adopsi, bukan bug). Memilih (b) menambah ±3-5 hari dan memperluas permukaan serangan | S0.a |
| Q4 | Akun percobaan (anonim) lama yang masih tersimpan: ditandai ditolak, dihapus, atau dibiarkan? (R09 Q6, R14 Q5) | **(a)** Tandai "ditolak" (data tetap, tidak bisa masuk); biar pembersih demo yang ada menghapusnya · (b) Hapus saat migrasi · (c) Biarkan, jadi "disetujui" | **(a).** Akun nyata lama otomatis "disetujui" (`00 §4`); akun anonim tidak boleh lolos pagar persetujuan karena sign-in anonim dimatikan. | (c) meloloskan akun tak dikenal ke area produk; (b) tak bisa dibatalkan. Menentukan asersi migrasi E3 (R09) | S0.a (migrasi 0014) |
| Q5 | Bolehkah ada tugas pribadi tanpa proyek? (`task.md` Q10) | **(a)** Tidak, setiap tugas masuk satu proyek · (b) Ya | **(a).** Seluruh izin (Pengelola/Anggota/Pemantau) diturunkan dari proyek. Catatan: Member tidak bisa membuat proyek, jadi Member baru baru bisa membuat tugas setelah diajak ke proyek; ini disengaja. | (b) menjadikan `project_id` boleh kosong: matriks izin, Tugas saya, Sampah, dan test berubah (±5-8 hari), sulit dibalik setelah data masuk | S0.b (skema), S2 |
| Q6 | Bila tugas butuh diperiksa, bolehkah pengerjanya menyetujui hasilnya sendiri? (R03 K2/Q1/K3) | **(a)** Tidak (juga Admin); tanpa orang lain, "Minta diperiksa" ditolak dengan pesan jelas · (b) Boleh bila ia satu-satunya Pengelola/Admin | **(a).** Inti "periksa" adalah pandangan kedua; fitur ini bawaan mati, jadi tim satu orang cukup membiarkannya mati. Pesan: "Belum ada orang lain yang bisa memeriksa. Minta Admin menambah Pengelola." | (b) membuat periksa hanya formalitas dan menyisakan celah di DB. Berubah setelah beku = mengubah kontrak izin dan test | S0.b (kontrak), S4 (tombol) |
| Q7 | Project Manager yang tidak ikut sebuah proyek: boleh melihat proyek dan tugasnya? (P-A1, R03 K10/Q2) | **(a)** Boleh lihat saja, tanpa berkomentar · (b) Boleh lihat dan berkomentar · (c) Tidak melihat sama sekali | **(a).** PM butuh gambaran lintas proyek; komentar dibatasi anggota agar obrolan tetap milik tim proyek. (Member bukan anggota tetap tidak melihat: R03 §2.2 kolom BA.) | Hanya satu flag (`P_A1_…`), tetapi (c) membuat "Semua proyek" kosong bagi PM dan mengubah tampilan | S0.b, S1, S2 |
| Q8 | Siapa boleh melihat email dan nomor HP orang lain? (R12 Q5, `07-tim` Q2) | **(a)** Email: sesama anggota proyek; HP: pemilik dan Admin saja · (b) Semua orang melihat keduanya · (c) Hanya pemilik dan Admin | **(a).** Rekan satu proyek perlu saling menghubungi; HP lebih sensitif (UU PDP). Pemilihan anggota proyek hanya menampilkan nama dan jabatan. | Mengubah setelah API terbit = mengubah bentuk respons (breaking). (b) membocorkan data pribadi ke seluruh tim | S0.b (bentuk respons profil), S1, S0.a |
| Q9 | Saat super-admin "masuk sebagai orang lain" untuk membantu, bolehkah ia menghapus atau mengubah peran? (R12 Q7) | **(a)** Tidak; hanya melihat dan aksi biasa, aksi merusak diblokir · (b) Boleh semuanya seperti sekarang | **(a).** Menyamar umumnya untuk membantu ("lihat kenapa tidak bisa"); aksi merusak tidak perlu dan tercatat atas nama orang lain. Biaya ±0,5 hari di guard. | (b): satu salah klik menghapus data orang lain atas nama orang itu | S0.a |
| Q10 | Berapa hari per minggu ada peninjau manusia untuk hasil kerja AI, dan bolehkah ada peninjau kedua khusus S0.b dan keamanan? (R10 Q3) | Jawab angka: (a) ≥ 4 hari · (b) 1-2 hari · (c) dua peninjau | **Isi sendiri; saran: peninjau kedua untuk S0.b.** Kontrak beku adalah dasar semua irisan; kesalahan di sini paling mahal. R10 §5: 8-12 minggu bila peninjau ≥ 80% tersedia, 13-18 minggu bila paruh waktu. | Kalender meleset 5-6 minggu; tanpa peninjau kedua, salah kontrak lolos ke S1-S2 | S0.0-S2 (jadwal) |

#### Kelompok 2 — SEBELUM S1/S2 (boleh dijawab setelah S0 berjalan, tetapi sebelum irisannya dimulai)

| No | Pertanyaan | Pilihan | Saran dan alasan | Dampak bila salah | Irisan |
|---|---|---|---|---|---|
| Q11 | Saat orang membuka satu tugas, tampil sebagai halaman penuh atau panel samping? (R10 Q1; `03-tugas` #17 "Usulan Claude") | **(a)** Halaman penuh · (b) Panel samping (drawer) | **(a).** Satu tempat untuk deskripsi, langkah, bukti, obrolan; tombol Kembali jelas; alamat bisa dibagikan; muat di tablet. Rute `/app/tasks/:id` sudah masuk stub S0.b. | Berpindah belakangan mengubah rute, komponen, dan tautan Inbox (±3-4 hari). Memblokir S2 | S2 |
| Q12 | Proyek yang sudah Selesai/Dibatalkan/Ditunda: tugasnya masih boleh ditambah dan diubah? (R03 Q7) | **(a)** Boleh; hanya Sampah yang mengunci · (b) Terkunci sampai status dibuka lagi | **(a).** Revisi kecil setelah "Selesai" lazim; tombol yang tiba-tiba hilang membingungkan awam. Tampilkan catatan lembut "Proyek ini sudah Selesai". | (b) menambah aturan di setiap tombol tugas (±1-2 hari); (a) membuat progres proyek bisa turun lagi setelah Selesai | S1, S2 |
| Q13 | Untuk akun baru, ukuran huruf awalnya Normal atau Besar? (R08 Q8) | **(a)** Normal; orang memilih di Profil · (b) Besar untuk semua · (c) Ditanya sekali saat masuk pertama | **(a).** Cocok bagi sebagian besar; tinjau ulang setelah uji pengguna putaran 1 (skala 1,125/1,25 belum teruji). Satu konstanta + DEFAULT kolom. | Murah diubah, tetapi kesan pertama lansia buruk bila terlalu kecil; (c) menambah satu layar | S1 (ukuran teks) |
| Q14 | Siapa 5 orang berusia ≥ 50 tahun yang mau menguji di akhir S2, dan apa ukuran "berhasil"? (R10 Q8, R09 Q9) | **(a)** Gerbang S2: ≥ 3 dari 5 selesai tanpa bantuan (temuan dicatat); rilis S8: ≥ 4 dari 5 dalam ≤ 3 menit · (b) Pakai ukuran S8 sejak S2 | **(a).** R10 menulis dua angka berbeda (§3.3 S2: ≥ 3 dari 5; §6 Q8: ≥ 4 dari 5); putaran 1 untuk menemukan masalah, bukan lulus/gagal. Mohon nama/kelompok penguji. | Tanpa penguji nyata, klaim "mudah untuk lansia" tidak teruji; mencari penguji terlambat menahan akhir S2 | S2 |

#### Kelompok 3 — BOLEH NANTI (S3 ke atas; tidak mengubah kode S0-S2)

| No | Pertanyaan | Pilihan | Saran dan alasan | Dampak bila salah | Irisan |
|---|---|---|---|---|---|
| Q15 | Setuju urutan fitur yang digeser: Periksa "penting tapi sederhana", Kalender dan acara berulang "nanti", "Terlambat 3 tombol" dan "Giliran Anda" tidak wajib? (R10 Q2, Q6) | **(a)** Setuju · (b) Naikkan "Giliran Anda" dan "Terlambat 3 tombol" jadi wajib | **(a).** Ulas ulang setelah uji pengguna S2. | (b) menambah ±4-6 hari di S3/S4 | S3-S4 |
| Q16 | Aturan kartu Inbox: kartu "Periksa" hanya ke pemeriksa yang ditunjuk; kartu mention boleh punya tautan "Tidak perlu dibalas"; kartu selesai 30 hari dan mention 14 hari; pengingat acara tetap di "Kabar terbaru"? (R07 Q3-Q5, Q7) | **(a)** Setuju semua · (b) Kirim "Periksa" ke semua Pengelola | **(a).** Lebih sedikit kebisingan; Pengelola lain melihatnya di Tugas. | Hanya perilaku `notify()`; mudah diubah | S3-S4 |
| Q17 | Lonceng pemberitahuan di menu samping (dan bar atas di HP), bukan bar atas baru di desktop? (R07 Q1) | **(a)** Di menu samping · (b) Bar atas desktop baru | **(a).** (b) mengubah kerangka semua area (±2-3 hari). **Catatan untuk S0.b:** jangan menambah bar atas desktop. | Perubahan `AppFrame` untuk semua area | S3 |
| Q18 | Events: hapus acara berulang = "kejadian ini dan seterusnya"; ubah acara berulang hanya "kejadian ini"; "Tugas dari rapat" manual ikut MVP; mengundang peserta hanya dari anggota proyek? (R08 Q1-Q4, Q9) | **(a)** Setuju semua · (b) Hapus seluruh rangkaian termasuk yang lampau; undang semua pengguna | **(a).** Melindungi notulensi lama dan privasi (selaras Q8). | Notulensi lama bisa hilang bila (b) | S7 |
| Q19 | Lama simpan log (kunjungan 90, masuk 180, batas laju 30, API 90, audit 730 hari); email di audit diganti "Mantan anggota" setelah akun dihapus? (R12 Q3) | **(a)** Pakai angka itu, email dianonimkan · (b) Angka lain/tanpa anonimisasi | **(a).** ASUMSI R12; minta tinjauan legal (Q21). | Risiko kepatuhan, bukan kode | S8 |
| Q20 | Lampiran bukti: hanya gambar dan PDF dulu, maks 10 MB per berkas, maks 10 berkas per tugas? (R12 Q6) | **(a)** Ya (docx/xlsx menyusul) · (b) Semua format | **(a).** Menghindari SVG/HTML (XSS) dan berkas berat. Angka 10 adalah ASUMSI (`ATTACHMENT_MAX_BYTES`). | Penyimpanan membengkak atau celah XSS | S5 |
| Q21 | Siapa yang memeriksa kebijakan data pribadi (UU PDP) dan kapan? (R12 Q9) | **(a)** Tunjuk satu orang sebelum S8 untuk kebijakan dasar; fitur AI baru setelah tinjauan penyedia · (b) Setelah rilis | **(a).** Syarat rilis publik. | Penundaan rilis atau risiko hukum | S8, fase 5 |
| Q22 | Beban kerja Tim ikut menghitung tugas di proyek Ditunda/Selesai/Dibatalkan; tabel "Peran dan izin" (baca saja) tampil setelah Anda mengonfirmasi asumsi? (R03 Q10, R08 Q7) | **(a)** Ikut dihitung selama tugas aktif; tabel menyusul setelah Q5-Q12 dijawab · (b) Tidak dihitung; tabel sekarang | **(a).** Beban nyata tetap ada walau proyek ditunda. | Angka beban meleset | S6 |

#### Default yang dipakai kecuali dibantah (D1-D12)

| No | Default | Sumber | Bila dibantah | Irisan |
|---|---|---|---|---|
| D1 | Member yang ditunjuk Pengelola proyek mendapat semua hak Pengelola di proyek itu (lihat beban, item Sampah, ubah acara proyeknya) | R03 K1/Q3 | Ubah `Level` di policy | S0.b |
| D2 | Admin tetap berhak penuh di proyek mana pun walau tercatat Pemantau | R03 K6/Q4 | Ubah satu aturan di policy | S0.b |
| D3 | Anggota tidak bisa keluar sendiri; hanya Pengelola/Admin yang mengeluarkan (`MEMBER_CAN_LEAVE_PROJECT=false`) | R03 Q6 | Satu flag + tombol | S1 |
| D4 | Lead tidak bisa diturunkan/dikeluarkan; dialog menawarkan "Jadikan Lead lain" | R03 K4/Q11 | Ubah aturan `IS_LEAD` | S1 |
| D5 | "Mandek" = hari kalender, lebih dari 72 jam; "Segera jatuh tempo" 2 hari kalender | R03 Q8, R07 Q6 | Ubah `TASK_STALE_DAYS` | S2 |
| D6 | Pengelola/Admin boleh menghapus komentar dan bukti milik orang lain (moderasi) | R03 Q9 | Ubah baris izin | S2 |
| D7 | Hapus akun: konten tetap atas nama "Mantan anggota"; hapus akun tetap hanya super-admin (fondasi `server/api/admin.ts:128-131`) dan kartu Hapus akun disembunyikan dari pengguna biasa; akun Pengelola tunggal tidak diblok, dialog menampilkan proyek yang jadi yatim | R12 Q2, R08 Q6, R03 K5 | Pilihan hapus berantai butuh migrasi FK | S0.a, S6 |
| D8 | Role Admin (termasuk lewat undangan) hanya bisa diberikan super-admin; super-admin tidak bisa diubah lewat UI; tidak ada aksi akun atas diri sendiri | R03 K14/K15, `00 §3` | Ubah matriks 00 §3 | S0.a |
| D9 | Halaman tahan: satu rute dengan dua keadaan (menunggu / ditolak + alasan); riwayat keputusan lewat `audit()`, tanpa tabel `user_approval_logs`; profil: hanya nama wajib (dari Google), HP/jabatan/divisi opsional | `00 §8.1,§8.3`, `user-profile` Q2 | Tambah tabel/validasi | S0.a |
| D10 | Fitur AI/rekaman bawaan **mati**; Mode Pendamping ditunda, Pemantau diberi teks "Anda hanya bisa melihat proyek ini" | R12 Q4, R10 Q5, 2B N4 | Satu nilai bawaan | S0.b |
| D11 | Tenggat proyek opsional (tanpa tenggat tak bisa Terlambat); 3 jenis tugas bawaan (Tugas, Bug, Ide); tanpa sub-tugas (checklist cukup); estimasi jam disimpan tetapi disembunyikan di form | R03 K21, `task.md` #11-12, R10 T13 | Tampilkan di form | S1, S2 |
| D12 | Data contoh Atlas mengikuti rumus (progres **17%**, bukan 70%); target 1.000 tugas per tim dengan p95 < 300 ms; deploy/push/tag hanya atas perintah eksplisit Anda | 2C, R09 Q8, R10 Q10 | Ubah data seed / angka uji | S1, S2 |

### 2B. Tabel kontradiksi desain dan koreksi dokumen
Sumber kontradiksi: R03 §2.3 (K1-K23), ditambah temuan lintas laporan (N1-N5). Hanya baris yang menyentuh S0-S2; K11-K13 dan K17 (Events, Tim, Sampah) ditunda ke S6/S7 dan tidak dibahas. "Dokumen" = file desain yang PERLU DIUBAH PEMILIKNYA agar sinkron (saya tidak mengubah apa pun). Path relatif ke `tahapan-proyek/03-desain/erd/` kecuali disebut lain. `D/` = `diskusi/`.

| # | Bentrokan (ringkas) | Irisan | Keputusan default | Dokumen yang diubah |
|---|---|---|---|---|
| K1 | Matriks `05/07/08/09` per role akun vs peran proyek: Member yang jadi Pengelola tak punya kolom | S0.b | Hak = Admin ∨ peran proyek; PM akun hanya punya hak tingkat aplikasi (di S0-S2: `project.create`). Menu/tombol diturunkan dari kapabilitas, bukan role | `project.md` dan `task.md` §Hak akses: tambah kolom "Member + Pengelola"; `D/05-events §2`, `D/07-tim §2`, `D/08-sampah §2`, `D/09-pengaturan §2`: ganti kolom role dengan catatan "peran proyek ikut menentukan" |
| K2 | `D/03-tugas` #8 "semua Pengelola boleh periksa" vs #7 "pemeriksa ≠ pengerja"; CHECK DB hanya `reviewer_id <> assignee_id` | S0.b (kontrak), UI S4 | Pengerja tak boleh Setujui/Kembalikan tugasnya sendiri (Admin dan super-admin juga), kode `SELF_REVIEW` | `task.md` §Aturan pemeriksa + §Hak akses baris Setujui; `D/03-tugas` #7/#8 |
| K3 | Pemeriksa "jatuh ke Admin" bila tak ada Pengelola lain, tapi bisa tak ada Admin | S0.b | `requestReview` ditolak `NO_ELIGIBLE_REVIEWER` bila tak ada kandidat; `doctor` memperingatkan `SUPER_ADMIN_EMAILS` kosong | `task.md` §Aturan pemeriksa (tambah ayat); `D/03-tugas` #7 |
| K4 | Lead "wajib Pengelola" vs menurunkan/mengeluarkan Lead | S1 | Ditolak `IS_LEAD`; modal menawarkan "Jadikan Lead: …" | `project.md` §Anggota dan §Hak akses (tambah `IS_LEAD`); `D/02-proyek` aturan anggota |
| K5 | "Pengelola terakhir" hanya untuk keanggotaan; suspend/hapus **akun** Pengelola tunggal tak tercakup | S1 | Tidak diblok; modal menampilkan proyek yatim; pemeriksa jatuh ke Admin; Admin diberi tahu | `project.md` (kalimat "pengelola terakhir": tulis ruang lingkupnya); `D/00 §3` |
| K6 | Admin yang tercatat Pemantau: penuh atau terbatas (`workflow.md:1417` vs desain) | S0.b | Admin **selalu penuh**, apa pun peran proyeknya; peran proyek Admin hanya memengaruhi daftar kandidat pengerja | `project.md`, `task.md` §Hak akses (satu kalimat); catat di `02-analisis/.../workflow.md:1417` bahwa dikalahkan 03-desain |
| K7 | "Buka lagi": task.md (pembuat/pengerja) vs `D/03-tugas` (+pemeriksa) | S2 | Pakai `task.md`; hapus kata "pemeriksa" | `D/03-tugas` matriks hak akses |
| K8 | Matriks tak punya baris: Batal mulai, Pulihkan dari Dibatalkan, dependency, ganti pemeriksa, hapus komentar/bukti, keluar sendiri | S0.b/S2 | Batal mulai = Mulai; Pulihkan = Batalkan; dependency = Ubah isi; ganti pemeriksa = pembuat ∨ Pengelola/Admin; hapus komentar/bukti = penulis ∨ Pengelola/Admin; keluar sendiri = tidak ada (lihat 2A, default "Keluar sendiri") | `task.md` §Hak akses (tambah baris), `project.md` §Anggota (keluar sendiri) |
| K9 | "Mulai kerjakan: siapa pun yang klik jadi pengerja" vs A2 (Anggota hanya ubah miliknya) | S2 | Anggota hanya boleh mengambil tugas **tanpa pengerja** | `task.md` §Efek transisi baris `todo → in_progress`; `D/03-tugas` |
| K10 | A1 proyek: PM bukan anggota baca saja "termasuk tugasnya" vs Pemantau boleh komentar | S0.b/S1 | PM bukan anggota = baca saja, **tanpa komentar** (konstanta bisa dilonggarkan, lihat 2D). Pesan: "Anda bukan anggota proyek ini" | `project.md` A1 dan `task.md:58` (tulis "tanpa komentar"); `D/03-tugas` matriks komentar |
| K14 | `permissions.ts:78-84` `canActOnTarget(SA, apa pun)=true` vs `D/00 §1` (SA tak bisa diubah lewat UI) | S0.a | `TARGET_PROTECTED` untuk SA; `SELF_TARGET` untuk semua aksi akun atas diri sendiri | `D/00 §3` (tambah dua baris); kode `server/permissions.ts` (bukan dokumen) |
| K15 | `D/00 §4` (Admin mengisi role undangan) vs §3 (Admin tak boleh beri Admin) | S0.a | Undangan role Admin hanya super-admin | `D/00 §4` |
| K16 | Peran akun ⟂ peran proyek: turun PM → Member, peran Pengelola di proyek tetap? | S0.a | Tetap; modal konfirmasi menyebut "masih Pengelola di N proyek" | `D/00 §1` (tambah ayat) |
| K18 | `D/03-tugas §4.3` Tertahan vs `task.md` (pemblokir terhapus) | S4, kontrak S0.b | Pemblokir di Sampah tidak menahan (`task.md`) | `D/03-tugas §4.3` |
| K19 | Mandek "lebih lama dari 3 hari" (>) vs `note.md` "3 hari terakhir" (≥) | S2 | `>` 72 jam, hari kalender | `note.md` (hanya catatan); `task.md:471` tambah "72 jam" |
| K20 | Penyebut progres 0 bila semua tugas batal; pembulatan 99,6% → "100%" | S1 | Penyebut 0 → "Belum ada tugas" (bukan 0%); `Math.round` dibatasi 99 kecuali semua selesai | `project.md:373`, `D/02-proyek:136` |
| K21 | `due_date` boleh null; override lama muncul lagi setelah yang baru dihapus | S1 | Tanpa tenggat tak bisa Terlambat dan "Waktu berjalan" kosong; membuat override baru menutup yang lama (`cleared_at`) | `project.md` §Nilai yang dihitung (kondisi) dan tabel override |
| K22 | Semua rumus "hari ini" tak menyebut zona waktu | S0.b | Satu zona tim, `Asia/Jakarta`, dihitung sekali per request (menunggu Q1) | `project.md`, `task.md` §Nilai yang dihitung (judul bagian) |
| K23 | A1–A5/A1–A10 bernomor ganda (A1 = izin di proyek, notifikasi di tugas); A6 hilang; `D/00 §8.4` menyebut "A1–A3" | S0.b | Prefiks `P-A1..P-A5`, `T-A1..T-A10` (A6 = keputusan #7, bukan flag) | `project.md:410-414`, `task.md:511-525`, `D/00 §8.4` |
| N1 | `user-profile.md`/`project.md`/`task.md` memakai `uuid` + nama jamak (`projects`, `tasks`); fondasi memakai `text` + tunggal (R02, R14 Q1) | S0.b | Fondasi menang: id `text`, tabel tunggal. ERD tetap dibaca sebagai model konsep | Tambah spanduk "Konvensi implementasi: lihat R02" di atas ketiga file; **tidak** menulis ulang mermaid |
| N2 | `user-profile.md` masih memuat `INITIAL_ADMIN_EMAILS`, enum `role` lama (`user`), kolom `approved_by` bertipe uuid | S0.a | `D/00 §7` sudah menyatakan digantikan; terapkan | `user-profile.md` (enum role, hapus `INITIAL_ADMIN_EMAILS`, tipe kolom) |
| N3 | R10 §3.3 S2 menguji "12 transisi" termasuk Minta diperiksa/Setujui/Kembalikan, padahal tombol Periksa (T7) = S4 | S2/S4 | **Mesin status lengkap (12 transisi) dan endpoint dibangun di S2 di server + test; UI Periksa/Setujui/Kembalikan baru di S4** (ASUMSI; selisih biaya kecil, mencegah menulis ulang service di S4) | R10 §3.3 dan §3.1 baris T7 (catatan koordinator); tidak ada dokumen desain |
| N4 | `D/09-pengaturan.md:60` menulis Fitur AI/rekaman bawaan **hidup**; R12 Q4 dan R14 menyarankan **mati** | S0.b (nilai bawaan `app_setting`) | Bawaan **mati** (AI ditunda; keputusan teknisnya ada di X1 D3) | `D/09-pengaturan.md:60` |
| N5 | `D/03-tugas` keputusan #17 (halaman penuh, "Usulan Claude") vs brief "belum diputuskan" | S2 | Halaman penuh sampai user menjawab Q-detail (lihat Q11) | `D/03-tugas:41` tandai "belum final" |

### 2C. Koreksi data contoh Atlas (70% vs 17%)
**Temuan (R09 §1.4, §6.5; diverifikasi ulang saya di `03-desain/erd/diskusi/03-tugas.md:205-215` dan `02-proyek.md:160-170,258`).** Tabel tugas Atlas berisi 6 tugas non-batal: #8 (Selesai), #12, #14, #15, #16 (belum selesai), #17 (Menunggu diperiksa = belum selesai menurut `project.md:373`). #9 bukan tugas Atlas (milik Portal Klien PT Sinar). Rumus `done ÷ non-batal` = 1/6 = **16,7%**. Kolom Progres di `02-proyek.md:163` menulis 70%. Selisihnya bukan salah hitung kecil; angka 70% dipakai juga di prototipe `04-prototype/prototype/01-beranda.html:185` (S3, ditunda).

**Keputusan default: rumus menang, tabel tugas TIDAK diubah.** Alasan: tabel tugas Atlas sudah menjadi dasar banyak skenario (Terlambat #12, Hari ini #14, Tertahan #16, Menunggu diperiksa #17, kasus batas 1/5 = 20%); menambah ±11 tugas selesai agar jadi 70% merusak semua itu. Pembulatan: R03 K20 memilih "ke bawah" (16,7% → 16%), sedangkan R09/R10 memakai 17%. **Keputusan default: `Math.round`, dibatasi maksimal 99 kecuali semua tugas non-batal selesai** (tujuan K20 tercapai: 99,6% tidak tampil "100%"; Atlas tampil **17%**).

**Koreksi per dokumen dan angka:**

| # | Dokumen:baris | Tertulis | Diganti menjadi | Catatan |
|---|---|---|---|---|
| C1 | `diskusi/02-proyek.md:163` (tabel Data dummy) | Atlas Progres **70%** | **17%** | Sumber utama |
| C2 | `diskusi/02-proyek.md:170` | "Pengembangan (berjalan, **60%**)" | "Pengembangan (berjalan, **0%**)" | Rumus tahapan: tugas `phase=Pengembangan` = #12,#14,#15,#17 → 0/4. Angka 60% sebenarnya "Waktu berjalan" proyek (`02-proyek.md:258`: 36/60 hari), tertukar dengan progres tahapan |
| C3 | `diskusi/02-proyek.md:170` | Perencanaan "(selesai)" tanpa angka | tambah "100%" | #8 satu-satunya tugas fase ini, Selesai → 1/1 |
| C4 | `diskusi/02-proyek.md:170` | Pengujian, Rilis tanpa angka | Pengujian **0%** (#16: 0/1), Rilis **"Belum ada tugas"** | Rilis tak punya tugas; jangan tampil 0% (K20) |
| C5 | `diskusi/02-proyek.md:258` (keputusan kecil) | "Tab Tugas ⑨ diberi 5 baris: 3 dummy + Siapkan data uji + Susun rancangan" | **6 baris**: #8, #12, #14, #15, #16, #17 | #17 (Menunggu diperiksa) hilang dari daftar; tanpa itu penyebut jadi 5 dan progres 20%. Wireframe Penpot perlu disesuaikan oleh pemilik desain (tidak bisa saya akses) |
| C6 | `diskusi/03-tugas.md:205-215` | tabel 7 baris | **tidak berubah**; tambahkan kolom/keterangan "Proyek" agar jelas #9 = PT Sinar | Mencegah salah hitung penyebut |
| C7 | `04-prototype/prototype/01-beranda.html:185` (S3, ditunda) | 70%, "Sehat" | 17%, "Perlu perhatian" | Hanya dicatat; prototipe juga memakai kosakata "Sehat/Berisiko" yang berbeda dari desain ("Lancar/Perlu perhatian/Terlambat"). Tidak memblokir S0-S2 |
| C8 | `diskusi/02-proyek.md:164-166` (Sinar 35%, Migrasi 80%, Internal Tools 50%) | angka tanpa tabel tugas | **ASUMSI:** seed hanya membuat tugas untuk Atlas; proyek lain tampil sesuai hasil rumus dari tugas seed-nya. Jika demo ingin angka 35/80/50, seed menambah tugas ringkas (mis. 7/20, 4/5, 1/2) | Tidak memengaruhi test; hanya tampilan demo |

**Angka emas final Atlas untuk test dan seed** (hari ini = Rabu 7 Okt 2026): progres proyek **17%** · waktu berjalan **60%** (36/60 hari) · tugas aktif **5** · terlambat **1** (#12; #14 tenggat hari ini bukan terlambat) · kondisi **Perlu perhatian** (tugas prioritas Tinggi terlambat; rasio 1/5 = 20% tidak melewati ambang `>` 20%) · progres tahapan: Perencanaan 100%, Pengembangan 0%, Pengujian 0%, Rilis "Belum ada tugas" · Menunggu diperiksa saya (Nico) = #17.

**Dampak kode:** fixture tunggal `server/seed/atlas.data.ts` (usulan R09 §1.4) memakai angka di atas; test golden S1/S2 meng-assert 17%, bukan 70%. Tidak ada perubahan skema.

### 2D. Asumsi A1–A5 (proyek) dan A1–A10 (tugas): default dan konstanta
Sumber definisi: `project.md:410-414` (A1-A5), `task.md:511-525` (A1-A10; A6 tidak ada). Nama konstanta: R03 §3.5 (rujukan `server/access/rules.ts` = flag izin, `server/metrics/config.ts` = angka). Aturan R03: **flag izin = kode (ubah = rilis)**, angka boleh dioverride env (`PROJECT_AT_RISK_OVERDUE_RATIO`, `TASK_STALE_DAYS`, `TRASH_RETENTION_DAYS`, `APP_TIME_ZONE`). Penomoran memakai prefiks `P-`/`T-` (K23). Konstanta bertanda ★ adalah usulan BARU dari tinjauan ini (belum ada di R03).

| Asumsi | Isi singkat | Keputusan default | Konstanta | Nilai | Irisan |
|---|---|---|---|---|---|
| P-A1 | PM bukan anggota: buka proyek, hanya baca | **Dipakai.** Tanpa komentar (K10) | `ACCESS_RULES.P_A1_PM_NON_MEMBER_READS` · ★`ACCESS_RULES.P_A1B_PM_NON_MEMBER_COMMENTS` | `true` · `false` (`P_A1_…=false` → tidak melihat sama sekali, 404) | S0.b, S1 |
| P-A2 | Proyek di Sampah bisa dipulihkan 30 hari | **Dipakai** | `METRICS.TRASH_RETENTION_DAYS` (env `TRASH_RETENTION_DAYS`) | `30` | S0.b (konstanta), S1 (hapus), S6 (purge) |
| P-A3 | Tenggat baru harus lebih lambat; kategori + alasan wajib | **Dipakai** | `ACCESS_RULES.P_A3_EXTENSION_REQUIRES_LATER_DATE`, `ACCESS_RULES.P_A3_EXTENSION_REQUIRES_REASON` | `true`, `true` | S0.b (CHECK DB `new_due_date > old_due_date`), UI di S5 |
| P-A4 | Tanggal template disimpan relatif (hari ke-N) | **Ditunda (fase 5).** Tabel template tidak dibuat di S0.b | – (tidak ada kode) | – | nanti |
| P-A5 | AI memilih jenis tugas hanya dari 3 jenis bawaan | **Ditunda (fase 5)** | – (tidak ada kode) | – | nanti |
| T-A1 | Pembuat (Anggota) diberi notifikasi saat tugasnya diminta periksa/selesai | **Dipakai sebagai perilaku Inbox, bukan izin** | – (milik `notify()` S3) | – | S3 |
| T-A2 | Anggota hanya ubah tugas yang ia buat/kerjakan | **Dipakai** | `ACCESS_RULES.T_A2_MEMBER_EDIT_SCOPE` | `'own'` (`'all'` = semua tugas proyek) | S0.b, S2 |
| T-A3 | Anggota boleh membuat tag baru | **Dipakai** | `ACCESS_RULES.T_A3_MEMBER_CREATES_TAGS` | `true` | S0.b (kontrak), UI S4 |
| T-A4 | Tugas tanpa periksa boleh langsung Selesai dari Belum dikerjakan | **Dipakai** | `ACCESS_RULES.T_A4_COMPLETE_FROM_TODO` | `true` | S0.b, S2 |
| T-A5 | Anggota boleh menyalakan "Perlu diperiksa" (tak bisa mematikan) | **Dipakai** | `ACCESS_RULES.T_A5_MEMBER_ENABLES_REVIEW` | `true` | S0.b, UI S4 |
| (A6) | Tidak ada. Setara keputusan #7 (pemeriksa jatuh ke Pengelola lalu Admin) | **Bukan flag**; hard-coded di aturan pemeriksa + `NO_ELIGIBLE_REVIEWER` (K3) | – | – | S0.b |
| T-A7 | Dependency hanya sesama proyek | **Dipakai** | `ACCESS_RULES.T_A7_DEPENDENCY_SAME_PROJECT` | `true` | S0.b (kontrak), UI S4 |
| T-A8 | Mandek = 3 hari tanpa aktivitas | **Dipakai**, hari kalender, `>` 72 jam | `METRICS.TASK_STALE_DAYS` (env `TASK_STALE_DAYS`) | `3` | S2 |
| T-A9 | Bukti tak wajib; hanya peringatan | **Dipakai** | `ACCESS_RULES.T_A9_EVIDENCE_REQUIRED` | `false` | S4/S5 |
| T-A10 | Setelan proyek "Tugas baru perlu diperiksa" bawaan mati | **Dipakai** | `PROJECT_REVIEW_DEFAULT` (nilai awal kolom `tasks_need_review_default`, bukan flag) | `false` | S0.b (DEFAULT kolom), S1 |

**Konstanta pendukung (bukan A, tetapi menentukan perilaku S0-S2):**

| Konstanta | Isi | Default | Letak | Catatan |
|---|---|---|---|---|
| `METRICS.TIME_ZONE` (env `APP_TIME_ZONE`) | Zona waktu "hari ini" | `'Asia/Jakarta'` | `metrics/config.ts` | Menunggu Q1; `today` dihitung sekali per request |
| `METRICS.AT_RISK_OVERDUE_RATIO` (env `PROJECT_AT_RISK_OVERDUE_RATIO`) | Rasio tugas terlambat untuk "Perlu perhatian" (`>`) | `0.2` | `metrics/config.ts` | Contoh nama dari `D/02-proyek` |
| `METRICS.AT_RISK_PRIORITIES` | Prioritas yang memicu "Perlu perhatian" bila terlambat | `['high','critical']` | `metrics/config.ts` | Atlas butuh ini (rasio 1/5 = 20% tidak lebih dari ambang) |
| `METRICS.TASK_KINDS_MAX_ACTIVE` | Maks jenis tugas aktif | `6` | `metrics/config.ts` | UI kelola jenis = Could |
| `METRICS.UNDO_WINDOW_SECONDS` | Lama tombol Urungkan setelah hapus | `10` | `metrics/config.ts` | S1 (hapus proyek) |
| ★`PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE` | Batas 99% kecuali semua selesai | `99` | `metrics/config.ts` | K20; tampil `Math.round` |
| ★`ACCOUNT.ALLOWED_EMAIL_DOMAINS` (env) | Batas domain login Google | kosong = semua domain | `server/auth*.ts`/env | Menunggu Q2; kosong tidak menutup apa pun |
| ★`PROFILE.TEXT_SIZE_DEFAULT` | Ukuran teks akun baru | `'normal'` | kolom `profile.text_size` DEFAULT | Menunggu Q13; skala nilai diuji pengguna (R08 Q8, X1 D2) |
| ★`ACCESS_RULES.PROJECT_CLOSED_ALLOWS_TASK_WRITES` | Tugas boleh dibuat/diubah di proyek Selesai/Dibatalkan/Ditunda | `true` | `rules.ts` | Menunggu Q12 |
| ★`ACCESS_RULES.MEMBER_CAN_LEAVE_PROJECT` | Anggota keluar sendiri | `false` | `rules.ts` | Default D "Keluar sendiri" |

### 2E. Tabel izin final S0–S2
Dasar: R03 §2.2 (matriks) disaring ke aksi yang dipakai S0-S2, ditambah `00-role-dan-area §3-§4`. Kolom proyek/tugas = R03: **SA** super-admin · **AD** admin · **PM-K** PM+Pengelola proyek · **PM-X** PM bukan anggota · **M-K** Member+Pengelola · **AG** Anggota · **PT** Pemantau · **BA** Member bukan anggota. ✅ boleh · ❌ tidak · 👁 baca saja · 🔸 bersyarat. Tanpa hak lihat → **404**, bukan 403. Kolom "Selisih" = beda terhadap R03 (atau terhadap fondasi kode bila disebut). Semua baris diuji `test.each` di S0.b (matriks eksaustif).

**E1. Akun dan area (S0.a)** — kolom: SA · AD · PM (akun) · MB (member akun)

| Aksi | SA | AD | PM | MB | Selisih terhadap R03 / fondasi |
|---|---|---|---|---|---|
| Masuk `/app` (status `approved`, tidak `banned`) | ✅ | ✅ | ✅ | ✅ | `pending`/`rejected`/`banned` dialihkan ke halaman tahan (D9: satu rute dua keadaan). Baru; R03 tidak memuat |
| Masuk `/dashboard` | ✅ | ✅ | ❌ | ❌ | Baru (00 §2); ❌ = dialihkan ke home role |
| Masuk `/dev` | ✅ | ❌ | ❌ | ❌ | Sama dengan `dev.*` R03 |
| `user.list/view` (Pengguna) | ✅ | ✅ | ❌ | ❌ | Admin melihat email + HP (Q8) |
| `user.approve/reject/suspend/invite`, `setRole` Member↔PM | ✅ | ✅ | ❌ | ❌ | **Fondasi berubah:** `canSetRole` sekarang hanya super-admin (`server/permissions.ts:74`; `server/api/admin.ts:47-48` menolak selain super-admin); jadi Admin boleh untuk target/role Member dan PM |
| idem, target atau role **Admin** (termasuk undangan role Admin) | ✅ | ❌ | ❌ | ❌ | Sama dengan R03 + K15 |
| idem, target atau role **super-admin** | ❌ | ❌ | ❌ | ❌ | **Fondasi berubah:** `canActOnTarget(SA, apa pun) = true` (`permissions.ts:79-84`) diganti `TARGET_PROTECTED` (K14) |
| Aksi akun atas **diri sendiri** (ubah role, suspend, hapus) | ❌ | ❌ | ❌ | ❌ | `SELF_TARGET` untuk semua (K14); fondasi baru melarang ubah role sendiri (`server/api/admin.ts:49`) |
| `user.delete` | ✅ | ❌ | ❌ | ❌ | Tidak berubah (`server/api/admin.ts:128-131`, `DELETE /users/:id`); pra-cek Pengelola tunggal = S6 |
| `user.impersonate` | ✅ | ❌ | ❌ | ❌ | Tidak berubah; **baru (Q9 a):** selama menyamar, `user.delete`, `setRole`, `approve/reject/suspend`, `project.trash` ditolak `IMPERSONATING` |
| Daftar sendiri lewat email (`/api/auth/sign-up/email`) | ❌ | ❌ | ❌ | ❌ | Baru (R12 F1): ditolak di server pada produksi; dev lokal memakai `app_setting.email_auth_enabled` |
| `/api/auth/admin/*` langsung | ❌ | ❌ | ❌ | ❌ | Baru (R12 R3): seluruh prefix ditutup kecuali `impersonate-user` dan `stop-impersonating` (hanya SA); semua aksi lewat wrapper `admin.ts` |
| `settings.own` (profil, ukuran teks) | ✅ | ✅ | ✅ | ✅ | Sama; kolom HP/jabatan/divisi opsional (D9) |
| Lihat email sesama / HP orang lain | 🔸 | 🔸 | 🔸 | 🔸 | **Baru (Q8 a):** email = sesama anggota proyek (SA/AD: semua); HP = pemilik + Admin/SA. Pemilih anggota proyek hanya nama + jabatan |

**E2. Proyek (S1)** — kolom proyek R03

| Aksi | SA | AD | PM-K | PM-X | M-K | AG | PT | BA | Selisih terhadap R03 |
|---|---|---|---|---|---|---|---|---|---|
| `project.view` (daftar + detail, kondisi, progres) | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ | ✅ | ❌ | Sama (P-A1). Daftar "Semua proyek" hanya SA/AD/PM; Member hanya yang ia ikuti |
| `project.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Sama (`a`): berdasar role akun, bukan peran proyek; Member tak pernah bisa membuat proyek (Q5) |
| `project.update`, `project.setStatus` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Sama; fase/milestone/perpanjang/override = S5, dikeluarkan |
| `project.trash` (hapus → Sampah + Urungkan) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **Diubah 15 Okt (KEPUTUSAN §6):** Member-Pengelola (M-K) TIDAK boleh menghapus proyek, hanya SA, AD, PM-K; konstanta `MEMBER_MANAGER_CAN_TRASH_PROJECT=false`. `trash.undo` 🔸u (pelaku, dalam `UNDO_WINDOW_SECONDS`). Pemulihan oleh semua Pengelola proyek itu + Admin (S1-18); purge = S6 |
| `project.member.add/changeRole/remove`, `project.setLead` | ✅ | ✅ | 🔸b | ❌ | 🔸b | ❌ | ❌ | ❌ | Sama. `b` = `LAST_MANAGER`, `IS_LEAD` (D4), Lead baru wajib Pengelola; kandidat = akun `approved` tak `banned` |
| Anggota keluar sendiri dari proyek | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **Baru (D3):** R03 K8 hanya menyebut "tidak ada"; ditulis eksplisit. Pengelola/Admin mengeluarkan lewat `member.remove` |

**E3. Tugas (S2)** — kolom proyek R03; "server S2" = mesin status/endpoint dibangun di S2, tombol UI menyusul di S4 (N3)

| Aksi | SA | AD | PM-K | PM-X | M-K | AG | PT | BA | Selisih terhadap R03 |
|---|---|---|---|---|---|---|---|---|---|
| `task.view` (Tugas saya, Semua tugas, detail) | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ | ✅ | ❌ | Sama; Tugas saya = tugas yang ditugaskan ke saya di proyek yang bisa saya lihat |
| `task.create` (form; "Tulis saja"/CSV ⏸) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | Sama. Berlaku juga di proyek Selesai/Ditunda (Q12 a); di Sampah ❌ |
| `task.update` (isi, checklist, pengerja) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸c | ❌ | ❌ | Sama (`c` = pembuat atau pengerja; `T_A2='own'`) |
| `task.start/unstart/complete` | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸d | ❌ | ❌ | Sama. `d`: pengerja; tugas tanpa pengerja boleh "diambil" (K9); `complete` hanya bila `needsReview=false`; dari `todo` langsung `done` (`T_A4`) |
| `task.requestReview` (server S2, UI S4) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸d | ❌ | ❌ | Sama; ditolak `NO_ELIGIBLE_REVIEWER` bila tak ada kandidat (K3) |
| `task.approve`, `task.return` (server S2, UI S4) | 🔸e | 🔸e | 🔸e | ❌ | 🔸e | ❌ | ❌ | ❌ | Sama. `e` = status `in_review` ∧ aktor bukan pengerja (`SELF_REVIEW`, Q6 a); Kembalikan wajib catatan |
| `task.reopen` (server S2, UI S4) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸f | ❌ | ❌ | Sama; `f` = pembuat atau pengerja, alasan wajib |
| `task.cancel/uncancel` (server S2, UI S4) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸g | ❌ | ❌ | Sama; `g` = pembuat; Pulihkan-Dibatalkan = Batalkan (K8) |
| `task.needsReview.on/off` (server S2, UI S4) | 🔸i | 🔸i | 🔸i | ❌ | 🔸i | on: 🔸c,i · off: ❌ | ❌ | ❌ | Sama (`T_A5`); terkunci bila `in_review/done/canceled` |
| `comment.add` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | Sama (K10 default: PM-X ❌; `P_A1B…=false`) |
| `comment.delete` (ubah: penulis saja) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸k | 🔸k | ❌ | Sama (`k` = penulis sendiri; D6 moderasi Pengelola/Admin) |

**Dikeluarkan dari tabel final S0-S2 (bukan S0-S2):** `task.trash/untrash`, `task.reviewer.change`, `tag.*`, `taskKind.manage`, `attachment.*`, `task.import/export`, seluruh `event.*`, `team.*`, `trash.list/restore/purge`, `settings.team.*`, `inbox.own`, `leave.*`, dan `project.phase/milestone/extendDeadline/condition.override/saveTemplate`. Barisnya tetap hidup di R03 §2.2 untuk irisan S4-S7; **kontrak S0.b hanya perlu menyiapkan tipe `Action` yang bisa diperluas** (R03 §3.3), bukan mengisi baris-baris itu.

**Syarat tambahan (pengulangan ringkas dari R03):** proyek/tugas di Sampah → semua aksi ❌ kecuali pemulihan (S6); `PROJECT_IN_TRASH` berlaku untuk semua peran; Admin selalu penuh walau tercatat Pemantau (K6, D2); Member yang menjadi Pengelola memakai kolom M-K (D1).

## 3. Risiko dan mitigasi
| # | Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|---|
| R1 | Kuesioner tidak dijawab sebelum S0 dimulai; S0.b membekukan kontrak berdasarkan tebakan | Sedang | Tinggi | Mulai S0.0 (ops) dan S0.a bagian yang tak bergantung jawaban lebih dulu; tahan **hanya** pembekuan S0.b sampai Q1, Q5-Q8 terjawab; default 2A dipakai bila 3 hari tak ada jawaban |
| R2 | Q5 dijawab "tugas pribadi boleh" setelah skema beku | Rendah | Tinggi (±5-8 hari, migrasi data) | Tanyakan Q5 lebih dulu; bila diragukan, buat `project_id` NOT NULL dan sediakan proyek "Pribadi" otomatis per Member di S2 (ASUMSI, belum dirancang) |
| R3 | Dokumen desain tidak disunting (2B) sehingga agen S1/S2 membaca versi lama dan menerapkan `uuid`, `A1` ganda, atau kolom Admin lama | Tinggi | Sedang | Pemilik desain menambahkan spanduk "Konvensi implementasi" di atas `project.md`/`task.md`/`user-profile.md` (N1/N2) dan menandai keputusan #17 sebagai belum final; agen diberi 2B sebagai lampiran brief |
| R4 | Test golden Atlas ditulis dengan 70% dari wireframe | Sedang | Sedang | Fixture `server/seed/atlas.data.ts` mengikuti 2C (17%); pemilik desain memperbaiki `02-proyek.md:163,170,258`; wireframe Penpot disesuaikan manual |
| R5 | Flag izin ★ yang baru (mis. `P_A1B_PM_NON_MEMBER_COMMENTS`) tidak diselaraskan dengan R03 dan test eksaustif | Sedang | Rendah | Daftarkan semua konstanta ★ di `server/access/rules.ts` dan buat satu test "setiap konstanta punya nilai bawaan dan dipakai" di S0.b |
| R6 | Sembunyi-menyembunyikan tombol berdasarkan role (bukan kapabilitas) membuat Member+Pengelola kehilangan fitur (K1) | Sedang | Sedang | Test `no-role-branching` (R03) dan `primaryAction` dihitung server; D1 menyatakan Member+Pengelola memakai kolom M-K |
| R7 | Admin tunggal sekaligus pengerja menyetujui sendiri atau tugas menggantung (K2/K3) | Rendah | Sedang | `SELF_REVIEW` + `NO_ELIGIBLE_REVIEWER` + `doctor` memperingatkan `SUPER_ADMIN_EMAILS` kosong; pesan polos di UI |
| R8 | Akun anonim lama atau user lama terkunci/lolos tak semestinya saat migrasi 0014 (Q4) | Sedang | Tinggi | Backfill: user non-anonim → `approved`, anonim → `rejected`; test E3 (R09) pada DB dev **dan** test; migrasi dijalankan dua kali (idempoten) |
| R9 | Q3 dijawab "Google saja" dan calon pengguna lansia tak punya akun Google | Sedang | Sedang (adopsi) | Catat sebagai temuan uji (R10 Q7); Admin/keluarga membantu; evaluasi email + kata sandi hanya bila uji putaran 1 menunjukkan penolakan |
| R10 | Tanpa penguji ≥ 50 tahun dan tanpa peninjau kedua, kualitas kontrak dan klaim UX tak teruji | Sedang | Tinggi | Q10 dan Q14 dijawab sebelum S0.b selesai; jadwalkan putaran uji sebelum S3 |

## 4. Pertanyaan untuk user
Seluruh pertanyaan ada di **2A** (Q1-Q22 dan D1-D12) supaya satu tempat. Yang paling mendesak, urut dampak jadwal:
1. **Q5** tugas tanpa proyek (menentukan skema S0.b) — saran: tidak.
2. **Q1** zona waktu — saran: WIB (`Asia/Jakarta`).
3. **Q6, Q7, Q8** (izin: periksa sendiri, PM bukan anggota, email/HP) — saran: (a) semua.
4. **Q2, Q3, Q4, Q9** (akun: batas email, tanpa Google, akun lama, impersonasi) — saran: (a) semua.
5. **Q10** kapasitas peninjau manusia — jawaban angka dari Anda; saran: peninjau kedua untuk S0.b.
6. **Q11** halaman penuh vs panel samping (memblokir S2) — saran: halaman penuh.
Bila tidak ada jawaban, default (a) dipakai dan dicatat sebagai "belum dikonfirmasi" di CHANGELOG/keputusan.

## 5. Sumber
**Laporan riset** (`05-implementasi/riset/`): R03 §2.2 (matriks), §2.3 (K1-K23), §3.5 (konstanta), §6 (11 pertanyaan); R07 §6 (8); R08 §6 (9); R09 §1.4, §3 (data Atlas), §6 (9); R10 §2.2, §3.1 (baris A/P/T), §3.3 (S0-S2), §6 (10); R12 §3.1 R3, §6 (9); R14 §6 (butir 5); `_BRIEF.md` (+ adendum), `tinjauan/_BRIEF-GELOMBANG2.md`.
**Desain** (`03-desain/erd/`): `diskusi/00-role-dan-area.md` §1-§4, §7, §8; `diskusi/02-proyek.md:136,155-170,250-258,306`; `diskusi/03-tugas.md:41,198-224`; `project.md:8,220-222,373-374,410-414`; `task.md:19-54,58,277-308,471,511-529`; `user-profile.md:95,105-111`. Prototipe: `04-prototype/prototype/01-beranda.html:180-187`.
**Kode (dibaca):** `server/permissions.ts:60-88` (`canSetRole:74`, `canActOnTarget:79`, `canImpersonate:87`); `server/api/admin.ts:44-54,120-140` (ubah role dan hapus user hanya super-admin).
**Verifikasi sendiri:** hitung Atlas 1/6 = 16,7% dari tabel `03-tugas.md:205-215` (#9 milik PT Sinar); 7 Okt 2026 = Rabu (dicek dari R09 dan perhitungan hari-dalam-minggu); waktu berjalan 36/60 = 60% (`02-proyek.md:258`).
**ASUMSI/tidak diverifikasi:** wireframe Penpot tidak dapat diakses; angka lampiran 10 MB/10 berkas (Q20) adalah usulan saya; perilaku pembersih akun anonim `server/demo/cleanup.ts` tidak saya baca ulang (disebut R07/R08); nilai kosmetik 35/80/50% proyek lain tak punya tabel tugas (2C C8); kolom Selisih 2E bergantung pada R03 yang tidak saya audit ulang baris demi baris.
