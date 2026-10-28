# Fase 2 — Peta layar ↔ endpoint: Acara (Events)

Rujukan W3. Dokumen analisis, **bukan implementasi** (2026-10-28, `feature/mobile-api-wiring` @ `fc0ab4e`).
Aturan lintas modul (galat seragam, K5, rate limit, `href` web, `can{}`) di kepala `phase2-map-home-inbox-team.md`.

- **Sumber yang diverifikasi:** `server/api/app-events{,.write,.notes,.trash,.schema}.ts`,
  `server/event/{events.dto,events.range}.ts`, `server/access/capabilities.ts`, `server/pm/enums.ts`, dan
  `mobile/src/data/events*.ts` + `mobile/src/screens/events/**` saat ini.
- **Acuan lama:** `git show 2a985b7^:mobile/docs/phase2-map-events.md` (26 Okt; GAP-A1..A15, GAP-B1..B12, nomor baris).
  Yang berubah sejak itu: **`GET /events?from=&to=`** (`168ab349`) menutup GAP-A9 (kalender), dan
  `DELETE /trash/:kind/:id` ada. Yang **tidak** berubah: pengulangan (E-16) dan outcomes (E-13) tetap 422;
  tak ada `updatedBy`; peserta tetap `{ id, name }` tanpa peran.
- Fondasi W2: jam server + helper instan. Semua `startsAt`/`endsAt`/`canceledAt`/`createdAt`/`updatedAt`
  adalah **instan ISO** → format di zona tim (`now.timeZone`), bukan `toUtc()`.

Enum: kind `meeting|review|important|team|other`; lokasi `offline|online`; status notulen `draft|confirmed`;
pengingat bawaan `[1440, 30]` menit.

---

## 0. Endpoint modul ini

| Endpoint | Balasan / catatan |
|---|---|
| `GET /events?tab=upcoming\|past&kind(berulang)&projectId&q&limit&cursor` | `{ items: EventListItem[], nextCursor, caps: { createEvent } }`. `q` = judul saja (≤100). Kursor rusak → 400 `BAD_CURSOR` |
| `GET /events?from=YYYY-MM-DD&to=YYYY-MM-DD[&kind&projectId&q]` | Jendela kalender (zona tim, **inklusif**, ≤ **92 hari**, keduanya wajib): event yang menyentuh hari itu, masa lalu ikut, `tab` diabaikan. Salah → 422 `VALIDATION` (pesan Indonesia). Tetap ber-kursor (`limit` maks 100) |
| `GET /events/agenda` | ≤ 4 event saya hari ini + besok (widget Beranda; bukan untuk kalender) |
| `GET /events/people?q&projectId` | `{ items: [{ id, name, jobTitle, image }] }` kandidat tamu |
| `GET /events/:id` | `EventDetail`; tersembunyi/hilang/Sampah = 404 sama |
| `POST /events` | `{ title, startsAt, endsAt, kind?, locationType?, locationText?, meetingUrl?, agenda?, remindersMinutes?, projectId?: id\|null, participantIds: id[] (1–100) }` → 201. `recurrence`/`outcomes`/`seriesId` → 422 |
| `PATCH /events/:id` | Sama tanpa `projectId`/`participantIds` (keduanya 422) |
| `POST /events/:id/cancel` | `{ reason }` (1–500) → `EventDetail` |
| `POST /events/:id/participants` | `{ userIds }` → `{ participants }` (undang ulang = no-op) |
| `DELETE /events/:id/participants/:userId` | `{ participants }` |
| `PUT /events/:id/note` | `{ body, status?, baseUpdatedAt? }` → `{ note, badge }`; 409 `NOTE_CONFLICT` membawa `note` terbaru |
| `DELETE /events/:id` | Ke Sampah → `{ trash: { kind:'event', id, label } }`; sesi saja |
| `POST /trash/event/:id/restore` | Urungkan → `{ id }`; 409 bila proyek di Sampah |

---

## 1. Layar/aksi → endpoint

