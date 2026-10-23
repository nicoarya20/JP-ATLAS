# P11 — Rencana eksekusi: Area Admin (`/dashboard`)

> 21 Okt 2026 · tahap 2 · **Gelombang 1 sudah dikerjakan** (AD-01 dan AD-02 selesai dan ter-merge ke `plan/p11-area-admin` @ `97a578b`, 21 Okt 2026); AD-03..AD-19 masih rencana. Cabang induk lajur ini `plan/p11-area-admin`. Mengikat: `../KEPUTUSAN-MVP-INTI.md` > `../JADWAL-S3-S8.md` > dokumen ini. Lahir dari diskusi user 21 Okt 2026 (pertanyaan: "menu apa saja di area Admin, dan kenapa"). Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di worktree `feature/project-management` pada tanggal itu. Tanda **ASUMSI** = belum diverifikasi.
>
> **Dikoreksi 23 Okt 2026 oleh `P14-cuti-status-admin.md`:** AD-07 (tab Kebijakan kerja) **dicoret** dan tab Pengaturan turun **6 → 5**. Sebabnya persetujuan cuti keluar dari aplikasi, sehingga saklar "Cuti perlu persetujuan" — satu-satunya isi AD-07 yang punya backend nyata — ikut hilang; hari kerja dan hari libur ditunda sampai ada yang benar-benar menghitungnya. Nomor migrasi `0022` juga berpindah tangan. Tiap butir yang terdampak ditandai di tempatnya masing-masing.

## 1. Ringkasan

- Area `/dashboard` sekarang **2 menu** (Beranda satu kartu + Pengguna). Rencana ini membawanya ke **7 menu** — Beranda, Pengguna, Proyek, Peran & izin, Ekspor data, Aktivitas, Pengaturan — dan memindahkan kepemilikan setelan organisasi dari `/dev` ke `/dashboard`. (**Dikoreksi 21 Okt 2026, AD-20:** semula 5 menu dengan Pengaturan 8 tab. Delapan tab tidak muat satu baris di laptop 1366px, dan dua di antaranya bukan setelan — Peran & izin adalah laporan, Ekspor data adalah alat — jadi keduanya naik jadi menu sendiri dan Pengaturan tinggal 6 tab.) **Dikoreksi lagi 23 Okt 2026 (P14):** **5 tab** — Kebijakan kerja dihapus.
- **Garis batas yang disepakati user (21 Okt 2026):** area super-admin = **teknis/developer** (infrastruktur, dikerjakan saat ada yang rusak); area Admin = **kebijakan kantor**. Konsekuensinya: apa pun yang mengubah tampilan/perilaku untuk semua role adalah milik Admin, bukan super-admin. Ini menutup pertanyaan "pindah vs duplikasi" — jawabannya **pindah**.
- **Pengalih area jadi tiga entri setara**: `App · Admin · Super-admin`. Tautan dalam (`Antrean persetujuan`) dan `Pengaturan akun` keluar dari grup itu.
- **20 tugas, AD-01..AD-20**, total ≈ **34,5 hari-orang AI** + reviewer ≈ 4, dibagi tiga tahap yang bisa dirilis sendiri-sendiri. (**Dikoreksi 23 Okt 2026, P14:** 19 tugas aktif, ≈ **32,5** — AD-07 dicoret.)
- **Satu migrasi** (**`0022`** — dikoreksi 21 Okt 2026: `0021` sudah dipakai `0021_leave_request.sql`): kolom settings untuk Pengumuman dan Kebijakan kerja. Butuh baton, antre setelah `0017`-`0021`. **Dikoreksi 23 Okt 2026 (P14 §4 K3):** nomor `0022` diambil `0022_leave_period.sql`; migrasi lajur ini geser ke **`0023`** dan isinya tinggal kolom Pengumuman — `working_days` dicabut bersama AD-07.
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
| ~~Cuti~~ | ~~`LeaveSettings = { requiresApproval }`, default `true`~~ · **basi 23 Okt 2026 (P14 CU-01/CU-02):** saklar dan modulnya dihapus bersama alur persetujuan | ~~`server/settings-leave.ts:7,10`~~ |
| Banner global | **Pola yang bisa ditiru Pengumuman**: `maintenance.enabled` ikut `frameInfo()` → dibaca tiap layout; `isMaintenanceExempt`/`shouldBlock` memilih path & role | `server/app-info.ts:18-21`; `server/settings-maintenance.ts:71,76` |
| Audit | 30+ aksi sudah ada, termasuk `SETTINGS_BRANDING_UPDATE`, `SETTINGS_FEATURES_UPDATE`, `USER_ROLE_SET`, `USER_APPROVE` — **cukup untuk menu Aktivitas tanpa aksi baru**, kecuali Pengumuman & Ekspor | `server/audit.ts:11-41` |
| Rute antrean | `APPROVAL_QUEUE_ROUTE = '/dashboard/users'` dipakai bersama badge `/dev` | `server/sidebar-badges.ts:36` |
| Scope kunci API | `settings:read`/`settings:write` sudah ada dan terpetakan | `server/api-keys/scopes.ts:74,80,168-176` |
| Daftar proyek | `listProjects(...)` sudah ada — **titik sambung menu Proyek**, tinggal cakupan Admin | `server/project/project-list.query.ts:108` |
| Tes penjaga | `tests/admin-routes.test.ts` memaksa **tiap** berkas `routes/admin/**` yang merender punya `meta()` **dan** guard ber-`ROLES.ADMIN`. Halaman baru otomatis dijaga — tidak perlu tes rute baru | `tests/admin-routes.test.ts:14-37` |
| ~~ASUMSI~~ **ditutup 21 Okt 2026** | `CONSOLE_PAGE_COUNT` hanya menghitung halaman `/dev` — tesnya menurunkan angka itu dari `countDevPages(routes)`. Halaman `/dashboard` baru **tidak** menambah tempat sunting | `server/landing-stats.ts:7`; `tests/landing-stats.test.ts:21` |

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
| **Peran & izin** | *"Peran ini sebenarnya boleh apa?"* | `/dashboard/permissions` — matriks baca-saja, diturunkan dari `server/permissions.ts` (AD-20) |
| **Ekspor data** | *"Aku butuh datanya di luar aplikasi."* | `/dashboard/export` — CSV anggota/proyek/tugas, diaudit (AD-20) |
| Aktivitas | *"Siapa yang melakukan ini?"* | Audit disaring ke aksi yang Admin pahami |
| Pengaturan | *"Aturan main kantor ini apa?"* | 5 tab (semula 6; P14), lihat bawah |

