# AUDIT T1 — Tugas: DAFTAR, filter, tab Tugas proyek (`tugas-daftar`)

Cabang `audit/pm-tugas-daftar` (kepala `161def2`). Dimensi 2, 5, 6 + 1 (hanya daftar). Hanya baca; tak ada kode produk diubah.
**Dasar sehat:** 163 tes lulus (`tasks-filters`, `task.query`, `api/tasks`, `ui/tasks-page`, `ui/project-tasks-tab`, `app-routes`), 0 gagal. Probe baru: matriks 504 kombinasi status × prioritas × orang × cari (`%`, `_`, `#7`, `7`, judul) × urutan (due/priority), jalan keyset limit 3 = oracle memori → **0 selisih, 0 ganda** (menambah matriks lama yang 3612 kombinasi lingkup/proyek/tenggat/urutan). Rute/guard/meta/`can{}` beres.
**Temuan baru: 9 (Kritis 0, Tinggi 0, Sedang 3, Rendah 6)** — terkonfirmasi 6, dugaan 3. Tak ada kontrol daftar yang mati atau parameter yang hilang di tengah.
**Wajib didahulukan (sudah diketahui, bukan temuan baru):** `T-01`/H-C15 (Eden `treaty` tanpa `parseDate:false`, `app/lib/eden.ts:13`) masih ada: kolom/teks **Tenggat** tiap baris yang diambil klien (semua baris "Tugas saya" berkelompok, serta tabel setelah ganti saringan atau "Tampilkan lebih banyak") jadi "—"; hanya halaman pertama dari SSR yang benar. Dampaknya paling besar ke daftar ini.

## Temuan

