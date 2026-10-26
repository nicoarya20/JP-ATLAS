# Fase 2 — Pemetaan data: Beranda, Inbox, Tim, Profil, Arsip

Analisis read-only (2026-10-26) untuk menukar data contoh mobile dengan API nyata. **Bukan implementasi.**
Aturan yang mengikat: mobile hanya mengonsumsi `/api/app/*` yang sama dengan web, tanpa endpoint khusus
mobile (`mobile/reacttransition.md:34`, `:69`). Dokumen ini tidak mengubah `server/` dan tidak mengusulkan
rute baru kecuali di tempat yang ditandai **butuh perubahan server**.

Modul yang dipetakan: Beranda, Inbox, Tim (list + person), Profil (modal + My calendar), Arsip.
Modul Tasks, Projects, Events, Users, Settings dipetakan worker lain; di sini hanya disebut sebagai tetangga.

## 0. Inventaris endpoint modul ini

| Endpoint | Sumber | Bentuk balasan |
|---|---|---|
| `GET /api/app/home` | `server/api/app-home.ts:13` | `HomeData` (`server/home/home.dto.ts:114`) — satu panggilan untuk seluruh layar, tanpa query |
| `GET /api/app/inbox?lane=action\|info&cursor&limit` | `server/api/app-inbox.ts:33` | `{ items: InboxItem[], nextCursor }` (`server/notification/notification.query.ts:26`) |
| `GET /api/app/inbox/count` | `server/api/app-inbox.ts:50` | `{ action, infoUnread }` (`notification.query.ts:52`) |
| `POST /api/app/inbox/:id/read` | `server/api/app-inbox.ts:52` | `{ ok: true }` · 404 bila bukan kartu pemanggil |
| `POST /api/app/inbox/read-all` | `server/api/app-inbox.ts:60` | `{ updated: number }` — hanya lajur `info` |
| `GET /api/app/team?projectId&q&sort&limit&offset` | `server/api/app-team.ts:45` | `{ summary, people, total }` (`server/team/team.dto.ts:67`) |
| `GET /api/app/team/:userId` | `server/api/app-team.ts:69` | `GetPersonOk` (`team.dto.ts:91`) |
| `GET /api/app/team/picker?q&projectId&limit` | `server/api/app-team.picker.ts:20` | `{ items: [{ id, name, jobTitle, image }] }` |
| `GET /api/app/profile` · `PATCH /api/app/profile` | `server/api/app-profile.ts:37`, `:41` | `ProfileView` (`server/profile/profile.service.ts:30`) |
| `GET/PUT /api/app/profile/notifications` | `server/api/app-profile.notifications.ts:13` | `{ eventReminder, inboxNews }` |
| `GET /api/app/profile/delete-check` | `server/api/app-profile.delete-check.ts:9` | `{ canDelete, projects, total }` |
| `POST /api/app/avatar` (multipart `file`) · `DELETE /api/app/avatar` | `server/api/app.ts:50`, `:59` | `{ image }` |
| `GET /api/app/whoami` | `server/api/app.ts:44` | `{ userId, name, role }` |
| `GET /api/app/trash?kind=all\|project\|task\|event&page&limit` | `server/api/app-trash.ts:29` | `{ items, total, page, limit, counts }` |
| `POST /api/app/trash/{project,task,event}/:id/restore` | `server/api/app-trash.ts:46`, `:65`, `:86` | `{ id, tasks }` · `{ id, number }` · `{ id }` |

Catatan lintas-endpoint yang berlaku untuk seluruh modul:

- **Gerbang 401** ada di `derive appContext` (`server/api/app-context.ts:53`); tanpa sesi semua rute di atas
  menjawab 401 sebelum validasi query. Bentuk galat seragam `{ error, code, status, requestId }`.
- **Rate limit tulis** 60 permintaan / 60 detik per *user* (`server/pm/limits.ts:19`), balasan 429 dengan
  `retryAfterSeconds` (`app-context.ts:74`). Mobile wajib menghormati `retry-after`.
- **Bahasa pesan server = Indonesia** (`BAD_CURSOR` di `app-inbox.ts:23`, copy kartu Inbox di
  `server/notification/notification.catalog.ts`), sedangkan UI mobile berbahasa Inggris
  (keputusan `reacttransition.md` 2026-10-25). Lihat GAP A-16.
- **Sebagian rute ditolak untuk API key apa pun** (`PM_KEY_DENY`, `server/api-keys/scopes.pm.ts:9`):
  `PATCH /profile`, `PUT /profile/notifications`, `GET /profile/delete-check`, `* /avatar`,
  `POST /trash/*`. Jadi mobile **harus** memakai sesi Better Auth, bukan API key, kalau layar Profil dan
  Arsip mau berfungsi. Sisanya dipetakan `app:read`/`app:write` lewat prefiks (`server/api-keys/scopes.ts:194`).

---

## 1. Peta per layar

Kolom **GAP** hanya diisi bila bidang mobile tidak punya pasangan di API; bidang yang hanya perlu disusun
ulang di klien dari data yang sudah dikirim ditulis di kolom catatan, bukan GAP.

### 1.1 Beranda

- Layar: `mobile/app/(tabs)/(home)/index.tsx` → `mobile/src/screens/home/home.screen.tsx`
- Titik tukar: `getHome(role, src)` — `mobile/src/data/home.ts:47`
- Endpoint: **`GET /api/app/home`** (tanpa query) — `server/api/app-home.ts:13`
- Tiap bagian dibungkus `Widget<T> = { ok: true; data } | { ok: false }` (`server/home/home.dto.ts:10`):
  satu query gagal hanya mematikan kartunya sendiri.

#### Kepala layar

| Bidang data contoh mobile | Bidang DTO server | GAP | Catatan |
|---|---|---|---|
| `HomeData.role` (`member\|pm\|admin`) `home.types.ts:108` | — | **A-1** | Ambil `whoami.role` (`app.ts:44`): `member\|project_manager\|admin\|super-admin` → perlu tabel padan ke tiga role prototipe |
| `me.name` (nama depan), `me.full` `home.types.ts:109` | — | **A-2** | `GET /api/app/profile` → `name`, `displayName`, `nickname`; aturan nama sapaan ada di `server/profile/profile.greeting.ts:2` (nickname → kata pertama displayName/name) dan **tidak** dikirim lewat kabel |
| `greeting` = `'Good morning'` `sample/today.ts:8` | `now.greeting`: `'pagi'\|'siang'\|'sore'\|'malam'` `home.dto.ts:22` | — | Enum, bukan copy: mobile memetakan enum → kalimat Inggris. Ambang jam ada di `server/home/home.copy.ts:11` |
| — | `now.iso`, `now.today`, `now.timeZone`, `now.dateLabel`, `now.timeLabel` `home.dto.ts:15` | — | Lihat §4 |

#### Briefing

| Mobile | Server | GAP |
|---|---|---|
| `briefing.lines: string[]` `sample/home.ts:4` | `briefing.data.lines: string[]` `home.dto.ts:26` | — |
| `briefing.meta` `'✦ Built automatically from project data · updated 7:30 AM'` | `briefing.data.updatedLabel` = `now.timeLabel` (`home.service.ts:64`) | — (klien susun kalimatnya) |

Isi `lines` server berbahasa Indonesia dan disusun aturan tanpa LLM (`server/home/home.summary.ts`,
copy di `home.copy.ts:18`). Sama seperti kartu Inbox: lihat GAP A-16.

#### Stat chip (`StatChip[]`, `home.types.ts:57`, dihitung `home.stats.ts:115`)

`counters` server dihitung atas **proyek yang saya kelola** (`project_member.role = 'manager'`),
bukan tugas saya — lihat docstring `server/home/home.stats.query.ts:2`. Ini sumber ketidakcocokan
terbesar di Beranda.

