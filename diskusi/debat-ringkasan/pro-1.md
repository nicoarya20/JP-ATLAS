# PRO — Ronde 1

## Tanggapan atas poin lawan

*(Kosong. Ini giliran pembuka.)*

## Argumen utama

**1. Duplikasi 14 card sudah terbukti di dokumen kita sendiri, jadi ini bukan soal selera.**
Ke-14 card hanya berasal dari 4 sumber data, dan 10 di antaranya dari Task (`diskusi/fitur-ringkasan.md` §1, tabel "Sumber data"). Task "Fix login SSO" muncul di 5 card dan masih terhitung lagi di 2 card lain (`tahapan-proyek/02-analisis/hasil-orchestrasi/analysis/A1-dashboard-tim-events.md` §2.1, "Contoh beban kognitif"). A1 menilai *Jadwal task* "menelan R8 & R10", dan *Snapshot* "menduplikasi R2, R3, R6" (§2.1, tabel). Tidak ada sinyal yang hilang: dua sinyal unik, *Ghost reminder* dan *mention*, tetap ada sebagai label *Mandek* dan *Menunggu saya* (`fitur-ringkasan.md` §1).

**2. Bagi awam/lansia, card dobel bikin bingung.**
Skenario (ilustrasi, angkanya bukan data): Bu Sri, 62 tahun, bendahara koperasi, membuka dashboard pagi hari. Ia melihat "Ditugaskan saya: 6", "Perlu perhatian kamu: 2", "Jatuh tempo 7 hari: 3", dan "Ghost reminder: 1". Ia cuma ingin tahu "saya kerjakan yang mana dulu?", dan tidak ada card yang menjawabnya. Ia juga tidak tahu bahwa keempat angka itu bisa menghitung tugas yang sama. Riset kita menemukan font kecil dan istilah asing di 10/10 kompetitor (`tahapan-proyek/01-riset/rangkuman-kompetitor/rangkuman-gabungan-usp.md` §4) dan mencatat celah G4 "fitur yang tidak membanjiri" (§7). Usulan U13 "Satu hal dalam satu waktu" (§13.2) jelas lebih dekat ke Zona B (satu daftar terurut) daripada ke 14 card.

**3. Zona B memberi langkah lanjut yang membedakan kita dari kompetitor, dan tidak bergantung pada AI.**
Di kompetitor, fitur saran "kerjakan apa hari ini" bermodel *tarik*: pengguna membuka panel, lalu membaca sendiri (`tahapan-proyek/01-riset/rangkuman-kompetitor/gabungan-core-menu-dan-usp-langkah-lanjut.md` §4, baris terakhir). Zona B menyajikan satu daftar dengan label alasan dalam bahasa sehari-hari ("Sudah lewat waktu", bukan "Overdue") dan aksi cepat [Update status] [Minta bantuan] (`fitur-ringkasan.md` §2–§3). Ini satu arah dengan USP-3 "Tangga Tindak Lanjut", yaitu tombol yang langsung mengubah data (§5). Urutannya dihitung dengan rumus tetap, sedangkan AI hanya menulis kalimat alasannya. Jadi Zona B "tetap jalan meskipun AI dimatikan" (`fitur-ringkasan.md` §2).

**4. Angka yang tidak cocok satu sama lain membuat pengguna awam berhenti percaya.**
A1 §2.1 mencatat bahwa *Task terbuka* tidak menghitung task "menunggu QC", padahal *Status task saya* menghitungnya. Jendela waktu 14, 7, dan 3 hari juga dipakai tanpa alasan. Pengguna teknis mungkin bisa menebak penyebabnya. Bu Sri hanya melihat dua angka berbeda untuk hal yang kelihatannya sama, lalu berhenti percaya pada layar. Di desain baru setiap task hanya muncul sekali, sehingga kita terpaksa memakai satu definisi.

**5. KPI strip justru menjauhkan angka enterprise dari pengguna awam.**
Yang terasa enterprise saat ini adalah 14 card itu sendiri. *Task terbuka*, *Bug terbuka*, dan *Ditutup 14 hari*, yang oleh A1 disebut "KPI vanity" (§2.1, R6), tampil ke semua orang. Usulan baru memindahkan angka-angka ini ke strip khusus PM. Isinya maksimal 4 angka, dan masing-masing wajib punya perubahan atau ambang batas (`fitur-ringkasan.md` §2, "Kenapa angka KPI dipindah"). Member dan lansia tidak melihatnya sama sekali. Dibanding kondisi sekarang, cara ini lebih sesuai dengan pesan riset "jangan jadikan fitur enterprise sebagai fitur utama" (`fitur-ringkasan.md` §3).

### Antisipasi serangan terberat

- **"Zona C (mengetik pertanyaan bebas) berat untuk lansia."** Saya akui. `fitur-ringkasan.md` §3 sendiri memberinya tanda ⚠️. Tapi ini alasan untuk mengganti Zona C dengan pertanyaan siap-klik atau suara, bukan alasan untuk mempertahankan 14 card. Zona C pun tidak menggantikan card apa pun.
- **"4 zona masih padat."** Saya akui sebagian. Jalan keluarnya: Briefing dan Fokus jadi layar utama, sedangkan Agenda & Proyek jadi tab terpisah (§3). Hasilnya tetap jauh lebih ringan daripada 14 card.
- **"Belum diuji ke lansia."** Benar, tapi itu berlaku untuk *kedua* desain. 14 card juga belum pernah diuji, dan duplikasinya sudah terbukti di atas kertas (Argumen 1).
- **"AI bisa mengarang."** AI tidak menentukan urutan. AI hanya menceritakan data yang sudah dihitung (A1 §4.1).

## Serangan / pertanyaan balik untuk lawan

1. Card mana dari 14 card itu yang menjawab "kerjakan apa dulu, dan kenapa"? Sebutkan satu saja.
2. Kalau 14 card dipertahankan, angka mana yang harus dipercaya Bu Sri saat *Task terbuka* dan *Status task saya* tidak cocok?
3. "Perbaikan kecil" apa yang bisa menghapus kemunculan satu task di 5 card tanpa menggabungkan card-card itu? Kalau harus digabung, bukankah itu juga perombakan?
