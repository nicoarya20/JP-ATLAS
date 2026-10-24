# Phase 1 — Spesifikasi porting layar (di luar Home, tab bar, panel More, sheet Create)

Status: draf D1 (Sesi D), 2026-10-25. Pelengkap `phase1-navigation.md` (Sesi A) dan pola data Home (Sesi B).
Sumber kebenaran: `riset-keano/prototype-react/` (`BRIEF.md`, `src/screens/<modul>/*`, `src/kit/*`, `src/data/sample*.js`, `src/test/*`). UI bahasa Inggris, 1:1 dengan prototipe.

Dokumen ini dipecah per modul agar tiap berkas ≤ 500 baris:

| Berkas | Isi |
|---|---|
| `phase1-screens.md` (ini) | Keputusan, deviasi, peta route semua modul, kit bersama, daftar install, urutan, pembagian sesi, tes lintas modul |
| `phase1-screens.tasks.md` | Tasks: list, filter, Kanban + menu radial + multi-select, detail, sheet Return/Cancel, edit, form, write, CSV, project settings |
| `phase1-screens.projects.md` | Projects: list, filter, people row, create (form/story/draft/template), detail 4 tab, extend, edit, archive |
| `phase1-screens.events.md` | Events: list, kalender bulan/pekan, filter, detail, form new/edit, sheet cancel/archive, rekaman, outcomes, results |
| `phase1-screens.more.md` | Auth, Inbox, Team, Users (Admin), Archive, Settings, profile.me, profile.calendar |

## 1. Keputusan dan asumsi

| # | Keputusan / asumsi | Alasan |
|---|---|---|
| K1 | Satu route per **keluarga** layar; varian prototipe (`tasks.my`/`tasks.all`/`tasks.board`, `tasks.detail-*`, `events.detail-*`) = satu layar yang membaca param/status | Prototipe juga merender varian dari satu komponen (`TasksList`, `TaskDetail`, `EventDetail`) |
| K2 | Varian "empty" (`tasks.empty`, `events.empty`, `team.empty`, `inbox.empty`, `archive.empty`) **bukan** route; muncul otomatis saat data kosong | Di prototipe id empty hanya demo galeri; di app nyata kosong = keadaan data |
| K3 | Sheet prototipe (`sheet(...)` di `index.js`) = route `presentation: 'formSheet'` (`sheetAllowedDetents: 'fitToContents'`, `sheetGrabberVisible: true`, `sheetCornerRadius: 16`) — sama dengan sheet Create Sesi A | Swipe-down, dim, dan escape aksesibilitas native; satu pola untuk semua sheet |
| K4 | Panel filter ("Filter & sort") = route formSheet; **query disimpan di store modul per scope**, bukan dioper lewat param | `router.dismissTo(href)` belum terbukti meneruskan param (types SDK 58: "If the href is not found, it will instead replace the current screen"). Store menghindari ketidakpastian itu dan mudah dites |
| K5 | `archive.undo` bukan layar: arsipkan → kembali ke list sumber (`router.dismissTo('/tasks')` dst.) → snack "X moved to Archive" + "Undo" dari host snack global | Prototipe merender list sumber + Snack; cocok dengan aturan T1 project (aksi langsung + Urungkan) |
| K6 | State in-memory per modul (`src/data/<modul>.store.ts`, `useSyncExternalStore`, `reset<Modul>()` untuk tes); tiap layar membaca lewat satu `get<Modul>…()` di `src/data/<modul>.ts` | Port 1:1 `*.store.js` prototipe; titik tukar ke API Phase 2 seperti `getHome` Sesi B |
| K7 | File sampel Sesi B (`src/data/sample/*.ts`) **tidak diubah** oleh worker modul. Field tambahan (detail tugas, health proyek, agenda event, email orang, dll.) masuk berkas baru (`src/data/sample/<modul>.extra.ts` untuk modul yang sudah punya sampel Sesi B, `src/data/sample/<modul>.ts` untuk yang belum) dan digabung di `src/data/<modul>.ts` | Wilayah Sesi B tetap utuh; bila orchestrator memindahkan kepemilikan berkas sampel ke worker modul setelah Home selesai, extras bisa dilebur |
| K8 | Copy diport **verbatim** dari file sumber ke `src/screens/<modul>/<modul>.strings.ts` (pola `home.strings.ts`). Dokumen ini hanya mengutip copy penting; file sumber tetap acuan | Menghindari salah ketik ganda; tes mencocokkan string penting |
| K9 | Haptic `navigator.vibrate` di prototipe (radial, tab bar) **tidak** diport | Keputusan `reacttransition.md`: tanpa `expo-haptics` |
| K10 | Rekaman suara, foto catatan, unggah/salin CSV, "Speak · coming soon" tetap **toast** seperti prototipe; tanpa `expo-audio`/`expo-image-picker`/`expo-document-picker` di Phase 1 | Prototipe tidak punya perilaku nyata di sana |
| K11 | "Hari ini" = `TODAY` (`2026-10-07`) dan "sekarang" = 9:41 dari `src/data/sample/today.ts` + konstanta baru; tidak pakai jam perangkat | Sama dengan prototipe dan aturan project ("Hari ini ditentukan server") |
| K12 | Role diterima sebagai prop dari `SESSION_ROLE` (`src/data/session.ts`); tes merender ketiga role | Pola Sesi B |

