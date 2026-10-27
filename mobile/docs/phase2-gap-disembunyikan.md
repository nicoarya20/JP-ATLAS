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

**Aturan untuk Gelombang 1:** berkas ini **ditambahi baris**, bukan diganti dan bukan dipecah jadi
berkas per modul. Saat kamu menyembunyikan sesuatu, tulis barisnya di sini di commit yang sama.
Kolom **Status** dipakai: `rencana` = Gelombang 0 menandainya, layarnya belum disentuh;
`disembunyikan` = sudah dikerjakan, dengan path layarnya.

Gelombang 0 **tidak menyentuh satu layar pun** (selain enam baris jam — lihat serah-terima), jadi
setiap baris di bawah berstatus `rencana`. Id GAP merujuk tabel di `phase2-map-*.md`.

---

## 1. Tugas (Tasks) — `phase2-map-tasks.md` §2a

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status |
|---|---|---|---|---|
| Pengerja kedua dan seterusnya: `also[]`, label "+N", fact Assignee berisi daftar | kartu, board, detail, Edit, Fill form | A1 | Server hanya punya `assignee_id` tunggal; butuh tabel penugasan banyak-ke-banyak. Web pun belum punya | **disembunyikan** di kartu daftar (`src/data/tasks.api.map.ts` `cardOf`: satu orang, `whoLabel` tanpa "+N"); detail/Edit/form belum disentuh |
| Tag: kotak cari tag, fact Tag, `TagsEdit`, daftar tag di Project settings | daftar, detail, Edit, Fill form, Project settings | A2 | `tags` ditolak `t.Never()` → 422. Kelas "Could" yang sengaja ditutup | rencana |
| Evidence / lampiran: "Evidence n", "+ Attach evidence" | detail (progress/review), Edit | A5 | Tidak ada lampiran di DTO maupun skema; butuh tabel + unggah lewat `storage()` | rencana |
| Seluruh alur review: Request review, Approve, Return, banner `asked`, switch Needs review, ganti reviewer, grup "Waiting for my review" | detail, Return sheet, Edit, daftar | A6, A13 | Policy-nya lengkap tapi **rutenya belum ada**, dan `TASK_REVIEW_UI_ENABLED = false` di server. Ini S4 | **disembunyikan** untuk grup "Waiting for my review" di My tasks (`src/data/tasks.api.view.ts` `taskListSpecs` tidak memintanya); detail dan Return sheet belum disentuh, masih data contoh |
| Estimated hours | Fill form | A9 | `estimateHours` ditolak `t.Never()` → 422 | rencana |
| Impor CSV seluruhnya (unggah/tempel, pratinjau per baris, ringkasan, Import) | `tasks/csv.tsx` | A10 | Tidak ada endpoint impor di `/api/app` sama sekali | rencana |
| Project settings yang bisa ditulis: switch "New tasks need review", kelola jenis tugas, Rename/Merge/Delete tag | Project settings | A11 | `manageKinds` dikirim sebagai cap tapi tanpa route | rencana |
| Sort "Title (A–Z)" | Filter & sort | A16 | `TASK_SORTS` tidak punya judul. Mengurutkan di klien **salah** begitu ada paginasi — yang terurut hanya halaman yang sudah dimuat | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx` (`SERVER_SORTS`), hanya di tab Tugas; tab proyek masih menyaring di memori jadi tetap menawarkannya |
| Cari tag dan **awalan** nomor ("#1" menemukan #12) | kotak cari daftar + board | A15 | `q` server = judul atau nomor **persis**. Awalan dan tag tidak didukung | **disembunyikan** — placeholder tab Tugas jadi "Search title or exact #number…" (`tasks.strings.ts` `searchServer`); tab proyek tetap mencari di memori dengan placeholder lama |
| Draf "AI" dari teks bebas (Just write) | `tasks/new` | B13 | Endpoint `POST /tasks/draft` **ada**; yang belum diputuskan adalah apakah mobile memakainya di Fase 2 (kelompok B) | rencana |
| **Filter Project** di tab Tugas (baris Project + "All projects") | Filter & sort tab Tugas | **G1-T1** (baru) | Daftar proyek masih data contoh (`projects.state`, milik Gelombang 2) dan id-nya **bukan** id server. Mengirim `projectId=<id contoh>` berarti daftar yang kosong tanpa sebab yang terlihat pengguna — lebih buruk daripada tidak ada filternya. Server **punya** `projectId`; yang kurang hanya daftar proyek dari API | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx`; tab proyek memakai Assignee seperti sebelumnya. Hidup lagi begitu modul Proyek memakai `/api/app/projects` |
| `kind`/Type di baris kartu All tasks (segmen `· type ·`) | daftar All tasks, `cardName` | A3 | `TaskListItem` tidak punya `kind`; hanya detail punya | **disembunyikan** `src/screens/tasks/list/all-card.tsx` — segmennya dihilangkan, bukan dirender kosong |
| Alasan **kenapa** sebuah kontrol disabled (`capMessage`) | semua kontrol ber-`can{}` | **G1-T2** (baru) | `can{}` hanya membawa kode deny; kalimatnya hidup di `server/access/decision.ts` yang hanya bisa diimpor web. Menulis salinan Inggris per kode di mobile = sumber kalimat kedua, dilarang K5 | **digantikan** satu baris jujur milik mobile sendiri (`CAP_DISABLED_REASON`, "Not available for this task."). Butuh keputusan: kirim `capMessage` di DTO, atau terima satu baris umum |
| Segmen `· type ·` di baris kartu **board** All tasks | board | A3 | Sama seperti kartu daftar: `TaskListItem` tidak punya `kind`. Baris kartu board menampilkan proyeknya saat tidak ada jenis, bukan pemisah yang menggantung | **disembunyikan** `src/screens/tasks/board/board-cards.ts` (`cardPlace`) |
| Sisi **In review** di menu radial board | board | A6 | Langkah ke In review adalah `requestReview`, yang rutenya 404 sampai S4. Sisinya digambar mati, bukan dicoba lalu ditolak `409` | **disembunyikan** `src/data/tasks.api.board.ts` (`movableTo` hanya menawarkan sisi yang `can{}`-nya ada) |
| **Edit task** di menu ⋯ detail tugas | detail | **G2-T1** (baru) | Detail sudah membaca server, sementara form Edit masih **menulis** ke store contoh (langkah 8 `phase2-map-tasks.md` §6, butuh A12 dipakai). Dari detail ber-data server, Edit adalah form yang tidak bisa menyimpan apa yang ditampilkan layar di atasnya. Layarnya tetap ada di pohon rute dan tetap diuji di `tasks.screen.form.test.tsx` | **disembunyikan** `src/screens/tasks/detail/task-detail.screen.tsx` (`MENU` tidak punya entri `edit`) |
| **"+ Add step"** di bagian Steps detail | detail | **G2-T2** (baru) | Tulis checklist sudah tersambung (tombol centang menulis ke server), tapi *menambah* langkah butuh kolom isian yang gelombang ini tidak membangun. Tombol yang melaporkan langkah yang tidak pernah ia tambahkan lebih buruk daripada tidak ada | **disembunyikan** `src/screens/tasks/detail/detail-steps.tsx` |
| Tombol **Return** dan kotak **Evidence** di detail | detail | A6, A5 | Rute `return` 404 sampai S4; tidak ada lampiran di DTO maupun skema. Layar Return sendiri masih ada di pohon rute dan masih data contoh | **disembunyikan** `src/screens/tasks/detail/detail-actions.tsx`, `detail-facts.tsx` (berkas `detail-evidence.tsx` dihapus) |

