# Phase 1 — Events (W2)

Bagian dari `phase1-screens.md`. Sumber: `riset-keano/prototype-react/src/screens/events/*` (17 berkas), `src/data/sample.js` (`events`, `kickoff`, `standup`), tes `events.filter`, `events.calendar`, `events.items`, `events.store`, `archive.undo`, `items.open`.

## 1. Id → route

| Id prototipe | Route | Presentasi | Tab bar |
|---|---|---|---|
| `events.list`, `events.calendar`, `events.empty` (member) | `app/(tabs)/events/index.tsx` — param `view=list\|calendar` | root tab | ya |
| `events.filter` | `app/(tabs)/events/filter.tsx` — param `view` (Show disembunyikan di kalender) | formSheet | — |
| `events.detail-upcoming`, `events.detail-recurring` | `app/(tabs)/events/[id]/index.tsx` (varian dari `event.repeat`) | push | tidak |
| `events.detail-confirmed` | `app/(tabs)/events/[id]/results.tsx` | push | tidak |
| `events.record-ready` | `app/(tabs)/events/[id]/record.tsx` | push | tidak |
| `events.recording` | `app/(tabs)/events/[id]/recording.tsx` (`gestureEnabled: false`) | push | tidak |
| `events.step1`, `step2`, `step3` | `app/(tabs)/events/[id]/outcomes/[step].tsx` (`step` = 1\|2\|3) | push | tidak |
| `events.cancel`, `events.cancel-recurring` | `app/(tabs)/events/[id]/cancel.tsx` | formSheet | — |
| `events.archive`, `events.archive-recurring` | `app/(tabs)/events/[id]/archive.tsx` | formSheet | — |
| `events.new`, `events.new-details` | `app/events/new.tsx` — param `event?` (edit), `details?` | modal (root) | — |

- **Membuka event** (`EV.open`): belum Done → `/events/<id>`; Done + outcomes terkonfirmasi (`kickoff` atau `e.outcomes`) → `/events/<id>/results`; Done belum terkonfirmasi → `/events/<id>/outcomes/3`. Satu fungsi `eventHref(e)` di `src/data/events.shared.ts`, dipakai list, kalender, Home (minta Sesi B), dan Inbox.
- List ↔ Calendar = `router.setParams({ view })`, query dipertahankan (`EventsTools`).
- Konfirmasi outcomes (`Step3` → Create) = `router.dismissTo('/events/<id>')` lalu `router.push('/events/<id>/results')` (prototipe `go(..., { top: true })`). Verifikasi `dismissTo` dengan `renderRouter`; cadangan: `router.replace`.

## 2. List (`EventsList`)

- `StackedScreen` judul **"Events"**, cari **"Search title or location…"** + ikon filter (titik bila when/type/project ≠ default). Seg **List / Calendar** (ikon `List`, `CalendarDays`).
- Member hanya melihat event yang ia hadiri (`attendees` berisi nama saya).
- Grup (`groupEvents`): **Schedule** (label grup event, urutan data: "Earlier · Thu, Oct 1", "Today · Wed, Oct 7", "Tomorrow · Thu, Oct 8", "This week", "Later") atau **Type** (urutan `TYPES`).
- Kartu (`EventCard`): kolom waktu (`time` bila grup Today/Tomorrow, selain itu `day`); judul + badge ulang (`Repeat` 13 + teks repeat); `range · place`; Pill outline tipe + StatusPill (`Canceled` / `Done` / `Today` / `Upcoming`); event Done punya tombol **View results** (terkonfirmasi atau Member) atau **Check results** (PM/Admin, belum terkonfirmasi).
- Tanpa hasil: ikon `SearchX`, **"No events match these filters."** + **Reset filters**.
- Kosong (Member tanpa event, `events.empty`): ikon `CalendarDays`, **"No events yet"** / **"Meetings or events you attend will show up here."** + **New event** (`Plus`) → `/events/new`.

### 2.1 Filter & sort (`events.filter`)

- **Show** `'Upcoming','Past'` (tidak tampil di kalender; kalender memakai `when = null`), **Event type** `'All','Meeting','Review','Important','Team event','Other'`, **Project** (`All projects` + proyek), **Group by** `'Schedule','Type'` (tidak tampil di kalender). Reset/Apply (store query, K4).
- `isPast(e)` = Done atau tanggal pertama < hari ini. `isFiltered` mengabaikan grouping.

