# Simple PM ⚡

Fullstack template dengan **satu port, tanpa CORS, siap production**. Frontend dan backend berjalan dalam satu proses Elysia — tidak ada proxy, tidak ada CORS config, cookies langsung bekerja.

```
Browser  →  Bun/Node :3005
              /api/auth/*  →  Better Auth
              /api/*       →  Elysia API (Eden Treaty)
              /assets/*    →  static Vite (immutable, prod)
              /*           →  React Router v8 SSR
```

## Untuk AI agent

Dokumentasi ini adalah satu-satunya sumber dan bisa dibaca tanpa JavaScript:

- `GET /README.md` — file ini apa adanya (`text/markdown`), juga `/llms-full.txt` (`text/plain`).
- `GET /llms.txt` — indeks singkat (judul, ringkasan, daftar bagian, endpoint untuk agent), dibangkitkan dari heading README.
- `GET /api/version` — `{ name, version, env, bun }`, publik.
- `GET /api/openapi.json` — spec OpenAPI 3 untuk API REST, butuh API key apa pun yang valid (tanpa key → `401 API_KEY_REQUIRED`). Isinya hanya endpoint yang boleh dipanggil key tersebut; scope tiap operasi ada di field `x-required-scope`.
- API dipakai dengan header `X-API-Key: sp_live_…` atau `Authorization: Bearer sp_live_…`; scope per route ada di bagian **API keys**. Semua error API berbentuk JSON `{ error, code, status, requestId }`.
- Fitur produk dibangun di area `/app` (halaman) dan `/api/app/*` (endpoint), keduanya butuh login — lihat **Membangun fitur produk (`/app`)**. `/dev` khusus operasional, `/dashboard` khusus admin.
- Server MCP di `/api/mcp` (Streamable HTTP) menerima API key ber-scope `mcp`; katalog tool ada di bagian **Dev console → Tools & MCP**.

Untuk mesin pencari: `/robots.txt` (area login, konsol, dan API ditutup) dan `/sitemap.xml` dibangun dari `APP_URL`, sedangkan landing punya meta Open Graph/Twitter, `og:image` (`/og.png`, 1200×630), dan `canonical` — jadi set `APP_URL` ke origin publik di produksi.

Ketiga URL dokumentasi dilayani sebelum SSR, ber-ETag (`304` bila tidak berubah), tidak dihitung sebagai kunjungan, dan tetap tersedia saat mode maintenance.

## Apa yang sudah ada

| Fitur | Detail |
|---|---|
| **Single-port** | API + SSR dalam satu Elysia server, dev dan prod identik |
| **Type safety end-to-end** | Eden Treaty: tipe client diekstrak dari route Elysia, tanpa codegen |
| **Auth lengkap** | Better Auth: Google OAuth (email+password hanya di dev/test), multi-session, sistem role |
| **SSR tanpa waterfall** | React Router v8 loader berjalan server-side, session tersedia di loader |
| **ORM type-safe** | Drizzle ORM + PostgreSQL, schema-as-code, migration files, Drizzle Studio |
| **Penyimpanan file** | S3-compatible lewat `Bun.S3Client`; RustFS lokal otomatis tanpa server terpisah, foto profil siap pakai |
| **UI kit terkonfigurasi** | Mantine v9, TanStack Query, Zustand, Biome — semua sudah terhubung |
| **Dev console `/dev`** | 14 halaman operasional: users, sessions, posts, API keys, DB schema, log pengunjung/login/rate-limit/server/audit, file health, tools, settings — badge hidup di sidebar |
| **API keys** | Kunci `sp_live_…` ber-scope, kedaluwarsa, rotasi dengan masa tenggang, IP allow-list, rate limit per kunci, jejak pemakaian + rollup harian, kunci pribadi per user |
| **Observability** | Visitor/login/rate-limit log dengan geo & perangkat, audit trail semua aksi admin, buffer log server, retensi otomatis, mode maintenance, feature flags |
| **Error yang konsisten** | Halaman 404/401/403/5xx bermerek (sidebar tetap tampil di konsol), error API selalu `{ error, code, status, requestId }`, fallback HTML bila SSR gagal |
| **Ramah AI agent** | `/README.md` + `/llms.txt` teks polos, server MCP ber-API-key, tool file health agar konteks agent tidak meledak |

## Stack

| Layer | Tech | Versi |
|---|---|---|
| Runtime | Bun | 1.4.x |
| Backend | Elysia + Eden Treaty | 1.4.x |
| Auth | Better Auth (Drizzle adapter) | 1.7.x |
| ORM / DB | Drizzle ORM + PostgreSQL | 0.45 / PG 16 |
| Frontend | React Router v8 SSR + React | 8.x / 19.x |
| UI | Mantine + @mantine/form | 9.6.x |
| Data fetching | TanStack Query | 5.x |
| Client state | Zustand | 5.x |
| Validation | TypeBox (API) + Zod (env) | 0.34 / 4.x |
| Tooling | Biome, Pino, TypeScript, Vite | 2.5 / 10 / 7 / 8 |

## Quick start

```bash
# 1. Install
bun install

# 2. Konfigurasi env
cp .env.example .env
# Wajib: BETTER_AUTH_SECRET (openssl rand -base64 32)
# DATABASE_URL: .env.example mengirimnya TERISI ke localhost:5432 — KOSONGKAN (atau
#   komentari) untuk Postgres lokal otomatis, atau isi ke Postgres sendiri. Jangan
#   biarkan nilai bawaan kalau tak punya Postgres di :5432, nanti `bun run dev` gagal.
#   `bun run cli init --db=local` menuliskan .env yang benar untuk kamu.
# Opsional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Wajib di belakang reverse proxy/LB/Cloudflare: TRUSTED_PROXIES (IP/CIDR proxy, lihat "Rate limiting")

# 3. Database (pilih satu)
# Opsi A — tanpa Postgres: biarkan DATABASE_URL kosong, unduh runtime sekali
#   (migrasi otomatis saat boot, lihat "Database: dari lokal ke produksi"):
#   bun run cli init --db=local
# Opsi B — pakai Postgres yang sudah ada:
#   psql -c "CREATE DATABASE simple_pm;" && bun run db:migrate
# Opsi C — spin up lokal dengan Docker:
#   docker compose --profile local-db up -d && bun run db:migrate

# 4. Dev server (single port, HMR)
bun run dev   # → http://localhost:3005

# 5. Production
bun run build
bun run start
```

## Scripts

| Script | Fungsi |
|---|---|
| `bun run dev` | Dev server satu port (Elysia + Vite HMR + RR SSR) |
| `bun run build` | Build client + server bundle |
| `bun run start` | Production server (`server/prod.ts`, NODE_ENV=production) |
| `bun run smoke:prod` | Build lalu boot `server/prod.ts` di port bebas dan jalankan 23 pemeriksaan black-box (`scripts/smoke-server.ts`) |
| `bun run smoke:binary` | Sama, tetapi terhadap binary hasil `build:binary` |
| `bun run smoke:coldboot` | Boot binary dari folder kosong dengan Postgres lokal (init → migrasi → start) |
| `bun run build:binary` | Build binary platform saat ini → `./simple-pm`; `-- --all` → `dist/` 4 target + `checksums.txt` |
| `bun run cli <cmd>` | CLI dari source: `init`, `doctor`, `version`, `backup`, `start` |
| `bun run typecheck` | `react-router typegen` + `tsc --noEmit` |
| `bun run lint` | Biome check |
| `bun run format` | Biome format --write |
| `bun run db:generate` | Generate SQL migration dari Drizzle schema |
| `bun run db:migrate` | Apply migration |
| `bun run db:push` | Push schema langsung (interaktif) |
| `bun run db:studio` | Drizzle Studio |
| `bun run test` | Test suite (bun:test, `tests/`, pakai DATABASE_URL_TEST) |

## Binary distribution (tanpa Bun di server)

```bash
# Pasang dari GitHub Release (deteksi OS/arch, verifikasi sha256, → ~/.local/bin)
curl -fsSL https://raw.githubusercontent.com/bipprojectbali/makuro-template/main/install.sh | sh
#   SIMPLE_PM_VERSION=v0.1.0   pin versi (default: rilis terbaru)
#   SIMPLE_PM_INSTALL_DIR=…    folder tujuan (default: ~/.local/bin)
#   SIMPLE_PM_REPO=owner/repo  untuk fork

# Di folder app (jadi direktori kerja: .env, data/, backups/)
simple-pm init      # buat .env (secret acak), unduh runtime Postgres, initdb + migrasi
simple-pm doctor    # periksa kesiapan
simple-pm           # = start
```

Build sendiri: `bun run build:binary` → `./simple-pm` (platform saat ini), `bun run build:binary -- --all` → `dist/simple-pm-<os>-<arch>` untuk linux-x64, linux-arm64, darwin-arm64, darwin-x64 + `checksums.txt`. Push tag `v*` menjalankan `.github/workflows/release.yml` yang membangun dan mempublikasikan aset yang sama ke GitHub Release.

| Perintah | Fungsi |
|---|---|
| `start` (default) | Jalankan server. Mode Postgres lokal: start PG + migrasi otomatis dulu; gagal dengan petunjuk `init` bila runtime belum diunduh |
| `version [--json]` | Nama, versi, platform |
| `init [--yes] [--db=local\|external] [--database-url=…] [--pg-archive=file.tgz] [--systemd] [--force]` | Siapkan `.env`, runtime PG (atau `--pg-archive` untuk offline), database, dan opsional unit systemd |
| `migrate [--status]` | Terapkan migrasi ke Postgres **eksternal** (`DATABASE_URL`); `--status` hanya mencetak migrasi pending. `start` tidak memigrasi DB eksternal (menghindari balapan antar-instance), jadi jalankan ini dulu saat deploy. Exit 0 sukses · 1 gagal · 2 argumen salah |
| `doctor [--json]` | Cek lingkungan, `.env`, koneksi DB, runtime PG, migrasi pending, disk, port, umur backup; exit 1 bila ada ❌ |
| `backup [--out=dir] [--keep=7]` | Backup cold folder data PG lokal (hentikan server dulu), simpan N terakhir |
| `upgrade [--version=vX.Y.Z] [--check]` | Self-update dari GitHub Release dengan verifikasi sha256 |

Dari source: `bun run cli <perintah>`.

**systemd:** `simple-pm init --systemd` menulis `./simple-pm.service` (`User=` user saat ini, bukan root — Postgres menolak berjalan sebagai root) lalu mencetak langkah `sudo cp … /etc/systemd/system/` dan `sudo systemctl enable --now simple-pm`.

**Satu file, tidak ada dependensi eksternal:**

```
simple-pm   ← binary ~130 MB — semua embedded:
                     • Bun runtime (JavaScriptCore)
                     • Server code (Elysia, Better Auth, Drizzle)
                     • React Router SSR bundle
                     • Seluruh static assets (CSS, JS, favicon, dll)
                     • Migrasi database
                    (runtime Postgres lokal tidak di-embed — diunduh saat init)
```

Seperti Go binary: copy satu file ke server, langsung jalan. Tidak perlu `build/`, tidak perlu Node/Bun, tidak perlu `npm install`.

