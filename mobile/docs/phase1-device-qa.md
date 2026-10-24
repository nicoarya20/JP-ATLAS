# Cek di HP — akhir Fase 1

Daftar ini untuk user, dicek di HP sungguhan di akhir Fase 1. Isinya hal yang tidak bisa dibuktikan tes jest: gesture, waktu, portal, screen reader, dan setelan sistem.

**Format item:** apa yang dilakukan → apa yang seharusnya terlihat. Tag `[iOS]`, `[Android]`, atau `[keduanya]`.

**Data:** sampel, dengan "hari ini" = Rabu 7 Okt 2026, jam 9:41. Role bisa diganti di `src/data/session.ts` (Member/PM/Admin).

**Expo Go vs development build:**
- Belum ada item yang diketahui berbeda di antara keduanya.
- Kalau sebuah item gagal **hanya** di Expo Go, ulangi di development build lalu catat hasil keduanya.
- Liquid Glass tab bar hanya tampil di iOS 26+. Itu soal versi iOS, bukan soal Expo Go.

**HP acuan:** layar lebar 375 pt (iPhone SE / 13 mini), ditambah satu HP Android.

## Navigasi & tab bar

- [ ] **Kaca di iOS 26** `[iOS]`
  - Pil tab dan tombol "+" memakai Liquid Glass: konten di belakangnya terlihat samar saat daftar digulir di bawah bar.
  - Di iOS < 26 dan di Android: permukaan semi-padat bertoken (tanpa blur), tepi dan bayangan tetap ada.
- [ ] **Kaca saat panel More terbuka** `[keduanya]`
  - Buka More → pil dan "+" menjadi lebih padat di atas latar gelap, teks/ikon tetap terbaca di mode terang dan gelap.
- [ ] **Ketuk tab: gelembung jelly** `[keduanya]`
  - Ketuk Tasks dari Home → gelembung meluncur ke Tasks lalu memantul (melebar, memipih, kembali); ikon Tasks ikut "pop".
  - Ketuk tab yang sudah aktif → tidak pindah layar, hanya pantulan di tempat. Membuka app pertama kali tidak memantul.
- [ ] **Tahan dan seret gelembung** `[keduanya]`
  - Tahan pil di satu tab → gelembung melompat ke bawah jari dan sedikit membesar.
  - Seret ke kanan/kiri → gelembung mengikuti jari tanpa tersendat; ikon di bawahnya menyala. Lepas → pindah ke tab terdekat lalu memantul.
  - Seret melewati ujung pil → gelembung berhenti di tab pertama/terakhir. Gestur yang dibatalkan sistem (mis. notifikasi turun) → kembali ke tab aktif.
- [ ] **Tab bar mengikuti link** `[keduanya]`
  - Dari Home ketuk baris tugas → bar tersembunyi di detail tugas. Back → bar muncul lagi dengan Home terpilih.
  - Dari Home ketuk "See all tasks" → bar memilih Tasks dan gelembung pindah ke sana.
- [ ] **"+" berganti per tab dan terlipat** `[keduanya]`
  - Label/aksi "+" per tab: Tasks → New task, Projects → New project, Events → New event, Home/More → sheet Create.
  - Sebagai Member di Projects → "+" terlipat halus (menyempit dan memudar), pil melebar mengisi ruang. Kembali ke Home → "+" terbuka lagi, tidak muncul mendadak.
- [ ] **Panel More: buka dan tutup** `[keduanya]`
  - Ketuk More → pil tumbuh ke atas menjadi kartu dengan sedikit "swell"; kartu profil lalu ubin muncul berurutan dari bawah.
  - Tutup lewat More lagi, ketuk latar gelap, atau tab lain → panel melipat tanpa swell; tab lain langsung terbuka setelahnya.
- [ ] **Ubin panel More** `[keduanya]`
  - Ubin Inbox, Team, Archive, Settings (Admin juga Users) 58 pt, ikon putih terbaca di kedua skema; ditekan sedikit mengecil.
  - Badge merah (Inbox, Users untuk Admin) bulat utuh dengan cincin, tidak terpotong tepi ubin.
  - Memilih ubin → panel tertutup dulu, lalu layar terbuka dengan tab More terpilih.
- [ ] **Sheet Create** `[iOS]`
  - "+" di Home → sheet setinggi isinya dengan grabber dan sudut 16; ditutup lewat X, geser ke bawah, atau ketuk latar.
  - Tab bar tetap terlihat di bawah sheet dengan tab yang sama terpilih.
