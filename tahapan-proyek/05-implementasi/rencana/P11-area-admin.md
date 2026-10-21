# P11 — Rencana eksekusi: Area Admin (`/dashboard`)

> 21 Okt 2026 · tahap 2 · **RENCANA, belum ada kode.** Cabang rencana `plan/p11-area-admin`. Mengikat: `../KEPUTUSAN-MVP-INTI.md` > `../JADWAL-S3-S8.md` > dokumen ini. Lahir dari diskusi user 21 Okt 2026 (pertanyaan: "menu apa saja di area Admin, dan kenapa"). Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di worktree `feature/project-management` pada tanggal itu. Tanda **ASUMSI** = belum diverifikasi.

## 1. Ringkasan

- Area `/dashboard` sekarang **2 menu** (Beranda satu kartu + Pengguna). Rencana ini membawanya ke **5 menu** — Beranda, Pengguna, Proyek, Pengaturan, Aktivitas — dan memindahkan kepemilikan setelan organisasi dari `/dev` ke `/dashboard`.
- **Garis batas yang disepakati user (21 Okt 2026):** area super-admin = **teknis/developer** (infrastruktur, dikerjakan saat ada yang rusak); area Admin = **kebijakan kantor**. Konsekuensinya: apa pun yang mengubah tampilan/perilaku untuk semua role adalah milik Admin, bukan super-admin. Ini menutup pertanyaan "pindah vs duplikasi" — jawabannya **pindah**.
- **Pengalih area jadi tiga entri setara**: `App · Admin · Super-admin`. Tautan dalam (`Antrean persetujuan`) dan `Pengaturan akun` keluar dari grup itu.
- **19 tugas, AD-01..AD-19**, total ≈ **33 hari-orang AI** + reviewer ≈ 4, dibagi tiga tahap yang bisa dirilis sendiri-sendiri.
- **Satu migrasi** (usulan `0021`): kolom settings untuk Pengumuman dan Kebijakan kerja. Butuh baton, antre setelah `0017`-`0020` (P5/P6/P10).
- **Lajur ini hampir tidak menyentuh kode `/app`**, jadi bisa jalan paralel dengan S6/S7 alih-alih menunggu giliran. Lihat §10 Q1.
- **Semua pertanyaan §10 (Q1-Q8) sudah dijawab user 21 Okt 2026.** Rencana ini siap dieksekusi begitu baton migrasi dan kuota worker memungkinkan.

## 2. Keadaan sekarang (dibaca di kode)

