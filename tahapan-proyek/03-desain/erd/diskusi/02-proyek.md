# Diskusi & Rencana Kerja: Wireframe & ERD 02 · Proyek

> Tanggal: 7 Oktober 2026. Status: **selesai dikerjakan** (Tugas 1–4, lihat §8).
> Lokasi hasil nanti: Penpot, file **PM-New**
> - Halaman **WIREFRAME NICO**, grup `02 · Proyek — Wireframe`
> - Halaman **ERD NICO**, grup `02 · Proyek — ERD`
> - Dokumen ERD: `tahapan-proyek/03-desain/erd/project.md` (baru) dan `tahapan-proyek/03-desain/erd/user-profile.md` (diubah)

---

## 0. Untuk agent pelaksana: baca dulu

1. `tahapan-proyek/03-desain/erd/user-profile.md` dan `tahapan-proyek/03-desain/erd/diskusi/01-login-registrasi-beranda.md`. Pola kerja, gaya wireframe, dan kendala Penpot ada di sana.
2. `note.md` bagian **Menu Proyek** dan **Detail Proyek**. Ini spesifikasi lama yang sudah dirampingkan di dokumen ini. **Kalau bertentangan, dokumen ini yang berlaku.**
3. Segmen target: **awam/lansia**. Bahasa polos, teks besar, tanpa aksi yang bergantung hover.

Urutan **wajib**: Tugas 1 → 2 → 3 → 4. ERD digambar setelah `tahapan-proyek/03-desain/erd/project.md` selesai, supaya gambar sama persis dengan dokumen.

---

## 1. Keputusan dari diskusi

| # | Keputusan | Asal |
|---|---|---|
| 1 | Menu Proyek punya 3 tampilan: **Semua proyek**, **Proyek baru**, **Detail proyek** | User |
| 2 | Yang boleh **membuat proyek** hanya **Admin** dan **Project Manager** | User |
| 3 | Daftar proyek: **Member** melihat proyek yang diikuti. **Admin & Project Manager** melihat semua proyek | User |
| 4 | Project Manager hanya boleh **mengubah proyek yang dia kelola**. Proyek lain hanya bisa dilihat | User |
| 5 | **Member bisa ditunjuk sebagai pengelola** sebuah proyek | User |
| 6 | Detail proyek dirampingkan dari 7 tab menjadi **4 tab: Ringkasan · Tugas · Tahapan · Anggota**. Retro, commits, status update AI, Gantt ditunda ke fase 2 | User setuju usulan Claude |
| 7 | Milestone + Phases + Extensions **digabung ke tab Tahapan** (stepper fase, milestone di dalam fase, riwayat tenggat di bawahnya) | User |
| 8 | **"Ceritakan proyeknya" (AI) masuk v1**. AI hanya menyusun draf, user memeriksa, lalu klik Buat. Tidak ada yang tersimpan otomatis | User (+ D8 di `tahapan-proyek/02-analisis/hasil-orchestrasi/orchestration/DECISIONS.md`) |
| 9 | Label kondisi: **Lancar · Perlu perhatian · Terlambat**, ikon + teks (✓ ! ⏰), selalu disertai satu kalimat alasan, hanya untuk proyek Berjalan | Rekomendasi Claude: bahasa polos, "Perlu perhatian" mengajak bertindak, 3 tingkat karena "sudah" vs "akan" terlambat beda tindakan |
| 10 | Karena keputusan #2–#4, **Project Manager menjadi peran tingkat aplikasi**: `users.role` = `admin | project_manager | member` | Turunan #2–#4 |
| 11 | Peran di dalam proyek dibedakan namanya: `manager | member | viewer`, dengan label UI **Pengelola · Anggota · Pemantau** | Usulan Claude |
| 12 | **Status** (manual) dipisah dari **kondisi** (dihitung sistem) | Usulan Claude dari analisis A2 |
| 13 | Daftar proyek: tampilan **List** (default) dan **Grid**. Comfy/dense, tombol refresh, dan timeline view dibuang | Usulan Claude dari analisis A2 |

### Matriks izin

| Aksi | Admin | Project Manager | Member |
|---|---|---|---|
| Lihat tombol **+ Proyek baru** dan membuat proyek (form, cerita, template) | ✅ | ✅ | ❌ tombol disembunyikan |
| Lihat daftar & detail proyek | Semua | Semua | Hanya yang diikuti |
| Ubah info proyek, status, tahapan, milestone, anggota, perpanjang tenggat, ganti kondisi manual, pindah ke Sampah | ✅ semua proyek | ✅ hanya jika `manager` di proyek itu | ✅ hanya jika `manager` di proyek itu |
| Tambah/ubah tugas di proyek | Rincian izin tugas ada di `tahapan-proyek/03-desain/erd/task.md` › Hak akses | | |
| Setujui / Kembalikan tugas | ✅ | Hanya jika `manager` di proyek itu | Hanya jika `manager` di proyek itu |
| Simpan proyek sebagai template | ✅ | ✅ | ❌ |

Aturan turunan:
- Pembuat proyek otomatis masuk `project_members` sebagai `manager` dan menjadi Lead default.
- **Lead** = satu pengelola utama yang tampil di header. Lead wajib ber-`role = manager` di proyek itu, apa pun peran aplikasinya.
- Proyek **wajib punya minimal 1 pengelola**. Pengelola terakhir tidak bisa dikeluarkan atau diturunkan perannya.
- Peran aplikasi `project_manager` diberikan oleh Admin. User baru tetap `member`.

### Asumsi Claude (tandai di dokumen, belum dikonfirmasi user)
- A1. Project Manager yang bukan anggota sebuah proyek bisa membuka proyek itu tapi **hanya baca**, termasuk tugasnya.
- A2. Proyek di Sampah bisa dipulihkan selama **30 hari** (mengikuti Sampah tugas di `note.md`). Setelah itu dihapus permanen.
- A3. Tenggat baru saat perpanjangan harus **lebih lambat** dari tenggat sekarang. Kategori + alasan **wajib** diisi (keputusan E2 di DECISIONS.md).
- A4. Tanggal di template disimpan **relatif** (hari ke-N dari mulai proyek), supaya bisa dipakai ulang.

---

