# Fase 2 — Peta layar ↔ endpoint: Beranda, Inbox, Tim

Rujukan W3 (papan `reacttransition.md` §6c). Dokumen analisis, **bukan implementasi**; ditulis
2026-10-28 di `feature/mobile-api-wiring` (`fc0ab4e`).

- **Sumber yang diverifikasi:** `server/api/app-{home,inbox,team,team.picker,whoami}.ts`, DTO di
  `server/home/home.dto.ts`, `server/notification/notification.{query,catalog}.ts`,
  `server/team/team.dto.ts`, `server/access/capabilities.ts`, spesifikasi
  `http://localhost:3005/api/docs/json`, dan `mobile/src/data/*` + `mobile/src/screens/*` saat ini.
- **Acuan lama:** `git show 2a985b7^:mobile/docs/phase2-map-home-inbox-team.md` (ditulis 26 Okt).
  Rute dan DTO modul ini **tidak berubah** sejak itu. Yang berubah: `whoami` kini membawa `caps`
  (`b5d9780`). Profil dan Arsip dipindah ke `phase2-map-profile-archive.md`.
- **Rujukan memakai berkas + simbol**, bukan nomor baris, supaya tidak cepat basi.
- **Pola klien** mengikuti fondasi W2: `resource()` (`ensure`/`reload`/`invalidate`), jam server, dan
  identitas `userId`. `get<Module>()` tetap sinkron membaca store (keputusan user 26 Okt).

Aturan lintas modul (berlaku juga di dokumen peta lain):

- Semua `/api/app/*` menjawab 401 tanpa sesi lewat `appContext`. Bentuk galat seragam
  `{ error, code, status, requestId }`; `error` berbahasa Indonesia dan **ditampilkan apa adanya**
  (K5). 401/403 `ACCOUNT_*` diteruskan ke `applyApiError()` (`src/session`) supaya gerbang ikut bergeser.
- Tulis dibatasi 60 permintaan/60 detik per user (`server/pm/limits.ts`) → 429 + `retryAfterSeconds`.
- Mobile memakai sesi Better Auth, bukan API key: rute di `PM_KEY_DENY` tetap bisa dipakai.
- `href` dari server adalah jalur **web** (`/app/tasks/14`); jangan dipakai mentah, petakan ke rute Expo.

---

## 0. Endpoint modul ini

| Endpoint | Berkas | Balasan |
|---|---|---|
| `GET /api/app/whoami` | `app-whoami.ts` | `{ userId, name, role, caps: AppCaps }`; `AppCaps = { createProject, createEvent, dashboard, dev }` (boolean) |
| `GET /api/app/home` | `app-home.ts` | `HomeData` (`home.dto.ts`): `now` + 8 bagian `Widget<T> = {ok:true,data}\|{ok:false}` |
| `GET /api/app/tasks/counts` | `app-tasks.ts` | `{ mine: {per kelompok jadwal}, byStatus }` (detail di peta Tasks) |
| `GET /api/app/inbox?lane=action\|info&cursor&limit` | `app-inbox.ts` | `{ items: InboxItem[], nextCursor }`; kursor rusak → **400 `BAD_CURSOR`** |
| `GET /api/app/inbox/count` | `app-inbox.ts` | `{ action, infoUnread }`; aman untuk polling (lolos rate limit IP, tak di-cache) |
| `POST /api/app/inbox/:id/read` | `app-inbox.ts` | `{ ok: true }`; 404 bila bukan kartu pemanggil |
| `POST /api/app/inbox/read-all` | `app-inbox.ts` | `{ updated }`; hanya lajur `info` |
| `GET /api/app/team?projectId&q&sort&limit&offset` | `app-team.ts` | `{ summary, people, total }`; `sort=active\|overdue` bisa **422 `SORT_NOT_ALLOWED`**; `projectId` tersembunyi → **404** |
| `GET /api/app/team/:userId` | `app-team.ts` | `GetPersonOk`; orang yang tidak berbagi proyek → **404** (bukan 403) |
| `GET /api/app/team/picker?q&projectId&limit` | `app-team.picker.ts` | `{ items: [{ id, name, jobTitle, image }] }` (dipakai form modul lain) |

