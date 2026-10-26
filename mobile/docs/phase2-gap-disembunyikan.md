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

## 3. Proyek, Beranda, Inbox, Tim, Profil

| Kontrol / bidang | Layar | GAP | Kenapa ditunda | Status |
|---|---|---|---|---|
| Alur **Story → Draft** dan **Template** proyek, termasuk "Also save as template" | `projects/new` story/draft/template | Projects A-16 | Tidak ada endpoint AI, tidak ada endpoint "proyek + rencana sekaligus", tidak ada tabel template. Fase 2 hanya memakai jalur **Form** | rencana |
| Filter "proyek milik siapa" (people row, chip My projects) | Projects filter | Projects A-2 | Daftar hanya punya `scope=mine｜all`; menyaring di klien salah pada halaman kedua | rencana |
| Filter Health per tingkat (`On track` / `At risk` / `Off track` terpisah) | Projects filter | Projects A-3 | Server hanya punya `perhatian=1` yang menggabung dua tingkat | rencana |
| Sort "Lowest progress" | Projects filter | Projects A-4 | `PROJECT_SORTS` tidak punya progress; progress dihitung, bukan kolom | rencana |
| Cari pada **deskripsi** proyek | Projects daftar | Projects A-6 | `q` server hanya nama; `description` hanya ada di detail. Placeholder perlu diubah jadi "Search project name…" | rencana |
| Persen fase berjalan ("Now: Development · 60%") | Project detail plan | Projects A-11 | Server tidak punya "persen fase". Angkanya akan berubah dari sampel, jadi perlu keputusan | rencana |
| Kartu Inbox "Meeting outcomes need your confirmation" + lead AI | Inbox | Home A-14 | Tidak ada `kind` seperti itu di katalog notifikasi | rencana |
| `why` (alasan Admin jadi reviewer) di kartu review | Inbox | Home A-15 | Kartu review masih `shipped: false`; ikut S4 | rencana |
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

### 4.3 Greeting Beranda masih teks mati

`GREETING = 'Good morning'` (`src/data/sample/today.ts`) dipakai `src/data/home.ts`. Server mengirim
`now.greeting` (`pagi｜siang｜sore｜malam`) di payload home yang **sudah diambil** — jadi ini bukan
GAP server, hanya belum dipakai. Worker Beranda Gelombang 1 mengambilnya dari
`homeResource.current()`. Perhatikan K5: kata sapaannya bahasa Indonesia dari server.
