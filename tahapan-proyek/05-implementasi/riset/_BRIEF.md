# Brief bersama: riset perencanaan MVP Simple PM

> Tanggal: 15 Oktober 2026. Gelombang 1 riset (14 agent paralel). Tiap agent menulis SATU file `Rxx-*.md` di folder ini. Jangan menyentuh file lain.

## Produk
Aplikasi **project management** bernama **Simple PM** (nanti bagian dari JP-Atlas). Target pengguna: **orang awam dan lansia** di tim kecil. Fokus tampilan **desktop dan tablet** (mobile dipoles rekan; kerangka responsif dasar tetap dipasang). Semua teks UI **bahasa Indonesia polos**.

## Fondasi yang SUDAH berjalan (jangan diubah tanpa alasan kuat)
Bun + Elysia, React Router v8 SSR, Mantine v9, PostgreSQL + Drizzle, Better Auth (plugin admin, apiKey, multiSession, anonymous). Area: `/app` (produk), `/dashboard` (admin), `/dev` (super-admin ops). Struktur: `server/` (api, db, guard.ts, permissions.ts, roles.ts, api-keys/, storage/, local-pg/), `app/` (routes, components, lib), `tests/` (bun:test, mirror `server/`). Baca `CLAUDE.md` di root untuk konvensi (Mantine wajib, UX production-ready, SEO meta, mobile baseline, konvensi Elysia, test, build/smoke).
Aturan global yang berlaku: batas ukuran file (route/handler 150 baris, service 300, repository 250, schema 200, types 300, util 200, test 400; keras 500 baris/20.000 karakter), tanpa empty catch, error dengan konteks, tanpa PII/credential di log, tanpa nilai hardcode (pakai env/konstanta/config), test wajib untuk fitur, commit `<type>(<scope>): <english imperative>`.

## Keputusan yang sudah final (dikonfirmasi user)
Sumber: `tahapan-proyek/03-desain/erd/diskusi/00-role-dan-area.md`.
- 4 role akun: `super-admin` (env `SUPER_ADMIN_EMAILS`), `admin`, `project_manager`, `member` (`user` lama diganti `member`). Role akun terpisah dari role di proyek (`manager`/`member`/`viewer` = Pengelola/Anggota/Pemantau).
- Area: `/app` semua role (Member dan PM tampilan sama, wewenang beda); `/dashboard` Admin dan super-admin (Pengguna, Pengaturan tim); `/dev` super-admin. Super-admin = superset Admin.
- Admin boleh ubah Member ↔ PM; ubah dari/ke Admin hanya super-admin. Aturan "Admin terakhir" dibuang.
- Login Google saja (email/password hanya dev lokal; `app_setting.email_auth_enabled` default false), demo anonim dimatikan, **undangan awal** (Admin isi email+role, login Google pertama langsung approved), status akun `pending/approved/rejected` (+ `suspended` memakai mekanisme `banned` yang ada), halaman tahan seperti `/banned`.
- Ukuran teks Normal/Besar/Sangat besar dipakai (`profile.text_size`).
- Tipe id **`text`** (`crypto.randomUUID()`) mengikuti template, bukan `uuid`; `timestamptz` untuk tabel baru. Slug URL **bahasa Inggris** (`/app/projects`, `/app/tasks`, `/app/events`, `/app/team`, `/app/inbox`, `/app/trash`, `/app/settings`), label menu bahasa Indonesia.
- Ditunda ke fase 5 (bukan MVP): fitur AI (cerita proyek, notulensi foto/suara, Ask Data), template proyek, impor/unduh CSV, cuti dengan persetujuan, Gantt, Retro, menu Ticket/Pengembangan terpisah.
- Asumsi A1–A5 (proyek) dan A1–A10 (tugas) yang belum dikonfirmasi: implementasikan sesuai usulan dokumen, tetapi sebagai konfigurasi/konstanta bernama yang mudah diubah.
- Detail tugas: halaman penuh vs drawer BELUM diputuskan (dievaluasi di R05).

## Bahan acuan (baca sesuai bidangmu)
- `tahapan-proyek/note.md` (spesifikasi awal, kalah dari desain final bila bentrok)
- `tahapan-proyek/03-desain/erd/{user-profile,project,task,gabungan}.md`
- `tahapan-proyek/03-desain/erd/diskusi/00..09-*.md` (keputusan per layar; ini yang berlaku)
- `tahapan-proyek/02-analisis/hasil-orchestrasi/{analysis,orchestration/DECISIONS.md,deliverables/workflow.md}`
- `tahapan-proyek/01-riset/` (kompetitor) dan `tahapan-proyek/04-prototype/prototype/`
- Wireframe sebenarnya ada di Penpot (tidak bisa kamu akses); pakai dokumen diskusi sebagai gantinya dan tandai bila ada yang tidak jelas tanpa gambarnya.

