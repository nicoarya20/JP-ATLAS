# PEMERIKSAAN — Menu Tugas

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`. Berisi **apa yang diperiksa, apa yang lolos, dan temuan yang bukan bug** (kesesuaian wireframe, standar CLAUDE.md, salinan, kode, tes). Yang berperilaku salah ada di [`BUG.md`](BUG.md).

## 1. Cakupan dan metode

| Bagian | Diaudit oleh | Seberapa dalam |
|---|---|---|
| **Daftar tugas** (lingkup, cari, semua filter, urutan, paginasi, tab Tugas di proyek) | audit kedua `tugas-daftar` | Dalam: alur tiap kontrol URL → SQL, hak, server |
| **Form, detail, alur status, hapus + Urungkan, Tulis saja (AI)** | audit pertama (dihentikan setelah 4 jam; hasil mentah) | Sebagian: temuan nyata ada, tetapi **a11y menyeluruh dan pencocokan `TaskDraft*`/`useTaskWrite` belum selesai** |

Cara: baca kode, telusuri alur data, jalankan tes dan skrip sementara (sudah dihapus dari repo; salinan di `/tmp/audit/evidence-*`). **Tidak ada browser**, jadi masalah visual murni ada di bagian 6. Sumber mentah: [`../sumber/`](../sumber/).

**Dasar sehat:** tes menu tugas lulus (361 + 829 + 163 di tiga kelompok), `typecheck` nol, `biome check` bersih, performa 1000 tugas median 3,5 ms. Matriks filter server **3612 kombinasi** (lingkup mine/all × proyek × tenggat × urutan, keyset limit 4) plus **504 kombinasi** (status × prioritas × orang × cari × urutan, keyset limit 3) sama dengan oracle di memori: **0 selisih, 0 ganda**; hitungan `counts` sama dengan isi daftar per kelompok. Perbaikan filter Proyek (`adbe0c9`) terverifikasi di semua kombinasi.

## 2. Yang diperiksa dan LOLOS

### Alur tiap kontrol daftar (URL → klien → API → SQL)

| Kontrol | URL | Hasil |
|---|---|---|
| Lingkup Tugas saya / Semua | `lingkup` | OK; ganti ke "saya" membersihkan `orang` |
| Cari judul atau `#12` | `q` | OK; `%`, `_`, `\` literal (matriks 0 selisih). Komentar kode menyesatkan: `TD-06` |
| Chip status | `status` | OK; chip Selesai/Dibatalkan menghapus `tenggat` |
| Proyek | `proyek` | OK di semua lingkup (`adbe0c9`) |
| Orang | `orang` | OK; `orang` basi di "Tugas saya" diabaikan. Nilai di luar pilihan: `TD-08` di BUG |
| Prioritas (banyak) | `prioritas` | OK; hanya nilai valid yang dibaca |
| Tenggat | `tenggat` | OK; tidak berlaku untuk Selesai/Dibatalkan |
| Urutan | `urut` | OK secara mekanis (kursor due/priority/updated/created). Perilaku: `T-23`, `T-12` di BUG |
| Hapus saringan | — | OK; `TASK_NARROWING_PARAMS` memuat 6 kunci, `lingkup`/`urut` tetap |
| Kunci cache | — | OK; `taskKeys.list(query)` memuat seluruh query (+ `due` per kelompok); seed dipakai hanya bila `JSON.stringify(query)` sama |
| Tab Tugas di proyek | — | OK; `lockedProjectId` menimpa `lingkup`/`proyek`; `orang` berlaku |

**Tidak ada kontrol yang mati dan tidak ada parameter yang hilang di tengah jalan.**

### Hak, rute, server
- `requireUser` pernyataan pertama di kedua loader; tab proyek 404 identik lewat `getProjectDetail`; `canCreate` dari `caps.createTask`/`project.can.createTask` (tanpa `role ===`).
- `GET /api/app/tasks*` terpetakan ke `app:read` (`scopes.ts:187`). Visibilitas diuji untuk 8 persona (SQL = oracle, `task.visibility.test.ts`).
- Indeks: `task_assignee_id_status_due_date_idx` melayani "mine"; "Semua tugas" dan `ilike %q%` tanpa indeks khusus (pindai berurut, aman untuk tim keluarga, catat bila tugas >10 ribu). Tidak ada N+1.
- Hapus tugas T1 (tanpa dialog, toast Urungkan ±10 detik, pulihkan, tak lewat API key) ada dan diuji perilakunya.

