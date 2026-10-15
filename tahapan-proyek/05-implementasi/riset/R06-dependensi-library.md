# R06 — Evaluasi Dependensi dan Pustaka (Simple PM)

> Tanggal riset: 15 Oktober 2026. Hanya membaca: tidak ada paket yang diinstal, tidak ada berkas lain yang diubah. Data registri diambil langsung dari `registry.npmjs.org`, `api.npmjs.org`, `bundlephobia.com`, `api.github.com` pada tanggal itu (daftar URL di bagian 7). Ukuran = **gzip dari bundlephobia** kecuali disebut lain; itu ukuran paket utuh tanpa peer, bukan ukuran akhir setelah tree-shaking.

## 1. Ringkasan eksekutif
1. **Tambah hanya dua paket baru untuk MVP: `@mantine/dates` 9.7.2 + `dayjs` 1.11.23** (input tanggal tenggat/event). Pustaka lain **tidak perlu**: grid kalender, donut/throughput, dan render komentar dibuat sendiri; Papan tanpa drag di MVP (sepakat R05/R10/R12).
2. **Syarat `@mantine/dates`:** seluruh `@mantine/*` harus naik ke satu versi persis (peer `@mantine/core` **tepat** sama). Hari ini sudah **tidak konsisten**: `core/form/hooks` 9.6.0 tetapi `modals/notifications/nprogress` 9.6.1 yang mensyaratkan core 9.6.1 (`bun.lock:224-234`). Satu PR `chore(deps)` memperbaiki keduanya.
3. **`bun audit` (Bun 1.3.14): 7 temuan, 1 CRITICAL, 2 HIGH, 4 moderate.** Semua punya perbaikan yang sudah terbit (nomor versi terverifikasi di registri kecuali `ip-address`); MCP SDK `1.32.1` masih di dalam `^1.30.0`. Wajib dilaporkan ke user; rencana perbaikan di §2.3.
4. **Tidak ada dependensi yang tertinggal >2 major** (paling jauh `dotenv` 17→18, 1 major). Ada 3 paket yang tampak tak terpakai (`@elysiajs/node`, `@elysiajs/static`, `@types/dagre`).
5. **Bun:** lokal 1.3.14, CI/release/`stack.md` 1.4.2, terbaru 1.4.3; `Dockerfile` memakai `oven/bun:1` mengambang. Selaraskan lewat satu berkas `.bun-version` (§2.2), setuju dengan R14.
6. **Donut/throughput:** `RingProgress` bawaan `@mantine/core` + komponen SVG ±100 baris. `@mantine/charts`+`recharts` ditolak (≈173 kB gzip untuk dua grafik).
7. **Drag Papan (pasca-MVP bila diminta):** `@atlaskit/pragmatic-drag-and-drop` 4.0.0 (core ~4,7 kB) sebagai pelengkap; jalur utama tetap tombol "Pindahkan ke…".
8. **CSV (fase 5):** `papaparse` 5.7.0 di **server**. Temuan baru: Excel berlokal Indonesia kemungkinan menyimpan CSV dengan pemisah `;`, bentrok dengan desain (tag dipisah `;`). Butuh keputusan user.
9. **Komentar:** teks biasa + tautan `http(s)` + sorotan `@nama`, tanpa Markdown (sepakat R12 R8). **Tidak ada satu pun advisori** untuk versi terbaru 18 paket kandidat.

## 2. Temuan

### 2.1 Fondasi yang dibaca
- `package.json` (dibaca utuh): 33 dependensi + 11 devDependencies; tidak ada `engines`, `packageManager`, `overrides`; `@mantine/*` memakai `^9.6.x`. Selisih terhadap `HEAD` hanya nama proyek dan nama biner di skrip (`git diff package.json`; `bun.lock` 1 baris).
- `bun outdated` (Bun 1.3.14): Mantine 9.6.0/9.6.1 → 9.7.2; React 19.2.8 → 19.3.1; react-router 8.3.1 → 8.4.0; zod 4.5.4 → 4.6.7; vite 8.2.2 → 8.3.4; better-auth 1.7.3 → 1.7.9; dll. **Satu-satunya lompatan major: `dotenv` 17.4.2 → 18.0.8.** Jadi tidak ada paket tertinggal >2 major (aturan §10 tidak terpicu).
- Tidak ada pustaka tanggal/grafik/dnd/markdown/CSV langsung. `date-fns` 4.4.0 ada di `node_modules` hanya sebagai turunan `pino-roll` (`bun.lock:448,682`). Tanggal ditampilkan dengan `Intl.DateTimeFormat('id-ID')` (mis. `app/components/changelog/ChangelogTimeline.tsx:30`) dan helper `app/lib/time-format.ts` (cookie `tz`, `requestClock`).
- Satu-satunya `dangerouslySetInnerHTML` di `app/` adalah CSS anti-FOUC statis (`app/root.tsx:71`). Bersih.
- Kandidat dependensi tak terpakai (grep impor di `app server scripts tests`, 0 berkas): `@elysiajs/node`, `@elysiajs/static`, `@types/dagre` (`@dagrejs/dagre` 3.1.1 membawa tipe sendiri: `types: ./dist/types/index.d.ts`, jadi `@types/dagre` untuk paket `dagre` lama tampak basi). `@sinclair/typebox` 0 impor langsung **tetapi** peer wajib `elysia` (`bun.lock:478`), jadi tetap. **ASUMSI:** `@elysiajs/*` tidak dipakai lewat konfigurasi dinamis; konfirmasi sebelum menghapus.

