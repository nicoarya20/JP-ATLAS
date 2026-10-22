# Keputusan: Role, Area, dan Siklus Akun

> Tanggal: 15 Oktober 2026. Repo: `JP-ATLAS` (origin `nicoarya20/JP-ATLAS`), branch `feature/project-management`.
> Dokumen ini adalah fondasi **Fase 0** sebelum modul Proyek dan Tugas dibangun di kode.
> Semua keputusan di bawah **dikonfirmasi user** pada 15 Oktober 2026, kecuali ditandai "Usulan Claude".
> Jika berbeda dengan `user-profile.md`, `project.md`, atau `04-wireframe-per-role.md`, dokumen ini yang berlaku (lihat bagian "Yang menggantikan").

## 1. Empat role akun

| Role | Nilai di DB | Asal | Home |
|---|---|---|---|
| Super-admin | `super-admin` | Env `SUPER_ADMIN_EMAILS`, tidak bisa diubah lewat UI | `/dev` |
| Admin | `admin` | Diberikan oleh super-admin | `/dashboard` |
| Project Manager | `project_manager` | Diberikan oleh Admin atau super-admin | `/app` |
| Member | `member` | Bawaan untuk user baru | `/app` |

- Nilai lama `user` diganti `member`. Kolom `users.role` berupa teks tanpa enum, jadi migrasinya hanya mengubah data dan `defaultRole`.
- Role akun **terpisah** dari role di proyek (`project_members.role`: `manager` / `member` / `viewer`; tampil sebagai Pengelola / Anggota / Pemantau). Di kode dibedakan jelas, misalnya `appRole` dan `projectRole`.
- Super-admin adalah **superset Admin**. Di semua matriks izin proyek dan tugas (`project.md`, `task.md`) kolom "Admin" juga berlaku untuk super-admin.

## 2. Area

| Area | Siapa | Isi |
|---|---|---|
| `/app` | Semua role | Beranda, Inbox, Proyek, Tugas, Events, Tim, Sampah, Pengaturan. Member dan PM tampilannya sama; yang beda tombol dan wewenangnya (matriks di `project.md` dan `task.md`). Beranda versi Admin tetap di sini, dengan tautan ke `/dashboard` untuk menyetujui user |
| `/dashboard` | Admin, super-admin | **Pengguna** (Persetujuan user, Kelola peran, Undangan awal) dan **Pengaturan tim** (saklar Fitur AI, Cuti perlu persetujuan, lama simpan rekaman, pengingat acara, tabel Peran dan izin) |
| `/dev` | Super-admin | Konsol ops yang sudah ada |

Sidebar "Area lain" mengikuti role: Member dan PM tidak punya; Admin melihat Dashboard; super-admin melihat Dev Console, Dashboard, dan App. Wireframe grup `C · Admin` menaruh menu Pengguna di shell produk; di implementasi menu itu pindah ke `/dashboard`.

## 3. Aturan mengubah peran dan status

| Aksi | Admin | Super-admin |
|---|---|---|
| Member ↔ Project Manager | ✅ | ✅ |
| Setujui, tolak, nonaktifkan Member dan PM | ✅ | ✅ |
| PM → Admin, Admin → PM atau Member | ❌ | ✅ |
| Setujui, tolak, nonaktifkan Admin | ❌ | ✅ |

- Aturan wireframe "Admin terakhir tidak bisa diturunkan atau dinonaktifkan" **dibuang**, karena super-admin selalu ada lewat env.
- `INITIAL_ADMIN_EMAILS` (usulan di `user-profile.md`) **tidak dipakai**; admin pertama diberikan oleh super-admin.
- Kartu "Pengguna baru menunggu persetujuan" di Inbox dikirim ke semua Admin dan super-admin, dan hilang bagi semua begitu salah satu memutuskan.

## 4. Siklus akun