**Verifikasi sebelum deploy:** `bun run smoke:binary` membangun binary, menjalankannya di port acak dengan `NODE_ENV=production`, lalu memeriksa versi, SSR landing/login, redirect guard, favicon, probe, halaman 404, JSON 404 API, Better Auth, penolakan API key palsu dan MCP anonim, `/README.md`, `/llms.txt`, meta OG landing, `/robots.txt`, `/sitemap.xml`, gambar OG, apple-touch-icon, header rate limit, `X-Forwarded-For`/`X-Real-IP` palsu dari klien tak tepercaya yang diabaikan, dan aset client ber-cache immutable. `bun run smoke:prod` melakukan hal yang sama untuk mode skrip (`bun run start`). Keduanya keluar dengan kode ≠ 0 bila ada yang gagal.

**NODE_ENV:** binary men-default `NODE_ENV=production`, tetapi Bun otomatis memuat `.env` dari direktori kerja — bila file itu berisi `NODE_ENV=development`, binary berjalan dalam mode development (detail error API terbuka, tanpa log file) dan mencetak peringatan saat start. Di server, gunakan `.env` tanpa `NODE_ENV` atau set `production`.

> **Teknik:** SSR bundle di-embed via static `import * as ssrBuild from '../build/server/index.js'` — Bun bundler mengikuti static import dan mem-bundle seluruh dependensi (`@react-router/node`, `react-dom`, dll) ke dalam binary. `--asset ./build/client` embed seluruh direktori client ke VFS (tersedia di runtime sebagai `client/` — satu level parent directory di-strip). `inlineDynamicImports: true` di Vite memastikan SSR bundle adalah satu file tunggal tanpa dynamic chunk splits.

> **Catatan:** Binary lebih besar (~130 MB) karena embed Bun runtime (JavaScriptCore). Trade-off yang sama dengan semua single-binary JS runtimes (Deno, Node SEA).

## Database: dari lokal ke produksi

Satu dialect (PostgreSQL) di semua tahap — yang berganti hanya siapa yang menjalankan Postgres.

**Postgres lokal otomatis** aktif bila `DATABASE_URL` kosong atau `LOCAL_PG_DIR` diset. Bila `DATABASE_URL` diisi, perilaku sama seperti biasa.

- Runtime PostgreSQL 18.4 dari paket npm `@embedded-postgres/<os>-<arch>` (MIT), diunduh sekali saat `init` (±53 MB, dengan progres: persen/kecepatan/ETA), hash sha512 di-pin di binary. Disimpan di cache global `~/.cache/simple-pm/pg/18.4.0/<platform>` (`XDG_CACHE_HOME` dihormati), dipakai bersama semua folder app dengan nama package sama.
- **Unduhan lambat?** `registry.npmjs.org` bisa lambat/stall di sebagian wilayah. Alihkan ke mirror lebih dekat lewat `SIMPLE_PM_PG_REGISTRY` (checksum sha512 tetap diverifikasi, jadi aman):

  ```bash
  SIMPLE_PM_PG_REGISTRY=https://registry.npmmirror.com bun run cli init --db=local
  ```

  Atau unduh tarball sendiri (curl mendukung resume `-C -`) lalu pasang offline: `bun run cli init --db=local --pg-archive=<file.tgz>`.
- Data di `./data/pg` (`LOCAL_PG_DIR`), port `54329` (`LOCAL_PG_PORT`), nama database = nama package `simple_pm` (ubah dengan `LOCAL_PG_DB`; test memakai `<nama>_test`). Tanpa listener TCP: koneksi hanya lewat unix socket di direktori 0700 milik user (`/tmp/simple_pm-pg-<uid>`, ubah dengan `LOCAL_PG_SOCKET_DIR`), sehingga user lain di mesin yang sama tidak bisa masuk. Zona waktu database selalu UTC. Postmaster yatim dari proses yang di-`kill -9` dihentikan otomatis saat start berikutnya. Migrasi berjalan otomatis saat boot (dev, `start`, binary).
- Platform: linux-x64, linux-arm64 (glibc), darwin-arm64, darwin-x64. musl/Alpine tidak didukung untuk mode lokal.
- Postgres menolak berjalan sebagai root — jalankan app sebagai user biasa.
- Lihat struktur/data: `bun run db:studio` (Drizzle Studio) otomatis menunjuk cluster embedded lewat unix socket saat `DATABASE_URL` kosong — nyalakan `bun run dev` dulu agar socket-nya ada. Dengan `DATABASE_URL` terisi, Studio memakai database itu.

**Tangga pertumbuhan:**

1. **Dev** — `bun run dev` dengan `DATABASE_URL` kosong: PG lokal start sendiri.
2. **Produksi kecil** — satu VPS: binary + PG lokal + `init --systemd`, `backup` terjadwal (cold: hentikan service sebentar).
3. **Membesar** — Postgres Docker atau terkelola: pindahkan data, isi `DATABASE_URL`, selesai.

**Pindah ke Postgres Docker/terkelola** — pakai `pg_dump` dengan versi mayor yang sama (18), jangan salin folder data mentah (locale/glibc bisa berbeda):

```bash
# Saat PG lokal berjalan (app aktif)
PGSOCK=/tmp/simple_pm-pg-$(id -u)   # atau nilai LOCAL_PG_SOCKET_DIR
docker run --rm --user "$(id -u)" -v "$PGSOCK:$PGSOCK" postgres:18 \
  pg_dump -h "$PGSOCK" -p 54329 -U postgres simple_pm > dump.sql
# Restore ke tujuan, lalu set DATABASE_URL di .env dan restart
psql "$DATABASE_URL" < dump.sql
```

**Docker:** image runtime berjalan sebagai `USER bun` dengan `VOLUME /app/data`; default tetap memakai `DATABASE_URL` eksternal, dan `CMD`-nya menjalankan `migrate` (bila `DATABASE_URL` terisi) lalu `start`. Dengan beberapa replika, jalankan `migrate` sekali sebagai job terpisah lalu jalankan replika dengan `start`.

## Penyimpanan file (S3)

Satu API untuk file, gambar, dan dokumen: `storage()` dari `server/storage` mengembalikan `Bun.S3Client` bawaan Bun (tanpa AWS SDK) yang terarah ke bucket app. Kodenya sama untuk semua backend S3-compatible.

```ts
import { storage, storageEnabled } from '../storage';

await storage().write(`docs/${id}.pdf`, file, { type: 'application/pdf' });
const url = storage().presign(`docs/${id}.pdf`, { expiresIn: 3600 }); // tautan sementara
await storage().delete(`docs/${id}.pdf`);
```