### 2.2 Bun: ketidakcocokan dan cara menyelaraskan
| Sumber | Versi | Bukti |
|---|---|---|
| Lokal | **1.3.14** | `bun --version` (juga header `bun audit`) |
| CI | 1.4.2 | `.github/workflows/ci.yml:17` |
| Release (build biner) | 1.4.2 | `.github/workflows/release.yml:14` |
| Dokumen | 1.4.2 / "1.4.x" | `stack.md:26`, `README.md:50` |
| Tipe | `@types/bun` 1.4.1 (`bun-types` 1.4.1) | `package.json` devDeps, `bun.lock:300,390` |
| Docker | `oven/bun:1` **mengambang** | `Dockerfile:2` (build), `:9` (runtime) |
| Terbaru | **1.4.3** (2026-10-10) | `registry.npmjs.org/bun` dist-tag `latest` |

Tidak ada `.bun-version`, `engines`, atau `packageManager`. Dampak: tipe dan CI memakai 1.4.x tetapi uji lokal 1.3.14; biner `bun build --compile` membawa runtime Bun yang mengompilasinya (perilaku standar, **ASUMSI** seperti R14), jadi `smoke:binary` lokal tidak menguji artefak rilis CI; image Docker bisa berpindah ke 1.4.3 tanpa perubahan kode. Bun 1.3.14 masih membaca `bun.lock` (audit/outdated berjalan); arah sebaliknya **ASUMSI**.

**Cara menyelaraskan (urutan):**
1. Satu sumber kebenaran: berkas `.bun-version` berisi `1.4.2`. `oven-sh/setup-bun@v2` mendukung `bun-version-file: ".bun-version"` (README setup-bun). Ganti `env.BUN_VERSION` di `ci.yml` dan `release.yml` dengan input itu.
2. Docker: `ARG BUN_VERSION=1.4.2` lalu `FROM oven/bun:${BUN_VERSION}`; tag `oven/bun:1.4.2` dan `1.4.3` ada (Docker Hub API HTTP 200).
3. Lokal: `bun upgrade` menuju 1.4.3 (terbaru), atau versi persis: `curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.2"` (sintaks dari dokumentasi Bun; **tidak dijalankan**). Rekomendasi: **pin 1.4.2 dulu** (sama dengan CI, nol perubahan perilaku), naik ke 1.4.3 di PR `chore(ci)` terpisah setelah `smoke:prod`/`smoke:binary` lolos.
4. Setelah selaras jalankan `bun install --frozen-lockfile` + `bun run typecheck` agar lock tidak berubah diam-diam. Sampai itu terjadi, setiap laporan uji lokal ditandai "Bun 1.3.14" (usul R14).

### 2.3 `bun audit` hari ini (Bun 1.3.14): 7 temuan
| Paket (di lock) | Tingkat | Rantai | Terdampak | Perbaikan terbit | Jenis |
|---|---|---|---|---|---|
| `proxy-addr` 2.0.7 (`GHSA-jqcg-44mw-7w3h`, spoofing IP via IPv4-mapped IPv6) | **CRITICAL** | `@modelcontextprotocol/sdk › express(5.2.1) › proxy-addr` | `<2.0.8` | **2.0.8** (2026-09-15); `express` 5.3.0 sudah `proxy-addr ^2.0.8` | runtime (jalur MCP) |
| `@modelcontextprotocol/sdk` 1.30.0 (`GHSA-6qxp-vccf-f47h`, klien OAuth kirim kredensial ke server otorisasi pilihan server MCP) | **HIGH** | langsung `^1.30.0` + via `elysia-mcp` | `>=1.12.0 <1.31.0` | **1.31.0** (2026-09-28); terbaru **1.32.1** ada di `^1.30.0` | runtime |
| `source-map-js` 1.2.1 (`GHSA-68fv-2mgg-jv7q`, DoS event loop) | **HIGH** | `vite › postcss › source-map-js` | `>=1.0.0 <1.2.2` | **1.2.2** (2026-09-30); `postcss` 8.5.30 sudah `^1.2.2` | build/dev |
| `fast-uri` 3.1.7 | moderate | `sdk › ajv › fast-uri` | `<3.1.8` | 3.1.8+ | runtime |
| `ip-address` 10.7.0 (2 advisori) | moderate | `sdk › express-rate-limit › ip-address` | `<=10.7.0` | versi >10.7.0 (nomor persis **tidak diverifikasi**) | runtime |
| `esbuild` ≤0.24.2 | moderate | `drizzle-kit › esbuild`, `vite › tsx › esbuild` | `<=0.24.2` | di lock ada 0.25.12 dan `tsx` memakai ~0.28; salinan bersarang lama dari `drizzle-kit` (**ASUMSI**) | dev |