## 3. Kalender (`EventsCalendar`)

- Seg **Month / Week**. Judul di antara panah: Month "October 2026"; Week "Oct 5 – 11" atau "Oct 26 – Nov 1". Label panah "Previous month/week", "Next month/week".
- Grid Senin-pertama (`Mon … Sun`), sel kosong sebelum tanggal 1. Tiap tanggal: angka + titik (satu bila 1 event, dua bila 2+, tidak ada bila 0). Label aksesibilitas "Thu, Oct 8"; terpilih `accessibilityState.selected`.
- Buka di Month dengan hari ini terpilih. Panah bulan memilih tanggal 1 bulan itu (hari ini bila kembali ke bulan berjalan); panah pekan menggeser tanggal terpilih 7 hari. Week menampilkan pekan tanggal terpilih.
- Agenda di bawah garis: **"Thu, Oct 8 · n events"** ("1 event"), urut jam mulai; kartu: waktu, judul, `type · status`; tap = `eventHref`. Kosong: **"No events on this day."**
- Event berulang muncul tiap `REPEAT_DAYS` (`daily` 1, `every week` 7, `every 2 weeks` 14) setelah tanggal pertama, ke bulan berikutnya juga. Seri yang dibatalkan seluruhnya berhenti berulang; pembatalan sekali (`canceled.once`) hanya menandai tanggal itu, tanggal berikutnya tetap Upcoming.
- Grid dibuat sendiri (bukan gluestack Calendar alpha): `View` baris × 7 `Pressable`, lebar sel `flex: 1`. Tanpa gesture swipe (prototipe hanya panah).

## 4. Detail (`Detail`, upcoming/recurring)

- Header **"Event detail"**, chevron back; ⋯ **"Event actions"** untuk editor (non-member atau pembuat): **Cancel event** (bila belum batal) + **Move to Archive** (danger); sheet varian `-recurring` bila `repeat`.
- Kepala: judul, StatusPill, Pill tipe, Pill **Repeats** (`Repeat` 12) bila berulang. Dibatalkan → kotak alasan (`Canceled`).
- **Edit** (primary, block) untuk editor dan belum batal → `/events/new?event=<id>`.
- Facts (`Facts`): tanggal, waktu, lokasi (`EV.where`: "Online" / "In person · <place>"), project (tautan ke `/projects/<id>`), reminder — port dari `events.detail.jsx`.
- **Attendees (n)**: pembuat dulu; peran "Creator", "Note-taker" (`noteTaker`).
- **Agenda**: butir, atau "No agenda yet".
- **Minutes** (Pill "None yet"), bila belum batal: **Type** → `outcomes/2`; **Photo** (toast "Take a photo of the whiteboard or notes"); **Voice · from <start>** → `record`.
- Akses: Admin "You can change this event as an Admin"; Member "Only the creator (<creator>), the project manager or an Admin can change this event."; pembuat "You created this event".
- Kaki: "Created by X · Updated Y · by Z".

## 5. Sheet

| Sheet | Copy | Aksi |
|---|---|---|
| Cancel (`CancelSheet`) | **"Cancel event?"**; **Reason \*** (placeholder "Why isn't…" — ambil persis), "The reason shows in the event detail and in the attendees' notifications."; checkbox **"Also create a replacement event"** | `cancelEvent` → "Event canceled" → tutup; replacement → `/events/new` |
| Cancel recurring | **"Cancel recurring event?"** + **"Which one?"** radio Only this one / All recurring ("Only this occurrence; the next ones continue.") | `cancelEvent(id, reason, by, { once })` |
| Archive (`ArchiveSheet`) | **"Archive event?"**; "The event moves to Archive and can be restored anytime. Minutes and meeting outcomes move with it. Tasks already created from the outcomes …" (ambil persis); "Meeting not happening? Use Cancel event …" (tautan ke sheet cancel) | `archiveEvent` → `router.dismissTo('/events')` → snack **"Event moved to Archive"** + **Undo** |
| Archive recurring | **"Archive recurring event?"** + "Which one?" | `archiveEvent(id, by, { once })`; sekali = hanya kemunculan itu |

Tombol pasangan `Pair`: back (**Cancel**) + primary/danger; primary disabled sampai Reason terisi (UX §5).