## 2. Acara (Events) — `phase2-map-events.md` §2.1

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status |
|---|---|---|---|---|
| Pengulangan: badge **Repeat** di kartu, pill **Repeats** di detail, kemunculan berulang di kalender, pilihan repeat di form | daftar, detail, kalender, form | A4 | `recurrence` ditolak 422 (`t.Never()`), tidak ada kolom seri di tabel `event`. Kelas "Could" (E-16) | rencana |
| Batal / arsip **satu kemunculan** ("hanya kemunculan ini") dan varian sheet `-recurring` | Cancel sheet, Archive sheet | A5 | Bergantung A4; route cancel tidak punya `scope: 'occurrence'｜'series'` | rencana |
| Peran **Note-taker** di daftar hadir | detail, form | A6 | `event_participant` tidak punya kolom peran; `PersonRef` sengaja hanya `{id,name}` | rencana |
| Kaki "Updated \<tanggal\> · by \<nama\>" | detail | A7 | `EventDetail` punya `updatedAt` tapi tidak `updatedBy` | rencana |
| Seluruh alur Rekaman → Outcomes → Results: transkrip, draf tugas, keputusan, open question, sumber, "confirmed by" | Events ⑤–⑨ | A8 | Tidak ada tabel outcomes/draf, `outcomes` ditolak `t.Never()`. Kelas "Could" (E-13) | rencana |
| Cari berdasarkan **lokasi** | kotak cari daftar | A10 | `q` server hanya judul. Menyaring di klien hanya benar untuk halaman yang sudah dimuat | rencana |

