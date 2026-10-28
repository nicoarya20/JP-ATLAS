# Fase 2 — Kontrol yang disembunyikan, dan kenapa

Keputusan user (26 Okt 2026, K6): dari 32 GAP yang butuh perubahan server, hanya **5 yang
memblokir** dibangun (kelompok A). Sisanya **27 ditunda**, dan kontrol untuk GAP itu
**disembunyikan — bukan ditampilkan kelabu.**

**Alasan menyembunyikan, bukan menonaktifkan:** tombol nonaktif permanen adalah janji yang belum
tentu ditepati. Ke-27 GAP ini belum diputuskan akan dibangun atau tidak, jadi menampilkannya
sebagai "nanti" adalah klaim yang tidak ada yang menjaminnya. Pengecualian yang sudah ada preseden:
tombol Google di layar masuk **dimatikan dengan alasan tertulis**, karena fiturnya memang ada dan
memang akan datang — bedanya persis itu.

**Fungsi berkas ini:** membuat penghapusan ini jadi **hutang yang disadari**, bukan penghapusan
senyap, dan menjadi masukan untuk keputusan user soal ke-27 GAP. Tanpa daftar ini, enam bulan dari
sekarang tidak ada yang tahu kenapa layar Acara tidak punya pengulangan.

**Asal berkas ini (W2, 28 Okt 2026).** Ditulis ulang dari `2a985b7^:mobile/docs/phase2-gap-disembunyikan.md`.
Fase 2 lama sudah menyembunyikan banyak kontrol, lalu seluruhnya dibatalkan (`2a985b7`) dan mobile
kembali ke prototipe Fase 1. Karena itu **setiap baris di bawah berstatus `rencana`**: layarnya
belum disentuh di cabang ini. Kolom terakhir menyimpan cara Fase 2 lama menanganinya — sebagai
acuan, bukan sebagai keadaan sekarang; path di kolom itu menunjuk berkas yang tidak ada lagi.
Baris-barisnya **belum diverifikasi ulang** terhadap server sekarang; yang menyembunyikan sebuah
kontrol wajib memeriksa GAP-nya masih benar dulu.

**Aturan untuk W3:** berkas ini **ditambahi baris**, bukan diganti dan bukan dipecah jadi berkas
per modul. Saat kamu menyembunyikan sesuatu, ubah Status barisnya di commit yang sama:
`rencana` = belum disentuh; `disembunyikan` / `diganti` / `dihapus` = sudah dikerjakan, dengan path
layarnya di kolom Status.

Id GAP merujuk peta `phase2-map-*.md`, yang belum dibawa ke cabang ini; baca dari
`git show 2a985b7^:mobile/docs/phase2-map-<modul>.md`.

---

