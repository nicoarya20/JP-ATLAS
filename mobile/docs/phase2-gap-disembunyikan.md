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
| Alur **Story → Draft** dan **Template** proyek, termasuk "Also save as template" | `projects/new` story/draft/template | Projects A-16 | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel template. Fase 2 hanya memakai jalur **Form** | **masih sampel** (`src/data/projects.sample-form.ts`: ketiga langkah itu dipisahkan ke berkasnya sendiri, supaya satu baris impor menandai layar yang belum bicara ke server; jalur Form sudah server) |
| Filter "proyek milik siapa" (people row, chip My projects) | Projects filter | Projects A-2 | Daftar hanya punya `scope=mine｜all`; menyaring di klien salah pada halaman kedua | **disembunyikan** (`src/screens/projects/list/projects.screen.tsx`, `src/data/projects.people.ts` dihapus; param `who` dicabut) |
| Filter Health per tingkat (`On track` / `At risk` / `Off track` terpisah) | Projects filter | Projects A-3 | Server hanya punya `perhatian=1` yang menggabung dua tingkat | **diganti** (`src/data/projects.query.ts`: satu opsi "Needs attention" dengan nama itu, bukan tiga yang dikarang) |
| Sort "Lowest progress" | Projects filter | Projects A-4 | `PROJECT_SORTS` tidak punya progress; progress dihitung, bukan kolom | **diganti** (`src/data/projects.api.values.ts`: "Recently updated" (`sort=recent`) menggantikannya, menutup B-10 sekaligus) |
| Cari pada **deskripsi** proyek | Projects daftar | Projects A-6 | `q` server hanya nama; `description` hanya ada di detail. Placeholder perlu diubah jadi "Search project name…" | **disembunyikan** (`src/screens/projects/projects.strings.ts`: placeholder sudah "Search project name…", menjanjikan yang dicari saja) |
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
| **Aksi per baris** di tab Tugas proyek ("Start working", "Request review", "Review", "View" untuk Member) | Project detail tab Tugas | — (bukan GAP server: `can` dan `primary` **ada** di baris) | Tulisannya milik modul Tugas dan belum tersambung ke layar ini, dan detail tugas yang didarati masih sampel. Tombol yang melaporkan kerja yang tidak dilakukannya lebih buruk daripada tidak ada tombol | **disembunyikan** (`src/screens/projects/detail/task-card.tsx`, `tasks.tab.tsx`: kartu membuka tugas) |
| Sakelar **List / Kanban** di tab Tugas proyek | Project detail tab Tugas | — (bukan GAP server) | `TaskBoard` memindahkan kartu lewat store sampel (`useMoveMenu`), jadi papan berisi baris server akan menelan setiap geseran tanpa jejak. Menunggu tulisan server modul Tugas | **disembunyikan** (`src/screens/projects/detail/tasks.tab.tsx`: hanya daftar) |
| **Project settings** di menu ⋯ | Project detail | Projects A-12 | `can.manageKinds` ada, tetapi tidak ada rute `/api/app` untuk task kind sama sekali, jadi layar di belakangnya hanya bisa menampilkan sampel | **disembunyikan** (`src/screens/projects/detail/detail-header.tsx`: `projectMenu` tinggal Edit + Move to Archive; rutenya masih terdaftar tapi tanpa pintu masuk) |
| Cek **nama proyek ganda** ("A project with this name already exists.") | Project Edit, Form | — (bukan GAP server: aturannya memang tidak ada) | `project.name` tidak punya unique constraint (`server/db/schema.project.ts`) dan tugas menunjuk `projectId`, jadi dua proyek boleh senama. Aturannya akan menolak nama yang server terima | **dihapus** (`src/screens/projects/edit/project-edit.screen.tsx`; alasan Save mati kini "Change something first.") |
| **"Impact of change"** di sheet Extend deadline | Project Extend | Projects A-10 | Tidak ada endpoint pratinjau; versi klien (menghitung tugas di halaman yang kebetulan dimuat) benar untuk sepotong dan terbaca sebagai total | **disembunyikan** (`src/screens/projects/sheets/extend.screen.tsx`) |
| Opsi alasan kelima **"Estimate was off"** di Extend deadline | Project Extend | — (bukan GAP server) | Server menyimpan **empat** kategori (`WireExtensionReason`); opsi kelima akan dicatat sebagai salah satu dari empat itu. Kata-katanya kini diambil dari `EXTENSION_REASONS`, yaitu enum-nya sendiri | **dihapus** (`src/screens/projects/sheets/extend.screen.tsx`, `projects.strings.ts`: `EXTEND.reasons` dicabut) |
| **"+ Phase"** dan **"+ Milestone"** | Project detail tab Fase | — (bukan GAP server: rutenya ada) | Kedua rute ada, tetapi belum ada formulirnya di sisi ini; digambar sebagai tombol yang hanya berkata "nanti" adalah janji yang belum ditepati | **disembunyikan** (`src/screens/projects/detail/phases.tab.tsx`) |
| **"+ Member"** di form New project | `projects/new/form` | Projects B-11 | Tombolnya memilih dari daftar yang sudah ditampilkan seluruhnya; memilih orang **di luar** picker butuh pencarian yang rutenya tidak punya | **disembunyikan** (`src/screens/projects/new/form-members.tsx`) |
| Pilihan lingkup **"Semua / Punya saya"** (`scope=all`) di daftar proyek | Projects daftar | Projects **B-17** | Bukan GAP yang ditunda: parameternya **sudah ada dan jalan** (`server/api/app-projects.ts`), clamp Member di `access/project.policy.ts`. Ini kapabilitas server yang mobile belum ambil, seperti `sort=recent` (B-10). Daftar selalu mengirim `scope=mine` | **belum diambil** (`src/data/projects.ts` `listParams`) |
| Jumlah **anggota** di kartu daftar proyek ("4 members") | Projects daftar | — (bukan GAP yang ditunda) | `ProjectListItem` tidak membawa daftar anggota; barisnya tentang proyek, bukan orangnya. Nama terbaca kartu kini berhenti di "Due …" | **dihapus** (`src/screens/projects/list/project-card.tsx`) |
| Catatan gelembung di Profil (`note`) | Profil | Home A-21 | Tidak ada kolom maupun bidang di `ProfileView` | rencana |
| Presence **Online/Offline** dan klaim "Teammates see you as Online" | Profil | Home A-22 | Tidak ada presence di server. Menampilkannya sebagai lokal = klaim palsu | rencana |
| Satu switch "Mute notifications" | Profil | Home A-23 | Server punya **dua** switch dan kartu `action` tidak bisa dibisukan; satu switch akan bohong | rencana |
| Baris fakta "Account role" untuk non-Admin | Tim person | Home A-19 | Server sengaja tidak mengirimnya (privasi) → sembunyikan saat kuncinya absen | rencana |

