# R04 — Rancangan API Backend `/api/app` (Simple PM)

> Tanggal: 15 Oktober 2026. Riset/perencanaan saja; tidak ada kode proyek yang diubah. Branch `feature/project-management`.
> Konvensi: `path:baris` = dibaca langsung; **ASUMSI** = tidak diverifikasi / keputusan baru; **[FONDASI]** = usulan mengubah kode yang sudah berjalan (dengan biaya). Laporan lain disebut dengan nama file (R02, R03, R07, R08, R09, R12, R14).
> Bukti eksperimen saya (semua di `/tmp/r04probe`, bukan di repo): probe perilaku Elysia 1.4.30 dan benchmark tipe Eden (§2.4).

## 1. Ringkasan eksekutif

1. **Struktur:** pertahankan satu `appApi` (`server/api/app.ts`, prefix `/app`) sebagai satu-satunya titik pasang; tiap domain = plugin Elysia sendiri di `server/api/app-<domain>[.<bagian>].ts` (≤150 baris, ≈6–9 rute per file), logika di `server/<domain>/*.{query,service}.ts`. **Urutan hook global di `server/api/index.ts` tidak disentuh** karena semua modul dipasang di dalam `appApi` yang sudah berada di posisi kontrak (`index.ts:115`).
2. **Satu konteks bersama** `app-context.ts` (plugin bernama): derive `actor`, 401, gerbang status akun, pembatas tulis per-user. Terbukti lewat probe: plugin bernama yang di-`.use` di induk dan di tiap modul **hanya menjalankan derive sekali per request** dan hook induk yang dipasang *sebelum* `.use(modul)` berlaku untuk rute modul.
3. **Temuan baru (penting):** pola sekarang (`derive` + `onBeforeHandle` 401, `app.ts:11-15`) membuat request anonim dengan body tidak valid mendapat **422 + daftar isu skema, bukan 401** (validasi berjalan sebelum `onBeforeHandle`). Dengan puluhan rute POST ini jadi kebocoran skema dan membuat sapuan auth R09 (E7) gagal. Usul [FONDASI, ±6 baris + 1 tes]: gerbang 401 dipindah ke `derive` dengan `throw` `Response` JSON (preseden `notFoundResponse`, `api-error.ts:69`); bonus: `actor` bertipe non-null, cast `as NonNullable` hilang.
4. **Scope:** pasangan `app:read`/`app:write` (`scopes.ts:166`) **cukup sebagai pagar kasar**, tetapi tidak aman bila dibiarkan polos: kunci ber-`app:write` bisa menyetujui tugas, menghapus permanen, mengunduh bukti. Rekomendasi: tetap dua scope + **daftar tolak eksplisit `null`** (±10 pola) di file baru yang dipanggil dari `requiredScope`, bukan 14 scope per fitur. Kunci API **boleh** mengakses data PM (baca + tulis rutin), dengan izin tetap ditentukan `Principal` pemilik kunci (R03).
5. **Tipe Eden:** benchmark sintetis 7 modul bersarang: 35 → 105 → 210 rute menambah 60.682 → 111.447 → 194.682 instansiasi dan 0,10 → 0,12 → 0,25 dtk waktu cek, terhadap baseline proyek 1.022.977 instansiasi / 6,2 dtk total. **Risiko waktu typecheck rendah**; mitigasi murah: klien sempit `treaty<AppApi>`, rantai ≤10 rute per instance, DTO bertipe eksplisit.
6. **Pagination:** cursor keyset (`{items, nextCursor}`) untuk daftar yang tumbuh (tugas, timeline, inbox, sampah, acara, proyek, log aktivitas); anak terbatas (anggota, tahapan, jenis, tag) dikembalikan utuh dengan batas keras; `offset` hanya `team` (R08). Dua query batch per halaman melawan N+1, dijaga tes hitung query.
7. **Transaksi:** `db.transaction` Drizzle → `client.begin` postgres.js menahan **satu koneksi dari pool `max: 5`** (`db/index.ts:21`); belum ada pemakaian transaksi di repo. Aturan: service menerima `exec: Executor`, tidak ada I/O jaringan/storage di dalam transaksi, jangan panggil `db` global di dalam callback (risiko kelaparan pool), `audit()` setelah commit, `notify()` lewat savepoint (R07).
8. **Unggah bukti:** pakai ulang pola avatar (`app-avatar.ts`), tetapi baca lewat rute berotorisasi `GET /api/app/files/:attachmentId` (R12 R7), bukan `storage-files.ts` yang publik; kunci API ditolak untuk rute file (`null`). Butuh [FONDASI] `maxRequestBodySize` di `Bun.serve` (R12).
9. **OpenAPI:** otomatis ikut (`openapi.ts` memfilter dengan `requiredScope`, jadi rute `null` tak muncul); usul S: tag per modul. **MCP:** jangan tambah alat PM ke server MCP debug MVP (hanya super-admin + token bersama tanpa identitas); MCP produk = fase 5.
10. **Rate limit:** limiter global per-IP 100/60 dtk (`env.ts:32-33`) tidak membedakan baca/tulis; tambah `RateLimiter` kedua berkunci **user id** untuk tulis (60/mnt) dan unggah (10/mnt) di `app-context`. Angka = ASUMSI, konstanta bernama. **Estimasi:** L, **11–17 hari-orang AI + 2–3 hari reviewer manusia** untuk kerangka API + 7 modul (bukan UI, bukan skema).

## 2. Temuan (dengan bukti)

### 2.1 Fondasi yang dibaca