## 2. Tugas 1: ubah `tahapan-proyek/03-desain/erd/user-profile.md`

1. Di diagram mermaid: `enum role "admin | member"` → `enum role "admin | project_manager | member"`.
2. Di tabel `users`, baris `role`: keterangan menjadi `admin`, `project_manager`, atau `member`. Default tetap `'member'`.
3. Tambah bagian baru **"Arti peran"** setelah tabel `users`:

   | Peran | Bisa |
   |---|---|
   | admin | Menyetujui user, memberi peran, melihat & mengubah semua proyek |
   | project_manager | Membuat proyek, melihat semua proyek, mengubah hanya proyek yang dia kelola |
   | member | Melihat proyek yang diikuti. Bisa jadi pengelola proyek jika ditunjuk |

   Tambahkan catatan: peran di dalam proyek (`manager/member/viewer`) ada di `tahapan-proyek/03-desain/erd/project.md` dan **terpisah** dari peran ini.
4. Di header file, tambah baris: `Diperbarui 7 Oktober 2026: tambah peran project_manager (keputusan modul 02 · Proyek).`
5. Di "Yang belum diputuskan", tambah: **Layar admin untuk memberi/mencabut peran project_manager** belum ada wireframe-nya.
6. Di `tahapan-proyek/03-desain/erd/diskusi/01-login-registrasi-beranda.md` §4 (baris `role (admin · member)`), tambah catatan singkat: `→ diperbarui jadi admin · project_manager · member, lihat 02-proyek.md`. Jangan ubah isi lain.

---

## 3. Tugas 2: tulis `tahapan-proyek/03-desain/erd/project.md`

Ikuti format `tahapan-proyek/03-desain/erd/user-profile.md`: judul, alur yang didukung, diagram mermaid, tabel kolom per tabel (Kolom | Tipe | Null | Default | Keterangan), index, alasan desain, belum diputuskan. Semua `id` = `uuid` default `gen_random_uuid()`, dan semua `created_at`/`updated_at` = `timestamptz` default `now()`.

### 3.1 Enum

| Enum | Nilai | Label UI |
|---|---|---|
| `project_status` | draft, active, on_hold, completed, canceled | Draf, Berjalan, Ditunda, Selesai, Dibatalkan |
| `project_priority` | low, medium, high, critical | Rendah, Sedang, Tinggi, Kritis |
| `project_member_role` | manager, member, viewer | Pengelola, Anggota, Pemantau |
| `project_condition` | on_track, at_risk, off_track | Lancar, Perlu perhatian, Terlambat |
| `project_created_via` | form, story, template | – |
| `phase_status` | not_started, in_progress, done | Belum mulai, Berjalan, Selesai |
| `extension_reason` | scope_added, external_dependency, estimate_missed, resources, other | Scope bertambah, Menunggu pihak luar, Perkiraan meleset, Kekurangan orang, Lainnya |
| `story_draft_status` | draft, created, discarded | – |

### 3.2 Tabel

**`projects`**: id · name varchar(150) NOT NULL · description text NULL · status `project_status` default `'draft'` (saat dibuat hanya boleh draft/active) · priority `project_priority` default `'medium'` · lead_id FK users NOT NULL · start_date date NULL · due_date date NULL (tenggat saat ini) · original_due_date date NULL (tenggat awal, tidak pernah diubah) · created_via `project_created_via` · template_id FK project_templates NULL · story_draft_id FK project_story_drafts NULL · created_by FK users · completed_at timestamptz NULL · deleted_at timestamptz NULL (Sampah) · created_at · updated_at.
CHECK: `due_date >= start_date`.

**`project_members`**: PK (project_id, user_id) · project_id FK ON DELETE CASCADE · user_id FK ON DELETE CASCADE · role `project_member_role` default `'member'` · added_by FK users · created_at.

**`project_phases`**: id · project_id FK CASCADE · name varchar(100) · description text NULL · position smallint (urutan stepper, UNIQUE per proyek) · start_date · end_date · status `phase_status` default `'not_started'` · started_at · finished_at · created_at · updated_at.

**`project_milestones`**: id · project_id FK CASCADE · phase_id FK project_phases NULL (ON DELETE SET NULL) · title varchar(150) · description text NULL · due_date date · reached_at timestamptz NULL · created_at · updated_at.
Status milestone **dihitung**: Tercapai (reached_at terisi), Terlewat (due_date < hari ini dan belum tercapai), Menunggu (selain itu).

**`project_deadline_extensions`**: id · project_id FK CASCADE · old_due_date · new_due_date (CHECK `new_due_date > old_due_date`) · reason_category `extension_reason` NOT NULL · reason text NOT NULL · extended_by FK users · created_at.

**`project_condition_overrides`**: id · project_id FK CASCADE · condition `project_condition` · reason text NOT NULL · set_by FK users · expires_at timestamptz NULL · cleared_at timestamptz NULL · created_at. Override yang berlaku = baris terbaru yang belum cleared dan belum kedaluwarsa.

**`project_story_drafts`**: id · created_by FK users · story_text text NOT NULL · draft_json jsonb (hasil AI: info proyek, tahapan, milestone, tugas awal) · ai_model varchar(100) · status `story_draft_status` default `'draft'` · project_id FK projects NULL (terisi setelah Buat) · created_at · updated_at.
Alasan: draf tidak hilang saat halaman ditutup, ada jejak AI vs edit manusia, bisa jadi sumber template.

**`project_templates`**: id · name varchar(150) · description text NULL · structure jsonb · source_project_id FK NULL · source_story_draft_id FK NULL · created_by FK users · deleted_at NULL · created_at · updated_at.
Bentuk `structure` (tanggal relatif, asumsi A4):
```json
{ "duration_days": 60,
  "phases": [{ "name": "Perencanaan", "start_day": 0, "duration_days": 10,
    "milestones": [{ "title": "Rancangan disetujui", "day": 10 }],
    "tasks": [{ "title": "Kumpulkan kebutuhan", "kind": "task", "priority": "high", "estimate_hours": 8 }] }] }
```

**`project_activities`** (sumber "Aktivitas terakhir" di tab Ringkasan, khusus kejadian tingkat proyek): id · project_id FK CASCADE · actor_id FK users · action varchar(50) (`created`, `status_changed`, `member_added`, `member_removed`, `role_changed`, `deadline_extended`, `phase_started`, `phase_finished`, `milestone_reached`, `condition_overridden`) · payload jsonb · created_at.

