# PEMERIKSAAN — Lintas menu Proyek dan Tugas

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`, paket `lintas-kualitas`. Pemindaian **otomatis dengan skrip** (bukan membaca satu per satu) atas 224 berkas `app`/`server` dan 98 berkas tes untuk menu Proyek dan Tugas. Bug: [`BUG.md`](BUG.md). Sumber mentah: [`../sumber/audit2-lintas-kualitas.md`](../sumber/audit2-lintas-kualitas.md).

## 1. Yang diperiksa dan LOLOS

Kode **sangat bersih pada pola mekanis**: tanpa `TODO`/`FIXME` tanpa konteks, tanpa `console.*`, tanpa `ts-ignore`, tanpa ikon berukuran piksel (semua `1.25em`), tanpa `aria-label` yang hilang pada tombol ikon, tanpa `window.confirm/alert`. **Semua 46 rute API** di `appApi` punya tes (spot-check `start/unstart/complete` di `tasks-security.test.ts:128-130`). Tidak ada celah ditemukan di sisi rute.

## 2. Temuan BUKAN bug (perbaikan dan kepatuhan)

| ID | Tingkat | Bukti | Temuan | Berkas | Saran | Uk |
|---|---|---|---|---|---|---|
| LK-01 | **Tinggi** | Terkonfirmasi | **Tidak ada tes perilaku untuk aksi UI** selain hapus-tugas T1. Tidak ada happy-dom/testing-library di `package.json`; 19 berkas tes UI memakai `renderToString`. `grep -rl <nama> tests` kosong untuk 10 nama pengait. Tak terjaga: dialog T2 (keluarkan anggota, ubah peran, hapus tahapan/milestone), `loading`, notifikasi sukses/gagal, invalidasi cache. **Itu sebabnya bug seperti `PRJ-06` lolos.** | `tests/ui/*`; `tasks/{useTaskActions.tsx,useTaskBodyActions.ts,useTaskWrite.ts,NextStepBar.tsx,NextStepButton.tsx,CommentBox.tsx,TaskWriteBox.tsx}`, `projects/{useProjectActions.tsx,AddMemberModal.tsx,ChangeRoleModal.tsx}`, `projects/plan/usePlanActions.tsx` | Uji hook **tanpa DOM**: panggil `mutationFn`/`onSuccess` dengan `QueryClient` dan `notifications`/`modals` di-stub (pola `task-delete-ui.test.tsx`); mulai dari aksi T2 dan siklus tugas (mulai/selesai/batal) | L |
| LK-03 | Sedang | Terkonfirmasi | Penjaga `app-scale-safety` **tidak memindai `components/pm/**` dan `app/lib`**: 3 `wrap="nowrap"` tanpa penanda lolos di `ProgressBar.tsx:33,42,54`. `PINNED_NOWRAP=5` persis sama dengan jumlah kini, jadi tambahan ke-6 ketahuan tetapi tanpa tahu mana. Tak ada penjaga untuk `ActionIcon` tanpa `aria-label`, `Button size="sm"` di `/app`, Tooltip di atas `Menu.Target`, `Progress` tanpa nama | `tests/ui/app-scale-safety.test.ts:8-11,73-84` | Tambah `components/pm` ke GLOBS; daftar putih `file:line`, bukan angka; tambah 3 pemeriksaan regex | S |
| LK-05 | Rendah | Terkonfirmasi | `<Button size="sm">` (36 px) di area `/app`, padahal CLAUDE.md meminta default `lg`: tombol "Coba lagi" di popover riwayat tenggat dan `FilterPopover`. (`EmptyState` dan Chip: H-C16) | `summary/DeadlineBadge.tsx:59`, `ui/FilterPopover.tsx:40` | Hapus `size="sm"` (ikut default tema) | S |
| LK-06 | Rendah | Terkonfirmasi | **Kode mati:** `FilterPopover.tsx` seluruh berkas (0 rujukan di `app/`, hanya tes) beserta logika mobile `calc(100vw - 2rem)` yang tak pernah jalan; `validateReason` (hanya tes); `PROJECT_GANTT_PAGE_SIZE`/`pageSizeFor`, `shownCondition`, `categoryProblem`, `BACK_PARAM` di-`export` tetapi hanya dipakai berkasnya sendiri. ±45 simbol di-`export` tanpa pemakai luar (kebanyakan tipe) | `ui/FilterPopover.tsx`, `ReasonModal.tsx:66`, `projects-filters.ts:58,127`, `ProjectHeader.tsx`, `task-back.ts` | Hapus `FilterPopover.tsx` dan `validateReason` beserta tesnya; cabut `export` yang tak perlu | S |
| LK-07 | Rendah | Terkonfirmasi | **Duplikasi:** kotak cari identik 14 baris di `ProjectFilters.tsx:66-79` dan `TaskFilters.tsx:60-72` (state + `useDebouncedCallback` + sinkron `filters.q` + `orDefault`); daftar 9 kolom `task` identik di 3 service | `server/task/task-access.query.ts:31-40`, `task-trash.service.ts:36-46`, `task-workflow.service.ts:136-146` | Ekstrak hook `useSearchBox(filters.q, onChange)` dan konstanta `TASK_ACCESS_COLUMNS` | S |
| LK-08 | Rendah | Terkonfirmasi | **172 dari 475 `export` fungsi/komponen tanpa docstring satu baris** (aturan global §16): `components/projects` 56, `components/tasks` 39, pembungkus API dan filter ±45, `routes/app` 18 (`meta`/`loader`), `server/{project,task,api}` 14. Contoh: `AddMemberModal.tsx:27`, `CommentBox.tsx:8`, `NextStepBar.tsx:20`, `tasks-api.ts:103-226` | lihat contoh | Beri docstring pada komponen/hook (±95); `meta`/`loader` dan pembungkus Eden boleh dikecualikan eksplisit di CLAUDE.md | M |
| LK-09 | Rendah | Terkonfirmasi | **Berkas besar** (≥80% batas: 18 berkas): `TaskForm.tsx` 253 baris, `tasks-api.ts` 228 (util ≤200), `ProjectForm.tsx` 249 (fungsi 118), `usePlanActions` fungsi 124, `projects.tsx` 148/150, `project.service.ts` 297/300, `app-projects.plan.ts` 150/150. **HUTANG H-E3 usang:** `task.service.ts` kini 276 baris, bukan 306 | daftar lengkap di laporan mentah `../sumber/audit2-lintas-kualitas.md` | Pecah `tasks-api.ts` (baca/tulis/ajak) dan `TaskForm.tsx` sebelum fitur berikut; perbarui H-E3 | M |
| LK-10 | Rendah | Terkonfirmasi | **Jargon Inggris di teks untuk awam/lansia:** "Milestone" 268 kemunculan di 21 berkas (judul bagian, tombol "Tambah milestone", pesan), "Gantt" sebagai label tampilan, "Project Manager" di 3 pesan tolak, "Coming soon" (`PRJ-15` hanya menyebut sebagian) | `plan.copy.ts:32-133`, `summary.copy.ts:97`, `projects.copy.ts:97,103,145,190`, `project-chooser.copy.ts:10` | Putuskan padanan ("Target antara"/"Tonggak") sekali di kamus, ganti lewat `*.copy.ts`; "Project Manager" → "Pengelola proyek" | M |

## 3. Celah cakupan tes (lintas)
- **Perilaku aksi UI:** lihat `LK-01`.
- Tak ada tes untuk `MemberPicker`, `Gantt{Header,Row,Marks}`, `ProjectGrid`, `TaskGroupList`, `TaskTable`, `TaskTimeline`, `TimelineText`, `TaskLoadError` (mungkin tersentuh tak langsung lewat render halaman; tidak diverifikasi satu per satu).
- 14 modul `server/{project,task}` tidak disebut namanya di tes mana pun (mis. `task.sql.ts`, `task-timeline.query.ts`, `task-checklist.service.ts`, `project-plan.write.ts`) tetapi dilewati tes layanan/rute.

## 4. Perlu dicek manual di browser

1. 375 px, skala teks 150% (Pengaturan → Ukuran teks): Proyek → Tambah proyek → bagian anggota → pilih orang: apakah baris "pemilih peran + ✕" meluber (`LK-04`)?
2. 375 px skala 125%: halaman Proyek tampilan Gantt, gulir ke samping; label kolom tetap terlihat?
3. Pembaca layar (VoiceOver): buka `/app/tasks` dan `/app/projects/<id>`; tekan "judul berikutnya": apakah ada judul halaman (`LK-02`)?
4. Tab-kunci pada daftar tugas: urutan fokus judul → tombol "Mulai kerjakan" → menu ⋯ masuk akal; klik baris di luar judul membuka tugas.
5. Ubah peran anggota dua kali berturut-turut: tombol "Lanjutkan" mati tanpa alasan, apakah membingungkan (`PRJ-18`)?
6. Tab "Tahapan": hapus milestone → dialog dengan tombol bertulisan jelas, lalu notifikasi hijau; gagal (matikan jaringan) → notifikasi merah dengan saran.

## 5. Paket kerja yang disarankan (berkas yang disentuh)
1. **Uji perilaku aksi** (L): `tests/ui/*` baru; `package.json` bila happy-dom disetujui. `LK-01`.
2. **A11y dan mobile** (S): `ui/PageHeader.tsx`, `ProjectHeader.tsx`, `TaskHeader.tsx`, `routes/app/project/*.tsx` (judul), `MemberPicker.tsx`, `DeadlineBadge.tsx`, `tests/ui/app-scale-safety.test.ts`. `LK-02` sampai `LK-05`.
3. **Bersih-bersih dan pecah berkas** (M): `FilterPopover.tsx`, `ReasonModal.tsx`, `projects-filters.ts`, `ProjectFilters.tsx` + `TaskFilters.tsx`, 3 service tugas, `tasks-api.ts`, `TaskForm.tsx`. `LK-06`, `LK-07`, `LK-09`.
4. **Kamus istilah dan docstring** (M): semua `*.copy.ts`, komponen tanpa docstring. `LK-08`, `LK-10`.
