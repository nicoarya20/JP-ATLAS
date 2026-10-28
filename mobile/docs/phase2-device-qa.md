# Cek di HP — Fase 2 (app membaca server)

Daftar ini untuk user, dicek di HP sungguhan lewat Expo Go setelah modul-modul mobile tersambung ke `/api/app`. Isinya hal yang tidak bisa dibuktikan tes jest: data nyata dari server, sesi sungguhan, jaringan, zona waktu, gesture, dan screen reader. Hal yang sudah dicek di `phase1-device-qa.md` (rasa gesture tab bar, kaca, radial) tidak diulang di sini kecuali perilakunya berubah karena server.

**Format item:** peran yang dipakai → apa yang dilakukan → apa yang seharusnya terlihat. Tag `[iOS]`, `[Android]`, atau `[keduanya]`. Peran: **Member**, **PM** (Project Manager), **Admin**.

**Tanda GAP:** item bertanda **🙈 GAP** adalah kontrol yang **sengaja disembunyikan**, karena servernya belum punya data atau rutenya. Kalau tidak terlihat, itu bukan bug, jadi jangan dilaporkan. Alasan per baris ada di `phase2-gap-disembunyikan.md`. Item bertanda **⏳ menyusul** masih dikerjakan, jadi lewati dulu.

**Urutan:** sesuai bagian di bawah. Login dulu, karena semua layar lain butuh sesi.

## 0. Persiapan

- [ ] **Nyalakan dev stack** (sekali, di Mac)
  - Dari root repo: `envman -e simple-pm:mobile -- bun dev:all`. Perintah ini menyalakan backend (Elysia, port **3005**) dan Metro dalam satu terminal. Ctrl-C mematikan keduanya.
  - Tunggu sampai backend siap dan Metro menampilkan QR, lalu buka QR itu di Expo Go.
- [ ] **Alamat server untuk HP**
  - `EXPO_PUBLIC_API_URL` harus memakai **IP LAN Mac**, bukan `localhost`, misalnya `http://192.168.1.10:3005`. Di HP, `localhost` adalah HP itu sendiri. Cek IP dengan `ipconfig getifaddr en0`.
  - HP dan Mac harus di Wi-Fi yang sama. Origin ini juga harus terdaftar di `MOBILE_TRUSTED_ORIGINS` (`.env` root).
  - Nilainya dibakar saat bundle dibuat. Setelah mengubahnya, jalankan ulang Metro dengan cache bersih (`bun start --clear`).
- [ ] **Tiga akun di server dev**
  - Siapkan satu akun per peran: Member, PM, Admin. Ditambah satu akun baru yang belum disetujui (untuk Pending) dan satu akun yang ditolak atau dinonaktifkan (untuk Denied).
  - Peran diubah lewat web `/dashboard/users` atau Users › Roles di HP (Admin). Perubahan peran berlaku di **sign-in berikutnya**.
- [ ] **Hermes `Intl` dan zona waktu** `[keduanya]`
  - Semua jam dan tanggal acara dihitung di **zona tim dari server** (`Asia/Jakarta`), lewat `Intl.DateTimeFormat` dengan `timeZone`. Hermes di Expo Go harus mendukungnya.
  - Buka Events lalu My calendar. Jam tampil normal, **tanpa** layar merah "This runtime's Intl.DateTimeFormat gave no … for zone …".
  - Ganti zona HP ke zona lain (iOS: Settings › General › Date & Time, matikan Set Automatically, pilih Tokyo), lalu buka app lagi. Jam acara **tetap** jam WIB, tidak bergeser +2 jam. "Today" mengikuti tanggal server, bukan tanggal HP.
  - Kembalikan zona HP setelah selesai.

## 1. Login dan sesi

