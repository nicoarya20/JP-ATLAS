# ERD Gabungan: modul 01–03

> Tanggal: 8 Oktober 2026. Gambar ada di Penpot, file **PM-New**, halaman **ERD NICO**, grup `Gabungan · ERD semua menu (01–03)` (x = 0, y = 9290, 2800 × 2640, berakhir y = 11930).
> Ini **ringkasan satu kanvas** dari tiga ERD per menu. Sumber kebenaran tetap dokumen per modul: `tahapan-proyek/03-desain/erd/user-profile.md` (01), `tahapan-proyek/03-desain/erd/project.md` (02), `tahapan-proyek/03-desain/erd/task.md` (03). Grup per menu (01, 02, 03) di Penpot **tidak dihapus**.
> Kalau ada tabel atau kolom berubah di salah satu modul, perbarui juga gambar ini.

## Isi: 22 tabel

| Modul | Warna judul | Tabel |
|---|---|---|
| 01 · Login & Registrasi | biru-abu | `users`, `profiles` |
| 02 · Proyek | hijau | `projects`, `project_members`, `project_phases`, `project_milestones`, `project_deadline_extensions`, `project_condition_overrides`, `project_story_drafts`, `project_templates`, `project_activities` |
| 03 · Tugas | cokelat | `tasks`, `task_kinds`, `task_checklist_items`, `task_comments`, `task_attachments`, `task_dependencies`, `task_reviews`, `task_activities`, `tags`, `task_tags`, `task_import_jobs` |

Tambahan di gambar: kotak `users (rujukan)` bergaris putus-putus, salinan `users` yang hanya memuat `id` dan `role`. Gunanya supaya garis ke `project_members.user_id` tidak melintasi seluruh diagram.

## Relasi yang digambar

| Dari (induk) | Ke (anak, kolom FK) |
|---|---|
| `users.id` | `profiles.user_id` (1:1), `projects.lead_id` |
| `users (rujukan).id` | `project_members.user_id` |
| `project_templates.id` | `projects.template_id` |
| `project_story_drafts.id` | `projects.story_draft_id`, `project_templates.source_story_draft_id` (putus-putus, asal) |
| `projects.id` | `project_phases`, `project_milestones`, `task_kinds`, `task_import_jobs`, `tags`, `project_members`, `project_deadline_extensions`, `project_condition_overrides`, `project_activities` (semua lewat `project_id`), `tasks.project_id` |
| `project_phases.id` | `project_milestones.phase_id`, `tasks.phase_id` |
| `task_kinds.id` | `tasks.kind_id` |
| `task_import_jobs.id` | `tasks.import_job_id` |
| `tasks.id` | `task_checklist_items`, `task_comments`, `task_attachments`, `task_reviews`, `task_activities`, `task_tags` (lewat `task_id`), `task_dependencies.task_id` dan `task_dependencies.blocked_by_task_id` |
| `tags.id` | `task_tags.tag_id` |

## Yang tidak digambar garisnya (kolomnya tetap tertulis di tabel)

- FK ke `users` selain tiga di atas: `created_by`, `approved_by`, `assignee_id`, `reviewer_id`, `deleted_by`, `done_by`, `uploaded_by`, `requested_by`, `decided_by`, `actor_id`, `extended_by`, `set_by`, `added_by`, `author_id`. Alasannya supaya diagram tidak penuh garis ke satu titik. Di kolom tipe tertulis `uuid → users`.
- Relasi balik `projects ↔ project_story_drafts.project_id` dan `projects → project_templates.source_project_id`.
- Nilai yang dihitung (progres, kondisi proyek, label Terlambat/Tertahan/Mandek) tidak disimpan, lihat `tahapan-proyek/03-desain/erd/project.md` dan `tahapan-proyek/03-desain/erd/task.md`.

## Tata letak (untuk yang memperbarui gambar)

Lima kolom, lebar kartu 300, jarak antar kolom 120. Kolom 1: `users`, `profiles`, `project_templates`, `project_story_drafts`. Kolom 2: `projects` (+ `users (rujukan)` di bawah). Kolom 3: semua tabel anak `projects`. Kolom 4: `tasks`. Kolom 5: tabel anak `tasks`. Legenda di kanan atas. Garis memakai pola bus: satu garis vertikal dari `projects.id` dan satu dari `tasks.id`, dengan cabang ke tiap tabel anak, supaya tidak ada persilangan. Saluran garis dari kolom 3 ke `tasks` memakai x = 1260, 1300, 1320, 1340 dan 1350, jadi tabel baru di kolom 3 perlu memperhatikan saluran ini.

## Belum dikerjakan

- Modul berikutnya (04 dan seterusnya) belum masuk. Tambahkan sebagai kolom baru di kanan, dengan warna judul baru dan baris baru di legenda.