**`tasks` (milik modul 03 · Tugas, cukup placeholder)**: tulis hanya kolom yang dipakai Proyek: id · project_id FK · phase_id FK project_phases NULL · title · status · priority · due_date · deleted_at. Tandai jelas: *kolom lengkap dan enum status ditentukan di modul Tugas*.

### 3.3 Nilai yang dihitung, tidak disimpan

| Nilai | Rumus |
|---|---|
| Progres % proyek | tugas selesai ÷ semua tugas (tanpa yang dihapus/dibatalkan). Kalau belum ada tugas, tampil "Belum ada tugas", bukan 0% |
| Progres tahapan | rumus yang sama, khusus tugas dengan `phase_id` itu |
| Waktu berjalan % | (hari ini − start_date) ÷ (due_date − start_date) |
| Diperpanjang ×N | jumlah baris `project_deadline_extensions` |
| Kondisi (hanya status `active`) | **Terlambat**: due_date < hari ini. **Perlu perhatian**: ada milestone terlewat, ATAU > 20% tugas aktif terlambat, ATAU ada tugas prioritas high/critical yang terlambat. **Lancar**: selain itu. Override manual menimpa hasil hitungan. Ambang 20% disimpan sebagai **konfigurasi**, tidak di-hardcode |

### 3.4 Index
`projects(status, due_date)`, `projects(lead_id)`, `projects(deleted_at)`, `project_members(user_id)` (untuk "Proyek saya"), `project_phases(project_id, position)` UNIQUE, `project_milestones(project_id, due_date)`, `project_deadline_extensions(project_id, created_at)`, `project_activities(project_id, created_at)`, `project_story_drafts(created_by, status)`. Daftar proyek wajib paginated.

### 3.5 Isi bagian "Belum diputuskan" di `tahapan-proyek/03-desain/erd/project.md`
Asumsi A1–A4 dari §1, ditambah:
- Apakah status Ditunda/Dibatalkan butuh alasan wajib?
- Apakah Selesai otomatis ditawarkan saat semua tugas selesai?
- Siapa yang boleh menghapus template?

---

## 4. Tugas 3: wireframe di Penpot (halaman WIREFRAME NICO)

**Gaya:** sama persis dengan grup `01 · Login, Registrasi & Beranda — Wireframe`: kanvas abu-abu, frame putih **1280×800** berjajar, lo-fi abu-abu, panah dengan keterangan di antara layar. Letakkan grup **di bawah grup 01** dengan jarak lega. Periksa batas grup 01 dulu supaya tidak menimpa.

**Kerangka setiap layar aplikasi:** top bar (cari, lonceng, avatar) + menu samping (Beranda, Inbox, **Proyek** aktif, Tugas, Events, Tim, Sampah, Pengaturan). Sama dengan layar ④ grup 01.

**Data dummy** (hari ini = Rabu, 7 Oktober 2026; user login = **Nico, Project Manager**):

| Proyek | Status | Kondisi + alasan | Progres | Tenggat | Lead |
|---|---|---|---|---|---|
| Proyek Atlas | Berjalan | ! Perlu perhatian · 1 tugas penting terlambat | 70% | 31 Okt (diperpanjang ×1) | Nico |
| Portal Klien PT Sinar | Berjalan | ! Perlu perhatian · 2 bug kritis belum ditangani | 35% | 20 Okt | Rina |
| Migrasi Data Lama | Berjalan | ⏰ Terlambat · tenggat lewat 7 hari | 80% | 30 Sep | Dodi |
| Internal Tools | Berjalan | ✓ Lancar · sesuai jadwal | 50% | 15 Des | Nico |
| Aplikasi Absensi | Draf | – | Belum ada tugas | – | Nico |
| Website Company Profile | Selesai | – | 100% | 1 Sep | Rina |

Detail Proyek Atlas: tahapan Perencanaan (selesai) → **Pengembangan (berjalan, 60%)** → Pengujian → Rilis. Milestone: "Rancangan disetujui" (tercapai), "Rilis beta 20 Okt" (menunggu). Riwayat tenggat: 15 Okt → 31 Okt · Scope bertambah · "Tambah login SSO" · oleh Nico · 1 Okt. Anggota: Nico (Pengelola, Lead), Dodi (Anggota), Rina (Anggota), Sri (Pemantau). Tugas: Fix login SSO (terlambat 2 hari, Tinggi), Tulis spesifikasi API (hari ini), Periksa desain halaman onboarding (minggu ini).

**Layar** (nomor ditulis di frame; dipakai juga di ERD):