- [ ] **Keyboard** `[keduanya]`
  - Ketik di kolom pencarian Tasks → tab bar menyingkir selama keyboard terbuka dan kembali saat keyboard tutup.
- [ ] **VoiceOver/TalkBack di tab bar** `[keduanya]`
  - Bar terbaca "App navigation"; tiap tab terbaca nama + terpilih/tidak. Swipe atas/bawah (rotor Actions / menu TalkBack) → "Next"/"Previous" pindah tab; dari Home "Previous" membuka panel More.
  - Panel More terbaca sebagai "More"; fokus tidak lolos ke layar di belakangnya, dan ubin berbadge terbaca "Inbox, 3 new".

## Home

- [ ] **Chip statistik melipat saat menggulir** `[keduanya]`
  - Gulir Home ke bawah perlahan → chip statistik tetap tersemat di atas, baris keterangannya memudar dan chip memendek mengikuti jari (tidak melompat).
  - Gulir kembali ke atas → chip kembali penuh. Lempar cepat lalu hentikan → tidak ada kedipan.
- [ ] **Chip di 375 pt dan teks besar** `[keduanya]`
  - Baris chip bisa digeser ke samping, chip terakhir tidak terpotong tepi layar.
  - Dengan skala teks sistem besar, angka dan keterangan chip tidak bertumpuk.
- [ ] **Pencarian Home** `[keduanya]`
  - Ketuk "Search or ask anything…" → notifikasi "Search is coming soon." tampil di atas tab bar.
- [ ] **My Focus: Done** `[keduanya]`
  - Sebagai PM, ketuk Done di tugas milik sendiri → "Task marked done", baris hilang dari My Focus, dan hitungan chip ikut berubah.
  - Buka tab Tasks → tugas itu ada di grup Done.
- [ ] **Baris membuka layar yang tepat** `[keduanya]`
  - Baris tugas → detail tugas; baris event berikutnya → detail event; baris proyek di My projects → detail proyek; "See all" di My projects → tab Projects; "Approve 2 new users" (Admin) → Users › Approval; "See all tasks" → My tasks.
  - Back dari tiap layar kembali ke Home pada posisi gulir yang sama.
  - Ganti nama satu proyek di Projects, atau pindahkan ke Archive → Home (My projects, chip Active milik Admin) ikut berubah tanpa memuat ulang.
- [ ] **VoiceOver/TalkBack di Home** `[keduanya]`
  - Tiap chip statistik terbaca sekali: angka + label + keterangan. Judul seksi terbaca sebagai heading.
  - Tombol Done terbaca bersama judul tugasnya ("Done: <judul>"), tidak hanya "Done".

## Tasks

- [ ] **Tahan vs geser** `[keduanya]`
  - Kanban: tahan kartu ±350 ms → menu radial terbuka di bawah jari.
  - Geser yang dimulai di kartu sebelum 350 ms → papan menggulir ke samping.
  - Selama membidik status, layar tidak ikut menggulir ke atas/bawah.
- [ ] **Tidak bocor jadi tap** `[keduanya]`
  - Tahan kartu sampai menu terbuka, lalu lepas tanpa menggeser → menu tetap terbuka dan detail tugas **tidak** terbuka.
  - Ketuk area gelap → menu tertutup.
- [ ] **Pindah dan batal** `[keduanya]`
  - Tahan, geser ke kanan, lepas → tugas pindah ke In progress dan muncul notifikasi "Moved to In progress".
  - Tahan, geser keluar lalu kembali ke tengah, lepas → batal, tidak ada yang pindah.
- [ ] **Multi-select** `[keduanya]`
  - Select → ketuk 2 kartu → tahan salah satu → tumpukan kartu terbang ke jari.
  - Geser ke kiri → "Moved 2 tasks to Done", dan mode Select berakhir.
- [ ] **Tombol Back Android** `[Android]`
  - Saat menu radial terbuka → Back hanya menutup menu, tidak keluar dari layar.
  - Back juga menutup sheet Return/Cancel dan modal New task.
- [ ] **Reduce Motion aktif** `[keduanya]` (iOS: Settings › Accessibility › Motion; Android: Remove animations)
  - Menu radial hanya memudar: tanpa stagger, tanpa skala, tanpa kartu terbang.
  - Pindah status tetap berfungsi.
- [ ] **Aksi screen reader di kartu** `[keduanya]`
  - VoiceOver/TalkBack di kartu Kanban → ada aksi "Move to In progress / In review / Done" (tanpa status kartu itu sendiri), dan aksi memindahkan tugas.
  - Di mode Select, kartu terbaca terpilih.
  - "Select all" baru muncul setelah Select dinyalakan.