| Hal | Fakta | Path:baris |
|---|---|---|
| Menu Admin | `NAV` hanya 2: Dashboard, Pengguna | `app/routes/admin/layout.tsx:18-21` |
| Pengalih area | `APP` = App + Pengaturan akun; `SECONDARY` menambah Dev Console untuk super-admin | `app/routes/admin/layout.tsx:21-28` |
| Guard area | `requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN])` — **super-admin sudah lolos**, tidak ada hak yang hilang bila setelan dipindah ke sini | `app/routes/admin/layout.tsx:33` |
| Label grup | Judul sidebar grup kedua di-hardcode `'Area lain'` | `app/components/AppFrame.tsx:228` |
| Pengalih dari `/dev` | `OTHER` berisi App, Dashboard, **Antrean persetujuan** (tautan dalam), Pengaturan akun | `app/routes/super/layout.tsx:151-160` |
| Beranda admin | Satu kartu; loader `adminUserStats()` → hanya `{ pending }` | `app/routes/admin/dashboard.tsx:17-21` |
| Pengguna | 3 tab: `pending`, `all`, `invitations` | `app/routes/admin/users.tsx:99-112` |
| API admin | `GET /users`, `GET /users/stats`, `POST /users/:id/role`, `DELETE` (super-admin saja di :71) | `server/api/admin.ts:28-71` |
| **Setelan: guard** | `PUT /api/settings/*` dan `/api/settings-ops/*` semuanya `requireRole(request, ROLES.SUPER_ADMIN)` | `server/api/settings.ts:33,41,61,94`; `server/api/settings-ops.ts:23,47,62,103` |
| Branding | `appName`, `appTagline`, `supportUrl`; `BRANDING_DEFAULTS` = Simple PM | `server/settings-branding.ts:11-15,44` |
| Feature flags | JSON di baris settings; `FLAG_KEY_RE`, `MAX_FLAGS=100`, editor key/value bebas | `server/settings-features.ts:6-8,38` |
| Cuti | `LeaveSettings = { requiresApproval }`, default `true` | `server/settings-leave.ts:7,10` |
| Banner global | **Pola yang bisa ditiru Pengumuman**: `maintenance.enabled` ikut `frameInfo()` → dibaca tiap layout; `isMaintenanceExempt`/`shouldBlock` memilih path & role | `server/app-info.ts:18-21`; `server/settings-maintenance.ts:71,76` |
| Audit | 30+ aksi sudah ada, termasuk `SETTINGS_BRANDING_UPDATE`, `SETTINGS_FEATURES_UPDATE`, `USER_ROLE_SET`, `USER_APPROVE` — **cukup untuk menu Aktivitas tanpa aksi baru**, kecuali Pengumuman & Ekspor | `server/audit.ts:11-41` |
| Rute antrean | `APPROVAL_QUEUE_ROUTE = '/dashboard/users'` dipakai bersama badge `/dev` | `server/sidebar-badges.ts:36` |
| Scope kunci API | `settings:read`/`settings:write` sudah ada dan terpetakan | `server/api-keys/scopes.ts:74,80,168-176` |
| Daftar proyek | `listProjects(...)` sudah ada — **titik sambung menu Proyek**, tinggal cakupan Admin | `server/project/project-list.query.ts:108` |
| Tes penjaga | `tests/admin-routes.test.ts` memaksa **tiap** berkas `routes/admin/**` yang merender punya `meta()` **dan** guard ber-`ROLES.ADMIN`. Halaman baru otomatis dijaga — tidak perlu tes rute baru | `tests/admin-routes.test.ts:14-37` |
| **ASUMSI** | `CONSOLE_PAGES`/`CONSOLE_PAGE_COUNT` hanya menghitung halaman `/dev`, bukan `/dashboard` — belum dicek. Bila ternyata ikut, tiap halaman Admin baru = satu tempat tambahan | `app/components/landing/landing.content.ts`; `server/landing-stats.ts` |

## 3. Lingkup & non-lingkup

| # | Butir | Masuk? | Alasan |
|---|---|---|---|
| ①  | Beranda admin: antrean, anggota, proyek per status, tugas telat, agenda, perubahan peran | **Ya** | Satu kartu di layar kosong mengajari Admin bahwa halaman ini tidak berguna |
| ②  | Pengguna: + nonaktifkan, cabut sesi, riwayat per-orang, pra-cek Pengelola tunggal | **Ya** | Kasus resign sekarang tidak punya pengaman apa pun |
| ③  | Proyek lintas organisasi + ganti Pengelola | **Ya** | Satu-satunya menu yang membuat area ini terasa alat PM, bukan panel user generik |
| ④  | Pengaturan 8 tab | **Ya** | Satu-satunya kelompok yang mengubah tampilan semua role |
| ⑤  | Aktivitas (audit tersaring, bahasa manusia) | **Ya** | Admin butuh jawaban "kok proyek ini hilang", bukan `actor_id` |
| ⑥  | **Laporan** (beban kerja, tugas telat, proyek diam) | **Tidak** | Percuma saat isinya masih segelintir proyek. Rencana terpisah setelah data menumpuk (§10 Q7) |
| ⑦  | **Hapus permanen** | **Kaitan saja** | Backend-nya sudah milik P8 Z-04. Area Admin hanya menautkan (§9) |
| ⑧  | Groups/Tim sebagai entitas, impor Jira/Asana, billing, custom field & workflow, i18n, avatar | **Tidak** | Riset 2026 menunjukkan ini ada di OpenProject/Asana; dibuang sengaja — persis yang membuat OpenProject berat |
| ⑨  | Rate limit, retensi, maintenance, runtime, DB schema, server logs, file health, API keys, visits, login logs, SMTP, SSO, impersonasi | **Tidak** | Dikerjakan saat ada yang rusak, oleh orang yang bisa memperbaikinya = area super-admin |

## 4. Layar & perilaku

