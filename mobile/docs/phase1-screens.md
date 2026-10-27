# Phase 1 — Spesifikasi porting layar (di luar Home, tab bar, panel More, sheet Create)

Status: diimplementasikan di Fase 1 (2026-10-25). Penyimpangan dari prototipe dan log: reacttransition.md §1 dan §8.

Ditulis sebagai draf D1 (Sesi D), 2026-10-25. Pelengkap `phase1-navigation.md` (Sesi A) dan pola data Home (Sesi B).
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
| K3 | Sheet prototipe (`sheet(...)` di `index.js`) = route ber-konstanta `SHEET` (`src/navigation/stack-presentation.ts`), sama dengan sheet Create: di iOS route `transparentModal` dan `SheetFrame` menggambar panel sendiri (`OwnSheet`), di Android formSheet native (`fitToContents`, grabber, radius 16) | formSheet iOS 26+ melayang ±8 pt dari tepi tanpa opsi mematikan; panel sendiri tetap edge-to-edge seperti prototipe. Swipe-down, dim, dan escape aksesibilitas tetap ada; satu pola untuk semua sheet (`phase1-navigation.md` §4.5) |
| K4 | Panel filter ("Filter & sort") = route `SHEET`; **query disimpan di store modul per scope**, bukan dioper lewat param | `router.dismissTo(href)` belum terbukti meneruskan param (types SDK 58: "If the href is not found, it will instead replace the current screen"). Store menghindari ketidakpastian itu dan mudah dites |
| K5 | `archive.undo` bukan layar: arsipkan → kembali ke list sumber (`router.dismissTo('/tasks')` dst.) → snack "X moved to Archive" + "Undo" dari host snack global | Prototipe merender list sumber + Snack; cocok dengan aturan T1 project (aksi langsung + Urungkan) |
| K6 | State in-memory per modul (`src/data/<modul>.store.ts`, `useSyncExternalStore`, `reset<Modul>()` untuk tes); tiap layar membaca lewat satu `get<Modul>…()` di `src/data/<modul>.ts` | Port 1:1 `*.store.js` prototipe; titik tukar ke API Phase 2 seperti `getHome` Sesi B |
| K7 | Berkas sampel bersama (`src/data/sample/*.ts` buatan Sesi B) setelah Home selesai **dimiliki W0**, dan hanya W0 yang mengubahnya. W1–W4 menaruh field tambahan (detail tugas, health proyek, agenda event, dll.) di berkas sendiri `src/data/sample/<modul>.extra.ts` (modul tanpa sampel Sesi B: `src/data/sample/<modul>.ts`), lalu menggabungkannya di `src/data/<modul>.ts`. Perubahan berkas bersama diminta ke W0 lewat orchestrator | Ditetapkan orchestrator 2026-10-25; satu pemilik mencegah bentrok antar worker |
| K8 | Copy diport **verbatim** dari file sumber ke `src/screens/<modul>/<modul>.strings.ts` (pola `home.strings.ts`). Dokumen ini hanya mengutip copy penting; file sumber tetap acuan | Menghindari salah ketik ganda; tes mencocokkan string penting |
| K9 | Haptic `navigator.vibrate` di prototipe (radial, tab bar) **tidak** diport | Keputusan `reacttransition.md`: tanpa `expo-haptics` |
| K10 | Rekaman suara, foto catatan, unggah/salin CSV, "Speak · coming soon" tetap **toast** seperti prototipe; tanpa `expo-audio`/`expo-image-picker`/`expo-document-picker` di Phase 1 | Prototipe tidak punya perilaku nyata di sana |
| K11 | "Hari ini" = `TODAY` (`2026-10-07`) dan "sekarang" = 9:41 dari `src/data/sample/today.ts` + konstanta baru; tidak pakai jam perangkat | Sama dengan prototipe dan aturan project ("Hari ini ditentukan server") |
| K12 | Role diterima sebagai prop dari `SESSION_ROLE` (`src/data/session.ts`); tes merender ketiga role | Pola Sesi B |

## 2. Keputusan orchestrator (2026-10-25, dicatat di `reacttransition.md` §1)