### Kesesuaian wireframe

| Layar | Status |
|---|---|
| ① Tugas saya | **Ada:** judul, + Tugas baru, toggle, cari, chip, filter Proyek/Orang/Prioritas, urut, kelompok jadwal + hitungan, kosong ④, satu tombol langkah. **Tidak ada:** Jenis (H-B15), Tag, Papan, "Menunggu diperiksa saya" (S4). **Rusak:** tenggat baris "—" (`T-01`) |
| ② Semua tugas | Sebagian: 5 kolom sengaja (K15), kartu mobile; tanpa #, jenis, tag, CSV, checkbox (H-C5, H-C9, H-C12) |
| ⑤ Tulis saja ✦ | Hampir lengkap (toggle, 🎤 mati "segera", banner, centang, ✏️, pertanyaan, simpan N). **Belum diuji ke API sungguhan** (H-C14) |
| ⑥ Isi form | Sesuai P3 (+ Tahapan); tanpa Estimasi/Tag/Perlu diperiksa (S4/S5); lipatan tertutup (wireframe terbuka, P3 menyatakan terlipat) |
| ⑧ Detail | Sebagian: tanpa Tahapan (`T-16`), tanpa "Batal mulai" (`T-04`); tenggat hilang setelah aksi (`T-01`) |
| ⑨⑩ | Tidak ada: Perlu diperiksa, Pemeriksa, Bukti, Menahan, Setujui/Kembalikan (H-C2, H-C3, H-C8) |
| ⑪ Modal Batalkan | Ada; label kategori berbeda dari wireframe ("Tugas dobel" vs "Dobel/sudah ada", dst.) |
| Hapus T1 + Urungkan + Sampah tugas | Ada. Hapus permanen/purge 30 hari belum (H-D5) |

## 3. Temuan BUKAN bug (perbaikan dan kepatuhan)