**Storage lokal otomatis** aktif bila `S3_ENDPOINT` kosong: app menjalankan [RustFS](https://github.com/rustfs/rustfs) 1.0.1 (Apache-2.0) sebagai child process, sama seperti Postgres lokal, jadi tidak perlu menjalankan server storage sendiri.

- Runtime diunduh sekali (`init`, atau otomatis saat `bun run dev`/test) dari GitHub Release RustFS dengan sha256 yang di-pin, ke `~/.cache/simple-pm/rustfs/1.0.1/<platform>` (~88 MB), dengan progres langsung (persen/MB/kecepatan/ETA). Ekstraksi memakai `unzip`, jadi pastikan `unzip` terpasang. Server tanpa internet: `init --s3-archive=<zip>` memakai arsip yang diunduh manual (sha256 tetap diverifikasi).
- Unduhan lambat? Rilis GitHub bisa lambat/stall di sebagian wilayah — alihkan ke mirror lewat `SIMPLE_PM_RUSTFS_RELEASES` (checksum sha256 tetap diverifikasi), mis. `SIMPLE_PM_RUSTFS_RELEASES=https://mirror.example/rustfs/1.0.1 bun run cli init`.
- Data di `./data/s3` (`LOCAL_S3_DIR`), port `54330` (`LOCAL_S3_PORT`), hanya `127.0.0.1`. Kredensial acak dibuat saat boot pertama dan disimpan di `<LOCAL_S3_DIR>/keys.json` (mode 0600). Nama bucket = nama package (ubah dengan `LOCAL_S3_BUCKET`), test memakai `<bucket>-test`.
- Platform: linux-x64, linux-arm64, darwin-arm64. darwin-x64 belum didukung, jadi isi `S3_ENDPOINT` dengan S3 eksternal.
- RustFS tidak mengunci volume sendiri. App mencegah dua instance dengan memeriksa port dan `<LOCAL_S3_DIR>/rustfs.pid`, jadi jangan menjalankan RustFS lain di direktori yang sama.
- Gagal lunak: bila RustFS tidak bisa start, app (dan `init`) tetap jalan dengan peringatan, dan fitur upload membalas `503 STORAGE_DISABLED`. `doctor` menampilkannya di grup "Storage" sebagai peringatan, bukan error.

**S3 eksternal** (AWS S3, Cloudflare R2, MinIO, RustFS terpisah): isi `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, dan opsional `S3_REGION` (default `us-east-1`). Bucket harus sudah ada. Pindah dari lokal: salin objek dengan klien S3 apa pun (mis. `aws s3 sync`), lalu isi env dan restart.

**Foto profil** memakai storage ini:
- `POST /api/app/avatar` (multipart, field `file`, maks 2 MB; PNG/JPEG/WEBP/GIF dicek dari isi file, SVG ditolak) → `{ image }`.
- `DELETE /api/app/avatar` → `{ image: null }`. Kedua rute avatar hanya untuk sesi login; API key ditolak.
- Gambar dilayani publik di `GET /api/storage/avatars/<userId>/<file>` dengan cache `immutable` (nama file acak per unggahan).
- Foto lama dihapus dari storage saat diganti, dihapus, atau saat akunnya dihapus (oleh user sendiri maupun admin).
- Foto dari URL luar (mis. foto akun Google lama) tetap tampil dan bisa dihapus, tetapi halaman Pengaturan tidak lagi menyediakan isian URL foto.

## Struktur project

```
app/                    React Router app (SSR)
  root.tsx              Provider (Mantine, TanStack Query, Modals) + ErrorBoundary root
  entry.server.tsx      Streaming SSR + handleError (404 senyap, sisanya ke pino)
  routes.ts             Konfigurasi route (per-role layout guards)
  routes/
    home.tsx            Landing page (angka hidup dari server/landing-stats.ts)
    login.tsx  go.tsx   Login/signup, post-auth resolver ke home role
    app/  admin/        Area /app + /profile dan /dashboard (layout + ErrorBoundary ber-sidebar)
    super/              Area /dev: 14 halaman konsol super-admin
  components/
    AppFrame.tsx frame/ Shell sidebar (nav model, badge, brand header)
    errors/             ErrorPage (standalone), ErrorPanel, AreaErrorBoundary
    logs/               Komponen bersama halaman log: StatTile, BreakdownPanel, LogCells, DetailParts
    api-keys/ users/ sessions/ posts/ settings/ profile/ … komponen per halaman
  lib/                  Klien API bertipe per domain (*-api.ts), error-page.ts, theme, query
server/
  env.ts                Env vars divalidasi Zod
  auth.ts               Better Auth (Drizzle adapter, admin + apiKey plugin)
  guard.ts              requireRole / requireAnyRole / resolveActor (sesi atau API key)
  permissions.ts roles  ROLES, homeFor(role), rekonsiliasi super-admin dari env
  api/
    index.ts            Elysia app: error plugin → rate limit → maintenance → api key → router
    *.ts  *.query.ts    Route handler (≤150 baris) dan query per domain
  api-keys/             scopes, plugin (onRequest), service/query, usage + rollup harian
  api-error.ts          Bentuk JSON error seragam + requestId
  error-page.ts         HTML fallback 500/503 tanpa React
  readme.ts             /README.md, /llms.txt, /llms-full.txt dari satu sumber
  http-probes.ts        favicon.ico, .well-known, apple-touch-icon sebelum SSR
  seo.ts                /robots.txt dan /sitemap.xml dari APP_URL sebelum SSR
  sidebar-badges.ts     Counter badge sidebar /dev (cache 15 dtk)
  settings*.ts          app_setting: auth, rate limit, retensi, maintenance, flags, branding
  middleware/           client-ip, visitor (+geo, UA), rate-limiter, maintenance
  mcp/                  Server MCP + tool (status, log, DB, file health)
  file-health/          Pemindai ukuran file / risiko konteks agent
  db/
    schema.*.ts         Drizzle schema per concern (auth, app, logs, keys)
    migrations/         SQL migration idempotent (0001…0012)
  http-bridge.ts        Node ↔ Fetch Request/Response bridge
  dev.ts  prod.ts       Dev server (Vite middleware) dan Bun.serve produksi
tests/                  bun:test, mirror struktur server/ (DATABASE_URL_TEST)
```

## Cara single-port bekerja

**Dev** (`server/dev.ts`): Node `http` server di satu port. `/api/*` ke Elysia; sisanya ke Vite dev middleware (assets + HMR), lalu ke React Router SSR handler (`virtual:react-router/server-build`).

**Prod** (`server/prod.ts`): `Bun.serve` di satu port. `/api/*` → Elysia, static assets dari `build/client` dengan immutable cache, sisanya → compiled React Router server build.

Karena FE dan BE satu origin: Eden client dan Better Auth client pakai relative URL — tanpa CORS, cookies langsung bekerja.

## Auth & roles

Sistem role: `member` → `project_manager` → `admin` → `super-admin`. Role tersimpan di tabel `user` via Better Auth admin plugin. Nilai `user` dari versi lama dibaca sebagai `member`.

| Role | Home | Area |
|---|---|---|
| `member` | `/app` | Fitur produk (`/app`), profil, keamanan akun, sesi perangkat, API key pribadi |
| `project_manager` | `/app` | Sama dengan `member`; kewenangan mengelola proyek menyusul di tahap proyek |
| `admin` | `/dashboard` | Dashboard dan halaman **Pengguna** (`/dashboard/users`: persetujuan pendaftar, peran Member/Project Manager, blokir, undangan), API key pribadi |
| `super-admin` | `/dev` | Overview, users, sessions, posts, DB schema, visitor/login/rate-limit/server/audit logs, file health, tools & MCP, settings |

`super-admin` hanya diberikan lewat `SUPER_ADMIN_EMAILS` **dan** hanya bila email akunnya sudah terverifikasi; email yang cocok tetapi belum terverifikasi tetap berperan sebagai `member`.

Area `/app` terbuka untuk semua role yang sudah masuk (`/profile` lama kini dialihkan ke `/app/settings`); admin dan super-admin membukanya lewat tautan **App** di sidebar.

**Persetujuan akun & undangan.** Di produksi masuk lewat Google. Akun baru berstatus `pending` (atau `rejected` setelah ditolak) dan hanya bisa membuka `/waiting`; ia tidak punya akses ke API apa pun sampai disetujui. Dua jalan menuju `approved`:

- **Undangan awal:** Admin membuat undangan berisi email dan role (berlaku 14 hari, maksimal 100 undangan aktif). Saat pemilik email itu pertama kali masuk dengan Google, akunnya langsung `approved` dengan role undangan. Email undangan harus sama dengan email Google; bila tidak cocok, akun jatuh ke `pending`.
- **Persetujuan manual:** Admin melihat antrean `pending` di `/dashboard/users`, lalu **menyetujui** (memilih Member atau Project Manager) atau **menolak** dengan alasan 3–200 karakter yang ditampilkan kepada orang itu di `/waiting`. Akun yang ditolak bisa disetujui kemudian; akun yang sudah disetujui dicabut aksesnya dengan blokir (suspend), bukan penolakan.

Batas wewenang berasal dari satu kebijakan murni (`server/access/user.policy.ts`) yang dipakai API **dan** tombol di layar: Admin hanya mengelola Member dan Project Manager (bukan sesama Admin, bukan Super-admin, bukan dirinya sendiri), hanya memberi role Member atau Project Manager, dan tidak bisa menghapus akun; Super-admin juga boleh memberi role Admin dan menghapus akun. Role `super-admin` hanya dari `SUPER_ADMIN_EMAILS`. Semua aksi ini ditolak (`IMPERSONATING`) selama sesi menyamar dan tercatat di audit log dengan email dimasker. Menyetujui, menolak, mengubah role, dan mengundang juga tidak bisa dilakukan dengan API key; blokir dan hapus akun tetap mengikuti scope `users:write`.

Endpoint admin (`/api/admin`, hanya Admin dan Super-admin; galat berbentuk `{ error, code }` berbahasa Indonesia):

| Endpoint | Fungsi |
|---|---|
| `GET /users?approval=&role=&status=&search=` | Daftar pengguna (dengan `approvalStatus` dan `approvalReason`); `GET /users/stats` memuat jumlah `pending` |
| `POST /users/:id/approve` `{ role? }` | Setujui akun `pending`/`rejected`, opsional sambil menentukan role |
| `POST /users/:id/reject` `{ reason }` | Tolak akun `pending`; alasan wajib |
| `POST /users/:id/role` `{ role }` | Ubah role |
| `POST /users/:id/ban`, `POST /users/:id/unban` | Blokir (mencabut semua sesi) dan buka blokir |
| `DELETE /users/:id` | Hapus akun permanen (Super-admin) |
| `GET /invitations?status=`, `POST /invitations` `{ email, role }`, `DELETE /invitations/:id` | Daftar (`active`, `used`, `expired`, `revoked`), buat, dan cabut undangan |
| `GET /permissions-matrix` | Matriks peran × kemampuan, baca saja. Dihitung dari `server/permissions.ts` saat diminta, bukan tabel yang disalin, jadi tidak bisa ketinggalan dari aturan yang berlaku |
| `GET /export/:kind` (`members`, `projects`, `tasks`) | Unduh CSV (`text/csv`, BOM UTF-8, RFC 4180). Di-stream per halaman, tanpa kolom rahasia, item di Sampah tidak ikut. Dibatasi 10 unduhan / 5 menit per akun dan tercatat di audit sebagai `data.export` (jenis + jumlah baris saja) |

Google OAuth: set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. Authorized redirect URI di Google Console: `${BETTER_AUTH_URL}/api/auth/callback/google`.

**Hapus akun sendiri** (`POST /api/auth/delete-user`, tombol di Pengaturan › Keamanan dan perangkat): hanya Super-admin (selain itu `403 DELETE_ACCOUNT_FORBIDDEN`), tidak saat menyamar, dan tidak selama ia satu-satunya pengelola proyek aktif (`409 SOLE_MANAGER`, pesannya menyebut nama proyek). Penjagaan ada di server (`server/account/delete-guard.ts`), bukan hanya di layar.

**Ban & hapus akun — apa yang dilihat user.** Better Auth sendiri hanya menolak *pembuatan sesi baru* untuk user yang diblokir; template ini melengkapinya:

- Saat admin memblokir (`POST /api/admin/users/:id/ban`), semua sesi aktif user itu dicabut seketika (tercatat di audit). Request berikutnya dari perangkat user diarahkan ke `/login?notice=session` dengan pesan bahwa sesi berakhir.
- Bila user yang diblokir masih memegang sesi (misalnya diblokir lewat jalur lain), guard (`server/guard.ts`) menolaknya dan mengarahkan ke **`/banned`**: halaman yang menampilkan alasan, apakah permanen atau sampai kapan (dengan hitung mundur), langkah yang bisa dilakukan, tautan dukungan dari branding, tombol keluar, dan ke beranda. Ban yang sudah lewat waktunya diperlakukan sebagai dicabut.
- Saat mencoba masuk lagi, halaman login menerjemahkan kode Better Auth (`BANNED_USER`, `INVALID_EMAIL_OR_PASSWORD`, `USER_NOT_FOUND`, …) ke pesan bahasa Indonesia yang actionable; login Google yang ditolak kembali ke `/login?error=<kode>` (bukan halaman error mentah Better Auth) berkat `errorCallbackURL`.
- User yang **dihapus permanen** kehilangan sesinya (cascade), sehingga perangkatnya mendapat notice "sesi berakhir" di login; mencoba masuk dengan email lama menghasilkan "akun tidak ditemukan", dan login Google akan membuat akun baru yang bersih (berstatus `pending`, kecuali ada undangan aktif). Tidak ada jejak yang disimpan tentang akun yang dihapus (selain audit log admin).

## Membangun fitur produk (`/app`)

Template ini dipakai sebagai dasar project lain, jadi fitur produk punya satu tempat default:

- **Halaman** — `app/routes/app/<nama>.tsx`, didaftarkan sebagai child layout `routes/app/layout.tsx` di `app/routes.ts`, plus item `NAV` di layout itu. Setiap loader **wajib** memanggil `requireUser(request)` (`server/guard.ts`), atau `requireAnyRole(request, [...])` bila fitur khusus role tertentu — loader layout dan halaman berjalan paralel, jadi guard layout saja tidak melindungi data halaman. `tests/app-routes.test.ts` memeriksa ini.
- **Endpoint** — tambahkan ke `server/api/app.ts` (prefix `/api/app`); semua route di sana otomatis menolak pemanggil tanpa sesi dengan `401 UNAUTHORIZED` dan akun yang belum disetujui dengan `403 ACCOUNT_PENDING`/`ACCOUNT_REJECTED`. Contoh: `GET /api/app/whoami` → `{ userId, name, role }`. Batasan per role: cek `actor.role` di handler dan kembalikan 403. Dari client pakai Eden: `client.api.app.whoami.get()` (`app/lib/eden.ts`).
- **API key** — `/api/app/*` dipetakan ke scope `app:read` (GET/HEAD) dan `app:write` (lainnya), tersedia untuk semua role. Pengecualian yang ditolak untuk API key (hanya sesi): `DELETE /api/app/projects/*`, semua metode `/api/app/projects/*/members*`, `PUT /api/app/projects/*/lead`, `POST /api/app/projects/*/extend-deadline`, `POST /api/app/projects/*/condition-override`, `PATCH /api/app/profile`, `PUT /api/app/profile/notifications`, `GET /api/app/profile/delete-check`, `DELETE /api/app/tasks/*` (hapus tugas, termasuk langkah dan komentarnya), `POST /api/app/trash/*`, `DELETE /api/app/events/*` (hapus acara ke Sampah dan keluarkan tamu), `POST /api/app/events/*/cancel`, semua metode `/api/app/events/*/participants*`, `POST /api/app/leave/*/approve|reject`, `DELETE /api/app/leave/*`, `PUT /api/app/leave/settings`, dan semua metode `/api/app/avatar`; rute ini juga tidak muncul di `/api/openapi.json`.
- `/dev` untuk operasional dan `/dashboard` untuk admin — jangan taruh fitur produk di sana.

## Visitor analytics

Setiap page navigation (bukan `/api/*`, aset, atau loader `.data`) dicatat ke `visit_log` oleh `server/middleware/visitor.ts` dan ditampilkan di `/dev/visits` (super-admin): statistik, breakdown negara/perangkat/browser/OS/halaman/referer, filter, detail per kunjungan, hapus massal, dan export CSV.

Data yang dikumpulkan per kunjungan: IP, path, referer (query string dibuang), user login, tipe bot (`isbot`), browser/OS/versi dan jenis perangkat (parser in-house + Client Hints di `visitor-ua.ts`), bahasa (`Accept-Language`), serta negara/wilayah/kota.

**Negara & kota dibaca dari header proxy** — tidak ada database GeoIP atau lookup pihak ketiga. Pastikan app berjalan di belakang salah satu:

| Proxy | Header yang dibaca |
|---|---|
| Cloudflare | `CF-IPCountry` (default), `CF-Region-Code`, `CF-IPCity` (aktifkan *Managed Transforms → Add visitor location headers*) |
| Vercel | `X-Vercel-IP-Country`, `X-Vercel-IP-Country-Region`, `X-Vercel-IP-City` |
| CloudFront | `CloudFront-Viewer-Country`, `-Country-Region`, `-City` |
| nginx + geoip2 | `X-Country-Code`, `X-Region`, `X-City` |

Tanpa header tersebut kolom geo bernilai `null`; UI menampilkan "Lokal" untuk IP privat/loopback dan "Tidak diketahui" untuk sisanya.

Di belakang proxy mana pun, **set `TRUSTED_PROXIES`** ke IP/CIDR proxy tersebut — tanpa itu IP klien yang tercatat (dan dipakai rate limit) adalah IP proxy. Lihat [IP klien & `TRUSTED_PROXIES`](#ip-klien--trusted_proxies).

Login log (`/dev/login-logs`) memakai enrichment yang sama plus kolom `method` (email / provider OAuth / impersonation / switch) dari endpoint Better Auth yang membuat sesi; API `/api/analytics/login-logs` punya bentuk yang sama (`search`, `country`, `device`, `method`, `userId`, `days`, `/stats`, `/export`, `DELETE` massal).

API (`/api/analytics/visits`, super-admin): `GET` list dengan query `page`, `limit`, `sort`, `search`, `type=human|bot`, `country`, `device`, `browser`, `os`, `days`; `GET /stats`; `GET /export` (CSV, maks. 10.000 baris, filter sama); `DELETE /:id`; `DELETE` body `{ ids: string[] }` (maks. 100).

## Dev console (`/dev`)

Konsol super-admin dengan pola yang sama di tiap halaman: loader SSR (data lengkap di paint pertama), KPI, filter, tabel + kartu mobile, drawer detail, konfirmasi aksi destruktif, notifikasi, dan audit.

- **Overview** — angka utama, peringatan (maintenance, retensi belum diatur, user banned, API key hampir kedaluwarsa, file berbahaya), aktivitas terbaru.
- **Sidebar** — tiap menu punya badge hidup dari `server/sidebar-badges.ts` (cache 15 detik, gagal lunak): nada *perhatian* berwarna (user diblokir, impersonasi aktif, migrasi tertunda, request diblokir, error server, kunci hampir habis, masalah konfigurasi) atau nada *informasi* abu-abu (jumlah user, sesi aktif, kunjungan/login/aksi 24 jam). Hover menampilkan fungsi menu dan arti angkanya.
- **Kelola**: Users (role, ban dengan alasan/durasi, impersonasi, hapus), Sessions (cabut sesi lintas user), Posts (konten contoh; pemilik atau admin), API Keys (lihat bagian di bawah), DB Schema (ERD + statistik nyata + status migrasi).
- **Log & monitoring**: Visitor Logs, Login Logs, Rate Limits, Server Logs (buffer pino di memori, `GET /api/logs`; live lewat SSE `GET /api/logs/stream`, resume via `Last-Event-ID`), Audit Log (`audit_log`: semua aksi berhak istimewa, read-only, `GET /api/audit`), File Health.
- **Tools & MCP**: status proses, katalog tool MCP + contoh `.mcp.json` (auth lewat API key ber-scope `mcp`, tombol "Buat kunci MCP"), ringkasan API, reset cache/limiter (`POST /api/ops/reset/:target`, teraudit).
- **Changelog** — `CHANGELOG.md` (Keep a Changelog) dirender sebagai timeline per versi dengan filter jenis dan pencarian. Badge sidebar kuning bila versi di `package.json` belum punya entry, abu-abu untuk jumlah perubahan di `[Unreleased]`. Dev membaca file langsung; `bun run start`/binary memakai salinan yang ter-embed saat build.
- **Settings** (`app_setting`, semua perubahan teraudit): autentikasi, rate limit, **retensi log** (usia maksimum per tabel, job harian + jalankan manual), **mode maintenance** (503 untuk semua kecuali role yang diizinkan; login tetap terbuka), **feature flags** (`isFeatureEnabled(key)` di server, `GET /api/settings` → `features` di client), **branding** (nama, tagline, URL dukungan → sidebar, meta, login).

Migrasi yang dibutuhkan fitur-fitur ini: 0008 (audit_log), 0009 (settings), 0010 (post.updated_at), 0011 (apikey, api_key_usage), 0012 (api_key_usage_daily), 0013 (kolom `user.is_anonymous` dan dua kolom pengaturan lama yang kini tidak dipakai) — semuanya idempotent.

Menambah halaman `/dev` baru berarti menyentuh lima tempat sekaligus: `app/routes.ts`, `NAV` di `app/routes/super/layout.tsx`, `QuickLinks` overview, `CONSOLE_PAGES` di landing (test menjaga jumlahnya sama dengan route), dan badge di `server/sidebar-badges.ts`.

## Halaman & respons error

Semua kegagalan punya wajah yang konsisten, di UI maupun API:

- **Halaman** — `ErrorBoundary` root (`app/components/errors/ErrorPage.tsx`) merender 404/401/403/5xx dengan judul, penjelasan, langkah berikutnya, path, kode referensi, dan aksi yang relevan (kembali, muat ulang, beranda, masuk). Di dalam area ber-sidebar (`/dev`, `/dashboard`, `/app`, `/profile`) halaman yang gagal tetap menampilkan sidebar (boundary di tiap layout). Detail teknis hanya tampil di development. Judul tab ikut kode status (`404 Halaman tidak ditemukan — Simple PM`) dan `noindex`.
- **API** — `server/api-error.ts` menyeragamkan semua error `/api/*` menjadi `{ error, code, status, requestId, method, path }`: 404 JSON untuk route/method tak dikenal (termasuk yang tadinya ditelan mount Better Auth), 422 dengan `issues[{ path, message }]` untuk validasi (tanpa dump skema), 400 body tak terbaca, 500 dengan pesan generik di produksi. Handler cukup `return status(4xx, { error, code? })`: bentuknya dilengkapi otomatis (`code` diturunkan dari status bila kosong, mis. 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`; field tambahan dipertahankan). Setiap 5xx dicatat sekali ke log dengan `requestId` yang sama seperti header `X-Request-Id`, jadi laporan user bisa langsung dicocokkan.
- **Fallback tanpa React** — bila SSR sendiri gagal, `server/error-page.ts` mengirim HTML statis (500/503, dark-mode aware, dengan kode referensi) baik di dev maupun prod; halaman pemeliharaan (503) memakai pola yang sama.

## Versi

Versi aplikasi punya satu sumber: `version` di `package.json` (dibaca `server/app-info.ts`). Nilai yang sama tampil di header sidebar konsol, halaman Tools, statistik landing, dan `GET /api/version` (publik, tanpa auth) yang mengembalikan `{ name, version, env, bun }` — cocok untuk probe deploy/uptime. Naikkan versi lewat `package.json` saja.

### Kontrak API proyek & profil (S1)

Semua rute di bawah ada di `/api/app` (butuh sesi atau API key ber-scope `app:read`/`app:write`; rute yang ditandai **sesi** ditolak untuk API key). Galat berbentuk `{ error, code, status, requestId }`. Proyek yang tidak ada, sudah di Sampah, atau tidak boleh dilihat penelepon selalu menjawab `404 NOT_FOUND` yang sama.

| Endpoint | Fungsi |
|---|---|
| `GET /projects?scope=mine\|all&status=&q=&sort=due\|name\|recent&perhatian=1&rencana=1&page=&limit=` | Daftar proyek yang boleh dilihat → `{ items, total, page, limit }` (`limit` default 25, maks. 100); Member yang meminta `all` mendapat `mine`; `perhatian=1` hanya proyek berjalan yang kondisinya Perlu perhatian/Terlambat (dinilai pada paling banyak 1000 proyek aktif, `total` ikut tersaring); `rencana=1` menambah `plan: { phases, milestones }` ringkas ke tiap item (dipakai tampilan Gantt) |
| `GET /projects/:id` | Satu proyek beserta peta `can{}` (tombol apa yang boleh dipakai penelepon) |
| `POST /projects` `{ name, description?, status?, priority?, leadId?, startDate?, dueDate?, members?, tasksNeedReviewDefault? }` | Buat proyek (Project Manager ke atas) → `201` detail proyek; `status` awal `draft` atau `active`; penelepon dan Pengelola utama otomatis menjadi pengelola; tanggal `YYYY-MM-DD`; kunci di luar daftar (mis. `createdBy`, `deletedAt`) diabaikan |
| `PATCH /projects/:id` `{ name?, description?, priority?, startDate?, dueDate? }` | Ubah proyek (pengelola, Admin); status dan Pengelola utama punya rute sendiri |
| `POST /projects/:id/status` `{ status }` | Pindah status: `draft`, `active`, `on_hold`, `completed`, `canceled` |
| `PUT /projects/:id/lead` `{ userId }` | Jadikan pengelola lain sebagai Pengelola utama (**sesi**) |
| `DELETE /projects/:id` | Pindahkan proyek dan tugasnya ke Sampah → `{ id, tasks }` (**sesi**, tercatat di audit; `403 ROLE_CANNOT_TRASH` untuk pengelola berperan Member) |
| `GET /projects/:id/members` | Anggota proyek, pengelola lebih dulu → `{ items }` |
| `POST /projects/:id/members` `{ userId, role }` | Tambah anggota (`manager`, `member`, `viewer`) → `201 { items }` (**sesi**); orang yang sudah anggota → `422` |
| `PATCH /projects/:id/members/:userId` `{ role }` | Ubah peran anggota (**sesi**); pengelola terakhir dan Pengelola utama tetap pengelola → `409 LAST_MANAGER`/`IS_LEAD` |
| `DELETE /projects/:id/members/:userId` | Keluarkan anggota (**sesi**); bukan diri sendiri, bukan pengelola terakhir, bukan Pengelola utama |
| `GET /projects/:id/plan` | Tahapan dan milestone proyek → `{ phases, milestones, nextMilestone, currentPhase }` (`phases[].status`: `not_started`, `in_progress`, `done`; tiap tahapan membawa `taskCount`/`doneCount`) |
| `POST /projects/:id/phases` `{ name, description?, startDate?, endDate? }` | Tambah tahapan (pengelola, Admin) → `201`; maks. 20 per proyek → `422 PHASE_LIMIT`; `endDate` sebelum `startDate` → `422 VALIDATION` |
| `PATCH /projects/:id/phases/:phaseId` `{ name?, status?, description?, startDate?, endDate? }` | Ubah tahapan; status diubah manual |
| `POST /projects/:id/phases/reorder` `{ ids }` | Susun ulang tahapan; `ids` harus memuat semua tahapan proyek |
| `DELETE /projects/:id/phases/:phaseId` | Hapus tahapan → `{ id, affectedTasks }`; tugasnya tetap ada dan dilepas dari tahapan (**sesi**) |
| `POST /projects/:id/milestones` `{ title, dueDate, description?, phaseId? }` | Tambah milestone → `201`; maks. 60 per proyek → `422 MILESTONE_LIMIT`; tahapan proyek lain → `422 VALIDATION` |
| `PATCH /projects/:id/milestones/:mid` · `POST …/:mid/reach` · `POST …/:mid/unreach` | Ubah milestone, tandai tercapai atau batalkan (idempoten); `DELETE …/:mid` hanya **sesi** |
| `POST /projects/:id/extend-deadline` `{ newDueDate, reasonCategory, reason }` | Perpanjang tenggat (pengelola, Admin; **sesi**) → `201 { project: { dueDate, originalDueDate, extensionCount }, extension }`; `reasonCategory`: `scope_change`, `dependency`, `resource`, `other`; tenggat baru harus lebih lambat → `422 NOT_LATER`; tanpa tenggat → `422 NO_DEADLINE`; proyek Selesai/Dibatalkan → `422 PROJECT_CLOSED` |
| `GET /projects/:id/extensions?limit=` | Riwayat perpanjangan, terbaru dulu → `{ items, count, total, limit }` |
| `POST /projects/:id/condition-override` `{ condition, reason, expiresAt? }` · `DELETE …` | Menimpa kondisi hitungan dengan alasan wajib (hanya proyek berjalan → `422 NOT_ACTIVE`) atau mencabutnya (**sesi**, tercatat di audit) |
| `GET /projects/:id/activity?limit=&cursor=` | Aktivitas terakhir proyek dalam kalimat → `{ items, nextCursor }` (keyset; kursor palsu → `422`) |
| `GET /team/picker?q=&projectId=&limit=` | Pemilih orang → `{ items: [{ id, name, jobTitle, image }] }`; tanpa `projectId` hanya untuk yang boleh membuat proyek |
| `GET /team?projectId=&q=&sort=name\|active\|overdue&limit=&offset=` | **Tim** (S6): orang yang berbagi proyek dengan penelepon, Admin melihat semua akun aktif → `{ summary: { people, projects, active?, overdue? }, people: [{ id, name, jobTitle, image, isSelf, projects, load?, availability }], total }`; `limit` bawaan 24, maks. 50; `projectId` yang tidak diikuti dijawab `404`. `availability` (status Cuti, satu kueri tambahan per halaman) selalu ada: `{ kind: 'on_leave', until }` untuk cuti disetujui yang mencakup hari ini (terlihat semua orang yang boleh melihat orangnya), `{ kind: 'pending', from, to }` untuk pengajuan yang menunggu (hanya pemohon, Project Manager, dan Admin), selain itu `null` (tidak ada yang ditampilkan, bukan "tersedia"); tanggal `YYYY-MM-DD` zona tim. `sort=active` (tugas aktif terbanyak) dan `sort=overdue` (terlambat terbanyak) mengurutkan **seluruh tim** (pindai paling banyak 200 orang urut nama, lalu dipotong per halaman), hanya untuk yang boleh melihat angka orang lain; selain itu `422 SORT_NOT_ALLOWED`. Orang tanpa angka yang terlihat diurutkan terakhir |
| `GET /team/:userId` | **Tim** (S6): satu orang — profil, proyek bersama, dan (bila berhak) paling banyak 20 tugas aktif, yang terlambat dulu → `{ person, projects, availability, tasks?, tasksVisible, load?, alsoElsewhere?, accountRole? }` (`availability` seperti di daftar); `phone` hanya untuk diri sendiri dan Admin; `accountRole` (`member`, `project_manager`, `admin`, `super-admin`) **hanya ada bagi Admin dan Super-admin** (untuk peran lain kuncinya tidak ada, bukan `null`); orang yang tidak berbagi proyek dijawab `404` |
| `GET /profile` | Profil sendiri |
| `PATCH /profile` `{ displayName?, nickname?, phone?, jobTitle?, department?, textSize? }` | Ubah profil sendiri (**sesi**); `nickname` (maks. 30 karakter) adalah nama panggilan untuk sapaan Beranda; `textSize` salah satu `normal`, `besar`, `sangat_besar` dan ikut mengatur cookie ukuran teks |
| `GET /profile/notifications` | Dua saklar pemberitahuan sendiri `{ eventReminder, inboxNews }` (nyala bila belum pernah dimatikan) |
| `PUT /profile/notifications` `{ eventReminder?, inboxNews? }` | Nyalakan atau matikan saklar (**sesi**; hanya yang dikirim yang berubah). Kartu "Perlu Anda tanggapi" tidak punya saklar dan selalu tampil |
| `GET /profile/delete-check` | `{ canDelete, projects[{ id, name }], total }`: proyek aktif yang hanya Anda kelola (**sesi**; `403 IMPERSONATING` saat menyamar). Selama ada, hapus akun sendiri ditolak `409 SOLE_MANAGER` |
| `GET /trash?kind=&page=&limit=` | Proyek, tugas, dan acara di Sampah yang boleh dilihat penelepon → `{ items, total, page, limit, counts: { project, task, event } }`, yang terbaru dihapus di atas. `kind` = `all` (bawaan), `project`, `task`, atau `event`; tiap item punya `kind`. Tugas atau acara yang ikut terhapus bersama proyeknya tidak jadi baris sendiri; yang dihapus lebih dulu tetap baris sendiri dengan `blockedBy` selama proyeknya di Sampah. Tiap item membawa `deletedAt`, `deletedBy`, `restorableUntil`, `daysLeft` (sisa hari yang dihitung server) dan `can`; proyek membawa `cascade: { tasks, events }` (yang ikut terhapus bersamanya), tugas dan acara membawa `projectInTrash` serta `blockedBy: { projectId, name, visible }` (`visible`: penelepon bisa menemukan proyek itu di daftar Sampah). Item acara juga membawa `title`, `eventKind`, `startsAt`, dan `project`. Item yang sudah lewat masa simpan (30 hari) dihapus permanen oleh pembersihan otomatis harian |
| `POST /trash/project/:id/restore` | Pulihkan proyek dan tugasnya → `{ id, tasks }` (**sesi**, tercatat di audit); lewat masa simpan → `410 EXPIRED` |
| `DELETE /tasks/:ref` | Pindahkan satu tugas ke Sampah (hapus lunak, tanpa dialog di layar; "Urungkan" memanggil pulihkan) → `{ trash: { kind: 'task', id, number, label } }` (**sesi**, tercatat di audit). Boleh: pembuat tugas, pengelola proyek, Admin; Pemantau dan pengerja yang bukan pembuat `403`; tugas yang sudah di Sampah atau tidak terlihat `404` |
| `POST /trash/task/:id/restore` | Pulihkan satu tugas dengan nomor yang sama → `{ id, number }` (**sesi**, tercatat di audit); proyeknya masih di Sampah → `409 PROJECT_IN_TRASH`, lewat masa simpan → `410 EXPIRED` |
| `POST /trash/event/:id/restore` | Pulihkan satu acara beserta tamu dan notulensinya → `{ id }` (**sesi**, tercatat di audit). Boleh: pembuat acara, pengelola proyek, Admin; proyeknya masih di Sampah → `409 PROJECT_IN_TRASH`, lewat masa simpan → `410 EXPIRED`. Memulihkan proyek ikut memulihkan acara yang ikut terhapus bersamanya |

**Angka beban Tim.** Kunci `load`, `alsoElsewhere`, dan `summary.active`/`overdue` **tidak dikirim** (bukan `null`, bukan `0`) bila penelepon tidak berhak melihatnya: Admin melihat semua proyek, Pengelola hanya proyek yang ia kelola (ditambah `alsoElsewhere: true` tanpa jumlah bila orang itu juga bekerja di luar sana), dan angka diri sendiri selalu terlihat. `sort=overdue` hanya untuk Admin dan pengelola minimal satu proyek; yang lain mendapat `422 SORT_NOT_ALLOWED`, bukan urutan nama secara diam-diam. Pengurutan itu mengurutkan **halaman yang sedang tampil**, bukan seluruh tim: jumlah tugas baru diketahui setelah satu halaman orang dipilih, dan itulah yang menjaga daftar Tim tetap empat kueri berapa pun jumlah orangnya. Daftar Tim tidak menampilkan akun yang diblokir maupun yang belum disetujui kepada siapa pun; halaman detail orang boleh dibuka Admin, sedangkan yang lain mendapat `404` yang sama seperti akun yang tidak ada.

Halaman S1 (semua butuh login): `/app/projects` (daftar), `/app/projects/new` (pilih cara membuat proyek; formulirnya di `/app/projects/new?cara=form`), `/app/projects/:projectId` (ringkasan) dengan tab `/tasks`, `/phases` (Tahapan dan milestone), `/members`, dan `/settings` (Ubah proyek), `/app/trash` (Sampah), dan `/app/settings` (Pengaturan; bagian Ketersediaan untuk mengajukan atau membatalkan cuti, Persetujuan cuti untuk Project Manager dan Admin, dan saklar Cuti perlu persetujuan untuk Admin). `/profile` dialihkan ke `/app/settings`.

Halaman Tim (semua butuh login): `/app/team` (daftar orang, urut Nama atau Tugas aktif terbanyak, saring proyek dan nama) dan `/app/team/:userId` (detail orang: profil, proyek bersama, tugas aktif; kartu Peran akun hanya untuk Admin dan Super-admin). Kartu orang dan profil menampilkan status Cuti bila ada (**Cuti sampai 16 Okt**; **Pengajuan cuti 14–16 Okt** hanya bagi pemohon, Project Manager, dan Admin); tanpa cuti tidak ada tulisan apa pun.

Halaman Event (semua butuh login): `/app/events` (daftar acara: tab Akan datang/Sudah lewat, cari, saring jenis dan proyek), `/app/events/new` (form dua tahap; tombolnya hanya untuk yang boleh membuat acara), dan `/app/events/:id` (detail acara dengan menu ⋯: Batalkan dengan alasan, Hapus ke Sampah dengan Urungkan). Kalender, notulensi di layar, dan acara berulang belum ada; notulensi di detail acara tampil sebagai teks "segera hadir".

Halaman Inbox (butuh login): `/app/inbox` (tab Perlu Anda tanggapi dan Kabar terbaru, `?tab=info` membuka tab kedua). Kartu "Perlu Anda tanggapi" punya satu tombol ke tempat tujuannya; kartu pengajuan cuti punya dua (**Setujui** dengan konfirmasi dan **Tolak** dengan alasan opsional) yang memakai `POST /api/app/leave/:id/approve|reject`, sehingga Pengaturan tidak lagi punya daftar persetujuan cuti. Lonceng di sidebar dan header HP dan lencana menu membaca `GET /api/app/inbox/count` tiap 60 detik.

### Kontrak API Beranda

`GET /api/app/home` (sesi atau API key ber-scope `app:read`; tidak ada rute tulis) menjawab seluruh layar Beranda dalam satu panggilan, selalu untuk penelepon sendiri (`userId` di query diabaikan). Jawabannya `{ now, briefing, counters, focus, done, projects, agenda, activity, ask }`; setiap bagian selain `now` berbentuk `{ ok: true, data }` atau `{ ok: false }` bila bagian itu gagal dimuat, sehingga satu bagian yang rusak tidak mengosongkan halaman.

- `now`: `{ iso, today, timeZone, greeting, dateLabel, timeLabel }`. "Hari ini", sapaan (`pagi`, `siang`, `sore`, `malam`), tanggal, dan jam penyusunan dihitung server di zona waktu app, bukan di klien.
- `briefing`: `{ lines, updatedLabel }`, beberapa kalimat yang disusun dengan aturan dari data nyata (tugas terlambat, menunggu diperiksa, tugas dan acara hari ini, proyek yang perlu perhatian), **tanpa model AI**; `updatedLabel` adalah jam penyusunan sebenarnya.
- `counters`: tugas tanpa penanggung jawab, sedang dikerjakan, dan selesai di proyek yang penelepon **kelola** (pengelola proyek), plus `managedProjects` dan `memberProjects`.
- `focus`: sampai 5 tugas aktif milik penelepon, paling mendesak dulu (`action` = `complete`, `start`, atau `null` menurut izin), `total`, `overdueTotal`, `todayTotal`, dan tugas yang menunggu pemeriksaan penelepon. `done`: tugas selesai sejak Senin 00.00. `projects`: proyek berjalan yang diikuti dengan kondisi dan progres yang sama dengan menu Proyek. `activity`: perubahan dan catatan terbaru di proyek yang diikuti. `agenda`: sama dengan `GET /events/agenda`, tiap acara bertanda `today` atau `tomorrow`.
- `ask`: tiga jawaban tetap (proyek yang tertinggal, tugas yang paling lama terlambat, siapa yang paling banyak tugas) dari data nyata; belum ada tanya bebas.

### Kontrak API Inbox (S3)

Semua di `/api/app/inbox` (sesi atau API key ber-scope `app:read`/`app:write`). Inbox hanya milik penelepon: `userId` di query diabaikan, dan kartu orang lain dijawab `404` yang sama dengan kartu yang tidak ada. **Tidak ada rute untuk membuat atau menghapus kartu** — kartu muncul karena sebuah layanan memanggil `notify()` dan hilang karena layanan menutupnya, jadi klien tidak bisa memalsukannya. Kunci API memakai kartu pemilik kunci itu.

| Endpoint | Fungsi |
|---|---|
| `GET /inbox?lane=action\|info&limit=&cursor=` | Satu halaman kartu → `{ items, nextCursor }`; `lane` bawaan `action` (perlu ditanggapi), `info` = kabar terbaru. Kelompok hari (hari ini, kemarin, lebih lama) dihitung server. Kursor rusak → `400 BAD_CURSOR`; `limit` di atas batas → `422` |
| `GET /inbox/count` | Angka lonceng → `{ action, infoUnread }`. **Dikecualikan dari rate limit per IP** (tiap tab terbuka menanyakannya tiap 60 detik) dan tidak pernah di-cache |
| `POST /inbox/:id/read` | Tandai satu kartu sudah dibaca → `{ ok: true }` (idempoten) |
| `POST /inbox/read-all` | Tandai semua kabar terbaru sudah dibaca → `{ updated }`; antrean tindakan tidak disentuh |

### Kontrak API Event (S7)

Semua di `/api/app/events`. Acara boleh milik proyek atau pribadi (`projectId: null`: hanya pembuat dan tamunya yang melihat). Acara yang tidak boleh dilihat dijawab `404` yang sama dengan acara yang tidak ada. Pemantau tidak bisa membuat acara di proyek yang hanya ia pantau (`403 NOT_MEMBER`), dan proyek di Sampah menolak acara baru (`409 PROJECT_IN_TRASH`). Bodi permintaan **ditutup**: field yang belum ada (berulang, hasil rapat) dijawab `422`, bukan diabaikan diam-diam. `meetingUrl` hanya menerima alamat `http://` atau `https://`; skema lain (mis. `javascript:`) dijawab `422 VALIDATION`.

| Endpoint | Fungsi |
|---|---|
| `GET /events?tab=upcoming\|past&kind=&projectId=&q=&limit=&cursor=` | Daftar acara yang boleh dilihat → `{ items, nextCursor, caps: { createEvent } }`; `kind` boleh diulang (`meeting`, `review`, `important`, `team`, `other`). Kursor rusak → `400 BAD_CURSOR` |
| `GET /events/agenda` | Agenda Beranda: paling banyak 4 acara saya yang belum berakhir (yang sedang berlangsung ikut) dan mulai paling lambat besok → `{ items }` |
| `GET /events/people?projectId=&q=` | Calon tamu → `{ items }` (nama dan jabatan saja); memakai aturan pemilih Tim di atas, jadi tanpa `projectId` hanya untuk yang boleh membuat proyek; form Event baru tidak memakai endpoint ini, melainkan `GET /team?q=` |
| `GET /events/:id` | Satu acara beserta tamu, notulensi, dan peta `can{}` |
| `POST /events` `{ title, startsAt, endsAt, projectId?, participantIds?, kind?, locationType?, locationText?, meetingUrl?, agenda?, remindersMinutes? }` | Buat acara dan undang tamunya dalam satu transaksi → `201` detail; `endsAt` harus setelah `startsAt` |
| `PATCH /events/:id` (field sama, semua opsional) | Ubah acara; memindahkan `startsAt` menyetel ulang pengingatnya. Acara tidak bisa pindah proyek dan tamu tidak diubah di sini (`projectId`/`participantIds` → `422`) |
| `POST /events/:id/cancel` `{ reason }` | Batalkan acara (**sesi**); barisnya tetap terlihat bersama alasan karena tamu sudah merencanakan sesuatu — membatalkan bukan menghapus |
| `POST /events/:id/participants` `{ userIds }` | Undang tamu (**sesi**); mengundang yang sudah ada tidak menjadi galat |
| `DELETE /events/:id/participants/:userId` | Keluarkan satu tamu (**sesi**); mengeluarkan yang tidak ada tidak menjadi galat |
| `DELETE /events/:id` | Pindahkan acara ke Sampah (hapus lunak, tanpa dialog di layar; "Urungkan" memanggil pulihkan) → `{ trash: { kind: 'event', id, label } }` (**sesi**, tercatat di audit). Boleh: pembuat acara, pengelola proyek, Admin; tamu biasa dan Pemantau `403 NOT_MANAGER`; acara yang sudah di Sampah atau tidak terlihat `404`. Menghapus proyek ikut memindahkan acaranya |
| `PUT /events/:id/note` `{ body, status?, baseUpdatedAt? }` | Simpan notulensi (`draft` atau `confirmed`). Kunci optimis: penyimpan kedua dijawab `409 NOTE_CONFLICT` **beserta notulensi terbaru** sehingga ketikan yang belum tersimpan tidak hilang; acara yang dibatalkan → `409 EVENT_CANCELED`; notulensi `confirmed` sudah final → `409 WRONG_STATE`. Isi notulensi tidak pernah masuk log |

### Kontrak API Cuti

Semua di `/api/app/leave` (sesi atau API key ber-scope `app:read`/`app:write`). Pengajuan adalah rentang tanggal `startDate`..`endDate` (`YYYY-MM-DD`, kedua ujung dihitung, zona waktu tim) dengan `note` opsional; tanpa jenis cuti dan tanpa saldo. Mulai hari ini boleh, tanggal yang sudah lewat tidak, `endDate` tidak boleh sebelum `startDate`, dan satu pengajuan paling lama 90 hari. Status: `pending`, `approved`, `rejected`, `canceled`. Pengajuan **Admin** langsung `approved`, begitu pula semua pengajuan bila saklar "Cuti perlu persetujuan" mati. Penyetuju Member: Pengelola (peran Project Manager yang mengelola proyek yang diikuti Member itu) atau Admin; penyetuju Project Manager: Admin saja. Tidak ada yang menyetujui pengajuannya sendiri, dan yang pertama memutuskan menang. Pengajuan orang lain yang tidak boleh dilihat dijawab `404` yang sama dengan pengajuan yang tidak ada. Tiap penulisan menjawab `{ request }`.

| Endpoint | Fungsi |
|---|---|
| `GET /leave/me` | Keadaan sendiri → `{ state: 'none'\|'pending'\|'approved'\|'rejected', request \| null, history[], requiresApproval }`. `request` adalah cuti yang sedang berjalan atau paling dekat; `rejected` hanya bila pengajuan terakhir ditolak dan belum diajukan lagi. `history` paling banyak 10, terbaru dulu |
| `POST /leave` `{ startDate, endDate, note? }` | Ajukan cuti → `201`. Tanggal tidak sah, lewat, atau terlalu panjang `422 VALIDATION`; beririsan dengan pengajuan `pending`/`approved` lain `409 LEAVE_OVERLAP` |
| `DELETE /leave/:id` | Batalkan pengajuan `pending`, atau cuti `approved` sampai hari terakhirnya (**sesi**, tercatat di audit). Orang lain yang boleh melihatnya `403 NOT_OWNER`; yang sudah `rejected`/`canceled` atau sudah lewat `409 WRONG_STATE` |
| `GET /leave/pending?page=&limit=` | Pengajuan `pending` yang boleh diputuskan penelepon → `{ items, total, page, limit }`, mulai paling dekat; tiap item `{ id, requester: { id, name }, startDate, endDate, days, note, createdAt, dueTasks }`. `dueTasks` = tugas pemohon yang belum selesai dengan tenggat di dalam rentang. Untuk Member daftarnya kosong |
| `POST /leave/:id/approve` | Setujui (**sesi**, tercatat di audit). Sudah diputuskan `409 ALREADY_DECIDED`; tanggal terakhirnya lewat `409 LEAVE_EXPIRED`; milik sendiri `403 SELF_TARGET` |
| `POST /leave/:id/reject` `{ reason? }` | Tolak dengan alasan opsional, paling banyak 300 karakter (**sesi**, tercatat di audit); galat sama dengan `approve` |
| `GET /leave/settings` | Saklar workspace → `{ requiresApproval }` (semua yang masuk) |
| `PUT /leave/settings` `{ requiresApproval }` | Ubah saklar (**sesi**, hanya Admin dan Super-admin, selain itu `403 NOT_ADMIN`; tercatat di audit) |

Kartu Inbox: `leave_requested` (antrean tindakan penyetuju, dua tombol **Setujui**/**Tolak**, hilang untuk penyetuju lain begitu diputuskan atau dibatalkan) dan `leave_decided` (kabar untuk pemohon). Status di menu Tim dihitung dari tanggal oleh `leaveStatusFor`: "Cuti sampai …" untuk cuti `approved` yang mencakup hari ini, "Pengajuan cuti …" untuk `pending` (hanya pemohon, Project Manager, dan Admin).