## 2. Keputusan orchestrator (2026-10-25, dicatat di `reacttransition.md` §1)

Aturan UX project (`CLAUDE.md` UX §1) **mengalahkan** prototipe untuk aksi destruktif. Pakai `AlertDialog` gluestack:

| Tempat | Prototipe | Ditetapkan |
|---|---|---|
| Sign out (`settings.main`, `profile.me`, `auth.pending`) | Langsung ke login | **T2** AlertDialog "Sign out?" / "You'll be signed out of this account." / Cancel · Sign out |
| Archive "Delete forever" (`archive.delete`) | Sheet konfirmasi saja | **T3**: sheet + Input "Type the item name to confirm"; tombol disabled sampai cocok |
| Remove member (`projects.members`) | Toast saja | **T2** AlertDialog sebelum notice |
| Users: Approve / Reject / Deactivate / ubah role (`users.*`), ubah role anggota proyek | Toast saja | **T2** AlertDialog per aksi; copy menyebut nama + role tujuan |
| Undo snack | Tanpa batas waktu (`kit/form.jsx`), hilang saat navigasi | Hilang otomatis **10 detik** (T1) |
| Restore di Archive | Notice "Restored" saja | **Tetap notice** seperti prototipe; pemulihan nyata menyusul di Phase 2 bersama API. Undo di snack tetap benar-benar memulihkan |
| Archive vs Sampah 30 hari | "Move to Archive", restore kapan saja | Phase 1 ikut prototipe (Archive + Undo); pertanyaan Sampah tetap terbuka di `reacttransition.md` |

Lainnya:
- **Layar awal = `(tabs)`.** Route `(auth)` tetap ada dan dibuka dari Sign out; gerbang login menyusul di Phase 2 (Better Auth).
- **profile.me = modal** setinggi penuh (`presentation: 'modal'`, padanan FullSheet prototipe).
- **Detail proyek selain Atlas** = header dari data list + empty state per bagian (`phase1-screens.projects.md` §1).

## 3. Peta route semua modul

Route tipis: file `app/**` hanya me-render layar dari `src/screens/<modul>/` (pola T5). Tab bar mengikuti `tabBarVisibleFor` Sesi A (§2.6).

### 3.1 Tambahan di root Stack (wilayah Sesi A — diminta ditambahkan)

| Route | Presentasi | Layar prototipe |
|---|---|---|
| `app/(auth)/_layout.tsx` + `login`, `account`, `pending`, `denied` | Stack, `headerShown: false`, `gestureEnabled: false` di login | `auth.*` |
| `app/tasks/new/_layout.tsx` (`index`, `form`) | modal (sudah direncanakan Sesi A) | `tasks.write`, `tasks.form` |
| `app/tasks/csv.tsx` | modal | `tasks.csv` (dibuka dari Create sheet, bukan dari tab) |
| `app/projects/new/_layout.tsx` (`index`, `form`, `story`, `draft`, `template`) | modal; langkah berikutnya push di Stack modal | `projects.new/form/story/draft/template` |
| `app/events/new.tsx` (param `event?`, `details?`) | modal | `events.new`, `events.new-details` |
| `app/leave.tsx` | formSheet | `settings.leave` (dibuka dari Create dan Settings) |
| `app/profile/_layout.tsx` (`index`, `calendar`) | modal; `calendar` push di dalamnya | `profile.me`, `profile.calendar` |

