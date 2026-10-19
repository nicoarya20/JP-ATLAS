# BUG — Menu Proyek

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`. **Hanya yang berperilaku salah**: sesuatu yang dilihat atau dialami pengguna rusak, atau kontrak yang dijanjikan tidak ditepati. Kesesuaian wireframe, kebersihan kode, salinan teks, dan celah tes ada di [`PEMERIKSAAN.md`](PEMERIKSAAN.md). Bug lintas menu ada di [`../lintas/BUG.md`](../lintas/BUG.md). Bug pada daftar tugas yang sama akarnya ada di [`../tugas/BUG.md`](../tugas/BUG.md).

**Bukti:** *Terkonfirmasi* = terbukti oleh kode atau tes/skrip sementara; *Dugaan* = masuk akal dari kode tetapi butuh dicoba di browser. **Status** semuanya `terbuka` sampai diperbaiki; ubah kolom ini saat dikerjakan. Ukuran: S ≤ setengah hari, M ≈ 1-2 hari, L lebih.

| Tingkat | Jumlah |
|---|---|
| Kritis | 1 |
| Tinggi | 3 |
| Sedang | 10 |
| Rendah | 6 |
| **Total** | **20** (3 di antaranya dugaan) |

## Kritis

### PRJ-01 — Tenggat jadi "—" dan Gantt kosong setelah data diambil klien
**Bukti:** Terkonfirmasi · **Status:** terbuka · **Ukuran:** S · **Akar sama dengan** [`T-01`](../tugas/BUG.md) (satu perbaikan untuk keduanya)

- **Gejala:** halaman pertama (dari server) benar, tetapi begitu daftar diambil klien (cari, ganti filter/tampilan, "Tampilkan lebih banyak", kembali setelah invalidasi) kolom **Tenggat** menjadi "—" dan **Gantt kosong** (semua proyek masuk "Belum ada tanggal").
- **Penyebab:** klien Eden 1.4.9 mengubah teks `YYYY-MM-DD` menjadi objek `Date` (regex di `node_modules/@elysiajs/eden/dist/chunk-I5KHAGLL.mjs`). Kode yang memeriksa tanggal sebagai teks lalu gagal: `describeDue` → "—", `isIso(Date)` false, `layoutGantt` → 0 baris.
- **Berkas:** `app/lib/eden.ts:13`, `app/lib/projects-api.ts:78-80`, `app/components/ui/DateText.tsx:45`, `app/components/projects/gantt-dates.ts:34`.
- **Perbaikan:** `treaty<Api>(url, { parseDate: false })` (opsi ada di kode Eden; verifikasi) + tes kontrak lewat fetcher palsu yang melewati Eden asli. Audit pembaca `Date` lain (HUTANG H-C15).

## Tinggi

### PRJ-02 — Header proyek tidak berubah setelah "Ubah proyek"
**Bukti:** Terkonfirmasi (kode + tes) · **Status:** terbuka · **Ukuran:** S

- **Gejala:** setelah mengubah nama/status/tenggat proyek, atau mencentang milestone, header (nama, status, tenggat, kondisi) tetap versi lama sampai halaman dimuat ulang.
- **Penyebab:** header dari loader `layout`; React Router tidak menjalankan ulang loader induk saat berpindah antar-anak (tes `createMemoryRouter`: hitungan loader layout tetap). Hanya `useRefreshProject` memanggil `revalidate()`.
- **Berkas:** `app/routes/app/project/layout.tsx:24-35`, `useProjectActions.tsx:28`, `plan/usePlanActions.tsx:33`, `app/routes/app/project/settings.tsx:49-51`.
- **Perbaikan:** pakai `useRefreshProject` di `useProjectActions` dan `usePlanActions`.

### PD-01 — Satu salah ketik tahun membuat Gantt macet bagi semua orang
**Bukti:** Terkonfirmasi · **Status:** terbuka · **Ukuran:** M

- **Gejala:** tenggat bertahun ekstrem (mis. 2062 untuk 2026, atau 9999) membuat Gantt tidak terbaca atau membeku.
- **Penyebab:** server menerima tahun apa pun (tes: `POST /projects` `dueDate 9999-12-31` → 201). `layoutGantt` untuk 2026-10 s/d 9999-12 menghasilkan **95.679 bulan**; `GanttRow` menggambar satu `Box` garis per bulan **per baris** (100 baris × 879 bulan = 87.900 node untuk tahun 2099, ≈9,5 juta untuk 9999). Lebar lini waktu terkunci 240 rem, jadi label bulan terpotong dan batang proyek lain mengecil ke 0,6%.
- **Berkas:** `server/api/app-projects.write.ts:26`, `server/project/project.service.ts:67-71`, `GanttRow.tsx:171`, `gantt-layout.ts:25,169`.
- **Perbaikan:** batasi tahun di server dan `DateInput` (mis. 2000-2100, pesan Indonesia); gambar garis bulan sekali (CSS `repeating-linear-gradient` atau satu lapisan), bukan per baris; batasi jumlah bulan yang digambar.

### PRJ-03 — "Ubah milestone" ditolak server setelah daftar dimuat ulang
**Bukti:** Dugaan (422 terbukti lewat tes, jalur UI perlu browser) · **Status:** terbuka · **Ukuran:** S · bergantung PRJ-01

- **Gejala:** mengubah milestone yang sudah ada gagal dengan galat validasi.
- **Penyebab:** setelah refetch Eden, `m.dueDate` berupa `Date`; form mengirim ISO penuh, sedangkan server menuntut `^\d{4}-\d{2}-\d{2}$`. Tes sementara: PATCH → 422 `VALIDATION`.
- **Berkas:** `plan/plan-form.ts:52-54,110`, `server/api/app-projects.plan.ts:59`, `plan/MilestoneForm.tsx:56-64`.
- **Perbaikan:** selesai oleh PRJ-01; paksa string tanggal di `toMilestoneInput`.

## Sedang

| ID | Bukti | Gejala | Penyebab dan berkas | Perbaikan | Uk |
|---|---|---|---|---|---|
| PRJ-04 | Terkonfirmasi | Lencana milestone **"Terlewat" hilang** setelah data dimuat ulang | `m.dueDate < today` membandingkan `Date` dengan teks, hasilnya `false` (`plan/plan-view.ts:39`, `plan/MilestoneList.tsx:82`) | Sembuh dengan PRJ-01 | S |
| PRJ-05 | Terkonfirmasi | **API key masih bisa mengubah tenggat** tanpa riwayat, dan membatalkan proyek. `extend-deadline` sengaja ditolak untuk kunci, tetapi jalan lain terbuka | `PATCH /projects/:id {dueDate}` dan `POST …/status` lolos scope `app:write` (`requiredScope` → `app:write`, dicoba). `server/api-keys/scopes.pm.ts:52-58`, `server/api/app-projects.write.ts:51-60,92`, `tests/api-keys/scopes.projects.test.ts:20-21` | Putuskan HUTANG H-G1; tutup `dueDate` di PATCH dan/atau tolak PATCH/status untuk kunci | M |
| PRJ-06 | Terkonfirmasi (kode) | Setelah menulis tugas (mulai, selesai, centang), **progres dan kondisi proyek basi** di daftar (cache 30 detik) dan header | Tulis tugas hanya menginvalidasi `taskKeys.all`; hanya `useTaskDelete` menyegarkan `projectKeys.all`. `app/components/tasks/useTaskWrite.ts:71`, `useTaskBodyActions.ts:19,48`, `useTaskActions.tsx:35`, `app/lib/query.tsx:8` | Invalidasi `projectKeys.all` + `revalidate` (koordinasi dengan menu Tugas) | S |
| PRJ-07 | Terkonfirmasi | PM/Admin yang belum jadi anggota proyek apa pun membuka **"Proyek saya"** dan melihat *"Belum ada proyek. Buat proyek pertama Anda."* padahal "Semua proyek" berisi | `emptyKind` memberi `creator` untuk daftar kosong. Tes: `mine.total=0`, `all.total≥1`. `app/routes/app/projects.tsx:132-141`, `ProjectEmpty.tsx:14-22`, `app/lib/projects-filters.ts:146-149` | Pesan khusus saat `lingkup=saya` kosong dan `canSeeAll`, mis. tautan ke "Semua proyek" | S |
| PRJ-08 | Terkonfirmasi | Urutan **"Tenggat terdekat" menaruh proyek lama yang sudah Selesai di atas** proyek berjalan; halaman pertama dan Gantt didominasi proyek lama | `due_date ASC NULLS LAST` tanpa melihat status. Tes: proyek Selesai tenggat 2025 muncul sebelum Berjalan tenggat Nov 2026. `server/project/project-list.query.ts:57-62` | Aktif dengan tenggat ≥ hari ini dulu; Selesai/Dibatalkan di akhir; Gantt bawaan tanpa keduanya | M |
| PRJ-09 | Terkonfirmasi | Anggota **dikeluarkan atau diturunkan jadi Pemantau tetap menjadi pengerja tugas** miliknya; dialog tidak menyebut dampak. Lihat juga `TD-01` di [tugas](../tugas/BUG.md) | `removeMember` dan `changeMemberRole` tidak menyentuh `task.assignee_id` (tes: tugas tetap miliknya). `server/project/member.service.ts:129-166` | Lepas atau minta pilih pengganti dalam transaksi yang sama; sebut jumlah tugas di dialog T2 | M |
| PRJ-11 | **Dugaan** | Di modal **Tambah anggota**: setelah memilih orang, kolom teks bisa kosong padahal pilihan terisi, atau opsi hilang | `searchValue` terkendali berubah menjadi label "Nama · Jabatan" lalu ikut menjadi `q` → opsi kosong → nilai terpilih tak ada di `data`. `AddMemberModal.tsx:55-79` | Cek di browser; kirim query hanya dari ketikan pengguna | S |
| PD-02 | Terkonfirmasi | Proyek **Selesai/Dibatalkan menampilkan "terlambat 48 hari"** di teks tenggat. Karena urutan bawaan (PRJ-08), halaman pertama penuh "Selesai · terlambat N hari" | Proyek selesai hanya kehilangan warna merah, teks tetap dibangun `describeDue('2026-09-01','2026-10-19')` → "1 Sep 2026 · terlambat 48 hari". `ProjectCard.tsx:46-49`, `ui/DateText.tsx:44-52,66`. Tidak ada tes untuk `settled` | Untuk `settled`, tampilkan tanggal saja atau "selesai"; tambah tes | S |
| PD-03 | Terkonfirmasi (API); efek UI dugaan | "Tampilkan lebih banyak" bisa memunculkan **baris ganda** dan melewatkan proyek bila data berubah di antara dua halaman | Paginasi `OFFSET`. Tes: 5 proyek, `sort=recent`, `limit=2`; setelah halaman 1 proyek terlama diedit orang lain → gabungan = `P4,P3,P3,P2` (P3 ganda, P0 terlewat). `items = flatMap` tanpa dedup, `getRowKey = p.id` → kunci React ganda. Terjadi juga pada urut tenggat. `app-projects.ts:41-47`, `project-list.query.ts:57-62`, `projects.tsx:80-86,97`, `ProjectList.tsx:55` | Minimal dedup per `id` saat `flatMap` (S); lebih baik paginasi kursor (M) | S |
| PD-04 | Terkonfirmasi (kode) | **"Kembali ke daftar proyek" membuang saringan dan tampilan**: pilih Gantt + "Semua proyek" + status, buka proyek, kembali → List "Proyek saya" polos | Tautan kembali memakai `/app/projects` polos; komentar header melarang `navigate(-1)` tetapi query daftar tidak disimpan. `ProjectHeader.tsx:68-78`, `project-new.tsx:21,48,80`, `useTrashActions.ts:19,56` | Simpan query daftar terakhir (`sessionStorage` atau `state` rute) dan pakai di tautan kembali | S |

## Rendah

| ID | Bukti | Gejala | Penyebab dan berkas | Perbaikan | Uk |
|---|---|---|---|---|---|
| PRJ-12 | Terkonfirmasi | Saat memuat gagal tanpa cache, muncul **alert merah dan "Belum ada proyek" bersamaan** | `keepPreviousData` tanpa penanda memuat. `app/routes/app/projects.tsx:89,114-143` | Tampilkan `isPlaceholderData`; sembunyikan empty state saat `isError` | S |
| PRJ-17 | Terkonfirmasi | `?hal=3` tidak berpengaruh; daftar selalu halaman 1 | Parameter `hal` diurai tetapi tidak dipakai. `app/lib/projects-filters.ts:93,141`, `app/routes/app/projects.tsx:41` | Hapus `hal` | S |
| PRJ-20 | Terkonfirmasi | Judul tab browser untuk **Anggota** dan **Pengaturan** tidak memuat nama proyek | `meta()` tanpa nama. `members.tsx:22-24`, `settings.tsx:19-21` | `${nama} — Anggota — Simple PM` | S |
| PD-05 | Terkonfirmasi (kode) | Ganti **List → Gantt**: sesaat Gantt tampil polos (tanpa tahapan dan milestone) lalu "melompat" saat data tiba; tanpa penanda memuat | `keepPreviousData` menampilkan 20 item List tanpa `plan` di bawah kunci cache Gantt. `projects.tsx:88`, `projects-filters.ts:123-124`, `ProjectGantt.tsx:57-66` | `isPlaceholderData` → `Loader`/`aria-busy`; jangan menggambar Gantt dari data tanpa `plan` | S |
| PD-06 | Terkonfirmasi (kode) | Halaman terbuka melewati **tengah malam WIB**: "besok", "n hari lagi", garis Hari ini Gantt, dan "terlambat" basi sehari | `today` hanya dari loader; `shouldRevalidate` mengembalikan `false` untuk URL sama, padahal kondisi hasil refetch memakai `now` server yang baru. `projects.tsx:66,71-73`, `DateText.tsx:57-66` | Kirim `today` di respons `GET /projects` dan pakai milik halaman terakhir | S |
| PRJ-24 | **Dugaan** | Di 375 px dengan skala teks 125-150%: bar progres/header **meluber**; kolom label Gantt ±228 px | Baris `wrap="nowrap"` tanpa pemotongan. `app/components/pm/ProgressBar.tsx:42`, `ProjectHeader.tsx:49,117-123`, `gantt-style.ts:11` | `wrap="wrap"`; cek di browser | S |

## Urutan perbaikan yang disarankan (paket tanpa tumpang tindih)

1. **Eden** — PRJ-01 (menyembuhkan PRJ-03 dan PRJ-04, serta `T-01`/`T-02` di Tugas). Berkas: `app/lib/eden.ts` + tes. **Kerjakan paling dulu.**
2. **Gantt aman** — PD-01. Berkas: `project.service.ts`, `app-projects.write.ts`, `app-projects.plan.ts`, `ProjectForm.tsx`, `QuickDates.tsx`, `GanttRow.tsx`, `GanttHeader.tsx`, `gantt-layout.ts` + tes.
3. **Teks dan urutan daftar** — PD-02, PRJ-07, PRJ-08. Berkas: `ui/DateText.tsx`, `ProjectCard.tsx`, `projects.copy.ts`, `project-list.query.ts`, `ProjectEmpty.tsx`.
4. **Daftar: halaman dan navigasi** — PD-03, PD-04, PD-05, PD-06, PRJ-12, PRJ-17. Berkas: `routes/app/projects.tsx`, `projects-api.ts`, `ProjectGantt.tsx`, `server/api/app-projects.ts`, `ProjectHeader.tsx`, `project-new.tsx`, `useTrashActions.ts`.
5. **Detail proyek** — PRJ-02, PRJ-06, PRJ-11, PRJ-20. Berkas: `useProjectActions.tsx`, `usePlanActions.tsx`, `AddMemberModal.tsx`, `members.tsx`, `settings.tsx`, `useTaskWrite.ts`.
6. **Anggota dan hak** — PRJ-09 (bersama `TD-01`), PRJ-05 (butuh keputusan H-G1). Berkas: `member.service.ts`, `projects.copy.ts`, `scopes.pm.ts`, `app-projects.write.ts`.