Aturan UX project (`CLAUDE.md` UX §1) **mengalahkan** prototipe untuk aksi destruktif. Pakai kit `ConfirmDialog` (gluestack `AlertDialog` dalam modal native, `useRNModal`, agar tampil di atas sheet/modal):

| Tempat | Prototipe | Ditetapkan |
|---|---|---|
| Sign out (`settings.main`, `profile.me`, `auth.pending`) | Langsung ke login | **T2** AlertDialog "Sign out?" / "You'll be signed out of this account." / Cancel · Sign out |
| Archive "Delete forever" (`archive.delete`) | Sheet konfirmasi saja | **T3** di dalam sheet itu sendiri (bukan dialog di atas sheet): `TypeToConfirm` "Type the item name to confirm"; tombol disabled sampai cocok |
| Remove member (`projects.members`) | Toast saja | **T2** AlertDialog sebelum notice |
| Users: Approve / Reject / Deactivate / ubah role (`users.*`), ubah role anggota proyek | Toast saja | **T2** AlertDialog per aksi; copy menyebut nama + role tujuan. Reject meminta alasan dulu |
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
| `app/(auth)/_layout.tsx` + `login`, `account`, `pending`, `denied` | Grup `NO_SWIPE` di root; Stack `headerShown: false`, `gestureEnabled: false` di login | `auth.*` |
| `app/tasks/new/_layout.tsx` (`index`, `form`) | modal; `index` ↔ `form` saling `router.replace` | `tasks.write`, `tasks.form` |
| `app/tasks/csv.tsx` | modal | `tasks.csv` (dibuka dari Create sheet, bukan dari tab) |
| `app/projects/new/_layout.tsx` (`index`, `form`, `story`, `draft`, `template`) | modal; langkah berikutnya push di Stack modal | `projects.new/form/story/draft/template` |
| `app/events/new.tsx` (param `event?`, `details?`) | modal | `events.new`, `events.new-details` |
| `app/leave.tsx` | SHEET | `settings.leave` (dibuka dari Create dan Settings) |
| `app/profile/_layout.tsx` (`index`, `calendar`) | modal; `calendar` push di dalamnya | `profile.me`, `profile.calendar` |

Catatan: `/tasks/new` (statis, root) dan `/(tabs)/tasks/[id]` sama-sama cocok dengan `/tasks/new`; Expo Router memilih rute statis. Id tugas selalu angka, jadi aman. Dijaga tes `renderRouter`: `/tasks/new` membuka modal (`__tests__/tasks/tasks.screen.form.test.tsx`), `/tasks/12` membuka detail (tes `__tests__/tasks/`).

### 3.2 Per tab

```
app/(tabs)/tasks/
  index.tsx              tasks.my | tasks.all | tasks.board (param scope=mine|all, view=list|board); empty bila kosong
  filter.tsx             SHEET      tasks.filter (param scope)
  [id]/index.tsx         tasks.detail-todo|progress|review (dipilih dari status)
  [id]/edit.tsx          tasks.edit (push, tanpa tab bar)
  [id]/return.tsx        SHEET      tasks.return (pm/admin)
  [id]/cancel.tsx        SHEET      tasks.cancel
app/(tabs)/projects/
  index.tsx              projects.list (param who?)
  filter.tsx             SHEET      projects.filter
  [id]/index.tsx         projects.overview|tasks|phases|members (param tab, view untuk board)
  [id]/edit.tsx          projects.edit
  [id]/settings.tsx      tasks.settings ("Project settings")
  [id]/extend.tsx        SHEET      projects.extend
  [id]/archive.tsx       SHEET      projects.archive
  [id]/task-filter.tsx   SHEET      tasks.filter (scope project:<id>, Assignee)
app/(tabs)/events/
  index.tsx              events.list | events.calendar (param view=list|calendar); empty bila kosong
  filter.tsx             SHEET      events.filter (param view)
  [id]/index.tsx         events.detail-upcoming|recurring (dari event.repeat)
  [id]/results.tsx       events.detail-confirmed
  [id]/record.tsx        events.record-ready
  [id]/recording.tsx     events.recording (gestureEnabled false)
  [id]/outcomes/[step].tsx  events.step1|2|3
  [id]/cancel.tsx        SHEET      events.cancel | events.cancel-recurring
  [id]/archive.tsx       SHEET      events.archive | events.archive-recurring
app/(tabs)/more/
  index.tsx              <Redirect href="/" /> (More tanpa layar; tab-nya membuka panel)
  inbox.tsx              inbox.respond | inbox.updates (param tab); empty bila kosong
  team/index.tsx         team.list; empty (member tanpa tim)
  team/[id].tsx          team.person
  archive/index.tsx      archive.list; empty bila kosong
  archive/[key]/delete.tsx  SHEET     archive.delete (admin)
  users.tsx              users.approve | users.roles (param tab; admin)
  settings/index.tsx     settings.main
  settings/profile.tsx   settings.profile
```

