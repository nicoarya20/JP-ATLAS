# Diskusi & Rencana Kerja: Wireframe & ERD 02 · Proyek

> Tanggal: 7 Oktober 2026. Status: **selesai dikerjakan** (Tugas 1–4, lihat §8).
> Lokasi hasil nanti: Penpot, file **PM-New**
> - Halaman **WIREFRAME NICO**, grup `02 · Proyek — Wireframe`
> - Halaman **ERD NICO**, grup `02 · Proyek — ERD`
> - Dokumen ERD: `erd/project.md` (baru) dan `erd/user-profile.md` (diubah)

---

## 0. Untuk agent pelaksana: baca dulu

1. `erd/user-profile.md` dan `erd/diskusi/01-login-registrasi-beranda.md`. Pola kerja, gaya wireframe, dan kendala Penpot ada di sana.
2. `note.md` bagian **Menu Proyek** dan **Detail Proyek**. Ini spesifikasi lama yang sudah dirampingkan di dokumen ini. **Kalau bertentangan, dokumen ini yang berlaku.**
3. Segmen target: **awam/lansia**. Bahasa polos, teks besar, tanpa aksi yang bergantung hover.

Urutan **wajib**: Tugas 1 → 2 → 3 → 4. ERD digambar setelah `erd/project.md` selesai, supaya gambar sama persis dengan dokumen.

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
| 8 | **"Ceritakan proyeknya" (AI) masuk v1**. AI hanya menyusun draf, user memeriksa, lalu klik Buat. Tidak ada yang tersimpan otomatis | User (+ D8 di `hasil-orchestrasi/orchestration/DECISIONS.md`) |
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
| Tambah/ubah tugas di proyek (detail di modul Tugas) | ✅ | Jika `manager`/`member` di proyek | Jika `manager`/`member` di proyek |
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

## 2. Tugas 1: ubah `erd/user-profile.md`

1. Di diagram mermaid: `enum role "admin | member"` → `enum role "admin | project_manager | member"`.
2. Di tabel `users`, baris `role`: keterangan menjadi `admin`, `project_manager`, atau `member`. Default tetap `'member'`.
3. Tambah bagian baru **"Arti peran"** setelah tabel `users`:

   | Peran | Bisa |
   |---|---|
   | admin | Menyetujui user, memberi peran, melihat & mengubah semua proyek |
   | project_manager | Membuat proyek, melihat semua proyek, mengubah hanya proyek yang dia kelola |
   | member | Melihat proyek yang diikuti. Bisa jadi pengelola proyek jika ditunjuk |

   Tambahkan catatan: peran di dalam proyek (`manager/member/viewer`) ada di `erd/project.md` dan **terpisah** dari peran ini.
4. Di header file, tambah baris: `Diperbarui 7 Oktober 2026: tambah peran project_manager (keputusan modul 02 · Proyek).`
5. Di "Yang belum diputuskan", tambah: **Layar admin untuk memberi/mencabut peran project_manager** belum ada wireframe-nya.
6. Di `erd/diskusi/01-login-registrasi-beranda.md` §4 (baris `role (admin · member)`), tambah catatan singkat: `→ diperbarui jadi admin · project_manager · member, lihat 02-proyek.md`. Jangan ubah isi lain.

---

## 3. Tugas 2: tulis `erd/project.md`

Ikuti format `erd/user-profile.md`: judul, alur yang didukung, diagram mermaid, tabel kolom per tabel (Kolom | Tipe | Null | Default | Keterangan), index, alasan desain, belum diputuskan. Semua `id` = `uuid` default `gen_random_uuid()`, dan semua `created_at`/`updated_at` = `timestamptz` default `now()`.

### 3.1 Enum

| Enum | Nilai | Label UI |
|---|---|---|
| `project_status` | draft, active, on_hold, completed, cancelled | Draf, Berjalan, Ditunda, Selesai, Dibatalkan |
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

### 3.5 Isi bagian "Belum diputuskan" di `erd/project.md`
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
- Garis relasi + kardinalitas sesuai mermaid di `erd/project.md`.
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

- [x] `erd/user-profile.md` memuat `project_manager` di mermaid, tabel, dan bagian "Arti peran"
- [x] `erd/project.md` memuat 9 tabel, enum, rumus hitungan, index, matriks izin, dan asumsi A1–A4
- [x] Wireframe ①–⑫ ada, bernomor, dengan panah & keterangan, dan data dummy sesuai §4
- [x] ERD di Penpot sama persis dengan `erd/project.md`, dan grup 01 sudah diperbarui
- [x] Export PNG tiap grup dicek secara visual: tidak ada teks terpotong atau elemen bertumpuk
- [x] Bagian **§8** di bawah diisi

## 8. Hasil & kendala (diisi agent pelaksana)

Dikerjakan 7 Oktober 2026, Tugas 1 → 4 berurutan.

### Tugas 1 · `erd/user-profile.md` ✅
- Mermaid dan tabel `users`: `role` = `admin | project_manager | member`, default tetap `'member'`.
- Bagian baru **"Arti peran"** setelah tabel `users`, dengan catatan bahwa peran proyek terpisah.
- Baris "Diperbarui 7 Oktober 2026 …" di header, dan poin 5 di "Yang belum diputuskan" (layar admin untuk peran project_manager).
- `erd/diskusi/01-login-registrasi-beranda.md` §4: catatan `→ diperbarui jadi admin · project_manager · member, lihat 02-proyek.md`. Isi lain tidak diubah.

### Tugas 2 · `erd/project.md` ✅
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
- 9 tabel sama dengan `erd/project.md`. `users` (id, role) dan `tasks` digambar dengan garis tepi putus-putus.
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
- Asumsi A1–A4 dan 3 pertanyaan terbuka di `erd/project.md` masih menunggu keputusan user.

---

## Tindak lanjut di luar rencana ini (jangan dikerjakan sekarang)
- Beranda (`prototype/01-beranda.html`): ganti "Sehat/Berisiko" ke label kondisi baru (Atlas jadi "Perlu perhatian"), dan label tugas "Telat" → "Terlambat".
- Modul 03 · Tugas: kolom lengkap `tasks` dan enum statusnya.
- Layar admin: persetujuan user + pemberian peran `project_manager`.
