# Fase 2 — Pemetaan data: modul Acara (Events)

Dokumen analisis, **bukan** implementasi. Memetakan data contoh mobile modul Events ke DTO server yang
sudah ada, supaya penukaran di Tahap 3 tidak menemukan kejutan.

Keputusan yang mengikat dokumen ini: *"datanya sama dengan web, hanya tampilannya beda"* — mobile
memakai endpoint `/api/app/*` yang sama persis dengan web, tidak ada endpoint khusus mobile
(`mobile/reacttransition.md:34`, `mobile/reacttransition.md:69`).

Sumber yang dibaca: `mobile/docs/phase1-screens.events.md`, `mobile/src/data/events*.ts`,
`mobile/src/data/sample/events*.ts`, `mobile/src/screens/events/**`, `server/api/app-events*.ts`,
`server/event/events.{dto,query,sql,service,notes,clock}.ts`, `server/access/{event.policy,capabilities}.ts`,
`server/pm/{enums,limits,keyset}.ts`, dan — sebagai pembanding "apa yang web lakukan" —
`app/routes/app/events.tsx` + `app/lib/events-{api,filters}.ts`.

Singkatan: **GAP-A** = mobile menampilkan, API tidak mengirim. **GAP-B** = API mengirim, mobile belum memakai.

---

## 0. Ringkas: endpoint yang tersedia untuk modul ini

| Metode + path | Keluaran | Berkas |
|---|---|---|
| `GET /api/app/events` | `{ items: EventListItem[], nextCursor, caps: { createEvent } }` | `server/api/app-events.ts:34-64` |
| `GET /api/app/events/agenda` | `{ items: AgendaItem[] }` (maks 4, hari ini + besok, milikku) | `server/api/app-events.ts:66-68`, `server/event/events.query.ts:185-221` |
| `GET /api/app/events/people` | `{ items: PickerPerson[] }` (`id,name,jobTitle,image`) | `server/api/app-events.ts:74-81`, `server/team/picker.query.ts:24-29` |
| `GET /api/app/events/:id` | `EventDetail` | `server/api/app-events.ts:84-90` |
| `POST /api/app/events` | 201 `EventDetail` | `server/api/app-events.write.ts:45-55` |
| `PATCH /api/app/events/:id` | `EventDetail` | `server/api/app-events.write.ts:57-62` |
| `POST /api/app/events/:id/cancel` | `EventDetail` (body `{ reason }`) | `server/api/app-events.write.ts:64-71` |
| `POST /api/app/events/:id/participants` | `{ participants: PersonRef[] }` | `server/api/app-events.write.ts:73-80` |
| `DELETE /api/app/events/:id/participants/:userId` | `{ participants }` | `server/api/app-events.write.ts:82-89` |
| `PUT /api/app/events/:id/note` | `{ note, badge }`; 409 `NOTE_CONFLICT` membawa `note` terbaru | `server/api/app-events.notes.ts:23-34` |
| `DELETE /api/app/events/:id` | `{ trash: { kind:'event', id, label } }` — soft delete ke Sampah | `server/api/app-events.trash.ts:18-36` |
| `POST /api/app/trash/event/:id/restore` | pemulihan dari Sampah | `server/api/app-trash.ts:84-97` |
| `GET /api/app/trash?kind=event` | daftar Sampah berisi acara | `server/api/app-trash.ts:26-29` |

Gerbang 401 ada di `appContext`; semua route di atas memakainya. Query `GET /events` divalidasi
`ListQuery` (`server/api/app-events.schema.ts:72-78`): `cursor`, `limit`, `tab`, `kind` (boleh banyak),
`projectId`, `q`.

**Tidak ada endpoint kalender** (bulan/pekan) dan **tidak ada endpoint outcomes/rekaman**. Lihat §2.

---

## 1. Peta per layar

Tipe bersama yang dirujuk tabel di bawah:
`EventListItem` (`server/event/events.dto.ts:77-95`), `EventDetail` (`:102-111`),
`AgendaItem` (`:119-127`), `PersonRef` (`:14`), `ProjectRef` (`:75`),
`Caps<EventCapKey>` (`server/access/capabilities.ts:101`, kunci di `:91-98`).

### 1.1 Events ① List — `app/(tabs)/events/index.tsx?view=list`

Pemanggilan: `GET /api/app/events?tab={upcoming|past}&kind=<kind>&projectId=<id>&q=<teks>&limit=30&cursor=<c>`
(web memakai `limit=30`, `app/lib/events-filters.ts:25`; default server 25, maks 100,
`server/pm/limits.ts:15-16`).

Titik tukar sekarang: `getEventsList(role, { query, search })` di `mobile/src/data/events.list.ts:51-65`
yang membaca `eventsStore.get().list` (`mobile/src/data/events.store.ts:51`).

