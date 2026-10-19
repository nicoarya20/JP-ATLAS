# AUDIT — Menu Proyek dan menu Tugas

> Dibuat 19 Oktober 2026 pada `feature/project-management` @ `161def2` (setelah S5a dan menu Tugas digabung). **Hanya membaca dan melapor**: tidak ada kode produk yang diubah. Perbaikan dikerjakan terpisah setelah disetujui. Daftar semua yang belum dibangun ada di [`../HUTANG.md`](../HUTANG.md); berkas ini khusus **yang sudah dibangun tetapi bermasalah**.

## Struktur

| Folder | Isi |
|---|---|
| [`proyek/`](proyek/) | [`BUG.md`](proyek/BUG.md) (yang berperilaku salah) · [`PEMERIKSAAN.md`](proyek/PEMERIKSAAN.md) (yang diperiksa, yang lolos, temuan non-bug, celah tes, cek manual) |
| [`tugas/`](tugas/) | [`BUG.md`](tugas/BUG.md) · [`PEMERIKSAAN.md`](tugas/PEMERIKSAAN.md) |
| [`lintas/`](lintas/) | [`BUG.md`](lintas/BUG.md) · [`PEMERIKSAAN.md`](lintas/PEMERIKSAAN.md) (hal yang berlaku untuk kedua menu: mobile, aksesibilitas, kualitas kode, cakupan tes) |
| [`sumber/`](sumber/) | Laporan mentah para worker audit, dipertahankan untuk telusur bukti |

**Cara membedakan:** `BUG.md` = sesuatu **rusak** (tampilan salah, aksi gagal, data keliru, kontrak dilanggar). `PEMERIKSAAN.md` = **hasil pemeriksaan**: apa yang sudah diuji dan lolos, selisih dari wireframe, kepatuhan standar CLAUDE.md, salinan teks, kode mati, dan celah tes. Satu temuan hanya ada di satu tempat; ID asli dari laporan sumber dipertahankan agar bisa ditelusuri.

## Ringkasan angka

| | Kritis | Tinggi | Sedang | Rendah | Total |
|---|---|---|---|---|---|
| **Bug** (`BUG.md`, 3 folder) | 2* | 4 | 19 | 15 | **40** |
| **Non-bug** (`PEMERIKSAAN.md`) | 0 | 1 | 6 | 29 | **36** |

\* Dua temuan kritis adalah **satu akar masalah yang sama** (`PRJ-01` di Proyek dan `T-01` di Tugas: klien Eden mengubah tanggal menjadi `Date`), jadi sekitar 75 temuan unik. Dari 40 bug, 8 berstatus **dugaan** (butuh dicoba di browser).

| Folder | Bug | Non-bug |
|---|---|---|
| `proyek/` | 20 | 14 |
| `tugas/` | 18 | 14 |
| `lintas/` | 2 | 8 |

## Yang paling perlu ditangani lebih dulu

1. **`PRJ-01` / `T-01` — bug Eden** (kritis, ukuran S, satu perbaikan). Tenggat tampil "—" di daftar proyek dan tugas setelah data diambil klien, Gantt kosong, ubah milestone ditolak, dan riwayat tugas bisa error total (`T-02`). Terbukti oleh tiga audit terpisah.
2. **`PD-01`** — satu salah ketik tahun (mis. 2062) membuat Gantt macet bagi semua orang; server menerima tahun 9999.
3. **`PRJ-02`** — header proyek tidak berubah setelah "Ubah proyek".
4. **`LK-01`** — tidak ada tes perilaku untuk aksi UI; itu sebabnya bug-bug di atas lolos.
5. **`PRJ-05`** — API key masih bisa mengubah tenggat lewat `PATCH`/`status`, padahal `extend-deadline` diblokir (butuh keputusan H-G1).
6. **`TD-01` / `PRJ-09`** — anggota yang dikeluarkan atau diturunkan tetap menjadi pengerja tugasnya.

## Status

Semua temuan berstatus **terbuka** (belum diperbaiki), kecuali satu yang sudah selesai sebelum audit ini: filter Proyek di halaman Tugas (`adbe0c9`). Saat memperbaiki, ubah kolom/baris **Status** di `BUG.md` terkait dan tulis hash commit-nya.