### Kontrak API Tulis saja (A1)

`POST /api/app/tasks/draft` `{ projectId, text }` menyusun **draf** tugas dari satu cerita penugasan dan **tidak menyimpan apa pun**; klien membuat tugasnya sendiri lewat `POST /api/app/tasks`. `text` 1 sampai 2000 karakter (kosong → `400 TEXT_EMPTY`, terlalu panjang → `400 TEXT_TOO_LONG`). Izinnya sama dengan membuat tugas di proyek itu: Pemantau `403 NOT_MEMBER`, bukan anggota `404`, proyek di Sampah `409 PROJECT_IN_TRASH`. Jawaban `200`: `{ drafts: [{ title, assigneeId, assigneeNote, dueDate, priority, kindId, description }], question }`, paling banyak 10 draf. Nama hanya dicocokkan dengan Pengelola dan Anggota proyek itu (nama yang cocok dengan dua orang menjadi satu `question` berisi kandidat, tidak ditebak), dan `dueDate` dihitung server dari "hari ini" di zona waktu app, bukan oleh AI. Bentuk lengkap ada di `server/ai/task-draft.types.ts`.

- **Penyedia:** Anthropic Messages API lewat `fetch`, tanpa paket tambahan. Atur dengan `ANTHROPIC_API_KEY` (wajib untuk menyalakan), `TASK_AI_MODEL`, `TASK_AI_TIMEOUT_MS`, `TASK_AI_MAX_TOKENS`, dan `ANTHROPIC_BASE_URL`; semuanya dibaca saat dipakai, dan app tetap berjalan tanpa kunci.
- **Di layar:** Tugas baru (`/app/tasks/new`) membuka **Tulis saja ✦** lebih dulu bila kunci AI terpasang; tanpa kunci, halaman membuka **Isi form** dan pilihan Tulis saja nonaktif dengan alasannya. Draf yang dicentang dibuat satu per satu lewat `POST /api/app/tasks`; satu draf yang gagal tidak menghentikan yang lain dan bisa dicoba lagi tanpa menggandakan yang sudah tersimpan.
- **Gagal lunak:** tanpa kunci → `503 AI_DISABLED`; penyedia gagal, lambat, atau menjawab sesuatu yang tidak sah → `502 AI_UNAVAILABLE`. Klien lalu menampilkan form dengan tulisan pengguna di Judul.
- **Batas:** 10 permintaan per menit per pengguna (`429 RATE_LIMITED` dengan `retry-after`), berlaku juga untuk API key (scope `app:write`).
- **Privasi:** ke penyedia hanya dikirim tulisan, nama tampilan anggota, nama jenis tugas, dan daftar prioritas. Tulisan dan jawaban model tidak pernah masuk log; log hanya memuat id pengguna, id proyek, lama panggilan, dan hasil.

