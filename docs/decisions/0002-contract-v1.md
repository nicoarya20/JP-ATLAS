# 0002 — Kontrak S0.b dibekukan sebagai `contract-v1`

Dicatat 16 Oktober 2026 (S0B-33, gerbang akhir S0.b). Mengikat bagi S1, S2, dan seterusnya. Sumber: `tahapan-proyek/05-implementasi/rencana/P2-s0b-kontrak-beku.md` (§5 kriteria dan aturan perubahan, §7 kontradiksi, §8 bukti), `KEPUTUSAN-MVP-INTI.md` (§2-§6), `PROGRES.md` (laporan gelombang G1-G12), dan kode di `server/access/*`, `server/metrics/*`, `server/pm/*`, `app/routes.ts`. Dokumen ini menjelaskan **kenapa**; apa yang beku dibuktikan oleh `tests/contract-v1.test.ts`.

**Penyimpangan nomor:** rencana menyebut `docs/decisions/0001-contract-v1.md`, tetapi nomor 0001 sudah dipakai `0001-account-status-on-user.md` (S0A-15). Catatan ini karena itu bernomor **0002**. Rujukan "0001-contract-v1" di rencana dibaca sebagai berkas ini.

**Status tag:** `contract-v1` **belum** dipasang. Tag lokal dibuat koordinator sesudah merge dan persetujuan user; hasil pemeriksaan 18 kriteria ada di laporan S0B-33, bukan di sini. Kriteria #16 (tinjauan manusia, UAT login Google) masih TERBUKA dan menunggu user.

## Konteks

S1 (proyek) dan S2 (tugas) dikerjakan banyak pekerja sekaligus. Tanpa satu permukaan yang disepakati, tiap irisan menebak nama izin, kode galat, rute, dan menu milik irisan lain, lalu perbedaannya baru ketahuan saat merge. S0.b menetapkan permukaan itu lebih dulu; `contract-v1` adalah titik di mana permukaan itu dianggap selesai dan perubahannya harus lewat jalur yang terlihat.

## 1. Apa yang beku, dan siapa pemiliknya

| Objek | Kenapa dibekukan | Pemilik |
|---|---|---|
| Skema DB: `project`, `project_member`, `project_activity` (0015); `task_kind`, `task`, `task_checklist_item`, `task_comment`, `task_activity` (0016); kolom akun di 0014 | Semua irisan menulis ke tabel yang sama; satu kolom yang berubah diam-diam merusak irisan lain. Snapshot `tests/db/pm-schema-contract.test.ts` membuat perubahan terlihat | pemegang baton migrasi |
| `server/access/*` | Kebijakan izin ditulis sekali sebagai fungsi murni; halaman, API, dan menu membaca keputusan yang sama sehingga tidak ada cabang `role === …` tercecer (dijaga `tests/no-role-branching.test.ts`) | L-C |
| `server/metrics/*` | Progres, waktu berjalan, dan kondisi proyek harus sama di Beranda, daftar, dan ringkasan; angka emas Atlas mengunci rumusnya | L-C |
| `server/pm/{enums,errors,limits}.ts` | Enum dan kode galat dipakai skema (CHECK), kebijakan, API, dan UI; `limits.ts` memegang saklar fitur (`PROJECT_DELETE_UI_ENABLED`, `TASK_REVIEW_UI_ENABLED`) | L-C |
| `app/routes.ts` (11 URL `/app/*`) dan `NAV` 4 item di `app/routes/app/layout.tsx` | Rute dan menu adalah berkas bersama; irisan yang menambah entri tanpa koordinasi membuat konflik merge dan menu tak konsisten | integrator |
| `server/api/app.ts`, `app-context.ts`, `app-common.ts`, `server/api-error.ts` | Gerbang 401/403 dan bentuk galat seragam ada di satu tempat; irisan hanya menambah modul `app-<modul>.ts` | integrator |
| `server/api-keys/scopes.ts`, `scopes.pm.ts` | Rute baru tanpa pemetaan scope menghasilkan 403 untuk kunci API; `PM_KEY_DENY` memagari rute destruktif | integrator |

Tidak ikut beku (boleh berubah oleh pemilik irisan tanpa PPK): `server/pm/{keyset,respond,soft-delete,tx,metrics-env}.ts`, komponen di `app/components/pm/*` dan `app/components/ui/*`, isi stub rute, `tests/support/*`. Snapshot hanya menjaga nama ekspor; tanda tangan dan perilaku dijaga tes per modul.