## Keterbatasan audit (jujur)

- **Tanpa browser** (aturan global melarang tanpa perintah). Semua yang visual masuk "Dugaan" atau daftar *Perlu dicek manual di browser* di tiap `PEMERIKSAAN.md`.
- **Penpot tidak tersambung**: kesesuaian wireframe dibaca dari dokumen (`P3`, `diskusi/02-proyek.md`, `03-tugas.md`), bukan dari gambar.
- **Audit pertama dihentikan** setelah 4 jam karena tak menghasilkan laporan; hasil mentahnya diselamatkan di `sumber/audit1-*`. Akibatnya **detail proyek** (matriks wireframe ⑧-⑪, standar UX tiap aksi tulis) dan **form/detail tugas** diaudit kurang dalam dibanding daftar. Dua paket susulan (`proyek-detail`, `tugas-detail`) sempat disiapkan tetapi tidak diluncurkan. Bagian ini tercantum di "Belum diaudit" tiap `PEMERIKSAAN.md`.
- Tes dan skrip sementara untuk membuktikan dugaan sudah dihapus dari repo; salinannya ada di `/tmp/audit/evidence-*` dan bisa hilang saat mesin direstart.

## Urutan perbaikan yang disarankan (paket paralel)

| # | Paket | Temuan | Menyentuh | Ukuran |
|---|---|---|---|---|
| 1 | **Eden** (kerjakan dulu, sendirian) | `PRJ-01`, `T-01`, `T-02`, `PRJ-03`, `PRJ-04` | `app/lib/eden.ts` + tes kontrak lewat Eden asli | S |
| 2 | Gantt aman | `PD-01` | `project.service.ts`, `app-projects.write.ts`, `GanttRow.tsx`, `GanttHeader.tsx`, `gantt-layout.ts`, `ProjectForm.tsx`, `QuickDates.tsx` | M |
| 3 | Daftar proyek: teks, urutan, halaman, navigasi | `PD-02..06`, `PRJ-07`, `PRJ-08`, `PRJ-12`, `PRJ-17` | `projects.tsx`, `ProjectCard.tsx`, `DateText.tsx`, `project-list.query.ts`, `ProjectHeader.tsx` | M |
| 4 | Detail proyek | `PRJ-02`, `PRJ-06`, `PRJ-11`, `PRJ-20` | `useProjectActions.tsx`, `usePlanActions.tsx`, `AddMemberModal.tsx`, `members.tsx`, `settings.tsx` | S |
| 5 | Anggota dan tugas | `PRJ-09`, `TD-01`, `T-18`, (`PRJ-05` setelah H-G1) | `member.service.ts`, `trash.policy.ts`, `scopes.pm.ts` | M |
| 6 | Daftar tugas | `T-03`, `T-06`, `T-12`, `T-23`, `TD-04`, `TD-05`, `TD-08` | `routes/app/tasks.tsx`, `CreateTaskButton.tsx`, `TaskFilterSelects.tsx`, `task.sql.ts`, `task.query.ts` | M |
| 7 | Detail dan alur tugas | `T-04`, `T-05`, `T-07`, `T-14`, `T-21` | `NextStepBar.tsx`, `TimelineItem.tsx`, `task-edit.tsx`, `BackLink.tsx`, `ReasonModal.tsx` | M |
| 8 | A11y dan mobile | `LK-02`, `LK-04`, `PRJ-24`, `T-10`, `LK-03`, `LK-05` | `PageHeader.tsx`, `ProjectHeader.tsx`, `TaskHeader.tsx`, `MemberPicker.tsx`, `TaskRow.tsx`, `app-scale-safety.test.ts` | S |
| 9 | Tes perilaku aksi UI | `LK-01`, `TD-02` | `tests/ui/*` baru (happy-dom butuh persetujuan dependency) | L |

Paket 3 dan 6 sama-sama menyentuh `projects.copy.ts`/`tasks.tsx`: kerjakan berurutan, bukan paralel. Paket lain saling lepas.