**Tab Pengaturan**

| Tab | Admin | Super-admin | Catatan |
|---|---|---|---|
| Identitas | ubah | ubah | nama app, tagline, support URL |
| Pengumuman | ubah | ubah | banner semua area, bisa ditutup |
| Akses masuk | ubah | ubah | form daftar, wajib persetujuan, undangan |
| ~~Kebijakan kerja~~ | — | — | **DIHAPUS 23 Okt 2026 (P14 D1, CU-07).** Cuti wajib disetujui hilang bersama alur persetujuan; pengingat acara bawaan pindah ke tab Pemberitahuan; hari kerja & hari libur turun ke `HUTANG.md` sampai ada kalkulator tenggat yang membacanya |
| Pemberitahuan | ubah | ubah | **menunggu P9 G-02** |
| Fitur | ubah | ubah | daftar terkurasi, bukan editor key/value |

~~Peran & izin~~ dan ~~Ekspor data~~ **keluar dari tabel ini 21 Okt 2026 (AD-20)** — keduanya jadi menu tersendiri, lihat tabel Menu Admin di atas. Peran & izin tetap **baca saja** bagi Admin maupun Super-admin: kalau Admin boleh mengubahnya, dia bisa menaikkan kewenangannya sendiri, bentrok dengan `canSetRole` (`server/permissions.ts`).

## 5. Data & API

**Migrasi ~~`0022`~~ → `0023`** (butuh baton, antre setelah `0017`-`0022`; **dikoreksi 23 Okt 2026, P14 §4 K3** — `0022` diambil `0022_leave_period.sql`)

| Kolom | Tabel | Untuk |
|---|---|---|
| `announcement` (jsonb) | `settings` | `{ text, level, active, dismissibleUntil }` — ikut pola `featureFlags` yang sudah jsonb |
| ~~`working_days` (jsonb)~~ | ~~`settings`~~ | **DICABUT 23 Okt 2026 (P14 §4 K2).** Tidak ada lagi layar yang menulisnya. Kolomnya dibuat nanti **bersama** kalkulator tenggat yang membacanya, bukan dibiarkan kosong menunggu |

