# Phase 1 — Tasks (W1)

Bagian dari `phase1-screens.md`. Sumber: `riset-keano/prototype-react/src/screens/tasks/*` (21 berkas), `src/data/sample.js` (`tasks`, `taskDetail`, `quickWrite`, `csv`), tes `tasks.list`, `tasks.filter`, `tasks.board.move`, `tasks.board.select`, `tasks.detail.actions`, `tasks.edit`, `tasks.form`, `items.open`, `atlas.rules`.

## 1. Id → route

| Id prototipe | Route | Presentasi | Tab bar |
|---|---|---|---|
| `tasks.my`, `tasks.all`, `tasks.board`, `tasks.empty` | `app/(tabs)/tasks/index.tsx` — param `scope=mine\|all` (default `mine`), `view=list\|board` (default `list`) | root tab | ya |
| `tasks.filter` | `app/(tabs)/tasks/filter.tsx` — param `scope` | formSheet | — |
| `tasks.detail-todo`, `-progress`, `-review` | `app/(tabs)/tasks/[id]/index.tsx` | push | tidak |
| `tasks.edit` | `app/(tabs)/tasks/[id]/edit.tsx` | push | tidak |
| `tasks.return` (pm/admin) | `app/(tabs)/tasks/[id]/return.tsx` | formSheet | — |
| `tasks.cancel` | `app/(tabs)/tasks/[id]/cancel.tsx` | formSheet | — |
| `tasks.write` | `app/tasks/new/index.tsx` | modal (root) | — |
| `tasks.form` | `app/tasks/new/form.tsx` — param `project?` | modal; Seg "Just write ✦ / Fill form" = `router.replace` antar keduanya | — |
| `tasks.csv` | `app/tasks/csv.tsx` | modal (root) | — |
| `tasks.settings` | `app/(tabs)/projects/[id]/settings.tsx` (route milik W4, layar milik W1) | push | tidak |

- Ganti Seg My/All atau List/Kanban = `router.setParams({ scope, view })` (tanpa push). Prototipe mem-push, tetapi root bertumpuk tidak punya tombol back sehingga tampilannya sama.
- **Aturan query saat pindah** (`ListScreen.open`): scope sama → query dipertahankan; scope berganti → query kembali ke default scope itu.
- Kartu → `router.push('/tasks/<no>')`. Detail memilih varian dari status: In review → review; In progress/Done → progress; To do/Canceled → todo (`detailOf` di `tasks.shared.js`).
- Perubahan status di detail tidak bernavigasi; layar re-render dari store. Dari sheet: aksi → `router.back()` → detail re-render.
- Kartu tugas dari Home (Sesi B `tabFor`) nanti diarahkan ke `/tasks/<no>`; minta Sesi B mengganti `tabFor` saat route ini ada.

## 2. List (My tasks / All tasks)

Kerangka `StackedScreen` (W0) judul **"Tasks"**, cari **"Search title, #number, or tag…"** + ikon filter (titik bila `isFiltered`). Di bawahnya dua Seg: **My tasks / All tasks** (lebar) dan **List / Kanban** (ikon `List`, `SquareKanban`, 18 px).

### 2.1 My tasks (`TasksMy`)

- Sumber: tugas yang ditugaskan ke saya (`assigned(t, me)`), lalu `applyQuery`.
- Grup review di atas, hanya non-member: **"Waiting for my review"** (pm) / **"Waiting for review"** (admin); isinya **semua** tugas In review (setelah query), dan tugas itu dikeluarkan dari grup lain (`TasksMy` di `tasks.list.jsx`).
- Sort = Due date → grup **Overdue / Today / Tomorrow / This week / Later / Done / Canceled** (`groupOf`: Canceled 6, Done 5, d<0 → 0, d≤1 → d+1, d≤sisa pekan → 3, lainnya 4). Sisa pekan = hari sampai Minggu = `daysToSunday(TODAY)` dari `src/data/dates.ts`. Sort lain → satu grup berjudul nama sort.
- Kartu (`MyCard`): judul + chevron; `#no · project · priority`; catatan (`note(t)`, bold) bila status bukan To do; **"Due X"** (merah bold bila lewat).
- `note(t)`: In review → "Waiting for my review" bila reviewer = saya, selain itu "Awaiting review by <reviewer>"; status lain → `t.when`.

### 2.2 All tasks (`TasksAll`)