| Layar (rute → berkas) | Titik tukar | Endpoint |
|---|---|---|
| Daftar `(tabs)/events/index?view=list` → `list/**` | `getEventsList` (`events.list.ts`) → `eventsFor`, `applyQuery`, `searchEvents`, `groupEvents` | `GET /events?tab&kind&projectId&q` + Load more |
| Filter `(tabs)/events/filter` → `filter/**` | `events.query.ts` | Show → `tab`; Type → `kind`; Project → `projectId` (opsi dari `GET /projects`); Group by tetap klien |
| Kalender `?view=calendar` → `calendar/**` | `getEventsCalendar`, `stepCalendar`, `events.dates.ts` | **Bulan:** `from=<tgl 1>&to=<akhir bulan>`; **pekan:** Minggu–Sabtu; ikuti `nextCursor` sampai habis (bulan padat > 100). `hiddenByFilters` = panggilan kedua tanpa filter (atau dihilangkan) |
| Detail `[id]/index` → `detail/**` | `getEventDetail` | `GET /events/:id` |
| Notulen (Type) | `detail/event-minutes.tsx` | `PUT /events/:id/note` |
| Form New/Edit `events/new?event=<id>` → `form/**` | `getEventForm`, `addEvent`, `editEvent`, `validateEvent`, `dates`, `agendaLines` | `POST /events` / `PATCH /events/:id` + tamu lewat `participants` |
| Cancel `[id]/cancel` → `sheets/**` | `cancelEvent` | `POST /events/:id/cancel` |
| Archive `[id]/archive` → `sheets/**` | `archiveEvent`, `restoreEvent`, `canRestoreEvent` | `DELETE /events/:id` → Urungkan `POST /trash/event/:id/restore` |
| Rekam / Recording / Outcomes / Results `[id]/{record,recording,outcomes/[step],results}` | `getOutcomes`, `getEventResults` (`events.results.ts`), `confirmOutcomes` | **Tak ada endpoint** — GAP E-1 |
| My calendar (Profil) | lihat `phase2-map-profile-archive.md` §3 | `GET /events?from&to` |

---

## 2. Pemetaan bidang

### 2a. Daftar + kalender (`EventItem` / kartu ← `EventListItem`)

| Mobile | Server | Status |
|---|---|---|
| `id` (slug `kickoff`) | `id` (uuid) | Ganti fixture/tes |
| `title` | `title` | ✓ |
| `date`, `time`, `range`, label grup | `startsAt`, `endsAt` + zona tim | Klien (helper instan W2) |
| `mode` | `locationType` | Peta enum |
| `place` (satu teks) | `locationText` + `meetingUrl` | Dua bidang; tautan bisa dibuka |
| `type` | `kind` | Peta enum, label Inggris |
| `status` Done/Today/Upcoming/Canceled | `canceledAt` + `endsAt` vs `now.iso` + `today` | Klien, jam server |
| `canceled {reason, by}` | `cancelReason` (daftar), `canceledBy` (detail) | ✓ |
| `canceled.once`, `repeat`, badge Repeat, `occursOn`, `occurrenceStatus` | — | **GAP E-2** |
| `eventProject(e)` (melempar bila tanpa proyek) | `project: {id,name,status}\|null` | `null` = acara pribadi → **perbaiki** (jangan melempar) |
| `attendees: string[]` (nama) | `participants {total, isParticipant}` | Hitungan + penanda "kamu diundang" |
| `card.results` view/check | `noteStatus` (`draft\|confirmed\|null`) | Ganti jadi pil notulen (E-1) |
| `eventsFor(role)` (Member hanya yang dihadiri) | Visibilitas di SQL server | **Hapus** aturan klien |
| Cari judul **atau lokasi** | `q` judul saja | **GAP E-5** |
| `dots`/`agenda` kalender dari larik penuh | Item jendela `from–to` | ✓ (GAP lama A9 tertutup) |
| — | `can{}`, `caps.createEvent` | Tombol New event / menu |

### 2b. Detail (`EventDetailData` ← `EventDetail`)