| Bidang data contoh mobile | Bidang DTO server | GAP |
|---|---|---|
| `e.id` (`mobile/src/data/sample/events.ts:6`) | `EventListItem.id` (UUID, bukan slug) | — |
| `e.title` | `title` | — |
| `e.date` (`'2026-10-07'`) | diturunkan dari `startsAt` + `timeZone` | hitung klien |
| `e.time` (`'2:00'`) dan `card.when` (`mobile/src/data/events.list.ts:46`) | diturunkan dari `startsAt` | hitung klien |
| `e.range` (`'2:00–3:00 PM'`) | `startsAt` + `endsAt` | hitung klien |
| `e.place` (`'Meeting Room 2'` / `'Online'`) | `locationType` + `locationText` + `meetingUrl` | hitung klien |
| `e.mode` (`'In person'｜'Online'`) | `locationType` (`'offline'｜'online'`, `server/pm/enums.ts:62`) | peta nilai |
| `e.type` (`'Meeting'…'Other'`, `events.shared.ts:8`) | `kind` (`'meeting'｜'review'｜'important'｜'team'｜'other'`, `server/pm/enums.ts:58`) | peta nilai 1:1, label di klien |
| `e.status === 'Done'` (`sample/events.ts:3`) | **tidak ada kolom**; "lewat" = `endsAt <= now` (`server/event/events.sql.ts:72-76`) | **GAP-A1** |
| `card.status` (`'Canceled'｜'Done'｜'Today'｜'Upcoming'`, `events.shared.ts:54-55`) | dari `canceledAt` + `endsAt` vs `now` + `today` | hitung klien |
| `e.canceled.reason` | `cancelReason` | — |
| `e.canceled.by` | `canceledBy: PersonRef` (hanya di detail) | — |
| `e.canceled.once` | — | **GAP-A5** |
| `e.repeat` + badge Repeat (`list/event-card.tsx:54-59`) | — (`recurrence` ditolak 422, `app-events.schema.ts:55-59`) | **GAP-A4** |
| `eventProject(e)` → nama proyek (`events.shared.ts:58-63`) | `project: ProjectRef｜null` | — (null = acara pribadi, **GAP-B4**) |
| `e.attendees: string[]` (nama) | `participants: { total, isParticipant }` | **GAP-A15** (nama → id) |
| `card.results` `'view'｜'check'` (`events.list.ts:45`) | — (outcomes belum ada) | **GAP-A8** |
| filter Member "hanya acara yang kuhadiri" (`events.query.ts:48-52`) | sudah di SQL visibilitas (`server/event/events.access.ts`, `events.query.ts:85`) | hapus di klien |
| `data.filtered` (titik pada ikon filter) | hitung dari query klien | hitung klien |
| `data.empty` | `items.length === 0 && tidak ada filter` | hitung klien |
| — | `noteStatus` (`'draft'｜'confirmed'｜null`) | **GAP-B2** |
| — | `can{}` per item | **GAP-B1** |
| — | `caps.createEvent` (tombol "New event") | **GAP-B1** |
| — | `nextCursor` | **GAP-B10** |

Pengelompokan **Schedule / Type** (`groupEvents`, `mobile/src/data/events.query.ts:73-80`) dan label grup
(`groupLabel`, `mobile/src/data/events.dates.ts:95-101`) tetap di klien; server sudah mengurutkan
`startsAt` naik untuk `upcoming` dan turun untuk `past` (`server/event/events.sql.ts:88-91`), jadi urutan
dalam satu halaman benar tanpa penyortiran ulang.

### 1.2 Events ①b Filter & sort — `app/(tabs)/events/filter.tsx`

Tidak memanggil endpoint sendiri; mengubah query daftar. Opsi proyek butuh daftar proyek
(web memakai `listProjects`, `app/routes/app/events.tsx:28-34`; mobile → `GET /api/app/projects`,
di luar lingkup modul ini).

| Kontrol mobile | Query server | GAP |
|---|---|---|
| **Show** `Upcoming｜Past` (`mobile/src/data/events.query.ts:10`) | `tab=upcoming｜past` (`events.dto.ts:28-32`) | beda semantik, lihat §4 |
| **Event type** `All + TYPES` (`events.query.ts:13`) | `kind` (boleh diulang; mobile hanya perlu satu) | peta nilai |
| **Project** (`projectOptions`, `events.query.ts:33-36`) | `projectId` | — |
| **Group by** `Schedule｜Type` (`events.query.ts:15`) | — (murni tampilan) | tetap klien |
| Teks cari judul **atau lokasi** (`searchEvents`, `events.query.ts:64-68`) | `q` → `ILIKE` **hanya judul** (`server/event/events.sql.ts:62-64`) | **GAP-A10** |

`q` dipotong di `EVENT_SEARCH_MAX = 100` (`events.dto.ts:35`, `events.sql.ts:95`).

### 1.3 Events ② Kalender — `app/(tabs)/events/index.tsx?view=calendar`

Sekarang: `getEventsCalendar(role, { view, picked, query })` (`mobile/src/data/events.calendar.ts:56-88`)
membaca seluruh larik di memori lewat `eventsOn` (`mobile/src/data/events.dates.ts:127-128`).

**Tidak ada endpoint kalender.** `filtersOf` (`server/event/events.sql.ts:94-101`) hanya mendukung
`projectId`, `kind`, `q` — **tidak ada filter rentang tanggal**, dan `inTab` memaksa potongan pada
`now` (`events.sql.ts:72-76`), sehingga satu bulan yang melintasi "hari ini" tidak bisa diambil dalam
satu permintaan. Ini **GAP-A9**, GAP terbesar modul ini.

| Bidang mobile | Asal setelah tersambung | GAP |
|---|---|---|
| `days[].date/day` (`events.calendar.ts:24-32`) | hitung klien (`monthOf`/`weekOf`) | hitung klien |
| `days[].dots` (jumlah acara per tanggal) | butuh seluruh acara bulan/pekan itu | **GAP-A9** |
| `days[].label` (`"Thu, Oct 8, 2 events"`) | idem | **GAP-A9** |
| `agenda[]` (acara tanggal terpilih, urut jam) | idem, lalu urut `startsAt` | **GAP-A9** |
| `agendaDate`, `title` (`"October 2026"`, `"Oct 5 – 11"`) | hitung klien dari `picked` | hitung klien |
| `hiddenByFilters` (`events.calendar.ts:84-87`) | perlu dua kali baca (dengan dan tanpa filter) | hitung klien, 2 permintaan |
| kemunculan berulang tiap `REPEAT_DAYS` (`events.dates.ts:120-124`) | — | **GAP-A4** |
| `occurrenceStatus(e, iso)` (`events.dates.ts:131-132`) | — | **GAP-A5** |

Catatan: `GET /api/app/events/agenda` **bukan** pengganti agenda kalender — ia hanya mengirim maksimum
4 acara milikku untuk hari ini dan besok (`AGENDA_LIMIT = 4`, `events.dto.ts:38`;
`server/event/events.query.ts:185-210`) dan dipakai widget Beranda, bukan kalender tanggal bebas.

### 1.4 Events ④/④b Detail — `app/(tabs)/events/[id]/index.tsx`