| # | Bukti | Dampak |
|---|---|---|
| F1 | `server/api/index.ts:69-117`: rantai `apiErrorPlugin → rateLimitPlugin → maintenancePlugin → apiKeyPlugin → demoRestrictPlugin → mount(auth/404) → adminApi → … → appApi (:115)`; `api.use(openapiApi(()=>api))` di `:136`; `export type Api = typeof api` `:138` | Semua modul PM cukup masuk lewat `appApi`; kontrak urutan tidak terganggu |
| F2 | `server/api/app.ts:10-15`: `derive({actor: await resolveActor(request)})` + `onBeforeHandle` 401 (local); handler memakai `actor as NonNullable<typeof actor>` (`:18,24,33`) | Pola yang dipecah ke modul; cast berulang di 60+ rute = utang tipe |
| F3 | `server/guard.ts:67-96` `resolveActor`: jalur kunci API → `select * from user` (`:71`); jalur sesi → `auth.api.getSession` (DB, `cookieCache` tidak ada: `grep cookieCache server/auth.ts` kosong) lalu `resolveUserRole` (`roles.ts:13-19`, tulis DB hanya bila role berubah) | 1–3 query sebelum handler; derive wajib berjalan **sekali** per request |
| F4 | `server/api-error.ts:90-106,111-114`: `status(4xx,{error,code})` dibungkus `mapResponse` jadi `{error,code,status,requestId,method,path}`; `onError` (`:115-157`): `Response` lolos apa adanya (`:116`), `VALIDATION` → 422 + `issues` (`:122-134`); **`throw status(...)` dari handler/derive jatuh ke 500** (lihat probe §2.2) | Bentuk error seragam sudah ada; `throw status` tidak boleh dipakai tanpa [FONDASI] |
| F5 | `server/api-keys/scopes.ts:166`: `/api/app/*` → `app:read` (GET/HEAD) atau `app:write`; `:122` `ROLE_RANK` 3 role; `:11-114` 16 scope, file 190 baris; `:141-169` `requiredScope` berurutan; `plugin.ts:55-56` rute tanpa scope → 403 untuk kunci; `plugin.ts:81` cek scope; `plugin.ts:105-113` cek pemilik banned + `roleAllowsScope` | Pemetaan kasar sudah jalan; kunci bertindak sebagai pemilik |
| F6 | `server/middleware/rate-limiter.ts:72-105` + `rate-limit.ts:91-105`: satu `RateLimiter`, kunci IP (`rateLimitKey`), bawaan 100/60 dtk, `onRequest`; kelas menerima config sendiri (`constructor(config)`), `check(key)` generik; `logRateLimit` menerima `userId` (`:44-50`) | Limiter kedua berkunci user id bisa memakai kelas yang sama tanpa kode baru di fondasi |
| F7 | `server/db/index.ts:19-24`: pool `max: 5`; `node_modules/drizzle-orm/postgres-js/session.js:108-139`: `transaction` = `client.begin`, transaksi bersarang = `savepoint`; `grep "\.transaction(" server` = 0 hasil | Transaksi pertama di repo; pool 5 koneksi membatasi paralelisme transaksi |
| F8 | `server/api/app-avatar.ts:8-34,72-96`: validasi `Blob`, ukuran dicek **setelah** body terbaca (`:82`), magic bytes `sniffImage` (`:27`), kunci acak `avatars/<userId>/<uuid>.<ext>`, `STORAGE_DISABLED` 503 (`:21-25,78`); `storage-files.ts:9-24` baca **publik**, `cache-control: public, immutable`; `prod.ts:47-49` `Bun.serve` tanpa `maxRequestBodySize` | Pola unggah bisa dipakai ulang; pola baca publik **tidak** boleh dipakai untuk bukti (R12 F7) |
| F9 | `server/api/openapi.ts:26-46`: spec dibatasi `requiredScope`/`roleAllowsScope` kunci pemanggil; `:41` tag = `path.split('/')[2]` → semua rute PM bertag `app`; `:80` `toOpenAPISchema(getApp())` sekali | PM otomatis di spec; rute `null` tersaring; tag kurang berguna |
| F10 | `server/mcp/index.ts:20-22,28-52`: server `simple-pm-debug`; auth = kunci ber-scope `mcp` (minRole super-admin, `scopes.ts:90-95`) **atau** token bersama `MCP_ADMIN_TOKEN` (tanpa identitas user); alat: status, log, `get_db_stats` (hitung baris 4 tabel, `mcp/tools/db.ts:9-42`), `list_users`, sesi, post, file-health | Tidak ada identitas pemilik → tak bisa memakai matriks izin PM |
| F11 | `server/api/analytics-paging.ts:5-36`: `PAGE_SIZE=25`, `MAX_PAGE_SIZE=100`, `parsePaging` offset; `posts.query.ts:8-18` query bertipe string; semua daftar konsol memakai offset | Konstanta bisa dipakai ulang; offset cocok untuk konsol, bukan daftar tugas yang terus bertambah |
| F12 | `app/lib/eden.ts:14` `treaty<Api>(baseUrl())` satu klien penuh; pemakai: `app/lib/avatar-api.ts:14,22` (`client.api.app.avatar`) | Klien sempit bisa ditambah tanpa mengubah pemakai lama |
| F13 | `tests/api/app.test.ts:9-16`: pola `spyOn(auth.api,'getSession')` + `spyOn(rolesMod,'resolveUserRole')` terhadap router penuh `api`; `tests/api-keys/scopes.test.ts:20-22,40-41` assertion `/api/app/*` | Pola tes yang harus diikuti (CLAUDE.md) |

### 2.2 Probe perilaku Elysia (1.4.30; skrip di `/tmp/r04probe/{p,q2,q3,q4}.ts`)

| Probe | Hasil | Kesimpulan |
|---|---|---|
| Plugin bernama `app-ctx` (`derive` + `onBeforeHandle`, `as:'scoped'`) di-`.use` di induk **dan** di dua modul | `derives=1` per request, 200 / 401 benar | Dedup per nama: `.use(appContext)` di tiap modul gratis di runtime, dan dibutuhkan agar tipe `actor` terlihat modul |
| Induk `.derive().onBeforeHandle().use(child)` vs `.use(child).derive()` | Pertama: hook induk berlaku untuk rute anak (418 / `actor` ada). Kedua: `hasActor:false` | Sesuai CLAUDE.md ("hook hanya untuk rute yang didaftarkan setelahnya"): `.use(appContext)` **harus pertama** di `appApi` |
| POST anonim, body tidak valid, pola lama (`derive`+`onBeforeHandle`) | **422** + detail validasi | Validasi mendahului `onBeforeHandle`: 401 tidak pernah muncul untuk body salah |
| Sama, tetapi `derive` melempar `Response` 401 JSON + `apiErrorPlugin` asli | **401** sebelum validasi; pengguna sah dengan body salah tetap 422 berformat seragam | Rekomendasi §3.1 |
| Sama, tetapi `throw status(401,…)` + `apiErrorPlugin` asli | **500** `INTERNAL` (log "API error", `code:401`) | `onError` tak mengenali `ElysiaCustomStatusResponse`; hindari, atau tambah 3 baris di `api-error.ts` |

### 2.3 Kontradiksi antar laporan yang harus diputuskan (milik koordinator)

| # | Pertentangan | Keputusan saya |
|---|---|---|
| K-A | Nama berkas rute: R03 §3.7 `server/api/app/tasks.ts` (`:334`) + tes cakupan `server/api/app/*.ts` (`:348`); R07 `server/api/app.inbox.ts`; R08 `server/api/app-events.ts` dst.; R14 §rute `server/api/app-<modul>.ts` | **`app-<modul>[.<bagian>].ts` (datar)**: 3 laporan sepakat, cocok `app-avatar.ts`, dan folder `server/api/app/` bersebelahan dengan `app.ts` membingungkan resolusi `./app`. Tes cakupan R03 memindai glob `server/api/app-*.ts` + `app.ts` |
| K-B | R08 menaruh `GET /events/people`; form tugas/proyek juga butuh pemilih orang | Satu pemilih bersama `GET /api/app/team/picker` (§3.2); `events/people` memanggil fungsi yang sama |
| K-C | R09 E7 mengandaikan sapuan "anonim → 401" untuk setiap rute `/api/app/**` | Hanya benar bila gerbang 401 di `derive` (§3.1); dengan pola sekarang POST anonim berbody kosong → 422 |

### 2.4 Benchmark tipe Eden (sintetis, `tsc 7.0.2 --singleThreaded --extendedDiagnostics`)

Skrip: 7 modul (`projects…settings`) `new Elysia({prefix}).use(ctx)` dengan N rute per modul (campuran get/post/patch/delete/put, body `t.Object` 5 kolom, query 3 kolom, handler mengembalikan objek + `status(403,…)`), digabung `appApi → api`, dipakai lewat `treaty<Api>` dan `treaty<AppApi>`; tipe dibuktikan hidup (properti salah → TS2339).