**Pengalih area** (semua area, AD-01)

```
AREA LAIN
  App              → /app
  Admin            → /dashboard       (tampil untuk admin + super-admin)
  Super-admin      → /dev             (tampil untuk super-admin saja)
```

`Pengaturan akun` turun ke menu avatar di kaki sidebar — itu milik pribadi tiap orang, bukan area. `Antrean persetujuan` dicabut dari grup ini; badge-nya tetap menempel di menu Pengguna.

**Menu Admin**

| Menu | Pertanyaan yang dijawab | Isi |
|---|---|---|
| Beranda | *"Ada yang perlu aku tangani hari ini?"* | 6 widget gagal-lunak, pola `getHome` |
| Pengguna | *"Siapa yang boleh masuk, apa haknya?"* | 3 tab lama + nonaktif, cabut sesi, riwayat, pra-cek |
| Proyek | *"Proyek apa jalan, siapa pengelolanya?"* | Tabel desktop + kartu mobile, aksi ganti Pengelola (T2) |
| Pengaturan | *"Aturan main kantor ini apa?"* | 8 tab, lihat bawah |
| Aktivitas | *"Siapa yang melakukan ini?"* | Audit disaring ke aksi yang Admin pahami |

**Tab Pengaturan**

| Tab | Admin | Super-admin | Catatan |
|---|---|---|---|
| Identitas | ubah | ubah | nama app, tagline, support URL |
| Pengumuman | ubah | ubah | banner semua area, bisa ditutup |
| Akses masuk | ubah | ubah | form daftar, wajib persetujuan, undangan |
| Kebijakan kerja | ubah | ubah | hari kerja, hari libur, pengingat acara, cuti wajib disetujui |
| Pemberitahuan | ubah | ubah | **menunggu P9 G-02** |
| Fitur | ubah | ubah | daftar terkurasi, bukan editor key/value |
| **Peran & izin** | **baca saja** | ubah | kalau Admin boleh mengubah, dia bisa menaikkan kewenangannya sendiri — bentrok `canSetRole` (`server/permissions.ts`) |
| Ekspor data | ubah | ubah | CSV anggota/proyek/tugas, diaudit |

## 5. Data & API

**Migrasi `0021`** (butuh baton, antre setelah `0017`-`0020`)

| Kolom | Tabel | Untuk |
|---|---|---|
| `announcement` (jsonb) | `settings` | `{ text, level, active, dismissibleUntil }` — ikut pola `featureFlags` yang sudah jsonb |
| `working_days` (jsonb) | `settings` | `{ days[], holidays[], defaultEventReminder }` |

Keduanya nullable, tanpa backfill, guard idempoten. Tidak ada tabel baru.

**Endpoint**

| Metode | Path | Guard sekarang | Guard sesudah |
|---|---|---|---|
| `PUT` | `/api/settings/branding` | super-admin | **admin + super-admin** |
| `PUT` | `/api/settings/auth` | super-admin | **admin + super-admin** (bagian kebijakan saja) |
| `PUT` | `/api/settings/features` | super-admin | **admin + super-admin** |
| `PUT` | `/api/settings/announcement` | – | admin + super-admin *(baru)* |
| `PUT` | `/api/settings/working-days` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/overview` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/projects` | – | admin + super-admin *(baru)* |
| `POST` | `/api/admin/projects/:id/manager` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/export/:kind` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/permissions-matrix` | – | admin + super-admin *(baru, baca)* |

Rate limit, retensi, maintenance, demo tetap `requireRole(SUPER_ADMIN)` — tidak disentuh.

**Audit** — tambah 3 aksi: `SETTINGS_ANNOUNCEMENT_UPDATE`, `SETTINGS_WORKING_DAYS_UPDATE`, `DATA_EXPORT`; plus `PROJECT_MANAGER_SET`. Semua wajib masuk `ACTION_META` (`app/lib/audit-api.ts`).

**Scope kunci API** — rute `/api/admin/*` baru dipetakan di `server/api-keys/scopes.ts` + assertion di `tests/api-keys/scopes.test.ts`. `POST /projects/:id/manager` dan `GET /export/:kind` masuk daftar tolak (eskalasi & ekspor massal).

