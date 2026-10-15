# R05 — Arsitektur Frontend `/app` (Simple PM)

> 15 Okt 2026. Riset saja: tidak ada kode diubah. Acuan: `_BRIEF.md`, `erd/diskusi/{00,03,04,05,06,07,08,09}`, kode di `app/`, `server/`, `tests/`. Format `path:baris` = benar-benar dibaca. **ASUMSI** = tidak diverifikasi. Laporan lain dirujuk dengan nama file (R07 Beranda/Inbox, R08 Events/Tim/Sampah/Pengaturan, R03 policy). Nama endpoint dan bentuk DTO di sini sementara; sesuaikan bila R04 (API proyek/tugas) berbeda.

## 1. Ringkasan eksekutif

1. **Pohon rute**: 22 berkas rute (21 halaman + 1 redirect) di bawah `layout('routes/app/layout.tsx')`, slug Inggris, **hanya satu layout bersarang** (`/app/projects/:projectId` dengan 5 anak). Filter, tampilan (Daftar/Papan/Kalender), dan tab Inbox hidup di **search param URL**, bukan `useState`, supaya tombol Kembali dari detail mengembalikan daftar yang sama.
2. **`tests/app-routes.test.ts` harus diubah** sebelum rute bersarang dibuat: ia memakai `layout.children.includes(e)` (baris 30) dan hanya memeriksa guard anak langsung (baris 34), jadi rute di dalam layout proyek gagal. Perbaikannya 2 baris (rekursif).
3. **Detail tugas = halaman penuh** `/app/tasks/:number` (menguatkan keputusan #17 desain). Drawer dan split view **ditolak**: isi drawer Mantine tidak ada di HTML SSR (`Portal.mjs:50`), deep link dari Inbox tak punya latar yang jelas, dan alur Kembalikan/Batalkan sudah memakai modal (tumpuk modal di atas drawer membingungkan lansia).
4. **Pola halaman**: loader SSR (guard di baris pertama) → `toJson` → react-query `initialData`; semua tulis lewat API Elysia (bukan `action` React Router) lewat hook `use<Entity>Actions` + `confirmAction` + `notify`. Form memakai `@mantine/form` (sudah terpasang, `LoginForm.tsx:56`).
5. **Papan tanpa drag-and-drop** (tanpa dependensi baru): perpindahan kolom mengikuti mesin status dan izin, bukan bebas, jadi tombol "langkah berikutnya" (keputusan #16) adalah mekanisme utama. **Kalender**: grid bulan buatan sendiri (~150 baris + fungsi murni teruji); `@mantine/dates` **ditolak** (peer `@mantine/core` tepat 9.7.2 + `dayjs` belum terpasang; proyek di 9.6.0).
6. **Ukuran teks**: `theme.scale` dari cookie `pm-text-size` yang dibaca loader root (tanpa kilatan), sesuai R08, **ditambah dua jebakan yang belum tercatat**: ikon `react-icons` memakai `size={14}` piksel sehingga tidak ikut membesar (pakai satuan `em`), dan semua `maw` numerik ikut diskala.
7. **Kerangka**: titik-henti sidebar `/app` dinaikkan ke `md` (992px) agar tablet portrait memakai header + burger berlabel "Menu"; tinggi tombol Mantine `sm` = 36px, `md` = 42px (`styles.css:3401`, `:1411`), jadi target 44px butuh `size="lg"`/default tema.
8. **Katalog**: 12 komponen dasar `ui/` + 8 komponen domain `pm/` + 4 hook, urutan bangun di §3.4. Estimasi FE (di luar UI yang sudah diestimasi R07/R08): **L, 32–47 hari-orang AI + 6–9 hari reviewer**.

## 2. Temuan (dengan bukti)

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| F1 | Layout `/app` sudah ada: `requireUser`, `AppFrame`, `Outlet context`; `NAV` masih placeholder (App, Profile); `consoleLabel="App"` | `app/routes/app/layout.tsx:18-21,37-44,60` | NAV, badge, Area lain diganti di sini |
| F2 | Tes kontrak `/app` tidak mendukung rute bersarang: tes 2 butuh anak **langsung** layout, tes 3 hanya memindai `layout.children` | `tests/app-routes.test.ts:25-31,33-40` | Wajib diubah (§3.1) |
| F3 | Tes `meta()` mengambil semua `'routes/...tsx'` dari `routes.ts` (regex kutip tunggal) dan mengecualikan hanya modul tanpa `export default` atau yang `return null` | `tests/app-contracts.test.ts:6-11,24-35` | Rute redirect `/profile` tanpa komponen lolos; layout proyek **wajib** `meta()` |
| F4 | Guard: `requireAnyRole` yang gagal **mengalihkan diam-diam** ke `homeFor(role)`; tidak ada 403 | `server/guard.ts:26-30`; `server/permissions.ts:44-49` | Halaman khusus peran (Proyek baru untuk Member) lebih baik 403 ramah, bukan lompat ke `/app` |
| F5 | Pola halaman data: loader memanggil fungsi `@server/api/*.query` langsung, `toJson`, react-query `initialData` + `initialDataUpdatedAt`; **filter di `useState`** (hilang saat pindah halaman) | `app/routes/super/posts.tsx:57-88,71-75`; `app/lib/loader-json.ts` | Perlu filter di URL untuk Kembali yang benar |
| F6 | Klien API: **11 salinan** `async function request` per `*-api.ts`; `~/lib/eden` diekspor tetapi **tidak diimpor oleh siapa pun** di `app/` | `grep` `app/lib` (11 berkas); `app/lib/eden.ts:14`; `app/lib/posts-api.ts:54-67` | CLAUDE.md menyuruh Eden; praktik nyata `fetch`. Keputusan §3.3 |
| F7 | Aksi async: `usePostActions` = `useMutation` + `invalidateQueries` + `notifications.show` + `modals.openConfirmModal` + `busyId` | `app/components/posts/usePostActions.tsx:10-70` | Dijadikan pola baku, dibungkus helper |
| F8 | Form: `@mantine/form` terpasang (`^9.6.0`), dipakai satu tempat (`mode:'uncontrolled'`); `PostForm` memakai `useState` manual | `package.json:38`; `LoginForm.tsx:14,56-65`; `PostForm.tsx:20-27` | Pola form baku = `useForm` |
| F9 | `AppFrame`: header hanya mobile (`height:{base:52,sm:0}`), `breakpoint:'sm'`, `padding="md"`; "Area lain" memakai **hanya** `secondary[0].items`; `ROLE_SHORT` hanya `user/admin/super-admin` | `AppFrame.tsx:43,120-127,213` | Perlu prop `navBreakpoint`, peta peran baru |
| F10 | Badge sidebar: `NavBadge{value,color,tooltip,tone}`; `withBadges` menyembunyikan 0; sumber `/dev` memakai **cache satu promise global** (aman karena tak per-user) | `frame/nav.ts:4-10,39-50`; `server/sidebar-badges.ts:204-212`; R07 F1 | Badge `/app` per-user: **jangan** pakai cache global itu |
| F11 | Cookie preferensi terbaca SSR: `mk-sidebar-collapsed` (`server/sidebar.ts:1-12`) dan `tz` (`time-format.ts:13-31`); root loader sudah mengembalikan `clock` | `app/root.tsx:20-22` | `pm-text-size` mengikuti pola ini |
| F12 | `theme.scale` → `--mantine-scale`; **670** pemakaian `var(--mantine-scale)` di CSS Mantine; `rem()` membungkus angka/`px` menjadi `calc(Xrem * var(--mantine-scale))` | `node_modules/@mantine/core/styles.css`; `esm/core/utils/units-converters/rem.mjs:2-4`; `default-css-variables-resolver.mjs:22` | Skala = "zoom" seluruh UI Mantine, termasuk `maw`, `p`, tinggi kontrol |
| F13 | Ikon dipakai dengan piksel (`size={14}`, `{18}`, `{24}`) | `posts.tsx:125,134`; `AppFrame.tsx:139,180`; `home.tsx:34` | Tidak ikut skala → ikon mengecil relatif terhadap tombol |
| F14 | `Portal` menampilkan `null` sampai `useEffect` jalan; `Drawer` default `withinPortal: true` | `esm/components/Portal/Portal.mjs:35-51`; `Drawer.mjs:19` | Isi drawer tak ada di HTML SSR |
| F15 | Tinggi tombol Mantine: xs 30, sm 36 (`2.25rem`), md 42; input md = `2.625rem` | `styles.css:3401-3402,1409-1412` | CLAUDE.md ("size=sm (44px)") **tidak akurat**; 44px butuh `md`+ |
| F16 | `@mantine/dates@9.7.2` (terbit 2026-10-11): peer `dayjs>=1`, `@mantine/core` **tepat 9.7.2**; `dayjs` tidak terpasang; `date-fns` ada di `node_modules` tetapi bukan dependensi langsung | registry npm; `package.json:37-62`; `ls node_modules` | Kalender Mantine memaksa naik versi semua paket Mantine + dependensi baru |
| F17 | `<html lang="en">` pada UI berbahasa Indonesia | `app/root.tsx:46` | Pembaca layar salah ucap; perbaiki jadi `id` (di luar lingkup, **dilaporkan**) |
| F18 | `/dashboard` admin sudah punya "Area lain"; rujukan `/profile` di 3 NAV, `LinkedAccountsCard.tsx:44`, `seo.ts:16`, 2 tes | `admin/layout.tsx:19,22`; hasil `grep '/profile'` | Daftar kerja pelepasan §3.9 |
| F19 | Berkas rute ≤150 baris, komponen idealnya ≤200 (keras 500); `AppFrame.tsx` 255, `sidebar-badges.ts` 213 sudah di atas batas | aturan global §8; `wc -l` | Halaman besar (detail tugas) wajib dipecah ke komponen; badge `/app` di berkas baru |
| F20 | Notifikasi Mantine di kanan-atas, tanpa durasi khusus | `root.tsx:103` | "Urungkan" (Sampah #3) butuh helper dengan durasi panjang |

**Pertentangan dengan laporan lain**: (1) R08 §3.4 menaruh `consoleLabel`/nav `/profile` sebagai "ganti 3 NAV"; saya setuju, dan menambah bahwa NAV app **bertambah menjadi 2 grup** (§3.2). (2) R07 menaruh lonceng di slot `BrandHeader extra` (`AppFrame.tsx:162`); itu bertabrakan dengan burger header mobile hanya jika dua-duanya di tempat yang sama, jadi header mobile juga memuat lonceng (R07 sudah menyebut) dan **tablet portrait ikut header itu** (§3.8).

## 3. Rekomendasi

### 3.1 Pohon rute `/app` dan cara mendaftarkannya (butir a)

`app/routes.ts` (ganti blok `layout('routes/app/layout.tsx', [...])`, sekarang baris 13-16). Semua kutip tunggal `'routes/...tsx'` (regex F3).

```ts
layout('routes/app/layout.tsx', [
  route('app', 'routes/app/home.tsx'),                       // Beranda (ganti placeholder)
  route('app/inbox', 'routes/app/inbox.tsx'),
  route('app/projects', 'routes/app/projects.tsx'),
  route('app/projects/new', 'routes/app/project-new.tsx'),
  route('app/projects/:projectId', 'routes/app/project/layout.tsx', [   // satu-satunya layout bersarang
    index('routes/app/project/summary.tsx'),
    route('tasks', 'routes/app/project/tasks.tsx'),
    route('phases', 'routes/app/project/phases.tsx'),
    route('members', 'routes/app/project/members.tsx'),
    route('settings', 'routes/app/project/settings.tsx'),
  ]),
  route('app/tasks', 'routes/app/tasks.tsx'),
  route('app/tasks/new', 'routes/app/task-new.tsx'),
  route('app/tasks/:number', 'routes/app/task-detail.tsx'),   // nomor global #482, bukan id
  route('app/events', 'routes/app/events.tsx'),
  route('app/events/new', 'routes/app/event-new.tsx'),
  route('app/events/:eventId', 'routes/app/event-detail.tsx'),
  route('app/events/:eventId/edit', 'routes/app/event-edit.tsx'),
  route('app/team', 'routes/app/team.tsx'),
  route('app/team/:userId', 'routes/app/team-member.tsx'),
  route('app/trash', 'routes/app/trash.tsx'),
  route('app/settings', 'routes/app/settings.tsx'),
  route('profile', 'routes/app/profile.tsx'),                // jadi redirect (§3.9)
]),
```

- **Static menang atas dinamis** (`/app/projects/new` vs `:projectId`, `/app/tasks/new` vs `:number`) pada ranking React Router (**ASUMSI** dari perilaku React Router; tes cepat di spike). Nomor tugas non-angka → loader melempar 404.
- **Tidak ada rute impor CSV** (ditunda ke fase 5 oleh `_BRIEF.md`); jalur `/app/tasks/import` dicadangkan.
- **Admin**: `/dashboard/users` dan `/dashboard/settings` (R08) di luar R05; hanya NAV dan "Area lain" yang dibahas (§3.2).
- **Wajib diubah di `tests/app-routes.test.ts`** (F2): ganti `layout?.children` dengan `flatten(layout?.children ?? [])` di tes 2 (`includes`) dan tes 3 (loop guard), agar anak bersarang ikut diperiksa. Tambah `tests/app-nav.test.ts`: tiap `NAV[].to` ada di `routes.ts` dan memenuhi `isNavActive` untuk path anaknya.
- **Guard per berkas**: setiap berkas rute, **termasuk `project/layout.tsx`** dan tiap anaknya, memanggil `requireUser(request)` (regex tes: `require(User|AnyRole|Role)\(request`). Loader layout dan anak berjalan paralel (CLAUDE.md), jadi anak **tidak boleh** bergantung pada guard layout proyek untuk izin: tiap anak memanggil fungsi akses `server/access` (R03) sendiri.
- **Izin khusus peran** (Proyek baru, Pengaturan proyek, Tim-beban): pakai `requireUser` lalu cek `can.*`; bila gagal `throw data(null, {status: 403})` → `AreaErrorBoundary` menampilkan halaman 403 (`error-page.ts:63-64` sudah memetakan 403/404). **Alternatif ditolak**: `requireAnyRole([...])` karena ia mengalihkan Member diam-diam ke `/app` (F4) tanpa penjelasan.
- **Bukan ditemukan/tidak terlihat → 404**, bukan 403 (tidak membocorkan keberadaan proyek/tugas). `meta()` rute dinamis memakai `loaderData` (pola `root.tsx:24`) dengan judul cadangan statis.

**Spesifikasi per halaman** (semua `meta` berbentuk `'… — Simple PM'`; semua guard `requireUser` + cek `can` bila disebut; data loader = fungsi servis yang sama dengan endpoint, R07 butir 2):

| Rute (berkas) | Judul `meta` | Loader (data awal) | Aksi tulis (hook) | Catatan |
|---|---|---|---|---|
| `/app` `home.tsx` | Beranda | `getHome(actor)` (R07) | – | 7 widget R07; sapaan dari `profiles.display_name` |
| `/app/inbox` `inbox.tsx` | Inbox | kartu tab aktif (`?tab=tanggapi\|kabar`) | `useInboxActions`: tandai dibaca, tandai semua | polling 30 dtk hanya saat terbuka (R07) |
| `/app/projects` `projects.tsx` | Proyek | `listProjects(actor, filters)` | – | filter URL: `lingkup`, `status`, `perhatian`, `urut`, `tampilan=daftar\|grid`, `q`, `hal` |
| `/app/projects/new` `project-new.tsx` | Proyek baru | opsi form (anggota terpilih, tanggal) | `useProjectActions.create` | 403 bila `!can.createProject`; langkah = `?cara=form` (AI/template ditunda) |
| `/app/projects/:projectId` `project/layout.tsx` | `{nama} — Simple PM` | `getProjectHeader` (404 bila tak terlihat) | `useProjectActions`: perpanjang tenggat (`ReasonModal`), ubah status | header: nama, `StatusBadge`, `ConditionPill`+alasan, Lead, tenggat, "Diperpanjang ×N"; tab = `NavLink`-tab via `<Outlet/>` |
| …/ `project/summary.tsx` | Ringkasan {nama} | progres, tahapan berikut, tugas terlambat/penting, aktivitas | – | menyetor `initialData` ke kunci `projectKeys.summary` |
| …/tasks `project/tasks.tsx` | Tugas {nama} | `listTasks({projectId,…})` | `useTaskActions` | memakai `TaskListView` yang sama dengan `/app/tasks` (filter proyek terkunci) |
| …/phases `project/phases.tsx` | Tahapan {nama} | tahapan+milestone+riwayat tenggat | mulai/selesaikan tahapan, +tahapan, +milestone | hanya Pengelola/Admin melihat tombol |
| …/members `project/members.tsx` | Anggota {nama} | anggota+peran | tambah, ubah peran, keluarkan (`confirmAction`) | pengelola terakhir tak bisa keluar (pesan, tombol `disabled`+alasan) |
| …/settings `project/settings.tsx` | Pengaturan {nama} | setelan periksa, jenis, tag | simpan setelan, arsipkan jenis, kelola tag | 403 untuk non-Pengelola |
| `/app/tasks` `tasks.tsx` | Tugas | `listTasks(actor, filters)` (kelompok jadwal atau halaman) | `useTaskActions.nextStep` | URL: `lingkup=saya\|semua`, `tampilan=daftar\|papan`, `status`, `proyek`, `orang`, `jenis`, `prioritas`, `tag`, `urut`, `q`, `hal` |
| `/app/tasks/new` `task-new.tsx` | Tugas baru | proyek terpilih (`?proyek=`), anggota, jenis | `useTaskActions.create` | form 2 tahap ("Tampilkan lebih banyak"); "Tulis saja ✦" ditunda |
| `/app/tasks/:number` `task-detail.tsx` | `#{n} {judul} — Simple PM` | `getTaskDetail(actor, number)` + `can{}` | semua aksi (§3.5): langkah berikutnya, centang, komentar, bukti, setujui, kembalikan, batalkan, buka lagi, hapus | halaman penuh |
| `/app/events` `events.tsx` | Events | rentang sesuai `?tampilan=` | – | URL: `tampilan=daftar\|kalender`, `periode=akan\|lewat`, `bulan=YYYY-MM`, `mode=bulan\|minggu`, `tanggal` |
| `/app/events/new`, `…/:eventId/edit` | Event baru / Ubah event | proyek, peserta | `useEventActions` | dua tahap (05 #13) |
| `/app/events/:eventId` | `{judul} — Simple PM` | detail+notulensi | batalkan/hapus (`confirmAction`; berulang: 2 pilihan besar) | R08 |
| `/app/team`, `/app/team/:userId` | Tim / {nama} | orang+beban sesuai D10 (SQL, R08) | – | hanya baca |
| `/app/trash` | Sampah | `listTrash` | pulihkan, hapus permanen (Admin) | R08 |
| `/app/settings` | Pengaturan | profil, preferensi | simpan profil, ukuran teks, notifikasi, keluar | §3.7, §3.9 |

### 3.2 NAV, badge sidebar, dan "Area lain" per role (butir b)

**NAV** di `app/routes/app/layout.tsx` (ganti baris 18-21) jadi 2 grup, label Indonesia, ikon `react-icons/fi`:

| Grup | Item (`to`, label, ikon, `matchPrefix`) |
|---|---|
| (tanpa label) | `/app` Beranda `FiHome` (eksak) · `/app/inbox` Inbox `FiInbox` · `/app/projects` Proyek `FiFolder` · `/app/tasks` Tugas `FiCheckSquare` · `/app/events` Events `FiCalendar` · `/app/team` Tim `FiUsers` (semua `matchPrefix: true`) |
| `Lainnya` | `/app/trash` Sampah `FiTrash2` · `/app/settings` Pengaturan `FiSettings` |

Tiap item diberi `description` satu kalimat (muncul sebagai tooltip pada rel ciut dan judul). `consoleLabel="App"` (baris 60) → hapus (label teknis tidak berguna bagi awam).

**Area lain** (`secondaryNav`, per role; `AppFrame` hanya menampilkan satu daftar datar, F9):

| Role | `secondaryNav` di layout `/app` | Catatan |
|---|---|---|
| `member`, `project_manager` | tidak ada (prop `undefined`) | bagian disembunyikan oleh `AppFrame` (`secondary.length > 0`) |
| `admin` | Dashboard (`/dashboard`, `FiHome`) | sudah ada (`layout.tsx:24`) |
| `super-admin` | Dev Console (`/dev`), Dashboard (`/dashboard`) | sudah ada (`layout.tsx:25-28`); item "App" **tidak** ditambahkan di layout `/app` karena sudah berada di sana. Di `/dashboard` dan `/dev`, tautan "Ke aplikasi" (`/app`) **wajib ditambah**: `homeFor` mengirim Admin ke `/dashboard` dan super-admin ke `/dev` (`permissions.ts:44-49`), tetapi pekerjaan produk mereka ada di `/app` (00 §2) |

Peta peran di `AppFrame.tsx:43` (`ROLE_SHORT`) dan `layout.tsx:31-35` (`BADGE_COLOR`) diganti empat peran: `member` "Anggota" (gray), `project_manager` "PM" (indigo), `admin` "Admin" (blue), `super-admin` "Super" (grape). Catatan istilah: peran akun `member` dan peran proyek `member` sama-sama tampil "Anggota"; tooltip badge footer harus menyebut "Peran akun" (sudah `Role: …`, `AppFrame.tsx:226`), dan di UI proyek pakai "Pengelola/Anggota/Pemantau". **ASUMSI**: nama tampilan "Anggota" untuk akun `member` perlu konfirmasi (§6).

**Badge**: berkas baru `server/sidebar-badges.app.ts` (alasan: `sidebar-badges.ts` 213 baris sudah di atas batas, F19) dengan `appSidebarBadges(userId): Promise<SidebarBadges>`:

| Kunci | Nada | Nilai | Sumber |
|---|---|---|---|
| `/app/inbox` | `alert`, merah | jumlah kartu "Perlu Anda tanggapi" | `inboxActionCount` (R07 §3) |
| `/app/tasks` | `alert`, oranye, **opsional** (§6-Q7) | tugas saya yang terlambat | satu `count(*) filter` memakai indeks `tasks(assignee_id,status,due_date)` |

Aturan: **tanpa cache global** (cache `/dev` adalah satu promise untuk semua orang, `sidebar-badges.ts:204-212`; di `/app` itu membocorkan angka antar-user). Gagal-lunak seperti `safe()` (`sidebar-badges.ts:47-52`). Loader layout mengirim `navBadges`; komponen layout menimpa nilai Inbox dengan `useInboxCount()` (polling 60 dtk, R07) sebelum meneruskan ke `AppFrame`. Lonceng R07 tetap di slot `extra` dan header mobile.

### 3.3 Pola halaman, form, dan aksi async (butir c)

**P1 — Loader SSR + URL + react-query** (baku untuk semua daftar):
1. Loader: `const {user, role} = await requireUser(request)` (baris pertama) → parse `new URL(request.url).searchParams` lewat `parseXFilters()` (fungsi murni di `app/lib/<domain>-filters.ts`, dipakai loader **dan** halaman) → servis → `toJson<T>()` → `{ data, loadedAt: Date.now() }` (bentuk `posts.tsx:57-68`).
2. Halaman: `useUrlFilters(parseXFilters)` (hook baru, §3.4) membaca `useSearchParams`; `setFilters(patch)` memanggil `setSearchParams(next, {replace:true})` dan mereset `hal`. `useQuery({queryKey: xKeys.list(params), queryFn, placeholderData: keepPreviousData, initialData: sama(params, loaderParams) ? loaderData.data : undefined, initialDataUpdatedAt: loaderData.loadedAt, refetchOnMount: 'always'})`. `refetchOnMount:'always'` menjawab risiko data usang ≤30 dtk saat kembali dari detail (staleTime bawaan 30 dtk, `query.tsx:8`).
3. `export function shouldRevalidate({currentUrl, nextUrl}) { return currentUrl.pathname !== nextUrl.pathname; }` pada rute daftar: perubahan filter **tidak** menjalankan ulang loader (react-query yang mengambil); loader hanya jalan saat masuk/kembali. **Alasan**: tanpa ini tiap ketikan pencarian memukul loader dan API (pool DB `max:5`, R07 butir 2).
4. Rute detail memakai pola yang sama (`useQuery(detailKey, initialData)`), sehingga **satu** mekanisme pembaruan (invalidasi query) melayani header proyek, badge, dan tubuh halaman. Loader layout `/app` hanya untuk data yang tidak diubah aksi halaman (user, role, badge awal).

**Tulis lewat API Elysia, bukan `action` React Router.** Alasan: satu jalur izin (`server/access`, R03) yang sama dengan API key dan MCP; `action` akan menggandakan guard dan pemetaan scope. Klien: `apiRequest<T>()` di berkas baru `app/lib/http.ts` (ekstrak dari `posts-api.ts:54-67`; **jangan** menyentuh 11 salinan lama) atau Eden. **Keputusan**: modul baru memakai **Eden** (`client.api.app.<x>`, `eden.ts:14`) lewat satu `unwrap()` di `http.ts` yang melempar `Error(pesan API)`; tipe DTO diturunkan dari rute (tak ada salinan tangan seperti `PostRow`). **Alternatif ditolak**: `fetch` + tipe tangan (sudah terbukti menyimpang). **Syarat uji spike (0,5 hari)**: `bun run typecheck` tetap nol error dan waktunya tidak naik berarti setelah ±40 endpoint `app-*`; bila naik tajam, jatuhkan ke `fetch` bertipe untuk modul terbesar saja.

**Form** (`@mantine/form`, `mode:'uncontrolled'`, F8): `validate` memakai `isNotEmpty/hasLength/isEmail` dengan **batas dari modul murni bersama** (`server/tasks/task.limits.ts` dst., diimpor TypeBox server dan form; lolos `client-server-imports.test.ts` bila tanpa `env/db/Bun`). Server tetap otoritas: galat bidang kembali sebagai `{error, code, fields?: Record<string,string>}` → `form.setErrors(fields)` (**usulan**: `fields` opsional di `api-error.ts`; koordinasi dengan R03/R04). Tombol kirim `loading`; `disabled` hanya dengan alasan terlihat. Form panjang: `useUnsavedGuard(form.isDirty())` (RR `useBlocker` + `confirmAction` "Buang perubahan?"; **ASUMSI** `useBlocker` tersedia di mode framework v8, uji di spike). Zod terpasang (`package.json:62`) tetapi **tidak** dipakai untuk form (resolver butuh dependensi baru).

**Aksi async** (turunan `usePostActions`): hook `use<Entity>Actions()` mengembalikan fungsi + `busyId`; di dalamnya `useApiMutation({mutationFn, invalidate:[keys], success:'Tugas disimpan.', errorTitle:'Gagal menyimpan tugas'})` (helper baru) = `useMutation` + invalidasi + `notify.success/error`. Aksi merusak/sulit dibatalkan → `confirmAction()` (blocker CLAUDE.md). Pesan galat actionable: "Gagal menyimpan. Coba lagi." Setelah hapus: `notify.undo('Tugas dipindah ke Sampah', onUndo)` (08 #3, #13).

### 3.4 Katalog komponen bersama, urutan bangun (butir d)

Dua folder baru: `app/components/ui/` (netral domain) dan `app/components/pm/` (tampilan domain). Label di `app/lib/pm-labels.ts` (konstanta bernama, ≤200 baris; aturan "tanpa hardcode"). **Status, prioritas, kondisi selalu ikon + teks** (desain 02 #9), tidak pernah warna saja. Ikon baru memakai `size="1.1em"` (§3.7).

| # | Komponen (berkas) | Props ringkas | Pengganti/rujukan |
|---|---|---|---|
| 1 | `ui/PageContainer` | `size?: 'wide'\|'narrow'` (1320/880), `children` | menggantikan `Stack p maw` yang diulang (`posts.tsx:113`, `profile.tsx:64`) |
| 2 | `ui/PageHeader` | `title`, `description?`, `actions?`, `back?: {to, label}` | `Group wrap="wrap"` wajib (CLAUDE.md §3); meniru `LogPageHeader` |
| 3 | `ui/EmptyState` | `icon, title, description?, action?: {label, to\|onClick}, filtered?, onReset?` | generalisasi `VisitEmptyState.tsx`; salinan lama dibiarkan |
| 4 | `ui/confirmAction` (fungsi) | `{title, body, confirmLabel, danger?, onConfirm}` | membungkus `modals.openConfirmModal` (`usePostActions.tsx:55-67`); label bawaan "Batal" |
| 5 | `ui/ReasonModal` + `openReasonModal` | `{title, quick?: string[], categories?, requireNote?, confirmLabel, onSubmit({category?,reason})}` | satu komponen untuk Kembalikan, Batalkan, Buka lagi, Perpanjang tenggat (03 #22, 02 ⑫) |
| 6 | `ui/notify` (modul) | `success(msg)`, `error(title, msg)`, `undo(msg, onUndo)` | durasi: sukses 5 dtk, galat 8 dtk, undo 10 dtk (konstanta); warna teal/red seperti `usePostActions` |
| 7 | `ui/DateText` | `value, mode: 'date'\|'datetime'\|'relative'\|'due'` | memakai `useTimeFormat` (`time-format.ts`, aman hydration) |
| 8 | `ui/MemberAvatar`, `AvatarStack` | `user:{id,name,image}, size?, withName?` · `users, max=4` | `Avatar name color="initials"` + `referrerPolicy:'no-referrer'` (`UserDetailDrawer.tsx:30-37`) |
| 9 | `ui/ViewToggle` | `value, onChange, options:[{value,label,icon}]` | `SegmentedControl`; tombol berlabel teks |
| 10 | `ui/FilterPopover` | `activeCount, children, onReset` | tombol "Filter ▾" (05 #14) |
| 11 | `ui/ResponsiveTable` | `columns` (dengan `hideBelow?:'sm'\|'lg'`), `rows`, `renderCard` | `Box overflowX:auto` + kartu < `sm` (blocker CLAUDE.md §2) |
| 12 | `ui/BackLink` | `fallback: string, label` | `navigate(-1)` bila ada riwayat internal (**ASUMSI**: `window.history.state.idx > 0` pada RR; spike), jika tidak `Link` ke `fallback` |
| 13 | `pm/StatusBadge` | `kind:'task'\|'project'\|'event', status` | peta di `pm-labels.ts` |
| 14 | `pm/PriorityBadge` | `priority` | ikon + teks |
| 15 | `pm/ConditionPill` | `condition:'ok'\|'attention'\|'late', reason?` | ✓ Lancar / ! Perlu perhatian / ⏰ Terlambat + 1 kalimat (02 #9) |
| 16 | `pm/ScheduleLabel` | `label: 'late'\|'today'\|'blocked'\|'stale'\|'awaitingMyReview'\|'reopened'`, `count?` | satu label per baris, urutan prioritas dari R03 |
| 17 | `pm/ProgressBar` | `done, total, timePct?` | progres vs waktu |
| 18 | `pm/NextStepButton` | `task, can, onAction` | satu tombol langkah berikutnya, selalu terlihat (03 #16) |
| 19 | `pm/TaskRow`, `TaskCard`, `TaskTable` | `task, can, onNextStep` | List kelompok-jadwal, Papan, tabel "Semua tugas" |
| 20 | `pm/UserSelect`, `ProjectSelect` | `projectId?`, `value`, `onChange` | `Select` dengan avatar |
| 21 | Hook `useUrlFilters`, `useApiMutation`, `useUnsavedGuard`, `useInboxCount` | – | `app/lib/` |

**Urutan bangun** (tiap tahap bisa di-review sendiri): T1 `PageContainer`, `PageHeader`, `EmptyState`, `confirmAction`, `notify`, `pm-labels` → T2 badge (#13-17), `DateText`, `MemberAvatar` → T3 `useUrlFilters`, `useApiMutation`, `http.ts`, `ResponsiveTable`, `ViewToggle`, `FilterPopover` → T4 `ReasonModal`, `NextStepButton`, `BackLink`, `useUnsavedGuard` → T5 komponen tugas (#19, #20). Tiap komponen ≤200 baris; tes `bun:test` untuk fungsi murni (`parseXFilters`, peta label, kalender) dan satu tes render server (`renderToString`) untuk badge supaya tanpa ikon+teks gagal.

### 3.5 Evaluasi detail tugas: halaman penuh vs drawer vs split view (butir e)

**REKOMENDASI TEGAS: halaman penuh `/app/tasks/:number`** (sejalan dengan keputusan #17, `03-tugas.md:41`). Bukan drawer, bukan split view, bukan "drawer di desktop, halaman di mobile".

Alur wireframe ⑧-⑪ (`03-tugas.md:231-234`) yang diukur: header 8 atribut + label + tombol utama; 5 bagian berurutan (deskripsi, langkah, bukti, menahan/menunggu, obrolan+riwayat) dengan kotak komentar; banner "meminta Anda memeriksa"; unggah bukti; dua modal (Kembalikan, Batalkan); "← Kembali".

| Kriteria | Halaman penuh | Drawer (rute anak atau state) | Split (daftar + detail) |
|---|---|---|---|
| **SSR / paint awal** | isi ada di HTML | isi tidak ada di HTML (`Portal.mjs:50`); daftar tampil dulu lalu drawer "muncul" setelah hidrasi | detail bisa SSR, tetapi 2 loader + 2 gulir |
| **Deep link** (Inbox "Lihat tugas", tautan dibagikan, event→tugas) | URL = tampilan; tanpa latar yang harus dipilih | harus memilih latar (Inbox? daftar?) → kejutan | butuh daftar di kiri untuk setiap asal |
| **Tombol Kembali** | satu langkah = kembali ke daftar dengan filter URL utuh (P1) | Esc/klik luar/Kembali = 3 cara tutup yang berbeda; klik luar menutup dengan draf komentar belum terkirim | pilihan item mengisi riwayat berlapis |
| **Lansia / teks 125%** | lebar penuh; satu kolom gulir; `useUnsavedGuard` jelas | ±480-640px; pada skala 1,25 lebar efektif menyusut dan konten panjang jadi gulir-dalam-gulir | butuh ≥1200px; gagal di tablet portrait (768-1024) |
| **Modal Kembalikan/Batalkan** | modal di atas halaman: satu lapis | modal di atas drawer: dua lapis + fokus-trap ganda | sama dengan halaman |
| **Biaya** | 1 rute + komponen yang akan ada juga untuk tab Tugas proyek | + sinkron `?tugas=` + `Drawer` client-only + penanganan fokus | terbesar; dua keadaan "tak ada pilihan" |

**Kerugian halaman penuh dan mitigasinya**: kehilangan konteks daftar → (1) `BackLink` + filter di URL mengembalikan daftar yang sama dan posisi gulir (`ScrollRestoration` sudah ada, `root.tsx:90`); (2) setelah aksi, tetap di halaman dan data diperbarui lewat invalidasi query; (3) pemeriksa: setelah Setujui/Kembalikan tampil tombol "Periksa tugas berikutnya (N)" bila `awaitingMyReview > 0` (opsional, tidak menambah rute); (4) header memuat tautan proyek. **Kapan ditinjau ulang**: jika uji pengguna (Pertanyaan §6-Q1) menunjukkan keluhan kehilangan konteks, tambahkan **pratinjau baca-saja** (`Popover` di baris daftar), bukan drawer penyunting.

**Struktur berkas** (batas 150 baris/rute): `task-detail.tsx` ≈100 baris merakit `TaskHeader` · `NextStepBar` · `TaskChecklist` · `TaskEvidence` · `TaskDependencies` · `TaskTimeline` (+`CommentBox`) di `app/components/tasks/`; aksi di `useTaskActions.tsx`. Izin datang dari server sebagai `can{startWork, finish, requestReview, approve, returnTask, cancel, reopen, delete, edit, toggleReview}` (R03 butir 1), UI tidak menghitung izin sendiri. Tombol "Perlu diperiksa" `disabled` dengan `Tooltip` alasan ("Terkunci saat Menunggu diperiksa", keputusan #23).

### 3.6 Papan (kanban), List, dan Kalender tanpa dependensi baru (butir f)

R06 tidak bisa saya baca; berikut **opsi** berdasarkan kode terpasang dan registry. Terpasang: hanya `@mantine/{core,form,hooks,modals,notifications,nprogress}` (`package.json:37-42`); tidak ada `dayjs`, `@mantine/dates`, `@dnd-kit`.

**Daftar (List)**, dua bentuk satu data:
- *Tugas saya*: `TaskGroupList` = bagian per kelompok jadwal (Terlambat · Hari ini · Besok · Minggu ini · Nanti · Tanpa tenggat; 03 #15), isi `TaskRow` (judul, proyek, jenis, `PriorityBadge`, `ScheduleLabel`, `NextStepButton`). "Menunggu diperiksa saya" paling atas. Batas baris per kelompok dari API (mis. 20 + "Lihat semua"), tidak memuat seluruh tabel.
- *Semua tugas*: `TaskTable` kolom #, judul, jenis, status, prioritas, mengerjakan, tenggat, tag (8 kolom ≥4 → kartu di mobile + `overflowX`, CLAUDE.md §2). Tablet: `Jenis` dan `Tag` `visibleFrom="lg"`. Paginasi server 25/halaman (pola `posts.tsx:230`).

**Papan**: 4 kolom (Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai; Dibatalkan lewat chip status).
- **Opsi A (REKOMENDASI): tanpa drag.** `SimpleGrid cols={{base:1, sm:2, lg:4}}`; kolom = `Paper` + judul + hitungan + `TaskCard` besar dengan `NextStepButton`. Alasan: pindah status bukan bebas (mesin status `03-tugas.md:92-109`): `todo→done` hanya bila tak perlu diperiksa, `in_progress→in_review` butuh "Minta diperiksa", `in_review→done` hanya Setujui oleh Pengelola/Admin, Kembalikan/Batalkan butuh alasan. Seret-lepas membuat 4-5 jalur yang harus membuka modal alasan atau ditolak diam-diam, dan bertentangan dengan "tanpa aksi bergantung hover/gestur" untuk lansia. Wireframe ③: "pindah kartu lewat tombol di kartu, bukan hanya drag".
- Opsi B: HTML5 `draggable` native sebagai peningkatan nanti, tombol tetap jalur utama (±2 hari); **ditunda**. Opsi C (ditolak): `@dnd-kit`, dependensi baru tanpa kebutuhan terbukti.
- Data: endpoint `view=board` mengembalikan per status `{items(limit N), total}`; kolom Selesai dibatasi "14 hari terakhir" (konstanta bernama, **ASUMSI**, §6-Q5); tiap kolom punya "Tampilkan lebih banyak". Tanpa gulir horizontal di ≥`lg`; di bawahnya kolom bertumpuk.

**Kalender Events** (bulan + minggu, blok satu warna, 05 #15):
- **Opsi A (REKOMENDASI): grid buatan sendiri.** `app/lib/calendar.grid.ts` (fungsi murni, teruji): `monthMatrix(year, month, weekStart=1)` → 6×7 `{date:'YYYY-MM-DD', inMonth}`, `weekDays()`, `bucketByDay(events, tz)`, `shiftMonth()`. Aritmetika pada tanggal "dinding" (UTC murni untuk y-m-d) agar tak geser sehari; zona hari = `APP_TIMEZONE` (R08 baris 65, **ASUMSI** Asia/Jakarta). Komponen: `EventMonthGrid` (CSS grid 7 kolom, sel = tombol; ≤3 kapsul "09.00 Rapat…" + "+N lagi" membuka `Popover`), `EventWeekList` (7 kolom, tumpuk per hari, **tanpa grid jam** sehingga tak perlu algoritme tumpang-tindih), `EventCalendarBar` (← Oktober 2026 →, "Hari ini", Bulan/Minggu). ±5 berkas ≤150 baris. Bulan di URL (`?bulan=2026-10`); loader mengambil rentang grid (≤42 hari); `keepPreviousData` saat pindah bulan. "Hari ini" dari jam render bersama (`time-format.ts:6,60`) agar SSR = hidrasi. Di bawah `sm` grid diganti daftar agenda. Semantik `role="grid"`, sel `aria-label="Rabu 7 Oktober, 2 acara"`.
- Opsi B (ditolak): `@mantine/dates` 9.7.2, peer `@mantine/core` **tepat 9.7.2** + `dayjs`; proyek di 9.6.x (`package.json:37-41`) → naik versi semua paket Mantine + dependensi baru, padahal isi sel (`renderDay`) tetap kita tulis sendiri.
- Opsi C (ditolak): FullCalendar / react-big-calendar: berat, gaya tak mengikuti Mantine.
- Opsi D: bila R06 menemukan pustaka kecil yang cocok, bandingkan di spike 0,5 hari (ambang: <15 kB gzip, tanpa dependensi turunan baru).

### 3.7 Skala ukuran teks per user tanpa kilatan (butir g)

Sepakat dengan R08 §3.4 (`theme.scale` + cookie); pelaksanaan dan dua jebakan tambahan:

1. **Cookie** `pm-text-size` = `normal|large|xlarge`, 1 tahun, `SameSite=Lax`. Berkas murni `server/text-size.ts` (pola `server/sidebar.ts`): `TEXT_SIZE_SCALE = {normal:1, large:1.125, xlarge:1.25}` (R08, perlu uji pengguna), `getTextSize(request)`, `textSizeCookie(size)`.
2. **Root loader** (`root.tsx:20-22`) menambah `textSize`. `App()` membuat `useMemo(() => buildTheme(TEXT_SIZE_SCALE[textSize]), [textSize])` untuk `MantineProvider` (`root.tsx:101`); `app/lib/theme.ts` (kini `createTheme({})`, baris 8) menjadi fungsi `buildTheme(scale)`. Mantine menulis `--mantine-scale` ke `<style data-mantine-styles>` di HTML SSR, jadi **paint pertama sudah benar** (prinsip yang sama dengan `ColorSchemeScript`, `root.tsx:62`).
3. **Menyimpan**: tiga tombol besar di Pengaturan menulis cookie (`document.cookie`, pola `AppFrame.tsx:107-108`) dan `PATCH /api/app/profile {textSize}`, lalu `useRevalidator().revalidate()` → root loader jalan ulang → seluruh UI (modal, notifikasi, popover, turunan `<body>`) berubah seketika. Contoh tulisan di kartu ikut berubah (pratinjau gratis).
4. **Perangkat baru**: cookie kosong → Normal. `/go` (`go.tsx`, `guard.ts:102-106`) membaca `profiles.text_size` dan memasang `Set-Cookie` pada `redirect()` (R08 sama); bila cookie ≠ DB, loader `/app/settings` dan layout `/app` menyetel ulang (kilatan sekali, hanya perangkat yang tak lewat `/go`).
5. **Jebakan A, ikon**: `react-icons` ber-`size={14}` (F13) tetap piksel; tombol membesar, ikon tidak. Aturan komponen baru di `ui/` dan `pm/`: `size="1.1em"` (`1.25em` pada tombol besar). Berkas lama dibiarkan (di luar lingkup).
6. **Jebakan B, piksel mentah**: `maw={880}` dan prop gaya numerik Mantine lewat `rem()` sehingga ikut skala (F12), tetapi `style={{width: 110}}` (mis. `Field` di `DetailParts.tsx:9`) tidak. Komponen baru: prop Mantine atau `rem()`, bukan `style` px. `maw` ikut membesar = perilaku "zoom" (karakter per baris tetap), diterima.
7. **Spike 0,5 hari sebelum UI** (R08 juga mewajibkan): pada skala 1,25 periksa lebar navbar `AppShell` (**ASUMSI** terkonversi `rem`), lebar `Modal`/`Drawer`, `Notifications`, tinggi tombol (md 42→52px), `ScrollArea`, tabel di tablet. Lulus bila tak ada teks terpotong atau overflow horizontal pada 1024×768 dan 820×1180.
8. **Alternatif ditolak**: (a) menimpa `--mantine-scale` pada pembungkus (token `:root` sudah dihitung, portal di luar pembungkus; R08); (b) hanya `theme.fontSizes` (teks besar, tinggi kontrol tetap → terpotong); (c) `html{font-size:%}` (setara untuk rem Mantine, tetapi tak diketahui `useMantineTheme().scale`).

### 3.8 Layout desktop, tablet, layar lebar, dan kerangka responsif (butir h)

1. **Lebar konten**: `PageContainer` (katalog #1) `mx="auto" w="100%"`, `maw` = **1320** (`wide`: daftar, papan, kalender, beranda) atau **880** (`narrow`: form, detail tugas, pengaturan; sama dengan `home.tsx:23`). Desain meminta 1200-1440 (00 §5). Padding `p={{base:'sm', md:'md'}}` meniru halaman `/dev` (`posts.tsx:113`), agar tampilan konsisten.
2. **Tablet**: `AppFrame` menerima prop baru `navBreakpoint?: 'sm'|'md'` (bawaan `'sm'`, tidak mengubah `/dev`/`/dashboard`); `/app` memakai `'md'` (992px, `default-theme.mjs:97-103`). Tablet portrait (768-991) mendapat header + burger yang dibuka sebagai laci nav (kode ada: `AppFrame.tsx:129-151`), tablet landscape (≥992) mendapat sidebar. Alasan: sidebar 248px pada 768px menyisakan ±520px untuk konten; rel ciut 72px hanya berisi ikon dan label-nya bergantung hover/tooltip (`NavList.tsx:83-90`), yang tidak ada di layar sentuh. Header mobile memuat **kata "Menu"** di samping burger (ikon burger tidak dikenal sebagian lansia) dan lonceng R07. Perubahan: header `hiddenFrom={navBreakpoint}`, `header.height` pada breakpoint yang sama.
3. **Target sentuh**: tombol Mantine md = 42px, lg = 50px, sm = 36px (F15). Tema `buildTheme`: `Button/Select/TextInput` `defaultProps.size = 'md'`, aksi utama `lg`; `ActionIcon` default `lg` (**ASUMSI**: ukur, tinggi `ActionIcon` tidak diverifikasi); pada Besar/Sangat besar nilai ini naik ke 47/52px otomatis. `Badge` bawaan `lg` (26px, `styles.css:3136`) agar status terbaca. Jarak antar target `gap="xs"` minimum.
4. **Kerangka CLAUDE.md** dijamin oleh komponen (bukan ingatan): `PageHeader` (`wrap="wrap"`), `ResponsiveTable` (scroll + kartu), `SimpleGrid cols={{base:1, sm:2, lg:3}}`, `AppShell.Header` mobile sudah ada. Tambah ke `tests/app-contracts.test.ts`: untuk `app/routes/app/**` dan `app/components/{ui,pm,tasks,projects,events}/**` gagal bila ada `wrap="nowrap"` pada `Group` yang memuat `Button`, atau `<Table` tanpa `overflowX`/`Table.ScrollContainer` (heuristik regex; blocker CLAUDE.md §3 dan §2).
5. **Bahasa dokumen**: `lang="id"` pada `<html>` (F17; `root.tsx:46`) — kecil, tetapi memengaruhi pembaca layar dan format angka bawaan browser.
6. **Kontras dan fokus**: fokus keyboard Mantine dipertahankan (jangan `outline:none`); teks sekunder `c="dimmed"` dipakai hemat pada lansia (utama `c` biasa; kontras `dimmed` pada tema gelap **tidak diukur**, **ASUMSI** perlu cek WCAG AA di QA R09).

### 3.9 Rencana pelepasan `/profile` ke Pengaturan (butir i)

Dasar: R08 §3.4 (halaman `settings.tsx`, tabel `profiles`, `PATCH /api/app/profile`). Urutan langkah (tiap langkah satu commit `feat/refactor(settings)`; tes jalan hijau di antaranya):

1. Bangun `app/routes/app/settings.tsx` (+ daftarkan, NAV "Pengaturan") dengan kartu baru di folder **`app/components/account/`** (bukan `settings/`, yang sudah dipakai konsol dev: `AuthSettingsCard`, `BrandingCard`, …): `AccountCard` (foto, nama, panggilan, jabatan, divisi, HP, email baca-saja; "Ubah profil" = `Modal`, bukan rute baru), `AppearanceCard` (`TextSizePicker`, 3 tombol besar + contoh), `NotificationsCard` (2 saklar), `TeamSettingsLink` (Admin saja → `/dashboard/settings`), tombol **Keluar** (+`confirmAction` "Kamu akan keluar dari akun ini", blocker CLAUDE.md §1).
2. Pindah kartu lama **tanpa menulis ulang**: dipakai ulang `AvatarField`, `SessionsCard`, `LoginHistoryCard`, `ApiKeysCard`. Letakkan di bagian **"Lanjutan"** (`Accordion`, tertutup bawaan) karena bukan kebutuhan awam; `ApiKeysCard` hanya untuk `project_manager`+ (**usulan**, §6-Q8). `PasswordCard`, `LinkedAccountsCard` disembunyikan saat `email_auth_enabled=false` (login Google saja, 00 §4); `DangerZoneCard` disembunyikan di MVP (R08 Q6); `DemoProfileNotice` dihapus (demo anonim mati).
3. `profile.tsx` → **redirect**: `loader` memanggil `await requireUser(request)` lalu `throw redirect('/app/settings')`; tanpa `export default` (lolos tes `meta()` karena dikecualikan, F3, dan tes guard `app-routes` karena regex terpenuhi). Tautan lama dan bookmark tetap hidup.
4. Ganti rujukan (daftar F18): 3 NAV (`app/layout.tsx:20`, `admin/layout.tsx:19`, `super/layout.tsx:152`) → `/app/settings`; `LinkedAccountsCard.tsx:44` `callbackURL` → `/app/settings`; `UserMenu` tambah butir "Pengaturan". `server/seo.ts:16` dan `tests/seo.test.ts:12` **tetap** `/profile` (rute masih ada, tetap noindex); `tests/settings-domains.test.ts:74-78` tidak berubah.
5. Tes: `tests/app-routes.test.ts` otomatis memeriksa dua rute; tambah tes bahwa `/profile` mengalihkan (loader dipanggil dengan `Request` bersesi → `Response 302` ke `/app/settings`), dan bahwa `NAV` tak lagi memuat `/profile`.
6. Hapus `profile.tsx` (dan `ProfileForm.tsx`, `ProfileHeader.tsx`, `DemoProfileNotice.tsx`) pada rilis berikutnya setelah tak ada rujukan (`grep`), dicatat di CHANGELOG `Removed`.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Rute bersarang gagal tes kontrak `/app` (F2) atau guard anak terlewat karena loader paralel | Tinggi | Tinggi (data bocor atau CI merah) | Ubah tes jadi rekursif **sebelum** rute proyek; tiap anak memanggil `requireUser` + fungsi akses sendiri; tes kontrak baru memeriksa `can`/404 di tiap loader dinamis |
| `theme.scale` 1,25 merusak tata letak (lebar `px`, ikon, `AppShell`, modal) | Sedang | Tinggi (lansia = target utama) | Spike 0,5 hari pada 1024×768 dan 820×1180 sebelum UI; aturan ikon `em`; larangan `style` px di komponen baru; skenario QA per ukuran di R09 |
| Eden memperlambat/ merusak `typecheck` setelah puluhan endpoint | Sedang | Sedang | Spike mengukur waktu `tsc`; jatuh ke `fetch` bertipe per modul; `unwrap()` satu pintu memudahkan pertukaran |
| Data usang saat kembali dari detail (cache react-query 30 dtk, `query.tsx:8`) | Sedang | Sedang | `refetchOnMount:'always'` pada query daftar; invalidasi kunci di tiap aksi; `shouldRevalidate` hanya menahan perubahan search param |
| Detail tugas halaman penuh dikeluhkan "hilang konteks daftar" | Sedang | Rendah | Filter di URL + `BackLink` + `ScrollRestoration`; "Periksa berikutnya"; pratinjau baca-saja bila terbukti perlu (§3.5) |
| Sidebar berubah ke burger di tablet portrait membingungkan pengguna yang terbiasa | Rendah | Sedang | Kata "Menu" berlabel; keputusan eksplisit di §6-Q2; prop `navBreakpoint` membuat pembalikan 1 baris |
| Perubahan `AppFrame` (`navBreakpoint`, peta peran) memecahkan `/dev` dan `/dashboard` | Rendah | Sedang | Prop opsional dengan bawaan lama; `tests/frame-nav.test.ts` dan `smoke:prod` (CLAUDE.md "Build & Deploy") dijalankan |
| Kalender buatan sendiri salah hari (zona waktu, DST luar negeri, awal pekan) | Sedang | Sedang | Aritmetika tanggal-dinding murni + tes tabel (Okt 2026, 31 hari, tahun kabisat, awal pekan Senin); zona di satu konstanta |
| Label peran ganda "Anggota" (peran akun vs peran proyek) membingungkan | Sedang | Rendah | Kata terpisah di UI: akun = "Anggota tim", proyek = "Anggota"; tooltip menyebut "Peran akun"; konfirmasi §6-Q3 |
| Pekerjaan UI R05 tumpang tindih dengan estimasi UI R07/R08 | Sedang | Rendah | Estimasi §5 hanya fondasi + Proyek + Tugas + delta kalender/papan; koordinator mencocokkan |
| Galat bidang `fields` belum ada di `api-error.ts` | Sedang | Rendah | Usul kontrak ke R03/R04; tanpa itu form menampilkan galat umum di `Alert` |

## 5. Estimasi usaha

Bagian UI Beranda, Inbox, Events (daftar/form/detail), Tim, Sampah, Pengaturan sudah diestimasi di R07/R08; angka di bawah **tidak** mengulangnya (kecuali delta yang disebut). Hari-orang untuk pekerja AI; reviewer manusia terpisah. Angka adalah estimasi saya, bukan hasil pengukuran.

| Paket | Ukuran | Hari AI | Isi |
|---|---|---|---|
| Fondasi `/app` | M | 5-8 | rute+tes rekursif, NAV 2 grup, badge `/app`, `navBreakpoint`, peta peran, `buildTheme`+cookie teks (spike 0,5 + 1), `http.ts`/Eden + `unwrap`, `useUrlFilters`, `useApiMutation`, katalog T1-T4 |
| Proyek (FE) | L | 9-13 | daftar List/Grid, form baru, layout+5 tab, perpanjang tenggat, anggota, tahapan, pengaturan proyek |
| Tugas (FE) | L | 12-17 | List kelompok+tabel, Papan, form baru 2 tahap, detail penuh (≈9 komponen), 4 modal alasan, komentar+bukti |
| Kalender+delta Events | S-M | 3-4 | `calendar.grid.ts`+tes, `EventMonthGrid`, `EventWeekList`, bar navigasi |
| Pelepasan `/profile` | S | 1-2 | langkah §3.9 yang tak termasuk R08 (redirect, NAV, tes) |
| QA responsif/skala | S | 2-3 | uji 1024/820/375 × 3 skala, perbaikan overflow |
| **Total** | **L** | **32-47** | + **reviewer manusia 6-9 hari** (UX lansia, a11y, uji skala di perangkat nyata) |

## 6. Pertanyaan terbuka untuk user

1. **Q1**: Konfirmasi detail tugas = halaman penuh (rekomendasi tegas §3.5)? Ada 1-2 pengguna lansia yang bisa mencoba prototipe daftar→detail→kembali sebelum build penuh?
2. **Q2**: Tablet portrait (768-991px) memakai header + burger "Menu" (rekomendasi) atau tetap sidebar penuh/rel ikon?
3. **Q3**: Nama tampil peran akun `member`: "Anggota", "Anggota tim", atau "Member"? (Peran proyek sudah "Anggota".)
4. **Q4**: Papan tanpa drag-and-drop (hanya tombol langkah berikutnya) untuk MVP — setuju?
5. **Q5**: Kolom "Selesai" di Papan menampilkan 14 hari terakhir (usulan) atau semua dengan "Tampilkan lebih banyak"? Kalender Minggu cukup "daftar per hari" tanpa grid jam?
6. **Q6**: Bawaan ukuran teks akun baru: Normal atau Besar (R08 Q8)? Nilai 1,125/1,25 perlu uji pengguna.
7. **Q7**: Badge merah "terlambat" pada menu Tugas diinginkan, atau hanya badge Inbox (desain hanya menyebut Inbox)?
8. **Q8**: Bagian "Lanjutan" di Pengaturan (perangkat masuk, API key, riwayat masuk): tampil untuk semua, atau API key hanya PM ke atas?
9. **Q9**: Admin/super-admin mendarat di `/dashboard`/`/dev` (`homeFor`) padahal pekerjaan produk di `/app`; cukup dengan tautan "Ke aplikasi", atau Admin mendarat di `/app`?
10. **Q10**: URL tugas memakai nomor `/app/tasks/482` (usulan, mudah dibaca/disebut) — setuju?

## 7. Sumber

- Kode dibaca: `app/routes.ts`; `app/routes/app/{layout,home,profile}.tsx`; `app/routes/super/{posts,layout}.tsx`; `app/routes/admin/layout.tsx`; `app/root.tsx`; `app/components/{AppFrame,UserMenu}.tsx`; `app/components/frame/{nav.ts,NavList.tsx,BrandHeader.tsx}`; `app/components/posts/{usePostActions,PostForm}.tsx`; `app/components/logs/{LogPageHeader,StatTile,DetailParts}.tsx`; `app/components/users/UserDetailDrawer.tsx`; `app/components/visits/VisitEmptyState.tsx`; `app/components/errors/AreaErrorBoundary.tsx`; `app/components/RouteProgress.tsx`; `app/components/login/LoginForm.tsx`; `app/lib/{query.tsx,loader-json.ts,eden.ts,posts-api.ts,app-context.ts,theme.ts,time-format.ts,error-page.ts}`; `server/{guard,permissions,sidebar,sidebar-badges,seo}.ts`; `server/api/app.ts`; `tests/{app-routes,app-contracts,client-server-imports,frame-nav}.test.ts`; `package.json`; `CLAUDE.md`.
- Mantine 9.6.0 terpasang (`node_modules/@mantine/core`): `esm/components/Portal/Portal.mjs`, `Drawer/Drawer.mjs`, `esm/core/utils/units-converters/rem.mjs`, `esm/core/MantineProvider/{default-theme,MantineCssVariables/default-css-variables-resolver}.mjs`, `styles.css` (tinggi tombol/input/badge, `--mantine-scale`).
- Registry npm (`registry.npmjs.org/@mantine/dates`, diambil 15 Okt 2026): versi terbaru 9.7.2, terbit 2026-10-11, peer `dayjs>=1.0.0`, `@mantine/core 9.7.2`.
- Desain: `erd/diskusi/{00-role-dan-area,03-tugas (§1, §2, §5),04-wireframe-per-role,05-events,06-inbox,07-tim,08-sampah,09-pengaturan}.md`, baris keputusan yang dikutip di teks.
- Laporan lain: `_BRIEF.md`; R07 (§1, F1, F9-F12, lonceng/polling); R08 (§1, F10-F13, §3.4 Pengaturan, §6); R03 (§1, `can` dari server).
- **Tidak diverifikasi (ASUMSI)**: ranking rute statis vs dinamis, `useBlocker` di mode framework v8, `history.state.idx` untuk `BackLink`, konversi `rem` lebar navbar `AppShell`, tinggi `ActionIcon`, kontras tema gelap; R04 dan R06 tidak tersedia saat riset ini.
