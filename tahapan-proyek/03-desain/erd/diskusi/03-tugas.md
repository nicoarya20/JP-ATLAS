# Diskusi & Rencana Kerja: Wireframe & ERD 03 · Tugas

> Tanggal: 7 Oktober 2026. Status: **Tugas 1–4 selesai** (Tugas 3–4 dikerjakan oleh sesi menu Proyek atas permintaan user, lihat §9).
> Lokasi hasil nanti: Penpot, file **PM-New**
> - Halaman **WIREFRAME NICO**, grup `03 · Tugas — Wireframe`
> - Halaman **ERD NICO**, grup `03 · Tugas — ERD`
> - Dokumen ERD: `tahapan-proyek/03-desain/erd/task.md` (baru) dan `tahapan-proyek/03-desain/erd/project.md` (diubah)

---

## 0. Untuk agent pelaksana: baca dulu

1. `tahapan-proyek/03-desain/erd/diskusi/02-proyek.md` (pola kerja, gaya wireframe, kendala Penpot) dan `tahapan-proyek/03-desain/erd/project.md` (tabel `projects`, `project_members`, `project_phases`, peran proyek).
2. `note.md` bagian **Menu Tasks** dan **detail task**. Ini spesifikasi lama yang sudah dirampingkan di dokumen ini. **Kalau bertentangan, dokumen ini yang berlaku.**
3. Segmen target: **awam/lansia**. Bahasa polos, teks besar, tanpa aksi yang bergantung hover.

Urutan **wajib**: Tugas 1 → 2 → 3 → 4. ERD digambar setelah `tahapan-proyek/03-desain/erd/task.md` selesai.

---

## 1. Keputusan dari diskusi

| # | Keputusan | Asal |
|---|---|---|
| 1 | Menu Tugas punya 3 tampilan: **Semua tugas**, **Tugas baru**, **Detail tugas** | User |
| 2 | Menu **Tiket** dan **Pengembangan** ditunda, tidak dibahas di modul ini. Tabel `tasks` disiapkan supaya keduanya bisa masuk nanti tanpa mengubah tabel | User |
| 3 | **Jenis tugas fleksibel per proyek (opsi C).** Nama jenis bebas, tapi tiap jenis wajib punya **kategori dasar**: `task` (Tugas), `issue` (Masalah), `idea` (Ide). Kategori dasar dipakai sistem untuk hitungan (misal "bug terbuka") dan aturan | User setuju usulan Claude |
| 4 | Jenis default saat proyek dibuat: **Tugas** (task) · **Bug** (issue) · **Ide** (idea). Hanya Pengelola/Admin yang mengubah. Maks. **6 jenis aktif** per proyek. Jenis yang sudah dipakai hanya bisa diarsipkan, tidak dihapus | Usulan Claude |
| 5 | Status: **Belum dikerjakan → Sedang dikerjakan → Menunggu diperiksa → Selesai**, ditambah **Dibatalkan**. `reopened` bukan status, tapi penanda "Dibuka lagi ×N" | Usulan Claude |
| 6 | ~~Langkah diperiksa diatur per jenis~~ **Diganti keputusan #23 (8 Okt 2026).** Prinsip yang tetap: kalau tidak perlu diperiksa, tombolnya **Tandai selesai**. Kalau perlu, tombolnya **Minta diperiksa**, lalu setelah **Setujui** tugas otomatis **Selesai** | User |
| 7 | **Pemeriksa default = pembuat tugas jika ia Pengelola, selain itu Lead.** Urutan cadangan: pembuat (Pengelola) → Lead → Pengelola lain → Admin. Pemeriksa ≠ yang mengerjakan. Pemeriksa bisa diganti manual, tapi hanya ke Pengelola atau Admin. Kalau jatuh ke **Admin**, `reviewer_id` kosong, UI menampilkan "Pemeriksa: Admin" + saran **"Tambahkan pengelola kedua"**, dan semua Admin dapat notifikasi | User (opsi b + urutan cadangan) |
| 8 | Yang boleh memeriksa (Setujui/Kembalikan): **hanya Pengelola proyek (termasuk Lead) dan Admin**. Anggota tidak bisa menyetujui, walaupun ia pembuat tugas. Semua Pengelola boleh memeriksa, bukan hanya pemeriksa yang ditunjuk, supaya Lead tidak jadi titik macet | User (opsi b) + Claude (semua Pengelola) |
| 9 | **Kembalikan** wajib alasan. Tugas kembali ke Sedang dikerjakan, penanda "Dikembalikan ×N" | Usulan Claude |
| 10 | **Pemantau boleh berkomentar**, tapi tidak bisa mengubah tugas dan tidak bisa jadi pemeriksa | User |
| 11 | Dua cara membuat tugas: **Tulis saja ✦** (AI) dan **Isi form**. Ditambah **Impor CSV** sebagai tombol sekunder untuk semua yang boleh membuat tugas (Admin, Pengelola, **Anggota**; bukan Pemantau). Diubah 8 Okt 2026: Anggota boleh impor supaya bisa membuat banyak tugas sekaligus | User |
| 12 | **Tulis saja**: satu paragraf bisa jadi beberapa tugas. AI hanya menyusun draf, tidak ada yang tersimpan sebelum **Simpan** diklik. Nama hanya dicocokkan dengan anggota proyek, tanggal dihitung oleh kode (bukan AI). Kalau ambigu, AI **bertanya satu hal**. Kalau AI tidak tersedia, tulisan masuk ke Judul dan user lanjut dengan form | User setuju usulan Claude |
| 13 | **Tag dipakai**, sebagai acuan tambahan untuk mencari tugas. Tag berlaku **per proyek** | User (pakai tag) + Claude (per proyek) |
| 14 | Daftar tugas: **List (default) + Papan**. Gantt ditunda ke fase 2. Tombol refresh dibuang | Usulan Claude |
| 15 | Default menu = **Tugas saya**, dikelompokkan per jadwal: Terlambat · Hari ini · Besok · Minggu ini · Nanti · Tanpa tenggat (sama dengan Ringkasan di `note.md`) | Usulan Claude |
| 16 | Tiap baris tugas punya **satu tombol langkah berikutnya** yang selalu terlihat (bukan dropdown status, bukan hover) | Usulan Claude |
| 17 | Detail tugas = **halaman penuh, satu halaman di-scroll**: Deskripsi · Langkah-langkah (checklist) · Bukti · Menunggu/menahan tugas lain · Obrolan & riwayat (komentar + log aktivitas jadi satu timeline). Kelima tab di `note.md` dihapus | Usulan Claude |
| 18 | Hapus tugas = pindah ke **Sampah 30 hari** (sama dengan Proyek) | Usulan Claude |
| 19 | **Nomor tugas satu urutan untuk semua proyek** (`#482`), tidak dipakai ulang walau tugas dihapus | User setuju usulan Claude |
| 20 | **Satu permintaan periksa yang menunggu per tugas.** Tiap Kembalikan → Minta diperiksa lagi = putaran baru, riwayat tiap putaran tersimpan | User setuju usulan Claude |
| 21 | **CSV:** tag dipisah `;`. Email yang tidak cocok = **peringatan**, tugas diimpor tanpa yang mengerjakan. Jenis tidak cocok atau judul kosong = **galat**. Jenis kosong = jenis pertama, prioritas kosong = Sedang | User setuju usulan Claude |
| 22 | **Alasan:** Batalkan memakai **kategori wajib** (Dobel/sudah ada · Tidak jadi dikerjakan · Di luar cakupan proyek · Salah buat · Lainnya), catatan wajib jika Lainnya. Kembalikan = teks wajib + tombol cepat yang mengisi teks. Buka lagi = teks wajib. Daftar kategori **tetap di sistem**; kategori baru ditambahkan developer di versi berikutnya berdasarkan catatan "Lainnya" yang sering muncul | User setuju usulan Claude |
| 23 | **"Perlu diperiksa" = tombol on/off per tugas, bukan per jenis.** Nilai awal dari setelan proyek **"Tugas baru perlu diperiksa"** (`projects.tasks_need_review_default`, awalnya **mati**). **Menyalakan:** siapa pun yang boleh mengubah tugas, termasuk Anggota di tugasnya sendiri. **Mematikan:** hanya Pengelola dan Admin. Tombol **terkunci** saat Menunggu diperiksa, Selesai, Dibatalkan. Kolom `task_kinds.needs_review` dihapus. Alasan: proyek non-IT tidak punya "Bug", dan aturan periksa lebih soal kebijakan tim daripada soal jenis | User (usulan on/off + izin matikan) + Claude (terkunci, default proyek) |
| 24 | **Bukti tidak lagi wajib untuk Bug/Masalah.** Minta diperiksa tanpa bukti hanya memunculkan peringatan, sama seperti checklist belum lengkap | Claude (asumsi A9, belum dikonfirmasi user) |