Pemanggilan: `GET /api/app/events/:id` → `EventDetail`.
Sekarang: `getEventDetail(role, id)` (`mobile/src/data/events.detail.ts:35-62`).

| Bidang mobile | `EventDetail` | GAP |
|---|---|---|
| `e.title`, head (`detail/event-detail.screen.tsx:59`) | `title` | — |
| `d.status` StatusPill | dari `canceledAt` + `endsAt` vs `now` | hitung klien |
| `e.type` Pill (`:62`) | `kind` | peta nilai |
| Pill **Repeats** (`:64-69`) | — | **GAP-A4** |
| kotak `Canceled` + `by` + `reason` (`:71-79`) | `canceledAt`, `cancelReason`, `canceledBy: PersonRef` | — |
| `e.canceled.once` ("hanya kemunculan ini") | — | **GAP-A5** |
| tombol **Edit** untuk `d.editor` (`:80-84`) | `can.update` | **GAP-B1** |
| `d.menu` = `['cancel','archive']` (`events.detail.ts:54`) | `can.cancel`, `can.trash` | **GAP-B1** |
| Facts → waktu `"Wed, Oct 7 · 2:00–3:00 PM"` (`detail/event-facts.tsx:39`) | `startsAt`/`endsAt` + `timeZone` | hitung klien |
| Facts → lokasi `eventWhere` (`events.shared.ts:78-79`) | `locationType` + `locationText` (+ `meetingUrl`) | hitung klien; **GAP-B3** |
| Facts → project (tautan) (`event-facts.tsx:24-34`) | `project: ProjectRef｜null` | **GAP-B4** bila null |
| Facts → repeat (`event-facts.tsx:23`) | — | **GAP-A4** |
| Facts → reminder `'1 day & 30 min before'` (`events.strings.ts:44`) | `remindersMinutes: number[]`; default `[1440, 30]` (`server/pm/enums.ts:71`) | render dari larik, **GAP-B7** |
| **Attendees (n)**, pembuat dulu (`events.detail.ts:48,56-60`) | `participants: PersonRef[]` + `creator: PersonRef` | urutan diatur klien |
| peran `"Creator"` | `creator.id === participant.id` | hitung klien |
| peran `"Note-taker"` (`e.noteTaker`, `sample/events.extra.ts:9`) | — | **GAP-A6** |
| **Agenda** butir (`e.agenda: string[]`) | `agenda: string｜null` (teks) | pisah per baris (`agendaLines` sudah ada, `events.form.ts:48-52`) |
| **Minutes** Pill `"None yet"` keras (`detail/event-detail.screen.tsx:107`) | `noteStatus` + `note{body,status,updatedAt}` | **GAP-B2** |
| tombol Type / Photo / Voice (`detail/event-minutes.tsx`) | `can.writeNote`; Type → `PUT /events/:id/note` | **GAP-B1**; Photo & Voice → **GAP-A8** |
| `d.access` (`'creator'｜'admin'｜'member'｜null`) → kalimat izin (`:111-115`) | turunkan dari `can{}` + `creator.id`, **jangan** dari role | **GAP-B1** |
| kaki `"Created by X · Updated Y · by Z"` (`:44-48,116`) | `creator`, `updatedAt`; **tidak ada `updatedBy`** | **GAP-A7** |
| — | `createdAt`/`updatedAt` sebagai instan penuh | **GAP-B9** |

### 1.5 Events ③a/③b Form New/Edit — `app/events/new.tsx?event=<id>&details=1`

Create: `POST /api/app/events` (`CreateBody`, `server/api/app-events.schema.ts:87-99`).
Update: `PATCH /api/app/events/:id` (`UpdateBody`, `:102-115`).
Sekarang: `getEventForm` (`mobile/src/data/events.detail.ts:65-105`) → `addEvent`/`editEvent`
(`mobile/src/data/events.store.ts:93-120`).

| `EventFields` (`mobile/src/data/events.store.ts:14-26`) | Body server | GAP |
|---|---|---|
| `title` | `title` (1–150, `events.dto.ts:43`) | — |
| `date` + `start` (`'10:00 AM'`) | `startsAt` (ISO instan, `format: 'date-time'`) | gabung di klien pakai `timeZone` server |
| `date` + `end` | `endsAt`; harus > `startsAt` (`events.validate.ts` `resolveSpan`) | idem |
| `mode` | `locationType` | peta nilai |
| `place` (In person) | `locationText` (maks 200) | — |
| `place` (Online = tautan, `FORM.link`) | `meetingUrl` (maks 500, divalidasi `checkMeetingUrl`) | **GAP-B3**: pisahkan dua field |
| `type` | `kind` | peta nilai |
| `project` (selalu terisi, default `'atlas'`, `events.shared.ts:27`) | `projectId?: string｜null`; `null` = acara pribadi | **GAP-B4**: tambah opsi "tanpa proyek" |
| `attendees: string[]` (nama) | `participantIds: string[]` (UUID, 1–100) | **GAP-A15**; sumber: `GET /events/people` |
| `agenda: string[]` | `agenda: string｜null` (maks 5.000) | gabung per baris |
| `repeat` | `recurrence` → **422** (`app-events.schema.ts:55-59`) | **GAP-A4** |
| reminder (teks tetap) | `remindersMinutes: number[]` (maks 5 entri, ≤ 10.080) | **GAP-B7**: form harus mengirim larik |
| `DATES` = hari ini s.d. akhir bulan (`events.form.ts:26-29`) | basisnya `today` server | lihat §4 |
| `TIMES` 7:00–21:00 per 15 menit (`events.form.ts:20-23`) | murni klien | tetap klien |

Pembatasan penting di `UpdateBody`: `projectId` dan `participantIds` adalah `t.Never()`
(`app-events.schema.ts:107-110`) — **proyek tidak bisa dipindah lewat PATCH**, dan perubahan daftar hadir
harus lewat `POST/DELETE …/participants`. Form Edit mobile sekarang mengubah `attendees` dan `project`
dalam satu simpan (`events.store.ts:81-90`); itu harus dipecah menjadi beberapa panggilan.