| Rute total | Types | Instansiasi | Cek | Total |
|---|---|---|---|---|
| 35 (5/modul) | 10.577 | 60.682 | 0,10 dtk | 0,37 dtk |
| 105 (15/modul) | 17.547 | 111.447 | 0,12 dtk | 0,31 dtk |
| 210 (30/modul) | 28.002 | 194.682 | 0,25 dtk | 0,47 dtk |
| **Baseline proyek** (`tsc --noEmit`, 3.239 berkas, 479 ribu baris) | 219.250 | 1.022.977 | 4,59 dtk | 6,23 dtk, 0 galat |

Kesimpulan: kemiringan ≈ 0,75 ribu instansiasi per rute ((194.682−60.682)/175 rute); 90 rute PM ≈ +70 ribu ≈ +7% dari instansiasi proyek. **Batas benchmark (ASUMSI):** handler sintetis mengembalikan literal kecil; hasil join Drizzle dan union `status()` lebih besar (perkiraan kasar 2–3×, tetap di bawah 1 dtk). Jumlah rute riil MVP ≈ 90 (§3.2). Batas "excessively deep" tidak tercapai pada 210 rute.

## 3. Rekomendasi

### 3.1 (a) Struktur modul dan cara memasang

**Tata letak** (angka baris = target, patuh tabel batas global):

```
server/api/
  app.ts                  ≤60   pasang saja: .use(appContext) lalu .use(tiap modul) + /whoami + avatar
  app-context.ts          ≤90   plugin bernama 'app-context' (derive actor, 401, gerbang akun, limiter tulis)
  app-common.ts           ≤80   t.Object bersama: IdParam, PageQuery, CursorQuery, TrashBody; helper `fail()`
  app-home.ts             ≤60   GET /home (R07)
  app-projects.ts         ≤150  daftar, buat, detail, ubah, status, hapus ke Sampah, lead
  app-projects.members.ts ≤120  anggota + peran
  app-projects.plan.ts    ≤150  tahapan, milestone, perpanjang tenggat, override kondisi
  app-projects.setup.ts   ≤120  jenis tugas, tag
  app-tasks.ts            ≤150  daftar, counts, buat, detail, ubah, hapus
  app-tasks.workflow.ts   ≤140  start/unstart/complete/request-review/approve/return/reopen/cancel/uncancel
  app-tasks.detail.ts     ≤150  checklist, dependensi, komentar, timeline
  app-tasks.files.ts      ≤110  lampiran (unggah/daftar/hapus)
  app-files.ts            ≤60   GET /files/:attachmentId (unduh berotorisasi)
  app-events.ts (+ .notes.ts) · app-inbox.ts · app-team.ts · app-trash.ts · app-settings.ts   (R07/R08)
server/pm/                       errors.ts (katalog kode §3.5) · tx.ts · keyset.ts · limits.ts (konstanta) · enums.ts · soft-delete.ts (R02)
server/<domain>/                 <domain>.query.ts (≤250) · <domain>.service.ts (≤300) · policy dari server/access (R03)
```

Aturan: **rute tipis** (validasi `t.Object` → `can*` → service → `status()`); tidak ada Drizzle di berkas `app-*.ts` (cek lewat tes pemindai, pola `tests/app-routes.test.ts`); satu modul = satu `new Elysia({prefix})` dengan **≤10 rute per instance**.

**Pemasangan tanpa melanggar kontrak hook** (kode acuan, bukan diterapkan):

```ts
// server/api/app-context.ts
export const appContext = new Elysia({ name: 'app-context' })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const actor = await resolveActor(request);
    if (!actor) throw unauthorizedResponse(request);     // Response JSON seragam, SEBELUM validasi
    return { actor };                                     // tipe non-null → tanpa cast
  })
  .onBeforeHandle({ as: 'scoped' }, ({ actor, request, status, set }) => {
    // 1) gerbang status akun (R12 C-AUTH-7): pending/rejected → 403 ACCOUNT_NOT_APPROVED
    // 2) pembatas tulis per user (§3.10): POST/PUT/PATCH/DELETE → writeLimiter.check(`u:${actor.user.id}`)
  });
// server/api/app-tasks.ts  (tiap modul mengulang .use hanya agar tipe `actor` terlihat; derive tetap 1×)
export const tasksApi = new Elysia({ prefix: '/tasks' }).use(appContext).get('/', …).post('/', …);
// server/api/app.ts
export const appApi = new Elysia({ prefix: '/app' })
  .use(appContext)            // WAJIB pertama: hook induk hanya menjangkau rute yang didaftarkan sesudahnya
  .use(homeApi).use(projectsApi)/* … */.get('/whoami', …);
```

- `index.ts` **tidak berubah** (kontrak `apiErrorPlugin → rateLimitPlugin → maintenancePlugin → apiKeyPlugin → mount auth → router` utuh); tidak ada `.mount` baru (CLAUDE.md).
- **[FONDASI] `unauthorizedResponse(request)`** diekspor dari `api-error.ts` (±6 baris, mirip `notFoundResponse`, membawa `requestId`) + 1 tes di `tests/api/api-errors.test.ts` ("POST anonim body salah → 401 bukan 422"). Biaya migrasi: nol bagi pemakai (bentuk 401 sama dengan `app.ts:14`; tes `app.test.ts:22-29` tetap lulus). Alternatif ditolak: `throw status(401)` (jatuh ke 500, §2.2) dan mempertahankan `onBeforeHandle` (422 bocor).
- Rute `/whoami` dan avatar tetap di `app.ts`; `app.test.ts` tidak berubah selain kasus baru.
- Keanggotaan proyek dihitung **di handler** (`loadMembership(userId, projectIds[])`, R03), bukan di `app-context`, agar rute non-proyek tak membayar query-nya.

### 3.2 (b) Katalog endpoint MVP (prefix `/api/app`)

Aturan umum: semua rute memerlukan sesi/kunci (401 seragam); tanpa hak lihat → **404** (bukan 403, R03); `can{}` pada detail dihitung server dengan fungsi `can*` yang sama dengan penegak (R03 §3.7); ID = `text` (`crypto.randomUUID()`). Tulis → balikan objek terbaru + `can{}`. `S` = scope kunci (§3.3): R = `app:read`, W = `app:write`, ✖ = `null` (kunci ditolak). Kolom "Izin" memakai nama fungsi R03 (`server/access`).

**Proyek** (`app-projects*.ts`)