| ID | Tingkat | Tk/D | Berkas:baris | Bukti singkat | Saran | Uk |
|---|---|---|---|---|---|---|
| TD-01 | Sedang | Terkonfirmasi | `server/project/member.service.ts:129-166` (`changeMemberRole`, `removeMember` tanpa menyentuh `task`); `server/task/task.sql.ts` `visibleTo`; `app/components/projects/projects.copy.ts:80-81` | Probe (`evidence-tugas-daftar/zz-audit-t1.test.ts`): anggota dikeluarkan dari proyek → `Tugas saya` di proyek itu **7 → 0** untuknya, padahal `scope=all` oleh Pengelola masih menampilkan 7 tugas "Mengerjakan: <nama>"; diturunkan jadi Pemantau → 1 tugas Belum dikerjakan tetap di "Tugas saya"-nya tanpa tombol langkah (`primary` null). Dialog T2 hanya berkata "Ia tidak bisa lagi melihat proyek ini" (tanpa dampak ke tugas). Tidak ada di HUTANG | Saat keluarkan/turunkan: kosongkan pengerja tugas terbuka (+ `logActivity`) atau minta Pengelola memilih; minimal sebut jumlah tugasnya di dialog (aturan T2 "sebut dampak"); tes | M |
| TD-02 | Sedang | Terkonfirmasi | `tests/ui/*` (semua `renderToStaticMarkup`, `tests/support/render-ui.tsx`); handler di `TaskFilters.tsx:70-141`, `TaskFilterSelects.tsx:64-97` | Tak ada tes yang menjalankan kontrol: lingkup→hapus `orang`, chip status→hapus `tenggat`, debounce cari, "Hapus saringan", `Select` bernilai `''`. Bug `adbe0c9` hanya tertangkap di sisi server. Hanya parse/`toTaskQuery` murni yang teruji | Ekstrak pembuat patch (`scopePatch`, `statusPatch`) jadi fungsi murni + tes; tes klik butuh jsdom/testing-library (**dependency baru: minta persetujuan**) | M |
| TD-03 | Sedang | Dugaan | `app/components/tasks/TaskGroupList.tsx:26,90-97`; `server/middleware/rate-limiter.ts:67-82`; `server/env.ts:36` | "Tugas saya" mengirim **satu permintaan per kelompok (≤6)** tiap mount/ganti saringan; tiap `invalidateQueries(taskKeys.all)` (Mulai kerjakan, centang, dll.) memuat ulang semua halaman yang termuat. Batas bawaan 100 permintaan/menit **per IP, semua pengguna** satu jaringan (keluarga di balik satu NAT). Kena batas → 429 "Terlalu banyak request" untuk semua orang di IP itu | Tanam kelompok di loader (T-20) atau satu rute `GET /tasks/grouped`; pertimbangkan batas per-pengguna untuk `/api/app` | M |
| TD-04 | Rendah | Terkonfirmasi | `app/components/tasks/TaskListView.tsx:111-118`, `app/lib/tasks-api.ts:fetchTasks` | Kursor ditolak (`400 BAD_CURSOR`, mis. kursor basi/format beda): tombol "Coba lagi" memanggil `fetchNextPage()` dengan kursor yang sama → gagal selamanya; tak ada jalan "muat ulang dari awal" meski pesan server menyuruhnya. (Penerimaan kursor lintas urutan: sudah T-12) | Pada `BAD_CURSOR` → `refetch` daftar dari awal (hapus halaman) | S |
| TD-05 | Rendah | Terkonfirmasi | `app/routes/app/tasks.tsx:90,98`; `CreateTaskButton.tsx` (`NEW_TASK_PATH`); `newTaskInProject` ada tapi tak dipakai di sini | Saringan Proyek = X lalu "+ Tugas baru"/"Tugas baru" di keadaan kosong membuka formulir **tanpa** proyek X terisi (di tab proyek terisi lewat `?proyek=`). Server tetap memeriksa hak, jadi aman | Bila `filters.proyek` ada dan proyek itu boleh ditambahi, arahkan ke `newTaskInProject(id)` | S |
| TD-06 | Rendah | Terkonfirmasi | `server/task/task.limits.ts:11-12` (komentar) vs `server/api/app-tasks.schema.ts:36`, `task.query.ts:47`; tes `tests/api/tasks.test.ts:176` | Komentar berkata cari panjang "dipotong, bukan ditolak", tetapi skema `maxLength: 100` menjawab `GET /tasks?q=<101 huruf>` **422** (tes API memang mengunci 422; probe `evidence-tugas-daftar/eden-array.ts`). UI aman (klien memotong di `parseTaskFilters`); `.slice` di `filtersOf` jadi kode mati. Hanya komentar yang menyesatkan | Perbaiki komentar (perilaku 422 sudah diuji) dan buang `.slice` mati | S |
| TD-07 | Rendah | Terkonfirmasi | `app/components/tasks/tasks.copy.ts:49,110`; `server/access/project.policy.ts:103-111` | "Tugas dari proyek yang Anda ikuti" dipakai juga untuk PM dan Admin, yang di "Semua tugas" melihat **semua** proyek hidup (`EXPECTED_COUNT` pada `tests/task/task.visibility.test.ts`) | Salinan netral ("Tugas dari proyek yang bisa Anda lihat") atau menurut `can{}` | S |
| TD-08 | Rendah | Dugaan | `app/routes/app/tasks.tsx:27,47,52`; `TaskFilterSelects.tsx:60-86` | Pilihan Proyek dipotong 100 dan Orang 50 tanpa pemberitahuan (Orang kosong untuk Member = T-06). Nilai `proyek`/`orang` di URL yang tak ada di pilihan (proyek ke-101, orang keluar, tautan bagikan) membuat kolom **tampil kosong padahal saringan aktif**; daftar kosong + "Hapus saringan" | Tambahkan nilai URL ke `data` sebagai pilihan "(proyek lain)"; atau cari pelayan-sisi | S |
| TD-09 | Rendah | Dugaan | `app/routes/app/tasks.tsx:41-43,52` | Loader "Tugas saya" menjalankan `listTasks(limit 1)` hanya demi `caps.createTask`, dan `pickPeople(50)` untuk semua peran (Member selalu mendapat daftar kosong). Tiap muat halaman = 4 kueri paralel ekstra, lalu ≤6 permintaan klien | Fungsi `createTaskCap` yang diekspor; lewati `pickPeople` bila tak berhak | S |

Catatan: filter **Orang** tak punya pilihan "Belum ada yang mengerjakan" padahal `assigneeId` boleh kosong (ide, bukan selisih wireframe).

## Alur kontrol (URL → query klien → API → SQL), semua terverifikasi