- Default query = proyek Atlas (`baseQuery`: `project` = `''` untuk mine/inProject, `'atlas'` untuk all).
- Kartu: Tick (checkbox 'Select', tanpa aksi massal di prototipe), judul, `#no · type · whoLabel` (nama lengkap + "+n"), catatan (selalu, bold), StatusPill, "Due X" (muted).

### 2.3 Kosong dan tanpa hasil

| Keadaan | Copy | Tombol |
|---|---|---|
| My tasks tanpa tugas dan tanpa filter (`tasks.empty`) | "No tasks for you yet." / "Tasks assigned to you will show up here." | **New task** (primary, `Plus`) → `/tasks/new` (write) |
| My tasks kosong karena filter; All tasks kosong apa pun sebabnya (`NoMatch`, ikon `SearchX`) | "No tasks match these filters." / "Change the filters, or reset them to see the whole list." | **Reset filters** (primary) → query default |

### 2.4 Filter & sort (`tasks.filter`)

- Judul **"Filter & sort"**. Field: **Status** (`'All active','To do','In progress','In review','Done','Canceled'`), **Project** (`All projects` + semua proyek) — atau **Assignee** (`'Anyone','Me'`) di tab Tasks proyek —, **Priority** (`'All','High','Medium','Low'`), **Sort by** radio (`'Due date','Priority','Recently updated','Title (A–Z)'`).
- Diedit sebagai draf. **Reset** = draf ke default scope; **Apply** = tulis ke store query scope + `router.back()`.
- `isFiltered` = status/project/priority/who ≠ 0; sort saja tidak dihitung.
- `applyQuery(tasks, q, board)`: All active menyembunyikan Done dan Canceled di list; papan memakai semua kolom (`board = true`). Urutan: due → priority (RANK) lalu due → `updated` desc → judul.
- Cari: judul, `#no`, atau tag (case-insensitive) — port perilaku `SearchFilter` (`kit/filter.jsx`).

## 3. Kanban (`tasks.board`, `Board`)

### 3.1 Tata letak

- Kolom (`tasks.columns.js`): **To do** (`CircleDashed`, arah **up**), **In progress** (`CircleDot`, **right**), **In review** (`Circle`, **down**), **Done** (`CircleCheck`, **left**). Lebar kolom 272 px, scroll horizontal bebas tanpa snap; kolom berikutnya mengintip.
- Kepala kolom: badge bernada + jumlah; kontrol abu **Select / Cancel** di kanan.
- Kartu (`BoardCard`): judul (subhead bold), `#no · project` (mine) atau `#no · type`; chip: avatar, `Calendar` + due (merah bila lewat dan bukan Done), `Flag` + prioritas (warna per prioritas), `ListChecks` + "2/3" bila ada steps. Label aksesibilitas `#no title`.
- Tiap kolom diakhiri tombol plain **"Add task"** (`Plus`) → `/tasks/new/form`.
- Papan memakai semua status (Done ikut) dan query yang sama dengan list.

### 3.2 Multi-select

- **Select** menyalakan mode pilih untuk seluruh papan. Tap kartu = toggle (ikon `CircleCheck`/`Circle` 20 px di pojok). **Cancel** mengakhiri dan mengosongkan pilihan.
- Saat menyala, ikon select-all (`CheckCheck` 16) menggeser keluar dari balik kontrol: 220 ms `cubic-bezier(0.32, 0.72, 0, 1)` → Reanimated `withTiming` + `Easing.bezier(0.32, 0.72, 0, 1)`. Label "Select all <status> tasks" / "Deselect all <status> tasks"; disabled bila tidak ada kartu yang boleh dipilih.
- Live region: "n selected, hold one to move them" / "Tap tasks to select them" → `AccessibilityInfo.announceForAccessibility` saat nilai berubah.
- Member hanya boleh memilih/memindah tugasnya sendiri; selain itu notice **"Only <A or B> can change this task"** (`assignees(t).join(' or ')`). PM/Admin semua tugas.

### 3.3 Menu radial (`tasks.radial*.js[x]`)

Konstanta (port persis ke `src/data/tasks.radial.ts`, fungsi `'worklet'`):

| Nama | Nilai | Arti |
|---|---|---|
| `HOLD_MS` | 350 | tahan sebelum menu terbuka |
| `SLOP_PX` | 8 | gerak lebih jauh sebelum terbuka = scroll |
| `PICK_PX` | 28 | jarak minimum untuk membidik |
| `EDGE` | `{ x: 164, top: 140, bottom: 200 }` | pusat menu dijaga dari tepi layar (satu kartu) |
| `GROUP_EDGE` | `{ x: 172, top: 164, bottom: 250 }` | untuk grup |