Semua route di atas terdaftar di `_layout.tsx` Stack masing-masing tab; sheet memakai `SHEET`, `recording` memakai `NO_SWIPE`. Tab bar (`tabBarVisibleFor`, `phase1-navigation.md` §4.1): `settings.*`, `tasks/[id]/*`, `projects/[id]/edit|settings`, `events/[id]/*` tanpa bar; `projects/[id]/index`, `more/inbox|team|team/[id]|archive|users` dengan bar; sheet di atas layar ber-bar (`*/filter`, `projects/[id]/extend|archive|task-filter`, `more/archive/[key]/delete`) tetap menggambar bar di bawahnya.

### 3.3 Guard role (Phase 1 = UI, tanpa server)

Prototipe menyembunyikan entri yang tidak boleh dibuka (`allowed(id, role)` dari `core/registry.js`). Port ke `src/navigation/screen-roles.ts` (`SCREEN_IDS` 71 id, `ScreenId`, fungsi murni `allowedScreen(id, role)`; id tak dikenal selalu ditolak):

| Hanya pm/admin | Hanya admin | Hanya member |
|---|---|---|
| `tasks.return`, `projects.new/form/story/draft/template/extend/edit/archive` | `users.*`, `archive.delete` | `events.empty`, `team.empty` (varian) |

Route yang dibuka role terlarang (deep link) → `<Redirect href="/" />` di komponen layarnya (mis. `users.screen.tsx`, `projects/new/*`, `projects/sheets/*`, `tasks/sheets/return.screen.tsx`, `archive/delete.screen.tsx`). Tes `roles.gating` diport.

## 4. Kit bersama (gelombang 0, satu sesi)

Dipakai oleh ≥ 2 modul. Port dari `src/kit/*` prototipe. Tiap berkas ≤ 150 baris, komponen di `src/components/<nama>/`.

