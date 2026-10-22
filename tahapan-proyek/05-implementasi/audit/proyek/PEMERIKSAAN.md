# PEMERIKSAAN — Menu Proyek

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`. Berisi **apa yang diperiksa, apa yang lolos, dan temuan yang bukan bug** (kesesuaian wireframe, standar CLAUDE.md, salinan teks, kode, tes). Yang berperilaku salah ada di [`BUG.md`](BUG.md).

## 1. Cakupan dan metode

| Bagian | Diaudit oleh | Seberapa dalam |
|---|---|---|
| **Daftar proyek** (List/Grid/Gantt, semua filter, "Perlu perhatian") | audit kedua `proyek-daftar` | Dalam: alur tiap kontrol URL → SQL, hak, server, Gantt |
| **Detail proyek** (header, Ringkasan, Tahapan, Anggota, Perpanjang tenggat, Pengaturan) | audit pertama (dihentikan setelah 4 jam; hasil mentah) | Sebagian: temuan nyata ada, tetapi matriks wireframe layar detail **belum selesai** |
| **Buat proyek** | audit pertama | Tipis |

Cara: baca kode, telusuri alur data, jalankan tes dan skrip sementara (sudah dihapus dari repo; salinan di `/tmp/audit/evidence-*`). **Tidak ada browser** (aturan global), jadi masalah visual murni ada di bagian 6. Dasar sehat: 2146 tes terkait lulus, `typecheck` nol. Sumber mentah: [`../sumber/`](../sumber/).

## 2. Yang diperiksa dan LOLOS

### Alur tiap kontrol daftar (URL → klien → API → SQL)

| Kontrol | Hasil |
|---|---|
| Cari `q` | OK: dipotong 100, `trim`, `ilike(name)`; `%` dan `_` di-escape (tes `q="… 100%"` hanya cocok literal). Hanya nama, bukan deskripsi (lihat PRJ-10) |
| Lingkup Saya/Semua `lingkup` | OK: `clampListScope`; Member dijepit ke "saya" oleh server |
| Status `status` | OK |
| Perlu perhatian `perhatian` | OK: menggantikan status; `status≠active` + `perhatian` → kosong; URL, query, dan `listProjects` konsisten |
| Urut `urut` | OK secara mekanis: `due`/`name`/`recent` dengan tie-break `id` (urutan total). Perilaku "tenggat" bermasalah → `PRJ-08` di BUG |
| Tampilan `tampilan` | OK: hanya `limit` dan `rencana` yang berubah; kunci cache berbeda, tidak ada tabrakan List ↔ Grid |
| Parameter yang hilang di tengah jalan | **Tidak ada**; kunci cache react-query memuat semua parameter. Satu-satunya parameter mati: `hal` (`PRJ-17`) |
| Validasi query | OK: `limit=1000`, `perhatian=2`, `page=0`, `sort`/`scope`/`status` salah → 422 berbentuk `{code,error,issues,method,path,requestId,status}` |
| Kondisi proyek | OK: daftar, detail, Gantt, dan `?perhatian=1` memakai **satu fungsi** (`toListItem`), jadi angkanya konsisten |

### Hak, rute, dan performa
- Tombol "+ Proyek baru" hanya muncul bila `appCaps.createProject` (dari server); Member yang meminta `scope=all` dijepit; bentuk galat dan `meta()` sesuai.
- Performa (120 proyek × 150 tugas): "Perlu perhatian" 38 ms, Gantt 100 baris 31 ms, daftar 20 baris 9 ms. Aman untuk skala tim ≤200 proyek (HUTANG H-B9).

### Kesesuaian wireframe ① / ② (daftar)
**Ada:** judul "Proyek"; tombol Proyek baru sesuai hak; cari; segmented Proyek saya / Semua proyek (Member tidak melihatnya); List dan Grid (+ Gantt, tambahan S5a); chip Semua · Berjalan · Ditunda · Selesai · Draf; "Perlu perhatian" dengan pemisah; Urutkan (3 pilihan); kolom nama, status, kondisi + alasan, progres, tenggat; seluruh baris/kartu/batang bisa diklik; "Tampilkan lebih banyak"; kartu di mobile; kosong ② Member (tanpa tombol) dan Admin/PM.
**Sebagian:** cari hanya nama (`PRJ-10`); "tenggat (diperpanjang ×1)" dan kolom avatar anggota tidak ada (`PD-07`); "Dibatalkan" tidak punya chip sendiri (disengaja, hanya lewat "Semua").
**Tambahan di luar wireframe:** empty state "attention" dan "filtered"; tampilan Gantt.

### Detail proyek (ringkas, belum matriks lengkap)
Header, Ringkasan, Tahapan, Anggota, Perpanjang tenggat, atur kondisi, dan Sampah ada dan berfungsi pada alur normal. Selisih dari spek tercatat di bagian 3 (`PRJ-13`, `PRJ-14`, `PRJ-16`). **Belum diaudit tuntas:** matriks per layar, dan standar UX tiap aksi tulis (loading, notifikasi, dialog T2/T3) di detail proyek. Paket audit `proyek-detail` sempat disiapkan tetapi tidak diluncurkan.

## 3. Temuan BUKAN bug (perbaikan dan kepatuhan)

| ID | Tingkat | Bukti | Temuan | Berkas | Saran |
|---|---|---|---|---|---|
| PRJ-10 | Sedang | Terkonfirmasi | Wireframe berbunyi "cari **nama atau deskripsi**"; kode hanya `ilike(project.name)` dan placeholder diubah | `project-list.query.ts:129`, `projects.copy.ts:94` | Tambah pencarian deskripsi, atau catat sebagai keputusan |
| PD-07 | Rendah | Terkonfirmasi | Wireframe ①: tenggat "31 Okt (diperpanjang ×1)" dan avatar anggota. Kode: tanggal + "n hari lagi" dan **satu** avatar Pengelola utama; `ProjectListItem` tidak membawa `extensionCount`/anggota | `project.dto.ts:25-42`, `ProjectCard.tsx:62-72` | Tambah `extensionCount` (satu query `GROUP BY` per halaman) atau catat keputusan (M) |
| PRJ-13 | Rendah | Terkonfirmasi | Spek `02-proyek.md` #7: stepper, milestone bersarang, riwayat tenggat di bawah. Kode: dua daftar terpisah, stepper hanya di Ringkasan, riwayat hanya popover | `app/routes/app/project/phases.tsx:90-109` | Tambah bila masih diinginkan |
| PRJ-14 | Rendah | Terkonfirmasi | Wireframe: breadcrumb "Proyek / Nama"; kode: tombol "Kembali ke daftar proyek" | `ProjectHeader.tsx:68-78` | Breadcrumb, atau catat selisih sengaja |
| PRJ-16 | Rendah | Terkonfirmasi | Kategori perpanjangan 4 nilai; R02 dan `02-proyek.md` §3.1 menyebut 5 ("Perkiraan meleset" hilang) | `server/pm/enums.ts:25-30`, `summary/summary.copy.ts:4-9` | Catat keputusan atau tambah enum (butuh migrasi) |
| PD-09 | Rendah | Terkonfirmasi | Proyek tanpa tanggal tetapi punya tahapan/milestone: rencana tidak digambar (disengaja) dan ditulis "belum punya tenggat" tanpa menyebut rencana yang ada | `gantt-layout.ts:84-92,127-146`, `ProjectGantt.tsx:39,83` | Sebut "Tahapan ada, tetapi proyek belum punya tenggat", atau gambar milestone saja |
| PRJ-18 | Rendah | Terkonfirmasi | Ubah peran = **dua dialog**; "Lanjutkan" mati tanpa alasan tertulis; saat menyamar tombol tampil lalu ditolak server | `ChangeRoleModal.tsx:48-55`, `useProjectActions.tsx:100-110`, `member-actions.ts:37-44` | Satukan langkah; tambah penanda menyamar ke `can{}` |
| PRJ-19 | Rendah | Terkonfirmasi | CLAUDE.md T2 meminta dampak "tugas dan event"; dialog hapus proyek hanya menyebut tugas, event tidak ikut ke Sampah | `app/components/trash/trash.copy.ts:56-60`, `project-trash.service.ts:55-67` | Sebut event, atau catat ke HUTANG |
| PRJ-15 | Rendah | Terkonfirmasi | Salinan: istilah Inggris (List/Grid/Gantt, "Coming soon", Milestone; R11 §3.4 usul "Target penting"); "Anda" vs "kamu"; alasan kondisi digabung koma (wireframe satu kalimat); typo "lalu Jadikan" | `projects.copy.ts:141-146`, `project-chooser.copy.ts:10`, `summary/summary.copy.ts:51`, `server/metrics/condition.ts:105-108`, `member.service.ts:37,43` | Satukan di `*.copy.ts` + tes glosarium (lihat juga [`LK-10`](../lintas/PEMERIKSAAN.md)) |
| PRJ-23 | Rendah | **Dugaan** | A11y: `aria-pressed` pada checkbox Chip; "—" kondisi hanya `title`; dua tautan per kartu; nama tahapan Gantt hanya `title` (H-B11) | `AttentionChip.tsx:22`, `ProjectCard.tsx:28`, `GanttRow.tsx` | Cek dengan pembaca layar |
| PRJ-21 | Rendah | Terkonfirmasi | Kode mati: ekspor `fetchProject`, `quickRangeLabel`, `countActiveParams`; tiga pembungkus pesan galat kembar; dua `ViewToggle` | `app/lib/projects-api.ts:82`, `QuickDates.tsx:16`, `use-url-filters.ts:75` | Hapus atau gabung |
| PRJ-22 | Rendah | Terkonfirmasi | Berkas di batas (296/300 dan 248); `lockProject`/`logActivity` diimpor 6 modul lain | `server/project/project.service.ts`, `ProjectForm.tsx` | Pecah sebelum fitur berikutnya |
| PRJ-25 | Rendah | Terkonfirmasi | `getProjectDetail` (±6 query, memuat semua baris tugas) jalan **dua kali** per halaman (layout dan anak); daftar anggota tanpa batas. Aman di skala ini | `server/project/project.query.ts:32-100`, `layout.tsx:27` | Tidak mendesak |
| PD-08 | Rendah | **Dugaan** | Indeks `project_status_due_date_idx (status, due_date)` hanya melayani filter status; urutan bawaan dan `ilike '%q%'` tak berindeks. Jalur `perhatian` memuat semua tugas ≤1000 proyek di **setiap ketikan** pencarian (debounce 350 ms) | `project-list.query.ts:57-62,129`, `schema.project.ts:46` | Ukur `EXPLAIN` bila data >1000 |

## 4. Celah cakupan tes (menu Proyek)
- **Tanpa tes langsung:** `ChangeRoleModal`, `AddMemberModal`, `MemberPicker`, `usePlanActions`, `useProjectActions`, `useProjectHighlights`.
- **Loader rute tidak dites perilakunya:** `layout`, `summary`, `tasks`, `members`, `phases`, `settings`, `project-new`, serta `projects.tsx` (loader, `shouldRevalidate`, `useProjectPages`, penyemaian `seeded`, `getNextPageParam`).
- **`ProjectFilters` interaktif** (debounce 350 ms, sinkron URL ↔ kotak, `setFilters` beku) tidak diuji.
- **Semua tes UI memakai `renderToStaticMarkup`**: tidak ada tes interaksi, revalidasi, atau data hasil Eden. Itu sebabnya `PRJ-01` dan `PRJ-02` lolos. Lihat [`LK-01`](../lintas/PEMERIKSAAN.md).
- `settled` (`DueCell`), paginasi yang bergeser (`PD-03`), tahun di luar 1900-2099 pada Gantt: tanpa tes.

## 5. Belum diaudit
- Matriks wireframe layar **detail proyek** (⑧-⑪), standar UX tiap aksi tulis di detail proyek, dan layar **Buat proyek**.
- SEO `meta()` per halaman bagian detail (hanya `PRJ-20` yang ditemukan).
- `PM_KEY_DENY` dan pemetaan scope untuk `GET /projects` (tes `scopes` sudah ada).

## 6. Perlu dicek manual di browser

1. Admin: `/app/projects` → klik **Gantt** → apakah batang dan tenggat tampil (`PRJ-01`)? Muat ulang halaman: sekarang tampil (SSR)?
2. Cari atau ubah filter, lalu lihat kolom **Tenggat** (`PRJ-01`).
3. **Ubah proyek** (nama + status), lalu lihat header (`PRJ-02`).
4. Tab **Tahapan**: tambah milestone, lalu ubah judulnya (`PRJ-03`, `PRJ-04`).
5. Ubah tenggat satu proyek jadi tahun 2062, buka Gantt: waktu muat, label bulan terpotong (`PD-01`).
6. Dua tab: tab A urut "Terakhir diubah" + "Tampilkan lebih banyak"; di tab B edit proyek lama; kembali ke A → baris ganda (`PD-03`).
7. Pilih Gantt + "Semua proyek", klik satu batang, lalu "Kembali ke daftar proyek" (`PD-04`).
8. Proyek Selesai dengan tenggat lampau: baca teks tenggat di List, Grid, dan kartu mobile (`PD-02`).
9. Tambah anggota: pilih orang, klik di luar (`PRJ-11`).
10. 375 px dan skala teks 150%: baris filter, header, ProgressBar, kolom label Gantt dan geser horizontal (`PRJ-24`).
11. Safari: klik sel mana pun di baris tabel membuka proyek (overlay `::after` pada `<tr position:relative>`).
12. Ketik cepat di cari lalu klik chip status dalam < 350 ms: kata cari dan status keduanya bertahan.
13. Pembaca layar dan papan ketik (`PRJ-23`).