| Chip mobile | Arti di mobile | Pasangan server | GAP |
|---|---|---|---|
| `assigned` | tugas saya yang masih terbuka | `GET /api/app/tasks/counts` → `byStatus` (lingkup `assigneeId = saya`, `server/task/task.query.ts:195`) | **A-3** (endpoint lain) |
| `inProgress` + sub `overdue/dueToday/nextDue` | tugas saya berstatus *In progress* | `tasks/counts.byStatus.in_progress`; sub-nya dari `focus.overdueTotal`/`todayTotal` (`home.dto.ts:60`) — `nextDue` tidak ada | **A-4** |
| `completed` sub `thisWeek` | tugas saya selesai minggu ini | `home.done.total` menghitung **seluruh proyek saya**, bukan hanya milik saya (`server/home/home.done.query.ts:1`); `tasks/counts.byStatus.done` tanpa batas minggu | **A-5** (butuh perubahan server bila angka harus "milik saya, minggu ini") |
| `upcoming` sub `items` | tugas terbuka + event saya sisa bulan ini (`home.stats.ts:38`) | `tasks/counts.mine` per kelompok jadwal (`today/tomorrow/week/later`) + `GET /api/app/events` (worker Events) — definisi "sisa bulan ini" tidak ada | **A-6** |
| `inbox` sub `toRespond/caughtUp` | jumlah kartu "perlu ditanggapi" | `GET /api/app/inbox/count` → `action` (kontraknya = panjang daftar `lane=action`, `notification.query.ts:206`) | — |
| `active` (Admin) | proyek berstatus Active | `counters.managedProjects`/`memberProjects` tidak difilter status | **A-7** |
| `overdue` (Admin) | tugas terlambat **se-workspace** | `focus.overdueTotal` hanya milik saya; `counters` hanya proyek yang saya kelola | **A-8** |
| `awaiting` (Admin) | pendaftar menunggu persetujuan | Server mengirimnya sebagai kartu Inbox `user_pending` (lajur `action`, `notification.catalog.ts:48`) — tidak terpisah dari `inbox/count.action` | **A-9** |
| `target: HomeTarget` → `TARGET_HREF` `home.targets.ts:6` | — | — | Rute klien, bukan data |

#### My Focus (`HomeFocus`, `home.types.ts:77`, dihitung `home.focus.ts:29`)

| Mobile | Server | GAP |
|---|---|---|
| `groups: [{ key: 'overdue'\|'today'\|'thisWeek', tasks }]` | `focus.data.items[].group`: `'overdue'\|'today'\|'tomorrow'\|'week'\|'later'\|'none'` `home.dto.ts:39` | — (mobile gabungkan `tomorrow`+`week`, atau tambah kelompok) |
| `FocusTask.no` | `items[].number` | — |
| `FocusTask.title` | `items[].title` | — |
| `FocusTask.project` (nama) | `items[].project: { id, name }` | — |
| `FocusTask.when` (label "Due Oct 9") | `items[].dueDate: string\|null` + `overdueDays` | — (label disusun klien dari `now.today`) |
| `FocusTask.status` | — (tidak ada status di baris fokus) | — (tidak dipakai lagi: tombolnya dari `action`) |
| `FocusTask.canMarkDone` (`home.focus.ts:15`) | `items[].action: 'complete'\|'start'\|null` `home.dto.ts:52` | — **hapus aturan klien**, lihat §3 |
| `pendingUsers` (Admin) | — | **A-9** (sama dengan chip `awaiting`) |
| `review: FocusTask[]` (PM) | `focus.data.awaitingReview: HomeReviewTask[]` + `awaitingReviewTotal` `home.dto.ts:63` | — (server memakai `canApproveTask`, bukan status) |
| `openCount` untuk "See all tasks (N)" | `focus.data.total` `home.dto.ts:59` | — |
| `empty` | turunan: `items.length === 0 && awaitingReview.length === 0` | — |
| — | `items[].id` (uuid), `items[].priority` | — (lihat B-4) |

Aksi: tombol Done di baris fokus (`mobile/src/data/home.actions.ts:15`) → `POST /api/app/tasks/:ref/start`
atau alur selesai di `server/api/app-tasks.workflow.ts:43` (bentuk `ref`/badan permintaan dipetakan worker Tasks).

#### Ask Data

| Mobile | Server | GAP |
|---|---|---|
| `ask.questions: string[]` (dipotong per role, `home.ts:59`) | `ask.data: AskAnswer[]`, tiap item `{ key, question, answer, bars }`; `key` ∈ `'behind'\|'stalled'\|'busiest'` `home.dto.ts:108` | — (server selalu 3; pemotongan per role dibuang) |
| `ask.answer: string` (satu) | `ask.data[i].answer` | — |
| `ask.projects: [{ name, pct }]` | `ask.data[i].bars: [{ label, pct, display }]` `home.dto.ts:111` | — |
| Kolom input "Type or say a question…" (dekoratif, `home.strings.ts:75`) | Tidak ada tanya-bebas: hanya 3 pertanyaan tetap, tanpa LLM (`server/home/home.ask.ts:1`) | — (biarkan dekoratif atau ganti jadi 3 pil pertanyaan) |

#### Agenda & Projects

| Mobile | Server | GAP |
|---|---|---|
| `agenda.next: AgendaEvent\|null` (satu event berikutnya, `home.focus.ts:60`) | `agenda.data: HomeAgendaItem[]` — seluruh agenda hari ini + besok, `day: 'today'\|'tomorrow'` `home.dto.ts:89` | — (mobile ambil elemen pertama; atau tampilkan semuanya) |
| `next.title` | `title` | — |
| `next.time`, `next.date` (label) | `startsAt`, `endsAt` (ISO) + `now.timeZone` | — |
| `next.mode: 'In person'\|'Online'` | `locationType: EventLocationType\|null` | — |
| `next.place` (teks bebas, "Meeting Room 2") | — | **A-10** |
| `next.href` → `eventHref(e)` | `id` | — (rute klien) |
| `AgendaProject.name`, `.id` | `projects.data[].name`, `.id` | — |
| `AgendaProject.lead` (nama lead) | — (`HomeProject` tidak punya lead, `home.dto.ts:80`) | **A-11** |
| `AgendaProject.due` | `projects.data[].dueDate: string\|null` | — |
| `AgendaProject.progress: number` | `projects.data[].progress: { done, total, percent: number\|null }` | — (`percent` null = belum ada tugas; mobile wajib menangani) |
| `AgendaProject.status: ProjectStatus` ("Active"/"Done"…) | `projects.data[].condition: 'on_track'\|'at_risk'\|'off_track'\|null` + `reason` | **A-12** (konsep beda: status siklus hidup vs kondisi kesehatan; status proyek ada di DTO Projects — belum dipastikan, worker Projects) |

#### Done this week & Latest activity

| Mobile | Server | GAP |
|---|---|---|
| `done[].title` | `done.data.items[].title` (+ `number`, `project`) | — |
| `done[].who` = `'You · today'` | `items[].byName` + `items[].dayLabel` (`'hari ini'\|'kemarin'\|<hari>`) `home.dto.ts:72` | — (dua bidang, satu string; bahasa → A-16) |
| `activity[].title` | `activity.data[].text` | — |
| `activity[].meta` = `'Kitchen Renovation · 1 hour ago'` | `activity.data[].projectName` + `at` (ISO) | — (waktu relatif dihitung dari `now.iso`, **bukan** jam perangkat) |
| `LENGTHS` per role (`home.ts:29`) | Server sudah membatasi: `HOME_FOCUS_MAX 5`, `HOME_DONE_MAX 5`, `HOME_ACTIVITY_MAX 5`, `HOME_PROJECTS_MAX 5`, `HOME_ASK_BARS_MAX 5` (`server/home/home.config.ts`) | — (**hapus** pemotongan klien) |

Lingkup Beranda = proyek yang saya ikuti (`mineScope`, `server/home/home.scope.ts:11`), bukan seluruh
workspace — ini sengaja, juga untuk Admin. Jadi chip Admin A-7/A-8 tidak akan terjawab oleh `/api/app/home`.

### 1.2 Inbox ① Needs your response

- Layar: `mobile/app/(tabs)/more/inbox.tsx` → `mobile/src/screens/inbox/{inbox.screen,respond.tab,inbox-card}.tsx`
- Titik tukar: `getInbox(role, allRead, decided)` / `respondCards(...)` — `mobile/src/data/inbox.ts:142`, `:78`
- Endpoint: **`GET /api/app/inbox?lane=action`** (default lajur bila tidak diberi, `app-inbox.ts:38`)
- Tidak ada rute yang membuat atau menghapus kartu: kartu muncul karena `notify()` dan hilang karena
  diselesaikan (`app-inbox.ts:3`). Jadi mobile hanya membaca + menandai terbaca.

