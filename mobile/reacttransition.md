# React Native Transition — Simple PM Mobile

Catatan kerja perpindahan aplikasi mobile Simple PM dari prototipe web (React + `react-cupertino-ui`) ke **React Native**. Dokumen ini adalah kontrak bersama orchestrator dan sesi pekerja: baca dulu sebelum mengerjakan task, dan perbarui bagian **Papan Task** serta **Log** setiap selesai.

## 1. Keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-23 | Desktop = website, mobile = aplikasi | Arah produk dari user |
| 2026-10-25 | Mobile = **React Native** (Expo + Expo Router) | Pilihan user; menggantikan opsi PWA/Capacitor |
| 2026-10-25 | UI kit = **gluestack-ui** (awalnya direncanakan di atas NativeWind/Tailwind; engine akhirnya lihat T2 di bawah) | Komponen milik kode kita (copy-paste, MIT) jadi bisa dibentuk persis JP Atlas. Tamagui dinilai terlalu rumit; RN Paper bertampilan Material sehingga bentrok dengan JP Atlas |
| 2026-10-25 | Kode mobile di folder **`mobile/`** di repo ini, proyek mandiri (`package.json` + lockfile sendiri, **tanpa** workspaces root) | Tipe API bisa dibagi nanti; root repo milik rekan tidak diubah selain pengecualian di tsconfig/biome |
| 2026-10-25 | Test runner mobile = **`jest-expo`** + React Native Testing Library | `bun:test` tidak menjalankan komponen RN; root tetap `bun:test` |
| 2026-10-25 | gluestack-ui **Pro tidak dibeli** | Isinya hanya template layar (e-commerce, sosial, dll), tidak relevan untuk PM |
| 2026-10-25 | **T2: gluestack-ui v5 (CLI 5.0.3) + UniWind 1.13 (Tailwind 4.3), bukan NativeWind**; Expo SDK 58, RN 0.88, React 19.3, TS 6 | NativeWind v5 masih RC (`latest` = 4.2.7) dan "not intended for production". CLI gluestack v5 untuk Expo hanya menawarkan nativewind-v5 atau uniwind; jalur NativeWind v4 berarti turun ke gluestack v3. UniWind stabil, MIT, tanpa kode native (aman untuk Expo Go), className/@theme setara; bisa pindah engine lewat `gluestack-ui upgrade` |
| 2026-10-25 | Token: salinan `app/lib/theme-tokens.ts` di `mobile/src/theme/tokens.ts` + tes penjaga kesamaan hex + tes kontras; `popover` = surface | Mobile proyek mandiri, tidak bisa impor root; tes mencegah token melenceng dari web |
| 2026-10-25 | Jarak dan ukuran font dalam px, bukan rem | Awalnya untuk antisipasi rem = 14 di NativeWind. Di UniWind rem = 16 (`polyfills.rem`), jadi px tetap dipakai supaya ukuran eksplisit dan tidak bergantung polyfill |
| 2026-10-25 | Manrope statis 400/500/600/700 dibuat dengan fonttools instancer dari TTF variabel; 650 → 600 | Android tidak bisa memilih axis bobot dari TTF variabel lewat expo-font; tanpa dependency npm baru |
| 2026-10-25 | Data contoh: tanggal ISO + formatter, "hari ini" = konstanta 2026-10-07; `getHome(role)` satu titik tukar; Admin "Overdue" = 3 seperti prototipe, disimpan di data contoh (bukan di komponen) | Meniru `getHome` di server; user: ikuti prototipe |
| 2026-10-25 | **Bahasa UI mobile = Inggris; ikuti prototipe mobile 1:1** (perilaku, copy, data contoh termasuk `home`) | Keputusan user. Menyimpang hanya bila terkendala teknis RN, dan wajib dilaporkan |
| 2026-10-25 | Ikon = `lucide-react-native` (^1.61, ISC) | Prototipe memakai lucide, jadi ikon bisa 1:1. `expo-symbols` hanya iOS dan bentuknya berbeda |
| 2026-10-25 | Tab Fase 0 = `NativeTabs` (expo-router/native-tabs): liquid glass di iOS, Material di Android; ikon SF Symbol/Material | Bawaan template SDK 58; tab bar prototipe menyusul di Fase 1 (A1) |
| 2026-10-25 | **Fase 1 tab bar = custom `tabBar` di atas JS `Tabs` expo-router** (bukan NativeTabs, bukan `expo-router/ui`); Reanimated 4 + RNGH 3 + `expo-glass-effect`; Create = route `formSheet`; tanpa expo-haptics | NativeTabs tidak bisa membuat pil + FAB + panel More prototipe. Konsekuensi: kehilangan perilaku bar sistem iOS 26 (minimize-on-scroll, Large Content Viewer). Spesifikasi lengkap: `mobile/docs/phase1-navigation.md` |
| 2026-10-25 | Fase 1 layar: spesifikasi di `docs/phase1-screens*.md` (64 id → route); gelombang G0 kit → G1 Tasks/Events/More+Auth paralel → G2 Projects | Wilayah file per gelombang tidak tumpang tindih |
| 2026-10-25 | Penyimpangan prototipe yang disengaja: (1) konfirmasi `AlertDialog` gluestack untuk sign out, hapus anggota, aksi Users (T2) dan hapus permanen dengan ketik nama (T3); (2) snack Urungkan hilang otomatis 10 detik (T1) | Standar UX project (blocker) mengalahkan "ikuti prototipe" untuk aksi destruktif |
| 2026-10-25 | Penyimpangan Fase 1 (RN/produk): (1) stack tab tasks/projects/events memakai `anchor: 'index'`, sehingga back dari detail yang dibuka dari Home kembali ke list tab itu, bukan ke Home; tanpa anchor, stack hanya berisi detail (tanpa swipe-back, `popToTopOnBlur` tidak bisa kembali ke list). (2) Search di list Events/Tasks benar-benar memfilter; di prototipe hanya dekoratif | (1) batasan navigator bersarang RN; (2) search yang tidak bekerja di app nyata termasuk bug |
| 2026-10-25 | Ikuti prototipe: layar awal = `(tabs)` (auth ada sebagai route, gerbang login di Fase 2); detail proyek selain Atlas = header + empty state; `profile.me` = modal penuh; Restore di Archive = toast seperti prototipe (pemulihan nyata di Fase 2 bersama API) | Aturan user: ikuti prototipe 1:1 |
| 2026-10-25 | Linter mobile = biome (bukan ESLint expo) | Konsisten dengan root; biome root mengecualikan `mobile/` |
| 2026-10-25 | Fase 0: Tabs Expo Router standar; gelembung, drag, panel More, dan sheet Create menyusul | Butuh Reanimated + Gesture Handler; di luar tujuan spike |