| Mobile | Server | Status |
|---|---|---|
| Facts waktu/lokasi/proyek | `startsAt/endsAt`, `locationType/Text`, `meetingUrl`, `project` | ✓ |
| Facts reminder (teks tetap) | `remindersMinutes: number[]` | Render dari larik ("1 day & 30 min before") |
| Attendees (pembuat dulu) | `participants: {id,name}[]` + `creator` | Urutan di klien |
| Peran "Note-taker" | — | **GAP E-3** |
| Agenda butir | `agenda: string\|null` | `agendaLines` |
| Pil Minutes "None yet" | `note {body, status, updatedAt}\|null` | Nyata |
| `editor`/`menu`/`access` dari role | `can.update/cancel/trash/manageParticipants/writeNote` | **Hapus** aturan klien |
| Kaki "Created by X · Updated Y · by Z" | `creator`, `createdAt`, `updatedAt`; **tanpa `updatedBy`** | **GAP E-4** |
| Kotak Canceled | `canceledAt`, `cancelReason`, `canceledBy` | ✓ |

### 2c. Form

| `EventFields` | Server | Status |
|---|---|---|
| `title` | `title` (≤150) | ✓ |
| `date` + `start`/`end` ("10:00 AM") | `startsAt`/`endsAt` instan | Gabung di klien dengan zona tim; `end > start` |
| `mode`, `place` | `locationType`, `locationText` (≤200) / `meetingUrl` (≤500, divalidasi) | Pisah dua isian |
| `type` | `kind` | ✓ |
| `project` (default `'atlas'`) | `projectId\|null` | Tambah opsi "No project"; **tak bisa diubah saat Edit** (422) |
| `attendees` (nama) | `participantIds` (create) / `participants` POST/DELETE (edit) | Kandidat `GET /events/people`; Edit = selisih → beberapa panggilan |
| `agenda[]` | `agenda` (≤5000) | Gabung per baris |
| `repeat` | 422 | E-2 → sembunyikan |
| reminder (teks) | `remindersMinutes` (≤5, ≤10.080) | Kirim larik; bawaan `[1440, 30]` |
| `DATES` mulai `today()` | `now.today` server | ✓ (sudah lewat `clock.ts`) |

---

## 3. Kalimat server (Indonesia, K5)

Pesan galat tulis (`VALIDATION` termasuk pesan rentang tanggal, `NOTE_CONFLICT`, tautan rapat tidak sah,
`PROJECT_IN_TRASH`), `BAD_CURSOR`, `trash.label`, serta alasan pembatalan dan isi notulen (ditulis manusia).
Label kind/lokasi/status, label waktu, dan "N events" tetap Inggris dari klien.

**Catatan alasan disabled:** `can{}` hanya membawa **kode** (mis. `IMPERSONATING`, `LOCKED_BY_STATUS`); kalimatnya
(`capMessage`/`DENY_UI`) **tidak dikirim**. Mobile butuh katalog kode → kalimat sendiri (GAP E-6, berlaku juga
untuk Proyek, Tugas, dan Sampah).

---

## 4. Aksi tulis + pengaman

| Aksi | Endpoint | `can` | Pengaman |
|---|---|---|---|
| Buat acara | `POST /events` | `caps.createEvent` (juga `whoami.caps.createEvent`) | — |
| Edit acara | `PATCH /events/:id` (+ participants) | `update` | — |
| Undang tamu | `POST …/participants` | `manageParticipants` | — |
| Keluarkan tamu | `DELETE …/participants/:userId` | `manageParticipants` | **T2** (keluarkan anggota) |
| Batalkan acara | `POST /:id/cancel {reason}` | `cancel` | Sheet + alasan wajib (sudah ada); tidak bisa dibatalkan balik → perlakukan **T2** (copy dampak: tamu diberi tahu) |
| Pindah ke Sampah | `DELETE /events/:id` | `trash` | **T1**: langsung, notice + **Urungkan** (`POST /trash/event/:id/restore`) — sheet konfirmasi mobile saat ini boleh dipangkas sesuai T1 |
| Tulis notulen | `PUT /:id/note` | `writeNote` | 409 `NOTE_CONFLICT` → tampilkan versi terbaru + pilihan timpa/salin |
| Konfirmasi notulen | `PUT /:id/note {status:'confirmed'}` | `writeNote` | — |