### 1.6 Events ⑩/⑩b Cancel sheet — `app/(tabs)/events/[id]/cancel.tsx`

`POST /api/app/events/:id/cancel` body `{ reason }` (1–500, `app-events.schema.ts:118-121`).

| Mobile | Server | GAP |
|---|---|---|
| `reason` wajib (`sheets/cancel.screen.tsx:44-53`) | `reason` wajib | — |
| `by` = nama penandatangan (`cancelEvent(..., me(role).name)`) | diambil server dari sesi → `canceledBy` | hapus di klien |
| `{ once }` untuk acara berulang (`events.store.ts:123-129`) | — | **GAP-A5** |
| checkbox "Also create a replacement event" | murni navigasi klien ke `/events/new` | tetap klien |
| hak akses sheet | `can.cancel` (termasuk tolak `IMPERSONATING`, `server/access/event.policy.ts:121`) | **GAP-B1** |

### 1.7 Events ⑪/⑪b Archive sheet — `app/(tabs)/events/[id]/archive.tsx`

Mobile "Move to Archive" = **Sampah** server: `DELETE /api/app/events/:id`
(`server/api/app-events.trash.ts:18-36`), dipulihkan `POST /api/app/trash/event/:id/restore`
(`server/api/app-trash.ts:84-97`). Pola T1 (tanpa dialog, snack "Urungkan") sudah sesuai catatan
server sendiri (`app-events.trash.ts:3-4`).

| Mobile | Server | GAP |
|---|---|---|
| `archiveEvent(id, by)` → key entri (`events.store.ts:135-163`) | `{ trash: { kind:'event', id, label } }` | kunci Undo = `id`, bukan key lokal |
| `canRestoreEvent(id, key)` (`events.store.ts:175-176`) | kebijakan `canRestoreEvent` di server (`event.policy.ts:172-189`: retensi, proyek, impersonasi) | jangan buat aturan sendiri; andalkan jawaban endpoint |
| `restoreEvent(id, key)` | `POST /trash/event/:id/restore` | — |
| `{ once }` (arsip satu kemunculan) | — | **GAP-A5** |
| entri Archive: `title`, `where`, `by`, `date` (`mobile/src/data/archive.ts:41-47`) | `GET /api/app/trash?kind=event` | **GAP-A13** (modul Archive, bukan Events) |
| `forgetArchivedEvent(key)` (Delete forever) | belum diperiksa untuk modul ini | belum dipastikan — cek route purge di `app-trash.ts` saat mengerjakan Sampah |

### 1.8 Events ⑤–⑨ Rekaman, Outcomes, Results

Layar: `record.tsx`, `recording.tsx`, `outcomes/[step].tsx`, `results.tsx`.
Sumber data sekarang: `getOutcomes` / `getEventResults` (`mobile/src/data/events.results.ts:20-91`) atas
`STANDUP` dan `EVENT_RESULTS` di `mobile/src/data/sample/events.extra.ts:47-98`.

**Tidak ada padanan server sama sekali.** `outcomes` masuk kelas "Could" dan ditolak 422 secara eksplisit
(`server/api/app-events.schema.ts:54-59`; catatan DTO `server/event/events.dto.ts:1-7` menyebut
`series`/`outcomes` sengaja belum ada supaya E-13/E-16 bisa menambahnya tanpa melanggar expand-only).

| Mobile | Server | GAP |
|---|---|---|
| `STANDUP.length`, `.saved`, rekaman audio | — | **GAP-A8** |
| `STANDUP.transcript` (Step 2) | yang paling dekat: `note.body` lewat `PUT /events/:id/note` | sebagian bisa |
| `STANDUP.tasks` (draf tugas AI) | — | **GAP-A8** |
| `confirmOutcomes` → buat tugas (`events.store.ts:205-235`) | yang paling dekat: `POST /api/app/tasks` per draf (modul Tasks) + `note.status = 'confirmed'` | **GAP-A8** |
| `EVENT_RESULTS.decisions/info/question/source` | — | **GAP-A8** |
| `isConfirmed(e)` (`events.shared.ts:82`) → rute `eventHref` | yang paling dekat: `noteStatus === 'confirmed'` | sebagian bisa |
| `MadeTask` (tugas hasil, status langsung dari Tasks) | — (tidak ada tautan acara→tugas) | **GAP-A8** |

Hanya Step 2 ("Check the text" / Minutes) punya jalan nyata: `note.body` + kunci optimistis
`baseUpdatedAt` dan 409 `NOTE_CONFLICT` yang mengirim versi terbaru (`server/api/app-events.notes.ts:19-33`,
`server/event/events.notes.ts:40-46`).

---

## 2. GAP dua arah

### 2.1 GAP-A — mobile menampilkan, API tidak mengirim