| Metode · Path | Izin | Body / query → response | S |
|---|---|---|---|
| GET `/projects` `?scope=mine\|all&status&q&sort=due\|name\|updated&limit&cursor` | `canViewProject` (Member hanya yang diikuti; PM/Admin semua) | `{items[{id,name,status,priority,lead,dueDate,progress{done,total,percent},condition{level,reason},myRole}],nextCursor}` | R |
| POST `/projects` | `canCreateProject` | `{name,description?,priority?,startDate?,dueDate?,leadId?,members?[{userId,role}],tasksNeedReviewDefault?}` → 201 `{project}`; transaksi §3.6-A | W |
| GET `/projects/:id` | `canViewProject` | detail + progres + kondisi + hitungan + `can{}` | R |
| PATCH `/projects/:id` | `canManageProject` | nama/deskripsi/prioritas/tanggal mulai/`tasksNeedReviewDefault` (tenggat lewat `extensions`) | W |
| POST `/projects/:id/status` | `canManageProject` | `{status}` → proyek | W |
| PUT `/projects/:id/lead` | `canSetLead` | `{userId}` | W |
| DELETE `/projects/:id` | `canManageProject` | → `{trash:{kind,id,label}}` (kaskade R02 §3.5, satu transaksi) | ✖ |
| GET `/projects/:id/members` | `canViewProject` | utuh, maks `PROJECT_MEMBERS_MAX` | R |
| POST · PATCH · DELETE `/projects/:id/members[/:userId]` | `canChangeManagerSet` | `{userId,role}` / `{role}`; 409 `LAST_MANAGER`; kunci baris proyek `FOR UPDATE` | ✖ |
| GET `/projects/:id/phases` | `canViewProject` | tahapan + milestone bersarang | R |
| POST · PATCH · DELETE `/projects/:id/phases[/:phaseId]`, POST `/phases/reorder` `{ids[]}` | `canManageProject` | tahapan | W |
| POST · PATCH · DELETE `/projects/:id/milestones[/:mid]`, POST `/milestones/:mid/reach` | `canManageProject` | milestone | W |
| GET · POST `/projects/:id/extensions` | `canViewProject` / `validateExtension`+`canManageProject` | `{newDueDate,reasonCategory,reason}`; transaksi: sisipkan perpanjangan + ubah `due_date` (+`original_due_date` bila kosong) + aktivitas | W |
| PUT · DELETE `/projects/:id/condition-override` | `canManageProject` | `{condition,reason,expiresAt?}` / hapus | W |
| GET `/projects/:id/activity` `?limit&cursor` | `canViewProject` | `{items,nextCursor}` | R |
| GET · POST `/projects/:id/kinds`, PATCH `/kinds/:kindId` | `canViewProject` / `canManageKinds` | maks 6 aktif (R03 konstanta); arsip, bukan hapus | W |
| GET · PATCH · DELETE `/projects/:id/tags[/:tagId]` | `canViewProject` / `canManageTags` | ganti nama, gabung (`mergeInto`), hapus | W |

**Tugas** (`app-tasks*.ts`; `:ref` = id atau nomor `#482` — **ASUMSI**, satu resolver `resolveTaskRef`; nomor tak pernah dipakai ulang, R02)

| Metode · Path | Izin | Body / query → response | S |
|---|---|---|---|
| GET `/tasks` `?scope=mine\|review\|created\|project\|all&projectId&status&assigneeId&kindId&priority&tag&q&due=overdue\|today\|week\|none&sort=due\|priority\|updated\|created&limit&cursor` | `canViewTask` (filter hak lihat di SQL) | `{items[{id,number,title,status,priority,dueDate,assignee{id,name,image},project{id,name},labels,progress,primaryAction}],nextCursor}`; label via `taskLabels` (R03) | R |
| GET `/tasks/counts` `?projectId` | idem | `{mine{overdue,today,tomorrow,week,later,none},review,byStatus}` satu `GROUP BY` | R |
| POST `/tasks` | `canCreateTask` | `{projectId,title,description?,kindId?,priority?,assigneeId?,startDate?,dueDate?,estimateHours?,needsReview?,phaseId?,tags?[],checklist?[]}` → 201; transaksi: tugas+tag+checklist+aktivitas+notifikasi penerima | W |
| GET `/tasks/:ref` | `canViewTask` | detail + checklist + dependensi + lampiran ringkas + `can{}` (timeline terpisah) | R |
| PATCH `/tasks/:ref` | `canEditTask` (+`canToggleNeedsReview`, `canChangeReviewer`) | field parsial; `tags` mengganti penuh; `assigneeId` → efek `BECOMES_ASSIGNEE` | W |
| DELETE `/tasks/:ref` | `canTrashTask` | → `{trash}` | W |
| POST `/tasks/:ref/start` · `unstart` · `complete` · `request-review` | `canStartTask`/`canUnstartTask`/`canCompleteTask`/`canRequestReview` | tanpa body → `{task}`; `UPDATE … WHERE status=:dari RETURNING` | W |
| POST `/tasks/:ref/approve` | `canApproveTask` | → `{task}` | ✖ |
| POST `/tasks/:ref/return` `{note}` · `reopen` `{reason}` · `cancel` `{category,note?}` · `uncancel` | `canReturnTask`/`canReopenTask`/`canCancelTask` | alasan wajib (422 `REASON_REQUIRED`) | `return` ✖, sisanya W |
| POST · PATCH · DELETE `/tasks/:ref/checklist[/:itemId]` | `canEditTask` | `{text}` / `{text?,isDone?,position?}` | W |
| POST · DELETE `/tasks/:ref/dependencies[/:otherRef]` | `canEditTask` | `{blockedByRef}`; 409 `DEPENDENCY_CYCLE` | W |
| GET `/tasks/:ref/timeline` `?limit&cursor` | `canViewTask` | komentar+aktivitas satu aliran, keyset `(created_at,id)` | R |
| POST · PATCH · DELETE `/tasks/:ref/comments[/:cid]` | `canComment` / pemilik atau `comment.delete` | `{body}` (teks polos, R12 R8) | W |
| GET · POST · DELETE `/tasks/:ref/attachments[/:aid]` | `canViewTask` / `canAttach` | multipart `file` (+`note?`) atau `{type:'link',url,note?}`; §3.8 | ✖ (unggah/hapus), R (daftar) |
| GET `/files/:attachmentId` | `canViewTask` atas tugas induk | stream; header R12 R7 | ✖ |

**Lainnya** (detail kontrak ada di laporan pemilik; saya hanya memastikan konsisten dengan §3.1/3.4/3.10)

| Modul | Rute (rujuk) | Catatan lintas |
|---|---|---|
| Beranda | GET `/home` (R07) | satu fungsi `getHome(actor)` bersama loader SSR; R |
| Inbox | GET `/inbox` `?lane&limit&cursor`, GET `/inbox/count`, POST `/inbox/:id/read`, POST `/inbox/read-all` (R07 §P2) | cursor `(created_at,id)`; `count` dikecualikan dari limiter IP (R07); W untuk `read*` |
| Acara | R08 §3.1 (11 rute `/events…`) | daftar pakai cursor, bukan `offset`; semua W (batal/hapus acara masuk Sampah, dapat dipulihkan) |
| Tim | GET `/team`, GET `/team/:userId` (R08, offset+total karena ≤50 orang), **baru** GET `/team/picker` `?q&projectId&limit` → `[{id,name,jobTitle,image}]` | pemilih assignee/lead/anggota/peserta; tanpa email; R |
| Sampah | GET `/trash`, POST `/trash/:kind/:id/restore` (W), DELETE `/trash/:kind/:id` (✖ + `audit()`) (R08 §3.3) | cursor |
| Pengaturan | GET/PATCH `/profile`, GET/PUT `/notification-prefs`, GET/PUT `/team-settings` (R08 §3.4) | `profile` PATCH, `team-settings` PUT = ✖ |

Jumlah rute MVP ≈ 90 (proyek 31, tugas 28, lainnya 31; hitungan tangan dari tabel di atas + R07/R08). **Kebutuhan baru bagi R03/R08:** tidak ada fungsi `can*` tambahan selain yang tercantum R03; `canViewTask` dipakai untuk filter SQL daftar (bukan per baris).

### 3.3 (c) Pemetaan scope dan akses kunci API ke data PM