## Mutu laporan
Konkret dan bisa dieksekusi: nama file, nama tabel, tanda tangan fungsi, daftar endpoint, angka, urutan langkah. Hindari kalimat umum. Setiap rekomendasi menyebut alternatif yang ditolak dan alasannya. Tandai ASUMSI dengan jelas. Jangan menyalin dokumen desain; rujuk path-nya.

---
## ADENDUM 15 Okt 2026 (peluncuran ulang) — WAJIB DIBACA

Percobaan pertama delapan worker mati karena kuota token (HTTP 429) di tengah pekerjaan, dan semua hasilnya hilang karena file baru ditulis di akhir. Karena itu:
1. **Tulis file keluaranmu SEDINI MUNGKIN**: dalam 5 pemanggilan tool pertama buat kerangka 7 bagian (judul bagian + satu baris "TODO"), lalu isi dan simpan SETIAP bagian segera setelah selesai. Jangan menunggu sampai akhir. Bila kamu mati di tengah, bagian yang sudah tersimpan tetap terpakai.
2. **Hemat token.** Jangan membaca file besar utuh; pakai `grep -n`, `sed -n 'a,bp'`, atau `head`. Satu file desain boleh dibaca utuh hanya bila benar-benar perlu. Target laporan 250-350 baris, bukan 450.
3. **Jangan mengulang riset yang sudah ada.** Tujuh laporan sudah selesai di folder ini: `R02-skema-data`, `R03-policy-dan-hitungan`, `R07-beranda-inbox`, `R08-events-tim-sampah-pengaturan`, `R09-tes-qa`, `R12-keamanan-privasi`, `R14-migrasi-rilis-ops`. Bila bidangmu bersinggungan, baca HANYA bagian 1 (Ringkasan) dan bagian 6 (Pertanyaan terbuka) lewat `sed -n`, dan rujuk dengan nama file, jangan menyalin isinya. Bila temuanmu bertentangan dengan laporan itu, tulis pertentangannya secara eksplisit di bagian 2.
4. **Temuan yang sudah diketahui dan harus kamu hormati** (jangan ditemukan ulang): R12 menemukan di fondasi: sign-up email masih terbuka di server (saklar hanya UI), role super-admin tidak mengecek `emailVerified`, dan `/api/auth/admin/*` Better Auth melewati matriks izin. R02 menetapkan konvensi: id `text`, nama tabel tunggal, `timestamptz`, enum = text + CHECK, FK pelaku nullable + `ON DELETE SET NULL`, soft delete via `deleted_at/deleted_by`. R14: `drizzle-kit` tidak menghasilkan `IF NOT EXISTS`, migrasi harus berurutan. R08: pengaturan tim memakai `app_setting` yang ada. R03: 23 kontradiksi antar dokumen desain dan modul izin murni `server/access/*`.
5. Bila kamu melihat `API Error 429` / kuota habis, JANGAN mengulang berulang-ulang: simpan apa yang sudah ada di file, lalu berhenti. Koordinator akan membaca file parsial.

### Tambahan khusus R01 (percobaan ke-3, terakhir)
Dua percobaan R01 sebelumnya mati (kuota, lalu koneksi putus) setelah ±25 perintah baca tanpa menyimpan apa pun selain kerangka. **Aturan keras untuk R01:** setiap 4-5 perintah baca, SEGERA tulis temuanmu ke `R01-fondasi-role-akun.md` (ganti baris TODO di bagian yang relevan) sebelum membaca lagi. Jangan membaca lebih dari 5 file sebelum menyimpan. Jangan membaca ulang file yang sudah kamu simpan temuannya. Prioritas isi: (b) keputusan penyimpanan status akun dengan bukti, (c) undangan awal + hook login pertama, (d) halaman tahan pending/rejected, (e) SQL migrasi, (i) langkah berurutan + test. Bagian (a) tabel pemakaian role cukup dihitung dengan satu `grep -c` per file (jangan dibuka satu-satu). Temuan R12 soal sign-up terbuka, `emailVerified` super-admin, dan `/api/auth/admin/*` sudah diketahui: cukup masukkan sebagai langkah Fase 0, tidak perlu diteliti ulang.
