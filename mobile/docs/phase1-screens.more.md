# Phase 1 — Auth, Inbox, Team, Users, Archive, Settings, Profile (W3)

Bagian dari `phase1-screens.md`. Sumber: `riset-keano/prototype-react/src/screens/{auth,inbox,team,users,archive,settings,profile}/*`, `src/data/sample.js` (`team`, `archive`, `users`, `people[].email/role`), `src/data/sample.inbox.js`, tes `inbox.updates`, `archive.undo`, `archive.settings`, `users`, `settings.profile`, `profile`, `profile.calendar`, `roles.gating`.

## 1. Id → route

| Id prototipe | Route | Presentasi | Tab bar |
|---|---|---|---|
| `auth.login` | `app/(auth)/login.tsx` | Stack root `(auth)`, `gestureEnabled: false` | — |
| `auth.account` | `app/(auth)/account.tsx` | push | — |
| `auth.pending` | `app/(auth)/pending.tsx` | `router.replace` dari account | — |
| `auth.denied` | `app/(auth)/denied.tsx` | push | — |
| `inbox.respond`, `inbox.updates`, `inbox.empty` | `app/(tabs)/more/inbox.tsx` — param `tab=respond\|updates` | push di Stack More | ya |
| `team.list`, `team.empty` (member) | `app/(tabs)/more/team/index.tsx` | push | ya |
| `team.person` | `app/(tabs)/more/team/[id].tsx` (`id` = kunci orang, mis. `rina`) | push | ya |
| `archive.list`, `archive.empty` | `app/(tabs)/more/archive/index.tsx` | push | ya |
| `archive.delete` (admin) | `app/(tabs)/more/archive/[key]/delete.tsx` (`key` = kunci entri arsip) | formSheet | — |
| `archive.undo` | bukan route — snack di list sumber (K5) | — | — |
| `users.approve`, `users.roles` (admin) | `app/(tabs)/more/users.tsx` — param `tab=approval\|roles` | push | ya |
| `settings.main` | `app/(tabs)/more/settings/index.tsx` | push | tidak |
| `settings.profile` | `app/(tabs)/more/settings/profile.tsx` | push | tidak |
| `settings.leave` | `app/leave.tsx` (root, juga dari sheet Create) | formSheet | — |
| `profile.me` | `app/profile/index.tsx` | modal (rekomendasi, §2 main doc) | — |
| `profile.calendar` | `app/profile/calendar.tsx` | push di Stack modal | — |

- Panel More (Sesi A) membuka route `more/*`; kartu profil membuka `/profile`.
- Baris profile.me yang menuju tab (My tasks, Inbox, Settings): `router.dismiss()` lalu `router.navigate(...)`.
- Tab Inbox/Users = `router.setParams({ tab })` dengan Seg kit (prototipe `Tabs` + `go`).

## 2. Auth (UI saja; Better Auth = Phase 2)

| Layar | Copy | Aksi |
|---|---|---|
| Login | Media "Illustration / image"; **"[App Name]"**; "Manage team projects with ease"; "Sign in to your account"; tombol **Sign in with Google**; "No account yet? Just sign in with Google. New accounts need admin approval before they can be used."; kaki "Help · Privacy Policy" | Google → `account` |
| Account | **"Choose an account"** / "to continue to [App Name]"; baris Budi Santoso `budi@kantor.id`, `budi.santoso@gmail.com`; "Use another account" | Kantor → `pending` (replace); Gmail → `denied`; lainnya notice "Opens Google sign-in" |
| Denied | **"Access denied"**, "Reason from admin:", "Please sign in with your office email (@kantor.id), not a personal Gmail account. — Ayu" | Back ke account |
| Pending | Judul "[App Name]", **Sign out** → login (replace); "Your account is awaiting admin approval" + pill Pending; field profil; **Save profile** ("Profile saved"); **Check status** → `/` (replace); "No other menus until an admin approves your account." | — |

- "[App Name]" dipertahankan seperti prototipe (placeholder nama). Sign out → AlertDialog T2 (deviasi §2 main doc).
- Layar awal app = keputusan orchestrator (§2 main doc); route `(auth)` tetap bisa dibuka.