Catatan: `/tasks/new` (statis, root) dan `/(tabs)/tasks/[id]` sama-sama cocok dengan `/tasks/new`; Expo Router memilih rute statis. Id tugas selalu angka, jadi aman. Tes `renderRouter` wajib memastikan `/tasks/new` membuka modal dan `/tasks/12` membuka detail.

### 3.2 Per tab

```
app/(tabs)/tasks/
  index.tsx              tasks.my | tasks.all | tasks.board (param scope=mine|all, view=list|board); empty bila kosong
  filter.tsx             formSheet  tasks.filter (param scope)
  [id]/index.tsx         tasks.detail-todo|progress|review (dipilih dari status)
  [id]/edit.tsx          tasks.edit (push, tanpa tab bar)
  [id]/return.tsx        formSheet  tasks.return (pm/admin)
  [id]/cancel.tsx        formSheet  tasks.cancel
app/(tabs)/projects/
  index.tsx              projects.list (param who?)
  filter.tsx             formSheet  projects.filter
  [id]/index.tsx         projects.overview|tasks|phases|members (param tab, view untuk board)
  [id]/edit.tsx          projects.edit
  [id]/settings.tsx      tasks.settings ("Project settings")
  [id]/extend.tsx        formSheet  projects.extend
  [id]/archive.tsx       formSheet  projects.archive
  [id]/task-filter.tsx   formSheet  tasks.filter (scope project:<id>, Assignee)
app/(tabs)/events/
  index.tsx              events.list | events.calendar (param view=list|calendar); empty bila kosong
  filter.tsx             formSheet  events.filter (param view)
  [id]/index.tsx         events.detail-upcoming|recurring (dari event.repeat)
  [id]/results.tsx       events.detail-confirmed
  [id]/record.tsx        events.record-ready
  [id]/recording.tsx     events.recording (gestureEnabled false)
  [id]/outcomes/[step].tsx  events.step1|2|3
  [id]/cancel.tsx        formSheet  events.cancel | events.cancel-recurring
  [id]/archive.tsx       formSheet  events.archive | events.archive-recurring
app/(tabs)/more/
  inbox.tsx              inbox.respond | inbox.updates (param tab); empty bila kosong
  team/index.tsx         team.list; empty (member tanpa tim)
  team/[id].tsx          team.person
  archive/index.tsx      archive.list; empty bila kosong
  archive/[key]/delete.tsx  formSheet archive.delete (admin)
  users.tsx              users.approve | users.roles (param tab; admin)
  settings/index.tsx     settings.main
  settings/profile.tsx   settings.profile
```

Daftar Stack `more/_layout.tsx` Sesi A (`inbox, team, team/[id], archive, users, settings`) perlu ditambah `archive/[key]/delete` dan `settings/profile`. Tab bar: `settings.*`, `tasks/[id]/*`, `projects/[id]/edit|settings`, `events/[id]/*` tanpa bar (sesuai §2.6 Sesi A); `projects/[id]/index` dengan bar.

### 3.3 Guard role (Phase 1 = UI, tanpa server)

Prototipe menyembunyikan entri yang tidak boleh dibuka (`allowed(id, role)` dari `core/registry.js`). Port ke `src/navigation/screen-roles.ts` (fungsi murni `allowedScreen(id, role)`, wilayah W0):

| Hanya pm/admin | Hanya admin | Hanya member |
|---|---|---|
| `tasks.return`, `projects.new/form/story/draft/template/extend/edit/archive` | `users.*`, `archive.delete` | `events.empty`, `team.empty` (varian) |

Route yang dibuka role terlarang (deep link) → `<Redirect href="/" />`. Tes `roles.gating` diport.

## 4. Kit bersama (gelombang 0, satu sesi)

Dipakai oleh ≥ 2 modul. Port dari `src/kit/*` prototipe. Tiap berkas ≤ 150 baris, komponen di `src/components/<nama>/`.