| Opsi | Isi | Alasan |
|---|---|---|
| A. Status quo (`app:read/app:write` polos) | nol kode | **Ditolak:** kunci ber-`app:write` dapat menyetujui tugas (pemisahan tugas pemeriksa runtuh bagi skrip/agen), menghapus ke Sampah, mengubah anggota; bukti `scopes.ts:166` memetakan semua yang bermetode non-GET |
| B. Scope per fitur (±14 id: `projects:read/write`, `tasks:*`, `events:*`, `inbox:*`, `trash:*`, `team:read`, `settings:*`) | +±84 baris di `scopes.ts` (sudah 190, di atas batas config 100) dan 14 cabang `requiredScope`; `ScopePicker.tsx` tumbuh | **Ditolak untuk MVP:** biaya besar, manfaat kecil karena izin sebenarnya ditentukan `Principal`, bukan scope |
| **C. Dua scope + daftar tolak** | `app:read`/`app:write` tetap; file baru `server/api-keys/scopes.pm.ts` (≤50 baris) mengekspor `PM_KEY_DENY: ReadonlyArray<[method\|'*', RegExp]>` dan `isPmKeyDenied(method, path)`; `requiredScope` memanggilnya **sebelum** baris `:166` (+3 baris di `scopes.ts`) | **Dipilih** (seperti R08 untuk `team-settings`, R12 C-KEY-1) |

**Isi `PM_KEY_DENY` (MVP):** `*` `/api/app/files/*`; `POST` `…/attachments` & `DELETE …/attachments/*` (unggah/hapus bukti; kunci boleh membaca daftar); `POST …/tasks/*/approve|return`; `DELETE /api/app/projects/*`; `* /api/app/projects/*/members*`; `DELETE /api/app/trash/*`; `PUT /api/app/team-settings`; `PATCH /api/app/profile`; `* /api/app/avatar`. Alasan umum: keputusan manusia (menyetujui), tidak bisa dibatalkan (hapus permanen), eskalasi hak (anggota), atau file sensitif. Dapat dilonggarkan kelak satu per satu (tiap pelonggaran = 1 baris + 1 tes).

- **Kunci boleh mengakses data PM?** **Ya** — baca penuh dan tulis rutin (buat/ubah tugas, komentar, checklist, alur kerja selain approve/return), karena `openapi.ts:1-6` memang ditujukan untuk agen/skrip dan kunci selalu bertindak sebagai pemilik (`plugin.ts:94-113`; `guard.ts:68-78`), sehingga IDOR proyek orang lain tetap 404. Prasyarat [FONDASI, milik R12 F5]: jalur kunci harus ikut menolak akun `pending/rejected/suspended` dan memakai `isBanActive` (`plugin.ts:106` kini hanya `owner.banned`).
- **Dampak rename role:** `ROLE_RANK` (`scopes.ts:122`) harus diisi 4 role (R12 F12: tanpa itu kunci PM gagal-tertutup); `minRole: ROLES.USER` → `ROLES.MEMBER` di 4 scope. Fase 0 (R14), bukan irisan.
- **Tes wajib:** (1) tiap rute di `api.routes` dengan prefiks `/api/app/` punya hasil `requiredScope` bukan `undefined` dan, bila tak ada di `PM_KEY_DENY`, bernilai `app:read` bila GET dan `app:write` bila lainnya; (2) tiap pola `PM_KEY_DENY` cocok dengan ≥1 rute nyata (cegah pola mati); (3) 12 assertion `requiredScope` eksplisit di `tests/api-keys/scopes.test.ts` (satu per baris tolak + 2 rute W + 2 rute R).
- Konsekuensi OpenAPI: rute `null` otomatis hilang dari spec kunci (`openapi.ts:34-37`) — perilaku yang diinginkan.

### 3.4 (d) Tipe Eden pada plugin bersarang besar

Keputusan: **tidak perlu perubahan arsitektur**; terapkan empat mitigasi murah, dan tetapkan anggaran.

1. `server/api/app.ts` mengekspor `export type AppApi = typeof appApi`; `app/lib/eden.ts` menambah `export const appClient = treaty<AppApi>(`${baseUrl()}/api`)` (**ASUMSI** perlu spike 0,5 jam: prefiks `/app` ikut ke dalam jalur tipe; `client` lama untuk `client.api.app.avatar` tetap). Manfaat: autocompletion IDE hanya menelusuri subpohon PM, bukan seluruh `Api`.
2. ≤10 rute per instance Elysia (sejalan batas 150 baris) — kedalaman inferensi rantai `.get().post()…` berbanding rute per instance, bukan total rute (benchmark: 30 rute/modul masih 0,25 dtk).
3. Service mengembalikan **DTO bertipe eksplisit** (`Promise<TaskListItem[]>`) dari `*.query.ts`; handler tidak mengembalikan hasil `db.select().leftJoin()` mentah ke Eden (tipe join Drizzle lebar, tidak stabil, dan menyeret tipe skema ke klien).
4. Jangan deklarasikan `response:` per status di MVP (validasi runtime respons juga memakan CPU); `status(403,{error,code})` di handler cukup, error seragam ada di envelope.
5. **Anggaran:** `bun run typecheck` baseline 6,2 dtk (diukur) → batas peringatan 9 dtk / 1,6 juta instansiasi setelah semua modul masuk. Cara ukur: `tsc --noEmit --singleThreaded --extendedDiagnostics` (tanpa menulis berkas); catat angkanya di PR modul terakhir. Bila terlampaui: pindahkan `Api` ke `AppApi` pada pemakai klien dan hapus `app` dari tipe `Api` memakai `Omit`-trick (belum diuji).

### 3.5 (e) Bentuk error dan katalog kode PM

Bentuk tidak berubah: `{ error, code, status, requestId, method, path, issues? }` (`api-error.ts:16-24`); handler selalu `status(http, { error, code })`. Berkas baru `server/pm/errors.ts` memuat `PM_ERRORS: Record<PmCode,{http:number,message:string}>` dan `fail(status, code, extra?)` supaya pesan tak tersebar. Kode kebijakan (`NOT_MANAGER`, `NOT_OWNER`, `SELF_REVIEW`, `LOCKED_BY_STATUS`, `PROJECT_IN_TRASH`, …) datang dari `DENY_UI` R03 lewat `denyResponse`; tabel di bawah hanya kode yang **bukan** keputusan izin.