- [ ] **Login email + password** `[keduanya]` (PM)
  - Isi Email dan Password lalu ketuk Sign in. Tombol berputar selama menunggu, lalu Home terbuka.
  - Email atau password kosong memunculkan "Enter your email address." / "Enter your password." di bawah kolomnya. Password salah memunculkan pesan dari server, dan kolom tetap terisi.
  - 🙈 GAP: **Sign in with Google** dimatikan dengan alasan tertulis ("Google sign-in needs a built app and does not work in Expo Go yet…"). Ini disengaja di Expo Go.
- [ ] **Sesi bertahan** `[keduanya]` (PM)
  - Tutup app sepenuhnya (geser dari app switcher) lalu buka lagi. Home langsung terbuka tanpa login ulang.
- [ ] **Pending** `[keduanya]` (akun baru belum disetujui)
  - Login dengan akun yang belum disetujui. Layar "Your account is awaiting admin approval" muncul dengan pil Pending, tanpa tab bar.
  - Ketuk Check status selagi masih pending. Tombol berputar sebentar, lalu muncul "Still awaiting approval.".
  - Setujui akun itu dari HP lain atau web (Admin), lalu ketuk Check status lagi. App masuk ke Home.
  - 🙈 GAP: form profil (Full name, Nickname, Job title, Division, Save profile) dan Change photo tidak ada di layar ini. Server menolak perubahan profil dari akun yang belum disetujui. Lengkapi profil lewat Settings › Edit profile setelah disetujui.
- [ ] **Denied** `[keduanya]` (akun ditolak/dinonaktifkan)
  - Login. Layar "Access denied" muncul dengan "Reason from admin:" dan alasan dari Admin, atau "No reason was given.".
  - Ketuk "Sign out and use another account". Dialog konfirmasi muncul, lalu app kembali ke layar login.
- [ ] **Server tak terjangkau** `[keduanya]`
  - Matikan backend (Ctrl-C di `dev:all`, atau matikan Wi-Fi HP), lalu buka app. Layar "Cannot reach the server" muncul dengan pesan galatnya dan tombol Try again.
  - Nyalakan lagi, lalu ketuk Try again. App masuk ke layar sesuai sesi.
- [ ] **Sign out (T2)** `[keduanya]`
  - Dari Settings atau Profile, ketuk Sign out. Dialog "Sign out?" / "You'll be signed out of this account." muncul. Batal tidak mengubah apa pun. Konfirmasi membawa ke login.
  - Login dengan akun lain. Tidak ada data akun sebelumnya yang tertinggal (Home, Inbox, badge).

## 2. Home, Inbox, Team

- [ ] **Home dari server** `[keduanya]` (PM)
  - Sapaan memakai kata pertama nama akun. Chip Assigned / In Progress / Completed / Inbox berisi angka nyata.
  - Daily Briefing dan Ask Data berisi kalimat yang disusun dari data proyek sendiri (tanpa LLM). My Focus, Agenda & Projects, Tasks Completed This Week, dan Latest Activity terisi atau menampilkan teks kosongnya.
  - Tiap bagian gagal-lunak: bagian yang gagal dimuat menampilkan "Try again" di kartunya sendiri, sementara bagian lain tetap tampil. Untuk mencobanya, matikan backend sebentar lalu buka Home dari tab lain.
  - 🙈 GAP: chip Upcoming, chip Admin (Active projects, Overdue tasks, Awaiting users) dan baris "Approve N new users", lokasi di kartu agenda, Lead di baris agenda, kolom tanya bebas Ask Data, serta status "· In review" di sub-baris My Focus.
- [ ] **My Focus: Start / Done** `[keduanya]` (PM)
  - Ketuk Start di tugas sendiri. Muncul "Task started", baris dan chip In Progress berubah.
  - Ketuk Done. Muncul "Task marked done", baris hilang, dan tab Tasks ikut menampilkannya di Done.
- [ ] **Baris membuka layar yang tepat** `[keduanya]` (PM)
  - Baris tugas membuka detail tugas, baris acara membuka detail acara, dan baris proyek membuka detail proyek. "See all" membuka tab terkait. Back kembali ke Home pada posisi gulir yang sama.
  - Ketuk "Search or ask anything…". Muncul "Search is coming soon.".