| ID | Tingkat | Bukti | Temuan | Berkas | Saran |
|---|---|---|---|---|---|
| T-11 | Sedang | Terkonfirmasi | **Privasi AI:** teks cerita (bebas, bisa memuat data pribadi) + nama tampilan anggota + nama jenis dikirim ke penyedia luar (Anthropic). UI hanya berkata "AI tidak menyimpan apa pun sebelum Simpan diklik"; tidak ada keterangan teks dikirim ke pihak ketiga dan tak ada saklar tingkat tim (hanya `ANTHROPIC_API_KEY`). Id, email, dan proyek lain tidak dikirim (baik). Terkait H-G3, H-G7, H-C14 | `task-draft.copy.ts`, `server/ai/task-draft.prompt.ts`, `task-draft.service.ts:65-69` | Satu kalimat keterangan di kotak tulis; putuskan saklar `ai_enabled` sebelum dipamerkan |
| T-08 | Sedang | Terkonfirmasi | **Target sentuh < 44 px** pada kontrol penting: tombol **Urungkan** (`size: 'xs'`, aksi T1 utama, ±10 detik), Kembali (`size="sm"` 36 px), centang langkah (`lg` = 28 px, padahal "centang besar"). H-C16 hanya mencatat EmptyState/Chip | `app/components/ui/notify.ts`, `BackLink.tsx`, `TaskChecklist.tsx:77-85`, `PageHeader.tsx` | `Urungkan` `size="lg"`; BackLink tanpa `size`; centang `xl` + area klik baris. Ukur di browser |
| T-09 | Sedang | Terkonfirmasi | Tiap centang langkah atau komentar menginvalidasi `taskKeys.all`: detail, timeline (semua halaman), daftar, dan hitungan ikut refetch; checkbox `disabled` sampai selesai, tanpa pembaruan optimistik (respons server sudah memuat `checklist` lengkap tapi tak dipakai) | `useTaskBodyActions.ts:19,48`, `useTaskActions.tsx:35` | `setQueryData` dari respons; invalidate hanya kunci yang berubah |
| TD-02 | Sedang | Terkonfirmasi | **Tak ada tes yang menjalankan kontrol filter**: lingkup → hapus `orang`, chip status → hapus `tenggat`, debounce cari, "Hapus saringan", `Select` bernilai `''`. Bug `adbe0c9` hanya tertangkap di sisi server | `tests/ui/*` (semua `renderToStaticMarkup`), `TaskFilters.tsx:70-141`, `TaskFilterSelects.tsx:64-97` | Ekstrak pembuat patch (`scopePatch`, `statusPatch`) jadi fungsi murni + tes; tes klik butuh jsdom/testing-library (**dependency baru: minta persetujuan**) |
| T-15 | Rendah | Terkonfirmasi | Register bahasa campur: UI tugas "Anda", `DENY_UI` "kamu"; "yang mengerjakan" vs "pengerja" vs "penanggung jawab"; `NOT_OWNER` menyebut "yang mengerjakan" padahal batalkan/hapus hanya pembuat/Pengelola; riwayat "mengganti penanggung jawab" tanpa siapa ke siapa | `tasks.copy.ts:94-95`, `server/access/decision.ts:23-60`, `task-body.copy.ts` | Satukan sapaan dan istilah (glosarium R11 §3.4) |
| TD-07 | Rendah | Terkonfirmasi | "Tugas dari proyek yang Anda ikuti" dipakai juga untuk PM dan Admin, yang di "Semua tugas" melihat semua proyek hidup | `tasks.copy.ts:49,110`, `server/access/project.policy.ts:103-111` | Salinan netral ("…yang bisa Anda lihat") atau menurut `can{}` |
| TD-06 | Rendah | Terkonfirmasi | Komentar berkata cari panjang "dipotong, bukan ditolak", padahal skema `maxLength: 100` menjawab **422** (tes API memang mengunci 422). UI aman; `.slice` di `filtersOf` jadi kode mati | `task.limits.ts:11-12`, `app-tasks.schema.ts:36`, `task.query.ts:47` | Perbaiki komentar, buang `.slice` mati |
| T-16 | Rendah | Terkonfirmasi | Header detail tidak menampilkan **Tahapan** (wireframe ⑧); DTO sudah memuat `phase`. Daftar juga belum (H-C12) | `TaskHeader.tsx:24-38,81-108` | Tambah `Fact` Tahapan (sisa H-B5) |
| T-17 | Rendah | Terkonfirmasi | Dropdown Proyek di form menampilkan proyek Selesai/Dibatalkan/Ditunda tanpa status (Q12 memang membolehkan) | `TaskForm.tsx:150-156` | Tambah status di label proyek tertutup |
| T-19 | Rendah | Terkonfirmasi | **A11y:** `aria-label` pada `<p>` progres "2/3" tak andal; ratusan tombol "Mulai kerjakan" tanpa judul tugas (usul `aria-label="Mulai kerjakan: <judul>"`); centang read-only `disabled` tanpa alasan; urutan heading terbalik (judul halaman `h3`, grup `h2`, detail `h2`, tak ada `h1`, lihat [`LK-02`](../lintas/BUG.md)); "✦" terbaca "bintang"; ikon `FiCheck` tanpa `aria-hidden` | `TaskChecklist.tsx:64,160,165`, `NextStepButton.tsx:34-44` | Perbaiki per butir |
| T-20 | Rendah | Terkonfirmasi | "Tugas saya": SSR hanya menanam hitungan; baris tiap kelompok (≤6 permintaan) baru diambil klien setelah hidrasi → kerangka dulu, lalu baris. Timeline detail juga hanya klien | `TaskGroupList.tsx:25-27`, `app/routes/app/tasks.tsx:42` | Tanam kelompok pertama di loader |
| TD-09 | Rendah | **Dugaan** | Loader "Tugas saya" menjalankan `listTasks(limit 1)` hanya untuk `caps.createTask`, dan `pickPeople(50)` untuk semua peran (Member selalu kosong). Tiap muat halaman = 4 kueri paralel ekstra | `app/routes/app/tasks.tsx:41-43,52` | Ekspor fungsi `createTaskCap`; lewati `pickPeople` bila tak berhak |
| T-13 | Rendah | Terkonfirmasi | `byStatus` dihitung tiap `/tasks/counts` tetapi tak dipakai UI (chip status tanpa hitungan) | `server/task/task.query.ts:197-209`, `app-tasks.ts:60` | Buang, atau tampilkan hitungan di chip |
| T-22 | Rendah | Terkonfirmasi | **Kode mati dan duplikasi:** `unstartTask`, tipe `TaskComment`, `taskFiltersToParams`, `countActiveParams`, `S4_ACTIONS` (hanya tes), `TaskDraftRequest`, `TASK_DRAFT_NOTE_MAX`, `COMMENT_COPY.closed`, `TIMELINE_COPY.by`, `BACK_PARAM`; `oneOf` ganda di `app-common.ts` dan `app-tasks.schema.ts`; `type Actor`+`authorOf` di 3 berkas `app-tasks.*`; `refresh/onError` ganda; komentar usang hapus-tugas (H-C17) | `tasks-api.ts:182,198`, `tasks-filters.ts`, `use-url-filters.ts`, `task.limits.ts`, `ai/*`, `task-body.copy.ts` | Hapus atau gabung |