| No | Layar | Isi wajib |
|---|---|---|
| ① | Semua proyek (Admin/PM) | Judul "Proyek", search, tombol besar **+ Proyek baru**, toggle **Proyek saya / Semua proyek**, chip status (Semua · Berjalan · Ditunda · Selesai · Draf) + chip "Perlu perhatian", Urutkan (tenggat terdekat / terakhir diubah / nama), toggle List/Grid. Daftar 6 proyek dummy dalam bentuk List: nama, status, kondisi (ikon + teks + alasan), bar progres, tenggat, avatar anggota |
| ② | Semua proyek kosong (Member) | Tanpa tombol + Proyek baru. Pesan: "Anda belum masuk proyek apa pun. Minta admin atau project manager menambahkan Anda." Catatan di samping: versi Admin/PM menampilkan tombol "Buat proyek pertama" |
| ③ | Proyek baru · pilih cara | 3 kartu besar: **Isi form sendiri** · **Ceritakan proyeknya** (✦ AI, ditandai "disarankan") · **Pakai template** |
| ④ | Form proyek | Nama*, deskripsi, status (Draf/Berjalan saja), prioritas, Lead (default: pembuat), anggota + peran, tanggal mulai–selesai + tombol cepat 1 mgg / 2 mgg / 1 bln / 3 bln. Tombol Batal · **Buat proyek** |
| ⑤ | Ceritakan proyeknya | Kotak teks besar berisi contoh: "Kami mau bikin aplikasi absensi karyawan lewat HP, pakai foto selfie dan lokasi. Target 2 bulan, timnya 3 orang." Tombol 🎤 (dinonaktifkan, label "segera"). Tombol **Susun draf** |
| ⑥ | Periksa draf dari AI | Banner "Ini draf dari AI. Periksa dulu sebelum dibuat." Info proyek yang terisi (bisa diedit), 4 tahapan + milestone + 8 tugas awal, masing-masing dengan centang dan ikon edit. Centang **Simpan sebagai template**. Tombol Susun ulang · **Buat proyek** |
| ⑦ | Pakai template | Daftar template (nama, durasi, jumlah tahapan/tugas, asal). Pilih → isi nama & tanggal mulai → **Buat proyek** |
| ⑧ | Detail · Ringkasan | **Header** (dipakai di ⑧–⑪): nama, status, kondisi + "kenapa", Lead, tenggat, badge "Diperpanjang ×1", tombol **Perpanjang tenggat**. Tab Ringkasan · Tugas · Tahapan · Anggota. Isi: progres tugas vs waktu berjalan, tahapan & milestone berikutnya, tugas terlambat/penting, aktivitas terakhir |
| ⑨ | Detail · Tugas | Daftar tugas proyek (List; toggle Kanban), filter singkat, tombol + Tugas. Catatan: "komponen dari modul 03 · Tugas" |
| ⑩ | Detail · Tahapan | Stepper 4 tahapan dengan progres tiap tahapan. Milestone di bawah tiap tahapan. Tombol Mulai/Selesaikan tahapan, + Tahapan, + Milestone. Bagian **Riwayat tenggat** di bawah |
| ⑪ | Detail · Anggota | Daftar anggota + peran (Pengelola/Anggota/Pemantau), penanda Lead, tombol + Anggota, ubah peran, keluarkan. Catatan: pengelola terakhir tidak bisa dikeluarkan |
| ⑫ | Modal Perpanjang tenggat | Tenggat sekarang (baca saja), tenggat baru, kategori alasan* (5 pilihan), alasan*, pratinjau dampak ("3 tugas dan 1 milestone melewati tenggat lama"). Tombol Batal · **Simpan**. Pesan galat kalau tanggal tidak lebih lambat |

**Panah & keterangan:**

| Dari → Ke | Keterangan |
|---|---|
| ① → ③ | Klik + Proyek baru (Admin/PM) |
| ③ → ④ / ⑤ / ⑦ | Pilih cara |
| ⑤ → ⑥ | AI menyusun draf |
| ④ / ⑥ / ⑦ → ⑧ | Proyek dibuat, pembuat jadi Pengelola & Lead |
| ① → ⑧ | Klik kartu proyek |
| ⑧ ↔ ⑨ ↔ ⑩ ↔ ⑪ | Pindah tab |
| ⑧ → ⑫ | Klik Perpanjang tenggat (hanya Admin/Pengelola) |
| ② (putus-putus) | Member yang belum masuk proyek mana pun |

**Catatan anotasi** (kotak catatan kuning/abu di kanvas, bukan bagian UI):
- Matriks izin di dekat ①.
- Di ⑧: "PM yang bukan pengelola melihat layar ini tanpa tombol ubah (asumsi A1)".
- Di ⑥: "AI tidak menyimpan apa pun sebelum Buat proyek diklik".

---

## 5. Tugas 4: ERD di Penpot (halaman ERD NICO)

- Grup baru `02 · Proyek — ERD`, di bawah grup `01 · Login & Registrasi — ERD`, dengan gaya kotak tabel yang sama.
- Isi: 9 tabel dari §3.2. `tasks` digambar sebagai **placeholder** (garis putus-putus, label "milik modul 03 · Tugas"). `users` cukup sebagai kotak rujukan kecil (id, role) yang menunjuk ke grup 01.
- Garis relasi + kardinalitas sesuai mermaid di `tahapan-proyek/03-desain/erd/project.md`.
- Tabel ringkas **"Layar → tabel"**: ①② projects + project_members · ④ projects, project_members · ⑤⑥ project_story_drafts → projects, project_phases, project_milestones, tasks, project_templates · ⑦ project_templates · ⑧ projects + hitungan + project_activities · ⑩ project_phases, project_milestones, project_deadline_extensions · ⑪ project_members · ⑫ project_deadline_extensions.
- **Perbarui grup 01**: teks kolom `role` di tabel `users` menjadi `admin | project_manager | member`.

---

## 6. Kendala Penpot yang sudah diketahui (dari modul 01)

| Kendala | Solusi |
|---|---|
| "No Penpot instance connected for user token" | Jalankan Claude dengan `set -a; source .env; set +a; claude ...`, karena `.mcp.json` membaca `${PENPOT_TOKEN}` dari environment |
| "Plugin tab appears to be suspended" | Tab Penpot harus difokuskan dan dibiarkan terbuka selama menggambar |
| "Cannot modify a page that is not currently active" | Plugin hanya bisa mengubah halaman yang sedang dibuka. Minta user membuka **WIREFRAME NICO** untuk Tugas 3, lalu **ERD NICO** untuk Tugas 4. Jangan membuat bentuk uji di halaman yang salah |

---

## 7. Kriteria selesai

- [x] `tahapan-proyek/03-desain/erd/user-profile.md` memuat `project_manager` di mermaid, tabel, dan bagian "Arti peran"
- [x] `tahapan-proyek/03-desain/erd/project.md` memuat 9 tabel, enum, rumus hitungan, index, matriks izin, dan asumsi A1–A4
- [x] Wireframe ①–⑫ ada, bernomor, dengan panah & keterangan, dan data dummy sesuai §4
- [x] ERD di Penpot sama persis dengan `tahapan-proyek/03-desain/erd/project.md`, dan grup 01 sudah diperbarui
- [x] Export PNG tiap grup dicek secara visual: tidak ada teks terpotong atau elemen bertumpuk
- [x] Bagian **§8** di bawah diisi

## 8. Hasil & kendala (diisi agent pelaksana)

Dikerjakan 7 Oktober 2026, Tugas 1 → 4 berurutan.