## 2. Batas Wilayah

- **Milik kita:** semua di `mobile/`.
- **Milik rekan (jangan diubah):** `app/`, `server/`, skema DB, migrasi, endpoint. Mobile nanti hanya **mengonsumsi** API `/api/app/*`.
- **Satu-satunya sentuhan di root:** `tsconfig.json` `exclude: ["mobile"]` dan `biome.json` `"!mobile"`, supaya `bun run typecheck` dan `bun run lint` root tidak ikut memeriksa kode RN.
- **Aturan project yang tidak berlaku di `mobile/`:** Mantine (khusus web), `meta()` per route, `AppShell`/Burger, dan `DateInput` dari `@mantine/dates`. Pengganti untuk mobile: komponen gluestack, Expo Router, tab bar native.
- **Pengecualian kode vendored:** `src/components/ui/**` adalah keluaran CLI gluestack (disalin, bukan ditulis). Kode ini dikecualikan dari biome dan dari batas file health / suppression (Rule 8/17), mis. `icon/index.tsx` 1.576 baris dan `@ts-expect-error` bawaan upstream. Kode ini tidak dipangkas supaya diff dengan upstream tetap bersih saat `gluestack-ui upgrade`. Kustomisasi JP Atlas di folder itu ada di `text/styles.tsx`, `heading/styles.tsx`, `button/index.tsx`, `badge/index.tsx`, `toast/index.tsx`, `avatar/index.tsx`, `progress`/`card` (tema). Fase 1 (G0b) menambah: `menu/index.tsx` dan `alert-dialog/index.tsx` (`opacity` dihapus dari `ZoomIn.withInitialValues`; tipe Reanimated 4.7 menolaknya, runtime sama), `checkbox/index.tsx` (3× `@ts-expect-error` bertanda alasan). `gluestack-ui upgrade` bisa menimpa file-file ini, jadi setelah upgrade wajib cek `git diff` file tersebut dan jalankan tes tema.
- **Aturan yang tetap berlaku:** token JP Atlas (lime = aksi utama dengan teks navy, violet = interaksi, Manrope, radius 10/14/16/20, jarak 8/12/16/24/32), standar UX (konfirmasi T1/T2/T3, loading, feedback, empty state), file health, tes wajib, dan tanpa hex di komponen.