| Mobile (`RespondCard`, `inbox.ts:22`) | Server (`InboxItem`, `notification.query.ts:26`) | GAP |
|---|---|---|
| `key` (`'review'\|'second'\|'mention'\|'approvals'`) | `id` (uuid) | — |
| `lead: { kind:'person', name }` | `actor: { id, name, image }\|null` (null = sistem / akun hilang) | — (avatar nyata tersedia lewat `actor.image`) |
| `lead: { kind:'people', names }` (kartu Approvals agregat) | Satu kartu `user_pending` **per akun** (`notification.catalog.ts:48`), tanpa agregat | **A-13** (kelompokkan di klien per `kind`) |
| `lead: { kind:'ai' }` (konfirmasi outcomes stand-up) | Tidak ada `kind` untuk itu di `NotificationPayloadByKind` (`notification.types.ts:57`) | **A-14** |
| `title` (kalimat lengkap) | `sentence: string\|null` (Indonesia, null untuk `kind` yang build ini tidak kenal) | **A-16** (bahasa) |
| `meta` (`'#17 · Atlas Project · 10 min ago'`) | `ref: { type, id, number }` + `payload.projectName` + `createdAt`/`updatedAt` | — (disusun klien dari `now`) |
| `body: { text, tone }` | `payload.excerpt` (≤ 140 char, `notification.types.ts:16`) / `payload.title` | — |
| `why` (alasan Admin jadi reviewer) | — | **A-15** (kartu review `shipped: false`, `catalog.ts:50`) |
| `action` (label tombol) | `button: string\|null` (`cardButton`, Indonesia) | **A-16** |
| `href` (rute Expo) | `href` = jalur **web** (`/app/tasks/14`, `/dashboard/users`, `notification.query.ts:86`) | — (wajib dipetakan ulang ke rute Expo; jangan dipakai mentah) |
| `actor(title, meta)` menebak pelaku dari teks (`inbox.links.ts:15`) | `actor` eksplisit | — (**hapus heuristiknya**) |
| — | `bundleCount`, `read`, `lane`, `group`, `payload` | — (lihat B-12) |

Kartu `action` **tidak bisa dibisukan** — itu antrean kerja (`notification.catalog.ts:20`). `lane=action`
hanya memuat kartu yang belum selesai (`isNull(resolvedAt)`, `notification.query.ts:74`).
Kartu yang proyeknya sudah tidak boleh dilihat pemanggil hilang sendiri saat dibaca (`notification.query.ts:4`).

### 1.3 Inbox ② Latest updates

- Layar: `mobile/src/screens/inbox/updates.tab.tsx`; titik tukar `updateDays(role, allRead)` — `inbox.ts:121`
- Endpoint: **`GET /api/app/inbox?lane=info`**; tandai terbaca **`POST /api/app/inbox/read-all`**
  (hanya lajur `info`, `app-inbox.ts:60`) dan per kartu **`POST /api/app/inbox/:id/read`** (`:52`)

| Mobile (`UpdateRow`, `inbox.ts:35`) | Server | GAP |
|---|---|---|
| `UpdateDay.day`: `'Today'\|'Yesterday'` (`inbox.ts:49`) | `item.group`: `'today'\|'yesterday'\|'older'` (`notification.query.ts:23`) | — (mobile **belum punya** kelompok `older`; wajib ditambah atau kartu lama hilang) |
| `title`, `meta`, `time` (potongan string `meta`, `inbox.ts:127`) | `sentence` + `payload` + `updatedAt` | **A-16** (bahasa); sisanya disusun klien |
| `actor` (nama, ditebak dari teks) | `actor: { id, name, image }\|null` | — |
| `href` | `href` web | — (petakan ulang) |
| `unread` — satu bendera global untuk seluruh daftar (`inbox.store.ts:5`) | `read: boolean` **per kartu** | — (ganti jadi per kartu; `markAllRead()` lokal diganti `POST /read-all` yang mengembalikan `{ updated }`) |
| — | `GET /api/app/inbox/count.infoUnread` | — (lihat B-13: belum ada lencana berita belum dibaca) |

Urutan: lajur `info` diurut `updated_at` (bundling menaikkannya), lajur `action` diurut `created_at`
(`notification.query.ts:58`). Membaca kartu **tidak** memindahkannya (`updatedAt` dipatok, `:253`).

### 1.4 Tim ① list

- Layar: `mobile/app/(tabs)/more/team/index.tsx` → `mobile/src/screens/team/team.screen.tsx`
- Titik tukar: `getTeam(role, src)` — `mobile/src/data/team.ts:71`
- Endpoint: **`GET /api/app/team?projectId&q&sort&limit&offset`** — `server/api/app-team.ts:45`

| Mobile (`TeamRow`, `team.ts:14`) | Server (`TeamPerson`, `team.dto.ts:49`) | GAP |
|---|---|---|
| `key: PersonKey` (`'rina'`) — juga param rute `[id]` | `id` (uuid) | — (param rute berubah ke userId) |
| `full` (nama lengkap) | `name` (`displayNameSql`: displayName → name) | — |
| — | `jobTitle: string\|null`, `image: string\|null` | — (B-15; baris mobile belum memakai jabatan/foto nyata) |
| `you: boolean` | `isSelf: boolean` | — |
| `role` prosa `'Manager · Atlas Project (Lead)'` (`sample/team.ts:12`) | `projects: [{ id, name, role: ProjectMemberRole }]` `team.dto.ts:33` | — (disusun klien dari data berstruktur) |
| `status` prosa `'Available'` / `'Leave planned Oct 12–14'` | `availability: { kind: 'on_leave', until } \| null` `team.dto.ts:47` | — (`null` = "tidak ada yang perlu ditampilkan", **bukan** sinonim "Available"; catatan cuti Admin sengaja tidak dikirim, P14 D6) |
| `available: boolean` | turunan `availability === null` | — |
| `extra` `'Also on other projects'` | `load.alsoElsewhere?: true` `team.dto.ts:40` | — (pas sekali: tanpa angka, sengaja) |
| `load: { active, overdue }` — `undefined` saat tak boleh dilihat | `load?: TeamLoad` — **kunci absen** saat tak boleh dilihat | — (polanya sama; lihat §3) |
| `summary` string `'Projects you manage · 3 people · 4 active tasks · 1 overdue'` | `summary: { people, projects, active?, overdue? }` `team.dto.ts:65` | — (`active`/`overdue` menjumlahkan **halaman**, `people` menjumlahkan seluruh tim terfilter) |
| `note` per role (`team.ts:104`, `:119`) | — | **A-18** (butuh role pemanggil dari `whoami.role`) |
| `empty: true` (Member tanpa proyek) | `people: []` / `total: 0` | — |
| Pencarian klien atas seluruh larik (`team.screen.tsx:59`) | `?q=` (≤ 100 char, `team.query.ts:39`) | — (pindahkan ke server; lihat §5) |
| Pemilih **All projects** dan **Sort: Name** (dekoratif, hanya toast, `team.screen.tsx:64`) | `?projectId=` dan `?sort=name\|active\|overdue` (`app-team.ts:20`) | — (aktifkan; `sort=active\|overdue` bisa menjawab **422 `SORT_NOT_ALLOWED`**, `team.query.ts:101`) |

`projectId` yang tidak boleh dilihat pemanggil menjawab **404 `NOT_FOUND`**, bukan 403 (`app-team.ts:37`).

### 1.5 Tim ② person

- Layar: `mobile/app/(tabs)/more/team/[id].tsx` → `mobile/src/screens/team/person.screen.tsx`
- Titik tukar: `getTeamPerson(role, key, src)` — `mobile/src/data/team.person.ts:11`
- Endpoint: **`GET /api/app/team/:userId`** — `server/api/app-team.ts:69`