### Tugas 1 · `tahapan-proyek/03-desain/erd/user-profile.md` ✅
- Mermaid dan tabel `users`: `role` = `admin | project_manager | member`, default tetap `'member'`.
- Bagian baru **"Arti peran"** setelah tabel `users`, dengan catatan bahwa peran proyek terpisah.
- Baris "Diperbarui 7 Oktober 2026 …" di header, dan poin 5 di "Yang belum diputuskan" (layar admin untuk peran project_manager).
- `tahapan-proyek/03-desain/erd/diskusi/01-login-registrasi-beranda.md` §4: catatan `→ diperbarui jadi admin · project_manager · member, lihat 02-proyek.md`. Isi lain tidak diubah.

### Tugas 2 · `tahapan-proyek/03-desain/erd/project.md` ✅
- Alur, hak akses (matriks + aturan turunan), mermaid, 8 enum, 9 tabel + placeholder `tasks`, nilai yang dihitung, index, alasan desain, belum diputuskan (A1–A4 + 3 pertanyaan).
- Tambahan dari Claude: alasan relasi dua arah `projects.story_draft_id` ↔ `project_story_drafts.project_id`, contoh nama konfigurasi `PROJECT_AT_RISK_OVERDUE_RATIO = 0.2`.

### Tugas 3 · Wireframe (WIREFRAME NICO, grup `02 · Proyek — Wireframe`) ✅
- Posisi: y = 2820 (grup 01 berakhir di y = 2420). Ukuran grup 11360 × 4080.
- Tata letak: baris 1 = ① ③ ④, baris 2 = ② ⑤ ⑥ ⑧ ⑨ ⑩ ⑪, baris 3 = matriks izin, ⑦, ⑫. ⑧ berada di tengah supaya semua jalur "proyek dibuat" (dari ④ ⑥ ⑦) bertemu di satu tempat.
- 12 layar sesuai §4 dengan data dummy sesuai tabel. Semua panah di §4 ada, termasuk ① → ⑧ lewat atas, ③ → ⑦ lewat celah kiri, tab ⑧ ↔ ⑨ ↔ ⑩ ↔ ⑪ dengan panah dua arah, dan ① → ② putus-putus.
- Catatan kuning: matriks izin (di bawah ②, kolom yang sama dengan ①), ② versi Admin/PM, ⑥ "AI tidak menyimpan apa pun ke proyek sebelum Buat proyek diklik", ⑧ asumsi A1.
- Keputusan kecil Claude di wireframe:
  - Tahapan Atlas diberi tanggal: Perencanaan 1–24 Sep, Pengembangan 25 Sep–20 Okt, Pengujian 21–27 Okt, Rilis 28–31 Okt. Proyek mulai 1 Sep, jadi "Waktu berjalan 60%".
  - Tab Tugas ⑨ diberi 5 baris: 3 tugas dari dummy + "Siapkan data uji" + "Susun rancangan arsitektur" (selesai), supaya terlihat tugas selesai dan tahapan lain.
  - Template ⑦: "Aplikasi internal" (dari cerita Aplikasi Absensi, 8 tugas sesuai draf ⑥), "Website perusahaan", "Migrasi data". Nama proyek contoh: "Aplikasi Cuti Karyawan".
  - Modal ⑫: pesan galat ditampilkan sebagai teks contoh di bawah kolom "Tenggat baru", bukan sebagai kondisi galat aktif.
  - Banner ⑥ menulis "Belum jadi proyek" (bukan "belum tersimpan"), karena draf cerita memang tersimpan di `project_story_drafts`.

### Tugas 4 · ERD (ERD NICO, grup `02 · Proyek — ERD`) ✅
- Posisi: y = 2010 (grup 01 berakhir di y = 1710). Ukuran grup 4700 × 3442.
- 9 tabel sama dengan `tahapan-proyek/03-desain/erd/project.md`. `users` (id, role) dan `tasks` digambar dengan garis tepi putus-putus.
- Relasi: `projects.id` sebagai bus ke 7 tabel anak, `project_phases.id` ke `project_milestones.phase_id` dan `tasks.phase_id`, `users.id` ke `projects.lead_id`, `project_templates.id` ke `projects.template_id`, `0..1 ↔ 0..1` antara draf cerita dan proyek, dan 2 garis putus-putus untuk rujukan asal template.
- FK ke `users` selain `lead_id` tidak digambar garisnya supaya tidak ramai; dijelaskan di kotak Keterangan dan tetap tertulis di kolom Keterangan tiap tabel.
- Tabel **Layar → tabel** sesuai §5, ditambah baris ③ ("tidak menyimpan data") dan ⑨ ("tasks, modul 03") supaya lengkap ①–⑫. Ditambah kotak kuning **"Dihitung, tidak disimpan"**.
- Grup 01: teks kolom `role` di tabel `users` diubah menjadi `admin · project_manager · member (default: member)`. Teks masih muat di kolomnya.

### Pemeriksaan visual
Setiap layar ①–⑫, matriks izin, catatan, dan kedua grup diekspor ke PNG dan dicek. Yang diperbaiki saat pengecekan:
- Chip "Draf" di ① memakai garis putus-putus yang rusak di sudut bulat, diganti chip abu-abu.
- Di ⑥, isi kartu Info proyek digeser 12 px karena deskripsi dua baris terlalu dekat dengan label berikutnya.
- Jumlah tugas template "Aplikasi internal" disamakan dengan draf ⑥ (8 tugas).
- Teks dampak di ⑫ dikembalikan persis ke rencana. Sebelumnya Claude menambahkan kalimat "tenggat tugas tidak ikut berubah", dan itu keputusan yang belum dibuat.

### Kendala selama pengerjaan
| Kendala | Penyebab | Penyelesaian |
|---|---|---|
| `execute_code` kena batas waktu 120 detik saat menggambar 11 tabel ERD sekaligus | Satu perintah terlalu besar, dan tab Penpot sempat tertidur | Tidak ada yang sempat tergambar (sudah dicek). Dipecah menjadi 2–4 tabel per perintah |
| Helper di `storage` hilang | Plugin Penpot dimuat ulang setelah tab tertidur, sehingga `storage` kosong | Helper didefinisikan ulang sebelum melanjutkan. **Untuk agent berikutnya:** cek `Object.keys(storage)` sebelum memakai helper |
| Pindah halaman ke ERD NICO | – | Memakai `penpot.openPage(...)` dari plugin, tidak perlu pindah manual |

