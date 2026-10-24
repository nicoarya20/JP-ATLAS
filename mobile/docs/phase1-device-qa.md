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

(diisi Sesi A)

## Home

(diisi Sesi A)

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

(diisi Sesi B)

## Projects

(diisi Sesi C)

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