**Catatan:** filter rentang tanggal kalender (A9) **tidak** disembunyikan — K6 memasukkannya ke
kelompok A yang dibangun. Begitu juga opsi form tugas (Tasks A12), rute hapus permanen Sampah
(Home/Inbox/Team A-24), dan `caps.createProject` (Projects A-17).

### 2a. Acara — yang benar-benar dihapus Gelombang 1 (26 Okt 2026)

Baris di tabel §2 di atas berstatus `rencana` karena Gelombang 0 tidak menyentuh layar. Tabel ini
mencatat penghapusannya yang sudah dikerjakan, dengan berkas layarnya. Satu baris §2 bisa jadi
beberapa baris di sini, karena satu GAP menyentuh beberapa kontrol.

| Kontrol / bidang yang dihapus | Berkas layar | GAP | Status |
|---|---|---|---|
| Badge **Repeat** di kartu daftar | `screens/events/list/event-card.tsx` | A4 | disembunyikan |
| Pill **Repeats** di kepala detail | `screens/events/detail/event-detail.screen.tsx` | A4 | disembunyikan |
| Baris fakta **Repeat** | `screens/events/detail/event-facts.tsx` | A4 | disembunyikan |
| Pilihan **Repeat** di form (dan `REPEATS` yang hanya dipakai layar) | `screens/events/form/event-details.tsx` | A4 | disembunyikan |
| Kemunculan berulang di kalender (dot & agenda hanya pada tanggal acara itu sendiri) | `data/events.calendar.ts` | A4 | disembunyikan |
| **"Which one?"** di sheet Cancel dan Archive, beserta judul varian `-recurring` dan komponen `which-one.tsx` (dihapus) | `screens/events/sheets/{cancel,archive}.screen.tsx` | A5 | disembunyikan |
| Catatan "Only this occurrence; the next ones continue." di kotak Canceled | `screens/events/detail/event-detail.screen.tsx` | A5 | disembunyikan |
| Peran **Note-taker** di daftar hadir | `screens/events/detail/event-detail.screen.tsx` | A6 | disembunyikan |
| Bagian "· by \<editor\>" di kaki detail (tanggal `Updated` tetap tampil) | `screens/events/detail/event-detail.screen.tsx` | A7 | disembunyikan |
| Tombol **View results** / **Check results** di kartu, dan rutenya ke `/results` dan `/outcomes/3` | `screens/events/list/event-card.tsx`, `data/events.list.ts` | A8 | disembunyikan |
| Tombol **Type**, **Photo**, **Voice** di kotak Minutes (dan tautan ke layar rekaman) | `screens/events/detail/event-minutes.tsx` | A8 | disembunyikan |
| Cari berdasarkan **lokasi**: placeholder jadi "Search event title…", `q` dikirim ke server | `screens/events/events.strings.ts`, `data/events.query.ts` | A10 | disembunyikan |

**Yang tidak disembunyikan tapi perlu dicatat:**

- **Layar ⑤–⑨ (Record, Recording, Outcomes, Results) masih ada di pohon rute dan masih membaca data
  contoh** (`data/events.results.ts`, `data/events.store.ts`). Modul Acara tidak lagi menautkannya
  dari mana pun; keduanya hanya bisa dibuka lewat URL langsung, atau lewat `eventHref()` dari
  Beranda/Inbox yang masih memakai data contoh sampai gelombangnya sendiri. Menghapus layarnya
  berarti menyentuh `mobile/app/**`, di luar wilayah Gelombang 1 — jadi ditinggalkan utuh dan
  dicatat di sini (A8).