| Berkas | Port dari | Isi (ekspor) |
|---|---|---|
| `screen/stacked-screen.tsx`, `stacked-pinned.tsx`, `use-search-collapse.ts`, `stacked-context.ts` | `kit/layout.jsx` (StackedScreen), `kit/stacked.collapse.js` | `StackedScreen`: judul besar + blok cari yang terlipat ke header saat scroll (UI thread), slot kanan, baris pinned yang memadat (`pinnedShrink`, `StackedPinned`, `usePinnedProgress`); `useTabBarInset()` di padding bawah |
| `screen/detail-header.tsx`, `screen/detail-page.tsx` | `kit/layout.jsx` | `DetailHeader`: header sendiri dengan chevron berlabel "Back" (atau "Cancel" di modal), judul, slot kanan; `DetailPage` (header + scroll + footer, jauh dari keyboard dan tab bar), `SectionCard` |
| `search/search-field.tsx` | `kit/form.jsx` (Search) | `SearchField`: input + ikon, tombol hapus; dikosongkan saat blur kecuali `keep` |
| `filter/filter-sheet.tsx`, `filter-field.tsx`, `filter-button.tsx` | `kit/filter.jsx`, SearchFilter | `FilterSheet` "Filter & sort" (footer **Reset** / **Apply**), `FilterField`, `FilterButton` (titik saat filter aktif), `SearchFilter` |
| `sheet/sheet-frame.tsx` | `kit/sheet.jsx` | `SheetFrame`: isi sheet, judul, sub, X kiri atas ("Close"), slot aksi di bawah. iOS: `OwnSheet` (dim + panel edge-to-edge, seret untuk tutup, naik di atas keyboard); Android: `NativeSheetBody` (ScrollView root dengan inset keyboard) |
| `menu/action-menu.tsx` | `kit/menu.jsx` | `ActionMenu`: ⋯ → gluestack `Menu`; item `danger` merah; label aksesibilitas ("Task actions", dst.) |
| `form/field.tsx`, `select-field.tsx`, `seg.tsx`, `chips.tsx`, `radio-list.tsx`, `switch-row.tsx`, `date-field.tsx`, `section-label.tsx`, `form-error.tsx`, `field-name.ts` | `kit/form.jsx`, `kit/controls.jsx` | `Field`, `SelectField`, `Seg` (dari `Pressable` + `HStack`; gluestack tidak punya), `Chips`/`MultiChips`/`CountChips`, `RadioList`, `SwitchRow`, `DateField` (datetimepicker, ISO UTC), `SectionLabel`, `FormError`, `fieldName` |
| `confirm/confirm-dialog.tsx`, `type-to-confirm.tsx`, `use-confirm-action.ts` | — (UX §1) | `ConfirmDialog` T2/T3 (loading + error), `TypeToConfirm`/`nameMatches`, `useConfirmAction` (dipakai juga sheet Delete forever) |
| `list/rows.tsx`, `list/facts.tsx` | `kit/controls.jsx` | `Rows`/`Row` (lead, title, sub, chevron), `Facts` label–nilai |
| `state/empty-state.tsx`, `state/no-match.tsx` | `kit/controls.jsx` | `EmptyState` (ikon + judul + teks + tombol opsional, UX §4), `NoMatch` + "Reset filters" |
| `snack/snack-host.tsx`, `snack/use-snack.ts` | `kit/form.jsx` (Snack) | Snack gelap dengan aksi violet, di atas tab bar (`useTabBarInset`), hilang sendiri setelah `SNACK_MS` 10 detik, satu snack sekaligus; `showSnack`/`hideSnack`/`useSnack`/`resetSnack`. `SnackHost` dipasang sekali di `app/(tabs)/_layout.tsx` |
| `avatar/avatar-stack.tsx`, `avatar/person-avatar.tsx` | `kit/controls.jsx` | `AvatarStack` (bertumpuk + "+n"), `PersonAvatar` (inisial, dekoratif) |
| `a11y/spoken.ts` | — | `spoken(...parts)`: satu nama aksesibilitas untuk kartu/baris berisi beberapa fakta |
| `notice/use-notice.tsx` | — (Sesi B) | `useNotice()`: toast atas, 3000 ms, untuk semua "toast" prototipe |
| `src/data/store.ts` | `*.store.js` | `createStore(initial)` → `{ get, set, subscribe, reset }` + `useStore(store, select?)` via `useSyncExternalStore` |
| `src/navigation/screen-roles.ts` | `core/registry.js` | `allowedScreen(id, role)` (§3.3) |
| `src/data/archive.store.ts` | `sample.js` `archive` + `*.store.js` | Entri Archive bersama (ditulis store tasks/projects/events, dibaca W3): `entryKey`, `addEntry`, `removeEntry`, `listEntries`, `findEntry`, `useArchiveEntries`, `resetArchive` |
| `src/data/people.ts`, `src/data/sample/people.extra.ts` | `sample.js` `people[].email/role`, `D.person`, `D.me` | `person(keyOrName)`, `me(role)`, `listPeople()`, `ROLE_TAG`, `ROLE_LABEL`; email + peran akun |
| `src/theme/tokens.ts` `MIN_TARGET` | — | Area sentuh minimum 44 pt |

Badge status memakai `src/components/status/status-pill.tsx` Sesi B.

### 4.1 Aturan kit (kontrak untuk layar)