- `aimOf(dx, dy)`: `hypot < 28` → null; sumbu lebih panjang menentukan sisi (right/left/down/up → status kolom).
- Lepas saat membidik = **pindah**. Pernah membidik lalu kembali ke tengah = **batal**. Tidak pernah bergeser = **sticky** (menu tetap terbuka, tap status). Tap dim / tombol back Android = tutup.
- Status saat ini ditandai **"Now"** dan disabled; memilih status yang sama hanya menutup.
- Petunjuk: `#no title` + "Slide to a status and let go" (menahan) / "Tap a status to move the task(s)" (sticky). Label dialog "Move #no title" / "Move n tasks".
- Visual (`tasks.css`): ring radius 92 (grup 116), kotak opsi 48 / ring 124; opsi muncul 200 ms dengan stagger 0/25/50/75 ms; opsi dibidik scale 1.12 berisi warna nada; tutup 240 ms (fold 160, swell 180). Ambil angka lain dari `tasks.css` saat porting.
- Grup (kartu terpilih > 1 dan kartu yang ditahan termasuk pilihan): kartu terbang dari posisinya ke jari 280 ms, stagger 35 ms, miring 4°, angkat 3 px, badge jumlah; batal = terbang kembali; pindah = `tk-stack-away` 220 ms. Kartu yang terangkat redup di kolomnya (`is-lifted`).
- Hasil: `moveTask` per tugas yang statusnya berbeda; notice **"Moved to <status>"** (satu) / **"Moved n tasks to <status>"** (grup, lalu mode pilih berakhir).
- Haptic **tidak** diport (K9).

## 4. Detail (`TaskDetail`, `tasks.detail*.jsx`)

- Header judul **"Task detail"**, chevron back, ⋯ **"Task actions"**: **Edit task** dan **Cancel task** (bila boleh ubah dan bukan Canceled), **Move to Archive** (danger; non-member, atau Member pembuat tugas). Tanpa menu bila diarsipkan.
- Move to Archive tanpa dialog (T1): `archiveTask` → kembali ke **All tasks** (`router.dismissTo('/tasks')` + `setParams({ scope: 'all' })`, seperti `archive.undo.jsx`) → snack **"Task moved to Archive"** + **Undo** (W0 `useSnack`) → `unarchiveTask` + notice "Task restored".
- Due: "Overdue N days" / "Today" / "Tomorrow" / "Due X".
- Facts (`baseFacts`): **Assignee**, **Due date**, **Priority**, **Type**, **Needs review**, **Reviewer** (bila ada), **Tag** (pill outline atau "—"), **Created by**.
- Description atau "No description yet."; section **"Chat & history"** (`history`); kaki komentar "Write a comment… (@name to mention)" (input saja, tanpa kirim).

| Varian | Aksi utama | Isi khas |
|---|---|---|
| To do / Canceled | **Start working** (primary) → In progress, "Task started"; **Mark done** bila tanpa reviewer → Done, "Marked as done" | Needs review "Off · Mark done directly" (member: "Off · you may turn it on"); Steps atau "No steps yet." + "+ Add step" |
| In progress / Done | **Request review** → In review, "Review requested" / **Mark done**; Done: **Reopen** → In progress, "Task reopened" | Catatan "The lead is the assignee. Add a second manager so this project has a reviewer." (bila berlaku); **Evidence n** + "+ Attach evidence" (toast) |
| In review | Non-member: **Approve** → Done, "Task approved" + **Return** → sheet; Member: "Waiting for a Manager or Admin. You'll be notified when it's approved or returned." | Banner `asked` ("Dodi asked you to review this task · Oct 7"); "Approve → automatically Done" |

- Canceled: kotak "Canceled by X: reason" (atau "This task was canceled.") + **Restore** → To do, "Task restored".
- Bukan milik saya (Member): "Only <assignees>, the project Manager or an Admin can change this task." menggantikan aksi.
- Diarsipkan: "This task is in Archive."
- Tiap aksi menulis log "<me> started working" dst. ke history (`useStatusAction`).
- Tombol aksi async: Phase 1 sinkron, tetapi komponen sudah menerima `loading` agar Phase 2 tinggal mengisi (UX §2).