## API keys

Akses terprogram ke `/api/*` tanpa cookie sesi. Dikelola super-admin di `/dev/api-keys`; dibangun di atas plugin `@better-auth/api-key` (kunci di-hash, hanya prefix yang disimpan terbaca).

- **Format & header** — kunci `sp_live_…`, dikirim lewat `X-API-Key: <key>` atau `Authorization: Bearer <key>`. Nilai asli hanya ditampilkan **sekali** saat dibuat/dirotasi.
- **Scope** — tiap route memetakan ke satu scope (`server/api-keys/scopes.ts`, mis. `users:read`, `analytics:write`, `me:read`, `app:read`). Kunci tidak pernah melebihi role pemiliknya: scope di atas role ditolak saat dibuat, dan jika role pemilik turun belakangan request mendapat `403 ROLE_TOO_LOW`. Route auth dan manajemen kunci tidak bisa diakses dengan kunci; MCP butuh scope `mcp`.
- **Rute khusus sesi** — kunci selalu mendapat `403` (`Endpoint ini tidak bisa diakses dengan API key`), apa pun scope-nya, untuk `DELETE /api/app/projects/*`, semua metode `/api/app/projects/*/members*`, `PUT /api/app/projects/*/lead`, `POST /api/app/projects/*/extend-deadline`, `POST /api/app/projects/*/condition-override`, `PATCH /api/app/profile`, `PUT /api/app/profile/notifications`, `GET /api/app/profile/delete-check`, `DELETE /api/app/tasks/*` (hapus tugas, termasuk langkah dan komentarnya), `POST /api/app/trash/*`, `DELETE /api/app/events/*` (hapus acara ke Sampah dan keluarkan tamu), `POST /api/app/events/*/cancel`, semua metode `/api/app/events/*/participants*`, `POST /api/app/leave/*/approve|reject`, `DELETE /api/app/leave/*`, `PUT /api/app/leave/settings`, dan semua metode `/api/app/avatar`, serta untuk menyetujui, menolak, mengubah role akun (`/api/admin/users/:id/approve|reject|role`), mengelola undangan (`/api/admin/invitations*`), dan mengunduh ekspor massal (`/api/admin/export/*`). Rute ini juga tidak muncul di `/api/openapi.json`.
- **Kedaluwarsa & rotasi** — default 90 hari, maksimum 1 tahun; tanpa kedaluwarsa hanya untuk pemilik super-admin. Rotasi membuat kunci baru dengan pengaturan sama dan memberi kunci lama masa tenggang 24 jam. Cabut = permanen tapi riwayat tetap; hapus = baris dan riwayatnya hilang.
- **Pembatasan** — rate limit per kunci (opsional, `429 RATE_LIMITED`), daftar IP/prefix yang diizinkan (`403 IP_NOT_ALLOWED`, dicocokkan dengan IP klien hasil `TRUSTED_PROXIES` sehingga tidak bisa dipalsukan lewat `X-Forwarded-For`), nonaktifkan sementara (`401 KEY_DISABLED`).
- **Jejak pemakaian** — tiap request dicatat ke `api_key_usage` (method, path, status, IP, negara, UA, durasi) secara batch, lalu digulung per hari ke `api_key_usage_daily` (job tiap jam, upsert monoton) sehingga grafik 90 hari dan total seumur kunci tetap murah dan tidak hilang saat retensi menghapus baris mentah. Halaman detail menampilkan total, harian 90 hari, endpoint/IP/negara tersering, request terakhir, dan penanda anomali (negara baru, lonjakan 4xx/5xx). Tab **Log penggunaan** di `/dev/api-keys` menampilkan log lintas kunci dengan filter dan export CSV. Retensi baris mentah diatur di Settings → Retensi log.
- **Kunci pribadi** — setiap user yang masuk bisa membuat kunci sendiri di `/app/settings` bagian **Lanjutan** (maks. 10 aktif) lewat `/api/me/api-keys`; scope dibatasi role-nya, hanya pemiliknya yang bisa mengelola, dan kunci API tidak bisa dipakai untuk mengelola kunci. Overview `/dev` dan sidebar memperingatkan kunci yang berakhir dalam 7 hari.
- **API** (`/api/api-keys`, super-admin, semua aksi teraudit): `GET` list (`page`, `limit`, `search`, `status`, `ownerId`, `scope`), `GET /stats`, `GET /scopes`, `POST` buat (mengembalikan `key` sekali), `GET /:id`, `GET /:id/usage`, `PUT /:id`, `POST /:id/rotate`, `POST /:id/revoke`, `DELETE /:id`; log lintas kunci `GET /api/api-keys/usage` (`keyId`, `status=2xx|4xx|5xx|errors`, `method`, `search`, `days`, `page`, `limit`) dan `GET /api/api-keys/usage/export` (CSV, maks. 10.000 baris). Kunci pribadi: `/api/me/api-keys` dengan operasi yang sama tanpa `ownerId`.
- **Spec OpenAPI** — `GET /api/openapi.json` dengan key apa pun mengembalikan OpenAPI 3 yang dibangkitkan dari validasi route (`@elysia/openapi`), difilter ke scope key dan role pemiliknya, plus endpoint baca publik. MCP, auth, dan manajemen kunci tidak dicantumkan. Skema respons belum ada karena route belum mendeklarasikannya.
- **MCP** — `/api/mcp` menerima API key ber-scope `mcp` (`Authorization: Bearer sp_live_…`, hanya pemilik super-admin), sehingga tiap agent punya kunci sendiri yang bisa dicabut dan terlacak pemakaiannya. `MCP_ADMIN_TOKEN` di env tetap diterima sebagai jalur lama (header Bearer atau `?mcpAdminToken=`); tanpa env itu, hanya API key yang diterima. Contoh `.mcp.json` ada di `.mcp.json.example` (kunci dari env `SIMPLE_PM_MCP_KEY`).