## 2. Protokol perubahan sesudah beku

**Kenapa dibuat begini:** cukup ketat untuk mencegah perubahan diam-diam, cukup longgar agar irisan tidak menunggu satu orang untuk menambah satu fungsi.

| Objek | Aturan |
|---|---|
| Skema DB | **Expand-only:** tabel atau kolom baru (nullable atau `DEFAULT`), tidak mengubah atau menghapus yang ada. Nomor migrasi berikutnya lewat baton (satu per waktu); snapshot `pm-schema-contract` diperbarui di commit yang sama |
| `server/access/*`, `server/metrics/*`, `server/pm/{enums,errors,limits}.ts` | **Menambah** fungsi, flag, atau kode: pemilik irisan lewat PR kecil + tes + baris baru di snapshot `tests/contract-v1.test.ts`. **Mengubah** tanda tangan atau perilaku yang ada: Permintaan Perubahan Kontrak (PPK) tertulis ke L-C |
| Berkas bersama (`app/routes.ts`, NAV, `server/api/app.ts`, `app-context.ts`, `app-common.ts`, `api-error.ts`) | Hanya L-C; membuka rute atau menu irisan = 1-3 baris oleh integrator pada commit merge irisan itu |
| Nama kanonik (X3 §2b) | Tidak dikembalikan ke ejaan lama; dokumen yang bertentangan dikoreksi pemiliknya |
| Versi | Tambahan kompatibel ⇒ tag `contract-v1.N`; perubahan merusak ⇒ `contract-v2` hanya atas persetujuan user. Tag dibuat lokal; push tag hanya atas perintah user |
| Larangan keras | `mock.module` baru; dua `db:generate` serentak; mengedit snapshot tanpa peninjau; irisan menyunting `CLAUDE.md` |

PPK = isi PR: apa yang berubah, kenapa, irisan yang terdampak, tes yang berubah. Snapshot sengaja berupa literal di berkas tes (bukan berkas otomatis): perubahan nama ekspor harus tampil sebagai baris di diff dan dilihat peninjau.

## 3. Kontradiksi K1-K12 dan keputusan yang dipakai

Keputusan user di `KEPUTUSAN-MVP-INTI.md` mengalahkan default rencana. Kolom terakhir menyatakan keadaan di kode pada saat dicatat.