- [ ] **Kontras opsi radial** `[keduanya]`
  - Isian opsi yang dibidik (lime/warning dengan teks gelap) tetap terbaca, terutama In review (warning).
  - Cek di mode terang dan gelap.
- [ ] **Kartu di kolom yang tergulir** `[keduanya]`
  - Multi-select kartu di kolom yang sebagian sudah tergulir keluar layar, lalu tahan.
  - Tumpukan tetap muncul di dalam layar (posisinya dijepit), tidak melompat ke luar.
- [ ] **Just write ✦ ↔ Fill form** `[keduanya]`
  - Di modal New task, pindah mode → tanpa kedipan atau layar kosong.
  - Save di Fill form → tugas baru langsung terbuka.

## Events

- [ ] **Notifikasi di atas modal/sheet** `[iOS]`
  - Di form New event (modal), pasang Reminder lalu Save → "Event saved" tampil **di atas** modal, tidak tertutup.
  - Ulangi Edit event → "Event updated".
  - Cancel event dari sheet → "Event canceled" tampil di atas sheet.
- [ ] **dismissTo setelah Create tasks dan Archive** `[keduanya]`
  - Outcomes Step 3 → Create tasks → hasil terbuka. Back → detail event, Back lagi → daftar Events.
  - Detail → ⋯ → Move to Archive → kembali ke daftar. Daftar dan snack Undo tampil di atas tab bar, tidak tertutup.
- [ ] **Tinggi sheet dan keyboard** `[keduanya]`
  - Filter & sort, Cancel event, dan Move to Archive → tinggi sheet pas dengan isinya (tidak terpotong, tidak menyisakan ruang kosong besar).
  - Cancel event: ketuk kolom Reason → keyboard tidak menutupi kolom maupun tombol.
- [ ] **Agenda di atas keyboard** `[keduanya]`
  - Form New event → ketik di Agenda (multiline) sampai beberapa baris → kolom tetap terlihat di atas keyboard.
- [ ] **VoiceOver/TalkBack di Events** `[keduanya]`
  - Kalender: tiap sel tanggal terbaca "Wed, Oct 7" + jumlah event bila ada ("Thu, Oct 8, 2 events") + status terpilih.
  - Kartu event: satu perhentian per kartu (lihat item "Kartu dan agenda: satu perhentian"); "View results"/"Check results" adalah aksi kartu, bukan tombol terpisah.
  - Outcomes Step 1: tombol Play terbaca dan bisa diaktifkan.
- [ ] **Recording tanpa geser balik** `[iOS]`
  - Di layar Recording, geser dari tepi kiri → layar **tidak** kembali (NO_SWIPE); keluar hanya lewat Stop recording.
  - Timer statis seperti prototipe (bukan bug).

- [ ] **Kartu dan agenda: satu perhentian** `[keduanya]`
  - VoiceOver/TalkBack di kartu event → terbaca sekali dan lengkap: judul, tanggal, jam, tempat, ulangan, tipe, status.
  - Kartu yang punya hasil: rotor Actions (iOS) / menu Actions TalkBack → "Check results" atau "View results" membuka hasil; ketuk dua kali tetap membuka detail event.
  - Baris agenda di tab Calendar juga satu perhentian, dengan isi yang sama.
- [ ] **Form event: wajib, error, Location** `[keduanya]`
  - New event → kolom Title terbaca "Title, required", Date terbaca "Date, required"; label di atasnya (dan bintangnya) tidak dibaca lagi.
  - Isi Title lalu hapus dan tinggalkan kolom → "Enter a title." muncul di bawahnya dan dibacakan; Save tetap nonaktif.
  - Pilih End lebih awal dari Start → pesan merah "The end time must be after the start time." dibacakan; tombol End membawa pesan itu sebagai petunjuk.
  - Location terbaca sebagai grup radio "In person" / "Online" dengan yang terpilih tercentang; Online memunculkan Meeting link.
- [ ] **Calendar: tampilan dan filter** `[keduanya]`
  - Month/Week di tab Calendar terbaca sebagai grup radio "Calendar view", tidak bertumpuk dengan tab List/Calendar di atasnya.
  - Filter & sort yang menyembunyikan semua event bulan itu → "No events match these filters." dengan Reset filters; pencarian tanpa hasil → "No events match this search."
- [ ] **Archive event: jalan ke Cancel** `[keduanya]`
  - Detail → ⋯ → Move to Archive pada event yang belum dibatalkan → kalimat petunjuk dengan tautan Cancel adalah satu perhentian bernama "Cancel this event instead", terpisah dari tombol Cancel (tutup) sheet.
  - Ketuk → sheet Cancel event terbuka.