## Rate limiting

Setiap request `/api/*` dibatasi per IP klien dengan *sliding-window counter* (hitungan jendela sebelumnya + jendela berjalan, dibobot sisa waktu). IPv4 dihitung per alamat; IPv6 dihitung per prefix **/64** (mis. `2001:db8:1:2::/64`), karena satu pelanggan IPv6 biasanya memegang seluruh /64 dan bisa berganti alamat sesukanya — log tetap mencatat IP lengkap. Default 100 request / 60 detik dari env `RATE_LIMIT_MAX` dan `RATE_LIMIT_WINDOW_MS`; super-admin bisa menimpanya (batas, jendela, path yang dikecualikan, atau mematikan sementara) di `/dev/settings` tanpa restart — nilai tersimpan di `app_setting`, `NULL` berarti pakai default env. `/api/auth/*` (Better Auth) dan `/api/mcp` (API key/token) dikecualikan dari limiter ini. Setiap response membawa `X-RateLimit-Limit` / `X-RateLimit-Remaining`, dan request yang ditolak tidak ikut dihitung. Limiter berjalan di `onRequest`, **sebelum** verifikasi API key dan routing — banjir request dengan `x-api-key` palsu ditolak `429` tanpa menyentuh database, dan path `/api/*` yang tidak ada (404) ikut dihitung. Mengubah lama jendela di settings mereset semua hitungan; mengubah batas saja tidak.