| # | Keputusan | Kenapa | Keadaan |
|---|---|---|---|
| K1 | 0015 = 3 tabel, 0016 = 5 tabel; tabel S3+ lewat 0017+ via baton | Menjaga kontrak S0-S2 tidak menutup S3+ tanpa membuat tabel yang belum dipakai siapa pun | Terpasang (8 tabel PM, snapshot `pm-schema-contract`). Koreksi D6/M27 dilakukan lewat dokumen ini |
| K2 | `TASK_TRANSITIONS` lengkap dan teruji; endpoint `request-review/approve/return` dan tabel `task_review` menyusul di S4 | Review tidak ada di jalur inti; mengimplementasikannya setengah lebih berbahaya daripada menundanya | `TASK_REVIEW_UI_ENABLED = false`; tabel `task_review` tidak ada. Bila S2 ingin endpoint review, migrasi expand-only dulu |
| K3 | **Keputusan user 15 Okt 2026: opsi B.** Hapus proyek aktif, dengan halaman Sampah minimal khusus proyek di S1 (tugas S1-18). Boleh menghapus: Super-admin, Admin, PM-Pengelola; Member-Pengelola tidak (`canTrashProject`, kode `ROLE_CANNOT_TRASH`) | Proyek tidak boleh hilang tanpa jalur pulih; bawaan rencana (tombol disembunyikan) digantikan keputusan user | `PROJECT_DELETE_UI_ENABLED = true`. **Syarat tersirat:** Sampah minimal (S1-18) belum ada; S1 tidak boleh mengaktifkan tombol sebelum halaman itu ada |
| K4 | Progres dibulatkan dengan `round`, tampilan dibatasi 99 kecuali semua selesai (X2 §2C); angka emas Atlas 17 | `floor` (R03) menyalahi contoh Atlas yang disepakati; R03 yang dikoreksi | `progress()` memakai `Math.round` + batas; dijaga `tests/atlas.golden.test.ts` |
| K5 | Stub hanya rute S0-S2 dan NAV 4 item (X1 D4); `root.tsx`/`theme.ts` ditulis S0.b lalu diserahkan ke L4 | Menu penuh membuka tautan mati; X3 M14/M15 ditunda ke irisan masing-masing | NAV 4 item, 11 URL `/app/*` (dijaga `contract-v1.test.ts`) |
| K6 | `user.policy`/`account-status.rules` ditulis S0A-03 lebih dulu karena S0.a memakainya | Urutan merge mengharuskan S0.a siap sebelum S0.b selesai | Terpasang; S0B-13 menutup lewat tes tambahan (C36-C38) |
| K7 | `Principal.impersonating` ada; `toPrincipal` mengisinya dari `Actor.impersonatedBy` | Q9: menyamar tidak boleh melakukan aksi merusak | Tersambung (S0B-10, `server/guard.ts` mengisi `impersonatedBy`); kebijakan diuji dengan `true` |
| K8 | Tanpa `server/access/index.ts`; impor berkas eksplisit | `client-server-imports` menolak impor direktori dan `export … from` lintas batas | Tidak ada `index.ts` di `access/metrics/pm` |
| K9 | Estimasi dan jadwal: tiga lajur lalu satu cabang per tugas, merge per gelombang (keputusan user di `KEPUTUSAN` §6) | Kuota token membatasi worker paralel | S0.b selesai di G12 kecuali S0B-33; jadwal nyata menggantikan angka rencana |
| K10 | README tidak diberi heading kosong per modul | README dilayani publik di `/README.md`; heading kosong menyesatkan agen | S0B-32 hanya menambah baris "Rute khusus sesi" di bagian API keys |
| K11 | Kode `ACCOUNT_PENDING`/`ACCOUNT_REJECTED` (M18) dan `LEAD_MUST_BE_MANAGER` (ejaan R04) | X3 lebih baru dari X1/R03; satu nama kanonik | Ada di `server/pm/errors.ts`; `ACCOUNT_NOT_APPROVED` dan `LEAD_NOT_MANAGER` tidak ada |
| K12 | Ikon `1.25em`, cookie `mk-text-size` (D2) | Satu ejaan untuk server dan klien | Cookie dipakai `server/text-size.ts`; tidak ada `pm-text-size`; ikon baru `1.25em` |

## 4. Bukti yang belum diverifikasi (rencana §8): status terkini

| # | Klaim | Status |
|---|---|---|
| 1 | `derive` yang melempar `Response` ⇒ 401 sebelum validasi body; `status()` di `derive` ⇒ 500 | **Terbukti** S0B-18 (`tests/app-gate.test.ts`, `tests/api/app-context.test.ts`) |
| 2 | `pgClient(url, { connection: { TimeZone: 'UTC' } })` didukung | **Terbukti** S0B-01 (`tests/db/session-timezone.test.ts`) |
| 3 | Wrapper `db-generate` membungkus CHECK/UNIQUE dan aman untuk identity | **Terbukti** S0B-03/06 (`db-generate-rewrite`, `migrations-guard`, `migrations-idempotent`) |
| 4 | Kebocoran `mock.module(guard)` antar berkas bergantung urutan | **Terbukti** S0B-22/23: 13 berkas dikonversi, ratchet 0, `audit` dan `app` lulus di kedua urutan |
| 5 | Rute statis `/app/projects/new` didahulukan atas `:projectId` | **Terbukti** oleh S0B-33 memakai `matchRoutes` React Router pada `app/routes.ts` (probe sementara, tidak disimpan). **Belum ada tes permanen**; S1 sebaiknya menambahkan satu kasus ke `tests/app-routes.test.ts` |
| 6 | Skala 1,25/1,5 tidak memotong teks pada 1024×768 dan 820×1180 | **Terbuka:** S0B-24 hanya membuktikan lewat analisis CSS dan render SSR, bukan browser nyata. Perlu pemeriksaan visual sebelum S1 mengandalkan tata letak |
| 7 | `TEXT_SCALE` 1/1,25/1,5 adalah asumsi sampai diuji 2-3 lansia | **Terbuka** (setelah S1); uji dengan penguji dummy tidak sah untuk gerbang S2 |
| 8 | `session.impersonatedBy` dapat dibaca dari `resolveActor` | **Terbukti** S0B-10 (tersalur ke `Principal`) |
| 9 | Drizzle: `.for('update')` dan `generatedByDefaultAsIdentity({ name })` | Identity **terbukti** S0B-05/06. `.for('update')` **terbuka:** belum dipakai kode mana pun; dibuktikan saat S1/S2 memakainya pertama kali |
| 10 | Migrasi 0000-0013 belum pernah berjalan di produksi | **Terjawab user** 15 Okt 2026 (X1-Q5); rantai migrasi tetap append-only |
| 11 | Angka emas Atlas (17/60/5/1) cocok dengan kode | **Terbukti** S0B-30 (`tests/atlas.golden.test.ts`) |
| 12 | `bun test --randomize` tersedia | **Terbukti tersedia**, tetapi belum bersih (lihat §5) |
| 13 | Estimasi hari-orang AI dan kalender | **Terbuka:** hanya dapat dinilai ulang setelah S2 |
| 14 | Jumlah 13 berkas `mock.module(guard)` | **Terbukti** S0B-22 (7) + S0B-23 (6) |