Catatan:
- `bun audit --prod` mengembalikan daftar **sama** (7), jadi di 1.3.14 filter itu tidak membedakan; kolom "Jenis" saya tentukan manual dari rantai dan bagian `package.json`.
- **Paparan nyata MCP:** `server/mcp/index.ts:1` memakai `elysia-mcp`; `server/mcp/tools/*.ts:1` hanya `import type` dari SDK. Express tidak dipasang sebagai server (**ASUMSI**; isi `elysia-mcp` tidak dibuka), jadi eksploitasi proxy-addr kemungkinan rendah. Tetap wajib diperbaiki dan dilaporkan.
- `Dockerfile:15` menyalin seluruh `node_modules` (termasuk devDeps) ke image runtime: paket "dev" ikut terkirim walau tidak dimuat.
- **Rencana perbaikan (PR `chore(deps)` terpisah, bukan di irisan fitur, sesuai R14):** `bun update @modelcontextprotocol/sdk vite` lalu `bun audit`. Bila `proxy-addr`/`fast-uri`/`ip-address` tidak bergerak, tambahkan `"overrides": { "proxy-addr": "^2.0.8", "fast-uri": "^3.1.8", "source-map-js": "^1.2.2" }` (tiap override diberi komentar alasan di PR; **ASUMSI** `overrides` didukung Bun 1.4.x seperti yang didokumentasikan Bun, tidak dijalankan). Verifikasi: `bun audit` nol high/critical, `typecheck`, `test`, `smoke:prod`, `smoke:binary` (sentuh `server/mcp`).

### 2.4 Mantine: ketidakkonsistenan yang sudah ada
`@mantine/modals` 9.6.1 mensyaratkan `@mantine/core: "9.6.1"` (registri + `bun.lock:230`), padahal terpasang `core` 9.6.0 (`node_modules/@mantine/core/package.json`). Semua paket Mantine mem-pin peer **persis** (`@mantine/dates` 9.7.2 → `core: 9.7.2`, `hooks: 9.7.2`), jadi caret `^9.6.x` mudah menyimpang. Rilis 9.7.0 memiliki halaman changelog; pencarian kata "breaking" di halaman itu nihil (pembacaan penuh **tidak dilakukan**).

### 2.5 Data registri kandidat (15 Okt 2026)
| Paket | Terbaru | Rilis terakhir | Lisensi | Rilis 12 bln | Unduhan/mgg | gzip | Dep langsung | Peer penting |
|---|---|---|---|---|---|---|---|---|
| `@mantine/dates` | 9.7.2 | 2026-10-11 | MIT | 37 | 1.284.098 | 22,9 kB | 1 (`clsx`) | `dayjs>=1`, `react ^19.2`, `core`+`hooks` **tepat 9.7.2** |
| `dayjs` | 1.11.23 | 2026-08-17 | MIT | 5 | 76.185.338 | 3,1 kB | 0 | locale `id` tersedia (`dayjs/locale/id.js`, HTTP 200) |
| `@mantine/charts` | 9.7.2 | 2026-10-11 | MIT | 37 | 457.580 | 22,0 kB | 0 | `recharts>=3.2.1`, core/hooks tepat 9.7.2 |
| `recharts` | 3.10.1 | 2026-07-25 | MIT | 14 | 54.913.675 | **151,5 kB** (7,45 MB unpacked) | 11 (redux toolkit, immer, es-toolkit, …) | React 16–19 |
| `@dnd-kit/core` | 6.3.1 | **2024-12-05** | MIT | **0** | 28.737.569 | 14,2 kB | 3 | docs menandai API ini "Legacy" |
| `@dnd-kit/sortable` | 10.0.0 | 2024-12-04 | MIT | 0 | 27.730.017 | 3,7 kB | 2 | `@dnd-kit/core ^6.3.0` |
| `@dnd-kit/react` | **0.5.0** (pra-1.0) | 2026-06-11 | MIT | 10 | 1.759.888 | 33,1 kB | 4 | React 18/19 |
| `@atlaskit/pragmatic-drag-and-drop` | 4.0.0 | 2026-09-24 | Apache-2.0 | 11 | 1.653.248 | ~4,7 kB (klaim README; angka bundlephobia 174 B **tidak representatif**) | 3 | nihil |
| `@atlaskit/pragmatic-drag-and-drop-react-accessibility` | 3.2.4 | 2026-09-24 | Apache-2.0 | – | – | – | **8** (`@atlaskit/primitives`, `@emotion/react`, …) | React 18/19 |
| `@hello-pangea/dnd` | 18.0.1 | 2025-02-09 | Apache-2.0 | 0 | 3.430.808 | 28,8 kB | 5 (`react-redux`, `redux`) | React 18/19 |
| `@fullcalendar/react` | 7.1.2 | 2026-10-12 | MIT | 8 | 1.803.239 | 31,4 kB + peer | 2 | `temporal-polyfill ^1.0.1` |
| `react-big-calendar` | 1.20.0 | 2026-06-01 | MIT | 2 | 1.168.060 | 53,3 kB | **16** (moment, luxon, globalize, lodash, dayjs, …) | React 16–19 |
| `papaparse` | 5.7.0 | 2026-08-24 | MIT | 5 | 17.135.375 | 6,8 kB | 0 | nihil |
| `csv-parse` | 7.0.3 | 2026-09-25 | MIT | 6 | 20.780.732 | 8,1 kB | 0 | nihil |
| `marked` | 18.1.1 | 2026-10-12 | MIT | 26 | 86.429.242 | 13,8 kB | 0 | nihil |
| `markdown-it` | 15.0.2 | 2026-09-11 | MIT | 8 | 28.802.285 | 40,5 kB | 6 | nihil |
| `react-markdown` | 10.1.0 | **2025-03-07** | MIT | **0** | 38.433.735 | 34,1 kB | 11 (unified/remark) | `react>=18` |
| `dompurify` | 3.4.17 | 2026-10-12 | MPL-2.0 OR Apache-2.0 | 22 | 71.622.837 | 11,5 kB | 1 | nihil |
| `date-fns` | 4.4.0 | 2026-05-29 | MIT | 4 | 97.060.305 | 17,5 kB (barrel) | 0 | (turunan `pino-roll`) |
| `luxon` | 3.7.2 | 2025-09-05 | MIT | 0 | 42.277.904 | – (4,6 MB unpacked) | 0 | nihil |