- [ ] **Inbox** `[keduanya]` (PM)
  - More › Inbox menampilkan dua tab: "Needs your response (N)" dan "Latest updates". Kartu berisi kalimat server apa adanya (bisa berbahasa Indonesia).
  - Latest updates: "Mark as read" per kartu, dan "Mark all as read" memunculkan "N updates marked as read". Bila semua sudah dibaca, muncul "Everything here is read".
  - Kosong menampilkan "All caught up" / "No updates yet".
  - 🙈 GAP: kartu "Meeting outcomes…" dengan lead AI, kartu Approvals agregat, alasan `why`, tombol buka untuk kartu cuti, dan kartu jenis yang tidak dikenal.
- [ ] **Badge Inbox** `[keduanya]` (PM)
  - Buat sesuatu yang masuk Inbox akun ini dari web atau akun lain. Badge di ubin More › Inbox dan chip Inbox Home **tidak** berubah sendiri (tanpa polling).
  - Kirim app ke background lalu buka lagi. Badge berganti ke angka baru. Membuka panel More juga memperbarui badge.
  - 🙈 GAP: pembaruan otomatis berkala seperti di web (polling 60 detik) ditunda.
- [ ] **Team** `[keduanya]` (PM)
  - More › Team menampilkan orang-orang di proyek bersama, dengan baris ringkasan "N active / N overdue". Akun sendiri bertanda "(You)".
  - Search name… dikirim ke server setelah ketikan berhenti. Sort (Name / Active tasks / Overdue) mengubah urutan. Load more menambah halaman.
  - Ketuk orang untuk membuka "Team member": proyek bersama dan Active tasks. Untuk orang yang tugasnya tidak boleh dilihat, muncul kalimat "Other people's task lists are visible only to the project Manager and Admin.".
  - Member tanpa proyek melihat "No team yet".
  - 🙈 GAP: pil "Available", pemilih All projects, baris fakta "Account role" untuk non-Admin, dan nama proyek lain (diganti kalimat tanpa nama). Angka active/overdue di ringkasan hilang setelah Load more.

## 3. Tasks

- [ ] **My tasks dan All tasks** `[keduanya]` (PM)
  - My tasks dikelompokkan per jadwal, dengan judul grup berisi angka dari server. All tasks memuat semua proyek yang boleh dilihat, tanpa titik filter menyala.
  - "Search title or #number…" mencocokkan judul atau **nomor persis** ("12" atau "#12"). "#1" tidak menemukan #12, dan itu disengaja.
  - Filter & sort: Status, Project (daftar proyek dari server), Assignee, Priority, Sort by. Reset mengembalikan daftar penuh.
  - Daftar yang disaring dan masih punya halaman lanjutan menulis angka "25+", bukan total karangan.
  - 🙈 GAP: sort "Title (A–Z)", grup "Waiting for my review", tipe tugas di baris kartu (diganti nama proyek), dan "+N" pengerja kedua.
- [ ] **Kanban dan menu radial** `[keduanya]` (PM)
  - Tahan kartu lalu pilih status. Kartu pindah dan perubahan tersimpan di server. Cek di web atau dengan membuka ulang.
  - Pindah grup (Select → beberapa kartu): notifikasi menyebut berapa yang berhasil. Bila sebagian ditolak server, jumlah yang gagal ikut disebut.
  - Sisi radial yang tidak diizinkan server digambar mati ("not available"). Kartu Done yang boleh dibuka lagi berkata "Open the task to reopen it with a reason.".
  - 🙈 GAP: sisi **In review** selalu mati (alur review belum ada di server).