## 3. Stack Target

- Expo SDK terbaru yang stabil, Expo Router, TypeScript strict.
- gluestack-ui v5 + UniWind + Tailwind v4 (CSS-first `global.css`, tanpa `tailwind.config.js`).
- Reanimated + Gesture Handler untuk interaksi khusus (menu radial Kanban, sheet), dipasang saat dibutuhkan, bukan di spike.
- Data contoh dulu (data Nico dari prototipe), dengan satu titik tukar per layar supaya mudah diganti API.
- Sumber acuan UX: `riset-keano/prototype-react/` (BRIEF.md + `src/`). Acuan token: `app/lib/theme-tokens.ts`. Font: `public/fonts/` (Manrope, OFL).

## 4. Struktur `mobile/` (target)

```
mobile/
  reacttransition.md     ← dokumen ini
  app/                   ← route Expo Router (tipis, hanya merender screen)
    _layout.tsx
    (tabs)/_layout.tsx, index.tsx, ...
  src/
    screens/<tab>/       ← isi layar
    components/ui/       ← komponen gluestack (hasil init/add)
    theme/               ← pemetaan token JP Atlas
    data/                ← data contoh (titik tukar ke API)
  assets/fonts/          ← Manrope
  __tests__/ atau *.test.tsx
```

## 5. Fase

- **Fase 0 — Spike (sekarang):** buktikan Expo + gluestack + token JP Atlas + satu layar Home jalan dan bisa dicek di HP lewat Expo Go.
- **Fase 1 — Porting layar:** pindahkan layar prototipe per modul (auth, home, projects, tasks, events, inbox, team, settings).
- **Fase 2 — Sambung API:** login (Better Auth dari RN, disepakati dengan rekan), client API, ganti data contoh.
- **Fase 3 — Rilis:** EAS Build, ikon/splash, distribusi.

## 6. Papan Task — Fase 0

Branch: `feature/mobile-expo-spike` (dari `main`). Pekerja **tidak** commit/checkout/stash/reset/push; orchestrator me-review lalu commit per task.

| ID | Task | Pemilik | Status | Bergantung |
|---|---|---|---|---|
| T1 | Scaffold Expo (Expo Router + TS) di `mobile/`, pakai bun | Sesi A | ✅ | — |
| T2 | Cek stabilitas NativeWind v5 / gluestack v5, putuskan versi, `gluestack-ui init` | Sesi A | ✅ | T1 |
| T3 | `jest-expo` + RNTL + satu tes asap yang lulus | Sesi A | ✅ | T1 |
| T4 | Pengecualian root: `tsconfig.json` exclude + `biome.json` `!mobile`; typecheck/lint root tetap lulus | Sesi A | ✅ | T1 |
| T5 | Kerangka tab Expo Router sesuai tab prototipe, layar placeholder di `src/screens/<tab>/` | Sesi A | ✅ | T2 |
| B0 | Analisis (read-only): pemetaan token JP Atlas → Tailwind/gluestack, spesifikasi Home + tab bar, inventaris data contoh | Sesi B | ✅ | — |
| T6 | Terapkan token JP Atlas ke config gluestack/Tailwind + font Manrope (expo-font) | Sesi B | ✅ | T2, B0 |
| T7 | Modul data contoh `src/data/` (data Nico untuk Home) | Sesi B | ✅ | T1, B0 |
| T8 | Layar Home (`src/screens/home/**`) + tes | Sesi B | ✅ | T5, T6, T7 |
| T9 | Verifikasi di HP via Expo Go | User | ✅ | T8 |
| T10 | Linter mobile: biome (versi sama dengan root), `mobile/biome.json` | Sesi A | ✅ | install Sesi B selesai |
| C1 | Review kode independen Fase 0 + `bun audit` + doctor (read-only) | Sesi C | ✅ | — |
| C2 | Perbaikan temuan C1: B = #1 bobot font, #2 worker jest bocor, #4 reset palet; A = #5 app.config splash, #6 dependency tak terpakai, nit | Sesi A, B | ✅ | C1 |
| D1 | Spesifikasi porting Fase 1 semua layar di luar Home/tab bar → `mobile/docs/phase1-screens*.md` | Sesi D | ✅ | — |
| A1 | Spesifikasi (read-only) tab bar/navigasi Fase 1 persis prototipe: pil kaca, gelembung, "+", panel More | Sesi A | ✅ | — |