| Mobile (`TeamPersonData`, `team.ts:33`) | Server (`GetPersonOk`, `team.dto.ts:91`) | GAP |
|---|---|---|
| `person.full` | `person.name` | — |
| `person.title` (fakta "Job title") | `person.jobTitle: string\|null` | — |
| `person.division` (fakta "Division") | `person.department: string\|null` | — |
| `person.email` | `person.email` | — |
| `person.role` (fakta "Account role") ditampilkan ke **semua** | `accountRole?: Role` — **absen** kecuali pemanggil Admin/Super-admin (`team.person.query.ts:69`) | **A-19** (sembunyikan barisnya saat kunci absen) |
| — | `person.phone?` — hanya diri sendiri & Admin (`team.person.query.ts:77`) | — (B-17) |
| `status`, `available` | `availability` | — |
| `projectsTitle` `'Projects'` (admin) / `'Shared projects'` | — | **A-18** |
| `projects: [{ id, name }]` | `projects: [{ id, name, role }]` | — |
| `tasks: null` saat tak boleh dilihat | `tasksVisible: false` + `tasks`/`load` absen | — (lihat §3) |
| `tasks.load` | `load?: TeamLoad` | — |
| `tasks.rows[].no` | `tasks[].number` | — |
| `tasks.rows[].title` `'#12 Fix SSO login'` | `tasks[].number` + `tasks[].title` | — |
| `tasks.rows[].sub` `'Atlas Project · Due Oct 9'` | `tasks[].projectId` (hanya id!) + `tasks[].dueDate` | — (nama proyek diambil dari `projects[]` yang sama, cocokkan `projectId`) |
| `tasks.rows[].pill` `'Overdue'` / status | `tasks[].status` + `tasks[].dueDate` + hari ini dari server | — |
| `tasks.hidden: string[]` — **nama** proyek yang tidak dibagi | `alsoElsewhere?: true` saja; nama sengaja tidak dikirim (`team.dto.ts:38`) | **A-17** (ubah copy jadi tanpa nama) |
| Orang yang tidak dibagi proyeknya → `null` → empty state | **404 `NOT_FOUND`**, bukan 403 — pemanggil tidak boleh tahu akunnya ada (`app-team.ts:65`) | — |

### 1.6 Profil ① modal

- Layar: `mobile/app/profile/index.tsx` → `mobile/src/screens/profile/profile.screen.tsx`
- Titik tukar: `getProfile(role, decided)` — `mobile/src/data/profile.ts:31`; state `mobile/src/data/profile.store.ts`
- Endpoint: **`GET /api/app/profile`** (+ `GET /api/app/whoami`, `GET /api/app/inbox/count`)

| Mobile | Server (`ProfileView`, `profile.service.ts:30`) | GAP |
|---|---|---|
| `me.key` | `userId` | — |
| `me.full` | `name` / `displayName` | — |
| `me.name` (nama depan, untuk sapaan) | `nickname` — aturan jatuh-balik ada di `profile.greeting.ts:2`, tidak dikirim sebagai bidang | **A-2** |
| `me.title` | `jobTitle` | — |
| `me.division` | `department` | — |
| `me.email` | `email` | — |
| `me.role` (`'Project Manager'`) | — (ProfileView tidak memuat role) | **A-20** (`whoami.role`) |
| `line` `'<title> · <division>'` + `' · Admin'` | `jobTitle` + `department` + `whoami.role` | **A-20** |
| `inbox: number` (`respondCards().length`) | `GET /api/app/inbox/count.action` | — |
| `profile.store.note` (≤ 60 char, `profile.store.ts:6`) | — | **A-21** (butuh perubahan server: kolom + bidang di `ProfileView`/`ProfileBody`; `ProfileBody` sekarang hanya `displayName, nickname, phone, jobTitle, department, textSize`, `app-profile.ts:23`) |
| `profile.store.online` (titik presence) | — (tidak ada presence di mana pun yang saya baca) | **A-22** (butuh perubahan server, atau tetap lokal-perangkat dan jangan diklaim dilihat rekan) |
| `profile.store.muted` (satu switch "Mute notifications") | `PUT /api/app/profile/notifications` → **dua** switch `{ eventReminder, inboxNews }`; kartu `action` tidak bisa dibisukan (`notification.catalog.ts:20`) | **A-23** (ubah UI jadi dua switch + catatan) |
| "Change photo" → toast saja | `POST /api/app/avatar` (multipart `file`) · `DELETE /api/app/avatar` → `{ image }` | — (B-19: endpoint sudah ada, UI belum) |
| Sign out (T2) | Better Auth (`/api/auth/*`) — di luar `/api/app`, dipetakan worker auth | belum dipastikan |
| — | `phone`, `textSize`, `GET /api/app/profile/delete-check` | — (B-18, B-19) |

Form **Edit profile** (`mobile/src/screens/settings/profile-edit.screen.tsx`, data `mobile/src/data/settings.ts:32`)
memetakan 1:1 ke `PATCH /api/app/profile`: Full name→`displayName`, Nickname→`nickname`, Job title→`jobTitle`,
Division→`department`; Role dan Email memang read-only di server juga (`profile.service.ts:26`).
Telepon punya galat format sendiri (**400 `VALIDATION`** dengan `PHONE_FORMAT_ERROR`, `app-profile.ts:44`).

### 1.7 Profil ② My calendar

- Layar: `mobile/app/profile/calendar.tsx` → `mobile/src/screens/profile/calendar.screen.tsx`
- Titik tukar: `getMyCalendar(role, day, events)` — `mobile/src/data/profile.ts:112`
- Endpoint: **modul Events** — `GET /api/app/events` (`server/api/app-events.ts:34`) dan
  `GET /api/app/events/agenda` (`:66`, "paling empat event saya hari ini dan besok").

Bentuk query dan DTO daftar event **belum dipastikan** di dokumen ini (dipetakan worker Events). Yang pasti
dibutuhkan layar ini dan harus dicek di peta mereka:

1. Rentang tanggal sebagai query (strip pekan + grid satu hari), bukan "ambil semua lalu filter" seperti
   `eventsFor()` sekarang (`mobile/src/data/profile.calendar.dates.ts`).
2. Pengulangan: mobile menghitung sendiri (`occursOn`, `repeatDays` hanya mengenali "every N weeks",
   `phase1-screens.more.md:126`). Apakah server mengembalikan kejadian yang sudah dikembangkan — **belum dipastikan**.
3. Nada blok per jenis (`TONE`, `profile.ts:43`) dipetakan dari `EventKind`.
4. Garis "sekarang" dipatok `NOW_MIN` 9:41 → butuh jam server (§4).
5. `meta` blok `'2:00–3:00 PM · In person · Meeting Room 2'` memerlukan teks lokasi — sama dengan **A-10**.

### 1.8 Arsip → Sampah

- Layar: `mobile/app/(tabs)/more/archive/index.tsx` + `.../[key]/delete.tsx`
- Titik tukar: `getArchive(role, entries, filter)` / `getArchiveDelete(key)` / `deleteForever(key)` —
  `mobile/src/data/archive.ts:50`, `:70`, `:84`; sumber entri `mobile/src/data/archive.store.ts`
- Endpoint: **`GET /api/app/trash?kind&page&limit`** (`server/api/app-trash.ts:29`) +
  tiga rute restore (`:46`, `:65`, `:86`)

**Perbedaan konsep yang harus diputuskan sebelum ditukar.** "Archive" mobile = simpanan permanen sampai
dipulihkan, dengan tombol "Delete forever" untuk Admin. "Sampah" server = retensi 30 hari dengan
pembersihan otomatis lewat penjadwal (`server/trash/trash.purge.ts`), dan **tidak ada rute hapus permanen
manual sama sekali** (`server/api/app-trash.ts:5`). Pertanyaan ini sudah terbuka di
`phase1-screens.md:47`; Fase 2 harus menutupnya.