| Kode | HTTP | Pesan (Indonesia, actionable) |
|---|---|---|
| `VALIDATION` | 422 | "Validasi gagal" (ada; `issues[]` diterjemahkan di klien per kolom) |
| `NOT_FOUND` | 404 | "Data tidak ditemukan atau kamu tidak punya akses." (juga untuk tanpa hak lihat) |
| `STATE_CONFLICT` | 409 | "Tugas ini sudah diubah orang lain. Muat ulang halaman, lalu coba lagi." |
| `STALE_VERSION` | 409 | "Catatan ini diubah orang lain. Salin tulisanmu, muat ulang, lalu gabungkan." (`baseUpdatedAt`, R08) |
| `LAST_MANAGER` | 409 | "Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu." |
| `LEAD_MUST_BE_MANAGER` | 422 | "Penanggung jawab utama harus berperan Pengelola di proyek ini." |
| `KIND_LIMIT` · `KIND_IN_USE` | 409 | "Satu proyek maksimal {n} jenis tugas aktif. Arsipkan salah satu dulu." · "Jenis ini sudah dipakai tugas. Arsipkan saja, jangan dihapus." |
| `DEADLINE_NOT_LATER` | 422 | "Tenggat baru harus lebih lambat dari tenggat sekarang ({tanggal})." |
| `REASON_REQUIRED` · `CANCEL_NOTE_REQUIRED` | 422 | "Tuliskan alasannya agar tim paham." · "Pilih 'Lainnya' perlu catatan singkat." |
| `NO_ELIGIBLE_REVIEWER` | 409 | "Belum ada pemeriksa yang bisa dipilih. Hubungi pengelola proyek." |
| `DEPENDENCY_CYCLE` | 409 | "Tugas ini tidak bisa menunggu tugas yang sedang menunggunya." |
| `TAG_EXISTS` | 409 | "Tag dengan nama itu sudah ada di proyek ini." |
| `EXPIRED` | 410 | "Item ini sudah melewati masa pemulihan 30 hari." (R08) |
| `STORAGE_DISABLED` | 503 | "Penyimpanan file belum aktif. Hubungi admin." (ada, `app-avatar.ts:21-25`) |
| `FILE_REQUIRED` · `FILE_TOO_LARGE` · `UNSUPPORTED_TYPE` · `ATTACHMENT_LIMIT` | 400 · 413 · 415 · 409 | pesan avatar (`app-avatar.ts:80-88`) diperluas: "Ukuran file maksimal {n} MB." · "Format harus PNG, JPEG, WEBP, GIF, atau PDF." · "Satu tugas maksimal {n} bukti." |
| `ACCOUNT_NOT_APPROVED` | 403 | "Akunmu belum disetujui admin. Kami akan memberi kabar lewat email." (R12 C-AUTH-7) |
| `RATE_LIMITED` | 429 | "Terlalu banyak perubahan dalam waktu singkat. Coba lagi dalam {n} detik." (+ header `retry-after`; bentuk sama dengan `rate-limiter.ts:98-104`) |

Aturan: 5xx tak pernah membawa pesan internal di produksi (`api-error.ts:155`); `status(…)` dari handler tak boleh membawa stack; `code` konstan (kontrak klien), `error` boleh disempurnakan.

### 3.6 (f) Pola transaksi Drizzle + postgres.js

**Dasar:** `db.transaction(cb)` → `client.begin` (satu koneksi dari pool 5, F7); bersarang → `savepoint`. Isolasi bawaan READ COMMITTED **cukup** bila transisi memakai UPDATE bersyarat (tanpa `SERIALIZABLE`, tanpa retry).

```ts
// server/pm/tx.ts
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = typeof db | Tx;                       // service menerima `exec`, bukan mengimpor db
export const inTx = <T>(fn: (tx: Tx) => Promise<T>) => db.transaction(fn);
```

**A. Buat proyek + anggota + jenis tugas default** (`projects.service.ts`, satu `inTx`):
1. `insert project` (`createdBy`, `leadId = creator`, status `draft`) → `returning id`.
2. `insert project_member` ({creator, `manager`}) + anggota lain dari body (satu `values([...])`, peran lead dipaksa `manager`, duplikat userId dibuang).
3. `insert task_kind` tiga baris dari konstanta `DEFAULT_TASK_KINDS = [Tugas/task, Bug/issue, Ide/idea]` (urutan `position`).
4. `insert project_activity` (`created`).
5. Commit → di luar transaksi: tidak ada `audit()` (bukan aksi istimewa). Kegagalan di mana pun → rollback total (tidak ada proyek tanpa pengelola/jenis, invarian R02 CHECK + R03).

**B. Ubah status tugas + aktivitas + notifikasi** (`tasks.workflow.service.ts`):
1. Muat subjek + keanggotaan (di luar tx, hanya baca) → `canApproveTask(...)`/`can*` → bila `!ok` kembalikan sebelum membuka tx.
2. `inTx`: `UPDATE task SET status=:ke, last_activity_at=now(), return_count=return_count+…, completed_at=… WHERE id=:id AND status=:dari AND deleted_at IS NULL RETURNING *`; 0 baris → lempar `StateConflict` (→ 409 `STATE_CONFLICT`; mencakup klik ganda dan dua orang serentak).
3. `insert task_activity`; untuk `request-review`: `insert task_review` (UNIQUE indeks parsial "satu permintaan terbuka" R02 menolak ganda); untuk `approve/return`: `UPDATE task_review SET decision… WHERE task_id AND decision IS NULL RETURNING`.
4. `resolveNotifications({ref,kinds})` lalu `notify(...)` — di dalam tx, masing-masing berupa **savepoint** yang tidak melempar ke pemanggil (kontrak R07 = `audit()` `audit.ts:62`).
5. Commit → kembalikan `{task, can}` yang dibangun ulang dari baris `RETURNING` (tanpa SELECT ulang).

**Aturan keras (dijaga tes `tests/pm/tx-discipline.test.ts` memindai `server/*/**.service.ts`):** (1) dalam callback hanya `tx`, tidak ada `db.` (koneksi kedua + pool 5 ⇒ kelaparan bila ≥5 transaksi serentak); (2) tak ada `await storage()`/`fetch`/`Bun.sleep` di dalam callback; (3) kunci baris untuk invarian himpunan (pengelola) lewat `tx.select().from(project).where(eq(project.id,id)).for('update')` — **ASUMSI** tersedia di Drizzle 0.45.2 (diverifikasi saat implementasi), tanpa itu pakai `sql\`… FOR UPDATE\``; (4) `audit()` hanya **setelah** commit (memakai `db` global; best-effort `audit.ts:62-89`); (5) objek storage: tulis dulu → tx → bila tx gagal hapus objek (log `warn`); hapus: tx dulu → hapus objek sesudah commit (pola `dropObject`, `app-avatar.ts:55-64`). **[FONDASI, opsional S]** `DB_POOL_MAX` env (bawaan 5) agar bisa dinaikkan tanpa ubah kode; tanpa itu, pertahankan transaksi < 50 ms.

### 3.7 (g) Pagination dan pencegahan N+1

**Keputusan: cursor keyset sebagai bawaan; offset dilarang untuk daftar tugas/tiket/log.**

| Daftar | Skema | Alasan |
|---|---|---|
| Tugas, timeline tugas, inbox, sampah, acara, proyek, aktivitas proyek | **cursor** `{items,nextCursor}` | baris baru terus masuk (offset menggeser/duplikat), `OFFSET n` memindai n baris (20 ribu tugas, R02 §3.10), UI "Muat lebih banyak" ramah lansia (**ASUMSI**; konfirmasi R05) |
| Tim (R08), daftar admin konsol yang ada | offset + `total` (`parsePaging`, `analytics-paging.ts:23-31`) | ≤50 orang, butuh total |
| Anggota, tahapan, jenis, tag, checklist, lampiran | utuh dengan batas keras konstanta (`PROJECT_MEMBERS_MAX` dst.) | terbatas secara domain |

Kontrak: `?limit` (bawaan `PAGE_SIZE=25`, maks `MAX_PAGE_SIZE=100`, impor dari `analytics-paging.ts:5-6`) dan `?cursor` (string buram). `server/pm/keyset.ts`: registri `SORTS` tertutup (`due|priority|updated|created|number`), tiap entri = kolom urut + arah + penutup `id` (`ORDER BY due_date ASC NULLS LAST, id ASC`, cocok indeks `(assignee_id,status,due_date)` R02 §3.7); cursor = `base64url(JSON{s:sortId,k:[nilai,id]})`, divalidasi (sort harus sama dengan request, tipe nilai dicek) → 400 `BAD_CURSOR` bila rusak; predikat cabang untuk kolom nullable: `nilai IS NULL` → `due_date IS NULL AND id > :id`, selain itu `(due_date > :d OR (due_date = :d AND id > :id) OR due_date IS NULL)`. Ambil `limit+1` baris untuk menentukan `nextCursor`. `total` hanya lewat `GET /tasks/counts` (satu `GROUP BY`), tidak per halaman. Pengelompokan "Terlambat/Hari ini/…" dihitung klien dari aliran terurut + hitungan server.