## 6. DAFTAR TUGAS

Ukuran: `S (1)` · `M (1,5)` · `L (2)` · `L (2,5)` hari-orang AI.

### Tahap 1 — Pengaturan (≈16,5) · menjawab langsung "tampilan global semua role"

### AD-01 · Pengalih area tiga entri + Pengaturan akun ke menu avatar · Dep: – · S (1)
Ubah `APP`/`SECONDARY` (`admin/layout.tsx:21-28`), `OTHER` (`super/layout.tsx:151-160`), dan padanannya di layout `/app`. Label `'Area lain'` di `AppFrame.tsx:228` tetap.

### AD-02 · Kerangka `/dashboard/settings` · Dep: – · M (1,5) · PARALEL dgn AD-01
Rute + tab shell + `meta()` + guard. `tests/admin-routes.test.ts` otomatis menjaganya.

### AD-03 · Longgarkan guard setelan organisasi ke Admin · Dep: AD-02 · M (1,5) · **persetujuan satu per satu**
`requireRole(SUPER_ADMIN)` → `requireAnyRole([ADMIN, SUPER_ADMIN])` untuk branding/auth/features saja. Tes negatif: member & PM tetap 403; rate-limit/retensi/maintenance tetap super-admin.

### AD-04 · Tab Identitas · Dep: AD-03 · S (1)
Pakai ulang `BrandingCard.tsx`.

### AD-05 · Pengumuman: migrasi 0021 + API + banner semua area · Dep: AD-02 · L (2,5) · **baton migrasi**
Banner ikut `frameInfo()` seperti maintenance. Menyentuh `AppFrame` → wajib `smoke:prod` + `smoke:binary`.

### AD-06 · Tab Akses masuk · Dep: AD-03 · M (1,5) · PARALEL dgn AD-04
Pakai ulang `AuthSettingsCard.tsx`, buang bagian teknis.

### AD-07 · Tab Kebijakan kerja · Dep: AD-05 (baton) · L (2) · lihat Q5
**Fase 1 hanya menyimpan + menampilkan.** Tidak mengubah perhitungan tenggat yang sudah jalan.

### AD-08 · Tab Fitur terkurasi · Dep: AD-03 · M (1,5) · PARALEL
Daftar flag yang dikenal + deskripsi Indonesia. Editor key/value bebas tetap di `/dev`.

### AD-09 · Tab Peran & izin · Dep: AD-02 · L (2) · PARALEL
Matriks role × kemampuan dari `server/permissions.ts` (sumber tunggal, jangan disalin). Admin baca saja.

### AD-10 · Tab Ekspor data · Dep: AD-02 · L (2) · PARALEL
CSV anggota/proyek/tugas, streaming + paginasi (jangan muat seluruh tabel), diaudit, rate-limited.

### Tahap 2 — Proyek & Beranda (≈10)

### AD-11 · API daftar proyek lintas organisasi · Dep: – · M (1,5)
Perluas `listProjects` dengan cakupan Admin. Paginasi wajib; hindari N+1 untuk kolom Pengelola.

### AD-12 · Halaman Proyek · Dep: AD-11 · L (2,5)
Tabel desktop + kartu mobile (≥4 kolom → wajib kartu), keadaan kosong, drawer detail.

### AD-13 · Ganti Pengelola · Dep: AD-11 · M (1,5)
Dialog T2 dengan dampak nyata. Audit `PROJECT_MANAGER_SET`. Kunci API ditolak.

### AD-14 · `GET /api/admin/overview` · Dep: – · L (2) · PARALEL dgn AD-11
Satu panggilan untuk seluruh layar, tiap bagian `Widget { ok }` gagal-lunak — pola `server/home/*`.

### AD-15 · Beranda admin · Dep: AD-14 · L (2,5)
6 widget + "Coba lagi" per bagian. Menggantikan kartu tunggal.

### Tahap 3 — Pengguna, Aktivitas, gerbang (≈6,5)

### AD-16 · Pengguna: nonaktifkan, cabut sesi, riwayat per-orang · Dep: – · L (2) · PARALEL
Cabut sesi pakai ulang query `/dev/sessions`. `canActOnTarget` tetap berlaku: Admin tidak bisa menyentuh admin lain.