## 5. Sheet, edit, form, write, CSV, settings

**Return** (`tasks.return`, pm/admin): judul **"Return task"**; quick pick 'Still has errors', 'Not as requested', 'Evidence unclear' (mengisi alasan); **Reason \*** wajib; catatan "The task goes back to In progress and is logged as "Returned ×n". <who> gets a notification."; → In progress, "Task returned".

**Cancel** (`tasks.cancel`): **"Why cancel? \*"** radio 'Duplicate / already exists', 'No longer needed', 'Outside the project scope', 'Created by mistake', 'Other'; catatan wajib bila Other; tombol **Back** + **Cancel task** (danger) → Canceled `{ by, reason }`, "Task canceled".

**Edit** (`tasks.edit`): judul **"Edit task"**; Title\*, Assignee (chip multi), Due date (DateField), Priority (chip `Low/Medium/High/Critical`), Type (`TYPES`: `['Task','Task (task)'], ['Bug','Issue (issue)'], ['Improvement','Idea (idea)']`), Phase (hanya Atlas), Needs review (`ReviewEdit`, reviewer dari `reviewersOf`), Tags (Enter/submit menambah, lowercase, tanpa duplikat), Description, Steps (`StepsEdit`), Evidence (`EvidenceEdit`). **Save** → `editTask`, "Task updated", `router.back()`.

**Form** (`tasks.form`, modal **"New task"**): Seg 'Just write ✦' / 'Fill form'; Project (select), Title\*, Assignee, Priority, Due; **Show more / Show less** membuka Description, Type, Phase, Start date, Estimated hours, Tags, Needs review + catatan "Needs review starts from the project setting (Atlas: off)." Nilai awal dari `quickWrite.drafts[0]`, deskripsi 'The login page layout breaks on phones. Fix it before the staging release.' **Save** → `addTask`, "Task created", `router.dismiss()` lalu `router.push('/tasks/<no>')`.

**Write** (`tasks.write`): textarea (isi `quickWrite.text`), "Speak · coming soon" (toast), **Compose ✦** menampilkan kartu draf AI (`quickWrite.drafts`) dan chip "Which Rina?" (`quickWrite.ask`); kaki **Edit text** / **Save 2 tasks**. Tanpa LLM: draf = data sampel.

**CSV** (`tasks.csv`): judul **"Import tasks from CSV"**; "Download sample CSV" (toast); Seg Upload file / Paste text; berkas `atlas-tasks.csv · 5 rows`, ringkasan `4 ready (1 with a note) · 1 error`; 5 baris pratinjau (Ready/Error/Note); **Import 4 tasks** (toast, tutup). Pratinjau = tabel ≥ 4 kolom → kartu per baris di ponsel (aturan mobile).

**Project settings** (`tasks.settings`): judul **"Project settings"**; Member: "Not available for Member"; switch **New tasks need review**; Task types (maks 6); Tags dengan Rename/Merge/Delete (toast). Port copy dari `tasks.settings.jsx`.

## 6. Interaksi RN (Reanimated 4 + RNGH 3)

Diverifikasi di types terpasang (`react-native-gesture-handler/lib/typescript/v3`): hook `usePanGesture`/`useTapGesture`, opsi Pan `activateAfterLongPress`, callback `onBegin/onActivate/onUpdate/onDeactivate/onFinalize`, relasi `simultaneousWith`/`requireToFail`, event `absoluteX/absoluteY/translationX/translationY`, `ScrollView` dari RNGH.

- **Papan**: `ScrollView` horizontal dari RNGH; tiap kolom `View` (tanpa scroll sendiri); halaman vertikal = `StackedScreen`.
- **Tahan kartu**: `usePanGesture({ activateAfterLongPress: HOLD_MS })` per kartu dalam `GestureDetector`. Gerak sebelum 350 ms membuat Pan gagal sehingga ScrollView menang (padanan `SLOP_PX`; ukur toleransi default di perangkat, set `failOffsetX/Y ±SLOP_PX` bila perlu).
  - `onActivate`: `scheduleOnRN(open, no, absoluteX, absoluteY)`. `open` mengecek `mayChange` (bila tidak boleh → notice, batal), menentukan grup, mengukur kartu grup dengan `measureInWindow`, meng-clamp pusat ke `EDGE`.
  - `onUpdate` (worklet): `aim.value = aimOf(translationX, translationY)`; `left.value ||= aim != null`.
  - `onDeactivate`: aim → `scheduleOnRN(pick, aim)`; `left` → tutup; selain itu sticky.
  - Tap kartu (buka detail / toggle pilih) = `Pressable` biasa; aktivasi Pan membatalkan press sehingga lepas setelah menahan bukan tap (padanan `swallowClick`). Uji di perangkat.