- [ ] **Detail tugas** `[keduanya]` (PM)
  - Tombol utama (Start working / Mark done / Reopen / Restore) mengikuti izin server, dan hasilnya langsung terlihat.
  - Steps: centang tersimpan. "+ Add step" menambah langkah.
  - Chat & history: kirim komentar. Riwayat menampilkan aksi tadi.
  - Menu ⋯ berisi Edit task, Cancel task, dan Move to Trash (sesuai izin). Item yang ditolak server memunculkan alasannya saat diketuk.
  - Tugas tanpa izin ubah menampilkan "You can view this task, but not change it.". Tugas yang sudah dihapus menampilkan "This task is no longer here.".
  - 🙈 GAP: Request review / Approve / Return, Evidence, Tag, dan Estimated hours.
- [ ] **Sheet Reopen dan Cancel** `[keduanya]` (PM)
  - Reopen task: alasan wajib. Reopen mengembalikan tugas ke In progress dan alasannya tercatat di riwayat.
  - Cancel task: "Why cancel?" wajib, dan Note wajib bila memilih Other. Tugas jadi Canceled dan bisa dipulihkan dari detailnya.
- [ ] **Move to Trash + Undo (T1)** `[keduanya]` (PM)
  - Menu ⋯ › Move to Trash langsung menghapus, **tanpa dialog**. Muncul "Task moved to Trash" dengan tombol Undo.
  - Undo memunculkan "Task back from the Trash". Tanpa Undo, tugas ada di More › Trash.
- [ ] **New task (Fill form) dan Edit** `[keduanya]` (PM)
  - "+" di tab Tasks › Fill form. Pilih proyek, lalu Assignee terisi dari anggota proyek itu ("Unassigned" boleh). Save hanya butuh judul, dan tanggal mulai ≤ tenggat. Hasilnya "Task created", lalu detail tugas baru terbuka.
  - Edit task hanya mengirim yang berubah, lalu muncul "Task updated".
  - Member tanpa proyek melihat "No project to add a task to".
  - 🙈 GAP: Tag, Estimated hours, Needs review / Reviewer, dan langkah di form. Tenggat yang sudah terisi tidak bisa dikosongkan (hutang UI).
- [ ] ⏳ **Just write ✦** (menyusul, dikerjakan 34)
  - Lewati dulu. Daftar cek ditambahkan begitu alurnya tersambung ke `POST /tasks/draft`.
  - 🙈 GAP: baris **Import tasks** di sheet Create tidak ada (tidak ada endpoint impor CSV).

## 4. Projects

- [ ] **Daftar dan filter** `[keduanya]` (PM)
  - Kartu menampilkan nama, Lead, tenggat, dan progress. Search project name… dikirim ke server.
  - Filter: Status, sakelar "Needs attention", dan Sort by (Nearest deadline / Recently updated / Name). Load more dan "Showing N of M" tampil.
  - Member hanya melihat proyeknya sendiri. Member tanpa proyek melihat "You're not in any project yet.".
  - 🙈 GAP: baris orang / chip My projects, Health per tingkat (diganti satu sakelar), sort "Lowest progress", dan jumlah anggota di kartu.
- [ ] **"+" New project** `[keduanya]`
  - PM / Admin: "+" di tab Projects membuka form langsung. "+ Member" mencari nama lewat server. Save membuka proyek baru.
  - Member: "+" terlipat di tab Projects.
  - 🙈 GAP: alur Story → Draft ✦ dan Template.
- [ ] **Detail: Overview dan Phases** `[keduanya]` (PM pengelola)
  - Overview: Progress, Tasks done, Time elapsed, Phases & next milestone, Tasks needing attention, Recent activity.
  - Phases: Start phase / Complete phase tersimpan ("Phase started" / "Phase completed"). Deadline history tampil.
  - Extend deadline: tanggal harus setelah tenggat lama. Ada empat pilihan alasan. Hasilnya tercatat di Deadline history.
  - 🙈 GAP: "+ Phase" / "+ Milestone", kotak "Impact of change", opsi "Estimate was off", dan Project settings di menu ⋯.