**N+1:** (1) daftar tugas ≤3 query tetap: query utama (`leftJoin user` untuk assignee, `leftJoin project`), query batch `task_tag/ checklist progress WHERE task_id = ANY(:ids)` dikelompokkan di memori, `loadMembership(userId, projectIds[])` satu query (R03 R6); (2) hitungan memakai agregat `count(*) FILTER (…)`, bukan per baris; (3) label/terlambat/mandek dihitung dari kolom yang sudah dipilih (R03 `taskLabels`), tidak query; (4) `can` ringkas per baris dari membership yang sama. **Tes penjaga:** `tests/pm/query-count.test.ts` membuat instance Drizzle dengan `logger.logQuery` penghitung (ASUMSI; `db/index.ts` tak punya logger) dan menegaskan `GET /tasks?limit=50` ≤ 4 query untuk 50 baris dengan 3 proyek dan 10 tag; target waktu R09 (`/tasks?limit=50` ≤ 200 ms).

### 3.8 (h) Unggah bukti lewat `server/storage`

Alur `POST /tasks/:ref/attachments` (`app-tasks.files.ts` → `tasks/attachments.service.ts`):
1. `canAttach` (R03) → `storageEnabled()` else 503 `STORAGE_DISABLED` (pola `app-avatar.ts:78`). Limiter unggah (10/mnt/user).
2. Tolak lebih awal bila `content-length` > `ATTACHMENT_MAX_BYTES` (413) — butuh **[FONDASI, R12] `maxRequestBodySize` eksplisit di `Bun.serve`** (`prod.ts:47`, `dev.ts`, `binary-entry.ts`; bawaan Bun 128 MB per R12 F7), sebab Elysia mem-parse multipart ke memori **sebelum** handler; cek ukuran Blob di handler (pola `app-avatar.ts:82`) tetap dipertahankan.
3. Magic bytes, bukan `Content-Type`: `sniffImage` (`app-avatar.ts:27`) + `%PDF-`; MVP gambar + PDF (R12 R7); SVG/HTML dilarang. Nama asli disimpan hanya di kolom `file_name` (disanitasi, dipakai di `Content-Disposition`), bukan di kunci.
4. Kunci objek `app/attachments/<uploaderId>/<uuid>.<ext>` (CLAUDE.md "Storage"); DB menyimpan **key**, bukan URL.
5. Urutan: `storage().write(...)` → `inTx`{ hitung lampiran tugas `< ATTACHMENTS_PER_TASK` (409 `ATTACHMENT_LIMIT`), `insert task_attachment`, `insert task_activity` } → bila tx gagal: hapus objek (log `warn`). Konstanta (ASUMSI, di `server/pm/limits.ts`): `ATTACHMENT_MAX_BYTES = 10 MB`, `ATTACHMENTS_PER_TASK = 20`.
6. Unduh `GET /api/app/files/:attachmentId` (`app-files.ts`): `canViewTask` atas tugas induk, lampiran `deleted_at IS NULL`, tugas tidak di Sampah; header `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` kecuali gambar (R12 R7). `storage-files.ts` tetap hanya `avatars/`.
7. Hapus: tandai `deleted_at` (+aktivitas); objek dihapus oleh pembersih Sampah 30 hari (R02 §3.5). Tautan (`type:'link'`) hanya `http(s)` (R12 R8).

### 3.9 (i) OpenAPI dan MCP

- **OpenAPI:** ikut otomatis; tidak ada rute PM yang perlu didaftarkan manual. Tindakan S: (1) `openapi.ts:41`: untuk jalur `/api/app/<modul>/…` pakai tag `app-<modul>` (segmen ke-4), selain itu tetap segmen ke-3, + tes di `tests/api/openapi*.test.ts` (spec punya tag `app-tasks`); (2) tiap rute memberi `detail: { summary }` bahasa Indonesia (tak memengaruhi tipe Eden); (3) tanpa skema respons (§3.4-4) — keterbatasan yang diterima dan dicatat di README bagian API (dilayani publik; tanpa rahasia). Spec dibuat sekali (`openapi.ts:80`) → biaya nol per request.
- **MCP:** **tidak ada alat PM di server MCP debug MVP.** Alasan: autentikasi MCP hanya kunci `mcp` (minRole super-admin) atau token bersama tanpa identitas (F10), jadi izin per anggota proyek mustahil dievaluasi; mengisinya membocorkan semua proyek ke setiap kunci/token. Pengecualian kecil S: `get_db_stats` (`mcp/tools/db.ts:9-42`) ditambah hitungan baris `project/task/event` (agregat, tanpa isi) + `MCP_TOOL_CATALOG` (`tool-catalog.ts`) dan tes katalog `tests/mcp/tool-catalog.test.ts` ikut. **MCP produk (fase 5):** endpoint terpisah (mis. `/api/mcp-app`), autentikasi kunci `app:*` → `toPrincipal(owner)` → fungsi service yang sama; alat tipis (`list_my_tasks`, `get_task`, `add_comment`, `start_task`, `complete_task`), tanpa `approve`. Alternatif ditolak: menambah alat PM ke MCP debug.

### 3.10 (j) Rate limit endpoint buat/ubah