- **Nama aksesibilitas input:** beri nama input gluestack dengan `aria-label` (Input/Textarea/RadioGroup menimpa `accessibilityLabel`). `Field` dan `SelectField` sudah melakukannya.
- **Wajib:** `required` membuat nama "<label>, required" (`fieldName`); bintang dan label terlihat disembunyikan dari screen reader agar tidak terbaca dua kali.
- **`Field`:** `hint`, `error` (di bawah field, live region, menandai invalid), `onBlur` (form menampilkan error "required" setelah field disentuh), `readOnly` (kotak muted dan tetap terbaca; jangan pakai `disabled` untuk nilai baca-saja karena gluestack menyembunyikan input disabled dari screen reader), `disabled`, `multiline`, `right`.
- **`SelectField`:** `label` = nama aksesibilitas (label terlihat lewat `SectionLabel`), `required`, `error` (border merah; pesan dibaca sebagai hint, form menampilkan pesannya sendiri), `hint` (dibaca setelah error, juga saat disabled: alasan nilai tidak bisa diubah). Opsi dibuka di modal native (`useRNModal`).
- **`Seg`:** `kind` `'tabs'` (default, ganti isi layar; `tablist`/`tab` + selected) atau `'radio'` (pilihan form/tampilan; `radiogroup`/`radio` + checked), supaya satu layar tidak punya dua tablist; `label` = nama baris; `lines` 1 | 2 (label boleh 2 baris, mis. Inbox); `names` = nama yang dibacakan per segmen (diabaikan bila panjangnya beda); `icons`.
- **`FormError`:** error di bawah sekelompok kontrol yang tidak dijangkau error `Field` (rentang waktu, picker); live region di Android, `announceForAccessibility` di iOS.
- **`spoken()`:** kartu/baris yang menampilkan beberapa fakta memakai satu nama gabungan di elemen yang bisa ditekan, dan bagian-bagiannya dikeluarkan dari urutan baca.
- **`MIN_TARGET` (44 pt):** target sentuh buatan sendiri yang digambar lebih kecil mencapai 44 pt lewat `hitSlop`, tampilan tetap. Button kit sudah `min-h-11`; Field/Select juga `min-h-11`. Seg digambar 32 pt (`min-h-8`, setara segmented control iOS) dan mencapai 44 pt lewat `hitSlop` 6 pt atas-bawah.
- **Kaca:** hanya permukaan tab bar (pil, panel, FAB) yang memakai `GlassSurface` (`phase1-navigation.md` §4.3); layar tidak memakai `GlassView`.
- **`useTabBarInset()`:** semua layar ber-bar dan `SnackHost` memakai padding bawah ini (`DetailPage`/`StackedScreen` sudah).

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
| `skeleton` (opsional) | Belum ada di prototipe; tidak dipasang |

Semua yang wajib terpasang di G0b, ditambah `@legendapp/motion` (dipakai actionsheet/select). Overlay `portal` gluestack berada di belakang route sheet/modal native iOS (layar modal yang terpisah), jadi `ConfirmDialog` dan `SelectField` memakai `useRNModal`; `Portal` dipakai menu radial Kanban.

Tidak dipakai: `tabs` (alpha; tab Inbox/Project/Users dibuat dengan Seg kit), `calendar` (alpha; grid kalender dibuat sendiri seperti web), `bottomsheet` (diganti `SHEET`: panel sendiri di iOS, formSheet native di Android; `actionsheet` hanya sebagai isi Select), `modal` (diganti route modal).

Paket Expo (`npx expo install`, versi dari `bundledNativeModules` SDK 58):

| Paket | Versi SDK 58 | Untuk | Wajib? |
|---|---|---|---|
| `expo-clipboard` | ~58.0.4 | "Copy email" di profile.me | Ya |
| `@react-native-community/datetimepicker` | 9.2.1 (versi bundel SDK 58; cek dengan `npx expo install --check`) | Due date, Start date, leave From/To (`form/date-field.tsx` W0) | Ya. gluestack `date-time-picker` **tidak** dipakai (alpha tidak dipakai di stack ini) |
| `react-native-keyboard-controller` | 1.22.7 | Form panjang (task form, event form, comment foot) | Opsional, **belum dipasang**: `DetailPage`/`SheetFrame` memakai `KeyboardAvoidingView` + `automaticallyAdjustKeyboardInsets` (§7) |
| `react-native-pager-view` | 9.0.7 | Pager pekan profile.calendar | Tidak dipasang; pan Reanimated cukup (lihat `phase1-screens.more.md`) |