---

## 1. Beranda

Layar `app/(tabs)/(home)/index.tsx` → `screens/home/home.screen.tsx`; titik tukar
`getHome(role, src)` (`data/home.ts`), dihitung `home.stats.ts`, `home.focus.ts`, `home.tasks.ts`.
Endpoint utama **`GET /api/app/home`** (satu panggilan, tanpa query). W2 sudah menyiapkan tipe kabel
`data/home.api.ts` dan memakai `now` dari jawaban yang sama untuk jam server.

### 1a. Layar/aksi → endpoint

| Bagian layar | Endpoint | Catatan |
|---|---|---|
| Kepala (sapaan, tanggal) | `home.now` + `whoami` | Sapaan = enum `now.greeting` (`pagi\|siang\|sore\|malam`) → kalimat Inggris di klien |
| Briefing | `home.briefing` | |
| Chip stat | `home.counters` + `home.focus` + `tasks/counts` + `inbox/count` | Lihat GAP H-1..H-6 |
| My Focus + tombol Done/Start | `home.focus` → `POST /tasks/:ref/complete` atau `/start` | `action` server menggantikan `canMarkDone()` |
| Awaiting review (PM) | `home.focus.awaitingReview[]` | Server sudah menyaring dengan `canApproveTask` |
| Agenda | `home.agenda` | Hari ini + besok, `day: 'today'\|'tomorrow'` |
| Proyek | `home.projects` | ≤ 5 |
| Done this week, Latest activity | `home.done`, `home.activity` | |
| Ask Data | `home.ask` | Tepat 3 jawaban tetap (`behind`, `stalled`, `busiest`), tanpa LLM |

### 1b. Pemetaan bidang

| Mobile (`home.types.ts`) | Server (`home.dto.ts`) | Status |
|---|---|---|
| `HomeData.role` | `whoami.role` (`member\|project_manager\|admin\|super-admin`) | Padankan ke 3 role prototipe; **tidak** dipakai sebagai izin |
| `me.name` (nama sapaan) | — | **GAP H-0**: aturan `greetingName` (`server/profile/profile.greeting.ts`) tidak dikirim; ambil `GET /profile.nickname` lalu port aturannya, atau minta server |
| `FocusTask.{no,title,project}` | `focus.items[].{number,title,project.name}` | ✓ |
| `FocusTask.when` | `items[].dueDate` + `overdueDays` + `now.today` | Disusun klien dari jam server |
| `FocusGroupKey` `overdue\|today\|thisWeek` | `items[].group` `overdue\|today\|tomorrow\|week\|later\|none` | Gabung `tomorrow`+`week` → `thisWeek`; `later`/`none` perlu tempat (atau tidak tampil) |
| `canMarkDone()` (`home.focus.ts`) | `items[].action: 'complete'\|'start'\|null` | **Hapus aturan klien**; render tombol dari `action` |
| `openCount` ("See all tasks (N)") | `focus.total` | ✓ |
| `review[]` (PM) | `focus.awaitingReview[]` + `awaitingReviewTotal` | ✓ |
| `pendingUsers` (Admin) | — | GAP H-5 |
| `AgendaEvent.{title,time,date}` | `agenda[].{title,startsAt,endsAt}` + `now.timeZone` | Instan → label lewat helper instan W2 |
| `AgendaEvent.mode` | `agenda[].locationType` | ✓ |
| `AgendaEvent.place` | — | **GAP H-7** (hanya ada di detail event) |
| `agenda.next` (satu) | `agenda[]` (semua hari ini + besok) | Ambil yang pertama, atau tampilkan semua |
| `AgendaProject.{id,name,due}` | `projects[].{id,name,dueDate}` | ✓ |
| `AgendaProject.progress: number` | `projects[].progress.percent: number\|null` | `null` = belum ada tugas, **jangan** tampil 0% |
| `AgendaProject.lead` | — | **GAP H-8** |
| `AgendaProject.status` | `projects[].condition` + `reason` | Konsep beda (kesehatan, bukan siklus hidup); usul pil = `condition` |
| `done[].{title,who}` | `done.items[].{title,byName,dayLabel}` | `byName`/`dayLabel` Indonesia → §1c |
| `activity[].{title,meta}` | `activity[].{text,projectName,at}` | Waktu relatif dari `now.iso`, **bukan** jam HP |
| `ask.{questions,answer,projects}` | `ask[].{question,answer,bars[].{label,pct,display}}` | Kolom tanya bebas tetap dekoratif (tak ada endpoint) |
| `LENGTHS` per role (`home.ts`) | `HOME_*_MAX` di server (`server/home/home.config.ts`) | **Hapus** pemotongan klien |
| — | Tiap bagian `Widget {ok:false}` | **Wajib** state gagal-lunak per kartu + "Try again" (aturan UX project) |

