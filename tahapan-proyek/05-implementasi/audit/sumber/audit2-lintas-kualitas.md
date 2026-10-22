# AUDIT lintas-kualitas — Paket M1 (mobile 375px/skala, aksesibilitas, kualitas, celah tes)

Cabang `audit/pm-lintas-kualitas` @ `161def2`. Cakupan: menu Proyek + Tugas (224 berkas app/server, 98 berkas tes). Pemindaian otomatis: skrip di `/tmp/audit/scan/`. Status: FINAL.
**Sehat (terbukti pemindaian):** tanpa `TODO/FIXME`, `console.*`, `@ts-ignore`, `biome-ignore`, kode dikomentari, `size={N}` ikon, `@media`, `<input>` native, `window.confirm/alert`; semua `ActionIcon` ber-`aria-label`; semua input ber-`label`; badge status/prioritas/kondisi selalu ikon+teks; Tooltip tidak membungkus `Menu.Target`; tabel semua lewat `ResponsiveTable`; tanpa berkas >500 baris; tes terbesar 385 baris; 3109 tes, hanya 3 tanpa `expect`; 46 rute API semuanya bertes (tabel-driven).
**Ringkasan:** 10 temuan baru: Tinggi 1, Sedang 2, Rendah 7 (belum ada Kritis). Temuan lama tidak diulang: PRJ-21..25, T-08/10/19/22, H-C16, H-B11.

## Temuan