| Id | Apa | Usulan |
|---|---|---|
| A1 | Status `Done` eksplisit | **Hitung di klien**: `endsAt <= now` (`server/event/events.sql.ts:72-76`); `now` dari §4 |
| A2 | `time`, `range`, `date`, label grup, judul kalender | **Hitung di klien** dari `startsAt`/`endsAt` + `timeZone` |
| A3 | `place` sebagai satu teks | **Hitung di klien**: gabung `locationType`/`locationText`/`meetingUrl` |
| A4 | Pengulangan (`repeat`, badge Repeat, kemunculan kalender, sheet varian `-recurring`) | **Butuh perubahan server (E-16)**. Yang kurang: kolom seri/aturan ulang pada `event`, `recurrence` di `CreateBody`/`UpdateBody` (kini `t.Never()`), pembangkitan kemunculan di `listEvents`, dan `seriesId` di `EventListItem`/`EventDetail` |
| A5 | Batal/arsip **satu kemunculan** (`canceled.once`) | **Butuh perubahan server (E-16)**; bergantung A4. Yang kurang: `POST /events/:id/cancel` tidak punya `scope: 'occurrence'｜'series'`, dan `DELETE /events/:id` tidak punya penanda tanggal kemunculan |
| A6 | Peran **Note-taker** di daftar hadir | **Butuh perubahan server**. Yang kurang: kolom peran di `event_participant` dan `PersonRef` daftar hadir yang membawanya (sekarang sengaja hanya `{id,name}`, `server/event/events.dto.ts:13-14`) |
| A7 | Kaki `"Updated <tanggal> · by <nama>"` | **Butuh perubahan server**: `EventDetail` punya `updatedAt` tapi tidak `updatedBy` (`events.dto.ts:102-111`; baris `createdBy`/`canceledBy` ada di `EventRow:143-144`, `updatedBy` tidak ada) |
| A8 | Seluruh alur rekaman → outcomes → results (transkrip, draf tugas, keputusan, info, open question, sumber, tugas yang dibuat, "confirmed by") | **Butuh perubahan server (E-13)**. Yang kurang: tabel outcomes/draf, route konfirmasi yang membuat tugas sekaligus menautkannya ke acara, dan field `outcomes` di DTO (kini `t.Never()`). Sebagian kecil (transkrip) bisa diwakili `note.body` sekarang |
| A9 | Kalender: semua acara pada satu bulan/pekan | **Butuh perubahan server**: `ListQuery` tidak punya `from`/`to`, dan `inTab` memotong pada `now`, jadi bulan berjalan tidak bisa diambil utuh. Alternatif tanpa server: ambil **dua** tab (`upcoming` + `past`) dan terus `nextCursor` sampai melewati batas bulan — mahal dan rapuh, jadi usulan utama = tambah filter rentang di server |
| A10 | Cari berdasarkan **lokasi** | `q` server hanya judul (`events.sql.ts:62-64`). Usulan: kirim `q` ke server untuk judul, lalu **saring sisa di klien** untuk lokasi pada halaman yang sudah diambil, dan jelaskan batasnya di UI; atau butuh server memperluas `titleMatches` |
| A11 | `today` / `timeZone` | **Diambil dari endpoint lain**: `GET /api/app/home` mengirim `now: { iso, today, timeZone, … }` (`server/home/home.dto.ts:14-24,115`). Tidak ada route Events yang mengirimnya (web mendapatkannya dari loader SSR, `app/routes/app/events.tsx:51-55`, yang tidak bisa dipakai mobile) |
| A12 | Alasan tombol nonaktif (teks untuk `CapValue` berupa kode) | `capMessage` ada di server (`server/access/capabilities.ts:135-137`) tapi mobile tidak bisa mengimpor `server/`. Usulan: **salin katalog pesan ke `mobile/src/`** dengan tes penjaga kesamaan (pola yang sudah dipakai untuk token tema, `mobile/reacttransition.md:16`); alternatif butuh server mengirim pesan di `can{}` |
| A13 | Metadata entri Archive (`where`, `by`, `date`) | **Diambil dari endpoint lain**: `GET /api/app/trash?kind=event`. Milik modul Sampah, bukan Events |
| A14 | Opsi `DATES`/`TIMES` form | **Hitung di klien**, tapi titik awalnya `today` server (A11), bukan `new Date()` |
| A15 | Daftar hadir sebagai **nama** | **Hitung di klien** + endpoint lain: simpan `userId`, tampilkan `name`; kandidat dari `GET /api/app/events/people` (`PickerPerson{id,name,jobTitle,image}`) |

Butuh perubahan server (wajib sebelum layar itu bisa setara prototipe): **A4, A5, A6, A7, A8, A9**.
Opsional/bisa diakali: A10, A12.

### 2.2 GAP-B — API mengirim, mobile belum memakai

| Id | Apa | Akibat kalau diabaikan |
|---|---|---|
| B1 | `can{}` (`update`, `cancel`, `trash`, `manageParticipants`, `writeNote`) + `caps.createEvent` | Mobile masih memakai aturan izin versinya sendiri (`events.detail.ts:39-47`) → salah untuk acara pribadi, Pemantau, dan impersonasi. **Dilarang** (lihat §3) |
| B2 | `noteStatus` (daftar) dan `note{body,status,updatedAt}` (detail) | Pill Minutes selamanya `"None yet"`; tidak ada jalan ke notulensi yang sudah ada |
| B3 | `meetingUrl` terpisah dari `locationText` | Tautan rapat tidak bisa dibuka/dicopy; form Online menyimpan tautan ke kolom salah |
| B4 | `project: null` (acara pribadi) | `eventProject` **melempar error** untuk acara tanpa proyek (`mobile/src/data/events.shared.ts:61`) → layar rusak |
| B5 | `project.status: ProjectStatus` | Tidak bisa menandai acara di proyek selesai/arsip |
| B6 | `participants.total` / `isParticipant` | Jumlah hadir di kartu daftar dan penanda "aku diundang" tidak ada |
| B7 | `remindersMinutes: number[]` | Reminder tetap teks mati `'1 day & 30 min before'`; nilai nyata bisa berbeda |
| B8 | `canceledAt` / `canceledBy: PersonRef` | Waktu pembatalan tidak tampil (mobile hanya punya `by` + `reason`) |
| B9 | `createdAt` / `updatedAt` instan penuh | Kaki detail hanya bisa tanggal, padahal jam tersedia |
| B10 | `nextCursor` | Daftar terpotong di halaman pertama tanpa "muat lebih banyak" |
| B11 | `id` = UUID | Rute `/events/<id>` tetap jalan, tapi fixture/tes yang memakai slug (`'kickoff'`, `'new-1'`) harus diganti |
| B12 | Bentuk error seragam `{ error, code, status, requestId }` + 400 `BAD_CURSOR`, 409 `NOTE_CONFLICT`, 422 | Mobile belum punya penanganan error API apa pun di modul ini |

---

## 3. Izin (`can{}`)

Aturan: **mobile membaca `can{}`, dilarang membuat aturan izin versi sendiri.**

Server mengirim kapabilitas per objek. Bentuknya sparse (`Caps<K> = Partial<Record<K, CapValue>>`,
`server/access/capabilities.ts:101`) dengan tiga keadaan (`capOf`, `:118-123`):