Status: ⏳ belum · 🔄 dikerjakan · 👀 menunggu review · ✅ selesai (sudah di-commit).

## 6b. Papan Task — Fase 1

Spesifikasi: `docs/phase1-navigation.md` (tab bar, F1a–F1e) dan `docs/phase1-screens*.md` (layar, gelombang G0–G2, wilayah file §6). Aturan kerja sama dengan Fase 0. Tambahan:
- **Hanya Sesi B yang mengubah `package.json`/`bun.lock`** selama Fase 1. Sesi lain yang butuh paket minta lewat orchestrator.
- `jest.setup.js`, `jest.config.js`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, dan `_layout.tsx` Stack per tab = milik Sesi A. Worker minta presentasi/route lewat orchestrator.
- `src/data/sample/*.ts` bersama = milik Sesi B (W0). Worker lain menulis `src/data/sample/<modul>.extra.ts`.
- Sebelum lapor: tes wilayah sendiri lulus, `bun run typecheck` dan `bun run lint` 0. Kalau suite penuh merah karena berkas sesi lain yang sedang dikerjakan, sebut berkasnya saja, jangan diperbaiki.

| ID | Task | Pemilik | Status | Bergantung |
|---|---|---|---|---|
| F1a | Pohon route §6.1 nav + registrasi presentasi semua route `phase1-screens.md` §3.1/§3.2, JS Tabs + bar polos, `src/navigation/{tabs.config,tab-create,tab-bar.visibility,bubble.math}.ts`, setup jest RNGH, tes T5 ditulis ulang | Sesi A | ✅ | — |
| G0a | Modul bersama murni: `src/data/{store,archive.store,people}.ts`, `src/data/sample/people.extra.ts`, `src/navigation/screen-roles.ts` + tes | Sesi B | ✅ | — |
| G0b | Install: komponen gluestack `phase1-screens.md` §5 + `expo-clipboard` + `@react-native-community/datetimepicker` | Sesi B | ✅ | G0a |
| G0c | Kit komponen `phase1-screens.md` §4 (`src/components/{screen,search,filter,sheet,menu,form,list,state,snack,avatar}/**`) + tes | Sesi B | ✅ | G0b |
| W1a | Tasks lapisan data murni (sampel, query, kolom, matematika radial, store) + tes unit | Sesi D | ✅ | G0a (store) |
| W2a | Events lapisan data murni (sampel, query, `events.dates.ts` kalender, store) + tes unit | Sesi C | ✅ | G0a (store) |
| W1b | Tasks layar + route | Sesi D | ✅ | F1a, G0c, W1a |
| W2b | Events layar + route | Sesi C | ✅ | F1a, G0c, W2a |
| G0d | Kit `ConfirmDialog` T2/T3, ekspor `toUtc` dari `dates.ts`, paritas `StackedScreen` (baris pinned memadat, fokus setelah reveal) | Sesi B | ✅ | G0c |
| W3 | More + Auth + Profile | Sesi B | ✅ | F1a, G0d |
| W3b | QA silang (read-only) Events: copy vs prototipe, aria-label, empty state | Sesi B | ✅ | W2b |
| W3c | Perbaikan 11 temuan W3b (label kartu/hari, tautan Cancel inline, error form, required, Seg radio, label per draf, AiNote, jamak, empty state kalender + search); wilayah Events dipinjam Sesi B | Sesi B | 🔄 | W3b |
| H1 | Home membaca getter tasks/events store; target More → route `more/*`; stub `(auth)` di helper tes | Sesi A | 🔄 | F1e; route W3 untuk target More |
| W2c | Undo snack Events setelah Delete forever: tangkap error → notice | Sesi C | ✅ | W2b |
| W1c | Tangani rejection `measureStack` di menu radial | Sesi D | 🔄 | W1b |
| D2 | QA silang (read-only) W3: copy, a11y, T2/T3, empty state | Sesi D | ⏳ | W1c |
| W4 | Projects (list/create/overview/phases/members/extend/edit/archive dulu; tab Tasks + settings + task-filter setelah W1b) + projects store | Sesi C | 🔄 | W2c; W1b untuk tab Tasks |
| F1b | Gelembung + gesture + SnackHost di `(tabs)/_layout` | Sesi A | ✅ | F1a |
| F1c | FAB + sheet Create (`router.replace` ke target) | Sesi A | ✅ | F1b |
| F1d | Panel More (scrim, Escape a11y, Android back) | Sesi A | ✅ | F1c |
| F1e | Kaca, reduced motion, a11y (+ aksi increment/decrement, bar sembunyi saat keyboard, hide-descendants Android), QA | Sesi A | ✅ | F1d |