### Matriks izin

Peran proyek dari `project_members.role`. "PM" yang bukan pengelola sebuah proyek hanya bisa melihat (asumsi A1 modul 02).

| Aksi | Admin | Pengelola | Anggota | Pemantau |
|---|---|---|---|---|
| Lihat tugas | Semua proyek | Proyek itu | Proyek itu | Proyek itu |
| Buat tugas (Tulis saja, Isi form) | ✅ | ✅ | ✅ | ❌ |
| Impor CSV, unduh CSV | ✅ | ✅ | ✅ | ❌ |
| Ubah isi tugas (judul, deskripsi, jenis, prioritas, tanggal, tag, checklist, yang mengerjakan) | ✅ | ✅ | Tugas yang ia buat atau kerjakan (A2) | ❌ |
| Mulai kerjakan, Tandai selesai, Minta diperiksa | ✅ | ✅ | Yang mengerjakan. Jika belum ada, siapa pun yang mengklik jadi yang mengerjakan | ❌ |
| Setujui, Kembalikan | ✅ | ✅ | ❌ | ❌ |
| Buka lagi (alasan wajib) | ✅ | ✅ | Pembuat, yang mengerjakan, atau pemeriksa | ❌ |
| Batalkan (alasan wajib), Hapus ke Sampah | ✅ | ✅ | Pembuat tugas | ❌ |
| Pulihkan dari Sampah | ✅ | ✅ | Yang menghapus | ❌ |
| Komentar | ✅ | ✅ | ✅ | ✅ |
| Lampirkan bukti | ✅ | ✅ | ✅ | ❌ |
| Kelola jenis tugas | ✅ | ✅ | ❌ | ❌ |
| Buat tag baru saat memberi tag | ✅ | ✅ | ✅ (A3) | ❌ |
| Ganti nama, gabung, hapus tag | ✅ | ✅ | ❌ | ❌ |