## 1. Tugas (Tasks) — peta: `phase2-map-tasks.md` §2a

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status | Penanganan di Fase 2 lama (`2a985b7^`, dibatalkan) |
|---|---|---|---|---|---|
| Pengerja kedua dan seterusnya: `also[]`, label "+N", fact Assignee berisi daftar | kartu, board, detail, Edit, Fill form | A1 | Server hanya punya `assignee_id` tunggal; butuh tabel penugasan banyak-ke-banyak. Web pun belum punya | rencana | **disembunyikan** di kartu daftar (`src/data/tasks.api.map.ts` `cardOf`: satu orang, `whoLabel` tanpa "+N"); detail/Edit/form belum disentuh |
| Tag: kotak cari tag, fact Tag, `TagsEdit`, daftar tag di Project settings | daftar, detail, Edit, Fill form, Project settings | A2 | `tags` ditolak `t.Never()` → 422. Kelas "Could" yang sengaja ditutup | rencana | — |
| Evidence / lampiran: "Evidence n", "+ Attach evidence" | detail (progress/review), Edit | A5 | Tidak ada lampiran di DTO maupun skema; butuh tabel + unggah lewat `storage()` | rencana | — |
| Seluruh alur review: Request review, Approve, Return, banner `asked`, switch Needs review, ganti reviewer, grup "Waiting for my review" | detail, Return sheet, Edit, daftar | A6, A13 | Policy-nya lengkap tapi **rutenya belum ada**, dan `TASK_REVIEW_UI_ENABLED = false` di server. Ini S4 | rencana | **disembunyikan** untuk grup "Waiting for my review" di My tasks (`src/data/tasks.api.view.ts` `taskListSpecs` tidak memintanya); detail dan Return sheet belum disentuh, masih data contoh |
| Estimated hours | Fill form | A9 | `estimateHours` ditolak `t.Never()` → 422 | rencana | — |
| Impor CSV seluruhnya (unggah/tempel, pratinjau per baris, ringkasan, Import) | `tasks/csv.tsx` | A10 | Tidak ada endpoint impor di `/api/app` sama sekali | rencana | — |
| Project settings yang bisa ditulis: switch "New tasks need review", kelola jenis tugas, Rename/Merge/Delete tag | Project settings | A11 | `manageKinds` dikirim sebagai cap tapi tanpa route | rencana | — |
| Sort "Title (A–Z)" | Filter & sort | A16 | `TASK_SORTS` tidak punya judul. Mengurutkan di klien **salah** begitu ada paginasi — yang terurut hanya halaman yang sudah dimuat | rencana | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx` (`SERVER_SORTS`), hanya di tab Tugas; tab proyek masih menyaring di memori jadi tetap menawarkannya |
| Cari tag dan **awalan** nomor ("#1" menemukan #12) | kotak cari daftar + board | A15 | `q` server = judul atau nomor **persis**. Awalan dan tag tidak didukung | rencana | **disembunyikan** — placeholder tab Tugas jadi "Search title or exact #number…" (`tasks.strings.ts` `searchServer`); tab proyek tetap mencari di memori dengan placeholder lama |
| Draf "AI" dari teks bebas (Just write) | `tasks/new` | B13 | Endpoint `POST /tasks/draft` **ada**; yang belum diputuskan adalah apakah mobile memakainya di Fase 2 (kelompok B) | rencana | — |
| **Filter Project** di tab Tugas (baris Project + "All projects") | Filter & sort tab Tugas | **G1-T1** (baru) | Daftar proyek masih data contoh (`projects.state`, sampai modul Proyek pindah ke API) dan id-nya **bukan** id server. Mengirim `projectId=<id contoh>` berarti daftar yang kosong tanpa sebab yang terlihat pengguna — lebih buruk daripada tidak ada filternya. Server **punya** `projectId`; yang kurang hanya daftar proyek dari API | rencana | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx`; tab proyek memakai Assignee seperti sebelumnya. Hidup lagi begitu modul Proyek memakai `/api/app/projects` |
| `kind`/Type di baris kartu All tasks (segmen `· type ·`) | daftar All tasks, `cardName` | A3 | `TaskListItem` tidak punya `kind`; hanya detail punya | rencana | **disembunyikan** `src/screens/tasks/list/all-card.tsx` — segmennya dihilangkan, bukan dirender kosong |
| Alasan **kenapa** sebuah kontrol disabled (`capMessage`) | semua kontrol ber-`can{}` | **G1-T2** (baru) | `can{}` hanya membawa kode deny; kalimatnya hidup di `server/access/decision.ts` yang hanya bisa diimpor web. Menulis salinan Inggris per kode di mobile = sumber kalimat kedua, dilarang K5 | rencana | **digantikan** satu baris jujur milik mobile sendiri (`CAP_DISABLED_REASON`, "Not available for this task."). Butuh keputusan: kirim `capMessage` di DTO, atau terima satu baris umum |
| Segmen `· type ·` di baris kartu **board** All tasks | board | A3 | Sama seperti kartu daftar: `TaskListItem` tidak punya `kind`. Baris kartu board menampilkan proyeknya saat tidak ada jenis, bukan pemisah yang menggantung | rencana | **disembunyikan** `src/screens/tasks/board/board-cards.ts` (`cardPlace`) |
| Sisi **In review** di menu radial board | board | A6 | Langkah ke In review adalah `requestReview`, yang rutenya 404 sampai S4. Sisinya digambar mati, bukan dicoba lalu ditolak `409` | rencana | **disembunyikan** `src/data/tasks.api.board.ts` (`movableTo` hanya menawarkan sisi yang `can{}`-nya ada) |
| **Edit task** di menu ⋯ detail tugas | detail | **G2-T1** (baru) | Detail sudah membaca server, sementara form Edit masih **menulis** ke store contoh (langkah 8 `phase2-map-tasks.md` §6, butuh A12 dipakai). Dari detail ber-data server, Edit adalah form yang tidak bisa menyimpan apa yang ditampilkan layar di atasnya. Layarnya tetap ada di pohon rute dan tetap diuji di `tasks.screen.form.test.tsx` | rencana | **disembunyikan** `src/screens/tasks/detail/task-detail.screen.tsx` (`MENU` tidak punya entri `edit`) |
| **"+ Add step"** di bagian Steps detail | detail | **G2-T2** (baru) | Tulis checklist sudah tersambung (tombol centang menulis ke server), tapi *menambah* langkah butuh kolom isian yang gelombang ini tidak membangun. Tombol yang melaporkan langkah yang tidak pernah ia tambahkan lebih buruk daripada tidak ada | rencana | **disembunyikan** `src/screens/tasks/detail/detail-steps.tsx` |
| Tombol **Return** dan kotak **Evidence** di detail | detail | A6, A5 | Rute `return` 404 sampai S4; tidak ada lampiran di DTO maupun skema. Layar Return sendiri masih ada di pohon rute dan masih data contoh | rencana | **disembunyikan** `src/screens/tasks/detail/detail-actions.tsx`, `detail-facts.tsx` (berkas `detail-evidence.tsx` dihapus) |