- **Overlay menu**: dirender lewat gluestack `Portal` (di atas tab bar, tanpa jendela native baru). RN `Modal` **tidak** dipakai karena membuka jendela baru dan membatalkan sentuhan yang sedang ditahan di iOS. Dim `Pressable` = tutup; `BackHandler` Android = tutup.
- **Animasi**: opsi `withDelay(stagger, withTiming(...))`, scale aim `withTiming(1.12)` dari `useAnimatedStyle` membaca `aim`; stack terbang dari offset kartu ke pusat (`withTiming` 280 ms + delay 35·i, rotasi 4°). `useReducedMotion()` → tanpa stagger/scale/terbang, opacity saja.
- **Aksesibilitas** (tak ada padanan tahan-geser): tiap kartu punya `accessibilityActions` "Move to To do/In progress/In review/Done" (kecuali status saat ini) → `moveTask` + notice yang sama. Mode pilih: `accessibilityState={{ selected }}`.

## 7. Data dan logika (TS murni, `src/data/`)

| Berkas baru | Port dari | Isi |
|---|---|---|
| `sample/tasks.extra.ts` | `sample.js` `tasks[].next/updated/tags`, `taskDetail`, `quickWrite`, `csv` | `TASK_EXTRA: Record<no, { next, updated, tags }>`, `TASK_DETAIL`, `QUICK_WRITE`, `CSV_PREVIEW` (tanggal ISO) |
| `sample/tasks.settings.ts` | `tasks.settings.jsx` | Tipe tugas, tag, nilai switch per proyek |
| `tasks.shared.ts` | `tasks.shared.js` | `dueIn(t)` (pakai `daysBetween(TODAY, t.due)`), `assignees`, `assigned`, `whoLabel`, `note`, `isOpen`, `detailVariant`, `dueLabel`, `TYPES`, `PRIORITIES` |
| `tasks.query.ts` | `tasks.query.js` | `STATUSES`, `PRIORITIES`, `SORTS`, `ASSIGNEES`, `baseQuery(scope)`, `isFiltered`, `applyQuery`, `searchTasks` |
| `tasks.query-state.ts` | (params prototipe) | Store query per scope (`'mine' \| 'all' \| 'project:<id>'`), `setQuery`, `resetQuery` |
| `tasks.groups.ts` | `tasks.list.jsx` | `GROUPS`, `groupOf`, grup review per role |
| `tasks.store.ts` | `tasks.store.js` | `moveTask`, `archiveTask`, `unarchiveTask`, `takeProjectTasks`, `putTasksBack`, `renameProjectTasks`, `editTask`, `addTask`, `listArchivedTasks`, `resetTasks`; versi via `createStore` (W0) |
| `tasks.radial.ts` | `tasks.radial.js` | Konstanta §3.3, `aimOf` (worklet), `clampCenter(x, y, w, h, group)` |
| `tasks.ts` | — | Titik tukar API: `getTasksList(role, { scope, view, query, search })` → `{ groups \| columns, filtered, empty }`; `getTaskDetail(role, no)` → `{ task, variant, facts, actions, mayChange, mayArchive, canReturn }`; `getTaskForm(role, project?)`; `getTaskEdit(no)`; `getQuickWrite()`; `getCsvImport()`; `getTaskSettings(role, projectId)` |

- File sampel Sesi B (`sample/tasks.ts`: `no, title, project, type, priority, status, who, also, due ISO, when, doneOn`; `TASK_REVIEWERS`) dibaca, tidak diubah (K7). Tipe `type` Sesi B hanya `'Task' | 'Bug'`; Improvement dari `TYPES` perlu tipe lebar di `tasks.shared.ts`.
- `when` sampel adalah teks ("2 days overdue"); turunkan dari tanggal bila bisa, kalau tidak pakai teks sampel.
- Peran orang (`ROLE_TAG`, reviewer) dari `src/data/people.ts` (W0, §4 main doc).

## 8. Berkas layar (`src/screens/tasks/`, tiap ≤ 150 baris)