### Asumsi Claude (tandai di dokumen, belum dikonfirmasi user)
- **A1.** Pembuat tugas yang Anggota tetap dapat notifikasi saat tugasnya diminta diperiksa dan saat selesai, dan bisa memberi masukan lewat komentar. Keputusan Setujui/Kembalikan tetap di Pengelola/Admin.
- **A2.** Anggota hanya boleh mengubah tugas yang ia buat atau kerjakan, bukan semua tugas di proyek.
- **A3.** Anggota boleh membuat tag baru. Nama tag unik per proyek tanpa beda huruf besar/kecil, dan saat mengetik muncul saran tag yang sudah ada.
- **A4.** Tugas yang tidak perlu diperiksa boleh langsung **Tandai selesai** dari Belum dikerjakan, tanpa harus Mulai kerjakan dulu (untuk tugas kecil).
- **A5.** Anggota yang ragu pada hasilnya boleh **menyalakan** tombol Perlu diperiksa di tugasnya sendiri (sukarela), lalu **Minta diperiksa**. Setelah menyala, hanya Pengelola/Admin yang bisa mematikannya. Tugas yang menyala tidak bisa melewati langkah periksa.
- **A6.** Sudah diputuskan user, dipindah ke keputusan #7.
- **A7.** Tugas hanya bisa menunggu tugas lain **di proyek yang sama** (v1).
- **A8.** Ambang **Mandek** = 3 hari tanpa aktivitas, untuk tugas Sedang dikerjakan (mengikuti "ghost reminder" di `note.md`). Disimpan sebagai konfigurasi `TASK_STALE_DAYS = 3`.
- **A9.** Bukti tidak lagi wajib (keputusan #24).
- **A10.** Nilai awal setelan proyek "Tugas baru perlu diperiksa" = **mati**.

---

## 2. Alur tugas

```mermaid
stateDiagram-v2
    [*] --> todo: dibuat (form, Tulis saja, CSV, cerita, template)
    todo --> in_progress: Mulai kerjakan
    in_progress --> todo: Batal mulai
    todo --> done: Tandai selesai (tidak perlu diperiksa, A4)
    in_progress --> done: Tandai selesai (tidak perlu diperiksa)
    in_progress --> in_review: Minta diperiksa
    in_review --> done: Setujui (otomatis Selesai)
    in_review --> in_progress: Kembalikan + alasan
    done --> in_progress: Buka lagi + alasan
    todo --> canceled: Batalkan + alasan
    in_progress --> canceled: Batalkan + alasan
    in_review --> canceled: Batalkan + alasan
    canceled --> todo: Pulihkan
```

| # | Langkah | Siapa | Yang terjadi |
|---|---|---|---|
| 1 | Buka menu Tugas | Semua | "Tugas saya", Terlambat paling atas |
| 2 | Buat tugas | Admin/Pengelola/Anggota | Status Belum dikerjakan. Yang ditunjuk dapat notifikasi di Inbox. "Perlu diperiksa" ikut setelan proyek (awalnya mati). Pemeriksa diisi otomatis jika tombol menyala |
| 3 | Mulai kerjakan | Yang mengerjakan | Sedang dikerjakan. Jika belum ada yang ditunjuk, yang mengklik otomatis jadi yang mengerjakan |
| 4 | Kerjakan | Yang mengerjakan | Centang langkah, komentar, lampirkan bukti. Jika menunggu tugas lain yang belum selesai, muncul label **Tertahan** (peringatan, tidak memblokir) |
| 5a | Tandai selesai | Yang mengerjakan | Selesai (jika tidak perlu diperiksa) |
| 5b | Minta diperiksa | Yang mengerjakan | Hanya jika "Perlu diperiksa" menyala. Menunggu diperiksa, pemeriksa dapat notifikasi. Tanpa bukti atau checklist belum lengkap = peringatan (A9) |
| 6a | Setujui | Pengelola/Admin | Otomatis Selesai, yang mengerjakan dapat notifikasi |
| 6b | Kembalikan + alasan | Pengelola/Admin | Kembali ke Sedang dikerjakan, alasan masuk timeline, "Dikembalikan ×N" |
| 7 | Buka lagi + alasan | Lihat matriks | Selesai → Sedang dikerjakan, "Dibuka lagi ×N" |
| 8 | Batalkan / Hapus | Lihat matriks | Batalkan: status Dibatalkan + alasan. Hapus: ke Sampah 30 hari |

---

## 3. Tugas 1: ubah `tahapan-proyek/03-desain/erd/project.md`

1. Bagian placeholder `tasks` diganti satu kalimat rujukan: "Kolom lengkap ada di `tahapan-proyek/03-desain/erd/task.md`." Mermaid tetap menampilkan `tasks` sebagai rujukan ringkas.
2. Tambah relasi `projects ||--o{ task_kinds` dan `projects ||--o{ tags` di mermaid (rujukan ke modul 03).
3. Di "Alur yang didukung" poin 3, tambah: saat proyek dibuat, sistem membuat 3 jenis tugas default (Tugas, Bug, Ide). Proyek dari template/cerita memakai jenis dari struktur tersebut.
4. Contoh `structure` template: `"kind": "task"` → `"kind": "Tugas", "base_kind": "task"`.
5. Di header file, tambah: `Diperbarui 7 Oktober 2026: tasks dipindah ke tahapan-proyek/03-desain/erd/task.md, tambah jenis tugas default (keputusan modul 03 · Tugas).`

---

## 4. Tugas 2: tulis `tahapan-proyek/03-desain/erd/task.md`

Ikuti format `tahapan-proyek/03-desain/erd/project.md`: judul, alur, hak akses, mermaid, enum, tabel kolom per tabel (Kolom | Tipe | Null | Default | Keterangan), nilai yang dihitung, index, alasan desain, belum diputuskan. Semua `id` = `uuid` default `gen_random_uuid()`, semua `created_at`/`updated_at` = `timestamptz` default `now()`.

### 4.1 Enum

| Enum | Nilai | Label UI |
|---|---|---|
| `task_base_kind` | task, issue, idea | Tugas, Masalah, Ide (kategori dasar, label jenis di UI memakai `task_kinds.name`) |
| `task_status` | todo, in_progress, in_review, done, canceled | Belum dikerjakan, Sedang dikerjakan, Menunggu diperiksa, Selesai, Dibatalkan |
| `task_priority` | low, medium, high, critical | Rendah, Sedang, Tinggi, Kritis |
| `task_source` | form, ai_text, csv, story, template | – |
| `task_review_decision` | approved, returned | Disetujui, Dikembalikan |
| `task_attachment_type` | file, image, link | File, Foto, Tautan |
| `task_import_status` | previewed, imported, canceled | – |
| `task_cancel_category` | duplicate, not_needed, out_of_scope, created_by_mistake, other | Dobel / sudah ada, Tidak jadi dikerjakan, Di luar cakupan proyek, Salah buat, Lainnya |

### 4.2 Tabel

**`task_kinds`**: id · project_id FK CASCADE · name varchar(50) · base_kind `task_base_kind` · position smallint · archived_at NULL · created_at · updated_at.
UNIQUE `(project_id, lower(name))`. Maks. 6 jenis aktif per proyek dijaga di service.

**`tasks`**: id · project_id FK · number bigint (nomor tampil `#482`, dari sequence `task_number_seq`, UNIQUE untuk semua proyek) · phase_id FK project_phases NULL (SET NULL) · kind_id FK task_kinds NOT NULL · title varchar(200) · description text NULL · status `task_status` default `'todo'` · priority `task_priority` default `'medium'` · assignee_id FK users NULL · reviewer_id FK users NULL (hanya Pengelola/Admin, dijaga di service; kosong = jatuh ke Admin, keputusan #7) · needs_review boolean (default dari `projects.tasks_need_review_default`; nyalakan: yang boleh ubah tugas, matikan: hanya Pengelola/Admin; terkunci saat in_review/done/canceled) · created_by FK users · start_date date NULL · due_date date NULL · estimate_hours numeric(6,1) NULL · source `task_source` · import_job_id FK task_import_jobs NULL · reopen_count int default 0 · return_count int default 0 · cancel_category `task_cancel_category` NULL · cancel_note text NULL · started_at · review_requested_at · completed_at · canceled_at · last_activity_at default `now()` · deleted_at NULL · deleted_by FK users NULL · created_at · updated_at.
CHECK: `due_date >= start_date`, `reviewer_id IS NULL OR assignee_id IS NULL OR reviewer_id <> assignee_id`, `status <> 'canceled' OR cancel_category IS NOT NULL`, `cancel_category IS DISTINCT FROM 'other' OR cancel_note IS NOT NULL`.

**`task_checklist_items`**: id · task_id FK CASCADE · text varchar(300) · is_done boolean default false · done_by FK users NULL · done_at NULL · position smallint · created_at · updated_at.

**`task_comments`**: id · task_id FK CASCADE · author_id FK users · body text · edited_at NULL · deleted_at NULL · created_at.

**`task_attachments`** (Bukti): id · task_id FK CASCADE · type `task_attachment_type` · url text (link, atau lokasi file di storage) · file_name varchar(255) NULL · note text NULL · uploaded_by FK users · deleted_at NULL · created_at.

**`task_dependencies`**: PK (task_id, blocked_by_task_id) · task_id FK CASCADE (tugas yang menunggu) · blocked_by_task_id FK CASCADE (tugas yang ditunggu) · created_by FK users · created_at.
CHECK `task_id <> blocked_by_task_id`. Siklus dan beda proyek ditolak di service (A7).

**`task_reviews`**: id · task_id FK CASCADE · requested_by FK users · reviewer_id FK users NULL (pemeriksa saat diminta) · decision `task_review_decision` NULL (kosong = masih menunggu) · decided_by FK users NULL (Pengelola/Admin yang memutuskan, bisa berbeda dari pemeriksa yang ditunjuk) · note text NULL (wajib saat `returned`) · requested_at · decided_at NULL.

**`task_activities`**: id · task_id FK CASCADE · actor_id FK users · action varchar(50) (`created`, `status_changed`, `assigned`, `reviewer_changed`, `review_requested`, `approved`, `returned`, `reopened`, `canceled`, `restored`, `field_changed`, `checklist_done`, `attachment_added`, `dependency_added`, `dependency_removed`, `deleted`) · payload jsonb (untuk `created` via `ai_text`: tulisan asli user) · created_at.

**`tags`**: id · project_id FK CASCADE · name varchar(40) · created_by FK users · created_at. UNIQUE `(project_id, lower(name))`.

**`task_tags`**: PK (task_id, tag_id) · task_id FK CASCADE · tag_id FK CASCADE · created_at.

**`task_import_jobs`**: id · project_id FK · created_by FK users · file_name varchar(255) NULL (kosong jika ditempel) · rows_total int · rows_ok int · rows_error int · errors jsonb (nomor baris + pesan) · warnings jsonb · status `task_import_status` default `'previewed'` · created_at · updated_at.
Header CSV: `title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames`. Aturan baris: lihat keputusan #21. `errors` menyimpan baris galat, `warnings` menyimpan baris yang tetap diimpor dengan catatan.

### 4.3 Nilai yang dihitung, tidak disimpan

| Nilai | Rumus |
|---|---|
| Terlambat | `due_date` < hari ini dan status ∉ {done, canceled} |
| Tertahan | ada `blocked_by_task_id` yang status ∉ {done, canceled} |
| Mandek | status `in_progress` dan `last_activity_at` lebih lama dari `TASK_STALE_DAYS` (A8) |
| Dibuka lagi ×N / Dikembalikan ×N | `reopen_count` / `return_count` |
| Kelompok jadwal | Terlambat · Hari ini · Besok · Minggu ini (s.d. Minggu) · Nanti · Tanpa tenggat |
| Tugas aktif | status ∈ {todo, in_progress, in_review} |
| Bug terbuka (Ringkasan) | tugas aktif dengan jenis ber-`base_kind = issue` |

Jika satu tugas memenuhi beberapa label, yang tampil di baris hanya satu, dengan urutan: **Terlambat > Menunggu diperiksa saya > Tertahan > Mandek** (mengikuti usulan di `diskusi/catatan-beranda-zona-b-d.md`). Detail tugas menampilkan semuanya.

### 4.4 Index
`tasks(project_id, status)`, `tasks(assignee_id, status, due_date)` (Tugas saya), `tasks(reviewer_id, status)` (Menunggu diperiksa saya), `tasks(number)` UNIQUE, `tasks(phase_id)`, `tasks(kind_id)`, `tasks(deleted_at)`, `tasks(status, last_activity_at)` (Mandek), `task_dependencies(blocked_by_task_id)`, `task_activities(task_id, created_at)`, `task_comments(task_id, created_at)`, `task_reviews(task_id, requested_at)`, `task_tags(tag_id)`. Daftar tugas **wajib paginated**.

### 4.5 Isi bagian "Belum diputuskan" di `tahapan-proyek/03-desain/erd/task.md`
Asumsi A1–A5 dan A7–A10, ditambah:
- Apakah tugas boleh tanpa proyek (tugas pribadi)? Desain ini: **tidak**, `project_id` wajib.
- Apakah sub-tugas sungguhan dibutuhkan, atau checklist sudah cukup?
- Apakah estimasi jam benar-benar dipakai? Kalau tidak, kolom disembunyikan di form.

---

## 5. Tugas 3: wireframe di Penpot (halaman WIREFRAME NICO)

**Gaya:** sama dengan grup `02 · Proyek — Wireframe`: frame putih **1280×800**, lo-fi abu-abu, panah dengan keterangan. Letakkan **di bawah grup 02** (grup 02: y = 2820, tinggi 4080, berakhir y = 6900). Periksa batasnya dulu.

**Kerangka layar:** top bar (cari, lonceng, avatar) + menu samping (Beranda, Inbox, Proyek, **Tugas** aktif, Events, Tim, Sampah, Pengaturan).

**Data dummy** (hari ini = Rabu, 7 Oktober 2026; login = **Nico**, Project Manager, Lead Atlas). Semua tugas di **Proyek Atlas**, kecuali disebut lain.

| # | Tugas | Jenis | Prioritas | Mengerjakan | Pembuat → Pemeriksa | Tenggat | Status | Tahapan | Tag |
|---|---|---|---|---|---|---|---|---|---|
| #12 | Fix login SSO | Bug | Tinggi | Nico | Rina → **Admin** (Perlu diperiksa dinyalakan Nico. Pemeriksa seharusnya Lead Nico, tapi Nico yang mengerjakan dan Atlas hanya punya 1 Pengelola, keputusan #7) | 5 Okt (terlambat 2 hari) | Sedang dikerjakan, checklist 2/3 | Pengembangan | sso, login |
| #14 | Tulis spesifikasi API | Tugas | Sedang | Nico | Nico → – (tidak perlu diperiksa) | 7 Okt (hari ini) | Belum dikerjakan | Pengembangan | api |
| #15 | Periksa desain halaman onboarding | Tugas | Sedang | Nico | Rina → – | 9 Okt (minggu ini) | Belum dikerjakan | Pengembangan | desain |
| #16 | Siapkan data uji | Tugas | Sedang | Dodi | Nico → – | 9 Okt | Sedang dikerjakan, **Tertahan** oleh #12 | Pengujian | uji |
| #17 | Perbaiki tombol simpan di halaman profil | Bug | Sedang | Dodi | Nico → Nico (Perlu diperiksa dinyalakan Nico saat membuat) | 8 Okt (besok) | **Menunggu diperiksa** | Pengembangan | profil |
| #8 | Susun rancangan arsitektur | Tugas | Tinggi | Nico | Nico → – | 20 Sep | Selesai | Perencanaan | – |
| #9 | Laporan progres untuk PT Sinar | Tugas | Sedang | Nico | Rina → – | 8 Okt (besok) | Belum dikerjakan | – (Portal Klien PT Sinar) | laporan |

Timeline #12: Rina membuat tugas (3 Okt) · Nico mulai mengerjakan (4 Okt) · Dodi: "error masih muncul di staging" (6 Okt) · Nico melampirkan bukti tangkapan layar (6 Okt).
Tulis saja ⑤: "Rina perbaiki halaman login besok, penting. Dodi siapkan data uji sebelum Jumat." → 2 draf (Rina · 8 Okt · Tinggi · Bug) dan (Dodi · 9 Okt · Sedang · Tugas).

**Layar:**

| No | Layar | Isi wajib |
|---|---|---|
| ① | Tugas saya (List) | Judul "Tugas", tombol besar **+ Tugas baru**, toggle **Tugas saya / Semua tugas**, cari, chip status, filter Proyek · Orang · Jenis · Prioritas · Tag, Urutkan, toggle List/Papan. Kelompok jadwal: Terlambat (#12), Hari ini (#14), Besok (#9), Minggu ini (#15). Bagian **Menunggu diperiksa saya** (#17) di atas. Tiap baris: judul, proyek, jenis, prioritas, label (ikon + teks), satu tombol langkah berikutnya |
| ② | Semua tugas (List, filter Proyek Atlas) | Tab Semua tugas aktif, filter terisi, kolom: #, judul, jenis, status, prioritas, mengerjakan, tenggat, tag. Checkbox selalu terlihat, tombol **Unduh CSV** dan **Impor CSV** (Admin/Pengelola/Anggota). Tampilkan #16 dengan label Tertahan |
| ③ | Papan | 4 kolom: Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai. Kartu besar. Catatan: pindah kartu lewat tombol di kartu, bukan hanya drag |
| ④ | Tugas saya kosong | Pesan: "Belum ada tugas untuk Anda. Tugas yang ditunjuk ke Anda akan muncul di sini." Tombol + Tugas baru. Catatan: Pemantau tidak melihat tombol ini |
| ⑤ | Tugas baru · Tulis saja ✦ | Toggle **Tulis saja ✦ / Isi form**, pilih proyek, kotak teks besar berisi contoh dummy, 🎤 (nonaktif, "segera"), tombol **Susun ✦**. Di bawahnya hasil: banner "Draf dari AI. Periksa dulu sebelum disimpan.", 2 draf dengan centang + ✏️, contoh pertanyaan "Rina yang mana?" (kotak catatan), tombol Ubah tulisan · **Simpan 2 tugas** |
| ⑥ | Tugas baru · Isi form | Proyek, Judul*, Siapa yang mengerjakan, Prioritas, Tenggat. "Tampilkan lebih banyak" (terbuka): Deskripsi, Jenis, Tahapan, Tanggal mulai, Estimasi jam, Tag, tombol **Perlu diperiksa** on/off (nilai awal dari setelan proyek, ada keterangan "ikut setelan proyek") + Pemeriksa (muncul hanya jika menyala, otomatis, pilihan hanya Pengelola/Admin). Tombol Batal · **Simpan** |
| ⑦ | Impor CSV | Unggah file / tempel teks, Unduh contoh, pratinjau 5 baris (1 galat: "Jenis 'QC' tidak ada di proyek ini"; 1 peringatan: "budi@kantor.id bukan anggota Atlas, diimpor tanpa yang mengerjakan"), ringkasan "4 siap (1 dengan catatan), 1 galat". Tombol Batal · **Impor 4 tugas** |
| ⑧ | Detail · Belum dikerjakan (#14) | Header: ← Kembali, judul, #14, proyek, tahapan, jenis, prioritas, mengerjakan, tenggat, label "Hari ini". Tombol utama **Mulai kerjakan**, sekunder **Tandai selesai** (A4). Isi: deskripsi, langkah-langkah kosong + "Tambah langkah", obrolan & riwayat. Menu ⋯: Batalkan, Hapus |
| ⑨ | Detail · Sedang dikerjakan (#12) | Label ⏰ Terlambat 2 hari, tombol **Perlu diperiksa: Ya** (dinyalakan Nico, terkunci untuk Anggota) · Pemeriksa: Admin + saran "Tambahkan pengelola kedua". Langkah-langkah 2/3, Bukti (1 tangkapan layar + catatan), **Menahan 1 tugas**: #16 Siapkan data uji · Dodi, tag, Obrolan & riwayat sesuai timeline dummy + kotak komentar. Tombol utama **Minta diperiksa** |
| ⑩ | Detail · Menunggu diperiksa (#17, dilihat Nico) | Banner "Dodi meminta Anda memeriksa tugas ini · 7 Okt". Bukti dari Dodi. Tombol **Setujui** dan **Kembalikan**. Tombol Perlu diperiksa terkunci (status Menunggu diperiksa). Catatan: Anggota yang membuka layar ini tidak melihat kedua tombol |
| ⑪ | Modal Kembalikan + Modal Batalkan | **Kembalikan**: tombol cepat "Masih ada error" · "Belum sesuai permintaan" · "Bukti kurang jelas" (mengisi teks), Alasan* (teks), contoh: "Tombol masih tidak bisa diklik di HP". Tombol Batal · **Kembalikan**. **Batalkan** (berdampingan): 5 pilihan kategori, Lainnya terpilih + catatan* "Klien menunda fitur ini sampai tahun depan". Tombol Batal · **Batalkan tugas**. Catatan: Buka lagi memakai modal seperti Kembalikan tanpa tombol cepat |
| ⑫ | Pengaturan proyek · Periksa, Jenis tugas & Tag | Dari Detail proyek ⋯ › Pengaturan proyek. Bagian atas: tombol **"Tugas baru perlu diperiksa"** on/off (Atlas: mati) dengan penjelasan. Daftar jenis Atlas: Tugas (Tugas), Bug (Masalah), Ide (Ide). Tiap baris: nama, kategori dasar, Arsipkan (tanpa kolom Perlu diperiksa). Tombol + Jenis (maks. 6). Di bawahnya bagian **Tag**: daftar tag + jumlah tugas, ganti nama, gabung, hapus |

**Panah & keterangan:**

| Dari → Ke | Keterangan |
|---|---|
| ① ↔ ② | Tugas saya / Semua tugas |
| ② ↔ ③ | List / Papan |
| ① → ⑤ | + Tugas baru (default Tulis saja) |
| ⑤ ↔ ⑥ | Toggle cara membuat |
| ② → ⑦ | Impor CSV (Admin/Pengelola/Anggota) |
| ⑤ / ⑥ / ⑦ → ① | Tugas tersimpan |
| ① → ⑧ | Klik tugas |
| ⑧ → ⑨ | Mulai kerjakan |
| ⑨ → ⑩ | Minta diperiksa (pemeriksa dapat notifikasi) |
| ⑩ → Selesai | Setujui, otomatis Selesai |
| ⑩ → ⑪ → ⑨ | Kembalikan + alasan |
| ⑧ → Selesai (putus-putus) | Tandai selesai, tugas tanpa pemeriksaan |
| ① (putus-putus) → ④ | User yang belum punya tugas |

**Catatan anotasi** (kotak kuning, bukan bagian UI):
- Matriks izin di dekat ①.
- Diagram alur status (§2) di dekat ⑧–⑩.
- Di ⑤: "AI tidak menyimpan apa pun sebelum Simpan diklik. Tanggal dihitung oleh sistem, nama hanya dari anggota proyek."
- Di ⑨: "Tanpa bukti, Minta diperiksa hanya memberi peringatan (A9)."
- Di ⑩: "Yang boleh memeriksa: Pengelola (termasuk Lead) dan Admin."
- Di ⑨: "Pemeriksa jatuh ke Admin karena Lead sendiri yang mengerjakan dan Atlas hanya punya 1 Pengelola (keputusan #7)."

---

## 6. Tugas 4: ERD di Penpot (halaman ERD NICO)

- Grup baru `03 · Tugas — ERD`, di bawah grup `02 · Proyek — ERD` (grup 02: y = 2010, tinggi 3442, berakhir y = 5452), gaya kotak tabel sama.
- Isi: 11 tabel dari §4.2. `users`, `projects`, `project_phases` cukup kotak rujukan kecil bergaris putus-putus yang menunjuk ke grup 01/02.
- Garis relasi + kardinalitas sesuai mermaid di `tahapan-proyek/03-desain/erd/task.md`. FK ke `users` selain `assignee_id` dan `reviewer_id` tidak perlu digambar garisnya, cukup dijelaskan di kotak Keterangan.
- Tabel ringkas **"Layar → tabel"**: ①②③ tasks + task_kinds + tags + hitungan · ⑤ tasks (source ai_text) + task_activities · ⑥ tasks, task_tags · ⑦ task_import_jobs → tasks, tags · ⑧⑨ tasks, task_checklist_items, task_attachments, task_dependencies, task_comments, task_activities · ⑩⑪ task_reviews, tasks · ⑫ task_kinds, tags.
- Kotak kuning **"Dihitung, tidak disimpan"** dari §4.3.
- **Perbarui grup 02**: kotak placeholder `tasks` diberi keterangan "lihat grup 03 · Tugas".

---

## 7. Kendala Penpot yang sudah diketahui
Lihat `tahapan-proyek/03-desain/erd/diskusi/02-proyek.md` §6 dan §8 "Kendala selama pengerjaan". Ringkasnya: jalankan Claude dengan env Penpot ter-load, tab Penpot harus fokus, plugin hanya mengubah halaman aktif (`penpot.openPage(...)`), pecah perintah besar menjadi 2–4 tabel per perintah, dan cek `Object.keys(storage)` sebelum memakai helper.

---

## 8. Kriteria selesai

- [x] `tahapan-proyek/03-desain/erd/project.md` diperbarui sesuai §3
- [x] `tahapan-proyek/03-desain/erd/task.md` memuat 11 tabel, enum, alur status, matriks izin, rumus hitungan, index, dan asumsi A1–A5, A7–A10
- [x] Wireframe ①–⑫ ada, bernomor, dengan panah & keterangan, dan data dummy sesuai §5
- [x] ERD di Penpot sama persis dengan `tahapan-proyek/03-desain/erd/task.md`, grup 02 sudah diberi rujukan
- [x] Export PNG tiap grup dicek secara visual: tidak ada teks terpotong atau elemen bertumpuk
- [x] Bagian **§9** di bawah diisi

## 9. Hasil & kendala (diisi agent pelaksana)

### Tugas 1 · `tahapan-proyek/03-desain/erd/project.md` ✅
- Header: baris "Diperbarui 7 Oktober 2026 …".
- Alur poin 3: pembuatan 3 jenis tugas default.
- Mermaid: relasi `projects → task_kinds` dan `projects → tags`, kotak `tasks` diberi `kind_id`, ditambah kotak ringkas `task_kinds` dan `tags`.
- Contoh `structure` template: tugas memakai `"kind": "Tugas", "base_kind": "task"`, ditambah daftar `task_kinds`.
- Placeholder tabel `tasks` diganti rujukan ke `tahapan-proyek/03-desain/erd/task.md`.

### Tugas 2 · `tahapan-proyek/03-desain/erd/task.md` ✅
- Alur + diagram status + tabel efek tiap transisi, hak akses, **Aturan pemeriksa** (urutan cadangan keputusan #7), mermaid 11 tabel, 7 enum, tabel kolom per tabel, nilai yang dihitung, index, alasan desain, belum diputuskan.
- Tambahan dari Claude, sudah dibahas dan diputuskan (keputusan #19–#21):
  - Nomor tugas: diubah dari urut per proyek menjadi satu sequence untuk semua proyek.
  - UNIQUE parsial `task_reviews(task_id) WHERE decision IS NULL`: paling banyak satu permintaan periksa yang menunggu.
  - CSV: `tagNames` dipisah `;`. Email tidak cocok diubah dari galat menjadi peringatan (kolom baru `task_import_jobs.warnings`).
  - Konfigurasi `TASK_KINDS_MAX_ACTIVE = 6` dan `TASK_STALE_DAYS = 3`.
  - Kategori alasan Batalkan (keputusan #22): `cancel_reason` dipecah jadi `cancel_category` + `cancel_note`, enum baru `task_cancel_category`.

### Tugas 3 · Wireframe (WIREFRAME NICO, grup `03 · Tugas — Wireframe`) ✅
Dikerjakan 7 Okt 2026 oleh sesi menu Proyek (02), atas permintaan user, supaya tidak ada dua sesi yang menggambar grup yang sama.

- Posisi: x = 0, y = 7300, ukuran 8080 × 4300 (berakhir y = 11600). Grup 02 berakhir y = 6900.
- Tata letak: baris 1 = ① ② ③ ⑦ ④ · baris 2 = ⑧ ⑨ ⑩ ⑪ + matriks izin · baris 3 = ⑤ ⑥ + diagram alur status + ⑫.
- 12 layar sesuai §5 dengan data dummy §5. Semua panah §5 ada:
  - ① ↔ ②, ② ↔ ③, ⑤ ↔ ⑥ (dua arah). ② → ⑦ dan ① → ④ (putus-putus) lewat atas. ① → ⑤ lewat jalur kiri. ① → ⑧, ⑧ → ⑨ → ⑩ → ⑪, ⑪ → ⑨ lewat bawah.
  - ⑩ → penanda **✓ Selesai** (Setujui) dan ⑧ → Selesai (putus-putus, Tandai selesai).
  - ⑤ / ⑥ / ⑦ → ①: digambar sebagai panah pendek ke penanda **"Tersimpan → kembali ke ①"**, bukan garis panjang ke ①, supaya tidak menyilang 4–5 garis lain.
- Catatan kuning: ① urutan label & tombol tanpa hover, ⑤ AI tidak menyimpan, ⑨ bukti wajib untuk Bug + pemeriksa jatuh ke Admin, ⑩ yang boleh memeriksa, ④ Pemantau, **matriks izin** (di kanan ⑪, karena sekitar ① sudah terisi jalur panah), **diagram alur status** (di bawah ⑩, dekat ⑧–⑩).
- Data dummy tambahan dari Claude (tidak ada di §5):
  - #12: langkah "Cek konfigurasi SSO di staging" ✓, "Perbaiki redirect setelah login" ✓, "Uji ulang di Safari dan Chrome"; bukti `tangkapan-layar-login.png`.
  - #17: dua bukti (`sebelum.png`, `sesudah.png`), langkah 2/2, riwayat 5–7 Okt. #14: deskripsi singkat.
  - ⑤: draf pertama berjudul "Perbaiki halaman login"; contoh pertanyaan AI memakai nama rekaan "Rina Wulandari" / "Rina Pratiwi".
  - ⑥: form diisi contoh #17. ⑦: 5 baris CSV (FAQ, Uji login QC = galat, Perbaiki ikon menu + budi@kantor.id = catatan, panduan pengguna, baris dengan jenis & prioritas kosong).
  - ⑪: modal Batalkan memakai #15. ⑫: jumlah pemakaian Tugas 4, Bug 2, Ide 0, tiap tag 1 tugas.
  - Tombol langkah berikutnya untuk Nico (Pengelola): #17 Periksa, #12 Minta diperiksa, #14/#15/#9 Mulai kerjakan, #16 (Papan) Tandai selesai, #8 Buka lagi.

### Tugas 4 · ERD (ERD NICO, grup `03 · Tugas — ERD`) ✅
- Posisi: x = 0, y = 5844, ukuran 5940 × 3146 (berakhir y = 8990). Grup 02 berakhir y = 5544 (bukan 5452 seperti di §6, karena grup 02 sudah diperbarui saat sinkron).
- 11 tabel sama dengan mermaid `tahapan-proyek/03-desain/erd/task.md`. Rujukan putus-putus: `projects`, `project_phases` (grup 02), `users` (grup 01).
- Garis relasi tanpa persilangan: bus `projects.id` (ke tasks, task_kinds, task_import_jobs, tags), bus `tasks.id` (ke 7 tabel anak, dua garis ke `task_dependencies` diberi label "menunggu" / "ditunggu"), `task_kinds.id`, `project_phases.id`, `task_import_jobs.id` → tasks, `tags.id` → task_tags, `users.id` → `assignee_id` dan `reviewer_id`.
- Tabel **Layar → tabel** sesuai §6, ditambah baris ④ dan pemisahan ⑤ / ⑥ / ⑦. Kotak **Keterangan** (termasuk UNIQUE parsial `task_reviews`) dan kotak kuning **Dihitung, tidak disimpan** (§4.3 + urutan label).
- **Grup 02 sudah diberi rujukan** (dikerjakan saat sinkron, lihat `02-proyek.md` §8 "Sinkron dengan 03 · Tugas"): kotak `tasks` berketerangan "lihat grup 03 · Tugas" + kotak rujukan `task_kinds` dan `tags`.

### Perubahan 8 Okt 2026: "Perlu diperiksa" jadi tombol on/off per tugas (keputusan #23, #24)
Dikerjakan oleh sesi menu Proyek atas permintaan user. Latar belakang: aturan periksa berdasarkan jenis (Bug = ya) terlalu khas IT, sedangkan PM dipakai lintas bidang.

**Aturan baru**
- Nilai awal dari setelan proyek `projects.tasks_need_review_default` (awalnya **mati**). Menyalakan: yang boleh mengubah tugas. Mematikan: hanya Pengelola/Admin. Terkunci saat Menunggu diperiksa, Selesai, Dibatalkan.
- `task_kinds.needs_review` dihapus. Jenis hanya label + kategori hitungan.
- Bukti tidak lagi wajib untuk Bug (asumsi A9, **belum dikonfirmasi user**): hanya peringatan.

**Dokumen**: `tahapan-proyek/03-desain/erd/task.md` (bagian "Aturan tombol Perlu diperiksa", izin, transisi, tabel `task_kinds`/`tasks`, CSV `needsReview`, log `review_required_changed`, alasan desain, A5/A9/A10), `tahapan-proyek/03-desain/erd/project.md` (kolom baru, struktur template), keputusan #6 digantikan #23, #24 baru, deskripsi layar ⑥ ⑨ ⑩ ⑫ dan catatan di §5.

**Wireframe 03** (isi di dalam frame saja, panah dan keterangan antar layar tidak disentuh karena sudah diatur user):
- ⑥: centang diganti tombol on/off + keterangan "ikut setelan proyek", pemeriksa hanya jika menyala.
- ⑧ (#14): tombol mati ("langsung Tandai selesai"). ⑨ (#12): menyala, "dinyalakan Nico", Pemeriksa: Admin. ⑩ (#17): menyala dan terkunci.
- ⑫: dibangun ulang. Kartu **Tugas baru perlu diperiksa** (mati) di atas, kolom "Perlu diperiksa" per jenis dihapus, tag dirapatkan supaya muat. Judul frame menjadi "⑫ Pengaturan proyek · Periksa, Jenis tugas & Tag".
- Matriks izin: tambah 3 baris (nyalakan, matikan, setelan proyek). Diagram alur status dan catatan ⑨ ⑩ disesuaikan.

**ERD**: `projects.tasks_need_review_default` ditambahkan di grup 02 (kotak `projects`) dan di kotak rujukan grup 03. `task_kinds.needs_review` dihapus di grup 03, keterangan `tasks.needs_review` dan subjudul `task_attachments` diperbarui, tabel Layar → tabel ikut.

**Kondisi Penpot yang ditemukan**: frame ⑫ beserta labelnya, grup ERD 02, dan grup ERD 03 sedang **disembunyikan** (bukan oleh sesi ini). Saya tampilkan sementara untuk mengedit dan memeriksa, lalu sembunyikan lagi seperti semula.

### Pemeriksaan visual
Setiap layar ①–⑫, matriks izin, diagram alur status, dan kedua grup diekspor ke PNG dan dicek. Yang diperbaiki:
- ① catatan kaki menimpa baris terakhir → dipindah ke catatan kuning.
- ② judul #17 terbungkus dua baris → ukuran huruf 14.
- ⑩ keterangan di samping tombol mepet garis sidebar → dipendekkan jadi "→ otomatis Selesai".
- Diagram alur: label "dibuat: …" tertimpa garis Pulihkan → dipindah; catatan bawah diluruskan ("wajib diperiksa diatur per jenis, default Bug").
- ERD: judul/subjudul dinaikkan supaya tidak mepet garis rute atas.

### Kendala
| Kendala | Penyelesaian |
|---|---|
| `storage` plugin Penpot kosong lagi dua kali (plugin dimuat ulang) | Semua helper didefinisikan ulang sekaligus dengan penanda `storage.ready`; setiap perintah mengecek penanda itu dulu |
| Grup lebar dengan banyak panah rawan saling silang | Panah balik "Tugas tersimpan" diganti penanda pendek; rute panjang lewat atas/kiri grup |

---

## Tindak lanjut di luar rencana ini (jangan dikerjakan sekarang)
- Menu **Tiket** dan **Pengembangan** (keputusan #2).
- Tab Tugas di Detail proyek (⑨ modul 02) diselaraskan dengan komponen list modul ini.
- Beranda: label "Telat" → "Terlambat", dan "Menunggu saya" memakai `reviewer_id` + status `in_review`.
- Inbox: jenis notifikasi tugas (ditunjuk, diminta memeriksa, disetujui, dikembalikan, dikomentari, di-mention).
- Sampah global: tampilan tugas yang dihapus.