## 7. Pertanyaan Terbuka

- Login dari RN dengan Better Auth (token atau cookie), disepakati dengan rekan sebelum Fase 2.
- Archive (prototipe) vs Sampah 30 hari (app web).
- `bun audit`: 2 high transitif lewat `expo > @expo/cli` (node-forge ≤1.4.0 GHSA-86w9-cpqp-85rv, zod <4.6.6 GHSA-mrhx-c7xc-m3w5). Hanya di tool CLI dev, tidak masuk bundle app. Tunggu patch Expo; cek ulang tiap naik versi Expo.
- `@legendapp/motion` (dipakai actionsheet/select v5) menarik peer `nativewind` 4.2.7 + `react-native-css-interop` ke `bun.lock`/`node_modules` (tidak di `package.json`, tidak diimpor/dikonfigurasi; sama seperti init Fase 0). Diterima; buang bila gluestack melepas legendapp.
- Plugin config `@react-native-community/datetimepicker` (tema Android) belum dipasang; tidak perlu untuk Expo Go, dipasang di Fase 3 (EAS).
- **Warna tile More/Create (keputusan user):** prototipe memakai tile solid hue iOS + glyph putih (`home.css:49`), tapi kontras glyph putih di green/orange/teal ±2,2–2,6:1 (< 3:1 non-teks). Sementara memakai soft tile Atlas (lulus kontras).
- Client API: Eden (berbagi tipe dengan `server/`) atau fetch biasa.

## 8. Log