| Berkas | Port dari | Isi |
|---|---|---|
| `screen/stacked-screen.tsx` | `kit/layout.jsx` (StackedScreen) | Judul besar 32 px + blok cari yang terlipat ke header saat scroll (Reanimated `useAnimatedScrollHandler`, `interpolate`); slot kanan (ikon filter dengan titik); `useTabBarInset()` di padding bawah |
| `screen/detail-header.tsx` | `kit/layout.jsx` | Header detail: chevron back (`headerBackButtonDisplayMode: 'minimal'`), judul, tombol ⋯ |
| `search/search-field.tsx` | `kit/form.jsx` (Search) | Input + ikon, tombol hapus, kosong saat blur bila tanpa isi |
| `filter/filter-sheet.tsx`, `filter/filter-field.tsx` | `kit/filter.jsx` | Kerangka "Filter & sort": judul, field Select/Radio, footer **Reset** / **Apply** |
| `sheet/sheet-frame.tsx` | `kit/sheet.jsx` | Isi formSheet: judul, sub, X kiri atas (label "Close"), slot aksi di bawah, `KeyboardAvoidingView` |
| `menu/action-menu.tsx` | `kit/menu.jsx` | ⋯ → gluestack `Menu`; item `danger` merah; label aksesibilitas ("Task actions", "Project actions", "Event actions") |
| `form/field.tsx`, `form/select-field.tsx`, `form/chips.tsx`, `form/seg.tsx`, `form/switch-row.tsx`, `form/date-field.tsx` | `kit/form.jsx`, `kit/controls.jsx` | Label + bintang wajib, hint, error; Seg = segmented control (gluestack belum punya; dibuat dari `Pressable` + `HStack`) |
| `list/rows.tsx`, `list/facts.tsx` | `kit/controls.jsx` | Baris bertingkat (lead, title, sub, chevron), daftar fakta label–nilai |
| `state/empty-state.tsx`, `state/no-match.tsx` | `kit/controls.jsx` | Ikon + judul + teks + tombol opsional (UX §4) |
| `snack/snack-host.tsx`, `snack/use-snack.ts` | `kit/form.jsx` (Snack) | Snack gelap (`--snack-bg`) dengan aksi violet (`--snack-action`), di atas tab bar (`useTabBarInset`), auto-hilang 10 detik, satu snack sekaligus; host dipasang sekali di `app/(tabs)/_layout.tsx` (minta Sesi A) |
| `avatar/avatar-stack.tsx` | `kit/controls.jsx` | Avatar bertumpuk + "+n" |
| `src/data/store.ts` | `*.store.js` | `createStore(initial)` → `{ get, set, subscribe, reset }` + `useStore(store, select)` via `useSyncExternalStore` |
| `src/navigation/screen-roles.ts` | `core/registry.js` | `allowedScreen(id, role)` |
| `src/data/archive.store.ts` | `sample.js` `archive` + `*.store.js` | Entri Archive bersama (ditulis store tasks/projects/events, dibaca W3): `addEntry`, `removeEntry`, `listEntries`, `reset` |
| `src/data/people.ts`, `src/data/sample/people.extra.ts` | `sample.js` `people[].email/role`, `D.person`, `D.me` | `person(keyOrName)`, `me(role)`, `ROLE_TAG`; email + peran akun (dipakai Tasks, Team, Users, Settings, Profile) |

Badge status memakai `src/components/status/status-pill.tsx` Sesi B yang sudah ada. Notifikasi pakai `use-notice.tsx` Sesi B (toast atas, 3000 ms) untuk semua "toast" prototipe.

## 5. Daftar install gabungan (dijalankan orchestrator, bukan worker)

Komponen gluestack v5 (`npx gluestack-ui@latest add <nama>`), di luar yang sudah ada (avatar, badge, box, button, card, center, divider, heading, hstack, icon, pressable, progress, text, toast, vstack):