- **Notulensi bisa dibaca, tidak bisa ditulis.** `noteStatus` dan `note.body` dari server sudah
  tampil; `PUT /events/:id/note` **ada** dan bukan GAP, tapi menulisnya butuh layar editor
  notulensi tersendiri — yang ada sekarang adalah wizard Outcomes (A8). Kotak Minutes mengatakannya
  apa adanya, bukan menampilkan tombol yang tidak bisa menyelesaikan pekerjaannya.
- **Reminder bisa dibaca, tidak bisa diubah** (B7): detail menampilkan `remindersMinutes` yang
  sungguhan; form memakai bawaan server dan tidak lagi menjanjikan pemilih yang tidak ada.
- **Status `Done` bergranularitas hari** untuk pembacaan tanpa tab (kalender, detail): jam mobile
  membawa `today`, bukan instan `now`, jadi acara yang berakhir tadi pagi masih terbaca "Today".
  Untuk daftar, tab server yang memutuskan, jadi di sana granularitasnya persis seperti web.

## 3. Proyek, Beranda, Inbox, Tim, Profil

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status |
|---|---|---|---|---|
| Alur **Story → Draft** dan **Template** proyek, termasuk "Also save as template" | `projects/new` story/draft/template | Projects A-16 | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel template. Fase 2 hanya memakai jalur **Form** | rencana |
| Filter "proyek milik siapa" (people row, chip My projects) | Projects filter | Projects A-2 | Daftar hanya punya `scope=mine｜all`; menyaring di klien salah pada halaman kedua | rencana |
| Filter Health per tingkat (`On track` / `At risk` / `Off track` terpisah) | Projects filter | Projects A-3 | Server hanya punya `perhatian=1` yang menggabung dua tingkat | rencana |
| Sort "Lowest progress" | Projects filter | Projects A-4 | `PROJECT_SORTS` tidak punya progress; progress dihitung, bukan kolom | rencana |
| Cari pada **deskripsi** proyek | Projects daftar | Projects A-6 | `q` server hanya nama; `description` hanya ada di detail. Placeholder perlu diubah jadi "Search project name…" | rencana |
| Persen fase berjalan ("Now: Development · 60%") | Project detail plan | Projects A-11 | Server tidak punya "persen fase". Angkanya akan berubah dari sampel, jadi perlu keputusan | rencana |
| Kartu Inbox "Meeting outcomes need your confirmation" + lead AI | Inbox | Home A-14 | Tidak ada `kind` seperti itu di katalog notifikasi | **disembunyikan** (`src/data/inbox.ts`: tidak ada lagi lead `ai`; satu kartu = satu kartu server) |
| `why` (alasan Admin jadi reviewer) di kartu review | Inbox | Home A-15 | Kartu review masih `shipped: false`; ikut S4 | **disembunyikan** (`src/data/inbox.ts`, `src/screens/inbox/inbox-card.tsx`: bidang `why` dicabut) |
| Kartu Approvals agregat ("2 new users awaiting approval") + tumpukan avatar | Inbox | Home A-13 | Server mengirim **satu kartu per akun**. Merangkumnya di klien berarti menulis kalimat kedua di samping `sentence` server — dua sumber kalimat yang pasti melenceng (K5) | **disembunyikan** (`src/data/inbox.ts`, `inbox-card.tsx`: `AvatarStack` tidak dipakai lagi di Inbox) |
| Chip **In Progress** dan sub-barisnya `next due` | Beranda | Home A-4 | `counters.inProgress` dihitung atas **proyek yang saya kelola**, bukan tugas saya, dan `nextDue` tidak ada di payload mana pun | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.types.ts`: `StatKey` tinggal dua) |
| Chip **Completed · this week** | Beranda | Home A-5 | `done.total` menghitung seluruh proyek saya, bukan tugas saya; `tasks/counts` tidak punya batas minggu | **disembunyikan** (sama) |
| Chip **Upcoming · N items** | Beranda | Home A-6 | "Sisa bulan ini" tidak ada definisinya di server; menjumlahkan tugas + acara di klien adalah angka karangan | **disembunyikan** (sama) |
| Chip Admin **Active · projects** | Beranda | Home A-7 | `counters` tidak memfilter status proyek | **disembunyikan** (sama) |
| Chip Admin **Overdue · tasks** (se-workspace) | Beranda | Home A-8 | Beranda sengaja berlingkup "proyek saya" (`home.scope.ts`); angka se-workspace tidak ada | **disembunyikan** (sama) |
| Chip Admin **Awaiting · users** dan baris "Approve N new users" di My Focus | Beranda | Home A-9 | Server mengirimnya sebagai kartu Inbox `user_pending`; tidak ada hitungan terpisah | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.focus.ts`, `src/screens/home/sections/focus.section.tsx`) |
| Teks lokasi acara ("Meeting Room 2") di kartu agenda | Beranda | Home A-10 | `HomeAgendaItem` hanya punya `locationType`; lokasinya tidak di kabel | **disembunyikan** (`src/data/home.types.ts`: `AgendaEvent.place` dicabut) |
| **Lead** proyek di baris agenda ("Lead Nico · Due Oct 31") | Beranda | Home A-11 | `HomeProject` tidak punya lead | **disembunyikan** (`src/data/home.focus.ts`, `src/screens/home/sections/agenda.section.tsx`) |
| Pil **status siklus hidup** proyek ("Active"/"Done") di baris agenda | Beranda | Home A-12 | Payload home mengirim `condition` + `reason` (kesehatan), bukan status. Diganti pil `condition` + alasannya, bukan dihilangkan | **diganti** (`src/screens/home/parts/condition-pill.tsx`) |
| Kolom tanya bebas Ask Data ("Type or say a question…") + tombol **Ask** | Beranda | — (bukan GAP yang ditunda: `server/home/home.ask.ts` memang hanya menjawab 3 pertanyaan tetap, tanpa LLM) | Kolom yang tampak bisa ditanyai apa saja adalah janji yang tidak ada yang menepati | **disembunyikan** (`src/screens/home/sections/ask.section.tsx`: tiga pil pertanyaan + jawabannya) |
| Catatan gelembung di Profil (`note`) | Profil | Home A-21 | Tidak ada kolom maupun bidang di `ProfileView` | **disembunyikan** (`src/screens/profile/profile-hero.tsx`; `profile-note.tsx` + `src/data/profile.store.ts` dihapus — catatan yang hanya hidup di satu ponsel bukan catatan profil) |
| Presence **Online/Offline** dan klaim "Teammates see you as Online" | Profil | Home A-22 | Tidak ada presence di server. Menampilkannya sebagai lokal = klaim palsu | **disembunyikan** (`src/screens/profile/profile.screen.tsx`, `profile-hero.tsx`: titik presence, switch "Show me as online" dan barisnya dicabut) |
| Satu switch "Mute notifications" | Profil | Home A-23 | Server punya **dua** switch dan kartu `action` tidak bisa dibisukan; satu switch akan bohong | **diganti** (`src/screens/profile/profile.screen.tsx`: dua switch `eventReminder`/`inboxNews` dari `GET/PUT /api/app/profile/notifications`, plus catatan bahwa kartu yang butuh jawaban selalu datang) |
| Baris fakta "Account role" untuk non-Admin | Tim person | Home A-19 | Server sengaja tidak mengirimnya (privasi) → sembunyikan saat kuncinya absen | **disembunyikan** (`src/data/team.person.ts`: barisnya hanya dibuat kalau kunci `accountRole` ada) |
| Pil hijau **"Available"** di baris Tim dan di Tim person | Tim | **G2-TPA1 (baru)** | `availability: null` berarti "tidak ada yang perlu ditampilkan", **bukan** "sedang ada" (`server/team/team.dto.ts`), dan catatan cuti Admin sengaja tidak dikirim (P14 D6). Mengarang "Available" dari kunci kosong = app ini menyatakan hal yang server menolak menyatakannya | **disembunyikan** (`src/data/team.ts` `availabilityText()`, `src/screens/team/person-row.tsx`: cuti tampil muted, selain itu baris statusnya tidak ada) |
| Pemilih **All projects** di daftar Tim | Tim | **G2-TPA2 (baru)** | `?projectId=` ada di server, tapi daftar proyek mobile masih data contoh dan id-nya bukan id server → daftar kosong tanpa sebab yang terlihat. Sama dengan G1-T1 di tab Tugas; hidup lagi begitu modul Proyek memakai `/api/app/projects` | **disembunyikan** (`src/screens/team/team.screen.tsx`: pemilihnya dicabut; pemilih Sort yang dulu dekoratif justru **diaktifkan** jadi `?sort=`) |
| Jumlah **active/overdue** di baris ringkasan Tim setelah "Load more" | Tim | **G2-TPA3 (baru)** | `summary.active/overdue` menjumlahkan **satu halaman**, bukan seluruh tim (`server/team/team.dto.ts`). Setelah halaman kedua, angka yang ada hanya menggambarkan halaman terakhir | **disembunyikan sebagian** (`src/data/team.ts` `summaryLine()`: dua angka itu hanya tampil kalau satu halaman = seluruh tim) |
| Daftar **nama proyek** yang tidak dibagi di Tim person (`tasks.hidden`) | Tim person | Home A-17 | Nama proyek sengaja tidak dikirim (privasi D10); hanya `alsoElsewhere` yang datang | **diganti** (`src/data/team.person.ts` `elsewhere`: kalimat tanpa nama proyek) |
| Garis merah **"now"** di grid jam My calendar | Profil kalender | **G2-TPA4 (baru)** | `SessionClock` hanya membawa **tanggal** dan zona, tidak ada instan; garisnya dulu dipatok 9:41 data contoh. Garis di menit karangan dibaca sebagai jam sekarang — lebih buruk daripada tidak ada garis. Butuh `now` di fondasi jam (lihat serah-terima §5) | **disembunyikan** (`src/screens/profile/day-grid.tsx`, `src/data/profile.calendar.dates.ts`: `NOW_MIN` dan `clock()` dihapus) |
| **Pengulangan** acara di My calendar ("every N weeks") | Profil kalender | Events (kelompok B, K6) | Recurrence ditunda di server, jadi klien tidak punya apa pun untuk dikembangkan; `repeatDays()`/`occursOn()` yang mengembangkannya sendiri jadi kode mati | **disembunyikan** (`src/data/profile.calendar.dates.ts`: sebuah acara jatuh di harinya sendiri dan tidak di hari lain) |
| Bidang `textSize` dari `/api/app/profile` | Profil | B-18 (belum dipakai, bukan ditunda) | Skala teks pengguna di app ini dipegang cookie `mk-text-size`-nya sendiri; menyelaraskan keduanya adalah pekerjaan tersendiri | belum dipakai (`src/data/profile.api.ts`: ada di tipe kabel, tidak dibaca) |
| **Hapus akun** (`GET /api/app/profile/delete-check`) | Profil | B-19 (belum ada layarnya) | Mobile tidak punya layar hapus akun di Fase 1, jadi tidak ada kontrol yang disembunyikan — hanya endpoint yang belum dipakai | belum dipakai |
| **Change photo** (`POST/DELETE /api/app/avatar`) | Profil | B-19 | Endpoint sudah ada, UI-nya belum pernah ada di layar Profil mobile (hanya disebut di peta) | belum dipakai |