- **kunci tidak ada** → kontrol **disembunyikan** (gagal tertutup; `NOT_FOUND`/`NOT_VISIBLE` dan kode tak dikenal jatuh ke sini);
- **`true`** → kontrol aktif;
- **kode string** (`DenyCode`) → kontrol **tampil tapi nonaktif**, dengan alasan dari `capMessage` (lihat GAP-A12).

Kunci yang dipakai modul ini (`EVENT_CAP_KEYS`, `server/access/capabilities.ts:91-97`):

| Kunci `can` | Kebijakan | Kontrol mobile yang harus mematuhinya |
|---|---|---|
| `update` | `canManageEvent` (`server/access/event.policy.ts:96-108`) | Tombol **Edit** di detail (`detail/event-detail.screen.tsx:80-84`); tombol **Save** form Edit (`form/event-form.screen.tsx:52`) |
| `cancel` | `canCancelEvent` (`:115-125`; menolak saat impersonasi dan saat sudah batal) | Item ⋯ **Cancel event** (`events.detail.ts:54`); primary **Cancel event** di sheet (`sheets/cancel.screen.tsx:59-66`); tautan "Cancel event" di sheet Archive (`sheets/archive.screen.tsx:64-80`) |
| `trash` | `canTrashEvent` (`:128-136`) | Item ⋯ **Move to Archive**; primary **Move to Archive** di sheet archive (`sheets/archive.screen.tsx:55`) |
| `manageParticipants` | `canManageParticipants` (`:139-146`) | Pil hadirin yang bisa dihapus dan select **Add person** (`form/event-basics.tsx:120-145`) |
| `writeNote` | `canWriteNote` (`:154-165`; **hadirin pun boleh**, bukan hanya pengelola) | Kotak Minutes: **Type**, **Photo**, **Voice** (`detail/event-minutes.tsx:22-33`); Step 2 Save (`outcomes/outcomes.screen.tsx:112-131`) |

Di tingkat daftar, bukan per objek:

- `caps.createEvent` dari `GET /api/app/events` (`server/api/app-events.ts:56-61`) → tombol **New event**
  di empty state (`list/events.screen.tsx:72-76`) dan FAB "+" tab bar untuk rute `/events/new`.
  Catatan server: `createEvent` menjawab "acara pribadi"; boleh-tidaknya **memilih proyek tertentu**
  diputuskan per proyek oleh `canCreateEvent` (`server/access/capabilities.ts:209-215`), jadi select
  Project di form bisa saja menolak walau tombolnya aktif → tangani 403 `NOT_MEMBER` / 409 `PROJECT_IN_TRASH`.

Tidak ada di `can{}` dan harus **tidak** ditebak mobile:

- **`restore`** sengaja tidak ada (`server/access/capabilities.ts:88-89`): butuh `now` untuk cek retensi
  dan dibangun oleh slice Sampah. Jadi `canRestoreEvent` lokal di `mobile/src/data/events.store.ts:175-176`
  harus hilang; tombol **Undo** pada snack cukup memanggil restore dan menampilkan pesan dari jawaban
  (termasuk `EXPIRED`, `PROJECT_IN_TRASH`, `IMPERSONATING`).
- Yang harus dibongkar dari mobile: `editor`, `menu`, `access` di `mobile/src/data/events.detail.ts:39-54`
  (menurunkan izin dari `role` + nama), serta `eventsFor(role, …)` di
  `mobile/src/data/events.query.ts:48-52` (visibilitas sudah di SQL, `server/event/events.query.ts:85`).
- Kalimat izin di detail (`"You can change this event as an Admin"` / `"Only the creator …"`,
  `events.strings.ts` lewat `DETAIL.memberAccess`) harus diturunkan dari `can.update` + `creator.id`,
  bukan dari role.

---

## 4. Tanggal dan zona waktu

Aturan proyek: **"hari ini" ditentukan server, jangan `new Date()` di klien.** Mobile sudah separuh
patuh: tidak ada `toLocaleDateString` dan semua hitungan jalan di UTC
(`mobile/src/data/events.dates.ts:1-3`), tetapi "hari ini" masih **konstanta**
`TODAY = '2026-10-07'` (`mobile/src/data/sample/today.ts:5`).

Dari mana `today`/`timeZone` harus datang setelah tersambung:

- Server menghitungnya per permintaan di `requestEventClock()` → `{ now, today, timeZone }`
  (`server/event/events.clock.ts:14-17`); `timeZone` = satu zona tim `APP_TIME_ZONE`, tidak ada setelan
  per pengguna (`events.clock.ts:5-7`).
- **Tidak ada route Events yang mengirimkannya.** Web mendapatkannya dari loader SSR
  (`app/routes/app/events.tsx:51-55`), jalan yang tertutup untuk mobile.
- Jalan yang ada sekarang: `GET /api/app/home` → `now: { iso, today, timeZone, greeting, dateLabel, timeLabel }`
  (`server/home/home.dto.ts:14-24` dan `:115`). Usulan: ambil sekali saat boot/sesi, simpan di satu
  modul jam mobile, jadikan satu-satunya sumber `today`/`timeZone`/`now` untuk semua modul.
  Kalau koordinator ingin Events berdiri sendiri, itu **butuh perubahan server** kecil (menyertakan
  `clock` pada jawaban `GET /api/app/events`, seperti yang sudah dilakukan loader web).

Layar yang **akan salah** kalau memakai jam perangkat:

| Layar / bagian | Kenapa salah |
|---|---|
| Label grup daftar: `Earlier ·`, `Today ·`, `Tomorrow ·`, `This week`, `Later` (`mobile/src/data/events.dates.ts:95-101`) | Perangkat di zona lain (atau jam yang digeser pengguna) memindahkan acara ke grup yang salah; "This week" juga bergantung `daysToSunday(TODAY)` |
| StatusPill `Today` vs `Upcoming` (`mobile/src/data/events.shared.ts:54-55`) | Perbandingan `e.date === TODAY` |
| Kolom waktu kartu (`dayLabel` → `'Today'`, `mobile/src/data/events.dates.ts:88-92`) | Idem |
| Filter Show `Upcoming｜Past` (`isPast`, `mobile/src/data/events.query.ts:45`) | Perangkat yang mendahului/mundur menukar isi dua tab. Catatan tambahan: mobile memotong pada **tanggal** (`daysBetween(TODAY, e.date) < 0`), server memotong pada **`endsAt` vs `now`** (`server/event/events.sql.ts:72-76`), jadi rapat yang sedang berjalan masih "upcoming" di server tapi bisa "past" di mobile — setelah tersambung, biarkan `tab` server yang memutuskan |
| Kalender: tanggal terpilih awal = hari ini, dan `stepMonth` yang kembali ke hari ini saat masuk bulan berjalan (`mobile/src/data/events.dates.ts:64-68`, `calendar/events-calendar.tsx:33`) | Bulan/tanggal pembuka salah |
| Form: `DATES` = hari ini s.d. akhir bulan, dan `DUE_DATES` draf Step 3 (`mobile/src/data/events.form.ts:26-32`) | Pilihan tanggal bisa menawarkan tanggal yang sudah lewat menurut server, lalu ditolak |
| `addEvent`/`editEvent` menulis `updated: TODAY` (`mobile/src/data/events.store.ts:108,118`) | Setelah tersambung, `updatedAt` datang dari server; jangan ditulis klien |

Konversi yang perlu dibuat (semua di klien, memakai `timeZone` server): `startsAt` ISO → tanggal lokal
tim (`'2026-10-07'`), jam (`'2:00'`), rentang (`'2:00–3:00 PM'`); dan sebaliknya `date` + `start` → ISO
instan untuk body `POST`/`PATCH`. Catatan pelaksanaan: `events.dates.ts` sekarang memakai UTC murni
(`toUtc`), yang hanya benar selama `APP_TIME_ZONE` = UTC — ini **belum dipastikan** dan perlu dicek
(nilai `APP_TIME_ZONE` di `.env`/`server/pm/metrics-env.ts`) sebelum menukar modul.

---

## 5. Paginasi dan muat ulang

Keadaan sekarang: data contoh adalah **larik penuh di memori**. `eventsStore` menyimpan `list` lengkap
(`mobile/src/data/events.store.ts:31-51`), dan setiap getter menyapu seluruh larik itu:

- `getEventsList` → `eventsFor` → `applyQuery` → `searchEvents` → `groupEvents`
  (`mobile/src/data/events.list.ts:55-56`);
- `getEventsCalendar` → `eventsOn(events, date)` untuk **setiap** tanggal bulan/pekan
  (`mobile/src/data/events.calendar.ts:60-73`);
- `findEvent(id)` mencari di `list` lalu `archived` (`mobile/src/data/events.store.ts:56-58`) — tidak ada
  pemuatan per id;
- `insert()` menjaga urutan tanggal secara lokal (`:61-65`), pekerjaan yang setelah tersambung dilakukan
  `ORDER BY` server.

Server memakai **keyset**:

- `GET /api/app/events` mengembalikan `nextCursor: string｜null` (`server/event/events.dto.ts:97-100`);
  `null` berarti halaman terakhir.
- Bentuk kursor: **opaque base64url JSON `[sortValue, id]`** (`server/pm/keyset.ts:1-12`), dengan
  `sortValue` = `startsAt.toISOString()` dan `id` baris terakhir (`server/event/events.query.ts:91-92`).
  Mobile **tidak boleh** membongkar atau menyusun kursor sendiri — cukup mengirim kembali apa adanya.
- Langkah keyset mengikuti arah tab: `upcoming` maju, `past` mundur (`server/event/events.sql.ts:79-85`),
  dengan `id` sebagai pemecah seri sehingga tidak ada baris terlewat/ganda.
- `limit`: default 25, maks 100 (`server/pm/limits.ts:15-16`, dijepit `clampLimit`
  `server/event/events.query.ts:51-52`); web memakai 30 (`app/lib/events-filters.ts:25`).
- Kursor rusak/asing → **400 `BAD_CURSOR`** (`server/api/app-events.ts:50-55`), bukan halaman kosong →
  mobile harus memuat ulang dari awal dan memberi pesan.
- Mengganti `tab`/`kind`/`projectId`/`q` **membatalkan** kursor (kursor milik satu daftar) → reset ke
  halaman pertama setiap kali filter atau teks cari berubah.

Yang butuh "muat lebih banyak":

| Layar | Butuh? | Catatan |
|---|---|---|
| Events ① List | **Ya** | Daftar utama; infinite scroll per `nextCursor`. Pengelompokan Schedule/Type harus bekerja **per halaman yang sudah terkumpul**, bukan atas larik lengkap — grup boleh tumbuh saat halaman berikut masuk |
| Events ② Kalender | **Tidak boleh pakai paging apa adanya** | Butuh seluruh acara satu bulan/pekan; keyset per tab + potongan `now` tidak bisa memberikannya (GAP-A9). Sebelum ada filter rentang di server, kalender tidak bisa benar |
| Events ①b Filter | — | Hanya mengubah query; wajib reset kursor |
| Detail / Results / Outcomes | Tidak | Satu objek per permintaan (`GET /events/:id`) |
| Daftar hadir di form | Tidak (tapi terbatas) | `GET /events/people` adalah **picker**, dijepit `PICKER_LIMIT_MAX = 50` (`server/team/picker.query.ts:21`) → harus cari-ketik, bukan menampilkan semua orang seperti `listPeople()` sekarang (`form/event-basics.tsx:58`) |
| Archive | Ya | `GET /api/app/trash` memakai **offset** paging (`{ items, total, page, limit, counts }`, `server/api/app-trash.ts:26-29`), bukan keyset — beda pola, milik modul Sampah |