### 1c. Kalimat server (Indonesia, tampil apa adanya — K5)

`briefing.lines[]`, `done.items[].byName` ("Anda", "Belum ada pengerja"), `done.items[].dayLabel`
("hari ini", "kemarin", nama hari), `activity[].text`, `projects[].reason`, `ask[].question`,
`ask[].answer`, `ask[].bars[].display`, `now.dateLabel`, `now.timeLabel`. Yang tetap disusun klien
dalam bahasa Inggris: sapaan (dari enum), label chip, label tanggal jatuh tempo.

### 1d. Aksi tulis

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Done di My Focus | `POST /api/app/tasks/:ref/complete` (`action === 'complete'`) | Tidak ada (bisa dibuka lagi lewat `reopen`); loading di tombol, notice sukses/gagal |
| Start di My Focus | `POST /api/app/tasks/:ref/start` (`action === 'start'`) | Sama (`unstart`) |

Setelah tulis: `invalidate` resource Home, `tasks/counts`, dan daftar Tasks (aturan W2).
`markFocusDone` + `doneLog` (`home.actions.ts`) yang menulis riwayat lokal **dihapus**: riwayat
tugas dibuat server.

---

## 2. Inbox

Layar `app/(tabs)/more/inbox.tsx` → `screens/inbox/{inbox.screen,respond.tab,updates.tab,inbox-card}.tsx`;
titik tukar `getInbox`, `respondCards`, `updateDays` (`data/inbox.ts`), `inbox.store.ts` (satu bendera
"semua terbaca"), `inbox.links.ts` (menebak pelaku dari teks).

### 2a. Layar/aksi → endpoint

| Layar/aksi | Endpoint |
|---|---|
| Tab ① Needs your response | `GET /inbox?lane=action` (default lajur) |
| Tab ② Latest updates | `GET /inbox?lane=info` |
| "Load more" (keduanya) | `?cursor=<nextCursor>`; `limit` default 25, maks 100 |
| Badge/jumlah (segmen, tile More, profil, chip Beranda) | `GET /inbox/count` → `action`, `infoUnread` |
| Buka kartu | `POST /inbox/:id/read` lalu navigasi |
| Mark all as read | `POST /inbox/read-all` → `{ updated }` |

Kartu tidak pernah dibuat/dihapus dari klien: muncul karena `notify()`, hilang karena diselesaikan.

### 2b. Pemetaan bidang

