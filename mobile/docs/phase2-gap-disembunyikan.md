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
| Pengerja kedua dan seterusnya: `also[]`, label "+N", fact Assignee berisi daftar | kartu, board, detail, Edit, Fill form | A1 | Server hanya punya `assignee_id` tunggal; butuh tabel penugasan banyak-ke-banyak. Web pun belum punya | **disembunyikan sebagian** (`src/data/tasks.card.ts` `apiCard`: kartu daftar dan board tab Tugas satu orang, `whoLabel` tanpa "+N"; detail/Edit/form menyusul di langkah detail) | **disembunyikan** di kartu daftar (`src/data/tasks.api.map.ts` `cardOf`: satu orang, `whoLabel` tanpa "+N"); detail/Edit/form belum disentuh |
| Tag: kotak cari tag, fact Tag, `TagsEdit`, daftar tag di Project settings | daftar, detail, Edit, Fill form, Project settings | A2 | `tags` ditolak `t.Never()` → 422. Kelas "Could" yang sengaja ditutup | rencana | — |
| Evidence / lampiran: "Evidence n", "+ Attach evidence" | detail (progress/review), Edit | A5 | Tidak ada lampiran di DTO maupun skema; butuh tabel + unggah lewat `storage()` | rencana | — |
| Seluruh alur review: Request review, Approve, Return, banner `asked`, switch Needs review, ganti reviewer, grup "Waiting for my review" | detail, Return sheet, Edit, daftar | A6, A13 | Policy-nya lengkap tapi **rutenya belum ada**, dan `TASK_REVIEW_UI_ENABLED = false` di server. Ini S4 | **disembunyikan sebagian** (`src/data/tasks.list.ts`: tab Tugas tidak membuat grup "Waiting for my review"; label `awaiting_my_review` tidak dirender, `src/data/tasks.card.ts` `CARD_TEXT.label`; kolom In review tanpa langkah masuk, lihat baris radial di bawah; detail dan Return sheet menyusul) | **disembunyikan** untuk grup "Waiting for my review" di My tasks (`src/data/tasks.api.view.ts` `taskListSpecs` tidak memintanya); detail dan Return sheet belum disentuh, masih data contoh |
| Estimated hours | Fill form | A9 | `estimateHours` ditolak `t.Never()` → 422 | rencana | — |
| Impor CSV seluruhnya (unggah/tempel, pratinjau per baris, ringkasan, Import) | `tasks/csv.tsx` | A10 | Tidak ada endpoint impor di `/api/app` sama sekali | rencana | — |
| Project settings yang bisa ditulis: switch "New tasks need review", kelola jenis tugas, Rename/Merge/Delete tag | Project settings | A11 | `manageKinds` dikirim sebagai cap tapi tanpa route | rencana | — |
| Sort "Title (A–Z)" | Filter & sort | A16 | `TASK_SORTS` tidak punya judul. Mengurutkan di klien **salah** begitu ada paginasi — yang terurut hanya halaman yang sudah dimuat | **dihapus** (`src/data/tasks.query.ts` `SORTS`: tiga sort server; ikut hilang dari tab Tugas proyek juga, disetujui koordinator 28 Okt — perubahan yang terlihat di tab proyek) | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx` (`SERVER_SORTS`), hanya di tab Tugas; tab proyek masih menyaring di memori jadi tetap menawarkannya |
| Cari tag dan **awalan** nomor ("#1" menemukan #12) | kotak cari daftar + board | A15 | `q` server = judul atau nomor **persis**. Awalan dan tag tidak didukung | **diganti** (`src/screens/tasks/tasks.strings.ts` `searchServer` "Search title or #number…": server mencocokkan judul atau nomor persis, "12" maupun "#12"; dikirim sekali saat ketikan berhenti 300 ms, `tasks.screen.tsx`; tab proyek tetap placeholder lama selama masih sampel) | **disembunyikan** — placeholder tab Tugas jadi "Search title or exact #number…" (`tasks.strings.ts` `searchServer`); tab proyek tetap mencari di memori dengan placeholder lama |
| Draf "AI" dari teks bebas (Just write) | `tasks/new` | B13 | Endpoint `POST /tasks/draft` **ada**; yang belum diputuskan adalah apakah mobile memakainya di Fase 2 (kelompok B) | rencana | — |
| **Filter Project** di tab Tugas (baris Project + "All projects") | Filter & sort tab Tugas | **G1-T1** (baru) | Daftar proyek masih data contoh (`projects.state`, sampai modul Proyek pindah ke API) dan id-nya **bukan** id server. Mengirim `projectId=<id contoh>` berarti daftar yang kosong tanpa sebab yang terlihat pengguna — lebih buruk daripada tidak ada filternya. Server **punya** `projectId`; yang kurang hanya daftar proyek dari API | **diganti** (`src/screens/tasks/filter/tasks-filter.screen.tsx` `ProjectField`: daftar dari `GET /api/app/projects?scope=all&sort=name&limit=100`, id server; proyek yang tak lagi terdaftar terbaca dan dikirim sebagai All projects) | **disembunyikan** `src/screens/tasks/filter/tasks-filter.screen.tsx`; tab proyek memakai Assignee seperti sebelumnya. Hidup lagi begitu modul Proyek memakai `/api/app/projects` |
| `kind`/Type di baris kartu All tasks (segmen `· type ·`) | daftar All tasks, `cardName` | A3 | `TaskListItem` tidak punya `kind`; hanya detail punya | **disembunyikan** (`src/screens/tasks/list/all-card.tsx`: proyeknya tampil saat `type` kosong; `src/data/tasks.card.ts` `apiCard` → `type: null`) | **disembunyikan** `src/screens/tasks/list/all-card.tsx` — segmennya dihilangkan, bukan dirender kosong |
| Alasan **kenapa** sebuah kontrol disabled (`capMessage`) | semua kontrol ber-`can{}` | **G1-T2** (baru) | `can{}` hanya membawa kode deny; kalimatnya hidup di `server/access/decision.ts` yang hanya bisa diimpor web. Menulis salinan Inggris per kode di mobile = sumber kalimat kedua, dilarang K5 | **diganti** (keputusan E-6, 28 Okt: katalog kalimat Inggris per kode di `src/data/caps.messages.ts` — `capMessage`, `CAP_UNKNOWN` untuk kode baru; dipakai board lewat `src/data/tasks.card.ts` `boardMoves`; modul lain membaca berkas yang sama) | **digantikan** satu baris jujur milik mobile sendiri (`CAP_DISABLED_REASON`, "Not available for this task."). Butuh keputusan: kirim `capMessage` di DTO, atau terima satu baris umum |
| Segmen `· type ·` di baris kartu **board** All tasks | board | A3 | Sama seperti kartu daftar: `TaskListItem` tidak punya `kind`. Baris kartu board menampilkan proyeknya saat tidak ada jenis, bukan pemisah yang menggantung | **disembunyikan** (`src/screens/tasks/board/board-card.tsx`: proyek saat `type` kosong) | **disembunyikan** `src/screens/tasks/board/board-cards.ts` (`cardPlace`) |
| Sisi **In review** di menu radial board | board | A6 | Langkah ke In review adalah `requestReview`, yang rutenya 404 sampai S4. Sisinya digambar mati, bukan dicoba lalu ditolak `409` | **disembunyikan** (`src/data/tasks.card.ts` `boardMoves`: hanya sisi yang `can{}`-nya `true`; sisi lain digambar mati "not available", `src/screens/tasks/board/radial-option.tsx`) | **disembunyikan** `src/data/tasks.api.board.ts` (`movableTo` hanya menawarkan sisi yang `can{}`-nya ada) |
| **Edit task** di menu ⋯ detail tugas | detail | **G2-T1** (baru) | Detail sudah membaca server, sementara form Edit masih **menulis** ke store contoh (langkah 8 `phase2-map-tasks.md` §6, butuh A12 dipakai). Dari detail ber-data server, Edit adalah form yang tidak bisa menyimpan apa yang ditampilkan layar di atasnya. Layarnya tetap ada di pohon rute dan tetap diuji di `tasks.screen.form.test.tsx` | rencana | **disembunyikan** `src/screens/tasks/detail/task-detail.screen.tsx` (`MENU` tidak punya entri `edit`) |
| **"+ Add step"** di bagian Steps detail | detail | **G2-T2** (baru) | Tulis checklist sudah tersambung (tombol centang menulis ke server), tapi *menambah* langkah butuh kolom isian yang gelombang ini tidak membangun. Tombol yang melaporkan langkah yang tidak pernah ia tambahkan lebih buruk daripada tidak ada | rencana | **disembunyikan** `src/screens/tasks/detail/detail-steps.tsx` |
| Tombol **Return** dan kotak **Evidence** di detail | detail | A6, A5 | Rute `return` 404 sampai S4; tidak ada lampiran di DTO maupun skema. Layar Return sendiri masih ada di pohon rute dan masih data contoh | rencana | **disembunyikan** `src/screens/tasks/detail/detail-actions.tsx`, `detail-facts.tsx` (berkas `detail-evidence.tsx` dihapus) |
| Langkah **Reopen** di board (kartu Done ke kolom lain) | board | — (bukan GAP server: `POST /:ref/reopen` ada) | Reopen wajib alasan 3–200 karakter (keputusan §1); geseran di board tidak punya tempat menulisnya. Kartu Done yang boleh dibuka lagi berkata "Open the task to reopen it with a reason." alih-alih membuka menu | **diganti** (`src/data/tasks.card.ts` `boardMoves`, `CARD_TEXT.reopenFirst`; sheet alasan menyusul di langkah detail) | — |
| Proyek bawaan **Atlas** di All tasks (titik filter menyala sejak awal) | daftar + board All tasks | — (bukan GAP server) | Id `atlas` adalah id contoh, bukan id server; yang boleh dilihat penonton sudah dibatasi server lewat `scope=all`. All tasks kini mulai dari semua proyek tanpa titik filter — perubahan yang terlihat | **dihapus** (`src/data/tasks.query.ts` `baseQuery`; `withListedProject` dan ketergantungan `tasks.query-state.ts` pada `projects.state` dicabut) | — |
| Daftar proyek di Filter & sort lebih dari 100 | Filter & sort tab Tugas | — (bukan GAP yang ditunda: batas halaman server 100) | Pemilih memuat satu halaman `GET /api/app/projects` (maks 100), tanpa cari atau halaman berikutnya. Proyek ke-101 dst. tidak ditawarkan | **dibatasi** (`src/data/tasks.api.ts` `filterProjectsResource`) | — |
| Angka di judul grup / kolom setelah filter, cari, atau sort lain | daftar + board tab Tugas | — (bukan GAP server) | `tasks/counts` hanya menggambarkan My tasks tanpa saringan. Daftar yang disaring menghitung baris yang sudah dimuat, dan menulis "25+" selama masih ada halaman — bukan total karangan (K6) | **diganti** (`src/data/tasks.list.ts` `countOf`, `plainMine`) | — |
| **Hapus tugas** (Move to Trash + Undo) | detail ⋯ | — (bukan GAP server: `DELETE /:ref` + restore ada) | CLAUDE.md T1 mewajibkan tombol Urungkan **dan** Sampah di belakangnya; Sampah mobile belum disambung, jadi hapus tanpa tempat memulihkan dilarang (keputusan §1, 28 Okt) | rencana (disembunyikan di langkah detail) | — |
| Baris **Import tasks** di Create sheet (pintu masuk ke impor CSV) | Create sheet ("+" Beranda/More) | A10 | Sama dengan baris "Impor CSV seluruhnya": tidak ada endpoint impor. Sheet kini mengikuti `caps` whoami, dan tidak ada cap yang mengizinkan impor | **disembunyikan** (`src/screens/create/create.options.ts`: `cap: () => false`; layar `tasks/csv` dan rutenya tidak diubah — milik modul Tugas) | — |
| **Edit task** di menu ⋯ detail tugas kembali (menyusul baris G2-T1) | detail | G2-T1 | Edit kini membaca `GET /tasks/:ref` + `form-options?projectId` dan menulis `PATCH /tasks/:ref` dengan hanya bidang yang berubah. Muncul bila `can.update` ada; kode deny → dipilih memunculkan alasannya (`capMessage`), dibuka langsung → halaman "You can't edit this task" | **dipulihkan** (`src/screens/tasks/detail/task-detail.screen.tsx` `item`, `src/data/tasks.detail.ts` `edit`; W3-Tasks 28 Okt) | — |
| Aturan klien **"wajib pengerja"** di Edit dan Fill form | Edit, Fill form | T-12 | Server menerima tugas tanpa pengerja (`assigneeId` opsional). Mobile mengikuti server: pilihan pertama "Unassigned", Save hanya butuh judul dan mulai ≤ tenggat. **Perubahan yang terlihat** — dikonfirmasi User 2026-10-28: tugas boleh tanpa pengerja | **dilepas** (`src/data/tasks.form.ts` `formProblem`, `assigneeOptions`) | — |
| Sumber pilihan **Assignee** | Edit, Fill form | — (bukan GAP server) | Peta menulis `team/picker?projectId`, tetapi picker itu **mengecualikan** anggota proyek (dibuat untuk Add member). Yang dipakai `GET /projects/:id/members`, disaring Manager + Member (`TASK_WORKER_ROLES`; Viewer hanya membaca). Pengerja lama yang bukan pengerja lagi tetap tampil sebagai pilihan di Edit | **diganti** (`src/screens/tasks/parts/use-task-people.ts`, `src/data/tasks.form.ts` `assigneeOptions`) | — |
| Tag, Estimated hours, Needs review / Reviewer di Edit dan Fill form | Edit, Fill form | T-8, T-10, T-1 | `tags` dan `estimateHours` ditolak 422; `needsReview` hanya boleh `false` di `POST` dan ditolak di `PATCH`; reviewer tak bisa diubah (S4/S5) | **disembunyikan** (`src/screens/tasks/new/form-body.tsx`, `src/screens/tasks/edit/edit-form.tsx`; `tags-edit.tsx`, `form-fields.tsx`, `edit-lists.tsx` dihapus) | — |
| Langkah (steps) dan Evidence di **Edit**; langkah di **Fill form** | Edit, Fill form | T-9 (evidence) | Langkah punya rute checklist sendiri dan sudah ditulis dari detail; Edit tidak menggandakannya. `POST /tasks` menerima `checklist`, tetapi Fill form belum menawarkan langkah — ditambah di detail sesudah tugas dibuat | **disembunyikan** (sama) | — |
| **Mengosongkan** tenggat / tanggal mulai di Edit | Edit | — (bukan GAP server: `PATCH` menerima `null`) | `DateField` kit belum punya tombol "Clear"; tanggal yang sudah terisi hanya bisa diganti, tidak dihapus. Hutang UI, bukan server | **hutang** (`src/components/form/date-field.tsx`) | — |
| Opsi form dimuat ulang tiap form dibuka | Edit, Fill form | — (bukan GAP server) | Proyek, jenis, dan fase berubah di luar tulisan tugas (settings proyek, keanggotaan), jadi tak ada target invalidate yang tepat; layar meminta `form-options` lagi setiap dibuka. Proyek task yang tak terjangkau (404) → "This project is no longer here" | **diganti** (`src/data/tasks.form.api.ts`, `form.screen.tsx`, `edit/task-edit.screen.tsx`) | — |
| **Impor CSV** dan baris **Import tasks** di Create sheet (menyusul dua baris A10 di atas) | `tasks/csv`, Create sheet | A10 | Tidak terjangkau dari layar mana pun (baris Create ber-`cap: () => false`) dan tidak ada endpoint impor, jadi **dihapus**, bukan disembunyikan | **dihapus** (W3-Tasks 28 Okt: `app/tasks/csv.tsx`, `src/screens/tasks/csv/`, sampel CSV di `src/data/sample/tasks.extra.ts`, string `C`, id `tasks.csv` di `create-href.ts`, baris Import tasks + nada `gray` di `create.options.ts`/`create.screen.tsx`; acuan pemulihan `09c01dd0`) | — |
| **Just write ✦** disambung (menyusul baris B13) | `tasks/new` | B13 | Keputusan orkestrator 28 Okt (opsi B): rute dan kontraknya sudah ada (`server/ai/task-draft.types.ts`), jadi disambung, bukan disembunyikan. Proyek dari `form-options`; Compose → `POST /tasks/draft` (`DRAFT_TEXT_MAX` = salinan `TASK_DRAFT_TEXT_MAX` 2000); draf dan `assigneeNote` serta `question` tampil apa adanya (K5), opsi pertanyaan mengisi pengerja draf di `draftIndexes`; tiap draf bisa disunting (judul, pengerja, prioritas, tenggat) atau dibuang (Keep). Save = `POST /tasks` per draf secara berurutan, berhenti di penolakan pertama dan menyebut berapa yang tersimpan; yang tersimpan keluar dari daftar agar Save ulang tidak menggandakan. 503 `AI_DISABLED` / 502 `AI_UNAVAILABLE` → Fill form, cerita di Judul (dipotong `TITLE_MAX`) + notice server; 400/403/404/409/429 → pesan server di layar | **disambung** (`src/data/tasks.draft.ts`, `createTasks` di `src/data/tasks.form.write.ts`, `src/screens/tasks/new/{write.screen,write-drafts,use-just-write}.tsx`; sampel `QUICK_WRITE`/`getQuickWrite`/`src/data/tasks.write.ts`/`src/data/tasks.ts` **dihapus**) | — |
| Simpan semua draf Just write **sekaligus** (atomik) | `tasks/new` | — (bukan GAP yang ditunda: tidak ada rute buat-banyak) | Server hanya punya `POST /tasks` satu per satu; Save menulis berurutan, jadi bisa tersimpan sebagian. Layar menyebut jumlahnya dan menyisakan draf yang belum masuk | diganti (`use-just-write.ts`) | — |
| Pertanyaan **terbuka** Just write (tanpa `options`) | `tasks/new` | — (bukan GAP server) | Server tidak punya rute untuk menjawabnya; kontraknya hanya menawarkan pilihan anggota. Teks pertanyaan tampil apa adanya; menjawab = sunting cerita lalu Compose lagi | diganti (`write-drafts.tsx` `DraftQuestion`) | — |
| **Speak** (input suara) di Just write | `tasks/new` | — (bukan GAP server) | Butuh dependensi pengenalan suara baru (Rule 10); prototipe pun hanya "coming soon" | **disembunyikan** (keputusan orkestrator 28 Okt: teks "Speak · coming soon" dicabut dari `write.screen.tsx`) | — |
| **Hapus tugas** kembali (menyusul baris "Hapus tugas" di atas) | detail ⋯ | — (bukan GAP server) | Sampah mobile kini ada (W3-Sampah), jadi T1 terpenuhi: ⋯ › **Move to Trash** (`can.trash`: diizinkan, kelabu dengan alasan `capMessage`, atau tidak ada) → `DELETE /tasks/:ref`, kembali ke `/tasks`, snack **Undo** → `POST /trash/task/:id/restore` | **disambung** (`src/data/tasks.trash.ts`, `src/screens/tasks/detail/use-task-trash.ts`, `TaskDetailView.trash` di `tasks.detail.ts`) | — |

## 2. Acara (Events) — peta: `phase2-map-events.md` §2.1

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status | Penanganan di Fase 2 lama (`2a985b7^`, dibatalkan) |
|---|---|---|---|---|---|
| Pengulangan: badge **Repeat** di kartu, pill **Repeats** di detail, kemunculan berulang di kalender, pilihan repeat di form | daftar, detail, kalender, form | A4 | `recurrence` ditolak 422 (`t.Never()`), tidak ada kolom seri di tabel `event`. Kelas "Could" (E-16) | disembunyikan (W3-Events 28 Okt: `list/event-card.tsx`, `detail/event-facts.tsx`, `form/**`) | — |
| Batal / arsip **satu kemunculan** ("hanya kemunculan ini") dan varian sheet `-recurring` | Cancel sheet, Archive sheet | A5 | Bergantung A4; route cancel tidak punya `scope: 'occurrence'｜'series'` | dihapus (W3-Events: `sheets/which-one.tsx` dan sheet Archive dihapus) | — |
| Peran **Note-taker** di daftar hadir | detail, form | A6 | `event_participant` tidak punya kolom peran; `PersonRef` sengaja hanya `{id,name}` | disembunyikan (W3-Events 28 Okt: `detail/event-detail.screen.tsx` hanya menandai Creator) | — |
| Kaki "Updated \<tanggal\> · by \<nama\>" | detail | A7 | `EventDetail` punya `updatedAt` tapi tidak `updatedBy` | diganti (W3-Events: kaki "Created by X · Updated <tgl>", `data/events.detail.ts`) | — |
| Seluruh alur Rekaman → Outcomes → Results: transkrip, draf tugas, keputusan, open question, sumber, "confirmed by" | Events ⑤–⑨ | A8 | Tidak ada tabel outcomes/draf, `outcomes` ditolak `t.Never()`. Kelas "Could" (E-13) | dihapus (28 Okt: tautan dicabut dari kartu dan detail; rute `[id]/{record,recording,outcomes/[step],results}`, layar `screens/events/{record,results,outcomes}/`, `events.strings.outcomes.ts`, `data/events.{store,results}.ts`, `sample/events{,.extra}.ts` dan tesnya dihapus. Pulihkan dari `09c01dd0`) | — |
| Cari berdasarkan **lokasi** | kotak cari daftar | A10 | `q` server hanya judul. Menyaring di klien hanya benar untuk halaman yang sudah dimuat | diganti (W3-Events: placeholder "Search event title…", `list/events.screen.tsx`) | — |
| Tulis notulen (editor notulensi, konfirmasi) | detail | — (`PUT /events/:id/note` ada) | Butuh layar editor + penanganan 409 `NOTE_CONFLICT`; di luar lingkup W3 | disembunyikan (W3-Events 28 Okt: `detail/event-minutes.tsx` hanya membaca) | — |
| Pemilih **pengingat** | form | B7 | Bukan GAP server (`remindersMinutes` diterima); pemilihnya belum dirancang | disembunyikan (W3-Events 28 Okt: `form/event-details.tsx` menampilkan baca-saja; acara baru = bawaan server) | — |
| Pindah acara ke **proyek lain** saat Edit | form Edit | E-8 | `PATCH` menolak `projectId` (422) | disembunyikan (W3-Events 28 Okt: `event-project-locked` + petunjuk) | — |
| Titik kalender bulan sangat padat (> 1.000 acara) | kalender | E-7 | Jendela mengikuti kursor maks 10 halaman × 100 | diganti (W3-Events 28 Okt: `data/events.calendar.ts`) | — |
| **Cari tamu** oleh Member (acara pribadi) | form, picker tamu | E-9 (baru) | `GET /events/people` tanpa `projectId` mensyaratkan `canCreateProject` → Member 403; dengan `projectId` anggota proyek dikeluarkan dari kandidat | rencana — picker menampilkan pesan server (`form/guest-picker.tsx`); butuh keputusan server | — |

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
| Alur **Story → Draft** dan **Template** proyek, termasuk "Also save as template" | `projects/new` story/draft/template | Projects A-16 | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel template. Fase 2 hanya memakai jalur **Form** | **disembunyikan** (`src/screens/projects/new/form.screen.tsx` `NewProjectIndex`: `/projects/new` langsung membuka Form; pemilih jalan `new.screen.tsx` dan story/draft/template tetap sampel tanpa pintu masuk, hanya terjangkau lewat URL) | **masih sampel** (`src/data/projects.sample-form.ts`: ketiga langkah itu dipisahkan ke berkasnya sendiri, supaya satu baris impor menandai layar yang belum bicara ke server; jalur Form sudah server) |
| Filter "proyek milik siapa" (people row, chip My projects) | Projects filter | Projects A-2 | Daftar hanya punya `scope=mine｜all`; menyaring di klien salah pada halaman kedua | **disembunyikan** (`src/screens/projects/list/projects.screen.tsx`: tanpa people row dan param `who`; `src/data/projects.people.ts` dihapus) | **disembunyikan** (`src/screens/projects/list/projects.screen.tsx`, `src/data/projects.people.ts` dihapus; param `who` dicabut) |
| Filter Health per tingkat (`On track` / `At risk` / `Off track` terpisah) | Projects filter | Projects A-3 | Server hanya punya `perhatian=1` yang menggabung dua tingkat | **diganti** (`src/data/projects.query.ts`, `src/screens/projects/filter/projects-filter.screen.tsx`: satu sakelar "Needs attention" → `perhatian=1`) | **diganti** (`src/data/projects.query.ts`: satu opsi "Needs attention" dengan nama itu, bukan tiga yang dikarang) |
| Sort "Lowest progress" | Projects filter | Projects A-4 | `PROJECT_SORTS` tidak punya progress; progress dihitung, bukan kolom | **diganti** (`src/data/projects.query.ts` `SORTS`: Nearest deadline / Recently updated / Name (A–Z) = `due`/`recent`/`name` server) | **diganti** (`src/data/projects.api.values.ts`: "Recently updated" (`sort=recent`) menggantikannya, menutup B-10 sekaligus) |
| Cari pada **deskripsi** proyek | Projects daftar | Projects A-6 | `q` server hanya nama; `description` hanya ada di detail. Placeholder perlu diubah jadi "Search project name…" | **disembunyikan** (`src/screens/projects/projects.strings.ts` placeholder "Search project name…"; `q` dikirim ke server, maks 100 karakter) | **disembunyikan** (`src/screens/projects/projects.strings.ts`: placeholder sudah "Search project name…", menjanjikan yang dicari saja) |
| Persen fase berjalan ("Now: Development · 60%") | Project detail plan | Projects A-11 | Server tidak punya "persen fase". Angkanya akan berubah dari sampel, jadi perlu keputusan | **diganti** (`src/data/projects.view.ts` `getProjectSteps`: `doneCount/taskCount` fase berjalan dari `GET /projects/:id/plan`; fase tanpa tugas = tanpa persen) | — |
| Kartu Inbox "Meeting outcomes need your confirmation" + lead AI | Inbox | Home A-14 | Tidak ada `kind` seperti itu di katalog notifikasi | **disembunyikan** (`src/data/inbox.ts`: tidak ada lead `ai`; satu kartu = satu kartu server, `kind` tak dikenal ikut tersembunyi) | **disembunyikan** (`src/data/inbox.ts`: tidak ada lagi lead `ai`; satu kartu = satu kartu server) |
| `why` (alasan Admin jadi reviewer) di kartu review | Inbox | Home A-15 | Kartu review masih `shipped: false`; ikut S4 | **disembunyikan** (`src/data/inbox.ts`: `InboxCard` tidak punya bidang `why`) | **disembunyikan** (`src/data/inbox.ts`, `src/screens/inbox/inbox-card.tsx`: bidang `why` dicabut) |
| Kartu Approvals agregat ("2 new users awaiting approval") + tumpukan avatar | Inbox | Home A-13 | Server mengirim **satu kartu per akun**. Merangkumnya di klien berarti menulis kalimat kedua di samping `sentence` server — dua sumber kalimat yang pasti melenceng (K5) | **disembunyikan** (`src/data/inbox.ts`, `src/screens/inbox/inbox-card.tsx`: satu kartu `user_pending` per akun, kalimat server apa adanya) | **disembunyikan** (`src/data/inbox.ts`, `inbox-card.tsx`: `AvatarStack` tidak dipakai lagi di Inbox) |
| Chip **In Progress** dan sub-barisnya `next due` | Beranda | Home A-4 | `counters.inProgress` dihitung atas **proyek yang saya kelola**, bukan tugas saya, dan `nextDue` tidak ada di payload mana pun | **diganti** (`src/data/home.stats.ts`: angka `tasks/counts` `byStatus.in_progress` milik saya; sub-baris "assigned to me" / "none started", bukan `next due` yang tak ada sumbernya — H-2) | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.types.ts`: `StatKey` tinggal dua) |
| Chip **Completed · this week** | Beranda | Home A-5 | `done.total` menghitung seluruh proyek saya, bukan tugas saya; `tasks/counts` tidak punya batas minggu | **diganti** (`src/data/home.stats.ts`: tampil dengan arti server, sub-baris "this week · my projects" — keputusan koordinator H-3, 28 Okt) | **disembunyikan** (sama) |
| Chip **Upcoming · N items** | Beranda | Home A-6 | "Sisa bulan ini" tidak ada definisinya di server; menjumlahkan tugas + acara di klien adalah angka karangan | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Active · projects** | Beranda | Home A-7 | `counters` tidak memfilter status proyek | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Overdue · tasks** (se-workspace) | Beranda | Home A-8 | Beranda sengaja berlingkup "proyek saya" (`home.scope.ts`); angka se-workspace tidak ada | **disembunyikan** (`src/data/home.stats.ts`) | **disembunyikan** (sama) |
| Chip Admin **Awaiting · users** dan baris "Approve N new users" di My Focus | Beranda | Home A-9 | Server mengirimnya sebagai kartu Inbox `user_pending`; tidak ada hitungan terpisah | **disembunyikan** (`src/data/home.stats.ts`, `src/screens/home/sections/focus.section.tsx`) | **disembunyikan** (`src/data/home.stats.ts`, `src/data/home.focus.ts`, `src/screens/home/sections/focus.section.tsx`) |
| Teks lokasi acara ("Meeting Room 2") di kartu agenda | Beranda | Home A-10 | `HomeAgendaItem` hanya punya `locationType`; lokasinya tidak di kabel | **disembunyikan** (`src/data/home.types.ts`: `AgendaEvent` tanpa `place`) | **disembunyikan** (`src/data/home.types.ts`: `AgendaEvent.place` dicabut) |
| **Lead** proyek di baris agenda ("Lead Nico · Due Oct 31") | Beranda | Home A-11 | `HomeProject` tidak punya lead | **disembunyikan** (`src/screens/home/sections/agenda.section.tsx`) | **disembunyikan** (`src/data/home.focus.ts`, `src/screens/home/sections/agenda.section.tsx`) |
| Pil **status siklus hidup** proyek ("Active"/"Done") di baris agenda | Beranda | Home A-12 | Payload home mengirim `condition` + `reason` (kesehatan), bukan status. Diganti pil `condition` + alasannya, bukan dihilangkan | **diganti** (`src/screens/home/parts/condition-pill.tsx` + `reason` server di barisnya sendiri) | **diganti** (`src/screens/home/parts/condition-pill.tsx`) |
| Kolom tanya bebas Ask Data ("Type or say a question…") + tombol **Ask** | Beranda | — (bukan GAP yang ditunda: `server/home/home.ask.ts` memang hanya menjawab 3 pertanyaan tetap, tanpa LLM) | Kolom yang tampak bisa ditanyai apa saja adalah janji yang tidak ada yang menepati | **disembunyikan** (`src/screens/home/sections/ask.section.tsx`) | **disembunyikan** (`src/screens/home/sections/ask.section.tsx`: tiga pil pertanyaan + jawabannya) |
| **Aksi per baris** di tab Tugas proyek ("Start working", "Request review", "Review", "View" untuk Member) | Project detail tab Tugas | — (bukan GAP server: `can` dan `primary` **ada** di baris) | Tulisannya milik modul Tugas dan belum tersambung ke layar ini, dan detail tugas yang didarati masih sampel. Tombol yang melaporkan kerja yang tidak dilakukannya lebih buruk daripada tidak ada tombol | **disembunyikan** (seluruh tab Tugas proyek disembunyikan, lihat baris "Tab **Tasks** di detail proyek") | **disembunyikan** (`src/screens/projects/detail/task-card.tsx`, `tasks.tab.tsx`: kartu membuka tugas) |
| Sakelar **List / Kanban** di tab Tugas proyek | Project detail tab Tugas | — (bukan GAP server) | `TaskBoard` memindahkan kartu lewat store sampel (`useMoveMenu`), jadi papan berisi baris server akan menelan setiap geseran tanpa jejak. Menunggu tulisan server modul Tugas | **disembunyikan** (sama: tab Tugas proyek disembunyikan) | **disembunyikan** (`src/screens/projects/detail/tasks.tab.tsx`: hanya daftar) |
| **Project settings** di menu ⋯ | Project detail | Projects A-12 | `can.manageKinds` ada, tetapi tidak ada rute `/api/app` untuk task kind sama sekali, jadi layar di belakangnya hanya bisa menampilkan sampel | **disembunyikan** (`src/screens/projects/detail/project-menu.tsx`: menu ⋯ tinggal Edit project + Move to Trash; rutenya tetap terdaftar tanpa pintu masuk. Kembali bersama tab Tugas proyek setelah modul Tugas di-commit — keputusan koordinator 28 Okt) | **disembunyikan** (`src/screens/projects/detail/detail-header.tsx`: `projectMenu` tinggal Edit + Move to Archive; rutenya masih terdaftar tapi tanpa pintu masuk) |
| Cek **nama proyek ganda** ("A project with this name already exists.") | Project Edit, Form | — (bukan GAP server: aturannya memang tidak ada) | `project.name` tidak punya unique constraint (`server/db/schema.project.ts`) dan tugas menunjuk `projectId`, jadi dua proyek boleh senama. Aturannya akan menolak nama yang server terima | **dihapus** (`src/screens/projects/edit/project-edit.screen.tsx`, `new/form.screen.tsx`: tanpa cek nama; alasan Save mati di Edit kini "Nothing has changed yet.". `projectNameTaken` di `projects.state.ts` tinggal dipakai store sampel dan tesnya) | **dihapus** (`src/screens/projects/edit/project-edit.screen.tsx`; alasan Save mati kini "Change something first.") |
| **"Impact of change"** di sheet Extend deadline | Project Extend | Projects A-10 | Tidak ada endpoint pratinjau; versi klien (menghitung tugas di halaman yang kebetulan dimuat) benar untuk sepotong dan terbaca sebagai total | **disembunyikan** (`src/screens/projects/sheets/extend.screen.tsx`: tanpa kotak Impact; `EXTEND.impact` dicabut) | **disembunyikan** (`src/screens/projects/sheets/extend.screen.tsx`) |
| Opsi alasan kelima **"Estimate was off"** di Extend deadline | Project Extend | — (bukan GAP server) | Server menyimpan **empat** kategori (`WireExtensionReason`); opsi kelima akan dicatat sebagai salah satu dari empat itu. Kata-katanya kini diambil dari `EXTENSION_REASONS`, yaitu enum-nya sendiri | **dihapus** (`src/screens/projects/sheets/extend.screen.tsx`: RadioList dari `REASON_CHOICES` di `src/data/projects.form.ts` = empat kategori `EXTENSION_REASON`; `EXTEND.reasons` dicabut) | **dihapus** (`src/screens/projects/sheets/extend.screen.tsx`, `projects.strings.ts`: `EXTEND.reasons` dicabut) |
| **"+ Phase"** dan **"+ Milestone"** | Project detail tab Fase | — (bukan GAP server: rutenya ada) | Kedua rute ada, tetapi belum ada formulirnya di sisi ini; digambar sebagai tombol yang hanya berkata "nanti" adalah janji yang belum ditepati | **disembunyikan** (`src/screens/projects/detail/phases.tab.tsx`: tanpa + Phase / + Milestone; tulisan yang ada hanya Start/Complete fase lewat `PATCH /projects/:id/phases/:phaseId`) | **disembunyikan** (`src/screens/projects/detail/phases.tab.tsx`) |
| **"+ Member"** di form New project | `projects/new/form` | Projects B-11 | Tombolnya memilih dari daftar yang sudah ditampilkan seluruhnya; memilih orang **di luar** picker butuh pencarian yang rutenya tidak punya | **disambung** (`src/screens/projects/new/form-members.tsx` + `parts/people-picker.tsx`: cari nama lewat `GET /api/app/team/picker?q=`, maks 50 anggota; GAP-nya tidak berlaku lagi karena picker server punya `q`) | **disembunyikan** (`src/screens/projects/new/form-members.tsx`) |
| Pilihan lingkup **"Semua / Punya saya"** (`scope=all`) di daftar proyek | Projects daftar | Projects **B-17** | Bukan GAP yang ditunda: parameternya **sudah ada dan jalan** (`server/api/app-projects.ts`), clamp Member di `access/project.policy.ts`. Ini kapabilitas server yang mobile belum ambil, seperti `sort=recent` (B-10). Daftar selalu mengirim `scope=mine` | **disambung** (`src/data/projects.query.ts` `listPath`: selalu `scope=all`; server mempersempit Member ke proyeknya sendiri) | **belum diambil** (`src/data/projects.ts` `listParams`) |
| Jumlah **anggota** di kartu daftar proyek ("4 members") | Projects daftar | — (bukan GAP yang ditunda) | `ProjectListItem` tidak membawa daftar anggota; barisnya tentang proyek, bukan orangnya. Nama terbaca kartu kini berhenti di "Due …" | **dihapus** (`src/screens/projects/list/project-card.tsx`: tanpa jumlah dan tanpa avatar anggota — keputusan 28 Okt) | **dihapus** (`src/screens/projects/list/project-card.tsx`) |
| Catatan gelembung di Profil (`note`) | Profil | Home A-21 | Tidak ada kolom maupun bidang di `ProfileView` | **disembunyikan** (W3-Profil 28 Okt: `src/screens/profile/profile-hero.tsx` tanpa gelembung; `profile-note.tsx` dan `src/data/profile.store.ts` dihapus) | **disembunyikan** (`src/screens/profile/profile-hero.tsx`; `profile-note.tsx` + `src/data/profile.store.ts` dihapus — catatan yang hanya hidup di satu ponsel bukan catatan profil) |
| Presence **Online/Offline** dan klaim "Teammates see you as Online" | Profil | Home A-22 | Tidak ada presence di server. Menampilkannya sebagai lokal = klaim palsu | **disembunyikan** (W3-Profil 28 Okt: `src/screens/profile/profile-hero.tsx` tanpa titik presence, `profile.screen.tsx` tanpa baris "Show me as online"; token tema `presence` dihapus 28 Okt dari `src/theme/tokens.ts` `MOBILE_STATUS`, `theme-roles.ts`, `global.css` dan `contrast.test.ts`, pulihkan dari `09c01dd0`) | **disembunyikan** (`src/screens/profile/profile.screen.tsx`, `profile-hero.tsx`: titik presence, switch "Show me as online" dan barisnya dicabut) |
| Satu switch "Mute notifications" | Profil | Home A-23 | Server punya **dua** switch dan kartu `action` tidak bisa dibisukan; satu switch akan bohong | **diganti** (W3-Profil 28 Okt: switch Mute dicabut dari `src/screens/profile/profile.screen.tsx`; dua switch `eventReminder`/`inboxNews` ada di Settings, `src/screens/settings/settings-parts.tsx` `NotificationSwitches`, `GET/PUT /api/app/profile/notifications`; flip tampil langsung dan kembali dengan alasan bila ditolak) | **diganti** (`src/screens/profile/profile.screen.tsx`: dua switch `eventReminder`/`inboxNews` dari `GET/PUT /api/app/profile/notifications`, plus catatan bahwa kartu yang butuh jawaban selalu datang) |
| Baris fakta "Account role" untuk non-Admin | Tim person | Home A-19 | Server sengaja tidak mengirimnya (privasi) → sembunyikan saat kuncinya absen | **disembunyikan** (`src/data/team.person.ts` `toPerson()`: baris fakta hanya dibuat kalau kunci `accountRole` ada) | **disembunyikan** (`src/data/team.person.ts`: barisnya hanya dibuat kalau kunci `accountRole` ada) |
| Pil hijau **"Available"** di baris Tim dan di Tim person | Tim | **G2-TPA1 (baru)** | `availability: null` berarti "tidak ada yang perlu ditampilkan", **bukan** "sedang ada" (`server/team/team.dto.ts`), dan catatan cuti Admin sengaja tidak dikirim (P14 D6). Mengarang "Available" dari kunci kosong = app ini menyatakan hal yang server menolak menyatakannya | **disembunyikan** (`src/data/team.ts` `leaveText()` — nama fungsinya kini `leaveText`, bukan `availabilityText()` — dan `src/screens/team/person-row.tsx`: hanya cuti yang tampil) | **disembunyikan** (`src/data/team.ts` `availabilityText()`, `src/screens/team/person-row.tsx`: cuti tampil muted, selain itu baris statusnya tidak ada) |
| Pemilih **All projects** di daftar Tim | Tim | **G2-TPA2 (baru)** | `?projectId=` ada di server, tapi daftar proyek mobile masih data contoh dan id-nya bukan id server → daftar kosong tanpa sebab yang terlihat. Sama dengan G1-T1 di tab Tugas; hidup lagi begitu modul Proyek memakai `/api/app/projects` | **disembunyikan** (`src/screens/team/team.screen.tsx`: tanpa pemilih proyek; Sort aktif sebagai `?sort=` lewat `src/data/team.api.ts`) | **disembunyikan** (`src/screens/team/team.screen.tsx`: pemilihnya dicabut; pemilih Sort yang dulu dekoratif justru **diaktifkan** jadi `?sort=`) |
| Jumlah **active/overdue** di baris ringkasan Tim setelah "Load more" | Tim | **G2-TPA3 (baru)** | `summary.active/overdue` menjumlahkan **satu halaman**, bukan seluruh tim (`server/team/team.dto.ts`). Setelah halaman kedua, angka yang ada hanya menggambarkan halaman terakhir | **disembunyikan sebagian** (`src/data/team.ts` `summaryLine()`: dua angka hanya tampil sebelum "Load more" dan bila satu halaman = seluruh tim) | **disembunyikan sebagian** (`src/data/team.ts` `summaryLine()`: dua angka itu hanya tampil kalau satu halaman = seluruh tim) |
| Daftar **nama proyek** yang tidak dibagi di Tim person (`tasks.hidden`) | Tim person | Home A-17 | Nama proyek sengaja tidak dikirim (privasi D10); hanya `alsoElsewhere` yang datang | **diganti** (`src/data/team.person.ts` `elsewhere` + `src/screens/team/team.strings.ts` `PERSON.elsewhere()`: kalimat tanpa nama proyek) | **diganti** (`src/data/team.person.ts` `elsewhere`: kalimat tanpa nama proyek) |
| Garis merah **"now"** di grid jam My calendar | Profil kalender | **G2-TPA4 (baru)** | `SessionClock` hanya membawa **tanggal** dan zona, tidak ada instan; garisnya dulu dipatok 9:41 data contoh. Garis di menit karangan dibaca sebagai jam sekarang — lebih buruk daripada tidak ada garis. Butuh `now` di fondasi jam (lihat serah-terima §5) | **disembunyikan** (W3-Profil 28 Okt: `src/screens/profile/day-grid.tsx` tanpa garis; `NOW_MIN`/`clock()` dihapus dari `src/data/profile.calendar.dates.ts`) | **disembunyikan** (`src/screens/profile/day-grid.tsx`, `src/data/profile.calendar.dates.ts`: `NOW_MIN` dan `clock()` dihapus) |
| **Pengulangan** acara di My calendar ("every N weeks") | Profil kalender | Events (kelompok B, K6) | Recurrence ditunda di server, jadi klien tidak punya apa pun untuk dikembangkan; `repeatDays()`/`occursOn()` yang mengembangkannya sendiri jadi kode mati | **dihapus** (W3-Profil 28 Okt: `repeatDays`/`occursOn`/`eventsFor` dihapus; My calendar membaca jendela `GET /api/app/events?from=<Minggu>&to=<Sabtu>`, `src/data/profile.calendar.ts`) | **disembunyikan** (`src/data/profile.calendar.dates.ts`: sebuah acara jatuh di harinya sendiri dan tidak di hari lain) |
| Bidang `textSize` dari `/api/app/profile` | Profil | B-18 (belum dipakai, bukan ditunda) | Skala teks pengguna di app ini dipegang cookie `mk-text-size`-nya sendiri; menyelaraskan keduanya adalah pekerjaan tersendiri | belum dipakai (`src/data/profile.api.ts`: ada di tipe kabel, tidak dibaca) | belum dipakai (`src/data/profile.api.ts`: ada di tipe kabel, tidak dibaca) |
| **Hapus akun** (`GET /api/app/profile/delete-check`) | Profil | B-19 (belum ada layarnya) | Mobile tidak punya layar hapus akun di Fase 1, jadi tidak ada kontrol yang disembunyikan — hanya endpoint yang belum dipakai | rencana | belum dipakai |
| **Change photo** (`POST/DELETE /api/app/avatar`) | Profil | B-19 | Endpoint sudah ada, UI-nya belum pernah ada di layar Profil mobile (hanya disebut di peta) | **disembunyikan** (W3-Profil 28 Okt: tombol Change photo dicabut dari `src/screens/settings/profile-edit.screen.tsx`; foto yang sudah ada (sesi `user.image`) tetap tampil di Profil, Settings dan Edit profile. Keputusan koordinator 28 Okt: P-5 ditunda, butuh pemilih gambar) | belum dipakai |
| Chip **Inbox** di Beranda | Beranda | — (bukan GAP server: `GET /api/app/inbox/count` ada) | Hitungannya milik modul Inbox, yang disambung terpisah (W3 Inbox). Menampilkan hitungan kartu sampel di samping data server = dua sumber | **disambung** (`src/data/home.ts`: `homeStats(…, inboxActionCount())`; `src/screens/home/home.screen.tsx` mengambil `inboxCountResource` dan berlangganan `useInboxActionCount`) | — |
| Nama sapaan dari aturan server (nickname, `greetingName`) | Beranda | Home H-0 | `server/profile/profile.greeting.ts` tidak dikirim di `/home` | **diganti** (`src/data/home.ts` `me()`: kata pertama nama akun dari sesi, bukan baris sampel) | — |
| Status tugas di sub-baris My Focus untuk baris tanpa tombol ("· In review") | Beranda | — | `HomeFocusTask` tidak membawa `status`; tombolnya datang dari `action` server, jadi baris tanpa tombol cukup tanpa tombol | **disembunyikan** (`src/screens/home/sections/focus.row.tsx`) | — |
| Angka `counters` (`unassigned`, `inProgress`, `completed` atas proyek yang saya kelola) | Beranda | Home H-6 | Arti server ("proyek yang saya kelola") tidak cocok dengan chip prototipe mana pun, dan Beranda tidak tahu role untuk memilih siapa yang melihatnya (tanpa `whoami`) | **belum dipakai** (`src/data/home.api.ts`: ada di tipe kabel, tidak dibaca) | — |
| Pembaruan otomatis badge **Inbox** (web: polling 60 detik) | More, Profil, tab Inbox | — (bukan GAP server: `GET /api/app/inbox/count` ada) | Polling butuh pemilik siklus hidup (layout tab, dijeda lewat `AppState` saat app di latar belakang); tak satu pun layar Inbox adalah pemilik itu. Hitungan diambil saat layar dibuka dan sesudah tandai-dibaca. Hitungan yang belum datang/gagal = **tanpa badge**, bukan 0 | **ditunda** (`src/data/inbox.api.ts` `TODO(inbox-badge)`; disetujui koordinator 28 Okt) | — |
| Tombol buka di kartu Inbox yang `href`-nya `/app/settings` (kartu cuti) atau `/app/inbox` | Inbox | — (bukan GAP server) | Mobile tidak punya layar ketersediaan, dan `/app/inbox` adalah layar ini sendiri. Menebak tujuan lain = tombol yang mendarat di tempat yang salah | **disembunyikan** (`src/data/inbox.links.ts` `appHref()` → `null`; kartu Updates yang belum dibaca mendapat "Mark as read" sebagai gantinya) | — |
| Kartu Inbox dengan `kind` yang tidak dikenali (`sentence: null`) | Inbox | — (bukan GAP server) | Server tidak punya kalimat untuknya; kalimat karangan klien = sumber kalimat kedua (K5). Akibatnya angka badge (hitungan server) bisa lebih besar daripada kartu yang terlihat | **disembunyikan** (`src/data/inbox.ts` `toCard()` → `null`) | — |
| Tujuan tautan proyek / acara / tugas dari Inbox dan Tim person | Inbox, Tim person | — (bukan GAP server) | Tautannya memakai id server (`/projects/<uuid>`, `/events/<uuid>`, `/tasks/<no>`); selama layar tujuannya masih membaca data contoh, tautan bisa mendarat di "not found". Selesai sendiri begitu modul Proyek/Acara/Tugas disambung | **hutang** (`src/data/inbox.links.ts`, `src/screens/team/person.screen.tsx`) | — |
| Catatan penutup khusus Admin di Tim ("Approving new users and changing roles happens in More › Users.") | Tim | — (bukan GAP server) | Memilihnya butuh peran akun, yang belum ada sumbernya (§4.1). Catatan yang tersisa ("Task counts per person are visible only to…") kini muncul hanya saat server **tidak** mengirim `summary.active` — yaitu saat penontonnya memang tidak melihat angka itu | **dihapus** (`src/data/team.ts` `getTeam()`: `note` dari bentuk jawaban server, bukan dari `role`) | — |
| Tab **Tasks** di detail proyek (segmen Tasks dan tautan `?tab=tasks`) | Project detail | — (bukan GAP server) | Tab ini masih membaca store contoh Tugas (`src/data/projects.detail.ts` `getProjectTasks`); `tasks.ts` `sourceOf()` melempar error untuk id proyek server, jadi detail ber-id server akan pecah. Kembali setelah modul Tugas di-commit (keputusan koordinator 28 Okt) | **disembunyikan** (`src/screens/projects/detail/detail-header.tsx` `TABS`; `project-detail.screen.tsx`: `tab=tasks` membuka Overview. `tasks.tab.tsx`, `task-card.tsx`, `project-tasks-routes.tsx` dan rutenya tidak diubah) | — |
| Daftar **Tasks needing attention**, **Recent activity** dan **Deadline history** di detail proyek | Project detail Overview, Fase | — (bukan GAP server) | Ringkasan, bukan daftar lengkap: attention maks 5 per alasan (terlambat, menunggu review, jatuh tempo hari ini; tiga baca `GET /tasks?scope=project`), aktivitas 5 terbaru, riwayat tenggat 5 terbaru dengan "Showing the last 5 of N." bila lebih | **dibatasi** (`src/data/projects.overview.api.ts` `ATTENTION_PER_REASON`, `src/data/projects.api.ts` `ACTIVITY_LIMIT`/`EXTENSIONS_LIMIT`) | — |
| Item menu ⋯ proyek yang `can{}`-nya berisi kode tolak (mis. `trash: 'ROLE_CANNOT_TRASH'`) | Project detail | — (bukan GAP server) | `ActionMenu` tidak punya item nonaktif dengan alasan. Menyembunyikannya membuat orang tidak tahu kenapa aksinya tidak ada | **diganti** (`src/screens/projects/detail/project-menu.tsx`: item tetap tampil; mengetuknya memberi notice berisi alasan `capMessage(code)`, tanpa membuka sheet. Item yang kuncinya absen dari `can{}` disembunyikan) | — |
| Memulihkan proyek dari **Sampah** setelah snack Undo lewat | Project detail, Archive | — (bukan GAP server: `POST /api/app/trash/project/:id/restore` ada) | Mobile belum punya layar Sampah; layar Archive masih membaca store sampel, jadi proyek server yang dibuang tidak muncul di sana | **disambung** (W3-Sampah 28 Okt: More › Trash, `src/screens/trash/trash.screen.tsx`; pulihkan lewat `POST /api/app/trash/:kind/:id/restore`) | — |
| Tab **Tasks** di detail proyek kembali (menyusul baris "Tab Tasks di detail proyek") | Project detail | — (bukan GAP server) | Tab membaca `GET /tasks?scope=project&projectId=…` lewat resource daftar Tugas yang sama (`useTasksList` / `useTasksBoard`, scope `project:<id>`); Kanban menggeser di server (`moveCards`); Assignee "Me" dikirim sebagai `assigneeId=<akun>`. Segmen Tasks dan `?tab=tasks` dibuka lagi | **diganti** (`src/screens/projects/detail/tasks.tab.tsx`, `project-detail.screen.tsx`, `detail-header.tsx` `TABS`; `src/data/projects.detail.ts` dihapus) | — |
| Tombol per kartu di tab Tasks proyek ("Request review", "Review", "Reopen") | Project detail Tasks | T-1 (review); Reopen butuh alasan | Tombol kartu hanya menjalankan `primary` server yang bisa diketuk langsung **dan** diizinkan `can{}`: Start working, Mark done, Restore. Reopen (wajib alasan, sheet di detail) dan langkah review (S4) jatuh ke **View**, yang membuka detail tugas | **diganti** (`src/data/tasks.card.ts` `cardStep`, `src/screens/projects/detail/task-card.tsx`) | — |
| Catatan "Tasks are in Archive with the project." untuk proyek di Arsip | Project detail Tasks | — (bukan GAP server) | Proyek di Sampah menjawab 404, jadi detailnya tidak terbuka sama sekali; daftar server adalah kebenarannya. + New task mengikuti `can.createTask` detail: ada = aktif, kode = kelabu dengan alasan (`capMessage`), absen = disembunyikan | **dihapus** (`src/screens/projects/detail/tasks.tab.tsx` `TasksTools`, `ADDED.archivedTasks` dihapus) | — |
| Project settings `projects/[id]/settings` | Project settings | T-7 / P-9 | Masih layar contoh (`TasksSettings` dengan `SESSION_ROLE`); tidak ada tautan ke sana dari layar mana pun, jadi hanya terbuka lewat deep link | rencana (`src/screens/projects/settings/project-tasks-routes.tsx`) | — |
| Pemilih jalan New project, alur **Story → Draft ✦** dan **Template** (P-10) | `projects/new/{choose,story,draft,template}` | Projects P-10 (A-16) | Tidak ada endpoint AI, endpoint "proyek + rencana sekaligus", atau tabel template, dan fitur AI disembunyikan secara bawaan. Ketiga layar tetap sampel tanpa pintu masuk; Create sheet, tombol + dan `/projects/new` sudah membuka Form | **dihapus** (rute `app/projects/new/{story,draft,template}.tsx`; layar `src/screens/projects/new/{new,story,draft,template}.screen.tsx` + `create-done.ts`; data `src/data/projects.ts` (`getProjectCreate`, `templateDates`) dan `PROJECT_STORY`/`PROJECT_TEMPLATES`/`TEMPLATE_PROJECT` di `sample/projects.extra.ts`; string `CREATE.ways`/`STORY`/`DRAFT`/`TEMPLATE`, `WHY.story`/`template`, `NAMES.choose`; `Ai`/`Info` (`parts/display.tsx`) dan `CheckRow` (`parts/form-bits.tsx`); tes `projects.create.test.tsx`, `projects.qa.test.tsx`; `projects.story`/`draft`/`template` di `screen-roles.ts`. Sub-baris Create sheet kini "Name, dates and members". Pulihkan dari git: `106a33c3` (HEAD sebelum penghapusan) | **masih sampel** (`2a985b7^`: `src/data/projects.sample-form.ts`) |
| Layar **Archive** (sampel, tanpa sisa hari) | More › Archive | Profil/Arsip A-1 | Server punya **Sampah** (dihapus permanen setelah masa simpan), bukan arsip; nama "Archive" menjanjikan simpanan selamanya | **diganti** (W3-Sampah 28 Okt: `src/screens/trash/*`, `src/data/trash.{api,view,wire,write}.ts`: daftar proyek/tugas/acara dari `GET /api/app/trash`, sisa hari, pulihkan, Hapus permanen T3 hanya bila `can.purge === true`. Rute tetap `/more/archive`, `[key]` = `<kind>-<id>`. `src/data/archive.ts`, `src/screens/archive/*` dan tesnya dihapus) | — |
| Grup **Team settings (Admin only)**: AI features, Recording retention, Default event reminder, Roles and permissions | Pengaturan | S-1 | `/api/app` tidak punya satu pun setelan itu; di web milik `/dashboard/settings` dan Super-admin | **disembunyikan** (W3-Profil 28 Okt: `src/screens/settings/settings.screen.tsx`; `team-settings.tsx` dan `src/data/settings.ts` dihapus. Footer menyebut Users saat `caps.dashboard`) | — |
| Bidang **Phone** | Edit profile | P-4 | Server punya `phone`, form prototipe tidak pernah punya; menambahnya fitur baru, bukan penyambungan | belum dipakai (`src/data/profile.api.ts`: ada di tipe kabel, tidak dikirim) | — |
| **Hapus akun** orang lain (`DELETE /api/admin/users/:id`, T3 ketik email) | Users › Roles | — (bukan GAP server: rutenya ada, khusus Super-admin, `NOT_APP_ROLE`) | Tidak ada di prototipe; Admin (pemakai utama layar ini) pasti ditolak. Keputusan koordinator: kalau ragu, sembunyikan dulu | **disembunyikan** (`src/data/users.admin.write.ts` tidak menawarkannya) | — |
| Chip **Approved** dan **Rejected** di Users › Approval | Users | **U-2 (baru)** | `GET /api/admin/users/stats` hanya membawa `pending` dan `banned` (plus total/admin/verified/new7d/active24h); menghitung sendiri dari daftar berhalaman = angka salah | **dihapus** (`src/screens/users/approval.tab.tsx`: chip Pending + Deactivated dari stats) | — |
| **Jabatan / divisi** pendaftar di kartu persetujuan | Users › Approval | **U-3 (baru)** | Daftar `/api/admin/users` tidak membawa `jobTitle`/`department` | **dihapus** (`src/screens/users/approval.cards.tsx`: nama, waktu daftar, email) | — |
| Izin **per baris** di Users › Roles (pemilih peran, Deactivate/Reactivate) | Users › Roles | **U-4 (baru)** | Daftar admin tidak mengirim `can{}` per baris. Mobile **mencerminkan** `server/access/user.policy.ts` (bukan diri sendiri, bukan Super-admin, Admin hanya oleh Super-admin; Admin memberi Member/PM saja). Server tetap memutuskan; 403-nya ditampilkan apa adanya di dialog | **diganti** (`src/data/users.admin.view.ts` `accountRow`; baris yang ditolak tampil baca-saja) | — |
| "Acara saya" di My calendar | Profil kalender | Profil C-1 | Server tidak punya "my events"; item daftar tidak membawa pembuat. Acara yang saya buat tapi tidak saya ikuti tidak muncul | **diganti** (`src/data/profile.calendar.ts` `blocksOn`: `participants.isParticipant`) | — |
| Edit profil di layar **Pending** (Full name, Nickname, Job title, Division, Save profile) dan **Change photo** | Auth ③ Pending | — (bukan GAP yang ditunda: server sengaja menutupnya) | Akun berstatus pending ditolak di gerbang `/api/app/*` (`server/api/app-context.ts` → `403 ACCOUNT_PENDING`), jadi `PATCH /api/app/profile` tak bisa dipakai sebelum disetujui; halaman tunggu web (`app/routes/waiting.tsx`) juga tanpa form profil. Save sebelumnya hanya memunculkan notice tanpa menulis apa pun; Change photo ikut P-5 | **disembunyikan** (28 Okt: `src/screens/auth/pending.screen.tsx` tinggal kartu status, Check status, Sign out; string form dicabut dari `auth.strings.ts`; pulihkan dari `09c01dd0`) | — |
| Project settings `projects/[id]/settings` (menyusul baris T-7 / P-9 di atas) | Project settings | T-7 / P-9 / A11 | Tidak terjangkau (⋯ menyembunyikannya) dan server tidak punya rute jenis tugas maupun PATCH default review, jadi **dihapus** | **dihapus** (W3-Tasks 28 Okt: `app/(tabs)/projects/[id]/settings.tsx` + entri `_layout`, `src/screens/tasks/settings/`, `src/data/tasks.settings.ts`, `src/data/sample/tasks.settings.ts`, string `P` dan `DETAIL.settings`; `project-tasks-routes.tsx` kini hanya `ProjectTaskFilterScreen`; acuan pemulihan `09c01dd0`) | — |

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

**Keadaan 28 Okt 2026 (gerbang per layar).** `src/navigation/screen-roles.ts` (`allowedScreen`, peta
role per layar, `SCREEN_IDS`/`ScreenId`) dan tesnya **dihapus**: pemanggil terakhirnya sudah diganti
`caps`/`can{}` server. Id prototipe yang tersisa hanya kunci `CREATE_ROUTES` (`create-href.ts`) dan
`root` di `tabs.config.ts`; `__tests__/node/route-files.test.ts` menjaga keduanya punya berkas
rute di `app/`. `SESSION_ROLE` **masih** diimpor `src/data/viewer.ts`,
`src/screens/tasks/settings/tasks-settings.screen.tsx`, `src/screens/projects/settings/project-tasks-routes.tsx`,
`src/screens/events/outcomes/outcomes.screen.tsx` dan `__tests__/navigation/tab-bar.more.test.tsx`.

**Lunas (28 Okt 2026, setelah `09c01dd0`).** Pemakai `SESSION_ROLE` yang tersisa sudah pergi
(layar Outcomes dihapus di langkah Acara; layar sampel Tugas/Proyek dicabut 34). `viewer.ts` tak
punya pemakai produksi lagi, jadi **dihapus** bersama `src/data/session.ts` (`SESSION_ROLE`),
`src/data/people.ts` (`person`/`me`/`listPeople`/`ROLE_LABEL`/`ROLE_TAG`), `src/data/sample/people.ts`
dan `people.extra.ts`, serta tesnya (`__tests__/data/viewer.test.ts`, `__tests__/kit/people.test.ts`);
mock `SESSION_ROLE` di `tab-bar.more.test.tsx` dicabut. Peran kini hanya datang dari `caps` whoami;
tipe `Role` uji pindah ke `__tests__/helpers/whoami-fixtures.ts`. Kontrak "cocokkan orang hanya
lewat `samePerson`" (K4) tidak berlaku lagi: semua modul membandingkan `userId` dari DTO server.
Pulihkan dari `09c01dd0`.

### 4.2 `moveOnBoard()` masih menerima `PersonInfo` dari layar

`src/data/tasks.store.ts` `moveOnBoard(viewer: PersonInfo, …)` menerima orang dari layar. Layar
seharusnya tidak perlu mengoper orang sama sekali: begitu papan Tugas membaca server, sisi mana yang
boleh adalah jawaban `can{}` kartu itu, dan fungsi ini pergi bersama `tasks.store.ts`.

**Keadaan 28 Okt 2026 (tab Tasks proyek):** `moveOnBoard()` dan `moveTasks()` **dihapus**. Kedua papan
(tab Tugas dan tab Tasks proyek) menggeser lewat `moveCards` (`src/screens/tasks/list/tasks-body.tsx`);
`TaskBoard` tidak lagi menerima `role`, dan `onMove` wajib.

### 4.3 `resource()` tidak bisa memuat halaman berikutnya

`src/data/resource.ts` menyimpan **satu** nilai dan `load` tidak menerima argumen. Daftar ber-cursor
(Inbox `?lane=…`, Tim, Tugas) karenanya hanya bisa memuat halaman pertama. Fase 2 lama menuliskan
batas itu di layar ("Only the newest cards/updates are loaded.") ketika `nextCursor` masih ada,
alih-alih diam-diam berhenti — **jangan** menghitung total dari halaman yang kebetulan dimuat.
Menambah paginasi mengubah kontrak fondasi bersama; keputusannya milik koordinator, bukan satu
modul sendirian.

**Keadaan W3 (28 Okt 2026):** Inbox dan Tim memuat halaman berikutnya **per modul**, tanpa mengubah
`resource.ts` (disetujui koordinator). Polanya ada di `src/data/inbox.api.ts` (`laneResource`) dan
`src/data/team.api.ts`: resource menyimpan **semua** halaman yang sudah dimuat; flag `more` di modul
dibaca di awal `load()` untuk meminta halaman ber-cursor dan menambahkannya; reload biasa meminta
halaman pertama dengan `limit` = jumlah yang sedang tampil (di-clamp ke batas server), dan
`BAD_CURSOR` saat memuat lebih jatuh kembali ke halaman pertama. `resource()` generik yang menerima
argumen/halaman **masih belum ada**; modul lain (Tugas) bisa menyalin pola ini atau menunggu
keputusan fondasi.

### 4.4 Jalur sampel Tugas yang masih hidup untuk modul lain (W3-Tasks, 28 Okt 2026)

Tab Tugas membaca server (`src/data/tasks.list.ts`, `tasks.api.ts`, `tasks.card.ts`). Store contoh
`src/data/tasks.store.ts` / `tasks.state.ts` dan `getTasksList` (`src/data/tasks.ts`, kini hanya
lingkup `project:<id>`) **tetap hidup** karena modul yang belum disambung masih membacanya. Ditandai
`TODO(mobile-W3-projects/events)` di `src/data/tasks.ts`; hapus jalur ini begitu daftar di bawah
kosong. Pengimpornya (per 28 Okt, saat modul Proyek sedang disambung):

- **Proyek:** `src/data/projects.detail.ts` (`getTasksList`, `taskCard`, `isOpen`, `getTasksState`),
  `src/data/projects.store.ts` (`takeProjectTasks`/`putTasksBack`, ganti nama, `forgetProjectTasks`),
  `src/screens/projects/detail/tasks.tab.tsx` (`resetQuery`, `TaskBoard`, `TasksSearchField`),
  `src/screens/projects/settings/project-tasks-routes.tsx` (`TasksFilterPanel`, `TasksSettings`),
  `src/screens/projects/detail/task-card.tsx` (tipe `TaskCard`), `src/data/projects.state.ts` (tipe `Task`).
- **Acara:** `src/data/events.store.ts` (`addTask`), `src/data/events.results.ts` (`getTask`),
  `src/screens/events/results/results.screen.tsx` (`useTasks`).
- **Arsip / Profil:** `src/data/archive.ts` (`forgetArchivedTask`), `src/data/profile.calendar.dates.ts` (`CLOCK`).

Komponen bersama (`TaskBoard`, `TasksFilterPanel`, `TasksSearchField`) menerima prop opsional yang
**bawaannya perilaku sampel** (`onMove` → `moveOnBoard`, `canAdd = true`, placeholder lama untuk
lingkup proyek), supaya tab Tugas proyek tidak berubah sampai modul Proyek memakainya.

Satu hal di luar berkas Tugas: tombol **"+" New task** di bar tab (`src/navigation/tab-create.ts`
`createFor`) masih memilih dari peran sampel, bukan `caps.createTask` server. Tombol "New task" di
dalam layar Tugas sudah mengikuti `caps.createTask`.

**Keadaan setelah tab Tasks proyek (28 Okt 2026).** Tab Tasks proyek membaca server, jadi jalur
daftar sampel **dihapus**: `getTasksList`/`taskCard`/`sourceOf` (`src/data/tasks.ts` kini hanya
re-export; TODO-nya ikut hilang, penandanya pindah ke kepala `src/data/tasks.store.ts`),
`getProjectTasks` + `src/data/projects.detail.ts`, `applyQuery`/`searchTasks` (`tasks.query.ts`),
`moveOnBoard`/`moveTasks`/`editTask`, `forgetArchivedTask`/`forgetProjectTasks` (`tasks.store.ts`),
`forgetArchivedProject` (`projects.store.ts`), helper sampel `mayChange`/`deniedNotice`/`whoLabel`/
`note`/`stepsDone`/`dueIn`/`fullName` (`tasks.shared.ts`), serta id `tasks.edit`/`tasks.return`/
`archive.*` di `src/navigation/screen-roles.ts`. Paragraf "Komponen bersama … bawaannya perilaku
sampel" di atas tidak berlaku lagi: `TaskBoard` wajib `onMove`, `TasksSearchField` tak punya
`inProject`. Yang **masih** mengimpor store contoh Tugas:

- **Acara (0b):** `src/data/events.store.ts` (`addTask`), `src/data/events.results.ts` (`getTask`),
  `src/screens/events/results/results.screen.tsx` (`useTasks`).
- **Proyek:** `src/data/projects.store.ts` (`takeProjectTasks`/`putTasksBack`/`renameProjectTasks`,
  dipakai Edit/Arsip proyek sampel yang tersisa).
- **Layar Tugas sampel:** Project settings (`tasks.settings.ts`, T-7), Import CSV dan Just write
  (`tasks.write.ts`, T-6), lewat `src/data/tasks.ts`.
- **Profil:** `src/data/profile.calendar.dates.ts` (`CLOCK` dari `tasks.shared.ts`).
- **Arsip lama:** `src/data/archive.ts` masih mengimpor `forgetArchivedTask`/`forgetArchivedProject`
  yang sudah dihapus; berkas itu dan `__tests__/archive/archive.test.tsx` sedang dihapus 0b (Trash).
  `src/screens/archive/delete.screen.tsx` masih memanggil `allowedScreen('archive.delete')`, yang kini
  selalu `false`. `archive.store.ts` masih diimpor `tasks.store.ts`, `tasks.store.edit.ts`, dan
  `projects.store.ts`.

`moveTask` (`tasks.store.ts`) kini hanya dipakai tesnya; ia pergi bersama store begitu Acara lepas.

**Keadaan setelah W3 Profil, Sampah, Users (28 Okt 2026).** `src/data/archive.ts`,
`src/screens/archive/*` dan `__tests__/archive/archive.test.tsx` **sudah dihapus**; Profil tidak lagi
mengimpor `CLOCK` (`profile.calendar.dates.ts` hanya tanggal dan label). `archive.store.ts` tetap
hidup untuk `tasks.store.ts`, `tasks.store.edit.ts` dan `projects.store.ts`.

**Acara lepas dari store contoh (28 Okt 2026, setelah `09c01dd0`).** Alur Rekaman → Outcomes →
Results (A8) tak terjangkau lagi, jadi **dihapus**, bukan disembunyikan: rute
`app/(tabs)/events/[id]/{record,recording,results}.tsx` + `outcomes/[step].tsx` (dan entrinya di
`events/_layout.tsx`), layar `src/screens/events/{record,results,outcomes}/`,
`src/screens/events/events.strings.outcomes.ts`, `src/data/events.store.ts`,
`src/data/events.results.ts`, `src/data/sample/events.ts` + `events.extra.ts`; ikut dipangkas yang
hanya dipakai alur itu: `eventHref`/`eventProject`/`eventStatus`/`eventStart`/`eventEnd`/
`eventWhere`/`EventItem`/`REPEATS`/`REPEAT_DAYS` (`events.shared.ts` kini hanya `TYPES` dan tipe
nama), `occursOn`/`eventsOn`/`occurrenceStatus`/`startMinutes`/`firstDate` (`events.dates.ts`),
`dueDates` (`events.form.ts`), `Ai`/`AiNote` (`parts/event-parts.tsx`), `AI_LABEL`,
`SPOKEN.draftAction`. Tes yang ikut pergi: `events.flow`, `events.outcomes`, `events.store`,
`events.strings`; `events.dates`/`events.query` kehilangan kasus berbasis sampel. **Acara tidak lagi
mengimpor `tasks.store`** (`addTask`/`getTask`/`useTasks`). Acuan pemulihan: `09c01dd0`
(`git show 09c01dd0:mobile/<path>`).

**`src/data/sample/` setelah langkah ini.** Yang tersisa: `projects.ts`/`projects.extra.ts` dan
`tasks.ts`/`tasks.extra.ts` (milik Tugas/Proyek), `archive.ts` (hanya `archive.store.ts`, yang hanya
dipakai `tasks.store*.ts`/`projects.store.ts` — pergi bersama store itu), dan `today.ts` (uji saja,
`__tests__/helpers/clock-fixtures.ts`). Bagian Acara, Profil, Inbox, Tim dan Admin tidak punya sisa
di `sample/`. Peta `phase1-screens.md` (K12, `MOBILE_STATUS.presence`) sengaja tidak disunting: itu
catatan Fase 1.

**Store contoh Tugas/Proyek dihapus (W3-Tasks, 28 Okt 2026, setelah `09c01dd0`).** Daftar pengimpor
di atas sudah kosong: Acara lepas (0b), Project settings dan CSV dihapus, Just write membaca server.
Karena itu **dihapus**: `src/data/tasks.store.ts`, `tasks.store.edit.ts`, `tasks.state.ts`,
`archive.store.ts`, `projects.store.ts`, `projects.state.ts`, `tasks.write.ts`, `tasks.ts`, dan
seluruh `src/data/sample/` kecuali `today.ts` (uji saja): `tasks.ts`, `tasks.extra.ts`,
`projects.ts`, `projects.extra.ts`, `archive.ts`, `index.ts` (isinya tinggal re-export tiga berkas
itu). `tasks.shared.ts` kini hanya `TaskStatus`, `TaskPriority` dan `daysLate` (tipe lebar
`TaskItem`/`TaskInfo`, `nowStamp`, `whenFromDue`, `ATLAS_ID`, `TYPES` ikut pergi); `boardColumns`
(`tasks.columns.ts`) dihapus karena hanya dipakai tesnya. Tes yang ikut pergi: `tasks.store`,
`projects.store`, `kit/archive.store`, `data/tasks.projects`, kasus sampel di `tasks.shared`/
`tasks.radial`/`tasks.form`; `resetTasks`/`resetArchive`/`resetProjects` hilang dari
`tasks-router`/`projects-router`. Acuan pemulihan: `09c01dd0` (`git show 09c01dd0:mobile/<path>`).