---

## 4. Hutang yang bukan GAP server

### 4.0 "Move to Archive" di detail tugas disembunyikan — SELESAI (Gelombang 2)

Hutangnya lunas, jadi entri ini tinggal catatan (pola yang sama dengan §4.3). Kontrolnya **kembali**
ke `MENU` di `src/screens/tasks/detail/task-detail.screen.tsx`: `DELETE /api/app/tasks/:ref` benar-benar
dipanggil, snack Undo memanggil `POST /api/app/trash/task/:id/restore` dengan **id** dari jawaban
DELETE (B1), dan `tasks.api.write.ts` menyebut setiap store yang ikut basi. Tesnya di
`__tests__/tasks/tasks.screen.detail.test.tsx` sekarang membuktikan **barisnya benar-benar hilang**
dari daftar — dibaca dari keadaan server palsu, bukan dari store yang aplikasi ini tulis sendiri —
lalu kembali setelah Undo.

### 4.1 Parameter `role` masih dioper ke seluruh modul data

**Keadaan:** setiap `get<Module>()` menerima `role: Role`, dan ~40 berkas di `src/screens/`
memakainya sebagai prop dengan nilai bawaan `SESSION_ROLE` (konstanta `'pm'` dari
`src/data/session.ts`).

**Kenapa belum dicabut (keputusan koordinator, 26 Okt 2026):** mencabutnya berarti menyentuh ~40
berkas layar — persis wilayah yang dikerjakan 2–3 worker Gelombang 1 secara paralel. Melakukannya di
Gelombang 0 menukar satu masalah dengan masalah merge yang lebih besar. Yang sudah dikerjakan
Gelombang 0 adalah inti K4-nya: identitas orang dari sesi dan satu `samePerson()`.