- [ ] **Outcomes Step 3** `[keduanya]`
  - Tombol tiap draf terbaca bersama judul tugasnya ("Edit <judul>", "Remove <judul>"; Admin "Discard <judul>").
  - Catatan AI terbaca sebagai satu elemen, tanpa "=" di depannya.
  - Ketuk sedikit di kiri/kanan link "View" di baris ringkasan → tetap terbuka (area sentuh ±44 pt, tampilan sama).

## Projects

- [ ] **Baris orang dan filter** `[keduanya]`
  - Tab Projects → ketuk Lea di baris orang → "Lea's projects · 2" dan hanya 2 kartu. Clear → semua kartu kembali.
  - Filter & sort → Active + Name (A–Z) → Apply → urutan Atlas, Legacy Data Migration, PT Sinar, dan titik muncul di ikon filter.
- [ ] **Detail Atlas** `[keduanya]`
  - Overview → ketuk "Overdue: #12 Fix SSO login" → detail tugas #12 terbuka.
  - Ganti tab Overview/Tasks/Phases/Members → berganti di tempat, Back langsung kembali ke daftar (bukan ke tab sebelumnya).
  - Tasks: pindah List ↔ Kanban; Start working di #14 → "Task started"; ikon filter membuka sheet filter tugas proyek.
- [ ] **Members (T2)** `[keduanya]`
  - Ganti role Dodi menjadi Viewer → dialog "Change Dodi's role?" → Change role → "Role changed".
  - Remove Dodi → dialog "Remove Dodi from the project?" → Remove member → "Member removed".
  - Pemilih role dan Remove milik Nico (Lead) nonaktif.
- [ ] **Move to Archive lalu Undo (T1)** `[keduanya]`
  - ⋯ → Move to Archive → kembali ke daftar, Atlas hilang, snack "Project moved to Archive" tampil di atas tab bar.
  - Undo (dalam 10 detik) → Atlas kembali di tempatnya, tugasnya muncul lagi di tab Tasks, dan "Project restored".
- [ ] **Delete forever proyek, lalu Undo** `[keduanya]` (Admin)
  - Move to Archive pada Atlas → buka More › Archive → Delete forever Atlas (ketik namanya) → "Deleted forever".
  - Kembali dan ketuk Undo di snack (bila masih tampil) → "This project was deleted forever and can't be restored.", Atlas tidak kembali.
- [ ] **Project settings** `[keduanya]`
  - ⋯ → Project settings → pengaturan tugas proyek (TasksSettings) terbuka; Back kembali ke detail Atlas.
- [ ] **New project** `[keduanya]`
  - Tombol "+" → tiga tombol Choose dan hanya satu Cancel (chevron bawah).
  - Tell us about the project → Build draft ✦ → hapus centang "1. Planning" → tugasnya tersembunyi → Create project → Atlas terbuka dengan "Project created". Back → daftar Projects.
  - Fill in the form: Create project nonaktif sampai nama diisi; quick pick "1 wk" mengubah End date.
- [ ] **Member tidak bisa mengelola** `[keduanya]` (Member)
  - Detail Atlas tanpa menu ⋯ dan tanpa Extend deadline.
  - Buka /projects/new, /projects/atlas/edit, /extend, /archive (mis. lewat link) → diarahkan ke Beranda.

## More/W3 (Inbox, Team, Users, Archive, Settings, Profil)

- [ ] **Tab Inbox di 375 pt** `[keduanya]`
  - Inbox sebagai Admin/PM → segmen "Needs your response (3)" tampil utuh atau turun ke 2 baris, tidak terpotong "…".
  - Ulangi dengan skala teks sistem lebih besar (lihat Aksesibilitas).
- [ ] **Approve/Reject menurunkan semua hitungan** `[keduanya]` (Admin)
  - Users › Approval → Approve Sari, lalu konfirmasi → kartu Sari hilang dan chip menjadi Pending 1 / Approved 7.
  - Hitungan ikut turun di: chip Awaiting di Home, baris "Approve 1 new user", badge Users di panel More, dan kartu approvals di Inbox.
  - Reject Budi juga → kartu approvals hilang dari Inbox ("Needs your response (2)"), badge Users hilang, dan Approval menampilkan "No one is waiting for approval."
- [ ] **Reject Sari meminta alasan** `[keduanya]` (Admin)
  - Ketuk Reject di kartu Sari → kolom alasan muncul.
  - Kirim kosong → pesan error dan tidak ada dialog.
  - Isi alasan → dialog → kartu hilang.