- 2026-10-25 — Dokumen dibuat; branch `feature/mobile-expo-spike`; Fase 0 dibagi ke Sesi A (`pm-dashboard-64`, toolchain) dan Sesi B (`pm-dashboard-47`, desain + layar Home).
- 2026-10-25 — User: bahasa Inggris, ikuti prototipe mobile 1:1.
- 2026-10-25 — T1+T2 selesai (Sesi A): Expo SDK 58 + gluestack v5 + UniWind; expo-doctor 20/20, `expo export` iOS+Android sukses. Sesi B mulai T6/T7.
- 2026-10-25 — B0 selesai (pemetaan token, spesifikasi Home 6 section × 3 role, inventaris data dari `riset-keano/prototype-react/src/data/sample*.js`); keputusan token/font/data dicatat di §1.
- 2026-10-25 — T3–T5 selesai (Sesi A): jest-expo 6/6 lulus, NativeTabs 5 tab, root typecheck lulus; lint root gagal karena error lama di `tahapan-proyek/` (bukan dari mobile). Commit `ac9dd4f` (pengecualian root). Sisa scaffold di-commit setelah T6, karena `global.css`/`app/_layout.tsx` sudah berisi kerja Sesi B.
- 2026-10-25 — A1 selesai: spesifikasi navigasi Fase 1 (F1a route + bar polos → F1b gelembung → F1c FAB + Create → F1d panel More → F1e kaca/a11y/QA). Fase 1 mulai setelah T8 + T9.
- 2026-10-25 — Tambah Sesi C (`pm-dashboard-01`, reviewer read-only) dan Sesi D (`pm-dashboard-83`, perencana porting layar Fase 1).
- 2026-10-25 — T10 selesai: Biome 2.5.12 (persis, sama dengan root), `mobile/biome.json`, `src/components/ui/**` dikecualikan (output CLI). Spesifikasi A1 ditulis di `docs/phase1-navigation.md`. Tes sementara merah karena mock Reanimated di `jest.setup.js` (T8 Sesi B); selama T8 Sesi B memegang jest setup dan wajib memakai setup resmi.
- 2026-10-25 — T6–T8 selesai (Sesi B): 87/87 tes, typecheck dan lint 0 error, export iOS+Android, doctor 20/20. Jest pakai `setUpTests()` resmi Reanimated + resolver gabungan (`jest.resolver.js`) + mock resmi safe-area. Commit `e6d85fd` (scaffold), `74eacd7` (tema), `0016b99` (Home), `03fc15c` (docs). Kepemilikan jest setup kembali ke Sesi A.
- 2026-10-25 — C1 selesai (Sesi C): 1 temuan sedang (kelas `font-semibold/bold` bawaan Tailwind menimpa bobot Manrope), 5 rendah, beberapa nit; semua dibagi ke Sesi A/B. Sesi C memverifikasi ulang setelah perbaikan.
- 2026-10-25 — D1 selesai (Sesi D): `docs/phase1-screens*.md` (5 berkas, 813 baris), commit `95ef6f2`. Keputusan penyimpangan dicatat di §1.
- 2026-10-25 — C2 (Sesi C): semua temuan C1 tertutup, tanpa regresi. Commit `2af2785` (config/deps Sesi A) dan `5757e60` (bobot font, palet, tailwind-merge Sesi B; termasuk 2 bug tambahan: font-family menimpa bobot, tailwind-merge 1.x membuang ukuran/warna teks). Sisa RM1: urutan pemuatan `tw-merge.ts` belum dijamin, dikerjakan Sesi A.
- 2026-10-25 — RM1 selesai (`4d53981` Sesi A, `ae3d2a1` Sesi B); C3 (Sesi C): bersih, 95/95, tanpa regresi. **Fase 0 tertutup secara kode**; tinggal T9 (cek di HP oleh user).
- 2026-10-25 — T9 selesai: user sudah cek di HP lewat Expo Go. **Fase 1 mulai**: F1a (Sesi A), G0a→G0b→G0c (Sesi B), W1a Tasks data (Sesi D), W2a Events data (Sesi C). Konteks keempat sesi di-clear user, jadi brief ditulis mandiri.
- 2026-10-25 — G0a (`8991fea`) dan G0b selesai (Sesi B): 13 komponen gluestack + `@legendapp/motion`, `expo-clipboard`, datetimepicker 9.2.1; doctor 20/20, audit tanpa temuan baru, berkas vendored lama tanpa diff. Overlay portal ada di belakang formSheet/modal native iOS, jadi kit memakai `useRNModal`; perlu QA di HP. `sample/archive.ts` pindah dari W3 ke W0.
- 2026-10-25 — F1a selesai (Sesi A, `5ec4098`): `expo-router/js-tabs` + bar polos, pohon route + presentasi semua route (`src/navigation/stack-presentation.ts`), `useTabBarInset`; 284/284. W2a selesai (Sesi C), commit menunggu W1a karena `events.store` mengimpor `tasks.store`. Draft tugas rapat tanpa due: ikut prototipe (Create diblokir sampai semua due terisi).
- 2026-10-25 — W1a (Sesi D, `b0f2809`, 80 tes) dan W2a + lanjutan (Sesi C, `731e7b0`, 47 tes; `events.form.ts`, `forgetArchivedEvent`) di-commit. Kontrak Delete forever untuk W3: `forget<Archived X>(key)` lalu `removeEntry(key)`. Rename/Merge/Delete di Settings tugas tetap notice (ikut prototipe); dialog T2 di Fase 2.
- 2026-10-25 — G0c selesai (Sesi B, `9cf7f32`, 406/406): kit §4 + peran tema snack. Catatan untuk worker: beri nama input gluestack dengan `aria-label` (Input/Textarea/RadioGroup menimpa `accessibilityLabel`). `forgetArchivedTask` (`dda1ee4`); nomor tugas baru tidak pernah dipakai ulang. W1b (D) dan W2b (C) mulai; Sesi B mengerjakan G0d lalu W3.
- 2026-10-25 — F1b selesai (Sesi A, `1e87802`, 432 tes): gelembung via pan RNGH, reduced motion = slide 120 ms; navigasi tombol panah prototipe → aksi a11y di F1e. G0d selesai (Sesi B, `27645d4`, 436 tes): `ConfirmDialog` deklaratif (T2/T3, loading + error), `toUtc` diekspor, `StackedScreen` `pinnedShrink`. Archive Delete forever = T3 di dalam formSheet itu sendiri (bukan dialog di atas sheet, agar tidak konfirmasi ganda).
- 2026-10-25 — F1c (`c84ae33`) dan F1d (`939f351`) selesai (Sesi A): FAB + sheet Create, panel More; 190 tes navigasi. Typed routes (`.expo/types`) hanya dibuat ulang oleh `expo start`; tiap sesi regenerate di port sendiri (A 8194, B 8193, C 8191, D 8192), bukan 8081.
- 2026-10-25 — W2b selesai (Sesi C, `ff8f10f`, 46 berkas): semua layar + route Events; route yang belum ada lewat `routeHref()` Sesi A. Cek HP dicatat: notice dari dalam modal/formSheet iOS, `dismissTo` setelah Create tasks, tinggi formSheet + keyboard Reason/Agenda, VoiceOver sel kalender. W4 Projects diberikan ke Sesi C.
- 2026-10-25 — F1e selesai (Sesi A, `62c7142`, 202 tes navigasi): GlassView iOS 26 (fallback `bg-card/60`, solid saat Reduce Transparency), bar sembunyi saat keyboard, aksi screen reader "Next tab"/"Previous tab" (pengganti tombol panah; increment/decrement butuh elemen adjustable), hide-descendants Android. **Navigasi Fase 1 selesai**; QA perangkat dikumpulkan untuk user. H1 dipindah dari Sesi B ke Sesi A.
- 2026-10-25 — W2c (`6fdf99d`): akar masalahnya, Undo memulihkan *langkah arsip terbaru* untuk id event, jadi setelah Delete forever, Undo bisa diam-diam memulihkan kemunculan lama. Sekarang Undo terikat ke key entrinya (`canRestoreEvent(id, key)`); kalau entri sudah hilang → notice "This event was deleted forever and can't be restored." Tes router kadang gagal acak saat mesin berat (4 sesi jest paralel); diagnosis diserahkan ke Sesi A.
- 2026-10-25 — W3 selesai (Sesi B, `11d1876`, 90 berkas, 87 tes baru): route `more/*`, `(auth)`, `/leave`, `/profile(/calendar)`; T2 dialog Users, T3 Delete forever di sheet, sign out T2. Copy karangan untuk keadaan yang tidak ada di prototipe (orang/entri tidak ditemukan, gagal hapus, dialog Users). Kit: `Field readOnly` (gluestack menyembunyikan input disabled dari screen reader), `CountChips`, `PersonAvatar`, `DetailPage`, helper `router-mock`.
- 2026-10-25 — W3b (Sesi B): copy Events cocok dengan prototipe; 8 celah a11y/kit dan 3 edge case bawaan prototipe. Penyimpangan disengaja: jamak "1 task"; "Outcomes confirmed" bila 0 tugas; empty state + Reset di view Calendar (UX §4 mengalahkan prototipe).
- 2026-10-25 — W1b selesai (Sesi D, `2a143b8`, 61 berkas, 117 tes): list/filter/board/detail/sheet/edit/form/write/CSV/settings. Menu radial dirender lewat gluestack `Portal` (tanpa RN Modal, supaya sentuhan yang ditahan tidak batal); keputusan lepas-jari dipindah ke ref JS (shared value tidak terbaca konsisten setelah re-render). Ekspor W4 siap di `src/screens/tasks/index.ts`.