| Komponen | Dipakai di |
|---|---|
| `input`, `textarea`, `form-control` | Semua form, cari, komentar |
| `checkbox` | Tick All tasks, consent rekaman, "Also create a replacement event", Steps |
| `radio` | Sort by, Cancel reason, recurring "Which one?" |
| `switch` | Needs review, notifikasi, Show me as online, Project settings |
| `select` + `actionsheet` | Project/Type/Phase/Date/Time/Role; Select gluestack membuka Actionsheet, jadi keduanya dipasang |
| `menu` | ⋯ aksi |
| `alert-dialog` | Dialog T2/T3 (§2) |
| `spinner` | Tombol loading |
| `link` | "Help · Privacy Policy", tautan teks |
| `portal` | Menu radial Kanban di atas tab bar tanpa jendela native baru (RN `Modal` membatalkan sentuhan yang sedang ditahan) — verifikasi saat `add` bahwa host Portal ada di dalam `GestureHandlerRootView` |
| `skeleton` (opsional) | Belum ada di prototipe; tidak wajib |

Tidak dipakai: `tabs` (alpha; tab Inbox/Project/Users dibuat dengan Seg kit), `calendar` (alpha; grid kalender dibuat sendiri seperti web), `bottomsheet` (diganti formSheet native; `actionsheet` hanya sebagai isi Select), `modal` (diganti route modal).

Paket Expo (`npx expo install`, versi dari `bundledNativeModules` SDK 58):

| Paket | Versi SDK 58 | Untuk | Wajib? |
|---|---|---|---|
| `expo-clipboard` | ~58.0.4 | "Copy email" di profile.me | Ya |
| `@react-native-community/datetimepicker` | 9.2.1 | Due date, Start date, leave From/To | Ya, kecuali gluestack `date-time-picker` (alpha) dipilih — cek dependensi manualnya saat `add` |
| `react-native-keyboard-controller` | 1.22.7 | Form panjang (task form, event form, comment foot) | Opsional; coba `KeyboardAvoidingView` + `automaticallyAdjustKeyboardInsets` dulu (§7) |
| `react-native-pager-view` | 9.0.7 | Pager pekan profile.calendar | Tidak; pan Reanimated cukup (lihat `phase1-screens.more.md`) |

Reanimated 4.7.1, Worklets 0.13, RNGH 3.3, react-native-screens 4.30, lucide sudah terpasang.

## 6. Urutan porting dan pembagian sesi

| Gelombang | Sesi | Wilayah (file yang boleh disentuh) | Selesai bila |
|---|---|---|---|
| G0 | **W0 Kit** | `src/components/{screen,search,filter,sheet,menu,form,list,state,snack,avatar}/**`, `src/data/{store,archive.store,people}.ts`, `src/data/sample/people.extra.ts`, `src/navigation/screen-roles.ts`, `__tests__/kit/**` | Komponen + tes; contoh pemakaian di tes |
| G1 | **W1 Tasks** | `app/(tabs)/tasks/**`, `app/tasks/**`, `src/screens/tasks/**`, `src/data/tasks*.ts`, `src/data/sample/tasks.*.ts` (baru), `__tests__/tasks/**` | Doc tasks §Tes lulus; ekspor `TaskList`, `TaskBoard` siap dipakai Projects |
| G1 | **W2 Events** | `app/(tabs)/events/**`, `app/events/**`, `src/screens/events/**`, `src/data/events*.ts`, `src/data/sample/events.*.ts` (baru), `__tests__/events/**` | Doc events §Tes lulus |
| G1 | **W3 More + Auth + Profile** | `app/(tabs)/more/{inbox,team,archive,users,settings}**`, `app/(auth)/**`, `app/leave.tsx`, `app/profile/**`, `src/screens/{inbox,team,users,archive,settings,auth,profile}/**`, `src/data/{inbox,team,users,settings,profile,auth}*.ts` + `src/data/archive.ts` (bukan `archive.store.ts` milik W0), `src/data/sample/{inbox.extra,team,users,archive,auth}.ts` (baru), `__tests__/{inbox,team,users,archive,settings,auth,profile}/**` | Doc more §Tes lulus |
| G2 | **W4 Projects** | `app/(tabs)/projects/**`, `app/projects/**`, `src/screens/projects/**`, `src/data/projects*.ts`, `src/data/sample/projects.*.ts` (baru), `__tests__/projects/**` | Doc projects §Tes lulus |