### AD-17 · Pra-cek Pengelola tunggal · Dep: AD-11 · M (1,5)
Sebelum mengeluarkan/menolak akun: "orang ini Pengelola tunggal di N proyek — alihkan dulu". Menutup `HUTANG` H-D4/M08.

### AD-18 · Halaman Aktivitas · Dep: – · L (2) · PARALEL
Saring `AUDIT_ACTIONS` ke yang Admin pahami. Label Indonesia dari `ACTION_META`. Email dimask.

### AD-19 · Gerbang: uji lintas, dokumen, demo · Dep: semua · S (1) · titik sinkron
Sunting `CLAUDE.md` root (§"Jangan taruh fitur produk di /dev atau /dashboard" — definisi `/dashboard` berubah), README bila kontrak publik berubah, ADR baru, `HUTANG.md`, `JADWAL-S3-S8.md` §1, `PROGRES-S3-S8.md`.

## 7. Gerbang & kriteria demo

| Gerbang | Isi | Lulus bila |
|---|---|---|
| **SP-AD1** | AD-01..AD-10 | Admin bisa mengubah nama app, memasang pengumuman, dan menutup pendaftaran tanpa bantuan super-admin. Member/PM tetap 403 di semua endpoint setelan. Setelan teknis tetap super-admin |
| **SP-AD2** | AD-11..AD-15 | Admin bisa menjawab "proyek apa jalan, siapa pengelolanya" dan mengganti Pengelola, tanpa membuka `/app` |
| **SP-AD3** | AD-16..AD-19 | Admin bisa menonaktifkan orang yang resign dengan peringatan Pengelola tunggal, dan menelusuri siapa menghapus apa |

Definisi selesai per tugas mengikuti `README.md` §3 tanpa pengecualian. Tugas yang menyentuh `AppFrame`, `root.tsx`, atau `server/` → `smoke:prod` **dan** `smoke:binary`.

## 8. Risiko & mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **Baton migrasi** `0021` bertabrakan dengan `0017`-`0020` (P5/P6/P10) | AD-05 pemegang baton tunggal; jangan luncurkan bersamaan dengan tugas bermigrasi lain |
| R2 | **AD-03 melonggarkan guard** — salah tulis = eskalasi hak | Persetujuan user satu per satu, tes negatif member/PM/admin wajib, diff ditinjau manual |
| R3 | Pengumuman menyentuh `AppFrame` → semua area ikut terpengaruh | Smoke prod + binary; banner gagal-lunak (gagal baca = tidak tampil, bukan layar putih) |
| R4 | Kebijakan kerja diam-diam mengubah perhitungan tenggat S1/S2 | Fase 1 simpan + tampilkan saja (Q5). Perubahan perhitungan = rencana terpisah |
| R5 | Ekspor data memuat seluruh tabel ke memori | Streaming + paginasi wajib; rate limit; diaudit |
| R6 | Daftar proyek N+1 saat mengambil Pengelola | Join/batch, bukan loop; paginasi wajib |
| R7 | Super-admin bingung setelan "hilang" dari `/dev` | Baris penunjuk di `/dev/settings` + entri Admin di pengalih area (AD-01) |
| R8 | **ASUMSI** `CONSOLE_PAGE_COUNT` ikut menghitung halaman `/dashboard` | Dicek di AD-02; bila ya, tiap halaman baru = satu tempat tambahan + tes sinkron |

## 9. Kontradiksi baru & dampak ke dokumen lain

**Kontradiksi**

1. ~~**Hapus permanen punya dua pemilik.**~~ **Ditutup 21 Okt 2026 (user, Q2 = A):** tetap milik P8; area Admin hanya menautkan ke `/app/trash`, tanpa layar Sampah sendiri. Sampah tunggal di `/app` terkumpul per jenis (proyek ada; tugas di P8 Z-02/Z-03; event di S7), member memulihkan sebatas `deletedByOrManaged`, admin/super-admin melihat `all` dan memegang tombol hapus permanen, purge otomatis 30 hari di P8 Z-05. Semua itu sudah terpasang di `server/access/trash.policy.ts:73-75,114-117` — P11 tidak menyentuhnya.
2. **Tab Pemberitahuan** bertindih dengan P9 G-02 (saklar Pemberitahuan). Usul: P9 pemilik, P11 hanya menyediakan tempatnya.
3. **Pengingat acara bawaan** bertindih dengan P7 M09 (pengaturan tim). Usul: pindah ke tab Kebijakan kerja di sini, M09 dicoret.
4. **`CLAUDE.md` root** menulis `/dashboard` khusus "manajemen akun dan tim". Definisi itu berubah dan wajib disunting di AD-19.