**Kenapa tetap hutang:** `SESSION_ROLE` adalah `'pm'` mati. Seorang Member yang login akan dilayani
sebagai Project Manager oleh seluruh lapisan data sampai peran sungguhan tersedia.

**Kapan layak dikerjakan:** di gelombang yang memang boleh menyentuh layar, **setelah** sumber peran
ada. Dua prasyaratnya:
- payload `/api/auth/get-session` tidak membawa peran (lihat `SessionUser`), dan
- `AppCaps` + `caps.createProject` di `/api/app` — disetujui K6 kelompok A, belum dibangun.

Begitu salah satunya ada, `viewer()` mengisi `role` dari situ dan parameternya bisa dicabut dari
`src/data/` dan dari ~40 berkas layar dalam satu PR tersendiri.

### 4.2 `moveOnBoard()` masih menerima `PersonInfo` dari layar

`src/data/tasks.store.ts` `moveOnBoard(viewer: PersonInfo, …)` mengoper `me(role)`. Identitasnya
diselesaikan di dalam (`viewerOf()`), jadi hasilnya benar — tapi layar seharusnya tidak perlu
mengoper orang sama sekali.

**Dipersempit di Gelombang 2:** pemanggilnya sekarang **satu**, `screens/tasks/board/board-moves.sample.ts`,
dan hanya untuk tab Tugas proyek yang masih membaca store contoh. Tab Tugas sendiri memakai
`board-moves.server.ts`, yang tidak tahu apa pun soal orang: sisi mana yang boleh adalah jawaban
`can{}`. Berkas `board-moves.sample.ts` ikut pergi bersama `tasks.store.ts` saat modul Proyek pindah
ke API, dan hutang ini pergi dengannya.