- [ ] **Mark all as read** `[keduanya]`
  - Inbox › Latest updates → Mark all as read → tombol menjadi nonaktif dan muncul "Everything here is read".
- [ ] **Edit profile kembali ke profil** `[keduanya]`
  - Ketuk avatar/profil → Edit profile → Cancel → modal profil terbuka lagi.
  - Ulangi dengan Save → "Profile saved" lalu kembali ke profil.
  - Kalau Edit profile dibuka dari More › Settings → Cancel/Save kembali ke Settings.
- [ ] **Full name wajib** `[keduanya]`
  - Edit profile → kosongkan Full name → Save → "Enter your full name.", tidak tersimpan, tidak menutup.
- [ ] **Delete forever (T3)** `[keduanya]` (Admin)
  - Archive → Delete forever pada satu item → sheet terbuka.
  - Tombol merah terkunci sampai nama item diketik persis.
  - Keyboard tidak menutupi kolom maupun tombol.
  - Saat proses berjalan: spinner tampil, kolom nama tetap terbaca screen reader (readOnly, bukan tersembunyi), Cancel nonaktif.
  - Selesai → "Deleted forever" dan sheet tertutup.
- [ ] **My calendar: blok event pendek** `[keduanya]`
  - Profil › My calendar, hari 7 Okt → ketuk tepat di atas atau di bawah blok pendek "Daily" (tampak 28 pt) → event tetap terbuka (area sentuh ±44 pt).
  - Area sentuh tidak mengambil ketukan untuk blok di sebelahnya.
- [ ] **Switch di Profile mudah diketuk** `[keduanya]`
  - Profil → Mute notifications dan Show me as online → ketuk Switch tepat di tepi atas/bawahnya → tetap berubah, tidak perlu mengenai tengahnya.
  - Switch adalah kontrol sistem (iOS 51×31 pt, di bawah 44 pt); kalau tepinya sering meleset, catat untuk diperluas dengan wrapper.
- [ ] **My calendar: jam 12 AM** `[keduanya]`
  - Gulir grid ke paling atas → label "12 AM" tampil utuh, tidak terpotong.
- [ ] **My calendar: geser pekan** `[keduanya]`
  - Geser week strip ke kiri/kanan → pindah pekan.
  - Geser pendek dan pelan → kembali ke posisi semula.

## Aksesibilitas

### VoiceOver (iOS) / TalkBack (Android)

- [ ] **Week strip** `[keduanya]`
  - Tiap hari bisa difokus satu per satu, dan terbaca nama hari + tanggal + status terpilih.
  - Aksi "Previous week" / "Next week" di tiap hari memindah pekan. iOS: geser atas/bawah di rotor Actions. Android: menu Actions TalkBack.
- [ ] **Baris Team** `[keduanya]`
  - Satu baris orang terbaca sekali dengan lengkap: nama, role · proyek, status, dan angka "N active" / "N overdue".
  - Baris tugas di halaman orang terbaca: judul, status, proyek · kapan.
- [ ] **Tidak dibaca dua kali** `[keduanya]`
  - Leave → label "From date"/"To date" hanya terbaca sekali, dari tombol tanggalnya.
  - Approval → "Starting role" hanya terbaca sekali, dari pemilihnya.
- [ ] **Nama tombol** `[keduanya]`
  - Tombol Approval terbaca "Approve Sari Wulandari" / "Reject …" / "Cancel rejecting …".
  - Settings (Admin) → "View roles and permissions", tanpa "›".
  - Tab Inbox/Users terbaca sebagai grup "Inbox sections" / "Users sections".
- [ ] **Pesan error diumumkan** `[keduanya]`
  - Error Full name kosong dan alasan Reject kosong dibacakan begitu muncul (live region).

### Reduce Motion

- [ ] Lihat item Tasks "Reduce Motion aktif". `[keduanya]`
- [ ] My calendar: geser pekan tanpa animasi slide; pekan langsung berganti. `[keduanya]`

### Reduce Transparency

- [ ] **Tab bar padat** `[iOS]`
  - Settings › Accessibility › Display & Text Size › Reduce Transparency → tab bar dan panel More menjadi padat, tanpa kaca.
  - Bisa diubah selagi app berjalan; app langsung mengikuti.
  - (Android tidak punya setelan ini.)

### Skala teks

- [ ] **Teks besar** `[keduanya]` (iOS: Larger Text; Android: Font size)
  - Naikkan skala teks sistem → teks tidak bertumpuk atau terpotong di: segmen Inbox, chip Users, baris Team, week strip, dan opsi menu radial.