- **Advisori:** `POST /-/npm/v1/security/advisories/bulk` untuk versi terbaru 18 paket di tabel (semua kecuali `luxon` dan dua paket `@atlaskit/*` pendamping) mengembalikan **kosong**: tidak ada advisori terbuka. Tidak ada repo yang diarsipkan (GitHub API). Aktivitas repo terakhir: pragmatic-dnd 2026-10-15, dnd-kit 2026-09-12, react-big-calendar 2026-06-01, FullCalendar 2026-10-12, PapaParse 2026-10-09, marked 2026-10-14, DOMPurify 2026-10-12.
- Kompatibilitas **React 19.2 + Mantine 9 + Bun:** semua paket Mantine mensyaratkan `react ^19.2.0` (terpasang 19.2.8: cocok). Paket pihak ketiga di atas menerima React 19; semuanya JS murni tanpa addon native, jadi aman di Bun. Uji nyata di Bun belum dijalankan (aturan: tidak menginstal).
- GitHub melaporkan lisensi `NOASSERTION` untuk pragmatic-dnd, hello-pangea, marked (klasifikasi otomatis gagal); saya memakai bidang `license` npm (Apache-2.0 / Apache-2.0 / MIT). Tetap periksa berkas LICENSE sebelum dipasang (proyek ini proprietary; MIT/Apache-2.0 aman, GPL tidak ada di daftar).

### 2.6 Pertentangan dan persinggungan dengan laporan lain
- **R05 #5/F16** menolak `@mantine/dates` karena butuh Mantine 9.7.2 + `dayjs`. Saya **sepakat** untuk *grid kalender*, tetapi laporan itu belum menjawab *kolom input tanggal* (tenggat tugas, tanggal proyek, jam event). `CLAUDE.md` melarang elemen HTML native yang sudah dicakup Mantine, jadi input tanggal butuh `@mantine/dates`. Hambatan versinya sepele (satu `bun update`) dan sudah harus dibereskan karena Mantine sudah tak konsisten (§2.4). **Ini koreksi terhadap R05, dimohonkan keputusan user (§6 no. 1).**
- **R10 T11, R05 #5:** Papan tanpa drag di MVP: **sepakat**. **R12 R8:** komentar sebagai teks: **sepakat**. **R14:** Bun `.bun-version` dan temuan audit: **sepakat**; saya menambah klasifikasi per paket dan jalur perbaikan (§2.2-2.3). **R12 C-CSV-1/2** sudah mengatur CSV injection dan batas impor; tidak diulang.

## 3. Rekomendasi

### 3.1 Tabel keputusan
| # | Kebutuhan | Keputusan | Alternatif ditolak (alasan singkat) |
|---|---|---|---|
| 1 | Input tanggal/jam | **Pakai** `@mantine/dates` 9.7.2 + `dayjs` 1.11.23 (pin persis) | `<input type="date">` native (melanggar aturan Mantine `CLAUDE.md`, tampilan beda per browser); `react-aria` (15,7 MB unpacked, gaya sendiri) |
| 2 | Pustaka tanggal | **Tanpa pustaka tambahan**: `Intl` + `app/lib/time-format.ts`; `dayjs` hanya di batas Mantine | `date-fns` (turunan `pino-roll`, bukan dependensi langsung); `luxon` (0 rilis 12 bln, 4,6 MB); `moment` |
| 3 | Donut status + throughput 14 hari | **Buat sendiri**: `RingProgress` bawaan core + komponen SVG ±100 baris | `@mantine/charts`+`recharts` (≈173,5 kB gzip, 11 dep, peer exact Mantine) |
| 4 | Drag Papan | **MVP: tanpa pustaka** (tombol "Pindahkan ke…" + langkah berikutnya). **Pasca-MVP:** `@atlaskit/pragmatic-drag-and-drop` + `-hitbox` | `@dnd-kit/core`+`sortable` (Legacy, 0 rilis 12 bln); `@dnd-kit/react` 0.5.0 (pra-1.0); `@hello-pangea/dnd` (0 rilis 12 bln, redux); HTML5 native polos |
| 5 | Grid kalender bulanan | **Buat sendiri** (fungsi murni + komponen Mantine) | `@fullcalendar/react` 7.1.2; `react-big-calendar` 1.20.0; `Month`/`Calendar` Mantine |
| 6 | Parsing CSV (fase 5) | **Pakai** `papaparse` 5.7.0 di **server** | `csv-parse` 7.0.3 (cadangan); parser buatan sendiri; parsing di klien |
| 7 | Render komentar | **Teks biasa** + tautan `http(s)` + sorotan `@nama` | `marked`+`dompurify`; `react-markdown`; `markdown-it` |