- [ ] **Detail: tab Tasks** `[keduanya]` (PM)
  - Segmen Tasks berisi List / Kanban, kartu dari server untuk proyek ini, "+ New task", dan filter. Geser kartu di Kanban tersimpan.
  - Tombol per kartu (mis. Reopen) mengikuti izin server.
  - Proyek tanpa tugas menampilkan "No tasks in this project yet".
- [ ] **Members (T2)** `[keduanya]` (PM pengelola)
  - "+ Member" menambah orang, lalu muncul "<nama> added".
  - Ganti peran (Manager / Member / Viewer) memunculkan dialog "Change <nama>'s role?". Remove memunculkan dialog "Remove <nama> from the project?".
  - Manager satu-satunya tidak bisa dikeluarkan, dan alasannya tertulis. Diri sendiri tidak bisa dikeluarkan.
- [ ] **Edit project dan Move to Trash** `[keduanya]` (PM pengelola)
  - Edit tanpa perubahan membuat Save mati dengan alasan "Nothing has changed yet.". Status ke Done/Canceled atau ganti Lead meminta konfirmasi dulu.
  - Move to Trash memunculkan dialog yang menyebut jumlah tugas. Setelah dikonfirmasi muncul "Project moved to Trash" dengan Undo.
  - Member atau non-pengelola: item menu yang ditolak memunculkan alasannya saat diketuk.
  - 🙈 GAP: cek nama proyek ganda dihapus. Nama sama boleh, karena server tidak menolaknya.

## 5. Events

- [ ] **List dan Calendar** `[keduanya]` (PM)
  - List dikelompokkan per tanggal. Search event title… dikirim ke server. Filter: Show, Event type, Project, Group by.
  - Calendar Month / Week: titik di hari yang punya acara. Ketuk hari untuk melihat agenda "<tanggal> · N events".
  - Jam acara ditampilkan di WIB (lihat §0 Hermes).
  - 🙈 GAP: badge/pill Repeat dan kemunculan berulang, cari lokasi, serta "View results".
- [ ] **Detail** `[keduanya]` (PM)
  - Time, Location / Meeting link (ketuk untuk membuka; gagal membuka memunculkan pesan), Project, Reminder (baca saja), Attendees dengan tanda Creator, Agenda, dan Minutes (baca saja).
  - Kaki halaman: "Created by X · Updated <tgl>".
  - 🙈 GAP: peran Note-taker, tulis notulen, serta seluruh alur Record → Outcomes → Results (layarnya sudah dihapus).
- [ ] **New event dan Edit** `[keduanya]` (PM; ulangi sebagai Member)
  - Title wajib ("Enter a title."). End harus setelah Start. Link online harus http(s).
  - Attendees dicari lewat server. Mengeluarkan tamu meminta konfirmasi "Remove guest?".
  - Tanpa project hanya tamunya yang melihat acara. Save memunculkan "Event saved" / "Event updated".
  - Edit: proyek terkunci ("An event can't move to another project.").
  - Member mencari tamu untuk acara pribadi: pesan dari server tampil apa adanya (E-9, menunggu keputusan server).
  - 🙈 GAP: pilihan Repeat dan pemilih Reminder (memakai bawaan server).
- [ ] **Cancel event (T2) dan Move to Trash (T1)** `[keduanya]` (PM pembuat)
  - Cancel event: alasan wajib. Acara tetap tampil dengan tanda Canceled dan "Canceled by <nama>".
  - Move to Trash memunculkan "Event moved to Trash" dengan Undo, lalu "Event restored".
  - 🙈 GAP: batalkan "hanya kemunculan ini" (tidak ada seri berulang).

## 6. Profile, Settings, My calendar, Trash, Users

- [ ] **Profile** `[keduanya]` (PM; ulangi sebagai Admin)
  - Kartu profil di panel More ("<nama>, open profile") membuka Profile: foto sesi, nama tampilan, dan "Job title · Division". Admin mendapat tambahan " · Admin".
  - Baris My tasks, My calendar, Inbox (dengan badge), dan Settings membuka layar yang tepat. Help & resources hanya memunculkan notifikasi (belum ada isinya).
  - Copy email memunculkan "Email copied".
  - 🙈 GAP: gelembung catatan, titik dan teks Online/Offline, switch Mute (pindah ke Settings), serta Change photo.