Setelah tulis: `invalidate` daftar + jendela kalender yang terkena + detail + Home (agenda) + My calendar.
Aturan klien yang **dihapus**: `eventsFor(role)`, cabang role di `getEventDetail` (`editor`, `menu`, `access`),
`canRestoreEvent`, `forgetArchivedEvent`, `confirmOutcomes` yang membuat tugas lokal.

---

## 5. Usulan pembagian 2 worker (berkas disjoint)

| Worker | Berkas milik | Isi |
|---|---|---|
| **A — Daftar + kalender** | `data/events.ts`, `events.list.ts`, `events.query.ts`, `events.calendar.ts`, `events.dates.ts`, `screens/events/{list,filter,calendar}/**`, `app/(tabs)/events/{index,filter}.tsx`, tes terkait | Resource daftar ber-kursor (tab/filter), resource jendela kalender per bulan/pekan, Load more, `caps.createEvent` |
| **B — Detail + tulis** | `data/events.detail.ts`, `events.form.ts`, `events.store.ts`, `events.results.ts`, `screens/events/{detail,form,sheets,record,outcomes,results}/**`, `app/(tabs)/events/[id]/**`, `app/events/new.tsx`, tes terkait | Detail, notulen + konflik, form create/edit + selisih tamu, cancel, Sampah + Urungkan, menyembunyikan alur rekaman/outcomes (E-1) |

`events.shared.ts` (pemetaan DTO → `EventItem`, label enum, `eventWhere`, `eventHref`, `eventProject`) dipakai
keduanya: usul **B** memilikinya dan menulisnya lebih dulu (langkah 0, di-review koordinator), A mengimpor.
`profile.calendar.*` (My calendar) milik peta Profil, tetapi memakai pemetaan yang sama dari `events.shared.ts`.

---

## 6. GAP

Nomor baru (E-*) dengan nomor lama di kurung.

| # | Layar | Masalah | Usulan | Butuh keputusan |
|---|---|---|---|---|
| E-1 (A8) | Rekam, Outcomes, Results | Rekaman, transkrip, draf tugas AI, keputusan/info/pertanyaan tak punya endpoint (E-13 "Could"); hanya notulen teks (`note.body`) | Fase 2: sembunyikan Record/Outcomes/Results; notulen Type tetap jalan lewat `PUT /note` | **User/Nico** |
| E-2 (A4, A5) | Daftar, kalender, form, cancel | Pengulangan + batal/arsip satu kemunculan (E-16) | Sembunyikan Repeat + varian "-recurring" | **Nico** (jadwal E-16) |
| E-3 (A6) | Detail | Peran Note-taker | Hilangkan label | User |
| E-4 (A7) | Detail | `updatedBy` tak ada | Kaki "Updated <waktu>" tanpa nama | — |
| E-5 (A10) | Cari | Lokasi tak ikut dicari | Ubah placeholder jadi "Search event title" | User |
| E-6 (A12) | Semua modul | Kalimat alasan disabled tak dikirim (hanya kode) | Katalog kode → kalimat di mobile (Inggris, atau salin Indonesia dengan tes penjaga), **atau** server mengirim `capMessage` | **User/Nico** |
| E-7 | Kalender | Bulan padat > 100 event = beberapa halaman; `hiddenByFilters` butuh panggilan kedua | Ikuti kursor; hilangkan petunjuk "hidden by filters" bila mahal | User (copy) |
| E-8 | Form Edit | Proyek acara tidak bisa diganti setelah dibuat | Kunci pemilih proyek saat Edit | — |
| — (A9) | Kalender | Rentang tanggal | **Tertutup**: `?from=&to=` | — |
| — (A11) | Semua | `today`/`timeZone` | **Tertutup** oleh jam server W2 (`GET /home.now`) | — |