Nullable, tanpa backfill, guard idempoten. Tidak ada tabel baru.

**Endpoint**

| Metode | Path | Guard sekarang | Guard sesudah |
|---|---|---|---|
| `PUT` | `/api/settings/branding` | super-admin | **admin + super-admin** |
| `PUT` | `/api/settings/auth` | super-admin | **admin + super-admin** (bagian kebijakan saja) |
| `PUT` | `/api/settings/features` | super-admin | **admin + super-admin** |
| `PUT` | `/api/settings/announcement` | – | admin + super-admin *(baru)* |
| ~~`PUT`~~ | ~~`/api/settings/working-days`~~ | – | **DICABUT 23 Okt 2026 (P14).** Diganti dua endpoint admin `PUT`/`DELETE /api/admin/users/:id/leave`, lihat P14 §6 |
| `GET` | `/api/admin/overview` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/projects` | – | admin + super-admin *(baru)* |
| `POST` | `/api/admin/projects/:id/manager` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/export/:kind` | – | admin + super-admin *(baru)* |
| `GET` | `/api/admin/permissions-matrix` | – | admin + super-admin *(baru, baca)* |

Rate limit, retensi, maintenance, demo tetap `requireRole(SUPER_ADMIN)` — tidak disentuh.

**Audit** — tambah 3 aksi: `SETTINGS_ANNOUNCEMENT_UPDATE`, ~~`SETTINGS_WORKING_DAYS_UPDATE`~~ (**dicabut 23 Okt 2026, P14** — diganti `LEAVE_SET`/`LEAVE_CLEAR` milik P14), `DATA_EXPORT`; plus `PROJECT_MANAGER_SET`. Semua wajib masuk `ACTION_META` (`app/lib/audit-api.ts`).

**Scope kunci API** — rute `/api/admin/*` baru dipetakan di `server/api-keys/scopes.ts` + assertion di `tests/api-keys/scopes.test.ts`. `POST /projects/:id/manager` dan `GET /export/:kind` masuk daftar tolak (eskalasi & ekspor massal).

## 6. DAFTAR TUGAS

Ukuran: `S (1)` · `M (1,5)` · `L (2)` · `L (2,5)` hari-orang AI.

### Tahap 1 — Pengaturan (≈16,5 → **14,5** setelah AD-07 dicoret, P14) · menjawab langsung "tampilan global semua role"

### AD-01 · Pengalih area tiga entri + Pengaturan akun ke menu avatar · Dep: – · S (1)
Ubah `APP`/`SECONDARY` (`admin/layout.tsx:21-28`), `OTHER` (`super/layout.tsx:151-160`), dan padanannya di layout `/app`. Label `'Area lain'` di `AppFrame.tsx:228` tetap.

### AD-02 · Kerangka `/dashboard/settings` · Dep: – · M (1,5) · PARALEL dgn AD-01
Rute + tab shell + `meta()` + guard. `tests/admin-routes.test.ts` otomatis menjaganya.

### AD-03 · Longgarkan guard setelan organisasi ke Admin · Dep: AD-02 · M (1,5) · **persetujuan satu per satu**
`requireRole(SUPER_ADMIN)` → `requireAnyRole([ADMIN, SUPER_ADMIN])` untuk branding/auth/features saja. Tes negatif: member & PM tetap 403; rate-limit/retensi/maintenance tetap super-admin.

### AD-04 · Tab Identitas · Dep: AD-03 · S (1)
Pakai ulang `BrandingCard.tsx`.

### AD-05 · Pengumuman: migrasi `0023` + API + banner semua area · Dep: AD-02 · L (2,5) · **baton migrasi**
Banner ikut `frameInfo()` seperti maintenance. Menyentuh `AppFrame` → wajib `smoke:prod` + `smoke:binary`.

### AD-06 · Tab Akses masuk · Dep: AD-03 · M (1,5) · PARALEL dgn AD-04
Pakai ulang `AuthSettingsCard.tsx`, buang bagian teknis.

### ~~AD-07 · Tab Kebijakan kerja~~ · **DICORET 23 Okt 2026 (P14 D1)** · L (2)
~~**Fase 1 hanya menyimpan + menampilkan.** Tidak mengubah perhitungan tenggat yang sudah jalan.~~