## 6. Form new/edit (`EventForm`)

- Judul **"New event"** (edit: judul edit dari sumber), modal dengan chevron "Cancel".
- **Title \*** (placeholder "What is the meeting about?"), **Date \*** (select: hari ini s.d. akhir bulan, label "Thu, Oct 8"), **Start** / **End** (select 7:00–21:00 tiap 15 menit; `FIRST_HOUR 7`, `LAST_HOUR 21`, `STEP_MIN 15`), error **"The end time must be after the start time."**
- **Location**: Seg `In person` / `Online` + tempat (Online hint "Online: paste the meeting link (Google Meet / Zoom).").
- **Attendees · picked from team members** + "Add person".
- **Add more details** / **Hide details** (param `details`): **Event type** chips (`TYPES`), **Project** (hint "Meeting outcomes become tasks in this project."), **Agenda · one item per line**, **Repeat** (`REPEATS`: No / Daily / Every week / Every 2 weeks), **Reminder** ("1 day & 30 min before", toast "Pick reminder times").
- Catatan "Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically."
- **Save** → `addEvent` / `editEvent` → "Event saved" / "Event updated" → tutup modal.
- Pilihan tanggal/waktu memakai **select** seperti prototipe (bukan DateTimePicker), jadi tidak butuh paket picker untuk modul ini.

## 7. Rekaman dan outcomes (tanpa audio nyata, K10)

- **Recording mode** (`record`): kepala event + "View meeting details ›" (→ detail); "Uses this phone's microphone. Put the phone in the middle of the table for clearer sound."; checkbox **"Attendees have been told this meeting is recorded"** ("Required before recording"); **Start recording** (disabled sampai dicentang) → `recording`; "Other ways": **Type notes** → `outcomes/2`, Photo (toast).
- **Recording** (`recording`): timer **00:14:52** (statis seperti prototipe), "Keep the screen on and this app open while recording. Audio is saved as you go."; **Pause** (toast "Recording paused") / **Stop recording** → `outcomes/1`. Back gesture dimatikan.
- **Step 1** ("Recording done"): putar (toast "Playing the recording"), **Turn into text ✦** → step 2, **Type it myself**, Photo (toast), **Upload a recording** (toast "Pick an audio file"); catatan AI-assisted.
- **Step 2** ("Check the text" / "Minutes · editable"): transkrip `standup`; **Save and exit** (back, "Draft saved") / **Next ›** → step 3; "Next: AI sorts out tasks from this text".
- **Step 3** ("Tasks from this meeting"):
  - Member: StatusPill "Waiting for <creator> to review"; kotak "Waiting for <creator> to confirm" / "You can only read these meeting outcomes."; draf baca-saja.
  - PM/Admin: kartu draf (`standup.tasks`) dengan **Edit** (toast), **Remove** (Admin: **Discard**), due select ("Pick a due date"; "Fill in the due date first" bila kosong); keputusan/info/pertanyaan ("View", toast). **Create n tasks** (disabled sampai semua due terisi) → `confirmOutcomes` → notice "n tasks created · outcomes confirmed" → results.
- **Results** (`DetailConfirmed`, "Meeting outcomes"): "Confirmed by …", tugas yang dibuat (tap → `/tasks/<no>` atau `/tasks?scope=all`), Decisions, Info, **Open questions (1)**, sumber, **See full minutes** → step 2.

## 8. Data dan logika