### 3.2 Rincian dan bukti per keputusan

**1. Input tanggal — `@mantine/dates`.** Nilai komponen berupa `string | null` (contoh resmi `useState<string | null>` pada `DatePickerInput`), cocok dengan kolom `DATE` tanpa zona (`due_date`, R07 `due_date < :today`). `DatesProvider` menerima `locale` (modul `dayjs/locale/id` wajib diimpor; berkasnya ada) dan `firstDayOfWeek` (bawaan 1 = Senin). Pakai `DatePickerInput` (klik membuka kalender, lebih jelas bagi lansia daripada mengetik) dengan `valueFormat` berbahasa Indonesia dan `clearable`. Jam event memakai `DateTimePicker`/`TimeInput` (komponen standar paket; **tidak diverifikasi satu per satu**). Langkah: (a) PR `chore(deps)`: naikkan **semua** `@mantine/*` ke `9.7.2` tanpa caret, tambah `@mantine/dates` 9.7.2 dan `dayjs` 1.11.23 persis; (b) impor `@mantine/dates/styles.css` sesudah `@mantine/core/styles.css` (urutan dari dokumentasi) di `app/root.tsx`; (c) bungkus `DatesProvider locale="id"`; (d) komponen `DateField`/`DateTimeField` tipis di `app/components/form/` agar format dan label seragam. Biaya ukuran: 22,9 + 3,1 kB gzip, hanya terkena rute `/app` yang memakai (code-splitting React Router; **ASUMSI** tidak diukur). Zona waktu: nilai picker tanpa zona; konversi ke `timestamptz` memakai zona browser (cookie `tz`) di klien atau `APP_TIMEZONE` di server (R08), **bukan** `dayjs` timezone.

**2. Pustaka tanggal.** Pola di kode sudah `Intl.DateTimeFormat('id-ID')`. `dayjs` masuk karena peer wajib, bukan karena dipilih; batasi pemakaiannya ke batas Mantine agar tidak ada dua sumber kebenaran "hari ini" (server `APP_TIMEZONE`, R08). `date-fns` jangan diangkat jadi dependensi langsung (17,5 kB, duplikasi fungsi).

**3. Grafik.**
- Kebutuhan asal: `tahapan-proyek/note.md:71-72` (throughput 14 hari created vs closed; donut status). Analisis memindahkannya ke "Insights" di Overview proyek (`02-analisis/.../A2-proyek-detail.md:167`). Apakah masuk MVP tidak terlihat di R10 (§6 no. 3).
- Donut: `RingProgress` dari `@mantine/core` (halaman dokumentasi: `sections` berisi `value` 0-100 dan `color`) tanpa dependensi baru. Aksesibilitas: `role="img"` + `aria-label` ringkas, **legenda teks berisi angka dan persen** di sampingnya (jangan mengandalkan warna), warna dari token Mantine.
- Throughput: `ThroughputBars` SVG (14 pasang batang, sumbu hari, label angka) + tombol "Lihat angka" yang membuka tabel `<table>` (bacaan layar dan lansia). Data dari satu kueri agregat (`generate_series` 14 hari, R07 gaya), fungsi penskalaan murni diuji.
- Ambang untuk meninjau ulang: bila muncul ≥3 jenis grafik interaktif (tooltip, zoom, area), adopsi `@mantine/charts` dengan impor malas per rute. Sampai itu, 173,5 kB gzip untuk dua grafik tidak sepadan.