Dicoret setelah pemindaian 23 Okt menemukan **nol** konsumen: tidak satu pun tempat di `server/` atau `app/lib/` menghitung hari kerja (`isWorkday`, `getDay()`, akhir pekan). Tugas ini akan menghasilkan setelan yang disimpan tapi tidak dibaca siapa pun — admin mencentang Sabtu sebagai libur, tenggat tugas tetap jatuh di Sabtu. Anggaran Tahap 1 turun ≈2 (16,5 → 14,5).

Isinya dibagi tiga: saklar cuti **hilang** (P14 CU-02), pengingat acara bawaan **pindah** ke tab Pemberitahuan (P13 RD-08, lihat §9 kontradiksi 3), hari kerja + hari libur **ditunda** ke `HUTANG.md` dan dibangun bersama kalkulator tenggatnya.

### AD-08 · Tab Fitur terkurasi · Dep: AD-03 · M (1,5) · PARALEL
Daftar flag yang dikenal + deskripsi Indonesia. Editor key/value bebas tetap di `/dev`.

### AD-09 · Tab Peran & izin · Dep: AD-02 · L (2) · PARALEL
Matriks role × kemampuan dari `server/permissions.ts` (sumber tunggal, jangan disalin). Admin baca saja.

### AD-10 · Tab Ekspor data · Dep: AD-02 · L (2) · PARALEL
CSV anggota/proyek/tugas, streaming + paginasi (jangan muat seluruh tabel), diaudit, rate-limited.

### AD-P · Pratinjau layar AD-04..AD-08, AD-14/AD-15, P9 G-02 · Dep: AD-02 · **selesai 21 Okt 2026**
Permintaan user 21 Okt 2026: layar yang masih kosong dibuatkan pratinjau berisi data contoh supaya **bentuk** tiap menu bisa dinilai sebelum tugasnya dikerjakan. Bukan implementasi — tidak ada loader, mutasi, atau endpoint; tombol simpan `disabled`.

Berkasnya: `app/components/admin/settings/{identitas,pengumuman,akses-masuk,kebijakan-kerja,pemberitahuan,fitur}.tsx` lewat registry `settings.previews.tsx` (terpisah dari `panels.tsx`, supaya `isPlaceholderTab()` tetap menjawab "belum terisi"), `app/components/admin/home/beranda.*` untuk Beranda, dan `app/components/admin/pratinjau/pratinjau.tsx` untuk penandanya. Tiap berkas diawali `// PRATINJAU(<tugas>):` dan terdaftar di `tests/admin-pratinjau.test.ts`.

**Kewajiban tiap tugas pemilik:** saat AD-04..AD-08 / AD-14 / AD-15 / P9 G-02 dikerjakan, hapus berkas pratinjaunya, barisnya di registry, dan barisnya di tes — dalam commit yang sama. Tes merah bila salah satu tertinggal.

### AD-20 · Pecah Peran & izin dan Ekspor data jadi menu sendiri · Dep: AD-09, AD-10 · M (1,5) · **selesai 21 Okt 2026**
Tugas baru dari pengamatan user atas layar nyata: delapan tab tidak muat satu baris di 1366px, dan dua di antaranya bukan setelan. Rute `/dashboard/permissions` dan `/dashboard/export`, panel dipindah dengan `git mv` tanpa mengubah perilaku, `SETTINGS_TABS` turun ke 6, registry `panels.tsx` dipertahankan untuk AD-04..AD-08. Endpoint tidak berubah.

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
| R1 | **Baton migrasi** bertabrakan dengan migrasi lajur produk | AD-05 pemegang baton tunggal; jangan luncurkan bersamaan dengan tugas bermigrasi lain. **Dikoreksi 23 Okt 2026 (P14 §4 K3):** `0022` kini diklaim `0022_leave_period.sql`, jadi nomor bebas berikutnya **`0023`**. Aturan intinya tidak berubah — periksa ulang `server/db/migrations/` sebelum `db:generate`; siapa pun yang mendarat duluan menang dan yang lain menyesuaikan |
| R2 | **AD-03 melonggarkan guard** — salah tulis = eskalasi hak | Persetujuan user satu per satu, tes negatif member/PM/admin wajib, diff ditinjau manual |
| R3 | Pengumuman menyentuh `AppFrame` → semua area ikut terpengaruh | Smoke prod + binary; banner gagal-lunak (gagal baca = tidak tampil, bukan layar putih) |
| ~~R4~~ | ~~Kebijakan kerja diam-diam mengubah perhitungan tenggat S1/S2~~ | **Gugur 23 Okt 2026 (P14 D1):** AD-07 dicoret, jadi tidak ada lagi yang bisa menyentuh perhitungan tenggat. Risiko ini hidup lagi saat hari kerja dibangun dari `HUTANG.md` — bawa serta ke rencana itu |
| R5 | Ekspor data memuat seluruh tabel ke memori | Streaming + paginasi wajib; rate limit; diaudit |
| R6 | Daftar proyek N+1 saat mengambil Pengelola | Join/batch, bukan loop; paginasi wajib |
| R7 | Super-admin bingung setelan "hilang" dari `/dev` | Baris penunjuk di `/dev/settings` + entri Admin di pengalih area (AD-01) |
| ~~R8~~ | ~~**ASUMSI** `CONSOLE_PAGE_COUNT` ikut menghitung halaman `/dashboard`~~ | **Ditutup 21 Okt 2026 (koordinator):** hanya menghitung halaman `/dev` lewat `countDevPages(routes)`. Tidak ada tempat sunting tambahan; dibuktikan ulang oleh suite hijau di AD-02 |