| ID | Tingkat | T/D | Berkas:baris | Bukti singkat | Saran | Uk |
|---|---|---|---|---|---|---|
| LK-01 | Tinggi | Terkonfirmasi | `tests/ui/*` (19 berkas `renderToString`); `app/components/tasks/{useTaskActions.tsx,useTaskBodyActions.ts,useTaskWrite.ts,NextStepBar.tsx,NextStepButton.tsx,CommentBox.tsx,TaskWriteBox.tsx}`, `app/components/projects/{useProjectActions.tsx,AddMemberModal.tsx,ChangeRoleModal.tsx}`, `projects/plan/usePlanActions.tsx` | Tidak ada happy-dom/testing-library di `package.json`. `grep -rl <nama> tests` kosong untuk 10 nama itu (NextStepButton hanya tersentuh tak langsung lewat render `TaskRow`). Hanya hapus-tugas T1 (`task-delete-ui.test.tsx`) yang diuji perilakunya (loading, toast, Urungkan). Tak terjaga: dialog T2 (keluarkan anggota, ubah peran, hapus tahapan/milestone), `loading`, notifikasi sukses/gagal, invalidasi cache (PRJ-06 lolos karena ini) | Uji hook tanpa DOM: panggil `mutationFn`/`onSuccess` dengan `QueryClient` dan `notifications`/`modals` di-stub, mengikuti pola `task-delete-ui.test.tsx`; mulai dari aksi T2 dan siklus tugas (mulai/selesai/batal) | L |
| LK-02 | Sedang | Terkonfirmasi | `app/components/ui/PageHeader.tsx:34` (`order={3}`), `ProjectHeader.tsx:81` & `TaskHeader.tsx:66` (`order={2}`), `ProjectCreateChooser.tsx` (`4`), `ProjectGantt.tsx`/`ui/SectionCard.tsx` (`5`) | `grep -rnE "order=\{1\}\|<h1" app` hanya cocok di `landing/Hero.tsx` dan `errors/ErrorPanel.tsx`; kerangka `/app` (`AppFrame`, `routes/app/layout.tsx`) juga tanpa h1. Jadi tak satu halaman Proyek/Tugas punya `<h1>`; judul daftar mulai dari h3 (loncat), detail dari h2. Pembaca layar tak bisa melompat ke judul halaman | `PageHeader`, `ProjectHeader`, `TaskHeader`: `<Title order={1} size="h3">` (tampilan tetap); bagian di bawahnya h2/h3 berurutan | S |
| LK-03 | Sedang | Terkonfirmasi | `tests/ui/app-scale-safety.test.ts:8-11` (GLOBS), `:73-84` | Penjaga hanya memindai `routes/app/**` dan `components/{projects,account,trash,ui,tasks}` — **tidak** `components/pm/**` (3 `wrap="nowrap"` tanpa penanda di `ProgressBar.tsx:33,42,54`) dan `app/lib`. `PINNED_NOWRAP=5` persis sama dengan jumlah kini (`HoldShell:25`, `MemberPicker:79`, `PhaseStepper:51`, `TaskRow:107`, `MemberAvatar:46`) jadi tambahan ke-6 baru ketahuan tetapi tanpa tahu mana. Tak ada penjaga untuk: `ActionIcon` tanpa `aria-label`, `Button size="sm"` di `/app`, Tooltip di atas `Menu.Target`, `Progress` tanpa nama | Tambah `components/pm` ke GLOBS; pinned per berkas (`file:line` daftar putih) bukan angka; tambah 3 pemeriksaan regex di atas | S |
| LK-04 | Rendah | Dugaan | `app/components/projects/MemberPicker.tsx:79-95` | Grup `wrap="nowrap"` berisi `Select w="10rem"` (160 px; diduga ikut `theme.scale` lewat `rem()` Mantine) + `ActionIcon` 44 px di dalam `Paper p="sm"`. Skala 1: ±215 px, muat di 375. Skala 1,5: ±320 px + gap, melebihi lebar isi (±300 px): berpotensi meluber | Hapus `nowrap` atau beri `w={{ base: '100%', sm: '10rem' }}` dan `style={{ minWidth: 0 }}`; uji 375 px skala 1,5 | S |
| LK-05 | Rendah | Terkonfirmasi | `app/components/projects/summary/DeadlineBadge.tsx:59`, `app/components/ui/FilterPopover.tsx:40` (lain: `EmptyState.tsx:36,41,46` = H-C16) | `<Button size="sm">` (36 px) di area `/app`; CLAUDE.md §Touch: default `lg`. Tombol "Coba lagi" di popover riwayat tenggat | Hapus `size="sm"` (ikut default tema) | S |
| LK-06 | Rendah | Terkonfirmasi | `app/components/ui/FilterPopover.tsx` (seluruh berkas; 0 rujukan di `app/`, hanya tes); `ReasonModal.tsx:66` `validateReason` (hanya tes); `projects-filters.ts:58,127` `PROJECT_GANTT_PAGE_SIZE`/`pageSizeFor`, `ProjectHeader.tsx` `shownCondition`, `ReasonModal.tsx` `categoryProblem`, `task-back.ts` `BACK_PARAM` (di-`export` tetapi hanya dipakai berkasnya sendiri) | `grep -rn FilterPopover app server` hanya menemukan definisinya: komponen mati yang membawa logika mobile (`calc(100vw - 2rem)`) yang tak pernah jalan. Pemindai ekspor: ±45 simbol di-`export` tanpa pemakai di luar berkas (kebanyakan tipe). Kode mati yang sudah tercatat: PRJ-21, T-22 | Hapus `FilterPopover.tsx` dan `validateReason` beserta tesnya (atau pakai bila memang rencana); cabut `export` yang tak perlu | S |
| LK-07 | Rendah | Terkonfirmasi | `app/components/projects/ProjectFilters.tsx:66-79` ≈ `app/components/tasks/TaskFilters.tsx:60-72`; `server/task/task-access.query.ts:31-40`, `task-trash.service.ts:36-46`, `task-workflow.service.ts:136-146` | Pemindai blok 8 baris: 14 baris identik untuk kotak cari (state + `useDebouncedCallback` + sinkron `filters.q` + `orDefault`); daftar 9 kolom `task` identik di 3 service | Ekstrak hook `useSearchBox(filters.q, onChange)` dan konstanta `TASK_ACCESS_COLUMNS` | S |
| LK-08 | Rendah | Terkonfirmasi | 172 dari 475 `export` fungsi/komponen tanpa docstring satu baris: `app/components/projects` 56, `app/components/tasks` 39, pembungkus API `app/lib/*-api.ts` dan filter ±45, `routes/app` 18 (`meta`/`loader`), `server/{project,task,api}` 14 | Pemindai: baris sebelum `export function|const` bukan `*/` atau `//`. Contoh: `AddMemberModal.tsx:27`, `CommentBox.tsx:8`, `NextStepBar.tsx:20`, `tasks-api.ts:103-226` | Aturan global §16 (publik wajib docstring). Beri docstring pada komponen/hook (±95); `meta`/`loader` dan pembungkus Eden boleh dikecualikan secara eksplisit di CLAUDE.md | M |
| LK-09 | Rendah | Terkonfirmasi | `app/components/tasks/TaskForm.tsx` 253 baris, `app/lib/tasks-api.ts` 228 (util ≤200), `ProjectForm.tsx` 249 (fungsi 118), `usePlanActions` fungsi 124, `projects.tsx` 148/150, `project.service.ts` 297/300, `app-projects.plan.ts` 150/150 | Batas di `~/.claude/CLAUDE.md` §8; ≥80%: 18 berkas (daftar di `/tmp/audit/scan/size.ts`). **HUTANG H-E3 usang:** `task.service.ts` kini 276 baris, bukan 306 | Pecah `tasks-api.ts` (baca/tulis/ajak) dan `TaskForm.tsx` sebelum fitur berikut; perbarui H-E3 | M |
| LK-10 | Rendah | Terkonfirmasi | `plan.copy.ts:32-133`, `summary.copy.ts:97`, `projects.copy.ts:97,103,145,190`, `project-chooser.copy.ts:10` | Jargon Inggris di teks untuk awam/lansia: "Milestone" 268 kemunculan di 21 berkas (judul bagian, tombol "Tambah milestone", pesan), "Gantt" sebagai label tampilan, "Project Manager" di 3 pesan tolak, "Coming soon" (PRJ-15 hanya menyebut sebagian) | Putuskan padanan ("Target antara"/"Tonggak") satu kali di kamus, lalu ganti lewat `*.copy.ts`; "Project Manager" → "Pengelola proyek" | M |

