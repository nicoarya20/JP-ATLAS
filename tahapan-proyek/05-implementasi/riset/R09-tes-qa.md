# R09 · Strategi Test, QA, dan Definisi Selesai untuk MVP Simple PM

> Tanggal: 15 Oktober 2026. Riset/perencanaan murni: hanya membaca kode dan dokumen; tidak ada test, migrasi, server, PG, RustFS, browser, atau `bun install` yang dijalankan. Karena itu **tidak ada angka waktu hasil ukur** di sini; semua batas waktu adalah USULAN yang harus dikalibrasi.
> Path di bawah `server/pm/*` dan `tests/pm/*` adalah ASUMSI struktur (CLAUDE.md meminta `tests/` mirror `server/`); sesuaikan bila riset struktur server memilih nama lain.

## 1. Ringkasan eksekutif

1. Suite sekarang: 116 file, 10.841 baris, 666 deklarasi `test(`/`it(` (hitung grep). Pola yang sehat sudah ada (DB test terpisah otomatis, `spyOn` untuk auth, tag unik per file), tetapi **belum ada factory bersama**; setiap file menulis ulang insert user dan spy.
2. Rencana: **≈ 750 kasus** baru/diubah dalam ≈ 39 file test baru + 7 file diubah + ≈ 9 file pendukung `tests/support/`. Komposisi: unit murni table-driven ≈ 52%, API integration ≈ 35%, constraint/migrasi/index DB ≈ 7%, kontrak rute + render SSR ≈ 6%.
3. Dua matriks izin (proyek, tugas) dan semua nilai hitung (progres, kondisi, Terlambat/Tertahan/Mandek, kelompok jadwal) dibuat **fungsi murni dengan `now` disuntik**, supaya diuji dalam milidetik tanpa DB dan tanpa bergantung hari Minggu atau tengah malam.
4. Data contoh **Atlas** menjadi satu sumber (`server/seed/atlas.data.ts`) untuk test golden, seed demo, dan QA manual. Ditemukan **inkonsistensi desain**: progres Atlas "70%" (`02-proyek.md:163`) tidak bisa dihasilkan dari tabel tugas Atlas (`03-tugas.md:205-215`, hasil rumus 1/6 = 17%). Fixture mengikuti rumus, bukan angka wireframe (pertanyaan 6.5).
5. Kebocoran antar file adalah risiko nyata: **13 file** memakai `mock.module` untuk `server/guard` dan Bun tidak mengembalikannya lewat `mock.restore()`. Aturan: test PM hanya `spyOn`; ditambah "test kebersihan" yang mengunci jumlah `mock.module` (ratchet) dan melarang `db.delete(x)` tanpa `where`.
6. Seed beban (1.000 tugas, 20 proyek, 30 pengguna) lewat `scripts/seed-dev.ts load`; uji kinerja = (a) penghitung query deterministik yang selalu jalan (anti N+1) dan (b) uji waktu opt-in `PM_PERF=1` dengan batas usulan 200-300 ms per endpoint.
7. SMOKE_CHECKS bertambah 14 entri anonim (halaman `/app/*`, `/dashboard`, API `/api/app/*`); total hasil 23 → 37 (angka "23" di CLAUDE.md ikut diperbarui). Smoke terautentikasi **tidak** diusulkan di MVP (biaya tinggi); diganti sapuan auth per rute lewat `api.routes`.
8. Test interaksi UI (klik, modal) tidak mungkin tanpa DOM; repo tidak punya `happy-dom`/testing-library. Usulan: render SSR (`renderToStaticMarkup`) untuk kontrak teks/label/kosong-state, sisanya QA manual (bagian 3.8); penambahan dependency ditanyakan (6.1).
9. Estimasi: ≈ 25-38 hari-orang pekerja AI (dikerjakan bersama fitur; ≈ 22-34 tanpa paket opsional) + ≈ 6-7 hari reviewer manusia.

## 2. Temuan (dengan bukti)

### 2.1 Fondasi test yang ada

| # | Temuan | Bukti |
|---|---|---|
| T1 | Preload memaksa `NODE_ENV=test`, menyiapkan DB `<db>_test` (dibuat + dimigrasi otomatis di mode PG lokal) dan bucket `-test`; `afterAll` mematikan PG/RustFS yang dinyalakan run ini | `bunfig.toml:1-2`, `tests/preload.ts:7-11`, `server/local-pg/test-db.ts:23-39,48-53` |
| T2 | `server/db` **melempar error** di mode test tanpa `DATABASE_URL_TEST`; pool tunggal `max: 5` di `globalThis` | `server/db/index.ts:8-16,20` |
| T3 | `runMigrations(url, folder)` menerima folder migrasi sendiri; pola membuat DB sementara sudah ada di `ensureLocalTestDb` | `server/local-pg/boot.ts:11`, `test-db.ts:28-36` |
| T4 | Pola auth test: `spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')` di level modul, `mockRestore` di `afterAll`, `TAG` acak per file, user di `beforeAll`, hapus di `afterAll` dengan `.catch(() => {})` | `tests/api/posts.test.ts:12-18,38-61`; `tests/api/me-api-keys.test.ts:12-28,88-99` |
| T5 | Penantian audit memakai `sleep` tetap (flake dan lambat) | `posts.test.ts:96` (100 ms), `me-api-keys.test.ts:129` (50 ms) |
| T6 | **13 file** memanggil `mock.module('../../server/guard', ...)` dan (terverifikasi di `api-keys-api.test.ts:4-9`; sisanya diasumsikan serupa) hanya mengekspor `requireRole`; komentar repo menyebut mock itu bocor lintas file. Bun: `mock.restore()` "does not reset modules overridden with `mock.module()`" | `tests/api/{audit,sessions,ops,api-keys-usage,logs,analytics,analytics-ratelimits,analytics-logins,analytics-visits,file-health,settings,settings-ops,api-keys-api}.test.ts` (baris 4-6), `api-keys-api.test.ts:4-9`, `tests/guard.test.ts:20-24`, `posts-query.test.ts:118-119` |
| T7 | `app-routes.test.ts` hanya memeriksa guard pada **anak langsung** layout `/app` (`layout?.children`); rute bersarang (mis. `projects/:id`) tidak diperiksa. Regex guard: `require(User\|AnyRole\|Role)\(request` | `tests/app-routes.test.ts:33-41` (regex di baris 38) |
| T8 | `app-contracts.test.ts` sudah `test.each` atas semua rute di `routes.ts` untuk `meta()`, jadi rute baru otomatis terkena | `tests/app-contracts.test.ts:23` |
| T9 | Smoke: 22 entri `SMOKE_CHECKS` + 1 cek aset = 23 hasil (cocok dengan CLAUDE.md); semuanya **anonim**; evaluator murni sudah diuji tanpa server | `scripts/smoke-server.checks.ts:33-160,165-200,203-245`, `tests/smoke-server.test.ts:13-47` |
| T10 | CI hanya `lint → typecheck → db:migrate → test` pada Postgres 18; **smoke tidak ada di CI**, release hanya typecheck + build | `.github/workflows/ci.yml:42-46`, `release.yml:52-55` |
| T11 | Jam: pola benar sudah ada: parameter `now = Date.now()` dan `setSystemTime` + restore `afterEach`. SQL `now()` tidak ikut `setSystemTime` | `server/ban.ts:21`, `tests/middleware/rate-limiter.test.ts:13,154` |
| T12 | `/api/app/*` memakai `resolveActor` lewat `derive` dan 401 seragam; test memakai router penuh `api` (envelope error + plugin ikut teruji) | `server/api/app.ts:10-15`, `tests/api/app.test.ts:14-23` |
| T13 | Tidak ada `happy-dom`/`jsdom`/testing-library di `package.json`; render SSR dipakai di `tests/query-provider-ssr.test.ts` | grep `package.json`, `tests/` |
| T14 | `pg_trgm` **ada** di runtime PG tertanam (darwin-arm64): `~/.cache/makuro-template/pg/18.4.0/darwin-arm64/native/share/postgresql/extension/pg_trgm.control`; runtime dipin `18.4.0-beta.17` (`server/local-pg/runtime.ts:20`). Platform lain dan image `postgres:18` CI: ASUMSI sama |
| T15 | File Health: `tests/**` = jenis `test` (maks 400 baris); `__fixtures__`, `/seed*`, `/migrations/` dikecualikan. Folder `tests/support/` tetap kena batas, folder `server/seed/` dikecualikan | `server/file-health/file-health.rules.ts:133-143` |