| Mobile (`RespondCard`, `UpdateRow`) | Server (`InboxItem`) | Status |
|---|---|---|
| `key` | `id` | ✓ |
| `lead {kind:'person', name}` | `actor {id,name,image}\|null` | ✓ (`null` = sistem/akun hilang); avatar nyata dari `image` |
| `lead {kind:'people', names}` (kartu approvals agregat) | Satu kartu `user_pending` per akun | Kelompokkan di klien per `kind` |
| `lead {kind:'ai'}` (konfirmasi outcomes) | Tidak ada `kind` itu | **GAP I-1** |
| `title` | `sentence` | §2c; `null` untuk `kind` yang build ini tak kenal → sembunyikan kartu atau copy jatuh-balik |
| `meta` | `ref.number` + `payload.projectName` + `createdAt`/`updatedAt` | Disusun klien dengan jam server |
| `body` | `payload.excerpt` (≤ 140) / `payload.title` | ✓ |
| `why` (alasan reviewer) | — | **GAP I-2**: kartu review `shipped: false` |
| `action` (label tombol) | `button` | §2c |
| `href` (rute Expo) | `href` web | Petakan `/app/tasks/:n`, `/app/projects/:id`, `/app/events/:id`, `/dashboard/users` → rute Expo; tak dikenal → tanpa tombol |
| `actor(title, meta)` heuristik | `actor` eksplisit | **Hapus** heuristik `inbox.links.ts` |
| `UpdateDay.day` `Today\|Yesterday` | `group` `today\|yesterday\|older` | Tambah kelompok **Older**; jangan hitung ulang hari |
| `unread` (bendera global) | `read` per kartu | Ganti store jadi per kartu |
| — | `bundleCount` | "5 changes" untuk kartu yang dibundel |

Kind yang sudah `shipped` (`notification.catalog.ts`): lajur action = `task_assigned`, `user_pending`;
lajur info = `task_unassigned`, `task_done`, `task_commented`, `task_changed`,
`project_member_added`, `project_role_changed`, `event_reminder`, `event_invited`, `event_changed`,
`event_canceled`, `leave_recorded`. Belum: `task_review_requested`, `task_review_fallback`,
`task_returned`, `mention`. Akibatnya kartu prototipe "review", "second opinion", dan "mention"
**tidak akan pernah datang** sampai server mengirimnya (GAP I-2).

### 2c. Kalimat server (K5)

`sentence` dan `button` (Indonesia, dari `notification.catalog.ts`), serta pesan `BAD_CURSOR`.
Label tab, "Mark all as read", kelompok hari, dan "N changes" tetap Inggris dari klien.

### 2d. Aksi tulis

| Aksi | Endpoint | Pengaman |
|---|---|---|
| Buka kartu (tandai terbaca) | `POST /inbox/:id/read` | Tidak perlu; gagal → navigasi tetap jalan, tampilkan galat ringan |
| Mark all as read | `POST /inbox/read-all` | Tidak perlu (tidak destruktif); loading + disabled saat `infoUnread === 0` ("Everything here is read") |

Kartu `action` tidak bisa dibisukan maupun ditandai terbaca massal: kartu itu antrean kerja.

---

## 3. Tim (list + orang)

Layar `app/(tabs)/more/team/{index,[id]}.tsx` → `screens/team/{team.screen,person.screen,person-row}.tsx`;
titik tukar `getTeam(role, src)` (`data/team.ts`), `getTeamPerson(role, key, src)` (`data/team.person.ts`),
`team.load.ts`.

### 3a. Layar/aksi → endpoint

| Layar/aksi | Endpoint |
|---|---|
| Daftar tim | `GET /team?limit=24&offset=0` |
| Cari | `?q=` (≤ 100 char) — pindah dari filter klien |
| Pemilih "All projects" | `?projectId=` (kini dekoratif → aktifkan) |
| "Sort: Name" | `?sort=name\|active\|overdue` (tangani 422 `SORT_NOT_ALLOWED`) |
| Load more | `offset` + `total` (maks `limit` 50) |
| Orang | `GET /team/:userId` (param rute `[id]` jadi `userId`, bukan `PersonKey`) |

### 3b. Pemetaan bidang

Kontrak privasi Tim = **kunci absen**, bukan `can{}`: `load`, `alsoElsewhere`, `tasks`,
`accountRole`, `person.phone`, `summary.active`, `summary.overdue` **tidak ada** bila pemanggil tak
boleh melihat. Mobile bercabang pada ada/tidaknya kunci, bukan pada role.

