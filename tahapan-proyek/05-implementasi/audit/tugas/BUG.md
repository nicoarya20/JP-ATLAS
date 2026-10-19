# BUG — Menu Tugas

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`. **Hanya yang berperilaku salah.** Kesesuaian wireframe, kepatuhan standar, salinan, kode mati, dan celah tes ada di [`PEMERIKSAAN.md`](PEMERIKSAAN.md). Bug lintas menu ada di [`../lintas/BUG.md`](../lintas/BUG.md).

**Bukti:** *Terkonfirmasi* = terbukti kode atau tes/skrip sementara; *Dugaan* = masuk akal dari kode, butuh dicoba di browser. **Status** semuanya `terbuka` sampai diperbaiki. Ukuran: S ≤ setengah hari, M ≈ 1-2 hari.

**Sudah diperbaiki, tidak dihitung:** filter **Proyek** di halaman Tugas tidak berpengaruh di tab "Tugas saya"/"Semua tugas" (commit `adbe0c9`). Audit memverifikasi perbaikannya benar di 3612 + 504 kombinasi filter (0 selisih).

| Tingkat | Jumlah |
|---|---|
| Kritis | 1 |
| Tinggi | 1 |
| Sedang | 8 |
| Rendah | 8 |
| **Total** | **18** (4 di antaranya dugaan) |

## Kritis

### T-01 — Tenggat tugas jadi "—" dan warna "terlambat" hilang
**Bukti:** Terkonfirmasi · **Status:** terbuka · **Ukuran:** S · **Akar sama dengan** [`PRJ-01`](../proyek/BUG.md)

- **Gejala:** baris tugas yang diambil klien menampilkan tenggat **"—"** (seharusnya mis. "5 Okt 2026 · terlambat 2 hari") dan kehilangan warna terlambat. Terjadi pada **semua baris "Tugas saya"** (selalu diambil klien tanpa seed), hasil ganti filter/urutan, "Tampilkan lebih banyak", kartu sorotan proyek, dan **header detail tugas setelah aksi pertama** (semua aksi meng-invalidate `taskKeys.all`, `staleTime` 30 detik). Hanya halaman pertama dari SSR yang benar.
- **Penyebab:** klien Eden mengubah teks `YYYY-MM-DD` dan ISO instan menjadi objek `Date` (`app/lib/eden.ts:13`, `treaty<Api>(baseUrl())` tanpa `parseDate:false`). `describeDue` memeriksa `ISO_DATE_RE.test(Date)` → gagal. Tes UI tidak menangkapnya karena memakai teks dan tidak melewati Eden.
- **Berkas dampak:** `app/components/ui/DateText.tsx`, `TaskRow.tsx:87-88`, `TaskHeader.tsx:102-103`, `TaskTable.tsx:52-57`, `TaskGroupList.tsx:25-27`, `app/lib/tasks-highlights.ts`.
- **Perbaikan:** `treaty<Api>(url, { parseDate: false })` (DTO sudah bertipe `string`); audit pembaca `Date` lain (HUTANG H-C15); tambah tes kontrak lewat Eden asli.

## Tinggi

### T-02 — Riwayat tugas salah tulis, bahkan bisa membuat seluruh riwayat error
**Bukti:** Terkonfirmasi · **Status:** terbuka · **Ukuran:** S (selesai oleh T-01 + tes)

- **Gejala 1:** riwayat menulis **"mengubah tenggat (dikosongkan)"** padahal tenggat diubah.
- **Gejala 2:** **komentar yang isinya hanya tanggal** (mis. `05/10/2026`, `2026-10-05`) menjadi `Date` → `splitLinks` melempar `text.matchAll is not a function` → bagian "Obrolan & riwayat" crash untuk **semua orang yang membuka tugas itu**. Judul atau langkah yang persis berupa tanggal berisiko sama (React child object).
- **Penyebab:** akibat T-01 pada payload `due_date_changed {from,to}` → `str()` mengembalikan null.
- **Berkas:** `app/components/tasks/task-timeline.ts:41-49,20-38`, `TimelineText.tsx`.
- **Perbaikan:** selesai oleh T-01; tambah tes untuk judul/komentar/langkah berbentuk tanggal.

## Sedang

| ID | Bukti | Gejala | Penyebab dan berkas | Perbaikan | Uk |
|---|---|---|---|---|---|
| T-03 | Terkonfirmasi | **Pemantau** (atau PM bukan anggota) melihat tombol "Tugas baru" **mati** dengan alasan *"Anda belum masuk proyek apa pun"*, yang salah. Wireframe ④: Pemantau tidak melihat tombol | `task-new.tsx:36-51` sudah membedakan "hanya melihat" dari "tanpa proyek"; daftar belum. `app/components/tasks/CreateTaskButton.tsx:28-35`, `app/routes/app/tasks.tsx:66` | Bedakan alasan (atau sembunyikan tombol) dengan pembeda yang sama seperti loader `task-new` | S |
| T-04 | Terkonfirmasi | **"Batal mulai" tidak ada di UI.** Tugas yang terlanjur "Mulai kerjakan" tidak bisa dikembalikan | Aksi ada di API, `ENABLED_TASK_ACTIONS`, diagram status 03-tugas §2, dan `can.unstart`, tetapi `NextStepBar` tidak punya tombolnya; `unstartTask` (`tasks-api.ts:182`) tak dipakai | Tambah aksi sekunder di `NextStepBar` dengan `can.unstart`, atau putuskan membuangnya dan catat di HUTANG | S |
| T-05 | **Dugaan** | Daftar → detail → **Ubah** → Simpan → **Kembali** membawa ke **form ubah**, bukan daftar. Buat tugas lalu Kembali → form kosong | Simpan memakai `navigate(detail)` tanpa `replace`; `BackLink` memakai `navigate(-1)`. Parameter `dari` (`BACK_PARAM`) tidak dipakai tautan mana pun. `task-edit.tsx:86-88`, `task-new.tsx:75-78`, `app/components/ui/BackLink.tsx:24-28` | `navigate(detail, { replace: true })` setelah simpan; pakai `?dari=` dari baris daftar atau hapus parameter mati | S |
| T-06 | Terkonfirmasi | Filter **Orang** hanya berisi 50 akun pertama (A-Z) dan **kosong untuk Member** (hanya "Saya"). Tim >50 orang: orang ke-51 dst. tak bisa dipilih. `?orang=<id>` di luar daftar menyaring tanpa isian yang terlihat | Diisi `pickPeople(limit 50)` yang hanya untuk yang boleh membuat proyek. `app/routes/app/tasks.tsx:52,68-72`, `server/team/picker.query.ts:20,70-72`. Daftar Proyek dipotong 100 (`tasks.tsx:27`), form tugas juga 100 | Isi Orang dari anggota proyek yang terlihat, atau cari di server, atau tampilkan nilai tak dikenal sebagai chip | M |
| T-07 | Terkonfirmasi | **Pengelola/Admin tidak bisa menghapus komentar orang lain lewat UI**, padahal server mengizinkan (moderasi D6) | Menu hapus hanya muncul untuk penulis (`own`). `TimelineItem.tsx:126`, `server/task/task-comment.service.ts:130-132` | Tampilkan "Hapus komentar" bila viewer Pengelola/Admin, lewat cap `can.moderateComment` dari server (bukan `role ===`) | S |
| T-10 | **Dugaan** | Di 375 px skala 1: judul tugas di baris "Tugas saya" **terpotong tinggal ±70 px** karena tombol "Mulai kerjakan" memakan ±240 px dari lebar isi ±320 px. Skala 1,25 dan 1,5 membungkus | Kolom kiri `flex:1; minWidth:0` bersaing dengan grup kanan `nowrap`. `app/components/tasks/TaskRow.tsx:101-111` | Taruh tombol di baris sendiri di bawah `sm`, seperti `TaskCard`; cek di browser | S |
| TD-01 | Terkonfirmasi | Anggota **dikeluarkan dari proyek**: "Tugas saya" miliknya di proyek itu **7 → 0**, padahal Pengelola masih melihat 7 tugas "Mengerjakan: <nama>". **Diturunkan jadi Pemantau**: tugasnya tetap di "Tugas saya"-nya tanpa tombol langkah. Dialog T2 hanya berkata "tidak bisa lagi melihat proyek ini". Juga `PRJ-09` di [proyek](../proyek/BUG.md) | `changeMemberRole`/`removeMember` tidak menyentuh `task`; `visibleTo` menyaring. `server/project/member.service.ts:129-166`, `server/task/task.sql.ts`, `projects.copy.ts:80-81`. Probe: `evidence-tugas-daftar/zz-audit-t1.test.ts` | Saat keluarkan/turunkan: kosongkan pengerja tugas terbuka (+ `logActivity`) atau minta Pengelola memilih; minimal sebut jumlah tugas di dialog; tes | M |
| TD-03 | **Dugaan** | "Tugas saya" dapat memicu **429 "Terlalu banyak request"** bagi semua orang di jaringan yang sama (keluarga di balik satu NAT) | Satu permintaan per kelompok (≤6) tiap mount/ganti filter; tiap `invalidateQueries(taskKeys.all)` memuat ulang semua halaman termuat. Batas bawaan 100 permintaan/menit **per IP**, semua pengguna. `TaskGroupList.tsx:26,90-97`, `server/middleware/rate-limiter.ts:67-82`, `server/env.ts:36` | Tanam kelompok di loader (T-20) atau satu rute `GET /tasks/grouped`; pertimbangkan batas per-pengguna untuk `/api/app` | M |

## Rendah

| ID | Bukti | Gejala | Penyebab dan berkas | Perbaikan | Uk |
|---|---|---|---|---|---|
| T-12 | Terkonfirmasi | Kursor tidak terikat urutan/filter: kursor `updated` diterima di urutan `created`, kursor dari filter lain juga diterima. Komentar kode mengklaim akan `BAD_CURSOR`. Klien web aman; hanya klien lain/API key terdampak | `server/task/task.sql.ts:165-172`, `task.query.ts:122`, `tests/task/task.query.test.ts:232` | Sisipkan nama urutan di kursor; tes `updated` ↔ `created` | S |
| T-14 | Terkonfirmasi | Modal **Batalkan**: label tetap "Catatan (boleh dikosongkan)" saat "Lainnya" dipilih padahal wajib; galat baru muncul saat kirim. Galat Batalkan/Buka lagi **tampil ganda** (toast + alert dalam dialog) | Label memakai `requireNote` global, bukan pilihan; `task-reason.ts` `settle` melempar ulang. `app/components/ui/ReasonModal.tsx` | Label mengikuti `chosen.requireNote`; satu kanal galat | S |
| T-18 | Terkonfirmasi | Penghapus tugas yang sudah **dikeluarkan atau diturunkan jadi Pemantau** masih boleh memulihkan; tugas kembali ke proyek yang tak ia ikuti lagi | `canRestoreTask`: `mine` lolos tanpa cek level. `server/access/trash.policy.ts:99-100` | Wajibkan level ≥ member, atau Pengelola/Admin | S |
| T-21 | Terkonfirmasi | Tugas dipindah ke Sampah oleh orang lain: refetch 404 tetapi **data lama tetap tampil tanpa pesan** | `app/routes/app/task-detail.tsx:55-60` | Tampilkan keadaan "tugas sudah tidak ada" saat refetch 404 | S |
| T-23 | Terkonfirmasi | Daftar **"Selesai"** default diurut tenggat naik (tertua dulu), bukan yang terbaru selesai | Urutan `due` untuk chip Selesai/Dibatalkan. `server/task/task.sql.ts` | Urutan bawaan per chip (terbaru dulu) | S |
| TD-04 | Terkonfirmasi | Kursor ditolak (`400 BAD_CURSOR`): **"Coba lagi" memanggil kursor yang sama dan gagal selamanya**; tak ada jalan muat ulang dari awal | `app/components/tasks/TaskListView.tsx:111-118`, `app/lib/tasks-api.ts` `fetchTasks` | Pada `BAD_CURSOR` → `refetch` dari awal (hapus halaman) | S |
| TD-05 | Terkonfirmasi | Filter Proyek = X lalu **"+ Tugas baru"** membuka formulir **tanpa proyek X terisi** (di tab proyek terisi lewat `?proyek=`). Server tetap memeriksa hak | `newTaskInProject` ada tapi tak dipakai. `app/routes/app/tasks.tsx:90,98`, `CreateTaskButton.tsx` | Bila `filters.proyek` ada dan boleh ditambahi, arahkan ke `newTaskInProject(id)` | S |
| TD-08 | **Dugaan** | Nilai `proyek`/`orang` di URL yang tak ada di pilihan (proyek ke-101, orang keluar, tautan bagikan): **kolom tampak kosong padahal filter aktif**; daftar kosong + "Hapus saringan" | Pilihan Proyek dipotong 100 dan Orang 50 tanpa pemberitahuan. `app/routes/app/tasks.tsx:27,47,52`, `TaskFilterSelects.tsx:60-86` | Tambahkan nilai URL ke `data` sebagai "(proyek lain)"; atau cari di server | S |

## Urutan perbaikan yang disarankan (paket tanpa tumpang tindih)

1. **Eden** — T-01, T-02 (sembuh bersama [`PRJ-01`](../proyek/BUG.md)). Berkas: `app/lib/eden.ts` + tes kontrak lewat Eden asli. **Kerjakan paling dulu**, ukuran S.
2. **Anggota dan tugas** — TD-01 (bersama `PRJ-09`), T-18. Berkas: `server/project/member.service.ts`, `projects.copy.ts`, `server/access/trash.policy.ts`, tes `tests/project/member.service.test.ts`.
3. **Daftar: tombol, kursor, filter** — T-03, T-06, T-12, T-23, TD-04, TD-05, TD-08. Berkas: `routes/app/tasks.tsx`, `CreateTaskButton.tsx`, `TaskFilterSelects.tsx`, `TaskListView.tsx`, `server/task/task.sql.ts`, `task.query.ts`, `server/team/picker.query.ts`.
4. **Detail dan alur** — T-04, T-05, T-07, T-14, T-21. Berkas: `NextStepBar.tsx`, `TimelineItem.tsx`, `task-edit.tsx`, `task-new.tsx`, `BackLink.tsx`, `ReasonModal.tsx`, `task-detail.tsx`.
5. **Beban dan tata letak** — TD-03, T-10. Berkas: `TaskGroupList.tsx`, `routes/app/tasks.tsx` (bentrok dengan paket 3: kerjakan berurutan), `TaskRow.tsx`.