| Mobile (`ArchiveCard`/`ArchiveEntry`, `archive.ts:22`, `archive.store.ts:12`) | Server (`TrashItem`, `server/trash/trash.list.query.ts:31`) | GAP |
|---|---|---|
| `key` `'task-12'` (`entryKey`, `archive.store.ts:31`) — param rute | `id` (uuid) + `kind` | — (param rute berubah) |
| `kind` `'PROJECT'\|'TASK'\|'EVENT'` | `kind` `'project'\|'task'\|'event'` | — |
| `title` | proyek: `name`; tugas: `number` + `title`; event: `title` (`project-trash.query.ts:19`, `task-trash.query.ts:31`, `events.trash.query.ts:31`) | — |
| `where` (nama proyek / `'Project'` / `'No project'`) | tugas: `project: { id, name }`; event: `project: {…}\|null`; proyek: tidak ada | — (literal disusun klien) |
| `by` (nama depan) | `deletedBy: { id, name } \| null` (null = akun sudah hilang) | — (siapkan copy jatuh-balik) |
| `date` (ISO **tanggal**) | `deletedAt` (ISO **instant**) `server/trash/trash.item.ts:13` | — (format dengan zona server) |
| `includes` `'8 tasks and 2 events'` | proyek: `cascade: { tasks, events }` | — |
| `chips` `'All 5'`, `'Projects 2'`… dihitung klien (`archive.ts:57`) | `counts: { project, task, event }` + `total` (`counts` tidak ikut filter, `app-trash.ts:27`) | — |
| `count` `'5 items'` | `total` (mengikuti filter `kind`) | — |
| Filter chip dihitung klien atas seluruh larik | `?kind=all\|project\|task\|event` | — (pindahkan ke server) |
| `canDelete = role === 'admin'` (`archive.ts:63`) | `item.can.purge` (`server/access/trash.policy.ts:25`) — **tapi rutenya tidak ada** | **A-24** |
| Layar `archive.delete` + `deleteForever(key)` (T3) | Tidak ada rute hapus permanen (`app-trash.ts:5`) | **A-24** (butuh perubahan server: rute purge Admin-only; atau hapus layarnya di Fase 2) |
| Tombol **Restore** = notice saja (`phase1-screens.more.md:84`) | `POST /api/app/trash/{kind}/:id/restore` → `{ id, tasks }` / `{ id, number }` / `{ id }`; diaudit; **sesi saja** (`PM_KEY_DENY`) | — (pemulihan nyata akhirnya bisa) |
| — | `restorableUntil`, `daysLeft` (`trash.item.ts:13`) | — (B-20: wajib ditampilkan — Sampah 30 hari) |
| — | `blockedBy: TrashBlockedBy\|null`, `projectInTrash` (`task-trash.query.ts:39`) | — (B-20: restore tugas/event yang proyeknya masih di Sampah menjawab **409**) |
| — | `can.restore` (bisa bernilai kode `EXPIRED`/`IMPERSONATING` = tampil tapi disabled) | — (§3) |

---

## 2. GAP dua arah

### (a) Ditampilkan mobile, tidak dikirim API — 24 temuan

| # | Layar | Yang kurang | Usulan |
|---|---|---|---|
| A-1 | Beranda | `role` pemanggil | **endpoint lain**: `GET /api/app/whoami.role`; buat tabel padan `project_manager→pm`, `super-admin→admin` |
| A-2 | Beranda, Profil | nama sapaan (nama depan / nickname) | **endpoint lain** `GET /api/app/profile`, lalu port aturan `greetingName` (`server/profile/profile.greeting.ts:2`) di klien. Alternatif rapi: **perubahan server** menambah `now.name` ke `HomeNow` |
| A-3 | Beranda chip `assigned` | jumlah tugas saya yang terbuka | **endpoint lain** `GET /api/app/tasks/counts` (`server/api/app-tasks.ts:61`; lingkup `assigneeId = saya`, `server/task/task.query.ts:195`) |
| A-4 | Beranda chip `inProgress` + sub `nextDue` | tugas saya *In progress*; tanggal jatuh tempo terdekat | `tasks/counts.byStatus.in_progress` untuk angkanya; `nextDue` **tidak ada** → ganti sub-line dengan `focus.overdueTotal`/`todayTotal`, atau **perubahan server** |
| A-5 | Beranda chip `completed` | tugas **saya** selesai **minggu ini** | `home.done.total` menghitung seluruh proyek saya; `tasks/counts.byStatus.done` tanpa batas minggu → **butuh perubahan server** bila angkanya harus tepat (mis. `counters.doneByMeThisWeek`) |
| A-6 | Beranda chip `upcoming` | tugas + event sisa bulan ini | **endpoint lain**: `tasks/counts.mine` (`today/tomorrow/week/later`) + daftar Events berentang; definisi "sisa bulan ini" tidak ada di server → paling murah: ubah copy jadi "minggu ini" agar cocok dengan kelompok jadwal server |
| A-7 | Beranda chip Admin `active` | jumlah proyek berstatus Active | **endpoint lain** `GET /api/app/projects` (worker Projects, bentuk belum dipastikan); `counters` tidak memfilter status |
| A-8 | Beranda chip Admin `overdue` | tugas terlambat **se-workspace** | Beranda sengaja berlingkup "proyek saya" (`server/home/home.scope.ts:5`) → **butuh perubahan server** (atau ambil dari daftar Tugas dengan filter, worker Tasks) |
| A-9 | Beranda chip Admin `awaiting` + baris `pendingUsers` | pendaftar menunggu persetujuan | Server mengirimnya sebagai kartu Inbox `user_pending`; angkanya tidak terpisah dari `inbox/count.action` → **klien**: hitung kartu ber-`kind === 'user_pending'` di `lane=action` (biayanya satu halaman Inbox), atau **perubahan server** memecah hitungan |
| A-10 | Beranda agenda, Profil kalender | teks lokasi event (`place`) | `HomeAgendaItem` hanya punya `locationType` (`server/home/home.dto.ts:95`) → **endpoint lain** `GET /api/app/events/:id` saat baris dibuka, atau **perubahan server** menambah lokasi ringkas ke agenda |
| A-11 | Beranda agenda | `lead` proyek | `HomeProject` tidak punya lead (`home.dto.ts:80`) → **endpoint lain** DTO Projects (belum dipastikan), atau hilangkan dari kartu Beranda |
| A-12 | Beranda agenda | `status` proyek (Active/Done/…) | Server mengirim `condition` + `reason` (kesehatan), bukan status siklus hidup → **klien**: ganti pil jadi `condition` (lebih informatif, `reason` sudah ikut); status sebenarnya ada di modul Projects |
| A-13 | Inbox | kartu Approvals agregat ("2 new users awaiting approval") | **klien**: kelompokkan kartu `user_pending` per `kind` lalu rangkum; server memang mengirim satu kartu per akun |
| A-14 | Inbox | kartu "Meeting outcomes need your confirmation" + lead AI | Tidak ada `kind` seperti itu (`server/notification/notification.types.ts:57`) → hilangkan di Fase 2, atau **butuh perubahan server** (kind baru + copy di katalog) |
| A-15 | Inbox | `why` (alasan Admin jadi reviewer) | Kartu review masih `shipped: false` (`notification.catalog.ts:50`) → hilangkan sampai S4 |
| A-16 | Inbox, Beranda | copy berbahasa Inggris | Server mengirim kalimat **Indonesia** siap pakai (`sentence`, `button`, `briefing.lines`, `dayLabel`). **Keputusan produk**, bukan teknis: (1) mobile ikut bahasa server, atau (2) mobile menyusun kalimatnya sendiri dari `kind` + `payload` + `actor` (bidangnya lengkap, jadi mungkin) dan mengabaikan `sentence`/`button`. Opsi (2) tidak perlu perubahan server dan menjaga keputusan "UI mobile = Inggris" |
| A-17 | Tim person | nama proyek yang tidak dibagi (`tasks.hidden`) | Sengaja tidak dikirim (privasi D10, `server/team/team.dto.ts:38`) → **klien**: ubah copy ke bentuk tanpa nama, pakai `alsoElsewhere` |
| A-18 | Tim list + person | catatan per role dan judul "Projects"/"Shared projects" | **endpoint lain** `whoami.role`. Tidak ada `can{}` untuk ini |
| A-19 | Tim person | fakta "Account role" untuk non-Admin | Sengaja absen (`server/team/team.person.query.ts:69`) → sembunyikan barisnya saat kunci absen |
| A-20 | Profil | label role akun | **endpoint lain** `whoami.role` |
| A-21 | Profil | catatan gelembung (`note`) | **butuh perubahan server**: kolom + bidang di `ProfileView` dan `ProfileBody` (`server/api/app-profile.ts:23`) |
| A-22 | Profil | presence online/offline | **butuh perubahan server** (tidak ada presence di kode yang saya baca). Alternatif tanpa server: jadikan jelas-jelas lokal dan hapus klaim "Teammates see you as Online" |
| A-23 | Profil | satu switch "Mute notifications" | Server punya dua switch dan kartu `action` tidak bisa dibisukan → **klien**: ganti jadi dua switch + catatan, seperti web |
| A-24 | Arsip | "Delete forever" (+ `canDelete`) | **Tidak ada rute hapus permanen** (`server/api/app-trash.ts:5`); `can.purge` ada di item tapi tanpa rute. Pilih: (1) hapus layar `archive/[key]/delete.tsx` di Fase 2 dan andalkan purge 30 hari, atau (2) **butuh perubahan server**: `DELETE /api/app/trash/:kind/:id` Admin-only (sudah diantisipasi `PM_KEY_DENY` baris `DELETE trash/*`, `server/api-keys/scopes.pm.ts:31`, dan disebut sebagai Z-04 di `:113`) |