### 2.2 Celah terhadap rencana MVP

- **G1 Rename role.** Pola role `user` cocok 41 kali di 18 file test (grep `as 'user'|role: 'user'|ROLES.USER|=> 'user'`), dan 24 baris cocok `ROLES.USER|'user'` di `server/` (sebagian bukan role) (`permissions.ts:9-13,18,21,26,69,103`, `auth.ts:38`, `scopes.ts:52,100,106,112`). `ROLE_RANK: Record<Role, number> = { user: 0, admin: 1, 'super-admin': 2 }` (`scopes.ts:122`) akan gagal typecheck (baik: jaring pengaman), tetapi `project_manager` harus ditaruh benar di antara member dan admin; wajib `test.each` 4 role × semua scope.
- **G2 Status akun** (`pending/approved/rejected`) harus terbaca di `resolveActor` (`guard.ts:67-96`). Stub `getSession` di test hanya mengembalikan `{id,email}`; bila status adalah `additionalFields` Better Auth, stub **bisa menyimpang dari bentuk nyata** (ASUMSI). Perlu satu test integrasi dengan Better Auth asli (pola `tests/auth-flow.test.ts:1-10`: sign-up/sign-in email sungguhan; harus tetap hijau setelah form email dihapus dari UI karena email/password hidup di non-production) selain stub.
- **G3 Rumus bergantung hari ini.** "Terlambat", "Hari ini/Besok/Minggu ini (s.d. Minggu)", "Mandek" (`task.md:464-478`) memakai tanggal; tanpa jam disuntik, test flake pada hari Minggu/tengah malam. Zona waktu belum diputuskan (pertanyaan 6.2).
- **G4 Aturan "dijaga di service, bukan constraint"** (pengelola terakhir, pemeriksa, siklus dependensi; `project.md:30-35`, `task.md:89-100`) harus diuji di lapisan service/API, sedangkan yang **memang** constraint (CHECK, PK, UNIQUE parsial) diuji langsung di DB (bagian 3.2 baris E).
- **G5 Data desain tidak konsisten** (lihat 2.3).
- **G6 Dua DB.** Migrasi baru wajib ke DB dev **dan** test (CLAUDE.md › Test); tes migrasi di DB berisi data tidak bisa memakai DB test bersama (butuh DB sementara, T3).

### 2.3 Data Atlas dari desain (bahan fixture)

Sumber: `03-tugas.md:205-221`, `02-proyek.md:160-170,258`, `05-events.md:173-179`, `07-tim.md:52-58`, `08-sampah.md:53-57`. Hari ini = **Rabu 7 Oktober 2026** (diverifikasi: 7 Okt 2026 hari ke-280, Rabu).