- [ ] **Settings dan Edit profile** `[keduanya]` (PM)
  - Dua switch Notifications (Event reminders, Inbox updates) tersimpan ke server. Tutup app lalu buka lagi: posisinya tetap.
  - Edit profile: Full name wajib ("Enter your full name."). Peran dan email hanya bisa dibaca. Save memunculkan "Profile saved", dan nama di Profile serta panel More ikut berubah.
  - Admin: kaki halaman menyebut Users.
  - 🙈 GAP: grup Team settings (Admin), Change photo, bidang Phone, dan Hapus akun.
- [ ] **My calendar** `[keduanya]` (PM)
  - Pekan dimulai Minggu. Hanya acara yang diikuti sendiri yang tampil, sebagai blok di jam WIB-nya. Acara batal tetap tampil bertanda Canceled.
  - Geser week strip atau ketuk Previous / Next week untuk pindah pekan, dan acaranya dimuat dari server. Ketuk blok untuk membuka detail acara.
  - Acara yang melewati tengah malam terpotong di tepi tiap hari.
  - 🙈 GAP: garis merah "now" dan pengulangan.
- [ ] **Trash** `[keduanya]` (PM; ulangi sebagai Admin)
  - More › Trash memuat proyek, tugas, dan acara yang dihapus, dengan sisa hari. Saring jenisnya lewat "Kind of deleted item".
  - Restore mengembalikan item ke daftarnya. Cek di tab terkait.
  - Admin: Delete forever (T3, bila `can.purge`) membuka sheet "Delete forever?" yang meminta mengetik nama item. Tombol mati sampai namanya cocok, lalu muncul "Deleted forever".
  - PM: kontrol yang ditolak server tetap tampil, tetapi kelabu.
  - Kosong menampilkan "Trash is empty".
- [ ] **Users** `[keduanya]` (Admin; ulangi sebagai PM)
  - PM / Member: ubin Users tidak ada di panel More. Membuka `/more/users` lewat tautan langsung mengarah ke Home.
  - Admin › Approval: chip "Pending N" / "Deactivated N", pendaftar terlama di atas. Pilih Starting role lalu Approve: dialog konfirmasi muncul, lalu "User approved as <peran>", kartu hilang, dan badge Users turun.
  - Reject: alasan wajib ("Write a reason first"). Dialog berisi alasan yang akan dilihat pengguna. Pengguna itu lalu melihat alasannya di layar Denied (§1).
  - Admin › Roles: ganti peran dan Deactivate / Reactivate dengan dialog. Baris yang ditolak server (mis. Admin lain, diri sendiri) tampil baca-saja.
  - Search name or email… dikirim setelah ketikan berhenti. Load more menambah halaman.
  - Penolakan server (mis. "Admin hanya boleh memberi peran …") tampil di dialog apa adanya.
  - 🙈 GAP: chip Approved / Rejected, jabatan/divisi pendaftar, dan Hapus akun orang lain.

## Aksesibilitas (cek ulang setelah data nyata)

- [ ] **Teks server panjang** `[keduanya]`
  - Nama proyek/orang dan kalimat Inbox yang panjang (bahasa Indonesia) terpotong atau membungkus tanpa menutupi tombol di 375 pt dan dengan teks sistem besar.
- [ ] **Pesan galat diumumkan** `[keduanya]` (VoiceOver/TalkBack)
  - Galat kolom wajib (Title, Full name, alasan Reject/Reopen/Cancel) dan galat dari server dibacakan begitu muncul.
- [ ] **Loading terbaca** `[keduanya]` (VoiceOver/TalkBack)
  - Tombol yang sedang mengirim terbaca sibuk. Layar yang memuat tidak membacakan isi kosong lebih dulu.