Masalah: limiter global per-IP 100/60 dtk (`env.ts:32-33`) satu bucket per IP kantor, tidak membedakan baca/tulis/unggah, berjalan sebelum identitas diketahui (F6; R12 F6). Rekomendasi:
1. **Pertahankan** limiter IP (pertahanan banjir anonim), jangan dinaikkan global; `/api/app/inbox/count` dikecualikan (R07).
2. **Tambah** dua instance `RateLimiter` berkunci user id di `server/pm/limits.ts`: `writeLimiter = new RateLimiter({ windowMs: 60_000, limit: PM_WRITE_LIMIT_PER_MIN, excludePrefixes: [] })`, `uploadLimiter` (`PM_UPLOAD_LIMIT_PER_MIN`). Nilai bawaan **ASUMSI**: 60 dan 10; dapat diganti env (`PM_WRITE_LIMIT_PER_MIN`, tidak hardcode, aturan global #15). Kelas yang sama (`rate-limit.ts:91-105`), tidak ada kode limiter baru.
3. Diperiksa di `app-context.onBeforeHandle` sesudah identitas diketahui (kunci `u:<userId>` → kantor satu IP tidak saling mengganggu; kunci API memakai id pemilik sehingga kuota gabungan). Limiter unggah dipanggil oleh `app-tasks.files.ts` (rute spesifik). Lewat batas → `status(429, {code:'RATE_LIMITED', retryAfterSeconds})` + header `retry-after`; `logRateLimit({userId, …})` (`rate-limiter.ts:44-50`) hanya untuk episode pertama.
4. Keterbatasan (sama dengan limiter IP, `rate-limit.ts:35`): memori satu proses, hilang saat restart, tidak dibagi antar-instance; cukup untuk MVP 1 instance, dicatat sebagai utang (`TODO(rate-limit): …`).
5. Tulis berat lain (impor CSV, ditunda fase 5) wajib limiter tersendiri saat dibangun.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| 422 mendahului 401 pada POST anonim (kebocoran skema; sapuan auth R09 gagal) | Tinggi (terbukti probe) | Sedang | `derive` melempar `Response` 401 (§3.1) + tes baru; tanpa itu sapuan R09 diganti kirim body valid |
| Kunci ber-`app:write` menyetujui/menghapus/mengubah anggota | Sedang | Tinggi | `PM_KEY_DENY` + tes sapuan rute↔scope (§3.3); tinjau tiap rute baru lewat tes yang gagal bila rute `/api/app/` tak terpetakan |
| Kelaparan pool DB (`max: 5`) oleh transaksi panjang/`db` di dalam tx | Sedang | Tinggi | Aturan §3.6 + tes pemindai `tx-discipline`; transaksi <50 ms; opsional `DB_POOL_MAX` |
| N+1 pada daftar tugas karena `can`/label per baris | Sedang | Sedang | Batch `loadMembership`, ≤4 query, tes hitung query (§3.7) |
| Limiter IP 100/mnt menjepit kantor satu IP (30 pengguna × beberapa panggilan per halaman) | Sedang | Sedang | Pengecualian `inbox/count` (R07); ukur di smoke; limiter user hanya menambah proteksi tulis; bila perlu naikkan `RATE_LIMIT_MAX` lewat Pengaturan (bukan kode) |
| Unggah besar memenuhi memori sebelum cek ukuran (`Bun.serve` tanpa `maxRequestBodySize`) | Sedang | Tinggi | [FONDASI R12] set eksplisit di 3 titik masuk; cek `content-length` dini; tes C-UPL-2 |
| Tipe Eden membengkak (galat "excessively deep") dengan handler riil | Rendah | Sedang | ≤10 rute/instance, DTO eksplisit, tanpa `response:`; anggaran 9 dtk (§3.4); `appClient` sempit |
| Berkas rute melampaui 150 baris / `scopes.ts` 190+ baris | Sedang | Rendah | Pisah per bagian (§3.1); `PM_KEY_DENY` di berkas baru; tes file-health sudah ada di konsol `/dev` |
| Nama berkas/rencana bentrok antar-laporan (K-A) → konflik merge paralel | Sedang | Sedang | Fase 0 membuat semua stub `app-*.ts` + `.use()` di `app.ts` (R14), irisan hanya mengisi |
| Dua orang mengubah tugas serentak (lansia, klik ganda) menimpa | Sedang | Sedang | `UPDATE … WHERE status=:dari RETURNING` → 409 `STATE_CONFLICT`; `baseUpdatedAt` untuk teks panjang (R08) |
| `ROLE_RANK` 3 role: kunci PM gagal-tertutup setelah rename | Tinggi | Sedang | Fase 0 isi 4 role + tes `scopesForRole` 4×16 (R09 A7) |

## 5. Estimasi usaha (pekerja AI + 1 reviewer manusia)

| Paket | Ukuran | Hari-orang AI | Reviewer |
|---|---|---|---|
| Fase 0 API: `app-context`, `unauthorizedResponse` [FONDASI], `server/pm/{errors,tx,keyset,limits}`, `scopes.pm.ts`, stub semua `app-*.ts`, tes sapuan rute↔scope↔401 | M | 2–3 | 0,5 |
| Proyek (4 berkas rute + service/query + 31 rute + tes) | L | 3–4 | 0,5–1 |
| Tugas (daftar keyset, alur kerja, detail, komentar/timeline) | L | 4–6 | 1 |
| Lampiran + unduh + sniff PDF + `maxRequestBodySize` [FONDASI] | S–M | 1–2 | 0,5 |
| Rute Beranda/Inbox/Acara/Tim/Sampah/Pengaturan (hanya lapisan HTTP + tes; logika milik R07/R08) | M | 2–3 | 0,5 |
| OpenAPI tag, `get_db_stats`, README bagian API | S | 0,5 | 0,25 |
| **Total** | **L** | **11–17** (sebagian paralel; jalur kritis 7–10) | **2–3** |

## 6. Pertanyaan terbuka untuk user

1. Boleh menyetujui/mengembalikan tugas (`approve`/`return`) lewat API key? Rekomendasi: **tidak** di MVP (pemisahan pemeriksa).
2. Daftar tugas: tombol "Muat lebih banyak" (cursor) cukup, atau perlu nomor halaman? Nomor halaman memaksa `offset` + total (lebih lambat di 20 ribu tugas).
3. Batas unggahan: 10 MB dan 20 bukti per tugas, format gambar + PDF — cocok? (R12 pertanyaan 6 sama.)
4. Batas tulis 60/menit/pengguna dan unggah 10/menit sudah wajar untuk tim 30 orang yang berbagi satu IP kantor?
5. Setuju mengubah `api-error.ts`/`app.ts` (6 baris + tes) agar anonim selalu 401 sebelum validasi?
6. Apakah nomor tugas `#482` dipakai di URL (`/app/tasks/482`)? Itu menentukan `:ref` menerima nomor.
7. MCP produk untuk agen AI masuk fase 5 saja, atau perlu lebih awal?

## 7. Sumber

**Kode (dibaca, path:baris di §2.1):** `server/api/index.ts`, `app.ts`, `posts.ts`, `posts.query.ts`, `admin.ts`, `app-avatar.ts`, `storage-files.ts`, `openapi.ts`, `analytics-paging.ts`, `settings-ops.ts`; `server/api-error.ts`; `server/rate-limit.ts`; `server/middleware/rate-limiter.ts`; `server/api-keys/{scopes,plugin}.ts`; `server/guard.ts`, `roles.ts`, `permissions.ts`, `audit.ts`; `server/mcp/{index,tool-catalog}.ts`, `mcp/tools/db.ts`; `server/db/index.ts`; `server/storage/index.ts`; `server/prod.ts`; `server/env.ts`; `app/lib/eden.ts`, `app/lib/avatar-api.ts`; `tests/api/app.test.ts`; `tests/api-keys/scopes.test.ts`; `package.json`; `tsconfig.json`; `node_modules/drizzle-orm/postgres-js/session.js:108-139`.
**Versi (dari `node_modules/*/package.json`):** elysia 1.4.30, @elysiajs/eden 1.4.9, @elysia/openapi 1.4.16, drizzle-orm 0.45.2, postgres 3.4.9, typescript 7.0.2.
**Laporan lain:** R02 (§3.2, 3.5, 3.7), R03 (§3.7, matriks, daftar `can*`), R07 (§P2, polling inbox), R08 (§3.1–3.4), R09 (A7, E7, target performa), R12 (F5–F8, F12, R7, R8, C-AUTH-7, C-KEY-1, C-UPL-2), R14 (rute bersama, Fase 0). Desain: `03-desain/erd/diskusi/{02-proyek,03-tugas}.md` (matriks izin, alur status).
**Eksperimen (tidak ada di repo):** `/tmp/r04probe/{p,q2,q3,q4}.ts` (perilaku Elysia), `/tmp/r04probe/gen.ts` + `tsconfig.json` (benchmark Eden), `tsc --noEmit --singleThreaded --extendedDiagnostics` terhadap repo (baseline).