Satu lagi yang bukan "bidang hilang" tapi tetap pekerjaan: **mobile mencocokkan orang dengan nama depan**
(`t.who === me.name`, `assigned(t, me)`, `actor(title, meta)`). Server bekerja dengan `id`. Seluruh
pencocokan nama di `home.stats.ts`, `home.focus.ts`, `team.load.ts`, `inbox.links.ts` harus menjadi
perbandingan `userId`. Ini bukan GAP API, tapi penyebab bug paling mungkin kalau dilewatkan.

### (b) Dikirim API, belum dipakai mobile

| # | Dari | Yang belum dipakai | Kenapa penting |
|---|---|---|---|
| B-1 | `/home` | `Widget { ok: false }` per bagian (`server/home/home.dto.ts:10`) | Mobile belum punya state gagal-lunak per kartu. Web memberi tombol "Coba lagi" per bagian — standar UX project mewajibkan umpan balik gagal |
| B-2 | `/home` | `now.iso`, `now.today`, `now.timeZone`, `now.dateLabel`, `now.timeLabel` | §4 |
| B-3 | `/home` | `counters.managedProjects`, `memberProjects` | Agar 0 bisa dijelaskan ("Anda tidak mengelola proyek") daripada 0 telanjang |
| B-4 | `/home` | `focus.items[].{id, priority, dueDate, group, overdueDays, action}` | `action` menggantikan aturan izin klien (§3); `priority` dan `overdueDays` memperkaya baris |
| B-5 | `/home` | `focus.awaitingReview[]`, `awaitingReviewTotal` | Mobile menghitung "review" dari status; server sudah memfilter dengan `canApproveTask` |
| B-6 | `/home` | `focus.total` | Angka "See all tasks (N)" yang benar (mobile memakai `openCount` halaman) |
| B-7 | `/home` | `projects[].progress.{done,total,percent}` | `percent` bisa `null` (proyek tanpa tugas) — mobile yang memakai `number` akan menampilkan 0% keliru |
| B-8 | `/home` | `projects[].reason` | Penjelasan kenapa sebuah proyek *at risk* |
| B-9 | `/home` | `agenda[]` selengkapnya (`kind`, `endsAt`, `project`, `day`) | Mobile hanya menampilkan satu event; server mengirim agenda hari ini + besok |
| B-10 | `/home` | `activity[].{id, taskNumber}` | Kunci React yang stabil + tautan ke tugasnya |
| B-11 | `/home` | `ask[]` tiga jawaban, `bars[].display` | Mobile menampilkan satu jawaban dan hanya `pct` |
| B-12 | `/inbox` | `bundleCount`, `read`, `lane`, `group:'older'`, `ref`, `payload`, `actor.image`, `createdAt/updatedAt` | `bundleCount` ("5 perubahan"), `read` per kartu, kelompok "Older", avatar nyata |
| B-13 | `/inbox/count` | `infoUnread` | Lencana berita belum dibaca (mobile hanya punya bendera global) |
| B-14 | `/inbox/:id/read` | — | Tandai satu kartu terbaca; mobile hanya punya "Mark all" |
| B-15 | `/team` | `people[].{id, jobTitle, image}`, `summary.projects`, `total` | Jabatan dan foto nyata; `total` untuk paginasi |
| B-16 | `/team` | `q`, `sort`, `projectId`, `limit`, `offset` | Dua pemilih di layar masih dekoratif (§5) |
| B-17 | `/team/:id` | `tasksVisible`, `alsoElsewhere`, `person.phone`, `tasks[].{projectId,dueDate}` | `tasksVisible` membedakan "tidak boleh lihat" dari "tidak ada tugas" |
| B-18 | `/profile` | `textSize` | Skala teks pengguna ada di server (3 tingkat); mobile belum menyelaraskannya |
| B-19 | `/profile`, `/avatar` | `phone`, `delete-check`, unggah/hapus foto | "Change photo" masih toast; hapus akun belum ada di mobile |
| B-20 | `/trash` | `restorableUntil`, `daysLeft`, `blockedBy`, `projectInTrash`, `can{}`, `counts`, `total` | Retensi 30 hari **wajib** terlihat; `blockedBy` mencegah tombol yang pasti 409 |
| B-21 | `/trash/*/restore` | `{ tasks }`, `{ number }` | Copy notice yang berisi ("Proyek dipulihkan bersama 8 tugas") |

---

## 3. Izin (`can{}`)

Aturan: **mobile membaca kapabilitas dari server; mobile tidak boleh membuat aturan izin versi sendiri.**
Bentuk nilai (`server/access/capabilities.ts:6`): `true` = tampil & aktif · kode deny = tampil tapi
**disabled** dengan alasan · **kunci absen** = **sembunyikan**.

### Kunci `can` yang dipakai modul ini

| Objek | Kunci | Sumber | Tombol/menu mobile yang harus mematuhinya |
|---|---|---|---|
| Item Sampah | `restore` | `TrashItemCaps`, `server/access/trash.policy.ts:25`, dibangun `:60` | Tombol **Restore** di `mobile/src/screens/archive/archive-card.tsx`. Nilainya bisa kode `EXPIRED` (masa pemulihan lewat) atau `IMPERSONATING`, dua-duanya `ui: 'disable'` (`server/access/decision.ts:122`, `:64`) → tombol tampil **disabled** dengan alasan, bukan hilang |
| Item Sampah | `purge` | sama | Tombol **Delete forever**. Ganti `canDelete = role === 'admin'` (`mobile/src/data/archive.ts:63`) dengan `item.can.purge`. Untuk non-Admin kuncinya **absen** — denynya `ROLE_CANNOT_PURGE` ber-`ui: 'hide'` (`server/access/decision.ts:128`), jadi kontrolnya harus benar-benar tidak ada, bukan disabled. Perhatikan A-24: kapabilitasnya ada, rutenya tidak |

### Modul ini yang **tidak** memakai `can{}`, dan apa penggantinya

- **Beranda / My Focus** → bukan `can{}` melainkan `focus.items[].action: 'complete' | 'start' | null`
  (`server/home/home.dto.ts:52`, disusun `server/home/home.focus.query.ts:76` dari `canCompleteTask`/
  `canStartTask`). Mobile harus **menghapus** `canMarkDone()` (`mobile/src/data/home.focus.ts:15`,
  dipakai `home.actions.ts:19`) dan merender tombol dari `action`: `complete` → Done, `start` → Start,
  `null` → tanpa tombol (judul tetap membuka tugasnya).
- **Beranda / Proyek saya** → `HomeProject` tidak membawa `can` (`home.dto.ts:80`). Kapabilitas proyek
  (`ProjectCaps`: `update`, `trash`, `createTask`, `manageKinds`, `server/access/capabilities.ts:85`)
  hanya ada di DTO Projects (`server/project/project.dto.ts:66`) — milik worker Projects. Baris Beranda
  cuma tautan, jadi tidak perlu `can`.