Tempat mobile sekarang mengasumsikan seluruh data tersedia sekaligus (harus dibongkar):
`events.store.ts:31-51` (`list` penuh), `events.store.ts:61-65` (`insert`), `events.list.ts:55-63`
(`mine.length === 0` untuk empty state — setelah tersambung, "kosong" hanya boleh disimpulkan dari
halaman pertama tanpa filter), `events.calendar.ts:60-87`, `events.query.ts:48-80`,
`events.dates.ts:127-128`.

---

## 6. Urutan kerja yang disarankan

Dari yang paling tidak berisiko. Setiap langkah adalah satu dispatch Tahap 3 yang bisa di-merge sendiri.

| # | Langkah | Kenapa aman / kenapa di sini | Perkiraan berkas |
|---|---|---|---|
| 1 | **Modul jam dari server.** Ambil `now/today/timeZone` dari `GET /api/app/home`, ganti `TODAY` konstanta dengan satu sumber tunggal (fallback jelas, bukan `new Date()`). | Tanpa ini setiap langkah berikut salah tanggal. Tidak mengubah tampilan. | baru `mobile/src/data/clock.ts`; `mobile/src/data/sample/today.ts`; `mobile/src/data/events.dates.ts`; `events.query.ts`; `events.form.ts`; `__tests__/events/*` |
| 2 | **Lapisan peta DTO murni** (tanpa jaringan): `EventListItem`/`EventDetail` → `EventItem` yang dipakai layar, termasuk peta `kind`↔`type`, `locationType`↔`mode`, pembentukan `time`/`range`/`date`/`status`, dan `project: null`. | Fungsi murni, bisa dites penuh tanpa server; memisahkan risiko "bentuk data" dari risiko "jaringan". | baru `mobile/src/data/events.map.ts`; `mobile/src/data/events.shared.ts`; baru `__tests__/events/events.map.test.ts` |
| 3 | **Baca `can{}`.** Buang `editor`/`menu`/`access` turunan role dan `eventsFor`; render tiga keadaan kapabilitas (sembunyi / aktif / nonaktif+alasan) + salinan katalog pesan `DenyCode` dengan tes penjaga. | Masih bisa dikerjakan atas data contoh (dengan `can{}` palsu di sample), jadi tidak bergantung langkah 4. Memperbaiki pelanggaran aturan izin lebih dulu. | `mobile/src/data/events.detail.ts`; `mobile/src/data/events.query.ts`; baru `mobile/src/data/caps.ts` + `mobile/src/data/caps.messages.ts`; `screens/events/detail/*`; `screens/events/form/*`; `screens/events/sheets/*`; `__tests__/events/*` |
| 4 | **Daftar nyata + paginasi.** `getEventsList` memanggil `GET /api/app/events` (tab, kind, projectId, q, limit, cursor), "muat lebih banyak", reset kursor saat filter berubah, tangani 400 `BAD_CURSOR`, empty state dari halaman pertama. Cari lokasi disaring di klien dengan catatan batas (GAP-A10). | Layar paling banyak dipakai, dan satu-satunya yang sudah punya padanan server lengkap. | `mobile/src/data/events.list.ts`; `mobile/src/data/events.ts`; `screens/events/list/*`; `screens/events/filter/events-filter.screen.tsx`; `__tests__/events/events.items.test.ts`, `events.filter` |
| 5 | **Detail nyata.** `GET /events/:id` → facts, daftar hadir dari `participants` + `creator`, agenda dari teks, reminder dari `remindersMinutes`, 404 → `EventMissing`. Pill Minutes memakai `noteStatus`. | Satu objek, tanpa paginasi. Bergantung langkah 2 dan 3. | `mobile/src/data/events.detail.ts`; `screens/events/detail/*` |
| 6 | **Tulis: Cancel + Sampah/Undo.** `POST /events/:id/cancel`, `DELETE /events/:id`, `POST /trash/event/:id/restore`; buang `canRestoreEvent` lokal; loading + feedback sesuai UX §1–§3. | Tulis paling sederhana (satu field / tanpa field), dan pola T1-nya sudah disepakati server. Varian `-recurring` **ditunda** (GAP-A4/A5). | `mobile/src/data/events.store.ts`; `screens/events/sheets/cancel.screen.tsx`; `screens/events/sheets/archive.screen.tsx` |
| 7 | **Form New/Edit nyata.** `POST`/`PATCH`; pecah `place` menjadi `locationText` vs `meetingUrl`; `attendees` jadi `participantIds` lewat picker `GET /events/people`; perubahan hadirin lewat route participants (karena `UpdateBody` menolaknya); opsi "tanpa proyek"; kirim `remindersMinutes`; tangani 422/403/409. | Paling banyak bagian bergerak dan satu-satunya yang mengubah kontrak field (`meetingUrl`, picker). | `mobile/src/data/events.form.ts`; `mobile/src/data/events.detail.ts` (`getEventForm`); `screens/events/form/*`; `__tests__/events/events.form.test.ts` |
| 8 | **Notulensi (Step 2 saja).** `PUT /events/:id/note` dengan `baseUpdatedAt`, tangani 409 `NOTE_CONFLICT` dengan menampilkan versi terbaru di samping tulisan yang belum disimpan. | Satu-satunya bagian alur outcomes yang punya padanan server. Step 1/3, rekaman, dan Results tetap data contoh. | `mobile/src/data/events.results.ts`; `screens/events/outcomes/outcomes.screen.tsx` |
| 9 | **Tertunda — butuh server dulu.** Kalender (A9), pengulangan + "Which one?" (A4/A5), Note-taker (A6), kaki "by <editor>" (A7), rekaman + outcomes + Results (A8). | Tidak bisa dikerjakan tanpa perubahan `server/`; biarkan memakai data contoh dan beri tanda eksplisit di layar/kode. | — (eskalasi ke koordinator) |

Catatan untuk dispatch Tahap 3: langkah 1–3 saling bergantung berurutan; 4 dan 5 bisa paralel setelah 3;
6, 7, 8 bisa paralel setelah 5. Langkah 9 bukan pekerjaan mobile sampai `server/` berubah.