### Belum dikerjakan (sesuai "Tindak lanjut di luar rencana ini")
- Beranda belum memakai label kondisi baru.
- Kolom lengkap `tasks` (modul 03).
- Layar admin untuk persetujuan user dan peran `project_manager`.
- Asumsi A1–A4 dan 3 pertanyaan terbuka di `tahapan-proyek/03-desain/erd/project.md` masih menunggu keputusan user.

### Sinkron dengan 03 · Tugas (7 Okt 2026)

Sumber: `tahapan-proyek/03-desain/erd/diskusi/03-tugas.md` (keputusan #1–#22), `tahapan-proyek/03-desain/erd/task.md`, `tahapan-proyek/03-desain/erd/project.md`. File milik modul 03 tidak diubah. Usulan di bawah **disetujui user** dan sudah dikerjakan (lihat "Hasil penyesuaian").

Menu yang diperiksa: **01 · Login, Registrasi & Beranda** (tidak menampilkan atau membuat tugas, tidak ada bentrok) dan **02 · Proyek** (dokumen, ERD, wireframe).

| # | Bagian di menu 02 | Yang dipakai sekarang | Bentrok dengan Tugas? | Usulan penyesuaian |
|---|---|---|---|---|
| 1 | Wireframe ⑨ Detail · Tugas: kolom & istilah | Tanpa nomor #, tanpa jenis, tanpa status (hanya lingkaran selesai/belum). Toggle **List / Kanban**, tombol **+ Tugas**, tidak ada tombol langkah berikutnya | **Ya**: keputusan #5 (5 status), #14 (List + **Papan**), #16 (satu tombol langkah berikutnya), #19 (nomor #) | Pakai komponen list ② modul 03: kolom #, judul, jenis, status, prioritas, yang mengerjakan, tenggat, label turunan, satu tombol langkah berikutnya. "Kanban" → **Papan**. "+ Tugas" → **+ Tugas baru** (membuka Tugas baru modul 03 dengan proyek terisi) |
| 2 | Wireframe ⑨: data dummy | Fix login SSO · **Dodi**. Tulis spesifikasi API · **Tinggi**. Periksa desain · **Rina**. Siapkan data uji · **16 Okt**. Susun rancangan · **22 Sep**. #17 tidak ada | **Ya**: beda dengan dummy §5 modul 03 | Samakan: #12 Fix login SSO (Bug, Tinggi, Nico, Sedang dikerjakan, ⏰ Terlambat 2 hari) · #14 Tulis spesifikasi API (Tugas, Sedang, Nico, Hari ini) · #15 Periksa desain (Nico, 9 Okt) · #16 Siapkan data uji (Dodi, 9 Okt, label **Tertahan**) · #17 Perbaiki tombol simpan (Bug, Dodi, **Menunggu diperiksa**) · #8 Susun rancangan (Selesai, 20 Sep) |
| 3 | Wireframe ⑧ Ringkasan · kartu "Tugas terlambat & penting" | Fix login SSO · Dodi. Tulis spesifikasi API · Tinggi. Periksa desain · Rina | **Ya**: data beda; label "Menunggu diperiksa saya" belum dipakai | Isi: #12 Fix login SSO · ⏰ Terlambat 2 hari · Tinggi · Nico · #17 Perbaiki tombol simpan · **Menunggu diperiksa saya** · Dodi · #14 Tulis spesifikasi API · Hari ini · Nico. Satu label per baris, urutan Terlambat > Menunggu diperiksa saya > Tertahan > Mandek |
| 4 | Header kondisi ⑧–⑪ "Kenapa: 1 tugas penting terlambat (Fix login SSO)" | Sesuai #12 (Tinggi, terlambat) | Tidak | Opsional: tambah nomor "(#12 Fix login SSO)" |
| 5 | Wireframe ① · alasan kondisi Portal Klien PT Sinar | "2 bug kritis **belum ditangani**" | **Ya**: bukan pemicu "Perlu perhatian" di rumus kondisi sendiri. "Bug" di modul 03 = jenis ber-`base_kind = issue` | Ganti jadi "**2 bug Kritis terlambat**" (memenuhi aturan "tugas high/critical terlambat") |
| 6 | Istilah "Telat" | Grup 01 & 02 (Penpot) dan `project.md` sudah memakai **Terlambat** | Tidak | Tidak perlu diubah. Catatan: "Telat" masih ada di `tahapan-proyek/04-prototype/prototype/01-beranda.html`, `06-tim.html`, `tahapan-proyek/04-prototype/prototype/diskusi/01-beranda-poin.md` (bukan menu 01/02, sudah ada di tindak lanjut modul 02 & 03) |
| 7 | `project.md` · rumus **Progres % proyek** | "tugas selesai ÷ semua tugas (tanpa yang dihapus/dibatalkan)" | Tidak, tapi belum dipetakan ke enum | Tulis eksplisit: `status = done` ÷ tugas dengan `status <> 'canceled'` dan `deleted_at` kosong. `in_review` dihitung **belum** selesai |
| 8 | `project.md` · rumus **Kondisi** "> 20% tugas aktif terlambat", "tugas high/critical terlambat" | Istilah "tugas aktif" dan "terlambat" belum dirujuk | Tidak: definisinya sama dengan `task.md` | Tambah rujukan: "Tugas aktif dan Terlambat mengikuti `tahapan-proyek/03-desain/erd/task.md` › Nilai yang dihitung" |
| 9 | Matriks izin (`project.md`, `02-proyek.md` §1, catatan kuning Penpot) · baris "Tambah/ubah tugas di proyek" | "Jika `manager`/`member` di proyek" | **Sebagian**: modul 03 lebih rinci. Anggota hanya mengubah tugas yang ia buat/kerjakan (A2), Pemantau boleh komentar, Setujui/Kembalikan hanya Pengelola & Admin | Ganti baris itu dengan rujukan "Rincian izin tugas: `tahapan-proyek/03-desain/erd/task.md`". Tambah baris **"Setujui / Kembalikan tugas"**: Admin ✅ · Project Manager: hanya jika Pengelola · Member: hanya jika Pengelola |
| 10 | Wireframe ⑪ Anggota · kotak "Arti peran" | "Anggota: mengerjakan dan menambah tugas · Pemantau: **hanya melihat**". Pengelola tanpa hak memeriksa | **Ya**: keputusan #8 (memeriksa = Pengelola/Admin) dan #10 (Pemantau boleh komentar) | "Pengelola: mengubah proyek, tahapan, anggota, tenggat, dan **memeriksa tugas** · Anggota: membuat dan mengerjakan tugas · Pemantau: **melihat dan berkomentar**" |
| 11 | Wireframe ⑪ · aturan "pengelola terakhir" | Pengelola terakhir tidak bisa dikeluarkan | Tidak: justru mendukung keputusan #7 | Tambah saran saat proyek hanya punya 1 Pengelola: "**Tambahkan pengelola kedua** supaya tugas Lead bisa diperiksa orang lain" (Atlas = kasus #12, pemeriksa jatuh ke Admin) |
| 12 | Wireframe ⑥ Periksa draf AI & ⑦ Pakai template | Tugas awal tanpa jenis. Template hanya "N tahapan · N tugas" | **Sebagian**: `tasks.kind_id` wajib, `task_kinds` dibuat saat proyek dibuat (sudah di `project.md` oleh sesi 03) | ⑥: tiap tugas draf diberi label jenis (default Tugas; contoh "Perbaiki masalah hasil uji" = Bug). ⑦: tambah "3 jenis tugas" di ringkasan template |
| 13 | Wireframe ④ Form proyek | Tidak menyebut jenis tugas | Tidak: jenis default dibuat otomatis | Opsional: catatan kecil "Jenis tugas default: Tugas, Bug, Ide (bisa diubah di Pengaturan proyek)" |
| 14 | ERD Penpot grup 02 · kotak placeholder `tasks` | Kolom status/priority "Ditentukan modul 03", tanpa `kind_id`/`number`. Tidak ada `task_kinds` dan `tags`, padahal mermaid `project.md` sudah memuatnya | **Ya**: grup 02 tidak lagi sama persis dengan `project.md` | Placeholder diberi keterangan "**lihat grup 03 · Tugas**" + kolom `number`, `kind_id`. Tambah kotak rujukan putus-putus `task_kinds` dan `tags`. Tabel "Layar → tabel": baris ④ ⑥ ⑦ ditambah `task_kinds`. **Koordinasi:** rencana 03 §6 juga akan "memperbarui grup 02"; sepakati satu pihak saja yang mengerjakan |
| 15 | FK ke tugas | Modul 02 tidak punya tabel tugas sendiri. `tasks.project_id → projects.id`, `tasks.phase_id → project_phases.id (SET NULL)` | Tidak | Tidak perlu diubah |
| 16 | Ejaan enum "dibatalkan" | `project_status` = `cancelled` (dua l) | **Ya (kecil)**: `task_status` = `canceled` (satu l). Rawan salah ketik di kode dan query | Samakan sebelum migrasi. Usulan: ubah `project_status` ke `canceled` (dokumen milik modul 02), karena keputusan Tugas sudah final |
| 17 | Prioritas | `project_priority` = low, medium, high, critical | Tidak: sama dengan `task_priority` | Tidak perlu diubah |
| 18 | Siapa yang menyetujui | Modul 02 tidak punya alur persetujuan tugas | Tidak | Cukup tambahan matriks di #9 |

**Ringkasan:** 7 bentrok (#1, #2, #3, #5, #10, #14, #16), 2 sebagian (#9, #12), sisanya cocok. Semua bentrok ada di menu 02 dan bisa diperbaiki tanpa mengubah keputusan Tugas.

#### Posisi pekerjaan di Penpot (file **PM-New**)

| Halaman | Grup | x | y | Lebar | Tinggi | Berakhir di y |
|---|---|---|---|---|---|---|
| WIREFRAME NICO | `01 · Login, Registrasi & Beranda — Wireframe` | 0 | 0 | 4800 | 2420 | 2420 |
| WIREFRAME NICO | `02 · Proyek — Wireframe` | 0 | 2820 | 11360 | 4080 | 6900 |
| ERD NICO | `01 · Login & Registrasi — ERD` | 0 | 0 | 2240 | 1710 | 1710 |
| ERD NICO | `02 · Proyek — ERD` | 0 | 2010 | 4700 | 3534 | 5544 |

- Nomor modul yang dipakai: **01** dan **02**. Nomor 03 dibiarkan untuk Tugas.
- Jarak antar grup 400 px (wireframe) dan 300 px (ERD). Untuk grup 03, aman mulai **y ≥ 7300** di WIREFRAME NICO dan **y ≥ 5844** di ERD NICO.
- ⚠️ Grup ERD 02 bertambah tinggi (3442 → 3534) karena kotak `tasks` diberi kolom `number`/`kind_id` dan ditambah kotak `task_kinds` + `tags`. Angka di rencana 03 §6 ("berakhir y = 5452") **sudah tidak berlaku**; pakai y = 5544. Rencana 03 tidak diubah, cukup diberi tahu ke sesi Tugas.
- Grup 02 wireframe lebar 11360 px. Kalau grup 03 lebih lebar, tidak masalah selama y-nya di bawah 6900.

#### Keputusan user (7 Okt 2026)
- Semua usulan #1–#18 disetujui.
- #5 alasan PT Sinar: opsi **(a)**, teks diganti "2 bug Kritis terlambat", rumus kondisi tidak ditambah aturan baru.
- Grup ERD 02 diperbarui oleh sesi menu Proyek, **bukan** sesi Tugas (rencana 03 §6 poin "Perbarui grup 02" dianggap sudah selesai). Alasannya: plugin Penpot tidak punya kunci, dua sesi yang mengubah grup yang sama bisa saling menimpa.

#### Hasil penyesuaian
**Dokumen**
- `tahapan-proyek/03-desain/erd/project.md`: ejaan `cancelled` → `canceled` (mermaid + enum). Matriks izin: baris tugas merujuk ke `tahapan-proyek/03-desain/erd/task.md`, tambah baris **Setujui / Kembalikan tugas** (hanya Pengelola & Admin). Rumus progres memakai `status = done` ÷ tugas selain `canceled` dan yang dihapus, `in_review` belum selesai. Rujukan definisi "tugas aktif", "Terlambat", dan "Bug" ke `tahapan-proyek/03-desain/erd/task.md`. Asumsi baru **A5**: AI memilih jenis tugas di draf cerita hanya dari 3 jenis default. Mermaid: tambah `task_kinds ||--o{ tasks : kind_id` dan kolom `number` di `tasks`. Baris "Diperbarui …" di header.
- `tahapan-proyek/03-desain/erd/diskusi/02-proyek.md`: matriks izin §1 dan enum §3.1 disamakan.

**Wireframe (WIREFRAME NICO, grup 02)**
- ① Portal Klien PT Sinar: "2 bug Kritis terlambat".
- ④ catatan: "Jenis tugas default dibuat: Tugas, Bug, Ide (bisa diubah di Pengaturan proyek)."
- ⑥ setiap tugas draf diberi chip jenis (7 Tugas, 1 Bug: "Perbaiki masalah hasil uji") + catatan "Jenis dipilih AI dari Tugas · Bug · Ide, klik untuk mengganti".
- ⑦ ringkasan template ditambah "· 3 jenis tugas".
- ⑧ kartu jadi "Tugas yang perlu perhatian": #12 Terlambat 2 hari · Bug · Tinggi · Nico, #17 Menunggu diperiksa saya · Bug · Sedang · Dodi, #14 Hari ini · Tugas · Sedang · Nico.
- ⑧–⑪ header: "Kenapa: 1 tugas penting terlambat (#12 Fix login SSO)".
- ⑨ isi tab dibangun ulang dengan komponen daftar modul 03: kolom # · Tugas + label · Jenis · Status · Prioritas · Mengerjakan · Tenggat · Langkah berikutnya, data #12 #17 #14 #15 #16 #8, filter "Menunggu diperiksa saya", toggle **List / Papan**, tombol **+ Tugas baru**.
- ⑪ arti peran: Pengelola juga **memeriksa tugas**, Pemantau **melihat dan berkomentar**. Saran: "Tambahkan pengelola kedua supaya tugas Nico bisa diperiksa orang lain."
- Matriks izin (catatan kuning): baris tugas → "Lihat modul 03 · Tugas", tambah baris **Setujui / Kembalikan tugas**.

**ERD (ERD NICO, grup 02)**
- `projects.status`: `canceled`.
- Kotak `tasks` dibuat ulang (garis putus-putus): tambah `number` (UK) dan `kind_id` (FK), status & prioritas memakai enum modul 03, keterangan "lihat grup 03 · Tugas". Baris `project_id` dan `phase_id` tetap di posisi lama sehingga garis lama tetap tersambung.
- Kotak rujukan baru `task_kinds` dan `tags` (putus-putus) di bawah `project_activities`, disambung dari bus `projects.id`. Garis `task_kinds.id → tasks.kind_id` lewat bawah supaya tidak menyilang garis lain.
- "Layar → tabel": ④ ⑥ ⑦ ditambah `task_kinds`, ⑨ "tasks, task_kinds (lihat grup 03 · Tugas)". Keterangan dan kotak "Dihitung" disamakan dengan `project.md`.
- Semua bagian yang diubah diekspor ke PNG dan dicek.

**Untuk sesi Tugas (tidak diubah di sini)**
- Rencana 03 §6: posisi akhir grup ERD 02 sekarang y = 5544, dan poin "Perbarui grup 02" sudah dikerjakan.
- Tindak lanjut 03 "Tab Tugas di Detail proyek diselaraskan" sudah dikerjakan di ⑨ modul 02.

#### Update 8 Okt 2026: tombol "Perlu diperiksa"
`tahapan-proyek/03-desain/erd/project.md` mendapat kolom `projects.tasks_need_review_default` (default mati) dan struktur template tidak lagi memakai `needs_review` per jenis. Di Penpot, kolom itu ditambahkan di kotak `projects` grup ERD 02 (tinggi tabel +46, tinggi grup tidak berubah). Detail: `03-tugas.md` §9.

#### Grup 03 · Tugas di Penpot (7 Okt 2026)
Atas permintaan user, Tugas 3–4 rencana `03-tugas.md` dikerjakan oleh sesi ini. Hasil dan rinciannya di `03-tugas.md` §9. Posisi akhir semua grup:

| Halaman | Grup | x | y | Lebar | Tinggi | Berakhir di y |
|---|---|---|---|---|---|---|
| WIREFRAME NICO | `01 · Login, Registrasi & Beranda — Wireframe` | 0 | 0 | 4800 | 2420 | 2420 |
| WIREFRAME NICO | `02 · Proyek — Wireframe` | 0 | 2820 | 11360 | 4080 | 6900 |
| WIREFRAME NICO | `03 · Tugas — Wireframe` | 0 | 7300 | 8080 | 4300 | 11600 |
| ERD NICO | `01 · Login & Registrasi — ERD` | 0 | 0 | 2240 | 1710 | 1710 |
| ERD NICO | `02 · Proyek — ERD` | 0 | 2010 | 4700 | 3534 | 5544 |
| ERD NICO | `03 · Tugas — ERD` | 0 | 5844 | 5940 | 3146 | 8990 |

Grup tambahan (8 Okt 2026): **ERD NICO · `Gabungan · ERD semua menu (01–03)`**, x = 0, y = 9290, 2800 × 2640, berakhir y = 11930. Ini ringkasan satu kanvas dari grup 01–03 (grup 01–03 tetap ada). Detail: `tahapan-proyek/03-desain/erd/gabungan.md`.

Modul berikutnya (04) aman mulai **y ≥ 12000** di WIREFRAME NICO dan **y ≥ 12230** di ERD NICO (di bawah grup gabungan). Setelah modul 04 selesai, grup gabungan perlu diperbarui.

---

## Tindak lanjut di luar rencana ini (jangan dikerjakan sekarang)
- Beranda (`tahapan-proyek/04-prototype/prototype/01-beranda.html`): ganti "Sehat/Berisiko" ke label kondisi baru (Atlas jadi "Perlu perhatian"), dan label tugas "Telat" → "Terlambat".
- Modul 03 · Tugas: kolom lengkap `tasks` dan enum statusnya.
- Layar admin: persetujuan user + pemberian peran `project_manager`.