- **Tim** → tidak ada `can{}`. Kontrak privasinya adalah **kunci yang absen** (`server/team/team.dto.ts:1`):
  `load`, `alsoElsewhere`, `tasks`, `accountRole`, `person.phone`, `summary.active`, `summary.overdue`
  **absen** (bukan `null`, bukan `0`) bila pemanggil tidak boleh melihatnya. Mobile harus bercabang pada
  **ada/tidaknya kunci**, dan `tasksVisible: false` dibedakan dari "tidak ada tugas". Satu-satunya cabang
  berbasis role yang sah di layar ini adalah copy (A-18) lewat `whoami.role`, bukan hak akses.
- **Inbox** → tidak ada `can{}`. Satu kartu = satu tombol, dari `button` + `href` (`notification.query.ts:39`).
  Kartu yang tidak boleh dilihat tidak pernah terkirim (`visibleTo`, `notification.query.ts:65`), jadi
  mobile tidak perlu menyaring apa pun.
- **Profil** → tidak ada `can{}`; satu-satunya gerbang adalah `delete-check.canDelete`
  (`server/api/app-profile.delete-check.ts:12`), ditambah `403 IMPERSONATING` saat sesi impersonasi (`:10`).
- **Kapabilitas tingkat aplikasi** → `AppCaps { createProject, createEvent, dashboard, dev }`
  (`server/access/capabilities.ts:107`) dipakai loader layout web (`app/routes/app/layout.tsx:124`).
  Di `/api/app` hanya `createEvent` yang ikut terkirim, menyelip di daftar event dan daftar tugas
  (`server/api/app-events.ts:60`, `server/api/app-tasks.ts:56`). `createProject`, `dashboard` dan `dev`
  **tidak ada di rute `/api/app` mana pun** (sudah dicek: `appCaps` hanya dipanggil di dua tempat itu dan
  di loader web). Panel More dan sheet Create mobile butuh ini → **butuh perubahan server** (mis. ikutkan
  `caps` di `GET /api/app/whoami`) atau mobile menebak dari `whoami.role`, yang justru melanggar aturan
  "jangan bikin aturan izin sendiri". Catat sebagai keputusan terbuka untuk Tahap 3.

---

## 4. Tanggal dan zona waktu

Data contoh memakai konstanta: `TODAY = '2026-10-07'` dan `GREETING = 'Good morning'`
(`mobile/src/data/sample/today.ts:5`, `:8`). Aturan proyek: **"hari ini" ditentukan server, jangan
`new Date()` di klien.**

### Dari mana `today`, `now` dan `timeZone` diambil setelah tersambung

| Nilai | Sumber kabel | Catatan |
|---|---|---|
| `today` (`YYYY-MM-DD`) | `GET /api/app/home` → `now.today` (`server/home/home.dto.ts:17`) | Dihitung `isoDateIn(at, METRICS.TIME_ZONE)` (`server/home/home.now.ts:31`) |
| `timeZone` | `now.timeZone` | Zona tim, **bukan** zona perangkat |
| Jam sekarang (garis "now") | `now.iso` | Instant permintaan |
| Sapaan | `now.greeting` (enum 4 nilai) + `now.dateLabel`, `now.timeLabel` | Ambang jam: `server/home/home.copy.ts:11` |
| Kelompok hari kartu Inbox | `item.group` `'today'\|'yesterday'\|'older'` | Diputuskan server dari `METRICS.TIME_ZONE` (`server/notification/notification.query.ts:79`) — **jangan** hitung ulang |
| Retensi Sampah | `item.restorableUntil`, `item.daysLeft` | Diputuskan server (`server/trash/trash.item.ts:13`) |
| Terlambat/aktif di Tim | sudah dihitung server dengan `today`-nya (`server/team/team.query.ts:44`) | `load.overdue` tinggal dipakai |
| Label hari "Done this week" | `done.items[].dayLabel` | `'hari ini'\|'kemarin'\|<nama hari>` (`server/home/home.done.query.ts:19`) |

Karena satu-satunya titik yang mengirim `now` adalah `/api/app/home`, mobile butuh **satu store jam**
yang diisi dari jawaban Home dan dibaca semua layar (pola yang sama dengan `TODAY` sekarang, jadi
perubahannya kecil). Layar yang dibuka tanpa melewati Home (deep link ke `/profile/calendar`, `/more/team/x`)
harus menunggu store itu terisi, atau mengambil Home sekali di latar. Jangan diam-diam jatuh ke
`new Date()`.

### Layar yang akan salah kalau memakai jam perangkat

| Layar | Tempat | Akibat |
|---|---|---|
| Beranda — chip stat | `dueIn()`, `leftThisMonth()` (`mobile/src/data/home.stats.ts:38`) | "overdue"/"due today" bergeser sehari bila ponsel di zona lain, atau jam ponsel salah |
| Beranda — My Focus | `daysToSunday(TODAY)` (`mobile/src/data/home.focus.ts:31`) | Tugas pindah antara kelompok Today/This week |
| Beranda — Completed | `doneOn()` + `daysSinceMonday(TODAY)` (`mobile/src/data/home.tasks.ts:10`) | Batas "minggu ini" bergeser; Senin di zona lain memotong terlalu dini |
| Beranda — Latest activity | "1 hour ago" | Waktu relatif harus dihitung dari `now.iso`, bukan `Date.now()` |
| Inbox — Latest updates | pemisah Today/Yesterday | Server sudah memutuskannya (`group`); kalau mobile menghitung sendiri, kartu bisa muncul di hari yang salah |
| Tim — pil Overdue | `isOverdue(t)` (`mobile/src/data/team.person.ts:39`) | Pil "Overdue" muncul/hilang keliru; padahal `load.overdue` server sudah benar |
| Profil — My calendar | `today`, `NOW_MIN` 9:41 (`mobile/src/data/profile.ts:104`, `:127`) | Hari yang ditandai "today", posisi scroll, dan garis "now" salah |
| Arsip | `monthDay(e.date)` (`mobile/src/data/archive.ts:45`) | Tanggal hapus bergeser sehari; dan `daysLeft` server wajib dipakai apa adanya |

Satu hal yang **sudah benar** di mobile dan jangan diubah: `mobile/src/data/dates.ts:1` menghitung
kalender dalam UTC supaya zona ponsel tidak menggeser hari. Yang perlu diganti hanyalah **nilai**
`TODAY`, bukan cara hitungnya.

---

## 5. Paginasi dan muat ulang

Data contoh adalah larik penuh di memori (`createStore`, `mobile/src/data/store.ts`), jadi setiap layar
memfilter dan menghitung di klien. Server memakai dua gaya paginasi (`server/api/app-common.ts:11`):
**keyset/cursor** untuk daftar yang terus tumbuh, **offset/page** untuk daftar kecil bertotal.