## 4. Celah cakupan tes (menu Tugas)
- **Tidak ada tes yang melewati klien Eden asli** (sebab `T-01` dan `T-02` lolos); tidak ada tes sudut gabungan "judul/komentar berbentuk tanggal".
- Kursor lintas urutan `updated` ↔ `created`; daftar Orang >50 orang; navigasi Kembali setelah ubah/buat; hapus komentar oleh Pengelola dari UI; **Batal mulai** di UI.
- **Kontrol filter interaktif** (`TD-02`); a11y (axe) dan tata letak mobile (tidak bisa diuji tanpa browser).
- API Anthropic sungguhan (H-C14).
- Lihat [`LK-01`](../lintas/PEMERIKSAAN.md): hanya hapus-tugas T1 yang diuji perilakunya; semua `use*Actions` lain tidak.

## 5. Belum diaudit
- **A11y menyeluruh** (dimensi 8) dan pencocokan `TaskDraft*`/`useTaskWrite`.
- Layar **form tugas, detail, Tulis saja** diaudit hanya dari audit pertama yang dihentikan; paket audit `tugas-detail` sempat disiapkan tetapi tidak diluncurkan.
- Uji visual apa pun (butuh browser).

## 6. Perlu dicek manual di browser

1. `/app/tasks` → "Tugas saya": apakah tiap baris menampilkan tenggat atau "—"? Buka detail, klik "Mulai kerjakan", lihat Tenggat di header (`T-01`).
2. Tulis komentar `05/10/2026` pada sebuah tugas, muat ulang: apakah "Obrolan & riwayat" error (`T-02`)?
3. Daftar → buka tugas → Ubah → Simpan → "Kembali": ke mana (`T-05`)?
4. 375 px: baris "Tugas saya" dengan judul panjang; coba skala teks 1 / 1,25 / 1,5 (`T-10`).
5. Akun Pemantau: tombol "Tugas baru" dan alasannya (`T-03`).
6. Hapus tugas dari baris: apakah toast "Urungkan" mudah ditekan di HP (`T-08`)?
7. Pilih Proyek lalu "Semua proyek" lagi, dan "Siapa saja"/"Semua tenggat": nilai `''` di Select Mantine benar-benar menghapus filter dan label kembali (`TD-02`).
8. Ketik cepat di "Cari tugas" lalu langsung ubah chip/Proyek: huruf tak hilang, tak ada kedipan balik.
9. Buka `/app/tasks?proyek=bukan-id` dan `?lingkup=semua&orang=bukan-id`: kolom tampak kosong, ada "Hapus saringan" (`TD-08`)?
10. Filter Proyek A → klik "Tugas baru": proyek terisi (`TD-05`)?
11. Tab Tugas proyek sebagai Pemantau, PM bukan anggota, dan Member: tombol "Tambah tugas" dan pilihan Orang.
12. "Tampilkan lebih banyak" di "Semua tugas" (>30 tugas), ganti urutan di tengah: tak ada baris ganda.
13. Ganti 5 chip berturut-turut di "Tugas saya": adakah toast 429 (`TD-03`)?