## 9. Kontradiksi baru & dampak ke dokumen lain

**Kontradiksi**

1. ~~**Hapus permanen punya dua pemilik.**~~ **Ditutup 21 Okt 2026 (user, Q2 = A):** tetap milik P8; area Admin hanya menautkan ke `/app/trash`, tanpa layar Sampah sendiri. Sampah tunggal di `/app` terkumpul per jenis (proyek ada; tugas di P8 Z-02/Z-03; event di S7), member memulihkan sebatas `deletedByOrManaged`, admin/super-admin melihat `all` dan memegang tombol hapus permanen, purge otomatis 30 hari di P8 Z-05. Semua itu sudah terpasang di `server/access/trash.policy.ts:73-75,114-117` — P11 tidak menyentuhnya.
2. **Tab Pemberitahuan** bertindih dengan P9 G-02 (saklar Pemberitahuan). Usul: P9 pemilik, P11 hanya menyediakan tempatnya.
3. **Pengingat acara bawaan** bertindih dengan P7 M09 (pengaturan tim). ~~Usul: pindah ke tab Kebijakan kerja di sini, M09 dicoret.~~ **Dikoreksi 23 Okt 2026 (P14 §4 K4):** rumah yang diusulkan itu ikut terhapus. Pindah ke **tab Pemberitahuan** (P13 RD-08) — ini memang nilai awal notifikasi, bukan kebijakan kerja. M09 tetap dicoret.
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
| Q5 | ~~Kebijakan kerja boleh mengubah perhitungan tenggat yang sudah jalan?~~ | **DIJAWAB 21 Okt (user): belum.** Fase 1 hanya simpan + tampilkan; perhitungan tenggat S1/S2 tidak disentuh. **Ditutup 23 Okt 2026 (P14 D1):** pertanyaannya gugur — jawaban "belum" itu justru yang membuat AD-07 tidak punya nilai, jadi tabnya dicoret seluruhnya dan hari kerja menunggu kalkulatornya |
| Q6 | Ekspor data: siapa dan diaudit? | **Admin + super-admin**, diaudit (`DATA_EXPORT`), rate-limited, kunci API ditolak |
| Q7 | Laporan (⑥) keluar dari rencana ini? | **Ya**, rencana terpisah setelah data menumpuk |
| Q8 | Urutan rilis: Tahap 1 → 2 → 3, atau Proyek (Tahap 2) duluan? | **Tahap 1 duluan** — menjawab pertanyaan asal user, datanya sudah ada, risikonya paling kecil |

## 11. Sumber

- Diskusi user 21 Okt 2026 (area Admin: menu apa dan kenapa; pengalih area tiga entri; super-admin = developer).
- Kode worktree `feature/project-management` @ `a016a2e` — semua `path:baris` di §2.
- Riset pembanding 21 Okt 2026: Plane god-mode (pemisahan instance vs workspace), OpenProject system admin (welcome text, working days, permissions report), Linear workspace security + audit log, Asana Admin Console + export. Ringkasan perbandingan ada di badan diskusi, tidak disalin ke sini.
- `../HUTANG.md` (H-B14, H-D4/M08-M09, H-D5), `../JADWAL-S3-S8.md`, `P8-s6-sampah.md` (Z-04), `P9-pengaturan-lanjutan.md` (G-02).