**Dokumen yang harus disunting**

`CLAUDE.md` (root) · `README.md` (bila kontrak publik berubah) · `docs/decisions/` (ADR baru: pemindahan kepemilikan setelan + pengalih area tiga entri) · `HUTANG.md` (H-B14 ditutup AD-09/AD-16; H-D4/M08 ditutup AD-17; H-D4/M09 dipindah) · `JADWAL-S3-S8.md` §1 · `PROGRES-S3-S8.md` · `server/api-keys/scopes.ts` + `tests/api-keys/scopes.test.ts`.

## 10. Pertanyaan untuk user — **semua dijawab 21 Okt 2026**

| # | Pertanyaan | Jawaban user |
|---|---|---|
| Q1 | Irisan sendiri (S9) atau **lajur paralel** dengan S6/S7? | **Paralel.** Lajur admin dan lajur produk jalan bersamaan: tidak ada berkas yang bertabrakan (`routes/admin/**` + `api/admin*` + `settings*` vs `routes/app/**` + `task*`/`event*`). Tiga pengikat tetap berlaku: baton migrasi `0021` antre di belakang `0017`-`0020`; maksimal 2-3 worker per batch (README §3); AD-03 di luar merge per gelombang |
| Q2 | ~~Hapus permanen: tetap P8 Z-04 (Sampah) atau pindah ke tab Pengaturan?~~ | **DIJAWAB 21 Okt (user): tetap P8.** Satu Sampah di `/app`, tombol hapus permanen hanya untuk admin + super-admin (`canPurge` sudah begitu). Area Admin menautkan saja |
| Q3 | AD-03 melonggarkan guard setelan dari super-admin ke admin — konfirmasi? | **Ya**, sesuai garis batas 21 Okt. Tetap butuh persetujuan user satu per satu saat eksekusi, di luar merge per gelombang |
| Q4 | Pengumuman: bisa ditutup user? tampil juga di halaman publik (landing/login)? | **Bisa ditutup; hanya area login-an.** Landing adalah muka produk, tidak dipasangi pengumuman internal |
| Q5 | ~~Kebijakan kerja boleh mengubah perhitungan tenggat yang sudah jalan?~~ | **DIJAWAB 21 Okt (user): belum.** Fase 1 hanya simpan + tampilkan; perhitungan tenggat S1/S2 tidak disentuh. Mengubahnya = rencana terpisah |
| Q6 | Ekspor data: siapa dan diaudit? | **Admin + super-admin**, diaudit (`DATA_EXPORT`), rate-limited, kunci API ditolak |
| Q7 | Laporan (⑥) keluar dari rencana ini? | **Ya**, rencana terpisah setelah data menumpuk |
| Q8 | Urutan rilis: Tahap 1 → 2 → 3, atau Proyek (Tahap 2) duluan? | **Tahap 1 duluan** — menjawab pertanyaan asal user, datanya sudah ada, risikonya paling kecil |

## 11. Sumber

- Diskusi user 21 Okt 2026 (area Admin: menu apa dan kenapa; pengalih area tiga entri; super-admin = developer).
- Kode worktree `feature/project-management` @ `a016a2e` — semua `path:baris` di §2.
- Riset pembanding 21 Okt 2026: Plane god-mode (pemisahan instance vs workspace), OpenProject system admin (welcome text, working days, permissions report), Linear workspace security + audit log, Asana Admin Console + export. Ringkasan perbandingan ada di badan diskusi, tidak disalin ke sini.
- `../HUTANG.md` (H-B14, H-D4/M08-M09, H-D5), `../JADWAL-S3-S8.md`, `P8-s6-sampah.md` (Z-04), `P9-pengaturan-lanjutan.md` (G-02).