- **Login hanya Google.** Form email/password dihapus dari halaman login. Email/password tetap ada di kode hanya saat bukan production, supaya dev lokal tanpa kredensial Google bisa login (Usulan Claude, disetujui).
- **Demo anonim dimatikan.** Akun anonim tidak bisa melewati persetujuan. Untuk demo, orang memakai akun Google masing-masing lewat **undangan awal**.
- **Undangan awal:** Admin mengisi email dan role lebih dulu. Saat orang itu login Google pertama kali, akunnya langsung `approved` dengan role yang diundang. Tanpa undangan, akun baru berstatus `pending`.
- Kolom baru untuk `pending`, `approved`, `rejected`, beserta alasan penolakan, `approved_by`, dan `approved_at`. **Suspended** memakai mekanisme `banned` yang sudah ada.
- Super-admin dari env selalu `approved`. User yang sudah ada saat migrasi di-backfill `approved` agar tidak terkunci.
- Halaman tahan, seperti `/banned`: `pending` ke halaman Profil · Menunggu persetujuan; `rejected` ke halaman akses ditolak beserta alasannya. Bentuk akhirnya (dua halaman atau satu) ditentukan saat implementasi.

## 5. Tampilan

- Fokus desktop dan tablet oleh user. **Polesan mobile dikerjakan rekan**, tetapi kerangka responsif dasar tetap dipasang sesuai `CLAUDE.md` (AppShell dengan header mobile, tabel dengan scroll, tombol header yang wrap).
- Layar lebar: lebar konten dibatasi sekitar 1200–1440px. Tablet 768–1024px: sidebar bisa dilipat, tombol minimal 44px.
- Target pengguna **awam dan lansia**. Pilihan **ukuran teks** Normal / Besar / Sangat besar (`profiles.text_size`) **final**, diterapkan lewat skala font Mantine. Bahasa polos seperti di wireframe, tombol besar, aksi destruktif wajib konfirmasi.

## 6. Dampak ke kode (rencana Fase 0)

| Bagian | Perubahan |
|---|---|
| `server/permissions.ts` | `ROLES` jadi empat nilai, `ASSIGNABLE_ROLES`, `canSetRole` dan `canActOnTarget` ditulis ulang sesuai bagian 3, `homeFor`, peta `roles` Better Auth |
| `server/roles.ts`, `server/guard.ts` | Normalisasi role, pengecekan status akun (`pending` dan `rejected`), halaman tahan |
| `server/db/` | Migrasi: `user` → `member`, kolom status akun, tabel undangan awal. Dijalankan ke DB dev **dan** DB test |
| `server/api-keys/scopes.ts` | Pemetaan scope untuk endpoint baru, plus assertion di test |
| Login | Hapus form email/password di `LoginForm`, matikan demo anonim |
| `/dashboard` | Halaman Pengguna dan Pengaturan tim |
| Test | `tests/permissions.test.ts`, `tests/guard.test.ts`, `tests/api/admin.test.ts`, dan lainnya disesuaikan; test baru untuk matriks bagian 3 dan siklus akun |
| Dokumen | README (kontrak publik), CHANGELOG `[Unreleased]`, `CLAUDE.md` (repo ini bukan lagi sekadar template) |

## 7. Yang menggantikan

- `user-profile.md`: enum `role` menjadi `super-admin | admin | project_manager | member`; pertanyaan "Admin pertama" terjawab (bagian 3); `INITIAL_ADMIN_EMAILS` tidak dipakai.
- `04-wireframe-per-role.md`: aturan "Admin terakhir" dibuang; menu Pengguna Admin ada di `/dashboard`.
- `project.md` dan `task.md`: kolom "Admin" juga berlaku untuk super-admin. Dokumen-dokumen ini belum diubah; pembaruannya ikut Fase 0.

## 8. Belum diputuskan

1. Bentuk halaman tahan untuk `pending` dan `rejected` (dua halaman atau satu).
2. Batas domain email: semua akun Google, atau hanya domain tertentu.
3. Riwayat keputusan admin: apakah perlu tabel `user_approval_logs`. Template sudah punya audit log (`audit()`), kemungkinan cukup memakainya.
4. Asumsi A1–A3 di `task.md` dan `project.md` belum dikonfirmasi user.