- Pengguna: **Nico** (PM, Lead Atlas), **Rina**, **Dodi** (Member), **Sri** (Pemantau di Atlas; role akun Member), **Admin** (nama tidak ditetapkan di sumber yang dibaca; "Ayu" muncul di `06-inbox.md:63` tetapi perannya tidak jelas, jadi fixture memakai nama "Admin"). Role akun Sri tidak disebut: ASUMSI Member.
- Proyek Atlas: mulai 1 Sep, tenggat 31 Okt, tenggat awal 15 Okt, perpanjangan ×1 (Scope bertambah, "Tambah login SSO", Nico, 1 Okt); tahapan Perencanaan 1-24 Sep (selesai), Pengembangan 25 Sep-20 Okt (berjalan), Pengujian 21-27 Okt, Rilis 28-31 Okt; milestone "Rancangan disetujui" (tercapai), "Rilis beta" 20 Okt (menunggu). Proyek lain di daftar: Portal Klien PT Sinar (Lead Rina), Migrasi Data Lama (Dodi, terlambat), Internal Tools, Aplikasi Absensi (Draf), Website Company Profile (Selesai).
- Tugas Atlas: #8 Selesai (Nico, tenggat 20 Sep), #12 Fix login SSO (Bug, Tinggi, Nico, 5 Okt, Sedang dikerjakan, checklist 2/3, perlu diperiksa nyala, pemeriksa jatuh ke Admin), #14 (Nico, tenggat **hari ini**), #15 (Nico, 9 Okt), #16 (Dodi, 9 Okt, Tertahan oleh #12), #17 (Dodi, 8 Okt, **Menunggu diperiksa**, pemeriksa Nico). #9 ada di PT Sinar (Nico, 8 Okt).
- **Golden turunan rumus** (bukan angka kosmetik wireframe): Waktu berjalan = (7 Okt - 1 Sep) / (31 Okt - 1 Sep) = 36/60 = **60%** (cocok `02-proyek.md:258`). Tugas aktif Atlas = 5 (#12,#14,#15,#16,#17), terlambat = 1 (#12; #14 tenggat hari ini **bukan** terlambat karena `due_date < hari ini` ketat) → 20% **tidak** > 20% (kasus batas), tetapi #12 prioritas Tinggi terlambat → kondisi **Perlu perhatian** (cocok `02-proyek.md:163`). Progres = 1 selesai / 6 tugas non-batal = **17%** (bukan 70%). Menunggu diperiksa saya (Nico) = #17. Kelompok jadwal Nico: Terlambat #12, Hari ini #14, Besok #9, Minggu ini #15.
- Batas yang sengaja ada di data: #14 (tenggat = hari ini), 1/5 = 20% persis, #16 ber-dua label (Tertahan + Mandek bila `last_activity_at` diatur > 3 hari: ASUMSI) untuk menguji urutan label "Terlambat > Menunggu diperiksa saya > Tertahan > Mandek".

## 3. Rekomendasi

### 3.1 Piramida dan prinsip (keputusan)

**Keputusan:** logika izin dan nilai hitung = **fungsi murni** (input objek biasa + `now`), diuji `test.each` tanpa DB (≈ 391 kasus; porsi waktu jalan kecil, ASUMSI belum diukur). API integration lewat router penuh `api.handle` (≈ 259). DB constraint/migrasi/index ≈ 56. Render SSR + kontrak rute ≈ 44. Browser otomatis tidak dipakai (aturan global 1: hanya atas izin).
**Ditolak:** (a) mayoritas E2E browser: lambat, butuh izin, tidak bisa jalan di CI saat ini; (b) menguji matriks izin lewat API+DB per sel (90+ kasus × fixture DB): puluhan kali lebih lambat, hasil sama; (c) satu file "pm.test.ts" besar: melanggar batas 400 baris.
**Gaya matriks (rujukan gaya R03, tanpa membaca R03):** tabel data `const CASES: Array<[judul, aktor, aksi, konteks, diharapkan]>` + `test.each(CASES)('%s', ...)` seperti `tests/app-contracts.test.ts:23`. Matriks uji ditulis **tangan dari dokumen desain** (`task.md:56-78`, `project.md:22-37`, `00-role-dan-area.md` §3), terpisah dari tabel milik kode, supaya tidak tautologi; satu test tambahan membandingkan tabel "Peran dan izin" UI (09 #6) dengan keputusan fungsi.

### 3.2 Tabel rencana test per modul (hasil utama)

Est. = jumlah kasus (satu baris data `test.each` = satu kasus). Lapisan: **U** unit murni, **A** API/integrasi DB, **D** DB langsung, **S** SSR/kontrak.

| # | File (B = baru, U = ubah) | L | Kasus utama | Est. |
|---|---|---|---|---|
| **A · Akun dan fondasi (Fase 0)** | | | | **108** |
| A1 | `tests/permissions.test.ts` (U, 15 test sekarang) | U | `normalizeRole` (legacy `user`→member, null, asing), `homeFor` ×4, `isAdminRole`, `canAccessDev`, `reconcileRole` (env, demosi), matriks §3 role: Member↔PM oleh Admin/SA, PM→Admin hanya SA, setujui/tolak/nonaktifkan Admin hanya SA | 45 |
| A2 | `tests/roles.test.ts` (U) | A | `resolveUserRole` dengan `project_manager` tersimpan, super-admin env, persist hanya bila berubah | +3 |
| A3 | `tests/guard.test.ts` (U, 10 test) | A | `pending`→halaman tahan, `rejected` (+alasan), `approved` lolos, banned→`/banned`, super-admin env selalu approved, `requireUser` 4 role, PM/Member ke `/dashboard`→`/app` | +12 |
| A4 | `tests/account-status.rules.test.ts` (B) | U | transisi status sah/tidak sah, siapa boleh (Admin vs SA vs target Admin), alasan tolak | 12 |
| A5 | `tests/api/invitations.test.ts` (B) | A | buat undangan, email dobel (case-insensitive), Admin tak boleh undang Admin, login Google pertama → `approved` + role undangan (fungsi hook dipanggil langsung), login kedua tak menimpa, tanpa undangan → `pending`, email SA env, email tidak valid 400 | 12 |
| A6 | `tests/api/admin-users.test.ts` (U, 9 test) | A | setujui/tolak/nonaktifkan per matriks, Admin→Admin 403, ubah role + `audit()` + label `ACTION_META`, kartu Inbox hilang bagi semua | +14 |
| A7 | `tests/api-keys/scopes.test.ts` (U) | U | `roleAllowsScope`/`scopesForRole` 4 role × semua scope (`test.each`), `requiredScope` untuk semua prefix `/api/app/*` baru | +10 |
| **B · Proyek** | | | | **131** |
| B1 | `tests/pm/project-access.test.ts` (B) | U | 7 aksi × {Admin, SA, PM-pengelola, PM-bukan-pengelola, Member-pengelola, Member-anggota, Pemantau, bukan-anggota}; tombol "+ Proyek baru" disembunyikan untuk Member | 45 |
| B2 | `tests/pm/project-computed.test.ts` (B) | U | progres (tanpa tugas → "Belum ada tugas" bukan 0%, batal & Sampah dikecualikan, `in_review` belum selesai), waktu berjalan %, kondisi (Terlambat; Perlu perhatian 3 pemicu; **batas 20%**, `PROJECT_AT_RISK_OVERDUE_RATIO`; hanya status `active`; override manual menimpa), diperpanjang ×N; **golden Atlas** (60%, Perlu perhatian, 17%) | 30 |
| B3 | `tests/api/projects.test.ts` (B) | A | anonim 401; buat (status awal hanya draft/active, Lead otomatis pengelola, `due>=start` 400); daftar **paginasi** + clamp limit + filter status/cari; Member hanya yang diikuti; PM non-pengelola 403 pada ubah; ubah/hapus ke Sampah + `audit()`; bentuk error `{error,code,status,requestId}`; IDOR proyek lain → 404 | 28 |
| B4 | `tests/api/project-members.test.ts` (B) | A | tambah/ubah/keluarkan; **pengelola terakhir 409** (keluar dan turun peran); Lead wajib pengelola; Pemantau; bukan-anggota 404 | 12 |
| B5 | `tests/api/project-structure.test.ts` (B) | A | tahapan (urutan unik), milestone, perpanjang tenggat (`original_due_date` tak berubah, alasan enum, ×N), override kondisi + masa berlaku | 16 |
| **C · Tugas** | | | | **255** |
| C1 | `tests/pm/task-access.test.ts` (B) | U | 18 baris matriks `task.md:58-78` × {Admin/SA, Pengelola, Anggota-pembuat, Anggota-pengerja, Anggota-lain, Pemantau}; A2 (Anggota ubah tugas sendiri), A3 (Anggota buat tag) ditandai konstanta | 90 |
| C2 | `tests/pm/task-computed.test.ts` (B) | U | aktif, Terlambat (ketat `<`), Tertahan, **Mandek** (batas `TASK_STALE_DAYS`: tepat 3 hari ≠ mandek), Menunggu diperiksa saya (3 cabang), urutan satu label, kelompok jadwal (Minggu ini s.d. Minggu; 23:59/00:00 zona), progres langkah "2/3", Bug terbuka | 40 |
| C3 | `tests/pm/task-transitions.rules.test.ts` (B) | U | graf status todo/in_progress/in_review/done/canceled sah dan tidak; Buka lagi/Batalkan wajib alasan (+kategori); tombol Perlu diperiksa: kunci saat review/done/canceled, hanya Pengelola/Admin boleh mematikan | 25 |
| C4 | `tests/pm/task-reviewer.rules.test.ts` (B) | U | rantai pemeriksa default 4 langkah (pembuat→Lead→pengelola tertua→Admin kosong) melewati pengerja; hitung ulang saat pengerja = pemeriksa/pemeriksa bukan pengelola; ganti manual hanya ke Pengelola/Admin; **kasus #12** (Lead mengerjakan, 1 pengelola → Admin) | 22 |
| C5 | `tests/pm/task-dependency.rules.test.ts` (B) | U | diri sendiri, lintas proyek (A7), siklus 2/3/4 simpul, duplikat | 10 |
| C6 | `tests/api/tasks.test.ts` (B) | A | buat (nilai awal `needs_review` dari setelan proyek, tidak ikut berubah belakangan), daftar Tugas saya/Semua + **paginasi** + filter (status, orang, jenis, prioritas, tag), ubah per A2, nomor urut unik, hapus ke Sampah/pulihkan, IDOR lintas proyek 404, 401 | 30 |
| C7 | `tests/api/task-review.test.ts` (B) | A | minta diperiksa, setujui/kembalikan (hanya Pengelola/Admin), `return_count`/`reopen_count`, review terbuka unik, kartu Inbox dibuat/hilang, Admin fallback | 14 |
| C8 | `tests/api/task-checklist-comments.test.ts` + `task-attachments-tags.test.ts` (B) | A | checklist (progres), komentar (Pemantau boleh), bukti (storage mati → `503 STORAGE_DISABLED`, magic bytes bukan `Content-Type`, tolak SVG/HTML), jenis tugas (unik `lower(name)`), tag (A3, gabung/hapus hanya Pengelola) | 24 |
| **D · Beranda dan modul lain** | | | | **156** |
| D1 | `tests/api/home.test.ts` (B) | A | ringkasan per role: Admin semua, PM yang dikelola, Member yang diikuti; tak membocorkan proyek lain; angka sama dengan hitungan murni (golden Atlas) | 12 |
| D2 | `tests/perf/pm-load.test.ts` (B) | A | penghitung query + EXPLAIN (selalu), waktu (opt-in); lihat 3.5 | 6 |
| D3 | `tests/pm/event-rules.test.ts` + `tests/api/events.test.ts` (B) | U/A | status dihitung (Akan datang/Berlangsung/Selesai), Dibatalkan manual+alasan, ulang (mingguan, 2 mingguan, bulanan akhir bulan), event tanpa proyek, Member pilih proyek bukan-Pemantau; visibilitas per role; hapus berulang "Hanya yang ini/Semua" | 14+18 |
| D4 | `tests/pm/inbox-rules.test.ts` + `tests/api/inbox.test.ts` (B) | U/A | angka lonceng = kartu "Perlu Anda tanggapi", perubahan sendiri tak muncul, kartu hilang bila aksi dilakukan di tempat lain, bundel "5 perubahan di #12", Tandai semua dibaca hanya Kabar, kartu Admin untuk pengguna baru hilang bagi semua | 14+14 |
| D5 | `tests/pm/team-visibility.test.ts` + `tests/api/team.test.ts` (B) | U/A | D10: beban terlihat Admin semua, PM hanya proyek yang **dikelola**, Member hanya diri; daftar orang = berbagi proyek + semua disetujui (Admin); hanya baca | 16+10 |
| D6 | `tests/pm/trash.rules.test.ts` + `tests/api/trash.test.ts` (B) | U/A | simpan 30 hari + sisa hari, visibilitas (Member: yang ia hapus; PM: + proyek dikelola), pulihkan per matriks, hapus permanen hanya Admin, hapus proyek ikut tugas/event dan **pulih bersama** (yang dihapus lebih dulu tidak), tugas dengan proyek di Sampah tak bisa dipulihkan, komentar/bukti tidak masuk Sampah | 18+18 |
| D7 | `tests/api/settings-profile.test.ts`, `tests/api/team-settings.test.ts` (B) | A | `text_size` 3 nilai + nilai asing 400, edit profil, email tak bisa diubah, saklar tim hanya Admin (403 PM/Member), `audit()` | 10+6 |
| **E · Lintas modul** | | | | **100** |
| E1 | `tests/db/pm-constraints.project.test.ts`, `…task.test.ts` (B) | D | CHECK `due>=start`; PK `(project_id,user_id)`; UNIQUE `(project_id,position)`; `tasks.number` unik + 20 insert paralel; CHECK `task_id<>blocked_by`; UNIQUE `lower(name)` jenis dan tag (case dan lintas proyek); UNIQUE parsial review terbuka; CASCADE (proyek→anggota/tugas, tugas→checklist/komentar/tag, user→anggota); SET NULL `template_id`; nilai enum/CHECK asing ditolak | 24 |
| E2 | `tests/db/pm-indexes.test.ts` (B) | D | `test.each` atas 20 index di `project.md:383-395` dan `task.md:480-497` terhadap `pg_indexes` (nama + kolom) | 20 |
| E3 | `tests/db/migration-pm-foundation.test.ts` + `migration-pm-schema.test.ts` (B) | D | lihat 3.3 | 12 |
| E4 | `tests/app-routes.test.ts` (U) | S | guard pada **semua turunan** (`flatten`), guard = pernyataan pertama loader, halaman `/dashboard` memakai `requireAnyRole([ADMIN,SUPER_ADMIN])`, halaman tahan tanpa guard role | +6 |
| E5 | `tests/app-nav.test.ts` (B) | S | `NAV` `/app` = 8 menu bahasa Indonesia, slug Inggris (`/app/projects`…), "Area lain" per role | 6 |
| E6 | `tests/ui/*.test.tsx` (B, 3 file) | S | `renderToStaticMarkup`+`MantineProvider` (ASUMSI Mantine bisa dirender di `bun test`; aplikasi sendiri SSR, dan `query-provider-ssr.test.ts` sudah memakai `renderToString`): label Terlambat/Tertahan/Mandek **ikon+teks**, empty state tiap daftar ("Belum ada …"), "Belum ada tugas" vs 0%, tombol disabled + alasan, skala `text_size` | 25 |
| E7 | `tests/smoke-server.test.ts` (U) + `tests/api/app-auth-sweep.test.ts` (B) | S/A | entri baru terbentuk benar; **sapuan**: setiap rute `/api/app/**` di `api.routes` → 401 untuk anonim dan scope `app:read`/`app:write` (otomatis ±1 kasus per rute) | 2+2 (+N rute) |
| E8 | `tests/test-hygiene.test.ts` (B) | S | jumlah file ber-`mock.module` ≤ 13 (ratchet, daftar putih); tak ada `db.delete(x)` tanpa `.where`; tak ada `Bun.sleep` > 100 ms di test baru | 3 |
| | **Total** | | **≈ 750 kasus; 39 file baru, 7 file diubah** | **750** |

Catatan: (1) rencana ini tidak menghitung `test.each` yang berkembang otomatis (E7 dan `app-contracts` +≈ 17 rute). (2) Fitur yang ditunda ke fase 5 (AI, template, CSV, cuti, Gantt, Retro) **tidak** diuji sekarang; skema tabelnya bila ikut dibuat cukup kena E1/E2. (3) Semua file ≤ 400 baris (T15); matriks besar (C1) dipecah per kelompok aksi bila lewat.

### 3.3 Test migrasi di DB berisi data (keputusan)

`tests/support/scratch-db.ts#withScratchDb(fn)` membuat DB `<db>_test_mig_<acak>` (cara `test-db.ts:28-36`; mode eksternal: turunkan URL admin dari `DATABASE_URL_TEST` dengan mengganti nama DB; di CI user `postgres` boleh `CREATE DATABASE`, ASUMSI untuk server lain), lalu:
1. Salin `server/db/migrations` ke folder sementara dengan `meta/_journal.json` dipotong sampai migrasi **sebelum** migrasi fondasi PM; `runMigrations(url, folderLama)` (`boot.ts:11`).
2. Sisipkan data lama: user role `'user'`, `null`, `'admin'`, `'super-admin'`, satu `banned`, satu anonim, plus `post`/`audit_log`.
3. `runMigrations(url)` dengan folder penuh. Asersi: `user`→`member` (null juga → `member`); admin/super-admin tetap; semua user lama `approved` dengan `approved_at` terisi (tidak terkunci); banned tetap banned; baris baru tanpa status → `pending`; kolom baru NOT NULL punya DEFAULT; SQL migrasi dijalankan **dua kali** tanpa error (guard `IF NOT EXISTS`, aturan global 4); semua tabel/kolom di `schema*.ts` ada di DB (pakai `server/db/schema-introspect.ts`) = deteksi gap schema vs migrasi; default role Better Auth = `member`.
4. DB sementara di-`DROP` di `finally` (hanya DB bernama itu).
**Ditolak:** menguji migrasi pada DB test bersama (data bocor ke file lain, tidak bisa mulai dari keadaan lama); `drizzle-kit push` untuk test (tidak menguji file migrasi yang akan dijalankan produksi); snapshot SQL string (tidak memeriksa perilaku). Tambahan opsional: `drizzle-kit check` di CI (ASUMSI perintah tersedia di versi terpasang; belum diverifikasi).

### 3.4 Desain factory dan fixture

Lokasi `tests/support/` (kena batas 400 baris, bukan `__fixtures__` yang dikecualikan dari File Health; data murni Atlas di `server/seed/` yang memang dikecualikan, `file-health.rules.ts:135`). Tidak ada `DELETE` global; semua penghapusan `inArray(id, yang-dilacak)`.

```ts
// tests/support/cleanup.ts   (≤150 baris)
type Kind = 'taskPart' | 'task' | 'event' | 'project' | 'invitation' | 'user';
createCleaner(): { track(kind: Kind, id: string): string;
                   flushTest(): Promise<void>;   // dipasang di afterEach
                   flushAll(): Promise<void> }   // dipasang di afterAll
// urutan hapus: taskPart → task → event → project → invitation → audit_log(actor/target) → user
// galat dikumpulkan lalu dilempar (AggregateError); TIDAK ada .catch(() => {}) seperti posts.test.ts:56
// tests/support/factory.ts   (dipecah factory.user/project/task.ts bila > 200 baris)
createFactory(cleaner, opts?: { tag?: string; now?: () => Date }): Factory
f.user({ role?: AppRole, status?: 'pending'|'approved'|'rejected', banned?, name? }): Promise<TestUser>
f.project({ lead: TestUser, members?: [TestUser, ProjectRole][], status?, startDate?, dueDate?, needsReviewDefault? }): Promise<TestProject>
f.task({ project, creator?, assignee?, status?, priority?, due?: string|null, kind?, needsReview?, lastActivityAt?, deletedAt? }): Promise<TestTask>
f.tasks(project, n, make?: (i: number) => Partial<TaskInput>): Promise<TestTask[]>   // INSERT multi-baris, potongan 500
f.shared(async () => {...})   // pembuatan di beforeAll → tercatat file-scope (flushAll saja)
// tests/support/auth.ts
installAuthSpies(): { as(u: TestUser | null): void }   // spyOn getSession + resolveUserRole di beforeAll; restore di afterAll sendiri
// tests/support/api.ts
call(method, path, body?, headers?): Promise<{ status; body; headers }>   // api.handle (router penuh, seperti app.test.ts:19-23)
expectApiError(res, status, code)                                         // {error, code, status, requestId}
waitForAudit(where): Promise<AuditRow[]>                                  // polling ≤ 1 dtk / 10 ms, ganti Bun.sleep (T5)
// tests/support/clock.ts
ATLAS_NOW = new Date('2026-10-07T03:00:00Z')   // Rabu 10.00 WIB (zona Asia/Jakarta: ASUMSI)
freezeAt(d): void                              // setSystemTime + restore afterEach (pola rate-limiter.test.ts:13)
// tests/support/atlas.ts
seedAtlas(f: Factory, o?: { now?: Date }): Promise<AtlasScenario>   // { users:{nico,rina,dodi,sri,admin}, projects:{atlas,sinar,…}, tasks:{fixSso,specApi,…} }
```

Aturan pakai: (1) id `text`: `${TAG}-${randomUUID().slice(0,8)}`, `TAG` per file (T4); (2) **jangan** menguji nomor literal `#12` (kolom `number` urut otomatis); rujuk kunci fixture (`tasks.fixSso`); (3) asersi daftar selalu dibatasi `TAG`/id pelacak karena DB test dipakai bersama dan bisa berisi sisa; (4) tabel singleton `app_setting` diubah hanya lewat `withSetting(patch, fn)` yang memulihkan nilai awal; (5) kode produksi yang bergantung tanggal menerima `now` (pola `ban.ts:21`), tanpa SQL `now()` pada logika hitung; (6) `beforeAll` membuat graf Atlas sekali (≈ 6 user, 6 proyek, ≈ 12 tugas) untuk test baca; test yang **mengubah** data membuat entitas sendiri di dalam test (`afterEach` membersihkan).
**Ditolak:** library factory pihak ketiga (dependency baru, aturan 10, terlalu berat untuk ±12 tabel); fixture SQL dump (rapuh terhadap migrasi, tak bisa digeser tanggal); `TRUNCATE`/`DELETE FROM` global (dilarang CLAUDE.md, merusak run paralel `bun dev`); membuka transaksi per test lalu rollback (pool `max: 5` dan kode produksi memakai `db` global, tidak bisa disuntik transaksi).

### 3.5 Seed demo/dev dan seed beban

- **Lokasi:** `server/seed/atlas.data.ts` (data murni, tanpa impor `db`, dipakai test dan seed), `server/seed/atlas.insert.ts` (insert), `scripts/seed-dev.ts` (`bun scripts/seed-dev.ts atlas | load | reset`; skrip npm `seed:atlas`, `seed:load`). Impor `db` dinamis setelah env diperiksa, supaya skrip gagal dengan pesan jelas bila DB belum siap.
- **Pengaman:** menolak bila `NODE_ENV=production` atau tanpa `SEED_ALLOW=1`; semua id berawalan `seed-` sehingga `reset` hanya menghapus baris berawalan itu. Kata sandi akun dev dibaca dari env `SEED_PASSWORD` atau diacak dan dicetak sekali (tidak di-hardcode, aturan 7/15). Login seed memakai email/password yang hanya hidup di non-production (`00-role-dan-area.md` §4).
- **`atlas`:** data bagian 2.3, tanggal **relatif ke hari ini** (offset -2/0/+1/…), jadi demo selalu terlihat "hari ini = Rabu"; enam proyek dari daftar proyek, event dan Inbox contoh.
- **`load`:** `--tasks=1000 --projects=20 --users=30` (bisa `--tasks=10000` untuk kurva pertumbuhan). Sebaran: 15% terlambat, 10% di Sampah, status tersebar, 3 pengguna menanggung ≥ 100 tugas (uji beban Tim), 200 tag, 5 anggota per proyek. Insert multi-baris 500 per potongan; satu transaksi per proyek.
- **Alternatif ditolak:** subperintah CLI `simple-pm seed` (ikut ke binary produksi, operator bisa menyeed DB nyata; ditunda sampai ada kebutuhan demo di binary dengan `--confirm`); memperluas `server/demo/seed.ts` (itu untuk demo anonim yang sudah diputuskan mati; tetap dipertahankan karena `tests/demo-foundation.test.ts` memakainya).
- **Uji kinerja** (`tests/perf/pm-load.test.ts`):
  1. **Selalu jalan, deterministik:** penghitung query (hook `logger` Drizzle aktif hanya `NODE_ENV==='test'`; perubahan kecil ±5 baris di `server/db/index.ts`, DITANDAI perubahan fondasi, pertanyaan 6.3). Asersi: jumlah query endpoint Beranda/daftar tugas/Sampah/Tim **sama** untuk n=50 dan n=500 tugas (anti N+1, aturan global 13) dan ≤ batas tetap.
  2. **EXPLAIN dengan `SET enable_seqscan=off`** untuk ±6 query utama; harus memakai index desain (di 1.000 baris PG wajar memilih seq scan, jadi tanpa trik ini tak informatif).
  3. **Waktu, opt-in** `PM_PERF=1 bun test tests/perf` (di luar `bun run test` default): median 5 kali setelah pemanasan.

| Operasi (1.000 tugas / 20 proyek / 30 user) | Batas USULAN lokal | Di CI |
|---|---|---|
| `GET /api/app/home` (Admin, terberat) | ≤ 300 ms | ×3 (`PM_PERF_FACTOR`) |
| `GET /api/app/tasks?limit=50` (Tugas saya dan Semua) | ≤ 200 ms | ×3 |
| `GET /api/app/projects?limit=20` (dengan progres + kondisi) | ≤ 250 ms | ×3 |
| `GET /api/app/trash`, `GET /api/app/team` | ≤ 300 ms | ×3 |
| hitungan lonceng Inbox (dipanggil tiap halaman) | ≤ 50 ms | ×3 |

Dasar: batas persepsi 0,1 s / 1,0 s / 10 s (Nielsen); 1,0 s adalah batas aliran pikir tidak terputus, jadi API diberi ≤ 0,3 s agar sisa ≥ 0,7 s untuk SSR dan render. **Angka adalah ASUMSI**; kalibrasi dulu (ukur 5×, set batas = 3× median).
- Pencarian judul `pg_trgm`: ukur di 10.000 tugas `ILIKE '%kata%'` dengan dan tanpa index trigram; `CREATE EXTENSION` hanya bila perlu (ada di runtime tertanam, T14).

### 3.6 Menjaga test cepat dan bebas bocor (`mock.module` vs `spyOn`)

**Keputusan:** test PM **hanya `spyOn`** (via `installAuthSpies`), spy dipasang di `beforeAll` dan dikembalikan di `afterAll`; **dilarang `mock.module`** di file baru. Alasan: `mock.module` global per proses, tidak ikut `mock.restore()` (dokumen Bun), 13 file sudah memakainya untuk `guard` dengan hanya `requireRole` (T6), sehingga file PM yang memakai `requireUser`/`resolveActor` bisa terpengaruh tergantung urutan. Bun menjalankan semua file dalam satu proses (ASUMSI, konsisten dengan komentar repo), jadi urutan file menentukan.
Langkah:
1. `tests/test-hygiene.test.ts` (E8): ratchet `mock.module` ≤ 13 + daftar putih nama file; larangan `db.delete(x)` tanpa `.where`; `Bun.sleep` > 100.
2. Bertahap (di luar jalur kritis MVP, ±0,25 hari/file): ubah 13 file `mock.module` → `spyOn` memakai `installAuthSpies`, sambil menurunkan ratchet.
3. Pagar cadangan: skrip `test:pm` = `bun test tests/pm tests/api/projects.test.ts …` agar suite PM bisa dijalankan sendirian (cepat saat pengembangan, dan menunjukkan apakah kegagalan berasal dari kebocoran file lain bila `bun run test` gagal tetapi `test:pm` hijau).
Kecepatan: (a) logika murni tanpa DB (≈ 52% kasus); (b) graf Atlas dibuat sekali di `beforeAll`; (c) satu `api` per file, tanpa `listen`; (d) `waitForAudit` bukan `sleep`; (e) uji kinerja opt-in; (f) `bun run test:db:reset` (drop+create DB `<db>_test`, aman karena hanya DB test) untuk membuang sisa kebocoran bila run sebelumnya crash. Target (usulan, belum diukur): file unit < 1 s, file API < 5 s, tambahan total suite PM < 90 s; **ukur baseline `bun run test` sekarang di M0** sebelum menetapkan.
**Ditolak:** `bun test --concurrent` (DB dan `app_setting` bersama); proses/DB terpisah per file (menggandakan waktu boot PG); transaksi rollback (3.4).

### 3.7 SMOKE_CHECKS tambahan (14 entri, semua anonim)

Pola entri: `/dev` anonim di `smoke-server.checks.ts:43-48`.

| # | Nama (id) | Path | Harapan |
|---|---|---|---|
| 1-9 | `/app`, `/app/projects`, `/app/tasks`, `/app/events`, `/app/team`, `/app/inbox`, `/app/trash`, `/app/settings`, `/dashboard` anonim → login | idem | 302, `location` memuat `/login` |
| 10 | `/dashboard/users` anonim → login | `/dashboard/users` (path ASUMSI; ikuti `app/routes.ts` nanti) | 302 `/login` |
| 11-14 | API anonim ditolak: `/api/app/projects`, `/api/app/tasks`, `/api/app/inbox`, `/api/app/trash` | idem | 401, `application/json`, `"code":"UNAUTHORIZED"`, header `x-request-id` |

Alasan memuat rute halaman di smoke: bundel SSR (`build/server/index.js`) adalah salinan kedua modul server (CLAUDE.md › Build); loader yang hilang atau guard yang rusak di bundel produksi hanya terlihat di smoke. Total hasil 23 → 37; perbarui angka di CLAUDE.md dan README bagian smoke. Halaman tahan (`pending`/`rejected`) ditambahkan **setelah** bentuk akhirnya diputuskan (`00-role-dan-area.md` §8.1). Scope hilang → 403 hanya terlihat dengan key, jadi dicakup `app-auth-sweep` dan `scopes.test.ts`, bukan smoke.
**Ditolak:** smoke terautentikasi (butuh sesi/cookie bertanda tangan atau key yang dibuat lewat Better Auth di server produksi; biaya tinggi, risiko salah konfigurasi); diganti integrasi `api.handle` dengan spy (E7) + satu test Better Auth asli (G2). **Rekomendasi tambahan:** job `smoke` (`bun run smoke:prod`) terpisah di `ci.yml`, menunjuk `DATABASE_URL` ke Postgres service (butuh izin mengubah workflow, pertanyaan 6.4).

### 3.8 Checklist QA manual (USULAN; tidak dijalankan, browser otomatis hanya bila user mengizinkan)

Persiapan: `bun scripts/seed-dev.ts atlas`; akun Nico (PM), Dodi (Member), Sri (Pemantau), Admin; perangkat: tablet 768×1024 dan 1024×768 (portrait/landscape), desktop 1280×800 dan 1440; zoom browser 200%; satu penguji awam/lansia sungguhan per putaran (idealnya 3). Penguji diberi **tugas**, bukan petunjuk klik; catat waktu dan salah ketuk.

- [ ] **Skenario awam (lulus bila selesai tanpa bantuan < 2 menit):** (1) masuk dengan Google, (2) temukan tugas yang jatuh tempo hari ini, (3) tandai satu tugas selesai, (4) minta tugas diperiksa, (5) tambah komentar, (6) tambah acara "Rapat" dua tahap, (7) buka Inbox dan tanggapi kartu, (8) hapus tugas lalu **Urungkan**, (9) pulihkan dari Sampah, (10) ganti ukuran teks ke Sangat besar.
- [ ] **Bahasa:** semua teks Indonesia polos, tanpa istilah teknis (`issue`, `assignee`, `reviewer`); label tombol imperatif dan spesifik; pesan galat bisa ditindaklanjuti.
- [ ] **Ukuran teks (Normal/Besar/Sangat besar):** tidak ada teks terpotong/menimpa, tombol tidak keluar layar, tabel tetap bisa digulir; ulangi pada zoom 200% (WCAG 1.4.4); kontras teks ≥ 4,5:1 (WCAG 1.4.3).
- [ ] **Target sentuh tablet:** tombol utama ≥ 44×44 px (CLAUDE.md; WCAG 2.5.5 AAA), minimal 24 px (2.5.8 AA) untuk kontrol kecil, jarak antar tombol cukup; tidak ada aksi yang hanya muncul saat hover.
- [ ] **Label status:** Terlambat/Tertahan/Mandek/Menunggu diperiksa selalu **ikon + teks**, tidak hanya warna (periksa dengan filter abu-abu).
- [ ] **Aksi berisiko:** keluar, hapus, ubah role, nonaktifkan, hapus permanen selalu minta konfirmasi dengan dampak nyata; tombol bergerak `loading`; sukses/gagal terlihat; daftar kosong informatif; tombol nonaktif menjelaskan alasan.
- [ ] **Tablet:** sidebar bisa dilipat, header mobile + burger tidak menimpa konten, tabel ≥ 4 kolom tampil kartu atau bisa digulir, tidak ada gulir horizontal halaman, rotasi layar tidak kehilangan isian form.
- [ ] **Desktop:** lebar konten 1200-1440 px terbaca, tidak melar di layar lebar; tab/Enter/Esc bekerja di modal; fokus terlihat.
- [ ] **Per peran:** Member tidak melihat "+ Proyek baru"; Pemantau hanya baca + komentar; PM bukan-pengelola hanya lihat; Admin melihat tautan Dashboard; super-admin melihat Dev Console; akses URL langsung ke area lain terpental ke home.
- [ ] **Akun:** akun `pending` melihat halaman tunggu, `rejected` melihat alasan, suspended ke `/banned`; undangan awal langsung masuk.
- [ ] **Kinerja terasa:** Beranda dan Tugas dengan seed `load` tidak membeku saat gulir/filter; tidak ada layar kosong > 1 dtk tanpa indikator.
- [ ] **Keyboard + pembaca layar dasar:** urutan Tab logis, tombol ikon punya label, judul halaman unik (`meta()`).

Bila user mengizinkan: Playwright/ego-browser hanya untuk skenario 2, 3, 8, 9 dan tangkapan layar tiga ukuran teks (tidak menggantikan penguji manusia).

### 3.9 Definisi selesai (DoD)

**Umum (semua modul):** (1) test dari 3.2 untuk modul itu hijau; `bun run test` hijau tanpa filter; (2) `bun run typecheck` nol error dan `bun run lint` bersih (`ci.yml:43-44`); (3) migrasi: file migrasi dibuat, dijalankan ke DB **dev dan test**, uji migrasi hijau, ada guard idempotent; (4) rute baru dipetakan di `scopes.ts` + assertion `scopes.test.ts`; (5) bila menyentuh `server/`, `app/root.tsx`, `entry.server.tsx`, logger atau skrip build: `bun run smoke:prod` **dan** `bun run smoke:binary` hijau, entri `SMOKE_CHECKS` ditambah; (6) daftar paginasi, tanpa N+1 (uji penghitung query), index desain ada (E2); (7) UX CLAUDE.md: konfirmasi, loading, umpan balik, empty state, `meta()` (`app-contracts` hijau), baseline mobile; (8) aksi istimewa memanggil `audit()` dan label ada di `ACTION_META`; (9) dokumen: README (hanya bagian kontrak yang berubah; `readme-endpoint.test.ts` hijau), `CHANGELOG [Unreleased]` bahasa Indonesia, docstring satu baris untuk fungsi publik; (10) tanpa `TODO` tanpa konteks, kode mati, `console.log`, PII/credential di log; file ≤ batas ukuran; (11) QA manual subset modul (3.8) dicentang reviewer.

| Modul | Tambahan DoD khusus (bukti) |
|---|---|
| Akun/Fase 0 | semua 18 file lama berstatus hijau setelah rename; uji migrasi E3 hijau; test Better Auth asli untuk status akun; halaman tahan terkunci di `app-routes` |
| Proyek | golden Atlas (60% / Perlu perhatian / 17%) hijau; pengelola terakhir 409; ambang 20% dari konstanta bernama |
| Tugas | matriks 18 baris × aktor hijau; kasus #12 (pemeriksa Admin); siklus dependensi ditolak; UNIQUE parsial review terbuka |
| Beranda | angka API = hitungan murni pada Atlas; `pm-load` penghitung query hijau |
| Events | status dihitung + ulang; hapus berulang dua pilihan; AI tidak ada (ditunda) |
| Inbox | angka lonceng = jumlah kartu "Perlu Anda tanggapi"; kartu hilang otomatis |
| Tim | visibilitas D10 hijau; hanya baca (tidak ada route tulis) |
| Sampah | 30 hari + sisa hari; pulihkan bersama proyek; hapus permanen hanya Admin; `deleted_by`/`deleted_with_project_id` terisi |
| Pengaturan | `text_size` berlaku di SSR (UI test); saklar tim hanya Admin |

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Kebocoran `mock.module` (13 file) membuat test PM gagal tergantung urutan | Sedang | Tinggi (CI merah acak) | Hanya `spyOn`; ratchet E8; migrasi bertahap 13 file; `test:pm` terpisah untuk diagnosis |
| Rename `user`→`member` mematahkan 18 file test dan 24 titik `server/` sekaligus | Tinggi | Sedang | Satu commit mekanis Fase 0 (`ROLES.MEMBER`), typecheck dulu (`Record<Role,…>` memaksa), baru perilaku |
| Asumsi A1-A10 belum dikonfirmasi; test mengunci perilaku yang kelak berubah | Tinggi | Sedang | Tiap asumsi = konstanta/flag bernama; kasus ditandai `// A2`; baris matriks tidak digabung sehingga mudah dibalik |
| Test bergantung tanggal/zona (Minggu, 00:00 WIB) | Sedang | Sedang | `now` disuntik, `freezeAt`, kasus 23:59/00:00 eksplisit; larang SQL `now()` pada logika hitung |
| Stub sesi menyimpang dari Better Auth nyata (kolom status akun) | Sedang | Tinggi (lolos test, gagal produksi) | Test integrasi Better Auth asli + tipe stub diturunkan dari `auth.$Infer`; typecheck |
| Uji kinerja waktu flaky di CI | Tinggi | Rendah | Query-count deterministik selalu jalan; waktu opt-in, median 5×, faktor CI |
| `CREATE DATABASE` untuk uji migrasi tidak diizinkan di lingkungan tertentu | Rendah | Sedang | Gagal keras dengan pesan jelas (bukan skip diam-diam); CI memakai superuser |
| Suite membengkak (+≈ 750) memperlambat loop pengembangan | Sedang | Sedang | 52% unit murni; `test:pm`; target waktu diukur di M0 |
| Sisa data uji menumpuk di DB test setelah crash | Sedang | Rendah | `TAG` unik + asersi dibatasi TAG; `test:db:reset` |
| Regresi UI lolos karena tak ada test interaksi dan browser otomatis dilarang | Sedang | Sedang | UI SSR (E6), QA manual 3.8 tiap rilis, izin Playwright per rilis (6.7) |
| Data Atlas tidak konsisten (70% vs 17%) membuat demo dan test saling bertentangan | Tinggi | Rendah | Golden dari rumus; pemilik desain memutuskan (6.5) |

## 5. Estimasi usaha (hari-orang pekerja AI + 1 reviewer manusia)

| Paket | Ukuran | AI | Reviewer |
|---|---|---|---|
| M0: `tests/support/*`, `scratch-db`, hygiene test, `installAuthSpies`, `freezeAt`, ukur baseline suite | M | 2-3 | 0,5 |
| Rename role di 18 file test + A1-A7 | M | 2-3 | 0,5 |
| Seed Atlas + `seed-dev load` + `pm-load` (penghitung query, EXPLAIN, waktu) | M | 2-3 | 0,5 |
| Unit matriks dan hitung (A1, A4, A7, B1-B2, C1-C5, D3-D6 bagian U) ≈ 391 kasus | M | 4-6 | 1 |
| API integration (A2-A3, A5-A6, B3-B5, C6-C8, D1-D7 bagian A) ≈ 259 kasus | L | 8-12 | 1,5 |
| DB constraint, index, migrasi (E1-E3) | M | 2-3 | 0,5 |
| UI SSR, kontrak rute, nav, sapuan auth, smoke 14 entri + job CI (E4-E7) | S | 1,5-2,5 | 0,5 |
| Migrasi 13 file `mock.module` → `spyOn` (opsional, bertahap) | M | 3-4 | 0,5 |
| Checklist QA: dokumen final + satu putaran dengan penguji nyata | S | 0,5-1 | 1-1,5 |
| **Total** | **L** | **≈ 25-38** (tanpa paket opsional ≈ 22-34) | **≈ 6-7** |

Dasar: ASUMSI ≈ 25-40 kasus/hari AI termasuk perbaikan, bukan hasil ukur. Pekerjaan dikerjakan **bersama** fitur (aturan global 3), bukan fase terpisah; M0 harus selesai sebelum modul Proyek dimulai.

## 6. Pertanyaan terbuka untuk user

1. Boleh menambah dev-dependency `happy-dom` + `@testing-library/react` untuk test interaksi UI (klik, modal)? Default laporan ini: **tidak**, pakai render SSR + QA manual.
2. Zona waktu "Hari ini/Besok/Minggu ini": tetap `Asia/Jakarta` untuk semua, atau per pengguna? (memengaruhi rumus dan test).
3. Setuju perubahan kecil fondasi: `logger` Drizzle test-only di `server/db/index.ts` untuk penghitung query?
4. Boleh mengubah `.github/workflows/ci.yml` (job `smoke`) dan menambah skrip `test:pm`, `test:db:reset`, `seed:*` di `package.json`?
5. Progres Atlas di `02-proyek.md:163` (70%) bertentangan dengan tabel tugas `03-tugas.md:205-215` (17%): data demo mana yang benar?
6. Akun **anonim** lama saat migrasi: di-backfill `approved`, dihapus, atau dibiarkan (demo anonim dimatikan)? Menentukan asersi E3.
7. Izin menjalankan Playwright/ego-browser per rilis untuk skenario QA yang dipilih (3.8)?
8. Batas waktu respons usulan (200-300 ms pada 1.000 tugas) dan skala target (1.000 atau 10.000 tugas per tim) disetujui?
9. Siapa penguji awam/lansia untuk QA manual (jumlah orang, sebelum rilis berapa)?

## 7. Sumber

Kode dan dokumen yang dibaca (semua di repo `makuro-template`, cabang `feature/project-management`):
- `bunfig.toml`; `tests/preload.ts`; `server/local-pg/test-db.ts`, `boot.ts`, `paths.ts`, `runtime.ts:20`; `server/local-s3/test-storage.ts`; `server/db/index.ts`, `schema.app.ts`, `schema.auth.ts:22`; `package.json:10-29`; `.github/workflows/ci.yml`, `release.yml`
- `tests/api/posts.test.ts`, `me-api-keys.test.ts`, `app.test.ts`, `api-keys-api.test.ts`, `posts-query.test.ts`; `tests/app-routes.test.ts`, `app-contracts.test.ts`, `guard.test.ts`, `permissions.test.ts`, `roles.test.ts`, `smoke-server.test.ts`, `api-keys/scopes.test.ts`, `db/test-db-isolation.test.ts`, `middleware/rate-limiter.test.ts`
- `scripts/smoke-server.checks.ts`, `scripts/smoke-server.ts`; `server/guard.ts`, `permissions.ts`, `roles.ts`, `ban.ts:21`, `auth.ts:38`, `api/app.ts`, `api/index.ts:44`, `api-keys/scopes.ts:52,100-122`, `demo/seed.ts`, `file-health/file-health.rules.ts:125-143`
- Desain: `tahapan-proyek/03-desain/erd/{gabungan,project,task}.md`, `diskusi/00..09-*.md` (terutama `00-role-dan-area.md` §3-§6, `02-proyek.md:160-170,258`, `03-tugas.md:205-221`, `08-sampah.md` §1-§2); `tahapan-proyek/05-implementasi/riset/_BRIEF.md`; `CLAUDE.md` (Test, Build & Deploy, UX, Mobile)
- Cek filesystem (baca saja): `~/.cache/makuro-template/pg/18.4.0/darwin-arm64/native/share/postgresql/extension/pg_trgm.control`
- Bun, "Mocks": https://bun.sh/docs/test/mocks (`mock.restore()` tidak mereset `mock.module()`)
- Nielsen, "Response Times: The 3 Important Limits": https://www.nngroup.com/articles/response-times-3-important-limits/ (0,1 / 1,0 / 10 detik)
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/ (SC 1.4.3 kontras 4,5:1; 1.4.4 ubah ukuran teks 200%; 2.5.5 target 44 px AAA; 2.5.8 target 24 px AA)