Reanimated 4.7.1, Worklets 0.13, RNGH 3.3, react-native-screens 4.30, lucide sudah terpasang.

## 6. Urutan porting dan pembagian sesi

| Gelombang | Sesi | Wilayah (file yang boleh disentuh) | Selesai bila |
|---|---|---|---|
| G0 | **W0 Kit** | `src/components/{screen,search,filter,sheet,menu,form,list,state,snack,avatar}/**`, `src/data/{store,archive.store,people}.ts`, `src/data/sample/*.ts` bersama (Sesi B, setelah Home selesai) + `src/data/sample/people.extra.ts`, `src/navigation/screen-roles.ts`, `__tests__/kit/**` | Komponen + tes; contoh pemakaian di tes |
| G1 | **W1 Tasks** | `app/(tabs)/tasks/**`, `app/tasks/**`, `src/screens/tasks/**`, `src/data/tasks*.ts`, `src/data/sample/tasks.*.ts` (baru), `__tests__/tasks/**` | Doc tasks §Tes lulus; ekspor `TaskList`, `TaskBoard` siap dipakai Projects |
| G1 | **W2 Events** | `app/(tabs)/events/**`, `app/events/**`, `src/screens/events/**`, `src/data/events*.ts`, `src/data/sample/events.*.ts` (baru), `__tests__/events/**` | Doc events §Tes lulus |
| G1 | **W3 More + Auth + Profile** | `app/(tabs)/more/{inbox,team,archive,users,settings}**`, `app/(auth)/**`, `app/leave.tsx`, `app/profile/**`, `src/screens/{inbox,team,users,archive,settings,auth,profile}/**`, `src/data/{inbox,team,users,settings,profile,auth}*.ts` + `src/data/archive.ts` (bukan `archive.store.ts` milik W0), `src/data/sample/{inbox.extra,team,users,archive,auth}.ts` (baru), `__tests__/{inbox,team,users,archive,settings,auth,profile}/**` | Doc more §Tes lulus |
| G2 | **W4 Projects** | `app/(tabs)/projects/**`, `app/projects/**`, `src/screens/projects/**`, `src/data/projects*.ts`, `src/data/sample/projects.*.ts` (baru), `__tests__/projects/**` | Doc projects §Tes lulus |

- W4 boleh mulai di G1 untuk list/create/overview/phases/members; tab **Tasks** proyek dan `projects/[id]/settings` menunggu ekspor `TaskBoard`/`TasksSearchField`/`TasksFilterPanel`/`TasksSettings` dari W1 (kontrak di `phase1-screens.tasks.md` §9).
- Archive (W3) membaca entri dari `archive.store.ts` (W0). Store W1/W2/W4 menulis entri saat arsip dan menghapusnya saat Undo. Tombol Restore di Archive hanya notice di Phase 1 (§2).
- Snack Undo setelah arsip dipanggil oleh W1/W2/W4 lewat `useSnack()` W0.
- Placeholder T5 (`src/screens/{tasks,projects,events,more}/*.screen.tsx`) sudah diganti oleh pemilik modul. More tidak punya layar (`more/index` redirect ke `/`); panel More = `src/screens/more/more-panel.tsx` (Sesi A).
- Semua gelombang selesai. Pemilik sebenarnya per task (mis. W3 dikerjakan Sesi B, W4 Sesi C) dan commit-nya: `reacttransition.md` §6b.
- Berkas bersama yang tidak dimiliki worker mana pun (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `*/_layout.tsx` Stack tab, `package.json`) diubah hanya oleh orchestrator/Sesi A atas permintaan worker. Berkas sampel bersama `src/data/sample/*.ts` hanya diubah W0; worker lain mengajukan perubahan lewat orchestrator.
- Stack `_layout.tsx` per tab dibuat Sesi A (F1a) dan mendaftarkan presentasi semua route secara terpusat dengan `SHEET`/`MODAL`/`NO_SWIPE` dari `src/navigation/stack-presentation.ts`.