`tasks.strings.ts`; `list/tasks.screen.tsx` (menggantikan placeholder T5), `list/task-list.tsx`, `list/my-card.tsx`, `list/all-card.tsx`; `board/task-board.tsx`, `board/board-card.tsx`, `board/select-control.tsx`, `board/use-move-gesture.ts`, `board/radial-menu.tsx`, `board/move-stack.tsx`; `filter/tasks-filter.screen.tsx`, `filter/tasks-search.tsx`; `detail/task-detail.screen.tsx`, `detail/detail-actions.tsx`, `detail/detail-facts.tsx`, `detail/detail-steps.tsx`, `detail/detail-evidence.tsx`; `sheets/return.screen.tsx`, `sheets/cancel.screen.tsx`; `edit/task-edit.screen.tsx`, `edit/edit-lists.tsx`; `new/write.screen.tsx`, `new/form.screen.tsx`, `new/form-fields.tsx`; `csv/csv.screen.tsx`; `settings/tasks-settings.screen.tsx`.

## 9. Kontrak untuk W4 (Projects)

- `TaskBoard({ tasks, role, mine })` diekspor dari `board/task-board.tsx` (papan lengkap: kolom, pilih, menu radial); re-render saat store tugas berubah. Tab Tasks proyek memakai kartu list sendiri (`TaskCard` di `projects.tabs.jsx`, milik W4), bukan kartu My/All.
- `TasksSearchField({ scope, inProject })` (cari + ikon filter bertitik) diekspor dari `filter/tasks-search.tsx`.
- `TasksSettings({ projectId, role })` dari `settings/tasks-settings.screen.tsx`.
- Filter tab Tasks proyek: W1 mengekspor `TasksFilterPanel({ scope, inProject })`; W4 membuat route `projects/[id]/task-filter.tsx` yang me-render panel itu.
- Store: `takeProjectTasks`, `putTasksBack`, `renameProjectTasks` dipakai W4 saat proyek diarsipkan/di-restore/di-rename.

## 10. Risiko

| Risiko | Penanganan |
|---|---|
| Konflik gesture tahan vs scroll horizontal/vertikal | `activateAfterLongPress`; uji iOS + Android; fallback `useLongPressGesture` + `usePanGesture` dengan `simultaneousWith` |
| Lepas jari setelah menahan memicu tap kartu | Uji di perangkat; bila bocor, flag `swallowTap` ref yang diset di `onActivate` dan dicek di `onPress` |
| Posisi kartu di kolom yang ter-scroll keluar layar | Clamp offset ke batas layar (padanan `offsetOf`) |
| Portal di luar `GestureHandlerRootView` | Verifikasi urutan provider di `app/_layout.tsx`; bila salah minta Sesi A memindahkan |
| Keyboard di form panjang / kaki komentar | §7 main doc |
| `/tasks/new` vs `/tasks/[id]` | Tes route (§11) |

## 11. Tes (`__tests__/tasks/`)

- **Unit**: `tasks.query` (default per scope, isFiltered abaikan sort, All active menyembunyikan Done/Canceled di list tetapi tidak di papan, keempat urutan), `tasks.groups` (tiap batas grup dengan `TODAY` 2026-10-07 Rabu), `tasks.shared.note` per role, `tasks.radial.aimOf` (di bawah 28 px null; diagonal memilih sumbu lebih panjang), `clampCenter`, `tasks.store` (move/archive/unarchive/edit/add + reset).
- **Port tes prototipe**: `tasks.list` (grup, review per role, empty, NoMatch + Reset), `tasks.filter` (draf, Reset, Apply, titik), `tasks.board.move` (tahan 350 ms → menu; geser kanan → In progress + notice; kembali ke tengah = batal; sticky + tap; Member ditolak dengan notice), `tasks.board.select` (Select, toggle, select-all per kolom, tahan kartu terpilih memindah grup "Moved 2 tasks to Done"), `tasks.detail.actions` (tiap varian dan role; archive → snack + Undo), `tasks.edit` (tags lowercase/tanpa duplikat, Save), `tasks.form` (Show more, Save → detail baru).
- Gesture: `fireGestureHandler(getByGestureTestId('card-12'), [{ state: BEGAN }, { state: ACTIVE }, { translationX: 40 }, { state: END }])` + timer Reanimated.
- **Route**: `renderRouter` — `/tasks/new` membuka modal, `/tasks/12` membuka detail, `/tasks/12/return` ditolak untuk member (Redirect).
- Aksesibilitas: aksi "Move to Done" pada kartu memindah tugas.