| Mobile (`TeamRow`, `TeamPersonData`) | Server (`TeamPerson`, `GetPersonOk`) | Status |
|---|---|---|
| `key: PersonKey` | `id` (uuid) | Ganti param rute |
| `full` | `name` | ✓ |
| `you` | `isSelf` | ✓ |
| `role` prosa ("Manager · Atlas Project (Lead)") | `projects: [{id,name,role}]` | Disusun klien |
| `status`/`available` ("Leave planned Oct 12–14") | `availability: {kind:'on_leave', until}\|null` | `null` = tak ada yang ditampilkan, **bukan** "Available" |
| `extra` ("Also on other projects") | `load.alsoElsewhere?: true` | ✓ |
| `load {active, overdue}` | `load?: TeamLoad` | ✓ (absen = sembunyikan) |
| `summary` string | `summary {people, projects, active?, overdue?}` | `active/overdue` = **halaman ini**; `people` = seluruh hasil filter |
| `note` per role | — | GAP T-1 |
| `person.title`, `person.division`, `person.email` | `person.jobTitle`, `person.department`, `person.email` | ✓ |
| `person.role` ("Account role") ke semua | `accountRole?` hanya untuk Admin/Super-admin | Sembunyikan baris saat absen |
| `tasks: null` | `tasksVisible: false` | Bedakan "tak boleh lihat" dari "tak ada tugas" |
| `tasks.rows[].sub` (nama proyek) | `tasks[].projectId` (id saja) + `dueDate` | Nama dari `projects[]` jawaban yang sama |
| `tasks.rows[].pill` "Overdue" | `tasks[].status` + `dueDate` + `now.today` | Pakai jam server |
| `tasks.hidden: string[]` (nama proyek tak dibagi) | `alsoElsewhere?: true` saja (privasi D10) | **GAP T-2**: ubah copy tanpa nama |
| semua tugas aktif | `tasks` dipotong 20 (`PERSON_TASKS_MAX`) | Terima potongan atau tambah "See all" |
| — | `jobTitle`, `image`, `person.phone?` | Belum dipakai mobile |

### 3c. Kalimat server

Tidak ada; semua copy Tim disusun klien. Pesan galat (`SORT_NOT_ALLOWED`, `NOT_FOUND`) tampil apa adanya.

### 3d. Aksi tulis

Tidak ada. Tim hanya membaca.

---

## 4. Izin & role

- **`whoami.caps`** (`AppCaps`) kini ada: `createProject`, `createEvent`, `dashboard`, `dev`. Sheet
  Create, panel More (tile Users/Admin), dan tombol "New project" membaca ini, **bukan** `role`.
  Ini menutup GAP lama "AppCaps tidak dikirim" (K6).
- Beranda tidak memakai `can{}`: tombol baris fokus dari `items[].action`; baris proyek hanya tautan.
- Inbox: satu kartu = satu tombol (`button` + `href`); kartu yang tak boleh dilihat tidak terkirim.
- Satu-satunya cabang role yang sah di modul ini adalah **copy** (catatan Tim, judul "Projects"/
  "Shared projects", label role akun), dari `whoami.role`.
- Mobile mencocokkan orang dengan nama depan (`home.stats.ts`, `home.focus.ts`, `team.load.ts`,
  `inbox.links.ts`). Semua harus memakai `userId` (`samePerson()` dari W2).

## 5. Paginasi & muat ulang

| Layar | Gaya | Batas | Yang harus berubah di mobile |
|---|---|---|---|
| Inbox | keyset `cursor` | 25 / maks 100 | Load more di kedua tab; kelompok hari inkremental lintas halaman; `BAD_CURSOR` → muat ulang dari awal |
| Tim | offset | 24 / maks 50 | Cari/urut/filter ke query; Load more |
| Beranda | tanpa | `HOME_*_MAX` | Hapus pemotongan klien |
| Badge Inbox | polling `GET /inbox/count` | — | Titik polling paling aman (60 detik seperti web) |