## 7. Risiko RN lintas modul

| Risiko | Mitigasi |
|---|---|
| Keyboard menutupi form panjang dan comment foot | `ScrollView` dengan `automaticallyAdjustKeyboardInsets` (iOS) + `KeyboardAvoidingView behavior="padding"` di sheet; bila Android tetap bermasalah di QA → `react-native-keyboard-controller` (`KeyboardAwareScrollView`, `KeyboardStickyView` untuk comment foot) |
| Tab bar menutupi konten | Semua layar ber-bar pakai `useTabBarInset()`; snack di atas inset; bar sembunyi saat keyboard terbuka |
| Sheet setinggi isi + konten scroll (filter panjang) | Semua sheet memakai `SHEET` dengan `ScrollView` di `SheetFrame`: di iOS panel tumbuh sesuai isi sampai di bawah status bar (`maxHeight`, header tetap, isi bergulir), di Android formSheet `fitToContents`; detents `[0.6, 1]` tidak dipakai. Tinggi sheet dicek di HP 375 pt (`docs/phase1-device-qa.md`) |
| Gesture radial vs scroll horizontal papan vs scroll vertikal kolom | Lihat `phase1-screens.tasks.md` §6 (Pan `activateAfterLongPress: 350`, fail di luar slop) |
| Kalender: kinerja grid dan swipe pekan | Grid sebagai `View` statis (≤ 42 sel), dihitung murni di `*.dates.ts`; swipe dengan Pan + Reanimated |
| Daftar panjang | Data Phase 1 kecil (≤ 20 item); `FlatList`/`SectionList` cukup. `@shopify/flash-list` baru dipertimbangkan bila data API besar |
| Reduce motion | `useReducedMotion()` Reanimated: radial tanpa scale/stagger, stack tanpa terbang, header lipat tanpa animasi |
| Expo Go | Semua paket di atas ada di Expo Go SDK 58 (bundledNativeModules); tidak perlu dev build |

## 8. Tes lintas modul

- Jest-expo + RNTL; route dengan `renderRouter` dari `expo-router/testing-library` (helper `__tests__/helpers/*-router.tsx`, `router-mock.tsx`); gesture dengan `createGestureController` dari `react-native-gesture-handler/jest-utils`; animasi dengan timer Reanimated.
- Mitigasi sementara tes flaky (`maxWorkers: '50%'`, `testTimeout` 15 s, `asyncUtilTimeout` 3 s; `phase1-navigation.md` §6.5). Suite penuh hanya dijalankan orkestrator; sesi menjalankan foldernya sendiri dengan `--maxWorkers=2`.
- Port tes prototipe (`src/test/*.test.jsx`) per modul; daftar ada di tiap doc modul. Tes lintas modul:
  - `roles.gating` → `__tests__/navigation/screen-roles.test.ts` (W0): tiap id + role.
  - `items.open` → tiap modul: menekan kartu membuka route detail yang benar.
  - `modal` → tiap modal: chevron "Cancel" menutup, swipe-down didukung (opsi `gestureEnabled`).
  - Snack: arsip → list sumber → "Undo" → item kembali + notice "… restored" (tasks, projects, events).
- Unit murni wajib untuk semua `*.query.ts`, `*.store.ts`, `*.dates.ts` (tanpa render).
- QA perangkat (orchestrator/user): Expo Go iOS + Android, VoiceOver/TalkBack untuk radial (aksi aksesibilitas), kalender, dan sheet.

## 9. Keputusan tambahan (orchestrator 2026-10-25)

1. **Berkas sampel bersama `src/data/sample/*.ts`** dimiliki W0 setelah Home selesai, dan hanya W0 yang mengubahnya. W1–W4 menambah field di `src/data/sample/<modul>.extra.ts` milik sendiri; perubahan berkas bersama diminta ke W0 lewat orchestrator (K7).
2. **Date picker = `@react-native-community/datetimepicker`** versi bundel SDK 58 (cek dengan `npx expo install --check`). gluestack `date-time-picker` tidak dipakai karena alpha tidak dipakai di stack ini.

Tidak ada pertanyaan terbuka lagi dari dokumen ini.