| Layar | Gaya server | Bentuk kursor / parameter | Batas | Tempat mobile mengasumsikan semua data ada |
|---|---|---|---|---|
| **Inbox** (dua lajur) | keyset | `?cursor=<opaque>&limit`; balasan `{ items, nextCursor }`; kursor rusak → **400 `BAD_CURSOR`**, jawabannya muat ulang dari awal, bukan coba lagi (`server/api/app-inbox.ts:22`) | `limit` default **25**, maks **100** (`notification.query.ts:54`, `server/pm/limits.ts:15`) | `updateDays()` membangun kedua hari dari larik penuh (`mobile/src/data/inbox.ts:121`); `respondCards()` selalu mengembalikan 2–3 kartu tetap (`:78`). **Butuh "muat lebih banyak"** di kedua tab, dan pengelompokan hari harus inkremental lintas halaman (plus kelompok `older` yang belum ada) |
| **Tim list** | offset | `?limit&offset`; balasan `{ people, total, summary }`; `summary.people` = seluruh tim terfilter, `summary.active/overdue` = **halaman ini saja** (`server/team/team.dto.ts:60`) | `limit` default **24**, maks **50**; `q` maks 100 char (`server/team/team.query.ts:36`) | Pencarian difilter klien atas seluruh larik (`mobile/src/screens/team/team.screen.tsx:59`) → pindah ke `?q=`. **Butuh "muat lebih banyak"** untuk tim > 24 orang. `sort=active\|overdue` memeringkat seluruh tim sampai `TEAM_SORT_SCAN_LIMIT` lalu memotong halaman (`server/api/app-team.ts:39`) dan bisa menjawab **422 `SORT_NOT_ALLOWED`** — siapkan jalur galat itu |
| **Tim person** | tanpa paginasi | — | `tasks` dipotong `PERSON_TASKS_MAX` = **20** (`server/team/team.load.query.ts:20`) | Mobile menampilkan semua tugas aktif (`activeOf()`, `mobile/src/data/team.load.ts:13`). Server sudah memotong, jadi tambahkan baris "lihat semua" atau terima potongannya |
| **Arsip/Sampah** | offset | `?page&limit&kind`; balasan `{ items, total, page, limit, counts }`; `page` di luar jangkauan tetap halaman kosong yang sah (`server/api/app-trash.ts:38`) | `limit` default **25**, maks **100** (`server/api/app-common.ts:5`) | `getArchive()` memfilter dan menghitung chip atas seluruh larik (`mobile/src/data/archive.ts:55`) → pakai `?kind=` dan `counts` server. **Butuh "muat lebih banyak"** |
| **Beranda** | tanpa paginasi | satu panggilan, tanpa query | Potongan tetap: `HOME_FOCUS_MAX 5`, `HOME_REVIEW_MAX 3`, `HOME_PROJECTS_MAX 5`, `HOME_DONE_MAX 5`, `HOME_ACTIVITY_MAX 5`, `HOME_ASK_BARS_MAX 5` (`server/home/home.config.ts`) | `LENGTHS` per role memotong di klien (`mobile/src/data/home.ts:29`) → **hapus**; pakai `focus.total`, `done.total` untuk tautan "See all" |
| **Tim picker** | tanpa paginasi | `?q&projectId&limit` | default **20**, maks **50** (`server/team/picker.query.ts:19`) | Belum dipakai modul ini; relevan untuk form di modul lain |
| **Profil kalender** | — | modul Events | — | **belum dipastikan** (worker Events) |

Muat ulang: `GET /api/app/inbox/count` dirancang untuk dipanggil berulang (dikecualikan dari rate limit IP
karena setiap tab web memanggilnya tiap 60 detik, `server/api/app-inbox.ts:47`) dan **tidak pernah di-cache**.
Itu titik polling yang paling aman untuk mobile. Permintaan tulis terkena limiter per user
(60 / 60 detik, `server/pm/limits.ts:19`), jadi "Mark all as read" dan Restore jangan dipanggil berentet.

---

## 6. Urutan kerja yang disarankan

Dari paling tidak berisiko. Tiap langkah bisa di-merge sendiri dan tidak merusak langkah berikutnya.

| # | Pekerjaan | Kenapa aman / kenapa dulu | Perkiraan berkas |
|---|---|---|---|
| 1 | **Store jam server.** Ganti `TODAY`/`GREETING` konstanta dengan store yang diisi `now` dari `/api/app/home`; semua pembaca tetap memakai API lama (`today()` alih-alih `TODAY`) | Satu nilai, tanpa perubahan UI, dan menutup seluruh §4 untuk langkah-langkah berikutnya | `mobile/src/data/sample/today.ts`, `mobile/src/data/dates.ts`, pemanggil `TODAY` di `home.stats.ts`, `home.focus.ts`, `home.tasks.ts`, `profile.ts`, `team.person.ts`, `archive.ts` |
| 2 | **Identitas: `GET /api/app/profile` + `GET /api/app/whoami`.** Ganti `me(role)`/`SESSION_ROLE`; mulai pakai `userId` sebagai kunci orang, bukan nama depan | Membuka A-1/A-2/A-18/A-20 sekaligus, dan memaksa refactor nama→id lebih awal (sebelum kode yang bergantung bertambah) | `mobile/src/data/{session,people,profile,settings}.ts`, `mobile/src/data/sample/people*.ts`, layar Profil + Edit profile |
| 3 | **`GET /api/app/inbox/count`.** Satu angka untuk chip Beranda `inbox` dan baris Profil `Inbox` | Satu endpoint, satu `number`, dua pemakai; aman buat memasang pola klien/react-query pertama | `mobile/src/data/{home.stats,profile}.ts` |
| 4 | **Inbox penuh.** Dua lajur, kursor, `read` per kartu, `POST /read-all`, pemetaan `href` web → rute Expo, kelompok `older` | Modul paling berdiri sendiri yang punya endpoint lengkap; tidak ada layar lain yang bergantung padanya kecuali satu angka di langkah 3. Keputusan bahasa (A-16) harus diambil di sini | `mobile/src/data/{inbox,inbox.links,inbox.store}.ts`, `mobile/src/screens/inbox/**`, `mobile/src/data/sample/inbox*.ts` (dihapus) |
| 5 | **Beranda.** `GET /api/app/home` + `GET /api/app/tasks/counts`; hapus `home.stats.ts`/`home.focus.ts`/`home.tasks.ts` sebagai lapisan hitung, ganti `canMarkDone` dengan `action`, tambah state `Widget{ok:false}` per kartu | Perubahan terbesar, dan satu-satunya yang butuh keputusan A-5..A-12 → kerjakan setelah pola klien, jam, dan identitas sudah mantap | `mobile/src/data/{home,home.types,home.stats,home.focus,home.tasks,home.actions}.ts`, `mobile/src/screens/home/**`, `mobile/src/data/sample/home.ts` (dihapus) |
| 6 | **Tim list + person.** Pindahkan cari/urut/filter proyek ke query, aktifkan dua pemilih yang sekarang dekoratif, ubah cabang role menjadi cabang **kunci absen**, ganti param rute `[id]` jadi userId | Bergantung pada langkah 2 (userId) dan 1 (hari ini untuk pil Overdue); API-nya sendiri sudah lengkap, tidak ada GAP yang butuh server | `mobile/src/data/{team,team.load,team.person}.ts`, `mobile/src/screens/team/**`, `mobile/app/(tabs)/more/team/[id].tsx`, `mobile/src/data/sample/team.ts` (dihapus) |
| 7 | **Arsip → Sampah.** `GET /api/app/trash` + tiga rute restore; tampilkan `daysLeft`/`restorableUntil`; `can.restore`/`can.purge`; hormati `projectInTrash` (409) | Dikerjakan belakangan karena **butuh keputusan produk lebih dulu** (A-24 "Delete forever" dan nama menu "Archive" vs "Sampah 30 hari"). Restore-nya sendiri sudah bisa nyata | `mobile/src/data/{archive,archive.store}.ts`, `mobile/src/screens/archive/**`, `mobile/app/(tabs)/more/archive/**`, `mobile/src/data/sample/archive.ts` (dihapus) |
| 8 | **Profil ② My calendar.** Menunggu peta modul Events | Satu-satunya layar modul ini yang bergantung pada worker lain | `mobile/src/data/profile.calendar*.ts`, `mobile/src/screens/profile/{calendar.screen,day-grid,week-strip}.tsx` |

Keputusan yang harus ditutup sebelum Tahap 3 dibagikan:

1. **Bahasa** (A-16): mobile ikut copy Indonesia server, atau menyusun kalimatnya sendiri dari
   `kind` + `payload`? Memengaruhi langkah 4 dan 5.
2. **Chip Beranda per role** (A-5..A-9): terima angka berlingkup server ("proyek saya", "yang saya kelola")
   dan ubah copy, atau minta perubahan server? Memengaruhi langkah 5.
3. **"Delete forever"** (A-24): hapus layarnya, atau minta rute purge Admin-only?
4. **`AppCaps`** (§3): ikutkan `caps` di `whoami`, atau mobile tetap buta terhadap
   `createProject`/`dashboard`/`dev`?
5. **Catatan & presence profil** (A-21, A-22): butuh kolom di server, atau diterima sebagai state lokal
   perangkat dengan copy yang jujur?

Hal yang **belum dipastikan** dan perlu dicek saat Tahap 3 dirakit: bentuk query dan DTO
`GET /api/app/events` (worker Events, dibutuhkan A-6, A-10 dan §1.7), bentuk balasan
`GET /api/app/tasks/counts` selain docstring-nya (worker Tasks, dibutuhkan A-3/A-4/A-6), DTO daftar
Projects untuk `lead` dan `status` (worker Projects, dibutuhkan A-11/A-12), serta endpoint persetujuan
akun yang dipakai layar Users (worker Users, bertetangga dengan A-9 dan A-13).