## 3. Inbox

- Frame: judul **"Inbox"**, back, tab **"Needs your response (3)"** / **"Latest updates"** (angka = jumlah kartu; 0 di empty).
- **Needs your response** — tiga kartu per role (data `INBOX_RESPOND` Sesi B + `sample.inbox.js`):
  - Member/PM: [0] tugas untuk direview (PM) / tugas baru (Member) → detail tugas; [1] PM: konfirmasi outcomes stand-up (lead `Sparkles`, label "AI-assisted") → `eventHref(daily)`; Member: undangan event; [2] mention, kutipan `@Nico` diganti nama saya.
  - Admin: **Approvals** dulu ("2 new users awaiting approval", nama, avatar, "Approval cards are for Admins only. Once one Admin decides, the card disappears for all Admins.", **Open Users** → `/more/users`), lalu review dengan alasan "You're the task reviewer because the project has only one Manager", lalu mention.
  - Tiap kartu: avatar pelaku, judul, meta, satu tombol aksi kanan (`link(meta)` membuka task/event yang disebut).
- **Latest updates**: grup **Today** (titik unread, label "Unread") dan **Yesterday**; tautan **Mark all as read** → titik hilang + notice "All marked as read"; status baca bertahan saat Inbox ditinggal (`inbox.store`). Admin punya feed sendiri.
- **Empty**: ikon `Check`, **"All caught up"** / "Nothing needs your response right now." + **View latest updates**.

## 4. Team

- **List**: judul **"Team"**, back; "Who's on your team and what they're working on"; select **All projects** (toast "Pick a project") + **Sort: Name** (toast "Name · Overdue · Active tasks"); cari "Search name…"; kotak ringkasan; baris orang; catatan.
- Varian (`VARIANTS` di `team.list.jsx`, port persis):

| Role | Ringkasan | Orang | Catatan |
|---|---|---|---|
| pm | "Projects you manage · 3 people · <total>" | Nico (You), Rina, Dodi | — |
| admin | "All projects · 6 people · <total>" | Ayu (You, "Admin · No project", tanpa hitungan), Nico ("Project Manager · Atlas Project, Internal Tools"), Rina, Dodi, Sri ("Observer · Atlas Project", tanpa hitungan) | "Approving new users and changing roles happens in More › Users." |
| member | "Project Atlas Project · n people" | Dodi (You), Nico & Rina tanpa hitungan | "Task counts per person are visible only to that person, the project Manager and Admin." |

- Baris: avatar, nama lengkap + "(You)", role, status ("Available" hijau), extra, "n active" + "n overdue" (merah) dari store tugas langsung (`team.load`), "View". Tap → `/more/team/<key>`.
- **Person**: judul **"Team member"**; fakta Job title / Division / Email / Account role; proyek bersama ("No shared projects."); **Active tasks** ("No active tasks.") dengan aturan lihat: Member melihat tugas orang lain → "Other people's task lists are visible only to the project Manager and Admin."
- **Empty** (Member tanpa proyek): ikon `Users`, **"No team yet"** / "You haven't joined any project yet. Your team will show up once a Manager adds you to a project."

## 5. Users (Admin)

- Frame **"Users"**, back, tab **Approval / Roles**, intro per tab.
- **Approval**: intro "New users sign in with Google and wait for your decision. Only Admins can approve."; chip "Pending 2 · Approved 6 · Rejected 1 · Deactivated 0" (`USER_COUNTS` Sesi B); cari "Search name or email…"; "2 waiting".
  - Kartu pending (Sari): nama, waktu, email, "Position: … · Division: …"; **Starting role** select Member; **Reject** ("Write a reason first") / **Approve** ("User approved as Member").
  - Kartu menolak (Budi): "Profile not filled in. Only name, email and photo from Google."; **Reason for rejecting (required)**; "The reason is shown to the user when they try to sign in."; **Cancel** ("Rejection canceled") / **Reject user** (danger, "User rejected").
  - InfoBox **"After approval"**: "Approved users become Members right away; their next sign-in goes straight to Home." / "The Project Manager role is given in the Roles tab."