## 2. Acara (Events) — peta: `phase2-map-events.md` §2.1

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status | Penanganan di Fase 2 lama (`2a985b7^`, dibatalkan) |
|---|---|---|---|---|---|
| Pengulangan: badge **Repeat** di kartu, pill **Repeats** di detail, kemunculan berulang di kalender, pilihan repeat di form | daftar, detail, kalender, form | A4 | `recurrence` ditolak 422 (`t.Never()`), tidak ada kolom seri di tabel `event`. Kelas "Could" (E-16) | rencana | — |
| Batal / arsip **satu kemunculan** ("hanya kemunculan ini") dan varian sheet `-recurring` | Cancel sheet, Archive sheet | A5 | Bergantung A4; route cancel tidak punya `scope: 'occurrence'｜'series'` | rencana | — |
| Peran **Note-taker** di daftar hadir | detail, form | A6 | `event_participant` tidak punya kolom peran; `PersonRef` sengaja hanya `{id,name}` | rencana | — |
| Kaki "Updated \<tanggal\> · by \<nama\>" | detail | A7 | `EventDetail` punya `updatedAt` tapi tidak `updatedBy` | rencana | — |
| Seluruh alur Rekaman → Outcomes → Results: transkrip, draf tugas, keputusan, open question, sumber, "confirmed by" | Events ⑤–⑨ | A8 | Tidak ada tabel outcomes/draf, `outcomes` ditolak `t.Never()`. Kelas "Could" (E-13) | rencana | — |
| Cari berdasarkan **lokasi** | kotak cari daftar | A10 | `q` server hanya judul. Menyaring di klien hanya benar untuk halaman yang sudah dimuat | rencana | — |

**Catatan:** filter rentang tanggal kalender (A9) **tidak** disembunyikan — K6 memasukkannya ke
kelompok A yang dibangun. Begitu juga opsi form tugas (Tasks A12), rute hapus permanen Sampah
(Home/Inbox/Team A-24), dan `caps.createProject` (Projects A-17).

### 2a. Catatan Acara dari Fase 2 lama

Fase 2 lama menghapus 12 kontrol Acara (daftar per berkas: `2a985b7^:mobile/docs/phase2-gap-disembunyikan.md`
§2a). Yang tetap berlaku untuk W3, karena sumbernya kontrak server, bukan kode yang dibatalkan:

- **Layar ⑤–⑨ (Record, Recording, Outcomes, Results) tidak punya padanan server** (A8). Begitu
  modul Acara membaca server, tautan ke layar itu dicabut dari kartu dan detail; menghapus rutenya
  sendiri menyentuh `mobile/app/**` dan butuh izin koordinator.
- **Notulensi bisa dibaca, tidak bisa ditulis** dari layar yang ada: `noteStatus` dan `note.body`
  datang dari server, `PUT /events/:id/note` **ada** dan bukan GAP, tapi menulisnya butuh layar
  editor notulensi tersendiri — yang ada di prototipe adalah wizard Outcomes (A8).