## 5. Hutang kecil yang diketahui (dari laporan G1-G12)

Tidak satu pun memblokir tag; semuanya dicatat agar tidak ditemukan ulang.

- **Dua pembantu notifikasi:** `app/lib/notify.ts` (S0A-14) dan `app/components/ui/notify.ts` (S0B-26) tumpang-tindih, begitu pula `app/lib/http.ts` baru dengan klien API lama per-halaman. Satukan saat S1 menyentuh halaman yang memakainya.
- **Dua kode "tidak terlihat":** kebijakan proyek memakai `NOT_VISIBLE`, kebijakan tugas `NOT_FOUND` (`server/access/not-visible.ts`); keduanya menjadi 404. `DENY_UI` belum mencakup `NOT_FOUND`. Service S1/S2 harus memeriksa `canViewProject/Task` lebih dulu (404) sebelum kebijakan aksi, karena `review.policy` menjawab `NOT_MEMBER` (403).
- **Pembatas tulis berjalan setelah validasi** (`app-context.ts`): body tidak valid dari pengguna sah tidak menghabiskan kuota; konsekuensinya request berbentuk salah tidak dibatasi lajunya.
- **`bun test --randomize --seed=1234` masih 38 kegagalan** karena ketergantungan urutan antar tes lama (sebelum konversi S0B-23: 45). Bukan blocker; urutan default dan urutan terbalik untuk `audit`/`app` hijau.
- **Pemindaian `user` tanpa indeks:** `loadReviewerPool` memindai tabel `user` (aman untuk skala MVP; tambahkan indeks bila daftar pengguna membesar).
- **`getSession` di loader root:** sebelum S1 menulis cookie `mk-text-size`, setiap halaman untuk pengguna ber-sesi menjalankan satu `getSession` dan satu query `profile` tambahan. Evaluasi setelah S1 menulis cookie.
- **`PROJECT_CLOSED_ALLOWS_TASK_WRITES=false`** hanya mengunci pembuatan tugas, dan toggle `needsReview=true` tidak diblokir kebijakan saat `TASK_REVIEW_UI_ENABLED=false`; service S2 tidak boleh mengekspos jalur itu (X3 M25).
- **Berkas besar:** `README.md` (500 baris, 50 KB), `CLAUDE.md`, dan `CHANGELOG.md` melewati batas ukuran dokumen File Health; `server/api-keys/scopes.ts` 208 baris dan `app/components/AppFrame.tsx` 260 baris mendekati batas. Pecah sebelum ditambah lagi.
- **Belum diuji di browser:** tema S0B-24 (hanya analisis CSS dan render SSR) dan komponen S0B-28 (alur klik, layar 375 px). Pemeriksaan visual menunggu instruksi eksplisit untuk membuka browser.
- `MEMBER_CAN_LEAVE_PROJECT` belum dipakai siapa pun; `app/routes/app/layout.tsx` masih memakai `<title>` generik "Simple PM".

## 6. Yang belum diputuskan

- **Tinjauan (kriteria #16):** peninjau manusia belum menyetujui, peninjau kedua S0.b/keamanan masih `Peninjau-2 (dummy)`, dan UAT login Google (`uat/UAT-S0A.md`) belum dijalankan user. Tag tidak dipasang sampai user menyetujui atau menyatakan menerima tanpa peninjau kedua.
- **Kriteria #17:** G-Q5 sudah dijawab user. K3 dijawab user (opsi B + siapa boleh menghapus). K1, K2, K4-K12 memakai default rencana dan dicatat di sini; belum ada pernyataan user terpisah atas K1 dan K2.