- **Roles**: intro "Give or remove the Project Manager role, or deactivate a user."; chip "Approved 6 · Deactivated 0"; "6 users"; baris orang (nama, email; saya: pill Active + role; lainnya: select role + **Deactivate** danger-ghost "User deactivated"). InfoBox **"Rules"** (3 butir, port persis dari `users.roles.jsx`).
- Semua aksi Approve/Reject/Deactivate/ubah role → AlertDialog T2 sebelum notice (deviasi §2 main doc).

## 6. Archive

- Frame **"Archive"**, back; "Archived items stay here until someone restores them."; chip **All n · Projects n · Tasks n · Events n**; "n items".
- Kartu: label jenis (PROJECT/TASK/EVENT), judul, "<where> · Archived by <by> · <date>", "Includes …" (proyek); **Restore** dan (Admin) **Delete forever** (danger-ghost) → sheet.
- Prototipe: Restore di list hanya notice "Restored". **Rekomendasi**: panggil restore store yang sama dengan Undo (`unarchiveTask`/`restoreProject`/`restoreEvent`) + notice "<Kind> restored". Deviasi kecil, perlu persetujuan.
- **Delete forever** (`archive.delete`): judul **"Delete forever?"**, sub "<Kind> · <title>"; "<Kind> “<title>” [with <includes>] will be gone for good. This cannot be undone."; "Only an Admin can delete forever. Others can only restore."; **Cancel** / **Delete forever** (danger, "Deleted forever"). T3: tambah input ketik judul (deviasi §2 main doc).
- **Empty**: ikon `Archive`, **"Archive is empty"** / "What you archive shows up here."
- **Undo setelah arsip** (dari Tasks/Projects/Events): snack **"Task/Project/Event moved to Archive"** + **Undo** → restore + notice "… restored". Tugas mendarat di **All tasks** (`/tasks?scope=all`, seperti `archive.undo.jsx`), proyek di Projects, event di Events.
- Data: `src/data/archive.store.ts` (W0, karena ditulis tiga modul): entri `{ key, kind, title, where, by, date, includes?, ref }` + `addEntry`, `removeEntry`, `listEntries`, `reset`; sampel awal dari `sample.js` `archive`. Store tugas/proyek/event menambah/menghapus entri saat arsip/restore.

## 7. Settings

- **Main** (`settings.main`, **"Settings"**, back, tanpa tab bar):
  - **My account**: avatar lg, nama, "<title> · <division> division", email, **Edit profile** → `settings/profile`.
  - **Notifications**: switch **Event reminders** ("1 day and 30 minutes before the event starts"), **Inbox updates** ("Comments, task changes, and event invites"); catatan "Requests that need your response always appear in Inbox and can't be turned off."
  - **Availability**: **Leave** ("Not on leave. Teammates see you as Available.") + tombol **Set leave** (admin) / **Request leave** → `/leave`.
  - **Team settings (Admin only)**: AI features (switch), Recording retention (select "30 days"), Default event reminder ("1 day & 30 min"), Leave needs approval (switch), Roles and permissions (**View ›**, toast "Roles and permissions — not in the prototype yet").
  - **Sign out** (danger, block) → AlertDialog T2 → `router.replace('/login')`.
- **Edit profile** (`settings.profile`, **"Edit profile"**): foto + **Change photo** (toast "Change photo — not in the prototype yet"); Full name, Nickname (for greetings), Job title, Division; Role disabled ("Your role is set by an Admin."); Email disabled ("Email comes from your Google account and can't be changed."); **Cancel** / **Save** ("Profile saved").
- **Leave** (`/leave`, `LEAVE[role]`):

| Role | Judul | Hint | Tombol | Notice |
|---|---|---|---|---|
| member | Request leave | Request is sent to your project Manager or Admin. | Send request | Leave request sent |
| pm | Request leave | Request is sent to Admin. | Save | Leave request sent |
| admin | Set leave | Admin leave applies immediately, no approval. | Save leave | Leave saved |

  Field **From date** / **To date** (DateField; contoh Mon, Oct 12 – Wed, Oct 14, 2026), **Note (optional)**; **Cancel** + tombol role.