### 4.3 Greeting Beranda masih teks mati — SELESAI (Gelombang 1)

`GREETING = 'Good morning'` sudah dicabut dari `src/data/sample/today.ts`. Beranda memakai
`now.greeting` dari payload home dan memetakan enumnya ke kalimat Inggris (`src/data/home.ts`):
`pagi` → Good morning, `siang`/`sore` → Good afternoon, `malam` → Good evening. Ini **enum yang
dipetakan**, bukan kalimat server yang diterjemahkan, jadi tidak melanggar K5.

### 4.4 Inbox hanya memuat halaman pertama tiap lajur

**Keadaan:** `src/data/inbox.api.ts` meminta `GET /api/app/inbox?lane=…` tanpa `cursor`, jadi yang
tampil adalah 25 kartu teratas (default server). `nextCursor` **dipakai**: kalau masih ada lanjutan,
daftarnya menulis "Only the newest cards/updates are loaded." — bukan diam-diam berhenti.

**Kenapa belum ada "muat lebih banyak":** `resource()` di fondasi bersama menyimpan **satu** nilai
dan `load` tidak menerima argumen, jadi menambah halaman berarti mengubah kontrak fondasi — yang
dilarang dikerjakan satu worker sendirian (dua worker lain menulis di atas pola yang sama).
Keputusannya milik koordinator; sampai itu, batas ini tertulis di layar.