**4. Drag Papan (butuh aksesibilitas keyboard untuk lansia).**
- Fakta desain: Papan 4 kolom, "pindah kartu lewat tombol di kartu, bukan hanya drag" (`03-desain/erd/diskusi/03-tugas.md:226`); perpindahan kolom mengikuti mesin status dan izin, bukan bebas (R05 #5). Maka drag hanyalah jalan pintas, bukan mekanisme utama.
- **Jalur utama (MVP, nol dependensi):** tombol besar "Pindahkan ke…" per kartu (Mantine `Menu`; ingat `CLAUDE.md`: Tooltip tidak boleh membungkus `Menu.Target`), menampilkan **hanya kolom tujuan yang sah** menurut `server/access/*` (R03), plus tombol langkah berikutnya. Hasil dikabarkan lewat `notifications` dan wilayah `aria-live`. Ini memenuhi keyboard (Tab/Enter), pembaca layar, dan sentuh tanpa belajar gestur.
- **Pelengkap (bila user minta):** `@atlaskit/pragmatic-drag-and-drop` 4.0.0 + `-hitbox` 3.0.0 saja. Alasan: headless dan "unopinionated about visual language or accessibility" (README) sehingga cocok dibungkus kartu Mantine; core ~4,7 kB; Apache-2.0; 11 rilis/12 bln, repo di-push 2026-10-15; README: "Full feature support in Firefox, Safari, and Chrome, iOS and Android" (tablet). **Jangan** pasang `-react-accessibility` (8 dependensi, termasuk `@atlaskit/primitives` dan `@emotion/react`, gaya Atlassian bertabrakan dengan Mantine). Drag-by-keyboard **tidak** disediakan pustaka ini; kekurangannya ditutup menu di atas. `-live-region` 2.1.0 (1 dep, 26 kB unpacked) opsional untuk pengumuman.
- Ditolak: `@dnd-kit/core`/`sortable`: dokumentasi resmi menandainya "Legacy", nol rilis dalam 12 bulan (terakhir 2024-12-05, ±22 bulan; belum melewati batas 2 tahun aturan §10 tetapi mendekat), padahal sensor keyboard-nya (Space/Enter mulai, Esc batal) bagus. `@dnd-kit/react` 0.5.0 punya sensor keyboard dan aktif (10 rilis), tetapi pra-1.0 (API boleh berubah) dan 33,1 kB gzip: kandidat cadangan bila uji tablet menunjukkan HTML5-DnD bermasalah. `@hello-pangea/dnd`: 0 rilis dalam 20 bulan, membawa redux, hanya daftar. HTML5 native polos: tanpa auto-scroll dan indikator drop, biaya tulis sendiri lebih besar daripada 4,7 kB.
- **ASUMSI:** perilaku drag di iPad/tablet Android dengan HTML5-DnD perlu diuji di perangkat nyata (saya tidak menjalankan browser). Keyboard-drag tidak dipakai lansia (Space → panah → Space sulit dipelajari); kalau ada pengguna pembaca layar, menu "Pindahkan ke…" adalah jalannya.

**5. Grid kalender bulanan.** Sepakat R05 #5. Spesifikasi: `buildMonthGrid(year, monthIndex, weekStart = 1)` → `{ date, inMonth, isToday }[6][7]` di `app/lib/calendar-grid.ts` (konstanta `CALENDAR_WEEK_START` bernama, aturan §15) dan `EventMonthGrid` ±150 baris (`<table>` dengan `<caption>` "Oktober 2026", sel berisi tombol hari + blok event satu warna sesuai `05-events.md` keputusan #15, "+N lagi" bila penuh). Judul hari lewat `Intl` (`weekday: 'short'`), bukan `dayjs`. Tablet ke bawah: berubah menjadi daftar agenda (kerangka responsif). Tombol "Minggu" = tujuh bagian harian berupa daftar (R08:78). Ditolak: FullCalendar 7.1.2 (v7 baru; 1.136 isu terbuka; butuh peer `temporal-polyfill`; CSS sendiri tidak ikut `--mantine-scale` sehingga ukuran teks Besar/Sangat besar (R05 F12) tidak terhormati; plugin tertentu berlisensi terpisah, **ASUMSI** tidak dibutuhkan); `react-big-calendar` (53,3 kB, 16 dependensi termasuk `moment`, `luxon`, `lodash`, dan wajib *localizer*); `Month`/`Calendar` Mantine (sel kecil kotak, tidak muat judul event).

**6. CSV (fase 5).**
- **Di server:** `Papa.parse(text, { header: true, skipEmptyLines: 'greedy', delimiter })`. Alasan: validasi otoritatif per baris (galat/peringatan, `task_import_jobs` di `03-tugas.md:172`) harus di server, pustaka murni JS tanpa DOM, 0 dependensi, 6,8 kB gzip, 5 rilis/12 bln, 17,1 juta unduhan/minggu, `Papa.BYTE_ORDER_MARK` dan `guessDelimiter` ada di sumber 5.7.0. Ukuran bundel klien nol (parsing tidak di browser; pratinjau 5 baris datang dari server).
- **Temuan baru (bentrok desain):** CLDR lokal `id` memberi pemisah desimal `,` dan simbol daftar `;` (`cldr-json .../id/numbers.json`). Microsoft menyatakan pemisah CSV Excel mengikuti pengaturan regional (halaman "Import or export text files"; kesimpulan "Excel berlokal Indonesia menyimpan dengan `;`" adalah **ASUMSI**, tidak diuji). Desain memakai header berkoma dan `tagNames` dipisah `;` (`03-tugas.md:45,172`): pada berkas ber-`;` kolom tag akan terpecah kecuali dikutip. **Rekomendasi:** deteksi pemisah dari baris header yang dikenal (coba `,`, `;`, TAB; pilih yang menghasilkan semua kolom wajib), jangan memakai tebakan otomatis `papaparse` saja; usulkan pemisah tag `|` (atau tetap `;` hanya bila berkas ber-`,`). Dibutuhkan keputusan user (§6 no. 5). Uji wajib: BOM UTF-8 dari "CSV UTF-8" Excel, sel berkutip berisi newline, `\r\n`, batas `CSV_MAX_BYTES`/`CSV_MAX_ROWS` dan penetralan sel (R12 C-CSV-1/2).
- Ditolak: `csv-parse` 7.0.3 (pilihan sama baik; cadangan bila perlu streaming berkas besar, 8,1 kB gzip); parser sendiri (mesin keadaan RFC 4180 berkutip ≥60 baris dengan banyak kasus tepi; aturan §10 hanya membolehkan buatan sendiri untuk <20 baris); parsing di klien (validasi ganda, kebocoran aturan izin ke klien).

**7. Render komentar.** Sepakat R12 R8; tambahan teknis: komponen `CommentBody` memecah string menjadi simpul React (tanpa HTML mentah): URL `^https?://` → Mantine `Anchor` dengan `target="_blank"` dan `rel="noopener noreferrer nofollow"`; token `@nama` → sorotan (regex konstanta bersama server/klien; server tetap yang membuat notifikasi, `task.md:355`); baris baru lewat `white-space: pre-wrap`. React meng-escape teks secara bawaan; skema selain `http/https` (mis. `javascript:`) tidak pernah menjadi `href`. Uji: payload `<script>`, `<img onerror>`, `javascript:alert(1)`, `data:`, tautan sangat panjang. Ditolak: `marked` 18.1.1 (dokumentasinya sendiri: "Marked does not sanitize the output HTML", wajib `DOMPurify`; gabungan 25,3 kB gzip; DOMPurify butuh DOM sehingga SSR perlu solusi tambahan, **ASUMSI**); `react-markdown` 10.1.0 (aman secara desain, **ASUMSI** tidak diaudit, tetapi 34,1 kB, 11 dependensi, 0 rilis dalam 19 bulan); `markdown-it` 15.0.2 (40,5 kB, sanitasi tautan tetap manual). Bila kelak butuh tebal/daftar: tambah subset sendiri (`**tebal**`, `- daftar`) di `CommentBody`, atau `react-markdown` + `rehype-sanitize` dengan tes payload (R12).

## 4. Risiko dan mitigasi
| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Kerentanan CRITICAL/HIGH (`proxy-addr`, MCP SDK, `source-map-js`) dibiarkan karena riset ini tidak memperbaikinya | Sudah terjadi | Sedang-tinggi (MCP SDK jalur runtime; IP spoofing hanya bila Express aktif) | Laporkan hari ini; PR `chore(deps)` terpisah sebelum irisan fitur pertama; `bun audit --audit-level=high` jadi gerbang CI setelah bersih (R14) |
| Naik ke Mantine 9.7.2 mengubah tampilan/perilaku (2 minor sekaligus) | Rendah-sedang | Sedang (seluruh UI) | Satu PR khusus, `typecheck`+`test`+`smoke`; baca changelog 9.7.0 penuh sebelum menggabungkan (saya baru memindai); pin persis tanpa caret |
| Peer persis Mantine membuat `bun update` parsial memecah instalasi lagi | Sedang | Sedang | Pin semua `@mantine/*` pada versi yang sama; tambahkan tes sederhana yang membandingkan versi `@mantine/*` di `package.json` (murni, tanpa jaringan) |
| `bun upgrade` lokal ke 1.4.3 menyimpang dari CI 1.4.2 | Sedang | Rendah-sedang | `.bun-version` tunggal; CI dan Docker membaca dari situ; naik 1.4.3 di PR terpisah |
| Zona waktu salah pada tenggat/event karena nilai picker tanpa zona | Sedang | Tinggi (tugas "terlambat" keliru) | `due_date` bertipe `DATE`; event dikonversi dengan zona eksplisit; tes tabel-driven di batas tengah malam Asia/Jakarta (R03/R09) |
| Drag HTML5 buruk di tablet pengguna lansia | Sedang | Sedang | Drag hanya pelengkap; menu "Pindahkan ke…" selalu ada; uji perangkat nyata sebelum rilis; cadangan `@dnd-kit/react` |
| CSV dari Excel Indonesia (`;`, BOM) gagal diimpor atau tag terpecah | Tinggi (bila fase 5 jalan) | Sedang | Deteksi pemisah dari header, tes BOM/`;`, pratinjau galat jelas; keputusan pemisah tag |
| Pustaka baru terbengkalai (`@dnd-kit` Legacy, `react-markdown` diam 19 bln) | Sedang | Rendah | Tidak dipilih; tinjau tahunan aktivitas rilis; bungkus pustaka di balik komponen sendiri |
| Perbaikan transitif via `overrides` menutupi masalah tanpa menyelesaikan akar | Rendah | Rendah | Beri komentar alasan + tanggal; hapus override saat induk terbaru sudah memuat perbaikan |

## 5. Estimasi usaha (pekerja AI + 1 reviewer manusia)
| Pekerjaan | Ukuran | Hari-orang AI | Reviewer |
|---|---|---|---|
| `chore(deps)`: perbaiki audit, selaraskan & pin Mantine 9.7.2, hapus 3 paket tak terpakai (bila disetujui) | S | 0,5–1 | 0,25 |
| Selaraskan Bun (`.bun-version`, CI, Dockerfile, `stack.md`, README) | S | 0,25–0,5 | 0,25 |
| `@mantine/dates` (provider, locale, CSS, `DateField`, tes) | S–M | 1–1,5 | 0,25 |
| Grid kalender bulanan (sudah dihitung dalam Events R08; **tidak ditambahkan lagi**) | M | 1,5–2 | – |
| Donut + `ThroughputBars` + tabel angka + tes | S–M | 1–1,5 | 0,25 |
| `CommentBody` + tes payload XSS | S | 0,5–1 | 0,25 |
| CSV fase 5 (server, deteksi pemisah, tes) | M | 2–3 | 0,5 |
| Drag pelengkap Papan (bila diminta) + uji tablet | S–M | 1,5–2,5 | 0,5 |
**Total MVP tanpa kalender/CSV/drag:** 3,25–5 hari AI + ±1 hari reviewer.

## 6. Pertanyaan terbuka untuk user
1. **Setuju menambah `@mantine/dates` + `dayjs`** untuk input tanggal (koreksi terhadap penolakan di R05 F16, yang hanya membahas grid kalender)? Alternatifnya input native, yang melanggar aturan Mantine proyek.
2. **Target Bun:** pin 1.4.2 (sama CI, rekomendasi) atau langsung 1.4.3 di semua tempat?
3. **Donut dan throughput masuk MVP** atau ditunda? (`note.md:71-72` meminta; R10 tidak memuatnya.)
4. **Drag di Papan:** cukup tombol "Pindahkan ke…" untuk MVP (rekomendasi) atau drag wajib sejak awal?
5. **CSV (fase 5):** pemisah kolom otomatis (`,` / `;` / TAB dari header) dan pemisah tag diganti `|`? Atau tetap `;` dan minta pengguna menyimpan "CSV (pisah koma)"?
6. **Komentar:** setuju teks biasa saja di MVP, tanpa tebal/daftar?
7. **Housekeeping:** boleh menghapus `@elysiajs/node`, `@elysiajs/static`, `@types/dagre`, dan mengizinkan `overrides` untuk perbaikan transitif?

## 7. Sumber
Berkas lokal dibaca: `package.json`; `bun.lock` (baris 224-236, 300, 390, 448, 468, 478, 682, 808); `.github/workflows/ci.yml:17`, `release.yml:14`; `Dockerfile:2,9,15`; `stack.md:26`; `README.md:50`; `app/root.tsx:71`; `app/lib/time-format.ts:1-25`; `server/mcp/index.ts:1`, `server/mcp/tools/*.ts:1`; `tahapan-proyek/note.md:60-75`; `03-desain/erd/diskusi/{03-tugas.md:45,172,226, 05-events.md:25-26}`, `03-desain/erd/task.md:348-357`; riset `R05` (#5, F12, F16), `R08:78`, `R10` (T11, T15), `R12` (R8, C-CSV), `R14` (§2.4, Bun). Perintah: `bun --version`, `bun audit`, `bun audit --prod`, `bun outdated`, `git diff package.json bun.lock`, grep impor.

Registri dan API (diakses 15 Okt 2026):
- npm: https://registry.npmjs.org/{bun,@mantine/dates,@mantine/charts,@mantine/core,@mantine/modals,dayjs,recharts,@dnd-kit/core,@dnd-kit/sortable,@dnd-kit/react,@atlaskit/pragmatic-drag-and-drop,@atlaskit/pragmatic-drag-and-drop-react-accessibility,@hello-pangea/dnd,@fullcalendar/react,react-big-calendar,papaparse,csv-parse,marked,markdown-it,react-markdown,dompurify,date-fns,luxon,react-aria,express,proxy-addr,source-map-js,postcss,@modelcontextprotocol/sdk,@dagrejs/dagre,@types/dagre}
- Unduhan: https://api.npmjs.org/downloads/point/last-week/{paket}
- Advisori: https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
- Ukuran: https://bundlephobia.com/api/size?package={paket@versi}
- Repo: https://api.github.com/repos/{atlassian/pragmatic-drag-and-drop,clauderic/dnd-kit,hello-pangea/dnd,fullcalendar/fullcalendar,jquense/react-big-calendar,mantinedev/mantine,recharts/recharts,remarkjs/react-markdown,markedjs/marked,cure53/DOMPurify,mholt/PapaParse,iamkun/dayjs}
- Docker Hub: https://hub.docker.com/v2/repositories/oven/bun/tags/{1.4.2,1.4.3}
- Dokumentasi: https://mantine.dev/dates/getting-started/ · https://mantine.dev/dates/date-picker-input/ · https://mantine.dev/core/ring-progress/ · https://mantine.dev/charts/getting-started/ · https://mantine.dev/changelog/9-7-0/ · https://marked.js.org/ · https://raw.githubusercontent.com/atlassian/pragmatic-drag-and-drop/main/README.md · https://docs.dndkit.com/api-documentation/sensors/keyboard (label "Legacy") · https://raw.githubusercontent.com/oven-sh/setup-bun/main/README.md (`bun-version-file`) · https://cdn.jsdelivr.net/npm/papaparse@5.7.0/papaparse.js · https://cdn.jsdelivr.net/npm/dayjs@1.11.23/locale/id.js · https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-numbers-full/main/id/numbers.json · https://support.microsoft.com/en-us/office/import-or-export-text-txt-or-csv-files-5250ac4c-663c-47ce-937b-339e391393ba
- Advisori GitHub (dari keluaran `bun audit`): GHSA-jqcg-44mw-7w3h, GHSA-6qxp-vccf-f47h, GHSA-68fv-2mgg-jv7q, GHSA-hrr3-gc8f-f4qj, GHSA-j6r3-76f7-8jcv, GHSA-h3mg-xc3c-68pw, GHSA-67mh-4wv8-2f99.