## 8. Profile

- **profile.me** (modal): Hero — Avatar xl + titik presence (hijau bila online), gelembung catatan (`ProfileNote`: maks 60 karakter, "+ Add a note", placeholder "What's on your mind?", label "Note: <isi>. Edit note" / "Add a note"), nama (title2), "<title> · <division>" (+ " · Admin"), "Online"/"Offline".
- **Edit profile** (primary, `Pencil`) → `settings/profile`.
- Baris bertile: **My tasks** (blue) → `/tasks`; **My calendar** (red) → `profile/calendar`; **Inbox** (blue, hitungan = jumlah respond) → `/more/inbox`; **Mute notifications** (indigo, Switch); **Settings** → `/more/settings`; **Help & resources** (toast "Help & resources — not in the prototype yet").
- **General info**: **Show me as online** (switch; sub "Teammates see you as Online/Offline"), email + tombol **Copy email** → `expo-clipboard` `setStringAsync` → "Email copied"; gagal → "Could not copy the email: <pesan>".
- **Sign out** (danger) → AlertDialog T2 → `/login`.
- State `online`, `muted`, `note` di `src/data/profile.store.ts`.

### 8.1 My calendar (`profile.calendar`)

- Judul **"My calendar"**, back. Strip pekan **Minggu-pertama** (beda dengan kalender Events yang Senin-pertama), label hari "Wednesday, Oct 7, 2026, today"; judul bulan "October 2026"; grid 24 jam (`HOUR_PX` 56, label "12 AM … 11 PM"); garis "sekarang" di 9:41 (`NOW_MIN`); blok event bernada (`Meeting` blue, `Review` purple, `Important` red, `Team event` green).
- Scroll saat hari dipilih: titik fokus = sekarang (hari ini), else mulai event pertama, else 8 AM (`FIRST_MIN`); posisi = `max(fokus − 60 menit, 0) / 60 · HOUR_PX`.
- Item = event yang saya hadiri saja (`eventsFor(name)`: `{ e, date, start, end, every }`), berulang via `occursOn`. `repeatDays` hanya mengenali "every N weeks" (daily = sekali); port apa adanya.
- **Swipe pekan** (`profile.calendar.swipe.js`): `START_PX 6`, `PAGE_SHARE 0.25`, `PAGE_MIN_PX 40`, `FLICK_PX_MS 0.4`, `FLICK_MIN_PX 16`, `STALE_MS 100`. Port: `usePanGesture({ activeOffsetX: [-6, 6], failOffsetY: [-10, 10] })`; `onUpdate` → `translateX`; `onDeactivate` → halaman bila `|dx| > max(0.25·width, 40)` atau flick (`velocityX` > 400 px/s dengan `|dx| ≥ 16`); `STALE_MS` dapat dihilangkan karena `velocityX` RNGH sudah memperhitungkan jeda. Animasi `withTiming` ke ±width lalu `scheduleOnRN(onPage, ±1)` dan reset 0. Reduced motion: tanpa geser, langsung ganti. Aksi aksesibilitas "Previous week"/"Next week". Tidak perlu `react-native-pager-view`.

## 9. Data dan logika

| Berkas baru | Port dari | Isi |
|---|---|---|
| `sample/inbox.extra.ts` | `sample.inbox.js` | Feed updates per role, meta kartu, approvals |
| `sample/team.ts` | `sample.js` `team` | Baris tim (role, status, extra) |
| `sample/users.ts` | `sample.js` `users` | `pending` (Sari, Budi), `approved` |
| `sample/archive.ts` | `sample.js` `archive` | Entri arsip awal |
| `sample/auth.ts` | `auth.*.jsx` | Akun contoh, alasan ditolak |
| `inbox.store.ts`, `profile.store.ts` | `inbox.store.js`, `profile.store.js` | `markAllRead`/`useAllRead`; `online`, `muted`, `note` |
| `team.load.ts` | `team.load.js` | `loadOf(name)`, `totalOf(names)` dari store tugas W1 |
| `profile.calendar.dates.ts` | `profile.calendar.dates.js` | `weekOf` (Minggu), `monthLabel`, `dayLabel`, `hourLabel`, `clock`, `eventsFor`, `occursOn`, `itemsOn`, `initialScroll` |
| `profile.calendar.swipe.ts` | `profile.calendar.swipe.js` | Konstanta + `pageOf(dx, vx, width)` (worklet, murni, dites) |
| `inbox.ts`, `team.ts`, `users.ts`, `archive.ts`, `settings.ts`, `profile.ts`, `auth.ts` | — | Titik tukar API: `getInbox(role, tab)`, `getTeam(role)`, `getTeamPerson(role, key)`, `getUsers(tab)`, `getArchive(role)`, `getSettings(role)`, `getProfile(role)`, `getMyCalendar(role, weekStart)`, `getLeave(role)` |