- **Reminder bisa dibaca, tidak bisa diubah** (B7): detail menampilkan `remindersMinutes`; form
  memakai bawaan server dan tidak menjanjikan pemilih yang tidak ada.
- **Status `Done` bergranularitas hari** untuk pembacaan tanpa tab (kalender, detail): jam mobile
  membawa `today`, bukan instan `now`, jadi acara yang berakhir tadi pagi masih terbaca "Today".
  Untuk daftar, tab server yang memutuskan.

## 3. Proyek, Beranda, Inbox, Tim, Profil

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status | Penanganan di Fase 2 lama (`2a985b7^`, dibatalkan) |
|---|---|---|---|---|---|
| Alur **Story → Draft** dan **Template** proyek, termasuk "Also save as template" | `projects/new` story/draft/template | Projects A-16 | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel template. Fase 2 hanya memakai jalur **Form** | rencana | **masih sampel** (`src/data/projects.sample-form.ts`: ketiga langkah itu dipisahkan ke berkasnya sendiri, supaya satu baris impor menandai layar yang belum bicara ke server; jalur Form sudah server) |
| Filter "proyek milik siapa" (people row, chip My projects) | Projects filter | Projects A-2 | Daftar hanya punya `scope=mine｜all`; menyaring di klien salah pada halaman kedua | rencana | **disembunyikan** (`src/screens/projects/list/projects.screen.tsx`, `src/data/projects.people.ts` dihapus; param `who` dicabut) |
| Filter Health per tingkat (`On track` / `At risk` / `Off track` terpisah) | Projects filter | Projects A-3 | Server hanya punya `perhatian=1` yang menggabung dua tingkat | rencana | **diganti** (`src/data/projects.query.ts`: satu opsi "Needs attention" dengan nama itu, bukan tiga yang dikarang) |
| Sort "Lowest progress" | Projects filter | Projects A-4 | `PROJECT_SORTS` tidak punya progress; progress dihitung, bukan kolom | rencana | **diganti** (`src/data/projects.api.values.ts`: "Recently updated" (`sort=recent`) menggantikannya, menutup B-10 sekaligus) |
| Cari pada **deskripsi** proyek | Projects daftar | Projects A-6 | `q` server hanya nama; `description` hanya ada di detail. Placeholder perlu diubah jadi "Search project name…" | rencana | **disembunyikan** (`src/screens/projects/projects.strings.ts`: placeholder sudah "Search project name…", menjanjikan yang dicari saja) |
| Persen fase berjalan ("Now: Development · 60%") | Project detail plan | Projects A-11 | Server tidak punya "persen fase". Angkanya akan berubah dari sampel, jadi perlu keputusan | rencana | — |
| Kartu Inbox "Meeting outcomes need your confirmation" + lead AI | Inbox | Home A-14 | Tidak ada `kind` seperti itu di katalog notifikasi | rencana | **disembunyikan** (`src/data/inbox.ts`: tidak ada lagi lead `ai`; satu kartu = satu kartu server) |
| `why` (alasan Admin jadi reviewer) di kartu review | Inbox | Home A-15 | Kartu review masih `shipped: false`; ikut S4 | rencana | **disembunyikan** (`src/data/inbox.ts`, `src/screens/inbox/inbox-card.tsx`: bidang `why` dicabut) |
| Kartu Approvals agregat ("2 new users awaiting approval") + tumpukan avatar | Inbox | Home A-13 | Server mengirim **satu kartu per akun**. Merangkumnya di klien berarti menulis kalimat kedua di samping `sentence` server — dua sumber kalimat yang pasti melenceng (K5) | rencana | **disembunyikan** (`src/data/inbox.ts`, `inbox-card.tsx`: `AvatarStack` tidak dipakai lagi di Inbox) |
| Chip **In Progress** dan sub-barisnya `next due` | Beranda | Home A-4 | `counters.inProgress` dihitung atas **proyek yang saya kelola**, bukan tugas saya, dan `nextDue` tidak ada di payload mana pun | **disembunyikan** (`src/data/home.stats.ts`; kembali lewat `tasks/counts` di gelombang Tugas) | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.types.ts`: `StatKey` tinggal dua) |
| Chip **Completed · this week** | Beranda | Home A-5 | `done.total` menghitung seluruh proyek saya, bukan tugas saya; `tasks/counts` tidak punya batas minggu | **diganti** (`src/data/home.stats.ts`: tampil dengan arti server, sub-baris "this week · my projects" — keputusan koordinator H-3, 28 Okt) | **disembunyikan** (sama) |
| Chip **Upcoming · N items** | Beranda | Home A-6 | "Sisa bulan ini" tidak ada definisinya di server; menjumlahkan tugas + acara di klien adalah angka karangan | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Active · projects** | Beranda | Home A-7 | `counters` tidak memfilter status proyek | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Overdue · tasks** (se-workspace) | Beranda | Home A-8 | Beranda sengaja berlingkup "proyek saya" (`home.scope.ts`); angka se-workspace tidak ada | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Awaiting · users** dan baris "Approve N new users" di My Focus | Beranda | Home A-9 | Server mengirimnya sebagai kartu Inbox `user_pending`; tidak ada hitungan terpisah | **disembunyikan** (`src/data/home.stats.ts`, `src/screens/home/sections/focus.section.tsx`) | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.focus.ts`, `src/screens/home/sections/focus.section.tsx`) |
| Teks lokasi acara ("Meeting Room 2") di kartu agenda | Beranda | Home A-10 | `HomeAgendaItem` hanya punya `locationType`; lokasinya tidak di kabel | **disembunyikan** (`src/data/home.types.ts`: `AgendaEvent` tanpa `place`) | **disembunyikan** (`src/data/home.types.ts`: `AgendaEvent.place` dicabut) |
| **Lead** proyek di baris agenda ("Lead Nico · Due Oct 31") | Beranda | Home A-11 | `HomeProject` tidak punya lead | **disembunyikan** (`src/screens/home/sections/agenda.section.tsx`) | **disembunyikan** (`src/data/home.focus.ts`, `src/screens/home/sections/agenda.section.tsx`) |
| Pil **status siklus hidup** proyek ("Active"/"Done") di baris agenda | Beranda | Home A-12 | Payload home mengirim `condition` + `reason` (kesehatan), bukan status. Diganti pil `condition` + alasannya, bukan dihilangkan | **diganti** (`src/screens/home/parts/condition-pill.tsx` + `reason` server di barisnya sendiri) | **diganti** (`src/screens/home/parts/condition-pill.tsx`) |
| Kolom tanya bebas Ask Data ("Type or say a question…") + tombol **Ask** | Beranda | — (bukan GAP yang ditunda: `server/home/home.ask.ts` memang hanya menjawab 3 pertanyaan tetap, tanpa LLM) | Kolom yang tampak bisa ditanyai apa saja adalah janji yang tidak ada yang menepati | **disembunyikan** (`src/screens/home/sections/ask.section.tsx`) | **disembunyikan** (`src/screens/home/sections/ask.section.tsx`: tiga pil pertanyaan + jawabannya) |
| **Aksi per baris** di tab Tugas proyek ("Start working", "Request review", "Review", "View" untuk Member) | Project detail tab Tugas | — (bukan GAP server: `can` dan `primary` **ada** di baris) | Tulisannya milik modul Tugas dan belum tersambung ke layar ini, dan detail tugas yang didarati masih sampel. Tombol yang melaporkan kerja yang tidak dilakukannya lebih buruk daripada tidak ada tombol | rencana | **disembunyikan** (`src/screens/projects/detail/task-card.tsx`, `tasks.tab.tsx`: kartu membuka tugas) |
| Sakelar **List / Kanban** di tab Tugas proyek | Project detail tab Tugas | — (bukan GAP server) | `TaskBoard` memindahkan kartu lewat store sampel (`useMoveMenu`), jadi papan berisi baris server akan menelan setiap geseran tanpa jejak. Menunggu tulisan server modul Tugas | rencana | **disembunyikan** (`src/screens/projects/detail/tasks.tab.tsx`: hanya daftar) |
| **Project settings** di menu ⋯ | Project detail | Projects A-12 | `can.manageKinds` ada, tetapi tidak ada rute `/api/app` untuk task kind sama sekali, jadi layar di belakangnya hanya bisa menampilkan sampel | rencana | **disembunyikan** (`src/screens/projects/detail/detail-header.tsx`: `projectMenu` tinggal Edit + Move to Archive; rutenya masih terdaftar tapi tanpa pintu masuk) |
| Cek **nama proyek ganda** ("A project with this name already exists.") | Project Edit, Form | — (bukan GAP server: aturannya memang tidak ada) | `project.name` tidak punya unique constraint (`server/db/schema.project.ts`) dan tugas menunjuk `projectId`, jadi dua proyek boleh senama. Aturannya akan menolak nama yang server terima | rencana | **dihapus** (`src/screens/projects/edit/project-edit.screen.tsx`; alasan Save mati kini "Change something first.") |
| **"Impact of change"** di sheet Extend deadline | Project Extend | Projects A-10 | Tidak ada endpoint pratinjau; versi klien (menghitung tugas di halaman yang kebetulan dimuat) benar untuk sepotong dan terbaca sebagai total | rencana | **disembunyikan** (`src/screens/projects/sheets/extend.screen.tsx`) |
| Opsi alasan kelima **"Estimate was off"** di Extend deadline | Project Extend | — (bukan GAP server) | Server menyimpan **empat** kategori (`WireExtensionReason`); opsi kelima akan dicatat sebagai salah satu dari empat itu. Kata-katanya kini diambil dari `EXTENSION_REASONS`, yaitu enum-nya sendiri | rencana | **dihapus** (`src/screens/projects/sheets/extend.screen.tsx`, `projects.strings.ts`: `EXTEND.reasons` dicabut) |
| **"+ Phase"** dan **"+ Milestone"** | Project detail tab Fase | — (bukan GAP server: rutenya ada) | Kedua rute ada, tetapi belum ada formulirnya di sisi ini; digambar sebagai tombol yang hanya berkata "nanti" adalah janji yang belum ditepati | rencana | **disembunyikan** (`src/screens/projects/detail/phases.tab.tsx`) |
| **"+ Member"** di form New project | `projects/new/form` | Projects B-11 | Tombolnya memilih dari daftar yang sudah ditampilkan seluruhnya; memilih orang **di luar** picker butuh pencarian yang rutenya tidak punya | rencana | **disembunyikan** (`src/screens/projects/new/form-members.tsx`) |
| Pilihan lingkup **"Semua / Punya saya"** (`scope=all`) di daftar proyek | Projects daftar | Projects **B-17** | Bukan GAP yang ditunda: parameternya **sudah ada dan jalan** (`server/api/app-projects.ts`), clamp Member di `access/project.policy.ts`. Ini kapabilitas server yang mobile belum ambil, seperti `sort=recent` (B-10). Daftar selalu mengirim `scope=mine` | rencana | **belum diambil** (`src/data/projects.ts` `listParams`) |
| Jumlah **anggota** di kartu daftar proyek ("4 members") | Projects daftar | — (bukan GAP yang ditunda) | `ProjectListItem` tidak membawa daftar anggota; barisnya tentang proyek, bukan orangnya. Nama terbaca kartu kini berhenti di "Due …" | rencana | **dihapus** (`src/screens/projects/list/project-card.tsx`) |
| Catatan gelembung di Profil (`note`) | Profil | Home A-21 | Tidak ada kolom maupun bidang di `ProfileView` | rencana | **disembunyikan** (`src/screens/profile/profile-hero.tsx`; `profile-note.tsx` + `src/data/profile.store.ts` dihapus — catatan yang hanya hidup di satu ponsel bukan catatan profil) |
| Presence **Online/Offline** dan klaim "Teammates see you as Online" | Profil | Home A-22 | Tidak ada presence di server. Menampilkannya sebagai lokal = klaim palsu | rencana | **disembunyikan** (`src/screens/profile/profile.screen.tsx`, `profile-hero.tsx`: titik presence, switch "Show me as online" dan barisnya dicabut) |
| Satu switch "Mute notifications" | Profil | Home A-23 | Server punya **dua** switch dan kartu `action` tidak bisa dibisukan; satu switch akan bohong | rencana | **diganti** (`src/screens/profile/profile.screen.tsx`: dua switch `eventReminder`/`inboxNews` dari `GET/PUT /api/app/profile/notifications`, plus catatan bahwa kartu yang butuh jawaban selalu datang) |
| Baris fakta "Account role" untuk non-Admin | Tim person | Home A-19 | Server sengaja tidak mengirimnya (privasi) → sembunyikan saat kuncinya absen | rencana | **disembunyikan** (`src/data/team.person.ts`: barisnya hanya dibuat kalau kunci `accountRole` ada) |
| Pil hijau **"Available"** di baris Tim dan di Tim person | Tim | **G2-TPA1 (baru)** | `availability: null` berarti "tidak ada yang perlu ditampilkan", **bukan** "sedang ada" (`server/team/team.dto.ts`), dan catatan cuti Admin sengaja tidak dikirim (P14 D6). Mengarang "Available" dari kunci kosong = app ini menyatakan hal yang server menolak menyatakannya | rencana | **disembunyikan** (`src/data/team.ts` `availabilityText()`, `src/screens/team/person-row.tsx`: cuti tampil muted, selain itu baris statusnya tidak ada) |
| Pemilih **All projects** di daftar Tim | Tim | **G2-TPA2 (baru)** | `?projectId=` ada di server, tapi daftar proyek mobile masih data contoh dan id-nya bukan id server → daftar kosong tanpa sebab yang terlihat. Sama dengan G1-T1 di tab Tugas; hidup lagi begitu modul Proyek memakai `/api/app/projects` | rencana | **disembunyikan** (`src/screens/team/team.screen.tsx`: pemilihnya dicabut; pemilih Sort yang dulu dekoratif justru **diaktifkan** jadi `?sort=`) |
| Jumlah **active/overdue** di baris ringkasan Tim setelah "Load more" | Tim | **G2-TPA3 (baru)** | `summary.active/overdue` menjumlahkan **satu halaman**, bukan seluruh tim (`server/team/team.dto.ts`). Setelah halaman kedua, angka yang ada hanya menggambarkan halaman terakhir | rencana | **disembunyikan sebagian** (`src/data/team.ts` `summaryLine()`: dua angka itu hanya tampil kalau satu halaman = seluruh tim) |
| Daftar **nama proyek** yang tidak dibagi di Tim person (`tasks.hidden`) | Tim person | Home A-17 | Nama proyek sengaja tidak dikirim (privasi D10); hanya `alsoElsewhere` yang datang | rencana | **diganti** (`src/data/team.person.ts` `elsewhere`: kalimat tanpa nama proyek) |
| Garis merah **"now"** di grid jam My calendar | Profil kalender | **G2-TPA4 (baru)** | `SessionClock` hanya membawa **tanggal** dan zona, tidak ada instan; garisnya dulu dipatok 9:41 data contoh. Garis di menit karangan dibaca sebagai jam sekarang — lebih buruk daripada tidak ada garis. Butuh `now` di fondasi jam (lihat serah-terima §5) | rencana | **disembunyikan** (`src/screens/profile/day-grid.tsx`, `src/data/profile.calendar.dates.ts`: `NOW_MIN` dan `clock()` dihapus) |
| **Pengulangan** acara di My calendar ("every N weeks") | Profil kalender | Events (kelompok B, K6) | Recurrence ditunda di server, jadi klien tidak punya apa pun untuk dikembangkan; `repeatDays()`/`occursOn()` yang mengembangkannya sendiri jadi kode mati | rencana | **disembunyikan** (`src/data/profile.calendar.dates.ts`: sebuah acara jatuh di harinya sendiri dan tidak di hari lain) |
| Bidang `textSize` dari `/api/app/profile` | Profil | B-18 (belum dipakai, bukan ditunda) | Skala teks pengguna di app ini dipegang cookie `mk-text-size`-nya sendiri; menyelaraskan keduanya adalah pekerjaan tersendiri | rencana | belum dipakai (`src/data/profile.api.ts`: ada di tipe kabel, tidak dibaca) |
| **Hapus akun** (`GET /api/app/profile/delete-check`) | Profil | B-19 (belum ada layarnya) | Mobile tidak punya layar hapus akun di Fase 1, jadi tidak ada kontrol yang disembunyikan — hanya endpoint yang belum dipakai | rencana | belum dipakai |
| **Change photo** (`POST/DELETE /api/app/avatar`) | Profil | B-19 | Endpoint sudah ada, UI-nya belum pernah ada di layar Profil mobile (hanya disebut di peta) | rencana | belum dipakai |
| Chip **Inbox** di Beranda | Beranda | — (bukan GAP server: `GET /api/app/inbox/count` ada) | Hitungannya milik modul Inbox, yang disambung terpisah (W3 Inbox). Menampilkan hitungan kartu sampel di samping data server = dua sumber | **disembunyikan** (`src/data/home.ts`: `homeStats(…, null)`; disambung satu baris begitu `inboxCountResource` ada) | — |
| Nama sapaan dari aturan server (nickname, `greetingName`) | Beranda | Home H-0 | `server/profile/profile.greeting.ts` tidak dikirim di `/home` | **diganti** (`src/data/home.ts` `me()`: kata pertama nama akun dari sesi, bukan baris sampel) | — |
| Status tugas di sub-baris My Focus untuk baris tanpa tombol ("· In review") | Beranda | — | `HomeFocusTask` tidak membawa `status`; tombolnya datang dari `action` server, jadi baris tanpa tombol cukup tanpa tombol | **disembunyikan** (`src/screens/home/sections/focus.row.tsx`) | — |
| Angka `counters` (`unassigned`, `inProgress`, `completed` atas proyek yang saya kelola) | Beranda | Home H-6 | Arti server ("proyek yang saya kelola") tidak cocok dengan chip prototipe mana pun, dan Beranda tidak tahu role untuk memilih siapa yang melihatnya (tanpa `whoami`) | **belum dipakai** (`src/data/home.api.ts`: ada di tipe kabel, tidak dibaca) | — |