## Matriks pemeriksaan per dimensi (hasil pemindaian)
| Pemeriksaan | Hasil |
|---|---|
| Ikon piksel / `font-size` piksel / `@media` / lebar tetap | Bersih (`w="10rem"` MemberPicker = LK-04; `Popover width={320}` DeadlineBadge:81 muat di 375 tetapi tidak mengikuti pola `calc(100vw - 2rem)` milik FilterPopover — Rendah, dugaan) |
| `wrap="nowrap"` tanpa penanda | 7 di lingkup: `ProgressBar` ×3 (PRJ-24), `MemberPicker:79` (LK-04), `PhaseStepper:51` (wadah gulir, aman), `TaskRow:107` (T-10), `MemberAvatar:46` (ikon+teks, aman) |
| Tabel ≥4 kolom | `ProjectList`, `TaskTable`, `MemberTable` semuanya `ResponsiveTable` (kartu di bawah `sm`) |
| Target sentuh | `size="sm"` LK-05; lainnya T-08/H-C16 |
| `aria-label`/label formulir | 0 pelanggaran di 40 input dan semua `ActionIcon` |
| `Progress` | 3 tanpa nama sengaja `aria-hidden` dengan teks di sebelahnya (aman); `ProgressBar` memberi `aria-label` |
| Gantt | wilayah gulir `role="region" tabIndex=0 aria-label` (baik) |

## Cakupan tes (celah)
- Perilaku aksi UI: lihat LK-01 (hanya T1 hapus tugas yang diuji perilakunya; semua `use*Actions` lain tidak).
- Tak ada tes untuk `MemberPicker`, `Gantt{Header,Row,Marks}`, `ProjectGrid`, `TaskGroupList`, `TaskTable`, `TaskTimeline`, `TimelineText`, `TaskLoadError` (mungkin tersentuh tak langsung lewat render halaman; tidak diverifikasi satu-satu).
- Rute API: semua rute di `appApi` bertes (jumlah rute 46; pencocokan nama otomatis tidak andal karena tes tabel-driven, jadi hanya spot-check `start/unstart/complete` di `tasks-security.test.ts:128-130`); tak ada celah ditemukan.
- Server: 14 modul `server/{project,task}` tidak disebut namanya di tes mana pun (`task.sql.ts`, `task-timeline.query.ts`, `task-checklist.service.ts`, `project-plan.write.ts`, …) tetapi dilewati tes layanan/rute.

## Perlu dicek manual di browser (≤8)
1. 375 px, skala teks 150% (Pengaturan → Ukuran teks): Proyek → Tambah proyek → bagian anggota → pilih orang: apakah baris "Pemilih peran + ✕" meluber (LK-04).
2. 375 px skala 125%: halaman Proyek tampilan Gantt, gulir ke samping; label kolom tetap terlihat?
3. Pembaca layar (VoiceOver): buka `/app/tasks` dan `/app/projects/<id>`; tekan "judul berikutnya": apakah ada judul halaman (LK-02)?
4. Tab-kunci pada daftar tugas: urutan fokus judul → tombol "Mulai kerjakan" → menu ⋯ masuk akal; klik baris di luar judul membuka tugas.
5. Ubah peran anggota dua kali berturut-turut: tombol "Lanjutkan" mati tanpa alasan (PRJ-18) — apakah terasa membingungkan?
6. Tab "Tahapan": hapus milestone → dialog muncul dengan tombol bertulisan jelas, lalu notifikasi hijau; gagal (matikan jaringan) → notifikasi merah dengan saran.

## Di luar cakupan (satu baris, tidak diselidiki)
- Alur data filter/URL, izin UI vs server, SEO `meta()`: paket lain.
- `EmptyState` `size="sm"`, Chip 28 px: H-C16. Eden `Date`: PRJ-01/T-01.

## Paket kerja (berkas disentuh)
1. **Uji perilaku aksi** (L): `tests/ui/*` baru + `package.json` bila happy-dom disetujui. LK-01.
2. **A11y & mobile** (S): `ui/PageHeader.tsx`, `ProjectHeader.tsx`, `TaskHeader.tsx`, `routes/app/project/*.tsx` (judul), `MemberPicker.tsx`, `DeadlineBadge.tsx`, `tests/ui/app-scale-safety.test.ts`. LK-02..05.
3. **Bersih-bersih & pecah berkas** (M): `FilterPopover.tsx`, `ReasonModal.tsx`, `projects-filters.ts`, `ProjectFilters.tsx`+`TaskFilters.tsx`, 3 service tugas, `tasks-api.ts`, `TaskForm.tsx`. LK-06, 07, 09.
4. **Kamus istilah & docstring** (M): semua `*.copy.ts`, komponen tanpa docstring. LK-08, 10.