| Kontrol | URL | Berkas yang dilalui | Hasil |
|---|---|---|---|
| Lingkup Tugas saya/Semua | `lingkup` | `tasks-filters.ts:73,120` → `app-tasks.ts:33-46` → `filtersOf` `eq(assigneeId)` / `visibleTo` | OK; ganti ke "saya" membersihkan `orang` |
| Cari judul/`#12` | `q` | `toTaskQuery` trim → `taskSearch` (`ilike` + `number=`), `%`/`_`/`\` literal | OK (matriks 0 selisih); TD-06 |
| Chip status | `status` | `STATUS_SLUGS` → `inArray(status)` | OK; chip Selesai/Dibatalkan menghapus `tenggat` |
| Proyek | `proyek` | `projectId` di semua lingkup (`adbe0c9`, `task.query.ts:47-51`) | OK semua kombinasi (lama 3612 + baru) |
| Orang | `orang` | `personApplies`; `saya`→id; basi di "Tugas saya" diabaikan | OK; TD-08 untuk nilai di luar pilihan |
| Prioritas multi | `prioritas` | `readList` valid-saja → `priority[]` → `inArray` | OK |
| Tenggat | `tenggat` | `dueApplies` → `due` → `inGroup` | OK; hilang untuk Selesai/Dibatalkan |
| Urutan | `urut` | `SORTS` + kursor `afterCursor` (due/priority/updated/created) | OK; T-23 (default Selesai = tenggat naik) sudah diketahui |
| Hapus saringan / `hasTaskFilters` | — | `TASK_NARROWING_PARAMS` memuat 6 kunci; `lingkup`/`urut` tetap | OK konsisten |
| Kunci cache | — | `taskKeys.list(query)` memuat seluruh `query` (+`due` per kelompok); hitungan memang tak bergantung saringan (header kelompok memakai baris termuat bila `filtered`) | OK; seed dipakai hanya bila `JSON.stringify(query)` sama |
| Tab proyek | — | `lockedProjectId` menimpa `lingkup`/`proyek`; `orang` berlaku; `listProjectMembers` untuk pilihan | OK |

**Hak/rute:** `requireUser` pernyataan pertama di kedua loader; tab proyek 404 identik lewat `getProjectDetail`; `canCreate` dari `caps.createTask`/`project.can.createTask` (tak ada `role ===`); `GET /api/app/tasks*` terpetakan ke `app:read` (`scopes.ts:187`), Pemantau/PM/Admin/Member diuji `task.visibility.test.ts` (8 persona, SQL = oracle). Indeks: `task_assignee_id_status_due_date_idx` melayani "mine"; "Semua tugas" dan `ilike %q%` urut tanpa indeks khusus (pindai berurut; aman untuk skala tim keluarga, catat bila tugas >10 ribu). Tak ada N+1 (people/membership/reviewer pool 1 kueri tiap).

## Perlu dicek manual di browser
1. `/app/tasks` → "Tugas saya": apakah tiap baris menampilkan tenggat atau "—" (T-01).
2. Pilih Proyek lalu "Semua proyek" lagi, serta "Siapa saja"/"Semua tenggat": nilai `''` di Select Mantine benar-benar menghapus saringan dan label kembali (TD-02).
3. Ketik cepat di "Cari tugas" lalu langsung ubah chip/Proyek: huruf tak hilang, tak ada kedipan balik (resync `TaskFilters.tsx:63`).
4. Buka `/app/tasks?proyek=bukan-id` dan `?lingkup=semua&orang=bukan-id`: kolom tampak kosong? ada "Hapus saringan"? (TD-08).
5. Saringan Proyek A → klik "Tugas baru": proyek terisi? (TD-05).
6. Tab Tugas proyek (Pemantau, PM non-anggota, Member): tombol "Tambah tugas" dan pilihan Orang.
7. "Tampilkan lebih banyak" di "Semua tugas" (>30 tugas), ganti urutan di tengah: tak ada baris ganda.
8. Kecepatan: ganti 5 chip berturut-turut di "Tugas saya" lalu cek ada toast 429 (TD-03).

## Di luar cakupan (dicatat, tidak diselidiki)
Kolom Tahapan/nomor (#) di baris (H-C12); `T-06` pilihan Orang Member kosong; `T-12` kursor lintas urutan; `T-23` urutan Selesai; target sentuh/skala teks baris (T-08, T-10); detail tugas/form/Tulis saja; `projectKeys` tak ikut di-invalidate saat tugas dimulai/selesai (progres proyek menunggu 30 dtk, hanya `useTaskDelete` melakukannya).

## Paket perbaikan yang disarankan
1. **Eden Date** (S, prioritas 1, T-01): `app/lib/eden.ts`, tes kontrak. Tidak bentrok.
2. **Anggota dan tugas** (M, TD-01): `server/project/member.service.ts`, `app/components/projects/projects.copy.ts` (+ tes `tests/project/member.service.test.ts`).
3. **Daftar: salinan, tombol, kursor** (S, TD-04/05/07/08): `TaskListView.tsx`, `tasks.copy.ts`, `routes/app/tasks.tsx`, `TaskFilterSelects.tsx`.
4. **Server kecil + beban** (M, TD-03/06/09): `app-tasks.schema.ts`, `task.limits.ts`, `task.query.ts`, `TaskGroupList.tsx`, `routes/app/tasks.tsx` (bentrok dengan paket 3 di `tasks.tsx`: kerjakan berurutan).
5. **Tes kontrol saringan** (M, TD-02): berkas tes baru + ekstraksi `TaskFilters.tsx` (tunggu keputusan dependency).