- W4 boleh mulai di G1 untuk list/create/overview/phases/members; tab **Tasks** proyek dan `projects/[id]/settings` menunggu ekspor `TaskBoard`/`TasksSearchField`/`TasksFilterPanel`/`TasksSettings` dari W1 (kontrak di `phase1-screens.tasks.md` §9).
- Archive (W3) membaca entri dari `archive.store.ts` (W0). Store W1/W2/W4 menulis entri saat arsip dan menghapusnya saat Undo. Tombol Restore di Archive hanya notice di Phase 1 (§2).
- Snack Undo setelah arsip dipanggil oleh W1/W2/W4 lewat `useSnack()` W0.
- Placeholder T5 (`src/screens/{tasks,projects,events,more}/*.screen.tsx`) diganti oleh pemilik modul; `more.screen.tsx` + panel More tetap wilayah Sesi A.
- Berkas bersama yang tidak dimiliki worker mana pun (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `*/_layout.tsx` Stack tab, `package.json`, `src/data/sample/*.ts` Sesi B) diubah hanya oleh orchestrator/Sesi A atas permintaan worker.
- Stack `_layout.tsx` per tab dibuat Sesi A (F1a); worker hanya menambah screen options lewat `<Stack.Screen options>` di file layarnya sendiri, atau meminta Sesi A mendaftarkan presentasi formSheet/modal.

## 7. Risiko RN lintas modul

| Risiko | Mitigasi |
|---|---|
| Keyboard menutupi form panjang dan comment foot | `ScrollView` dengan `automaticallyAdjustKeyboardInsets` (iOS) + `KeyboardAvoidingView behavior="padding"` di sheet; bila Android tetap bermasalah di QA → `react-native-keyboard-controller` (`KeyboardAwareScrollView`, `KeyboardStickyView` untuk comment foot) |
| Tab bar menutupi konten | Semua list pakai `useTabBarInset()` Sesi A; snack di atas inset |
| formSheet `fitToContents` + konten scroll (filter panjang) | Filter memakai detents `[0.6, 1]` bila tinggi > layar; dites di perangkat kecil (iPhone SE) |
| Gesture radial vs scroll horizontal papan vs scroll vertikal kolom | Lihat `phase1-screens.tasks.md` §6 (Pan `activateAfterLongPress: 350`, fail di luar slop) |
| Kalender: kinerja grid dan swipe pekan | Grid sebagai `View` statis (≤ 42 sel), dihitung murni di `*.dates.ts`; swipe dengan Pan + Reanimated |
| Daftar panjang | Data Phase 1 kecil (≤ 20 item); `FlatList`/`SectionList` cukup. `@shopify/flash-list` baru dipertimbangkan bila data API besar |
| Reduce motion | `useReducedMotion()` Reanimated: radial tanpa scale/stagger, stack tanpa terbang, header lipat tanpa animasi |
| Expo Go | Semua paket di atas ada di Expo Go SDK 58 (bundledNativeModules); tidak perlu dev build |

## 8. Tes lintas modul

- Jest-expo + RNTL; route dengan `renderRouter` dari `expo-router/testing-library`; gesture dengan `fireGestureHandler`/`getByGestureTestId` dari `react-native-gesture-handler/jest-utils`; animasi dengan timer Reanimated.
- Port tes prototipe (`src/test/*.test.jsx`) per modul; daftar ada di tiap doc modul. Tes lintas modul:
  - `roles.gating` → `__tests__/navigation/screen-roles.test.ts` (W0): tiap id + role.
  - `items.open` → tiap modul: menekan kartu membuka route detail yang benar.
  - `modal` → tiap modal: chevron "Cancel" menutup, swipe-down didukung (opsi `gestureEnabled`).
  - Snack: arsip → list sumber → "Undo" → item kembali + notice "… restored" (tasks, projects, events).
- Unit murni wajib untuk semua `*.query.ts`, `*.store.ts`, `*.dates.ts` (tanpa render).
- QA perangkat (orchestrator/user): Expo Go iOS + Android, VoiceOver/TalkBack untuk radial (aksi aksesibilitas), kalender, dan sheet.

## 9. Pertanyaan terbuka

1. Kepemilikan `src/data/sample/*.ts` setelah Home selesai: tetap Sesi B (extras di file baru, rekomendasi) atau pindah ke worker modul?
2. Date picker: `@react-native-community/datetimepicker` (rekomendasi, stabil) atau gluestack `date-time-picker` (alpha)?