---

## 4. Hutang yang bukan GAP server

### 4.0 "Move to Archive" di detail tugas disembunyikan

**Berkas:** `src/screens/tasks/detail/task-detail.screen.tsx` (entri `archive` dihapus dari `MENU`).

**Kenapa:** daftar tugas sudah membaca server, sementara tulisan Archive masih menulis store
contoh. Akibatnya baris tetap tampil setelah menu bilang tugasnya sudah pindah ke Archive —
kontrol yang melaporkan pekerjaan yang tidak ia lakukan lebih buruk daripada kontrol yang tidak
ada. Ini **bukan GAP server**: endpointnya sudah ada (`DELETE /api/app/tasks/:ref` + Undo lewat
`POST /api/app/trash/task/:id/restore`).

**Kapan dibuka lagi:** langkah 7 `phase2-map-tasks.md` §6, bersama Sampah/Undo di gelombang
berikutnya. Tesnya (`__tests__/tasks/tasks.screen.detail.test.tsx`) sekarang menegaskan kontrolnya
**tidak** ditawarkan, jadi membukanya kembali akan menabrak tes itu — itu disengaja.

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

`src/data/tasks.store.ts` `moveOnBoard(viewer: PersonInfo, …)` dipanggil dua berkas layar
(`screens/tasks/board/task-board.tsx`, `screens/tasks/board/use-move-menu.ts`) yang mengoper
`me(role)`. Identitasnya diselesaikan di dalam (`viewerOf()`), jadi hasilnya benar — tapi layar
seharusnya tidak perlu mengoper orang sama sekali. Dibereskan bersama 4.1, oleh worker Tasks.

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

### 4.5 `role` sudah tidak dipakai Beranda dan Inbox

`HomeScreen` dan `InboxScreen` tidak lagi menerima prop `role`, dan `getHome()`/`getInbox()` tidak
menerima argumen: apa yang boleh tampil adalah jawaban server, bukan terkaan layar. Dua berkas layar
hilang dari daftar ~40 di §4.1. `respondCards(_role?, _decided?)` **masih** menerima dua parameter
yang diabaikan, semata agar `src/data/profile.ts` dan `src/screens/more/more.tiles.ts` (wilayah
Gelombang 2) tetap ter-compile; keduanya dicabut bersama §4.1.