- Email dan peran akun orang (`people[].email/role`) dari `src/data/people.ts` + `sample/people.extra.ts` (W0).
- `INBOX_RESPOND`, `USER_COUNTS` Sesi B dibaca, tidak diubah (K7).

## 10. Berkas layar (tiap ≤ 150 baris)

`src/screens/auth/{auth.strings.ts, login.screen.tsx, account.screen.tsx, denied.screen.tsx, pending.screen.tsx}`; `src/screens/inbox/{inbox.strings.ts, inbox.screen.tsx, respond.tab.tsx, updates.tab.tsx, inbox-card.tsx}`; `src/screens/team/{team.strings.ts, team.screen.tsx, person-row.tsx, person.screen.tsx}`; `src/screens/users/{users.strings.ts, users.screen.tsx, approval.tab.tsx, roles.tab.tsx, info-box.tsx}`; `src/screens/archive/{archive.strings.ts, archive.screen.tsx, archive-card.tsx, delete.screen.tsx}`; `src/screens/settings/{settings.strings.ts, settings.screen.tsx, team-settings.tsx, profile-edit.screen.tsx, leave.screen.tsx}`; `src/screens/profile/{profile.strings.ts, profile.screen.tsx, profile-hero.tsx, profile-note.tsx, calendar.screen.tsx, week-strip.tsx, day-grid.tsx}`.

## 11. Risiko

| Risiko | Penanganan |
|---|---|
| Modal profil + navigasi ke tab | `dismiss()` dulu lalu navigate; tes route |
| Swipe pekan vs scroll vertikal grid | `failOffsetY` pada pan strip; strip di luar ScrollView grid |
| Scroll grid 24 jam | Render pertama: `contentOffset` dari `initialScroll` (tanpa loncatan); ganti hari: `scrollTo({ y, animated: false })` |
| Clipboard | `expo-clipboard` (SDK 58 ~58.0.4) wajib di-install orchestrator; mock di Jest |
| Sign out tanpa sesi nyata | Phase 1: hanya navigasi `replace('/login')`; tanpa menghapus state |

## 12. Tes (`__tests__/<modul>/`)

- **Unit**: `team.load` (active/overdue dari store tugas; berubah setelah `moveTask`), `profile.calendar.dates` (Minggu-pertama, `dayLabel`, `hourLabel(0)` = "12 AM", initialScroll tiga cabang), `profile.calendar.swipe.pageOf` (seperempat lebar, minimum 40, flick), `inbox.store`, `profile.store`, `archive.store`.
- **Port tes prototipe**: `inbox.updates` (Mark all as read bertahan setelah keluar-masuk), `archive.undo` (tiga jenis, tugas ke All tasks), `archive.settings`, `users` (chip angka, kartu pending/menolak, Roles: saya tanpa select), `settings.profile` (Role/Email disabled, Save), `profile` (baris, switch online mengubah sub dan titik, Copy email memanggil clipboard), `profile.calendar` (swipe ke pekan berikutnya, garis sekarang, warna per tipe), `roles.gating` (users/archive.delete hanya admin; team.empty/events.empty member).
- **Varian role**: Team tiga varian, Inbox Admin dengan Approvals, Leave tiga copy.
- **Auth**: alur login → account → pending (replace) / denied; Check status → `/`.