Request yang ditolak mendapat `429` dengan header `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Request-Id`, dan body berformat error API standar (`Retry-After` = waktu tunggu tepat sampai satu request lagi diterima; dengan batas yang sangat kecil nilainya bisa melebihi lama jendela, paling lama ≈ jendela × (1 + 1/batas)):

```json
{
  "error": "Terlalu banyak request. Coba lagi dalam 42 detik.",
  "code": "RATE_LIMITED",
  "status": 429,
  "requestId": "…",
  "retryAfterSeconds": 42
}
```

**Login** (`/api/auth/*`) dibatasi oleh rate limit bawaan Better Auth, aktif di production (penyimpanan memori, aturan khusus default untuk sign-in). Better Auth membaca IP klien yang sama dengan limiter aplikasi (`advanced.ipAddress.ipAddressHeaders`), sehingga tiap klien punya bucket login sendiri. Respons 429 Better Auth (`{ message }` + header `X-Retry-After`) ditampilkan di halaman login sebagai pesan berbahasa Indonesia.

### IP klien & `TRUSTED_PROXIES`

IP klien dihitung **sekali** di tepi HTTP (`server/dev.ts`, `server/prod.ts`) lalu dipakai oleh rate limit, Better Auth, allow-list IP API key, dan semua log. Header `X-Forwarded-For` / `X-Real-IP` dari luar **tidak dipercaya** kecuali request datang langsung dari proxy yang terdaftar di env `TRUSTED_PROXIES`:

| `TRUSTED_PROXIES` | Perilaku |
|---|---|
| kosong (default) | Tidak ada proxy yang dipercaya. `X-Forwarded-For` / `X-Real-IP` diabaikan; IP socket adalah IP klien. Cocok bila app langsung menerima koneksi dari internet. |
| daftar IP/CIDR | Bila IP socket cocok dengan daftar, `X-Forwarded-For` dibaca dari kanan ke kiri dengan melewati entri yang juga terpercaya; IP valid pertama yang tidak terpercaya adalah klien. Bila semua entri terpercaya, entri paling kiri yang dipakai. `X-Real-IP` hanya dipakai bila `X-Forwarded-For` tidak ada; tanpa keduanya, IP socket. |

Setiap entri `X-Forwarded-For` dinormalisasi dulu: spasi dibuang, port dilepas (`1.2.3.4:5678`, `[2001:db8::1]:80`), kurung siku IPv6 dilepas, dan `::ffff:1.2.3.4` dibaca sebagai `1.2.3.4`. Entri yang **tetap bukan IP valid** (mis. `unknown`) menghentikan pembacaan dan IP socket yang dipakai — entri di kirinya bisa ditulis klien, jadi tidak pernah dipercaya.

> **Proxy harus menimpa header:** proxy terpercaya wajib **menimpa** `X-Real-IP` dan menambahkan IP peer-nya sendiri ke `X-Forwarded-For` (perilaku default nginx `proxy_add_x_forwarded_for`, Caddy, dan load balancer cloud). Proxy yang meneruskan `X-Real-IP` dari klien apa adanya membuat IP bisa dipalsukan saat `X-Forwarded-For` tidak dikirim. Bila proxy menyertakan port, alamat IPv6 wajib dikurung siku (`[2001:db8::1]:443`) — bentuk tanpa kurung bersifat ambigu (`2001:db8::1:443` sendiri adalah IPv6 valid) dan terbaca sebagai alamat lain.

Nilainya dipisah koma, boleh campuran IPv4, IPv6, dan CIDR. Entri yang tidak valid membuat server **gagal boot** dengan pesan yang jelas. `0.0.0.0/0` atau `::/0` diterima tetapi memicu peringatan saat boot: semua peer dianggap proxy, sehingga setiap klien bisa memalsukan IP-nya. Contoh:

```bash
# nginx/Caddy di mesin yang sama
TRUSTED_PROXIES=127.0.0.1,::1

# load balancer di jaringan privat
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

Di belakang Cloudflare (proxy oranye, origin menerima koneksi langsung dari edge), isi dengan rentang IP Cloudflare yang dipublikasikan resmi (IPv4 + IPv6), ditambah proxy lokal bila ada. Lewat **Cloudflare Tunnel** (`cloudflared`), peer origin adalah `cloudflared` itu sendiri: isi dengan IP-nya (`127.0.0.1,::1` bila satu host, atau IP/subnet container bila di Docker) — rentang IP Cloudflare tidak diperlukan.

Cek hasilnya di **`/dev/tools` → Status proses**: "Proxy tepercaya" berwarna oranye bila request datang lewat proxy yang tidak dipercaya (atau ada entri `/0`), dan "IP Anda" harus menampilkan IP publik Anda, bukan IP proxy. Bila konfigurasinya terdeteksi salah, konsol `/dev` menampilkan banner berisi panduan sesuai setup yang terdeteksi (Cloudflare, Cloudflare Tunnel, atau nginx) beserta baris `.env` siap-salin, dan server mencatat warning sekali per proses.

> **Wajib di belakang proxy:** bila app berjalan di belakang reverse proxy, load balancer, atau Cloudflare tanpa `TRUSTED_PROXIES`, semua klien terlihat sebagai IP proxy — semua orang berbagi satu bucket rate limit (dan satu bucket login), allow-list IP API key tidak berguna, dan log mencatat IP proxy.

Server menulis hasilnya ke header internal `x-simple-pm-client-ip` (selalu ditimpa, tidak pernah dipercaya dari luar); kode server membacanya lewat `resolveClientIp()` di `server/middleware/client-ip.ts`, bukan dari `X-Forwarded-For` langsung.

### Log & batas memori

Plugin `rateLimitPlugin()` harus didaftarkan **sebelum** `apiKeyPlugin()` di `server/api/index.ts` — hook `onRequest` berjalan sesuai urutan pendaftaran, jadi urutan itulah yang membuat limiter menolak sebelum verifikasi API key. Penolakan dicatat ke `rate_limit_log` (method, path, IP, geo, perangkat) per **episode**: paling banyak satu baris per IP per jendela rate limit (penolakan pertama), bukan setiap request yang ditolak — klien yang terus membanjiri API tidak ikut membanjiri database. Log ditampilkan di `/dev/rate-limit-logs` dengan API `/api/analytics/rate-limit-logs` (`search`, `ip`, `path`, `method`, `country`, `device`, `days`, `/stats`, `/export`, `DELETE` massal).

State limiter ada di memori proses: tiap klien hanya menyimpan dua hitungan (O(1), tidak bergantung pada nilai batas), dengan maksimum `MAX_TRACKED_KEYS` (10.000 klien, `server/rate-limit.ts`) sehingga memori terbatas apa pun batas yang diset. Urutan kunci LRU; saat penuh, sekumpulan kunci yang paling lama tidak dipakai (10% kapasitas) dikeluarkan tanpa memindai seluruh map, dan hitungannya ikut ter-reset. Kunci kedaluwarsa juga dibuang berkala. Karena per proses, batas berlaku per instance — untuk multi-instance gunakan store bersama seperti Redis.

## File health & penyelamat konteks agent

`/dev/file-health` (super-admin) memindai seluruh repo (kecuali `node_modules`, `build`, `.git`, cache) dan menilai setiap file teks:

- **Limit baris per peran** — route/handler 150, service 300, repository/query 250, schema 200, types 300, utility 200, config 100, test 400, page/component 300; hard limit global 500 baris / 20.000 karakter. Migration, generated, seed, fixture, lockfile, dan skill vendor (`.agents/`) dikecualikan. Aturan ada di `server/file-health/file-health.rules.ts`.
- **Risiko konteks agent** — estimasi token (≈ 4 karakter/token). ≥ 5.000 token = hati-hati, ≥ 15.000 = bahaya. Tujuannya mencegah AI agent membaca file seperti `bun.lock` secara utuh dan menghabiskan context window.

Agent bisa mengecek sendiri lewat tool MCP `check_file_health` (server `simple-pm-debug`): tanpa argumen mengembalikan ringkasan, file lewat/hampir limit, dan daftar file berbahaya; dengan `path` mengembalikan metrik + saran cara membaca file itu. REST: `GET /api/file-health` (filter `status`, `kind`, `hazard`, `search`, `sort`, `page`, `limit`, `refresh=true` untuk melewati cache 30 detik) dan `GET /api/file-health/file?path=`.

## Testing

```bash
bun run test
```

Semua test ada di root `tests/` (mirror struktur `server/`). Test **selalu** memakai database terpisah dari dev/prod. Preload `tests/preload.ts` (didaftarkan di `bunfig.toml`, jadi berlaku juga untuk `bun test` langsung) memaksa `NODE_ENV=test` lalu mengarahkan `DATABASE_URL` ke database test:

- **Mode Postgres lokal** (`DATABASE_URL` kosong): database `<nama package>_test` dibuat dan dimigrasi otomatis di cluster lokal. Cluster yang sedang dipakai `bun run dev` ikut dipakai; kalau belum jalan, cluster dinyalakan selama test.
- **Postgres eksternal:** set `DATABASE_URL_TEST` di `.env`. Tanpa variabel ini, `server/db` menolak dimuat saat test agar data dev tidak terhapus. Migrasi baru harus dijalankan ke kedua database.

Pola autentikasi di integration test: stub `auth.api.getSession` dan `resolveUserRole` dengan `spyOn` lalu pakai guard asli (lihat `tests/api/posts.test.ts`, `tests/api/me-api-keys.test.ts`). `mock.module('../../server/guard', …)` hanya aman untuk route yang cuma memakai `requireRole`; mock yang mengganti `resolveActor` bocor ke file test lain dalam satu run. Identitas API key bisa disimulasikan dengan `setApiKeyIdentity(request, …)`. Hook `onAfterResponse` (log pemakaian) berjalan setelah `app.handle()` selesai — tunggu sejenak sebelum `flushUsage()`.

## Catatan teknis

- **SSR di Bun**: import `react-dom/server.node` bukan bare `react-dom/server` (bare specifier resolve ke web-streams build tanpa `renderToPipeableStream`).
- **Bundle SSR berisi salinan kode server**: modul `@server/*` yang diimpor dari `app/` (loader, `entry.server.tsx`) ikut dibundel Vite ke `build/server/index.js`, jadi singleton seperti logger akan punya dua instance. `entry.server.tsx` melapor lewat `@server/ssr-log` (jembatan `globalThis` yang diisi `server/logger.ts`), bukan mengimpor logger langsung.
- **pino-roll v4** menerima satu objek opsi (`{ file, frequency: 'daily', size, limit, mkdir }`); bentuk lama `build(path, opts)` melempar "No file name provided" dan membuat `bun run start` gagal boot.
- **No FOUC**: `ColorSchemeScript` + inline `<style>` blocking di `<head>` di `root.tsx` — background warna yang benar dirender sebelum Mantine CSS dimuat.
- **Multiple Set-Cookie**: `http-bridge.ts` pakai `Headers.getSetCookie()` (WinterCG) untuk kumpulkan semua Set-Cookie header, lalu set sekaligus sebagai array ke Node.js response. Ini kritis untuk multi-session Better Auth.
- **Sidebar collapsed state**: disimpan di cookie `mk-sidebar-collapsed`, dibaca server-side di layout loader — tidak ada flash saat hard reload.
- **Urutan hook Elysia**: `derive` di route berjalan pada fase transform, *sebelum* `onBeforeHandle` global mana pun. Plugin yang menyuntik identitas untuk route ber-`derive` (auth API key) harus memakai `onRequest`; hook lain hanya berlaku untuk route yang didaftarkan setelahnya.
- **Mount Better Auth = catch-all**: `.mount(handler)` menangkap semua path `/api/*` yang tidak cocok, jadi `server/api/index.ts` hanya meneruskan `/api/auth/*` ke Better Auth dan mengembalikan JSON 404 untuk sisanya.
- **Better Auth apiKey**: panggilan server-side (`createApiKey`, `updateApiKey`) tidak boleh membawa `headers` (dianggap request klien → `SERVER_ONLY_PROPERTY`); scope kurang dilaporkan sebagai `KEY_NOT_FOUND`, sehingga scope dicek sendiri di `server/api-keys/plugin.ts`; `requestCount` hanya counter jendela rate limit, total pemakaian ada di `api_key_usage`.
- **Tanggal di fragmen `sql` mentah**: fragmen raw tidak mendapat pemetaan tipe kolom — kirim `${d.toISOString()}::timestamp`, bukan objek `Date`.
- **Dev server `--hot`**: plugin Elysia atau hook baru tidak selalu ikut dimuat ulang; restart `bun run dev` setelah menambah plugin. Untuk smoke test jalankan instance kedua dengan `PORT=<lain> bun run server/dev.ts` agar tidak mengganggu server yang sedang berjalan.

## Lisensi

MIT