---

## 6. Usulan pembagian 2 worker (berkas disjoint)

Prasyarat dari W2: `resource()`, jam server dari `GET /home`, helper instan, `viewer`/`samePerson`,
dan sumber `whoami` (role + caps). Kalau W2 belum memasang `whoami`, worker A yang memasangnya di
`data/whoami.api.ts` dan worker B hanya membaca.

| Worker | Berkas milik | Isi |
|---|---|---|
| **A — Beranda** | `data/home.ts`, `home.types.ts`, `home.stats.ts`, `home.focus.ts`, `home.tasks.ts`, `home.actions.ts`, `data/sample/home.ts`, `screens/home/**`, `__tests__/home/**`, `__tests__/data/home.test.ts` | `GET /home` ke layar, chip dari `tasks/counts`, tombol dari `action`, `Widget {ok:false}` per kartu. **Tidak** menyentuh `home.api.ts` milik W2 kecuali disepakati |
| **B — Inbox + Tim** | `data/inbox*.ts`, `data/sample/inbox*.ts`, `data/team*.ts`, `data/sample/team.ts`, `screens/inbox/**`, `screens/team/**`, `app/(tabs)/more/team/[id].tsx`, `__tests__/inbox/**`, `__tests__/team/**` | Dua lajur + kursor + `read` per kartu + peta `href`; Tim dengan query + kunci absen. Mengekspor `inboxCountResource` untuk dibaca A (chip) dan profil |

Titik sentuh bersama: chip `inbox` di Beranda membaca `inboxCountResource` dari B (A hanya impor).
Tile More (`screens/more/*`) dan profil di luar keduanya, jadi koordinator yang menjadwalkan.

## 7. GAP

| # | Layar | Masalah | Usulan | Butuh keputusan |
|---|---|---|---|---|
| H-0 | Beranda, Profil | Nama sapaan tidak dikirim | Ambil `GET /profile.nickname` dan port `greetingName`; atau server menambah `now.name` | Nico (bila ke server) |
| H-1 | Chip `assigned`, `inProgress` | Angka "tugas saya" ada di `tasks/counts`, bukan `/home` | Panggil keduanya | — |
| H-2 | Chip `inProgress` sub `nextDue` | Tak ada | Ganti sub-line dengan `overdueTotal`/`todayTotal` | User (copy) |
| H-3 | Chip `completed` "minggu ini, milik saya" | `done.total` = seluruh proyek saya, tanpa batas "milik saya" | Terima arti server + ubah copy, atau minta server | **User/Nico** |
| H-4 | Chip `upcoming` "sisa bulan ini" | Tak ada definisi itu | Ubah copy jadi "minggu ini" sesuai kelompok jadwal server | **User** |
| H-5 | Chip Admin `awaiting` + baris `pendingUsers` | Hanya kartu Inbox `user_pending` | Hitung kartu `kind === 'user_pending'` di lajur action | — |
| H-6 | Chip Admin `active`, `overdue` se-workspace | Beranda sengaja berlingkup "proyek saya" | Terima lingkup + ubah copy, atau minta server | **User/Nico** |
| H-7 | Agenda | Teks lokasi (`place`) | Ambil detail event saat dibuka, atau server menambah lokasi ringkas | Nico (bila ke server) |
| H-8 | Kartu proyek | `lead` | Hilangkan dari kartu Beranda | **User** |
| I-1 | Inbox | Kartu "Meeting outcomes need your confirmation" (AI) | Hilangkan (tak ada `kind`) | User |
| I-2 | Inbox | Kartu review/second/mention + `why` | `shipped: false` di server → hilangkan sampai server mengirim | Nico (jadwal S4) |
| T-1 | Tim | Catatan per role | Dari `whoami.role` (copy saja) | — |
| T-2 | Tim orang | Nama proyek yang tak dibagi | Sengaja tak dikirim → copy tanpa nama ("Also on other projects") | — |