**Efek samping yang perlu diketahui:** lencana Inbox di panel More dan baris Inbox di Profil
membaca `respondCards().length` (lewat `getProfile`, berkas milik Gelombang 2), bukan
`inbox/count.action`. Untuk >25 kartu terbuka angkanya jadi kurang. Satu baris di
`src/data/profile.ts` (`inbox: inboxActionCount() ?? 0`) membereskannya; tidak saya kerjakan karena
berkas itu di luar wilayah saya.

### 4.6 `archive.store.ts` masih ditulis modul lain, tapi tidak dibaca layar Arsip lagi

Layar Arsip membaca `GET /api/app/trash`. `src/data/archive.store.ts` (store contoh) **tetap ada**
karena `tasks.store.ts`, `projects.store.ts` dan `events.store.ts` memanggil `addEntry`/`removeEntry`
untuk Undo lokal mereka — tiga berkas milik worker lain. Akibatnya: mengarsipkan sebuah proyek atau
acara lewat jalur yang masih memakai store contoh **tidak menambah kartu** di layar Arsip, dan
sebaliknya memulihkan dari Arsip tidak menghapus entri store contoh.

**Siapa yang menutupnya:** worker yang memindahkan Proyek dan Acara ke tulisan server (Acara sudah
memakai `DELETE /api/app/events/:id` di Gelombang 1, jadi yang tersisa Proyek dan Tugas). Begitu
tidak ada lagi pemanggil `addEntry`, hapus `archive.store.ts` dan `sample/archive.ts`.

### 4.7 Daftar Proyek belum ikut di-invalidate oleh restore/purge Sampah

`src/data/archive.api.ts` `touched()` menyebut Sampah, Beranda, daftar Acara dan daftar Tugas, tapi
**tidak** daftar Proyek: modul Proyek dipindah ke API di gelombang yang sama, jadi belum ada
resource yang bisa disebut (pola yang sama dengan `KNOWN GAP` di `home.actions.ts`).
**Saat cabang ini dan cabang Proyek di-merge: tambahkan resource daftar proyek ke `touched()`.**
Sampai itu, memulihkan sebuah proyek benar di layar Arsip, tapi layar Proyek yang masih terpasang
tetap menampilkan baris lamanya (§2 dokumen pola).

### 4.8 Form "Edit profile" masih data contoh

`src/screens/settings/profile-edit.screen.tsx` dan `src/data/settings.ts` ada di area **Settings**,
bukan wilayah gelombang ini, jadi formnya masih mengisi dirinya dari `me(role)` data contoh dan
tidak memanggil `PATCH /api/app/profile`. Pemetaannya 1:1 dan sudah ditulis di
`phase2-map-home-inbox-team.md` §1.6. Akibatnya **kelihatan**: modal Profil menampilkan data server,
tombol "Edit profile" membuka form berisi nama data contoh. Perlu satu pekerjaan Settings.

### 4.5 `role` sudah tidak dipakai Beranda dan Inbox

`HomeScreen` dan `InboxScreen` tidak lagi menerima prop `role`, dan `getHome()`/`getInbox()` tidak
menerima argumen: apa yang boleh tampil adalah jawaban server, bukan terkaan layar. Dua berkas layar
hilang dari daftar ~40 di §4.1. `respondCards(_role?, _decided?)` **masih** menerima dua parameter
yang diabaikan, semata agar `src/data/profile.ts` dan `src/screens/more/more.tiles.ts` (wilayah
Gelombang 2) tetap ter-compile; keduanya dicabut bersama §4.1.

### 4.6 `role` sudah tidak dipakai tab Tugas dan papannya

`TasksScreen` tidak lagi menerima prop `role`, dan `TaskBoard`/`useMoveMenu` tidak lagi memakainya
untuk memutuskan apa pun: tombol New task mengikuti `caps.createTask`, dan sisi menu radial per
kartu mengikuti `can{}` kartu itu. `role` masih ada sebagai prop **opsional** di `TaskBoard` semata
untuk `sampleMoves(role)`, yaitu jalur store contoh tab Tugas proyek (§4.2) — bukan untuk sebuah
keputusan izin.

Tiga berkas layar lagi hilang dari daftar ~40 di §4.1.