| Berkas baru | Port dari | Isi |
|---|---|---|
| `sample/events.extra.ts` | `sample.js` `events[].day/group/repeat/creator/noteTaker/agenda/updated`, `kickoff`, `standup` | `EVENT_EXTRA: Record<id, …>`, `EVENT_RESULTS` (kickoff), `STANDUP` (ISO; `group` diturunkan, bukan disalin) |
| `events.shared.ts` | `events.shared.js` | `TYPES`, `REPEATS`, `eventStatus`, `eventWhere`, `eventStart/End`, `isConfirmed`, `eventHref(e)` |
| `events.dates.ts` | `events.calendar.jsx`, `events.query.js`, `events.store.js` | `monthOf`, `weekOf` (Senin-pertama), `col`, `firstDate`, `occursOn`, `eventsOn`, `startMinutes`, `groupLabel(date)` ("Today · Wed, Oct 7"…), `monthTitle`, `weekTitle`, `dateLabel` — **tanpa `toLocaleDateString`**: nama bulan/hari dari array (deterministik di Hermes dan Jest), memakai `src/data/dates.ts` Sesi B |
| `events.query.ts` | `events.query.js` | `WHEN`, `TYPE_FILTERS`, `GROUPS`, `BASE_QUERY`, `isFiltered`, `isPast`, `applyQuery`, `groupEvents`, `searchEvents` |
| `events.store.ts` | `events.store.js` | `addEvent`, `editEvent`, `cancelEvent`, `archiveEvent` (`once`), `restoreEvent`, `confirmOutcomes`, `listArchivedEvents`, `resetEvents` |
| `events.form.ts` | `events.new.jsx` | `DATES` (hari ini s.d. akhir bulan), `TIMES` (7–21 per 15 menit), `validateEvent` (end > start, title wajib) |
| `events.ts` | — | Titik tukar API: `getEventsList(role, { query, search })`, `getEventsCalendar(role, { view, picked, query })`, `getEventDetail(role, id)` → `{ event, editor, menu, access }`, `getEventForm(id?)`, `getOutcomes(role, id, step)`, `getEventResults(id)` |

- Sampel Sesi B `sample/events.ts` (`date` ISO, `time`, `range`, `place`, `mode`, `type`, `status`, `canceled?`, `attendees`) dibaca, tidak diubah (K7). `type` Sesi B belum mencakup `'Other'`; perlebar di `events.shared.ts`.
- Semua event sampel milik Atlas (`PROJECT`), sampai form memilih proyek lain.

## 9. Berkas layar (`src/screens/events/`, tiap ≤ 150 baris)

`events.strings.ts`; `list/events.screen.tsx` (menggantikan placeholder T5), `list/event-card.tsx`, `list/event-groups.tsx`; `calendar/events-calendar.tsx`, `calendar/month-grid.tsx`, `calendar/calendar-title.tsx`, `calendar/agenda-list.tsx`; `filter/events-filter.screen.tsx`; `detail/event-detail.screen.tsx`, `detail/event-facts.tsx`, `detail/event-minutes.tsx`; `sheets/cancel.screen.tsx`, `sheets/archive.screen.tsx`; `form/event-form.screen.tsx`, `form/event-details.tsx`; `record/record-ready.screen.tsx`, `record/recording.screen.tsx`; `outcomes/outcomes.screen.tsx`, `outcomes/step3-drafts.tsx`; `results/results.screen.tsx`.

## 10. Risiko

| Risiko | Penanganan |
|---|---|
| Format tanggal `Intl` berbeda di Hermes/Jest | Formatter sendiri (§8), tes snapshot string |
| Zona waktu | Semua tanggal ISO string + helper UTC Sesi B; tidak membuat `Date` lokal |
| Recording: layar mati | Phase 1 timer statis; `expo-keep-awake` baru saat rekaman nyata (Phase 2+) |
| Form dengan banyak select + keyboard | §7 main doc; select gluestack membuka Actionsheet sehingga keyboard tertutup dulu |
| `dismissTo` setelah konfirmasi outcomes | Tes route; cadangan `replace` |

## 11. Tes (`__tests__/events/`)

- **Unit**: `events.dates` (monthOf Oktober 2026 = 31 hari, kolom pertama Kamis; weekOf lintas bulan "Oct 26 – Nov 1"; `occursOn` every 2 weeks ke November; cancel sekali vs seluruh seri), `events.query` (isPast, filter tipe/proyek, group Schedule vs Type, isFiltered abaikan grouping), `events.store` (port `events.store.test.js`: add/edit/cancel/archive once/restore/confirm + reset), `events.form` (TIMES 57 entri 7:00–21:00, validasi end > start).
- **Port tes prototipe**: `events.filter` (Show disembunyikan di kalender, Reset/Apply, titik), `events.calendar` (dua titik untuk 2+, panah bulan/pekan, agenda urut jam, "No events on this day."), `events.items` (tombol View/Check results per role, badge repeat, Member hanya event yang dihadiri, empty Member).
- **Alur**: detail → record (Start disabled sampai consent) → recording → step1 → step2 → step3 (Create disabled sampai due terisi) → results; Member di step 3 hanya membaca.
- **Snack**: archive → list Events + "Undo" → event kembali.