---

## 4. Hutang yang bukan GAP server

### 4.1 Parameter `role` masih dioper ke seluruh modul data

**Keadaan:** setiap `get<Module>()` menerima `role: Role`, dan 38 berkas di `src/screens/` mengimpor
`SESSION_ROLE` (konstanta `'pm'` dari `src/data/session.ts`) sebagai nilai bawaannya. `viewer()`
(`src/data/viewer.ts`) juga menerimanya, jatuh ke `SESSION_ROLE`.

**Kenapa tetap hutang:** `SESSION_ROLE` adalah `'pm'` mati. Seorang Member yang login akan dilayani
sebagai Project Manager oleh seluruh lapisan data sampai peran sungguhan tersedia.

**Kenapa belum dicabut:** W2 tidak menyentuh layar, dan sumber perannya belum ada:
- payload `/api/auth/get-session` tidak membawa peran (lihat `SessionUser`), dan
- `AppCaps` + `caps.createProject` di `/api/app` — disetujui K6 kelompok A, belum dibangun.

Begitu salah satunya ada, `viewer()` mengisi `role` dari situ dan parameternya bisa dicabut dari
`src/data/` dan dari berkas layar dalam satu PR tersendiri. Di Fase 2 lama, modul yang sudah membaca
server (Beranda, Inbox, tab Tugas) melepas `role` lebih dulu karena izin datang dari `can{}`/`caps`
server — pola yang layak diulang di W3.

### 4.2 `moveOnBoard()` masih menerima `PersonInfo` dari layar

`src/data/tasks.store.ts` `moveOnBoard(viewer: PersonInfo, …)` menerima orang dari layar. Layar
seharusnya tidak perlu mengoper orang sama sekali: begitu papan Tugas membaca server, sisi mana yang
boleh adalah jawaban `can{}` kartu itu, dan fungsi ini pergi bersama `tasks.store.ts`.

### 4.3 `resource()` tidak bisa memuat halaman berikutnya

`src/data/resource.ts` menyimpan **satu** nilai dan `load` tidak menerima argumen. Daftar ber-cursor
(Inbox `?lane=…`, Tim, Tugas) karenanya hanya bisa memuat halaman pertama. Fase 2 lama menuliskan
batas itu di layar ("Only the newest cards/updates are loaded.") ketika `nextCursor` masih ada,
alih-alih diam-diam berhenti — **jangan** menghitung total dari halaman yang kebetulan dimuat.
Menambah paginasi mengubah kontrak fondasi bersama; keputusannya milik koordinator, bukan satu
modul sendirian.
