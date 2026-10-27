# 0005 — Persetujuan cuti keluar dari aplikasi; cuti dicatat Admin

Dicatat 26 Oktober 2026 (P14 CU-08, gerbang akhir lajur Cuti). Sumber keputusan: diskusi user 23 Oktober 2026, ditulis sebagai `tahapan-proyek/05-implementasi/rencana/P14-cuti-status-admin.md` §3 D1–D6 dan §10 T1–T3; keputusan tambahan user 26 Oktober 2026 tentang kartu Inbox lama (§5 di bawah). Kode yang menjalankannya: `server/leave/*`, `server/api/admin-leave*.ts`, `app/components/users/*`, `app/components/leave/*`, migrasi `0023_leave_period.sql`. Dokumen ini menjelaskan **kenapa**; apa yang dilakukan kode ada di kodenya.

## Konteks

Fitur Cuti dibangun lebih dulu sebagai alur di dalam aplikasi: anggota mengajukan rentang tanggal, seorang penyetuju (Pengelola proyek atau Admin) menerima kartu Inbox dengan dua tombol **Setujui**/**Tolak**, dan hasilnya dikabarkan ke pemohon. Tabelnya `leave_request` dengan empat status (`pending`, `approved`, `rejected`, `canceled`), ditambah saklar workspace "Cuti perlu persetujuan".

Pertanyaan yang memicu peninjauan justru kecil: "tab Kebijakan kerja ini dihapus saja?" Tab itu hanya punya satu isi dengan backend nyata, yaitu saklar persetujuan cuti. Menariknya benang itu membuka pertanyaan yang lebih besar: **apakah persetujuan cuti memang terjadi di aplikasi ini?** Jawaban user: tidak. Di tim yang memakainya, cuti diminta ke HRD atau ke atasan lewat WhatsApp, dan keputusannya diambil di luar aplikasi — sebelum ada yang membuka layar mana pun.

Alur persetujuan di dalam aplikasi karena itu bukan fitur yang kurang matang. Ia memodelkan proses yang tidak ada: sebuah antrean yang tidak pernah jadi sumber kebenaran, karena keputusannya sudah diambil di tempat lain.

## 1. Aplikasi mencatat, tidak memutuskan

Cuti berpindah bentuk dari **pengajuan + persetujuan** menjadi **pencatatan status oleh Admin** (D1, D3). Yang dijawab oleh fitur ini tinggal satu pertanyaan, dan itu pertanyaan yang nyata: *siapa yang sedang tidak ada?* Rekan satu tim butuh itu untuk tidak menugasi orang yang sedang cuti; tidak ada yang butuh aplikasi untuk memberi izin.

Konsekuensi yang langsung: tidak ada status `pending`. Satu baris yang ada **adalah** cuti yang berlaku. Tidak ada keadaan menunggu, tidak ada penolakan, tidak ada pembatalan oleh pemohon — tidak ada satu pun dari itu yang punya arti dalam catatan.

**Kenapa ini bukan hapus-lalu-bangun-ulang.** Tabel lama sudah dirancang "rentang tanggal → status dihitung per tanggal, cuti berakhir sendiri; tidak ada yang disimpan per hari". Desain itu benar dan dipertahankan apa adanya: `leaveStatusFor` tidak disentuh, dan badge **Cuti sampai 16 Okt** di menu Tim tetap hidup. Yang dicabut adalah alurnya, bukan pencatatannya. Migrasi `0023` karena itu menyalin setiap baris `approved` ke `leave_period` **sebelum** menghapus tabel lama; baris `pending`, `rejected`, dan `canceled` sengaja tidak ikut, karena keadaan itu tidak bisa diwakili dan tidak layak dipalsukan menjadi cuti yang berlaku.

## 2. Hanya Admin dan Super-admin yang menyetel

Pencatatan dipasang di `/dashboard/users`, bukan di `/app/team` (D3). Pertimbangannya: menyetel ketersediaan orang lain adalah aksi berhak istimewa, sekelas dengan mengubah perannya. Kalau Pengelola proyek boleh melakukannya, "sedang cuti" berubah dari catatan HRD menjadi alat penjadwalan yang bisa ditulis siapa pun yang punya kepentingan atas kalender orang itu.

Harganya diterima user secara sadar: di tim besar, Admin menjadi satu-satunya penyetel dan statusnya bisa telat terus (P14 §8 R5). Bila itu terbukti berat setelah dipakai, yang menyusul adalah **PM-Pengelola boleh mencatat** sebagai rencana terpisah — bukan persetujuan yang kembali.

Ketiga rute `/api/admin/users/:id/leave` karena itu masuk `PM_KEY_DENY`: **ditolak untuk kunci API apa pun scope-nya**, hanya sesi masuk. Sebuah skrip yang bisa menandai seseorang cuti adalah skrip yang bisa menyembunyikan orang dari penugasan.

## 3. Satu jenis ketidakhadiran, dan catatannya milik Admin

Tidak ada enum jenis cuti (D4). "Sakit", "umroh", "urusan keluarga" masuk satu kolom catatan teks bebas, dan **catatan itu tidak pernah keluar ke DTO Tim** (D6). Alasannya privasi, bukan kerapian: kartu Tim hanya perlu mengatakan `Cuti sampai 31 Okt` supaya rekan tidak menugasi orang itu. Siapa pun yang butuh alasannya sudah tahu dari HRD.

Konsekuensi yang harus disadari: catatan itu jadi data yang hampir tidak pernah dibaca, dan data tulis-saja biasanya jadi data yang salah. Karena itu catatan ikut di jawaban `GET /api/admin/users/:id/leave` dan tampil di drawer `/dashboard/users` — satu-satunya tempat ia terbaca — tetapi **tidak** ikut ke ringkasan audit, yang dibaca Super-admin. Jejak audit mencatat rentang, jumlah hari, dan siapa yang melakukannya; alasan seseorang tidak masuk kerja bukan urusannya.

## 4. Mencatat yang sudah lewat diizinkan; yang menjaganya audit

Rentang yang tanggalnya sudah lewat diterima **tanpa batas mundur** (§10 T3). Ini konsekuensi logis dari §1: alur ini pencatatan, dan kasus yang paling sering justru cuti yang sudah berjalan atau sudah selesai dan baru sempat ditulis. Penjaganya `leave.set` di audit — siapa dan kapan — bukan larangan kalender. Batas 90 hari per periode tetap berlaku, karena satu periode yang lebih panjang dari itu hampir pasti salah ketik.

Dua aturan menyusul dari sana:

- **Periode tumpang tindih ditolak `409 LEAVE_OVERLAP`, tidak digabung** (§10 T2), dan pesannya **menyebut** periode yang bentrok supaya Admin bisa langsung memperbaikinya. Menggabung dua keputusan HRD yang berbeda akan melebur keduanya dan menyisakan pertanyaan catatan mana yang dipakai. Menyetel ulang saat orangnya **sedang** cuti adalah pengecualiannya: itu **mengganti** periode berjalan, karena Admin yang membetulkan tanggal hari ini adalah kasus biasa, dan dua baris untuk satu cuti hanya akan terbaca sebagai dua cuti.
- **Riwayat punya layarnya sendiri** (§10 T1). Periode yang seluruhnya lampau — atau yang belum mulai — tidak pernah tampil di badge Tim, karena status dihitung terhadap hari ini. Tanpa layar riwayat, §4 akan mengizinkan Admin menulis data yang tidak pernah terbaca siapa pun. Riwayat itu berpaginasi, bukan dimuat seluruhnya.

## 5. Orangnya dikabari; kartu lamanya ditutup

Orang yang statusnya disetel **dikabari** lewat kartu Inbox `leave_recorded` (D5, usul agent yang disetujui user). Tanpa itu, status seseorang berubah diam-diam dan rekan melihatnya "Cuti" tanpa dia tahu. Kartu itu **kabar**, bukan kerja: ia ada di tab Kabar terbaru dengan satu tombol **Lihat ketersediaan**, dan tidak masuk hitungan "Perlu Anda tanggapi" — tidak ada yang perlu dia jawab.

Dua kind lama (`leave_requested`, `leave_decided`) ikut dihapus, dan dengan itu **mekanisme tombol kedua** dicabut seluruhnya: kartu pengajuan cuti adalah satu-satunya kind yang pernah punya dua tombol, jadi bidang `secondaryButton` hilang dari respons `GET /api/app/inbox`. Mempertahankan mekanisme tanpa satu pun pemakainya berarti mempertahankan jalur yang tidak pernah dijalankan tes nyata.

**Keputusan user 26 Oktober 2026** menyelesaikan satu akibat yang tersisa. Baris notifikasi lama yang masih ada di basis data sudah terbaca aman — Inbox gagal-lunak untuk kind yang tidak dikenalnya, dan itu dibuktikan tes, bukan dipercaya dari docstring — tetapi baris `leave_requested` yang belum ditanggapi **tetap** dihitung di "Perlu Anda tanggapi", padahal tombol untuk menanggapinya sudah tidak ada. Angka yang tidak bisa dinolkan akan menggantung sampai retensi ~30 hari menghapusnya. Migrasi `0023` karena itu menutup baris-baris itu sekalian, dan **memindahkannya ke lane Kabar terbaru di langkah yang sama**: menutup saja akan menyembunyikannya dari kedua tab (antrean kerja melewati baris yang sudah ditutup, tab kabar hanya membaca lane `info`), dan yang diputuskan adalah berhenti meminta jawaban — bukan membuat barisnya hilang.

## Yang ikut tersentuh

- **Tab "Kebijakan kerja" dihapus** dari Pengaturan admin, 6 tab → 5 (D1, CU-07). Saklar persetujuan cuti adalah satu-satunya isinya yang punya backend; sisanya pratinjau. **Hari kerja dan daftar hari libur ditunda, bukan dihapus diam-diam:** keduanya tercatat di `tahapan-proyek/05-implementasi/HUTANG.md` **H-E15** dengan konsumennya disebut — kalkulator tenggat — dan dibangun bersama konsumen itu dalam satu lajur. Pemindaian 23 Okt 2026 menemukan **nol** tempat di kode yang menghitung hari kerja, jadi menyimpan setelan yang belum punya pembaca hanya menumbuhkan skema mati.
- **`availability` pada `GET /api/app/team` menyempit** menjadi `{ kind: 'on_leave', until } | null`. Cabang `pending` hilang bersama keadaannya. Ini **penyempitan bentuk respons**, dan satu-satunya pembaca di repo ini (`AvailabilityBadge`) berubah di commit yang sama.
- **Empat aksi audit diganti dua.** `LEAVE_APPROVE`, `LEAVE_REJECT`, `LEAVE_CANCEL`, dan `SETTINGS_LEAVE_UPDATE` digantikan `LEAVE_SET` (`leave.set`) dan `LEAVE_CLEAR` (`leave.clear`). Baris audit lama tetap terbaca; katalog `ACTION_META` menamai keduanya.
- **Katalog fitur tetap memuat `leave`.** Mematikannya menyembunyikan lencana Ketersediaan di Tim, bagian Cuti di Pengaturan, dan kontrol Setel cuti di menu Pengguna — bukan lagi "anggota tidak bisa mengajukan cuti", karena mengajukan cuti memang tidak lagi terjadi di sini.

## Konsekuensi

- Siapa pun yang membaca `README.md` atau `CHANGELOG.md` melihat satu cerita, bukan sebuah fitur yang diumumkan lalu dicabut di dokumen yang sama. Alur persetujuan lahir dan mati di dalam satu jendela belum-dirilis, jadi ia tidak diceritakan dua kali.
- Rollback `0023` **tidak bisa setia**: ia satu-satunya migrasi yang membuang data dengan sengaja. Baris `pending`/`rejected`/`canceled` sudah hilang sebelum rollback dijalankan, dan penyapu kartu Inbox di §5 satu arah. Jalan kembali yang sungguhan adalah memulihkan backup; peringatannya ada di kepala `server/db/rollback/0023_leave_period.down.sql`.
- Bila suatu hari persetujuan cuti memang dibutuhkan, ia dibangun sebagai alur baru di atas `leave_period` — bukan dengan menghidupkan kembali `leave_request`. Yang dicabut di sini adalah model prosesnya, dan model itu memang tidak cocok dengan cara tim ini bekerja.
