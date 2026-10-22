// Data worktree: Tahap → Modul → Fitur. Sumber: ../penyederhanaan-fitur-clickup.md (bagian 2 dan 5).
// n = nama fitur, c = fitur ClickUp yang digantikan, l = lapisan tampil (L1/L2/L3/S/N), d = penjelasan.
window.WORKTREE = [
  { id: "tahap-1", no: 1, nama: "Inti", ringkas: "Yang dipakai setiap hari, terlihat sejak hari pertama.", modul: [
    { nama: "Struktur", fitur: [
      { n: "Proyek", c: "Space / Folder / List", l: "L1", d: "Satu-satunya wadah. Dibuat dari tujuan (\"Mau mengurus apa?\"), bukan dari menyusun hierarki." },
      { n: "Tugas", c: "Task", l: "L1", d: "Hal yang harus dikerjakan, dengan satu penanggung jawab." },
      { n: "Langkah", c: "Subtask + Checklist", l: "L2", d: "Pecahan tugas. Muncul saat tugas punya langkah. Bentuknya masih perlu diputuskan." },
      { n: "Proyek \"Harian\"", c: "Task wajib di List", l: "S", d: "Tugas tanpa proyek otomatis masuk ke sini, jadi tidak perlu memilih tempat dulu." }
    ]},
    { nama: "Membuat tugas", fitur: [
      { n: "Kotak ketik pintar", c: "Modal Create Task, 10+ field", l: "L1", d: "Ketik \"Bayar listrik Jumat, Budi\". Sistem mengubahnya jadi chip tanggal dan orang yang bisa diketuk." },
      { n: "Tombol suara 🎤", c: "Talk to Text", l: "L1", d: "Satu tombol di kotak ketik. Hasil suara diproses sama seperti teks." },
      { n: "Draf otomatis", c: "Dialog \"Save draft?\"", l: "S", d: "Tulisan yang belum selesai tersimpan diam-diam dan muncul lagi saat + dibuka." }
    ]},
    { nama: "Detail tugas", fitur: [
      { n: "Tombol Selesai", c: "Status + Mark as Closed", l: "L1", d: "Tombol besar. Status lain diatur sistem." },
      { n: "Kapan", c: "Start date + Due date + Recurring", l: "L1", d: "Satu kolom: \"Jumat\", \"Jumat–Minggu\", atau \"tiap Senin\"." },
      { n: "Siapa", c: "Multiple assignees", l: "L1", d: "Satu penanggung jawab utama, plus \"Ikut bantu\"." },
      { n: "Penting ⭐", c: "Priority 4 tingkat", l: "L1", d: "Satu saklar. Tingkat mendesak dihitung otomatis dari tenggat." },
      { n: "Catatan", c: "Rich text + blok /", l: "L1", d: "Kolom teks biasa. Format muncul saat teks diseleksi." },
      { n: "Obrolan tugas", c: "Comments + @mention", l: "L1", d: "Diskusi menempel di tugasnya, dengan @nama." }
    ]},
    { nama: "Status", fitur: [
      { n: "3 status + 2 turunan", c: "Status custom per List", l: "S", d: "Menunggu giliran → Aktif → Selesai. Belum berjadwal dan Terlambat dihitung otomatis." },
      { n: "Arsip otomatis", c: "Closed vs Complete", l: "S", d: "Tugas selesai diarsipkan sendiri setelah 30 hari." }
    ]},
    { nama: "Tampilan", fitur: [
      { n: "Hari Ini", c: "Home + Planner", l: "L1", d: "Rencana harian otomatis berisi 1–3 tugas." },
      { n: "Daftar · Papan · Kalender", c: "13 view", l: "L1", d: "Tiga cara melihat proyek. Yang terakhir dipakai diingat per orang." }
    ]},
    { nama: "Orang & navigasi", fitur: [
      { n: "Undang lewat WhatsApp / tautan", c: "Invite via email + seat", l: "L1", d: "Kirim undangan sambil memilih peran." },
      { n: "4 peran", c: "Matriks izin", l: "L1", d: "Pemilik, Pendamping, Anggota, Tamu." },
      { n: "5 menu bawah berlabel", c: "Sidebar ikon + More", l: "L1", d: "Hari Ini, Tugas, Proyek, Orang, Pengaturan." },
      { n: "Satu tombol +", c: "6+ quick action", l: "L1", d: "Berisi Tugas, Proyek, dan Minta tolong." },
      { n: "Cari", c: "Search ⌘K", l: "L1", d: "Kotak cari yang terlihat, tanpa shortcut." },
      { n: "Batalkan", c: "Dialog konfirmasi", l: "S", d: "Aksi langsung jalan, lalu bisa dibatalkan selama beberapa detik." },
      { n: "Mode terang & teks besar", c: "Dark mode default", l: "S", d: "Target sentuh ≥ 48 px, ikon selalu berlabel." }
    ]}
  ]},
  { id: "tahap-2", no: 2, nama: "Sistem yang membantu", ringkas: "Muncul sendiri saat relevan, atau dikerjakan sistem.", modul: [
    { nama: "Estafet", fitur: [
      { n: "Harus setelah…", c: "Dependency waiting on / blocking", l: "L2", d: "Bisa beberapa tugas, lintas proyek. Saat semuanya selesai, tugas ini aktif dan orangnya dikabari (USP-2)." },
      { n: "Terkait", c: "Relate items", l: "L2", d: "Hubungan biasa antar tugas, tanpa urutan." }
    ]},
    { nama: "Kabar & tindak lanjut", fitur: [
      { n: "Kabari…", c: "Watchers", l: "L2", d: "Pilih orang, termasuk tamu tanpa akun, yang dikabari saat tugas selesai." },
      { n: "Kartu tindak lanjut", c: "Inbox + notifikasi", l: "S", d: "Tugas terlambat jadi kartu di Hari Ini: [Sudah selesai] [Besok saja] [Minta tolong]." },
      { n: "Notifikasi ringkas", c: "Notifikasi per kejadian", l: "S", d: "Satu ringkasan pagi plus pesan mendesak. Jam tenang 21.00–06.00." },
      { n: "Ringkasan proyek", c: "Dashboard + widget", l: "S", d: "x selesai, y terlambat, langkah berikutnya, lengkap dengan tombol aksi (USP-5)." }
    ]},
    { nama: "Bantuan AI", fitur: [
      { n: "Pecah jadi langkah", c: "Write with AI / Whiteboard", l: "L2", d: "AI mengusulkan daftar langkah, pengguna memeriksa lalu [Pakai]." },
      { n: "Rapikan tulisan · Ringkas obrolan", c: "Panel AI", l: "L2", d: "Muncul di tempat, mis. saat obrolan sudah panjang." },
      { n: "Cari yang menjawab", c: "Brain² Ask", l: "L2", d: "Ketik \"tugas Budi minggu ini?\" di Cari, lalu dapat jawaban dengan tombol." },
      { n: "Contoh langkah", c: "Galeri template", l: "S", d: "Ditawarkan saat mengetik: \"Kelihatannya acara. Pakai contoh langkah acara?\"" }
    ]},
    { nama: "Tampilan otomatis", fitur: [
      { n: "Jadwal bergaris", c: "Gantt / Timeline", l: "L2", d: "Muncul bila proyek punya ≥ 2 tugas bertanggal yang saling Harus setelah…" },
      { n: "Siapa sedang sibuk", c: "Workload / Teams Pulse", l: "L2", d: "Di menu Orang: jumlah tugas aktif dan terlambat per orang." }
    ]},
    { nama: "Kolaborasi", fitur: [
      { n: "Minta tolong", c: "Form / assign manual", l: "L2", d: "Minta bantuan ke anggota keluarga atau tim, dua arah (USP-6)." },
      { n: "Bagikan", c: "Share + public link + guest", l: "L2", d: "Tautan lihat-saja atau kirim ke WhatsApp. Tamu bisa menekan tombol jawaban." },
      { n: "Jadikan tugas", c: "Assign comment", l: "L2", d: "Tekan lama sebuah pesan obrolan, lalu jadikan tugas." },
      { n: "Obrolan proyek", c: "Chat Channels + DM", l: "L2", d: "Satu ruang obrolan per proyek. Pesan pribadi tetap lewat WhatsApp." },
      { n: "Edit massal", c: "Bulk edit", l: "L2", d: "Tekan lama untuk memilih, lalu Selesai · Geser tanggal · Ganti orang." }
    ]},
    { nama: "Kanal luar", fitur: [
      { n: "WhatsApp & email", c: "(tidak ada)", l: "S", d: "Kabar dan pertanyaan terkirim ke luar aplikasi. Menunggu keputusan rekan no. 1." },
      { n: "Teruskan pesan jadi tugas", c: "(tidak ada)", l: "S", d: "Pesan diteruskan, lalu sistem menanyakan satu hal yang kurang (USP-1)." }
    ]}
  ]},
  { id: "tahap-3", no: 3, nama: "Alat tambahan", ringkas: "Dibuka per tugas atau per proyek saat dibutuhkan.", modul: [
    { nama: "Info tugas", fitur: [
      { n: "Info tambahan", c: "Custom Fields", l: "L3", d: "Ketik nama info (\"Nomor meteran\"), jenisnya ditebak sistem." },
      { n: "Label & label kelompok", c: "Tags + Folder", l: "L3", d: "Label dengan saran otomatis. Proyek bisa dikelompokkan (\"Rumah\", \"Usaha\")." },
      { n: "Tampil juga di proyek lain", c: "Multi-List", l: "L3", d: "Satu tugas muncul di lebih dari satu proyek." },
      { n: "Lampiran", c: "Attachments + cover", l: "L3", d: "Foto langsung dari kamera." },
      { n: "Riwayat", c: "Activity log", l: "L3", d: "Daftar perubahan, dilipat di bawah tugas." }
    ]},
    { nama: "Waktu & target", fitur: [
      { n: "Perkiraan lama · Catat waktu", c: "Time estimate + tracking", l: "L3", d: "Diaktifkan per proyek." },
      { n: "Laporan waktu", c: "Timesheets", l: "L2", d: "Muncul hanya bila Catat waktu aktif." },
      { n: "Target", c: "Goals / OKR", l: "L3", d: "Proyek dengan angka (\"Tabungan Rp10 juta\"). Progres dari tugas atau angka yang diisi." },
      { n: "Titik penting ⭐", c: "Milestone", l: "L3", d: "Tanda pada tugas yang menjadi patokan." }
    ]},
    { nama: "Alur kerja", fitur: [
      { n: "Tahap tambahan", c: "Custom status", l: "L3", d: "Maks. 5 per proyek. Contoh \"Perlu dicek\" yang memunculkan [Setuju] [Kembalikan]." },
      { n: "Aturan otomatis", c: "Automations builder", l: "S", d: "Sistem melihat pola lalu menawarkan aturan. Daftarnya ditulis dalam kalimat biasa." }
    ]},
    { nama: "Catatan & formulir", fitur: [
      { n: "Catatan proyek", c: "Docs / Wiki", l: "L3", d: "Satu halaman per proyek. Baris teks bisa dijadikan tugas." },
      { n: "Catatan rapat", c: "Meetings + AI Notetaker", l: "L3", d: "Rekam suara, dapat ringkasan dan langkah yang bisa dijadikan tugas." },
      { n: "Formulir permintaan", c: "Forms", l: "L3", d: "Tautan yang bisa dibagikan. Setiap kiriman jadi tugas." },
      { n: "Pesan suara / video", c: "Clips", l: "L3", d: "Rekam langsung di obrolan tugas." }
    ]},
    { nama: "Sambungan", fitur: [
      { n: "Pindahkan dari Excel / Trello", c: "Import", l: "L3", d: "Dengan pratinjau sebelum masuk." },
      { n: "Unduh Excel / PDF / gambar", c: "Export", l: "L3", d: "Gambar bisa langsung dikirim ke WhatsApp." },
      { n: "Google Calendar", c: "Calendar sync", l: "L3", d: "Satu saklar di Pengaturan." },
      { n: "Shortcut & perintah /", c: "Shortcut", l: "L3", d: "Untuk pengguna cepat. Tidak diajarkan di awal." }
    ]}
  ]},
  { id: "tahap-4", no: 4, nama: "Nanti", ringkas: "Ditunda ke fase berikutnya, tidak dihapus.", modul: [
    { nama: "Fase berikutnya", fitur: [
      { n: "Whiteboard & Mind Map", c: "Whiteboard, Mind Map", l: "N", d: "Sementara diganti Pecah jadi langkah." },
      { n: "Jadwal kirim obrolan", c: "Schedule comment", l: "N", d: "Nilainya rendah untuk segmen awal." },
      { n: "Integrasi lain", c: "App Center", l: "N", d: "Setelah WhatsApp, Email, dan Google Calendar stabil." }
    ]}
  ]}
];
