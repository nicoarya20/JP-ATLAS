# Fase 1 — Tab Bar & Navigasi Mobile

Spesifikasi porting tab bar dan navigasi prototipe ke React Native (Expo SDK 58). Ditulis Sesi A (A1) pada 2026-10-25, disetujui orchestrator `pm-dashboard-0d`. Kontrak umum ada di [`../reacttransition.md`](../reacttransition.md); dokumen ini hanya menyangkut tab bar, panel More, tombol "+", sheet Create, dan pohon route.

**Aturan dasar dari user: ikuti prototipe mobile 1:1.** Sumber kebenaran perilaku adalah `riset-keano/prototype-react/` beserta tesnya. Bila dokumen ini dan prototipe berbeda, prototipe yang benar; perbaiki dokumen ini.

## 1. Keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-25 | Tab bar **custom** lewat prop `tabBar` pada JS `Tabs` dari `expo-router` | NativeTabs tidak bisa membuat tombol "+" di samping pil, tidak bisa mencegat tap More, dan mengabaikan warna di iOS 26 (lihat §3) |
| 2026-10-25 | **Jangan** pakai `expo-router/ui` (headless tabs) | Docs Expo menandainya *experimental*; JS Tabs (React Navigation bottom-tabs yang di-vendor expo-router) stabil |
| 2026-10-25 | NativeTabs ditinggalkan di Fase 1 | Konsekuensi aturan 1:1 di atas |
| 2026-10-25 | **Tanpa** `expo-haptics` | Prototipe tidak punya haptic |
| 2026-10-25 | Sheet Create milik Sesi A, di `src/screens/create/` (bukan `src/screens/home/**`) | Menghindari bentrok dengan wilayah Sesi B |
| 2026-10-25 | Urutan kerja F1a → F1e (§6) | Fungsional dulu, lalu animasi, lalu kaca dan aksesibilitas |

Status: Fase 1 **belum mulai**. Menunggu Home (T8) selesai dan dicek user di HP (T9).

## 2. Perilaku prototipe yang diport

Sumber: `src/kit/tabbar.jsx`, `src/kit/tabbar.css`, `src/kit/layout.jsx`, `src/core/PhoneApp.jsx`, `src/styles/app.css`, `src/styles/library.shell.css`, `src/styles/tokens.css`, `src/screens/home/home.more.jsx`, `src/screens/home/home.css`, `src/screens/home/home.create.jsx`, dan tes `src/test/tabbar.test.jsx`, `tabbar.bubble.test.jsx`, `tabbar.more.test.jsx`, `home.create.test.jsx` (semua di `riset-keano/prototype-react/`).

### 2.1 Tab

| id | Label (untuk screen reader) | Root | Ikon lucide (22 px) |
|---|---|---|---|
| `home` | Home | `home.main` | `House` |
| `tasks` | Tasks | `tasks.my` | `CircleCheck` |
| `projects` | Projects | `projects.list` | `FolderKanban` |
| `events` | Events | `events.list` | `CalendarDays` |
| `more` | More | — (membuka panel) | `Ellipsis` |

- Hanya ikon yang tampil; label tetap ada untuk aksesibilitas.
- Warna ikon: tab aktif = accent (violet `atlas`), lainnya = warna label. Transisi warna 200 ms ease.
- Bar dipasang **sekali** dan bertahan lintas layar (di prototipe di-host oleh `PhoneApp`), sehingga gelembung meluncur antar-tab dan bar tidak muncul ulang.
- Pindah tab me-reset riwayat tab itu (`go(root, { replace: true })`).

### 2.2 Pil kaca

- Floating: `left`/`right`/`bottom` = 16 (`--sp-4`), berjajar dengan FAB, gap 10, rata bawah (pil tumbuh ke atas menjadi panel).
- Tinggi 58, padding 4, radius penuh. Grid 5 kolom sama lebar.
- Ruang yang disisakan untuk konten di atas bar: `--tab-bar-space: 76px`, ditambah 16 (`--sp-4`) padding bawah konten.
- Kaca (`tokens.css`, mode terang):
  - `--glass-bar` = `--atlas-surface` 60% (pil dan FAB)
  - `--glass-bar-edge` = putih 0.7, garis 0.5 px
  - `--glass-bar-shine` = putih 0.8, highlight inset 1 px di atas
  - `--glass-bar-active` = `--atlas-control` 16% (gelembung)
  - `--glass-bar-shadow` = `--atlas-shadow`
  - `--glass-bar-open` = `--atlas-surface` 88% (saat panel terbuka di atas dim)
  - Blur 24 px, saturate 180%
- Mode gelap: edge putih 0.12, shine putih 0.1, open = surface 60% (sama dengan saat tertutup).
- Token RN untuk nilai di atas dipetakan di `src/theme/**` (wilayah Sesi B). Komponen tab bar hanya memakai nama token, tanpa hex.

### 2.3 Gelembung (penanda tab aktif)

Gelembung = satu tab lebarnya, inset 4 dari tepi pil, radius penuh, warna `--glass-bar-active` dengan shine inset. Posisinya = indeks tab (pecahan saat diseret).

| Keadaan | Gerak | Durasi / easing |
|---|---|---|
| Tap atau ganti tab dari mana pun (termasuk link di layar) | Translate ke tab baru | 420 ms, spring `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| — sekaligus | Jelly: scale (x, y) `1.16,1.12` → 30% `1.22,0.86` → 55% `0.92,1.08` → 75% `1.04,0.97` → `1,1` | 600 ms ease-out |
| — ikon aktif | Pop: scale `0.85` → 60% `1.12` → `1` | 480 ms, spring yang sama |
| Jari turun (`is-held`) | Gelembung melompat ke bawah jari, terangkat: scale `1.16, 1.12`, bayangan `--glass-bar-shadow`; ikon aktif scale `1.12` | translate 240 ms spring, scale 260 ms spring, shadow 220 ms ease |
| Diseret (`is-dragging`) | Mengikuti jari | translate 90 ms ease-out |
| Lepas | Ke tab terdekat (`Math.round(pos)`), lalu jelly | seperti baris pertama |
| Lepas di tab yang sama | Tanpa navigasi, jelly di tempat (`onReselect`) | 600 ms |
| Cancel (pointercancel) | Kembali ke tab aktif | — |

- Posisi di-clamp `[0, n − 1]`. Rumus prototipe: `pos = clamp((x − left − PAD) / ((width − 2·PAD) / n) − 0.5, 0, n − 1)` dengan `PAD = 4`.
- Ikon yang menyala saat ditahan = `round(pos)`.
- Pantulan baru saat pantulan lama berjalan me-restart animasi (prototipe bergantian antara dua keyframe identik).
- Tidak ada pantulan pada mount pertama.
- Bar tersembunyi di layar tanpa tab (§2.6).
- Panah kiri/kanan berpindah tab (web). Padanan RN: aksi aksesibilitas (§4.3).

### 2.4 Tombol "+" (FAB)

- Bulat 60 × 60, material kaca sama dengan pil. Ikon `Plus` 26 px. Saat ditekan scale 0.94 (220 ms ease).
- Target per tab (`createFor(tab, role)` di `kit/layout.jsx`):

| Tab | Target | Label aksesibilitas |
|---|---|---|
| Tasks | `tasks.write` | New task |
| Projects | `projects.new` | New project |
| Events | `events.new` | New event |
| Home, More | sheet `home.create` | Create |

- Bila role tidak boleh membuka target (Member di Projects), `createFor` = `null`:
  - FAB terlipat: width 0, margin-left −10 (membatalkan gap), opacity 0, scale 0.6. Width/margin 380 ms `cubic-bezier(0.32, 0.72, 0, 1)`, opacity 160 ms, scale 260 ms.
  - Pil melebar mengisi ruang.
  - FAB tetap ter-mount (aria-hidden + inert) supaya bisa terlipat dan terbuka kembali, bukan muncul/hilang mendadak.
  - Saat terbuka lagi: opacity 220 ms dengan delay 120 ms, width/margin/scale 380 ms dengan easing yang sama.
- Menekan FAB menutup panel More dulu, lalu navigasi.

### 2.5 Panel More

- Menekan More **tidak** menavigasi. Pil tumbuh ke atas menjadi kartu berisi panel; radius shell 29.
- Animasi buka:
  - Tinggi 0 → tinggi konten, 480 ms `cubic-bezier(0.32, 0.72, 0, 1)`.
  - Swell sekali pada shell: scale `1,1` → 35% `1.03,0.98` → 65% `0.99,1.01` → `1,1`, 560 ms spring `cubic-bezier(0.34, 1.56, 0.64, 1)`, origin tengah bawah.
  - Anak panel (`tb-rise`, urutan `--i`) muncul berurutan dengan delay `90 + i × 28` ms: opacity 0 → 1 (240 ms ease), translateY 14 → 0 dan scale 0.88 → 1 (460 ms spring).
- Animasi tutup: tinggi 300 ms `cubic-bezier(0.4, 0, 0.2, 1)`, tanpa swell. Anak: opacity 120 ms, translate/scale 160 ms ease.
- Scrim di belakang: `--overlay` (`--atlas-veil`; gelap: hitam 0.6), blur 4 px, opacity 280 ms ease. Tap scrim = tutup.
- Selama panel terbuka, gelembung pindah ke More (`activeId = more`) dan pil/FAB memakai `--glass-bar-open`.
- Panel terlipat oleh: More lagi, tap scrim, Escape, tab lain (lipat lalu pindah ke tab itu), navigasi apa pun, atau memilih item. Bila tab di bawahnya dipilih lagi, panel hanya terlipat.
- Isi (`home.more.jsx`, `home.css`):
  - Kartu profil (`tb-rise`, `--i: 0`): avatar, nama lengkap, `title · division` (+ `· Admin` untuk Admin), chevron. Label aksesibilitas: `"<nama>, open profile"`. Membuka overlay `profile.me`. Radius 18, scale 0.98 saat ditekan.
  - Grid 3 kolom (gap 12/8) berisi ubin 58 × 58, radius 18, ikon 24 putih di kedua skema, scale 0.9 saat ditekan:
    - Inbox (biru, badge = jumlah `inbox.respond`) → `inbox.respond`
    - Team (hijau) → `team.list`
    - Users (oranye, **khusus Admin**, badge = `users.counts.pending`) → `users.approve`
    - Archive (teal) → `archive.list`
    - Settings (abu) → `settings.main`
  - Badge: min 20 × 20, radius penuh, `--danger-fill` dengan teks `--on-accent`, ring 2 px warna surface. Label aksesibilitas ubin berbadge: `"<label>, <n> new"`.
- Pemilihan item: `close()` dulu, lalu `go(id)`.

### 2.6 Layar yang menampilkan tab bar

Bar tampil di layar yang memakai prop `tab`:

| Layar | `tab` |
|---|---|
| `home.main` | home |
| `tasks.my` (tasks.list) | tasks |
| `projects.list`, `projects.detail` | projects |
| `events.list` | events |
| `inbox.respond` (inbox.parts), `team.list`, `team.person`, `archive.list`, `users.*` (users.parts) | more |

Layar lain (detail tugas, form, flow modal) tidak menampilkan bar. Jadi tiap tab punya stack bersarang, dan sebagian layar detail tetap memperlihatkan bar.

### 2.7 Sheet Create

- Bentuk: overlay setinggi konten (`FullSheet fit`), bukan bottom sheet pustaka. Ditutup lewat X kiri atas, swipe-down, tap dim, atau Escape.
- Judul "Create", sub "What do you want to add?".
- Baris (`home.create.jsx`). Baris yang tidak boleh dibuka role disembunyikan:

| Target | Judul | Sub |
|---|---|---|
| `tasks.write` | Task | Just write it or fill a form |
| `projects.new` | Project | From a story, a template or a form |
| `events.new` | Event | Meeting, review or team event |
| `tasks.csv` | Import tasks | Add many tasks from a CSV file |
| `settings.leave` | `LEAVE[role].title` | Days you will be away |

- Ikon baris 18 px dalam ubin bernada (blue, green, orange, gray, gray). Member tidak melihat Project.
- Memilih baris menutup sheet, lalu membuka target.

### 2.8 Reduced motion (`prefers-reduced-motion`)

- Tanpa swell, jelly, dan pop.
- Gelembung: translate 120 ms ease, scale tetap 1.
- Anak panel: hanya opacity 120 ms, tanpa translate/scale.
- FAB: hanya opacity 120 ms, scale tetap 1.

## 3. Kenapa bukan NativeTabs

Diverifikasi di docs Expo dan types SDK 58 terpasang (`expo-router` 58.0.26):

- Tampilan "constrained to the native platform behavior": kustomisasi per item hanya Icon/Label/Badge. Di iOS 26, Liquid Glass mengabaikan `backgroundColor`, `blurEffect`, `shadowColor`, dan `disableTransparentOnScrollEdge`, sehingga token JP Atlas tidak bisa diterapkan ke bar.
- Tap tab tidak bisa dicegat untuk membuka panel. `disabled` (SDK 56+) hanya membatalkan pindah tab, tanpa callback.
- Tidak ada slot tombol di samping pil:
  - `BottomAccessory` muncul **di atas** bar.
  - `role="search"` adalah tab pencarian sistem yang hanya tampil terpisah di iOS 26.
- Tinggi bar tidak bisa diukur. Semua layar dirender eager. FlatList tidak mendukung minimize/scroll-to-top. Android maksimal 5 tab.

**Yang hilang dengan bar custom (diterima):** bar sistem iOS 26 asli (lensa seret native, minimize-on-scroll, Large Content Viewer, aksesibilitas otomatis) dan Material bottom nav di Android. **Yang didapat:** desain prototipe persis, perilaku sama di iOS dan Android, dan token JP Atlas.

## 4. Desain implementasi RN

### 4.1 Navigator

- `app/(tabs)/_layout.tsx`: `<Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, popToTopOnBlur: true }}>`.
  - `Tabs` dari `expo-router` (React Navigation bottom-tabs yang di-vendor di `expo-router/build/react-navigation/bottom-tabs`).
  - `popToTopOnBlur` = padanan reset riwayat saat pindah tab.
- More: `listeners={{ tabPress: (e) => { e.preventDefault(); openMore(); } }}`. Event `tabPress` punya `canPreventDefault: true`.
- Bar custom di-render sekali oleh navigator di atas semua layar, sama dengan host di `PhoneApp`, sehingga gelembung bisa meluncur.
- Visibilitas bar: fungsi murni `tabBarVisibleFor(segments)` dengan allowlist dari §2.6. Bar membaca `useSegments()`/`usePathname()`. Jangan menyebar `setOptions` ke parent dari tiap layar.
- Ruang konten: hook `useTabBarInset()` = 76 + safe-area bawah (padanan `--tab-bar-space`), dipakai layar ber-tab untuk padding bawah scroll.
- Keyboard terbuka → bar disembunyikan (listener `Keyboard`; `tabBarHideOnKeyboard` hanya berlaku untuk bar default).

### 4.2 Gesture dan animasi

- **Gesture Handler 3.3** memakai API hook: `usePanGesture` dengan callback `onBegin`/`onUpdate`/`onFinalize`/`onTouchesDown` serta opsi `minDistance` dan `shouldCancelWhenOutside`.
  - Satu pan dengan `minDistance: 0` di atas pil: begin = lompat ke jari (held), update = ikuti (dragging), finalize = pilih `round(pos)`.
  - Tap memakai jalur yang sama, seperti prototipe (pointerdown/up).
- **Reanimated 4.7.1 + Worklets 0.13.0:**
  - Posisi, held, dan bounce disimpan sebagai shared value di UI thread.
  - JS hanya dipanggil saat lepas, lewat `scheduleOnRN` (react-native-worklets), untuk navigasi/emit `tabPress`.
  - Keyframe CSS diganti `withSequence` + `withTiming(…, { easing: Easing.bezier(…) })`/`withSpring`. Alternatifnya, animasi CSS Reanimated 4 (`cubicBezier`, keyframes) agar §2.3–2.5 tersalin hampir 1:1.
  - Restart pantulan: batalkan dengan `cancelAnimation` lalu mulai ulang dari keyframe pertama.
- Reduced motion: `useReducedMotion()` (Reanimated) memilih varian §2.8.
- Konstanta durasi dan easing dikumpulkan di `tab-bar.motion.ts`. Nilainya dari §2, jangan diketik ulang di komponen.

### 4.3 Kaca

- iOS 26+: `GlassView` dari `expo-glass-effect` (ada di Expo Go) untuk pil dan FAB. `GlassContainer` dengan `spacing` opsional agar pil dan FAB menyatu seperti iOS 26.
- `colorScheme` mengikuti mode `GluestackUIProvider`.
- Selain iOS 26, `GlassView` otomatis jatuh ke `View` biasa. Isi dengan permukaan token semi-opaque (`--glass-bar`). `expo-blur` tidak dipasang karena blur di Android mahal.
- `AccessibilityInfo.isReduceTransparencyEnabled()` → permukaan solid.
- Caveat docs: jangan menurunkan opacity `GlassView` atau parent-nya di bawah 1. Untuk melipat FAB, animasikan opacity wrapper, lalu set `glassEffectStyle: 'none'` saat mendekati 0 (pola resmi docs).
- Cek `isGlassEffectAPIAvailable()` sebelum merender kaca, karena beberapa beta iOS 26 tidak punya API-nya (issue expo#40911).
- Gelembung = `Animated.View` berisi tint token, bukan `GlassView`, supaya ringan.

### 4.4 Aksesibilitas

- Pil: `accessibilityRole="tablist"`, label "App navigation".
- Item: `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, `accessibilityLabel` = label tab.
- Aktivasi screen reader (double-tap) harus memanggil pemilihan tab yang sama. Sediakan `onAccessibilityTap`/onPress cadangan pada item, karena pan saja tidak menjamin aktivasi VoiceOver/TalkBack.
- Padanan panah kiri/kanan: `accessibilityActions` `increment`/`decrement` pada tablist.
- Panel More:
  - `accessibilityViewIsModal` (iOS) dan `importantForAccessibility="no-hide-descendants"` pada konten di belakang (Android).
  - Padanan Escape: `onAccessibilityEscape` (Z dua jari di iOS) dan `BackHandler` (tombol kembali Android).
  - Fokus aksesibilitas pindah ke kartu profil saat panel terbuka (`AccessibilityInfo.setAccessibilityFocus`).
- Scrim: Pressable berlabel "Close More".
- FAB terlipat: `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` (padanan `aria-hidden` + `inert`).
- Large Content Viewer tidak tersedia di bar custom. Ini konsekuensi yang diterima.
- **Wajib diuji di perangkat dengan VoiceOver dan TalkBack** (F1e).

### 4.5 Sheet dan modal

- Create = route root `app/create.tsx`: `presentation: 'formSheet'`, `sheetAllowedDetents: 'fitToContents'`, `sheetGrabberVisible: true`, `sheetCornerRadius: 16` (radius modal JP Atlas `lg`). Props `react-native-screens` 4.30, sudah dicek di types. Swipe-down, tap dim, dan escape aksesibilitas didapat secara native; tombol X kiri atas tetap dibuat sendiri.
- `tasks.write`, `projects.new`, `events.new` = `presentation: 'modal'` dengan chevron bawah berlabel "Cancel" (BRIEF.md: layar modal).
- Back = chevron saja: `headerBackButtonDisplayMode: 'minimal'`, atau header sendiri.
- `profile.me` = overlay setinggi penuh (formSheet `sheetAllowedDetents: [1]` atau modal). Diputuskan saat modul profile diport.

## 5. Dependency

Semua yang wajib **sudah terpasang** dan cocok dengan SDK 58 (`bundledNativeModules.json` sdk-58):

| Paket | Versi | Dipakai untuk |
|---|---|---|
| `react-native-reanimated` | 4.7.1 | Gelembung, panel, FAB |
| `react-native-worklets` | 0.13.0 | `scheduleOnRN` |
| `react-native-gesture-handler` | 3.3.0 | Seret gelembung; `jest-utils` untuk tes |
| `expo-glass-effect` | 58.0.5 | Kaca iOS 26 |
| `react-native-screens` | 4.30.0 | formSheet/modal |
| `react-native-svg` | 15.16.0 | Ikon lucide |
| `lucide-react-native` | (dipasang Sesi B) | Ikon tab, sama dengan prototipe |

Tidak dipakai: `expo-haptics` (keputusan §1), `expo-blur`, `@gorhom/bottom-sheet` (diganti formSheet native), `expo-router/ui`.

## 6. Pembagian file dan urutan kerja

### 6.1 Route (tipis, hanya merender layar)

```
app/
  _layout.tsx               Stack root: (tabs), create (formSheet), tasks/new, projects/new, events/new (modal), profile
  create.tsx                → src/screens/create/create.screen.tsx
  (tabs)/_layout.tsx        Tabs + GlassTabBar + listener More
  (tabs)/(home)/_layout.tsx Stack; index
  (tabs)/tasks/_layout.tsx  Stack; index, [id]
  (tabs)/projects/_layout.tsx Stack; index, [id]
  (tabs)/events/_layout.tsx Stack; index, [id]
  (tabs)/more/_layout.tsx   Stack; index (Redirect ke "/"), inbox, team, team/[id], archive, users, settings
```

Ini memindahkan route T5 (`app/(tabs)/index.tsx` dan teman-temannya) ke folder. Layar di `src/screens/*` tidak pindah.

### 6.2 Logika murni (`src/navigation/`, tanpa React)

| Berkas | Isi |
|---|---|
| `tabs.config.ts` | `TABS` {id, label, href, Icon}, `MORE_ID` |
| `tab-create.ts` | `CREATE`, `CREATE_MENU`, `createFor(tab, role)` (port 1:1 dari `kit/layout.jsx`) |
| `tab-bar.visibility.ts` | `tabBarVisibleFor(segments)` dengan allowlist §2.6 |
| `bubble.math.ts` | `posAt(x, width, n, pad)`, `nearest(pos)`; fungsi `'worklet'`, clamp sama dengan prototipe |

### 6.3 Komponen (`src/components/tab-bar/`, masing-masing ≤ 150 baris)

| Berkas | Isi |
|---|---|
| `glass-tab-bar.tsx` | Komposisi; menerima `BottomTabBarProps` |
| `glass-pill.tsx` | Item tab + gesture |
| `tab-bubble.tsx` | Gelembung (held, dragging, jelly) |
| `create-fab.tsx` | FAB + lipat |
| `tab-panel.tsx` | Lipat, swell, stagger |
| `tab-scrim.tsx` | Dim + tap tutup |
| `glass-surface.tsx` | `GlassView` atau token; peka reduce-transparency |
| `tab-bar.motion.ts` | Konstanta durasi/easing §2 + varian reduced motion |

### 6.4 Layar

- `src/screens/more/more-panel.tsx` + `more.tiles.ts`: isi panel, role-gated.
- `src/screens/create/create.screen.tsx` + `create.options.ts`: sheet Create (Sesi A).

### 6.5 Tes (jest-expo + React Native Testing Library)

- **Unit:**
  - `bubble.math`: clamp di tepi, nearest, posisi pecahan.
  - `tab-create`: Member di Projects = `null`; Home dan More = Create.
  - `tab-bar.visibility`.
- **Komponen** (`renderRouter` dari `expo-router/testing-library`):
  - Port `tabbar.test.jsx`: semua tab bernama dengan selected yang benar; tap berpindah route; label "+" per tab; FAB terlipat untuk Member di Projects dan kembali di Tasks.
  - Port `tabbar.bubble.test.jsx` dengan `fireGestureHandler`/`getByGestureTestId` dari `react-native-gesture-handler/jest-utils` (mendukung gesture v3):
    - seret dari tab 0 ke x tab 3 lalu lepas = pathname `/events`;
    - seret melewati tepi = clamp;
    - tap tab aktif = tanpa navigasi, tetap memantul.
    - Waktu animasi diatur dengan `withReanimatedTimer`/`advanceAnimationByTime` (Reanimated).
  - Port `tabbar.more.test.jsx`:
    - panel terbuka tanpa mengubah pathname;
    - terlipat lewat More, scrim, `BackHandler`, dan `onAccessibilityEscape`;
    - memilih tujuan = lipat lalu navigasi; tab lain = lipat lalu pindah;
    - Users hanya untuk Admin, beserta badge.
  - Port `home.create.test.jsx` (ke `create`): X menutup; memilih baris membuka target; Member tanpa Project.
- **Setup jest (wilayah Sesi A):** tambahkan `react-native-gesture-handler/jestSetup.js` dan `setUpTests()` Reanimated ke `setupFiles`.
- `__tests__/tabs.test.tsx` (T5) menguji host NativeTabs (`RNSTabsHostIOS`), jadi harus ditulis ulang bersama pergantian ke JS Tabs (F1a).

### 6.6 Urutan

| Tahap | Isi | Selesai bila |
|---|---|---|
| F1a | Pohon route §6.1, JS Tabs + bar polos (ikon, selected, tap), modul murni §6.2, tes unit, tes T5 ditulis ulang | Fungsional tanpa animasi; tes lulus |
| F1b | Gelembung + gesture + tes bubble | Seret/tap/reselect sesuai §2.3 di tes |
| F1c | FAB + sheet Create + tes | §2.4 dan §2.7 di tes |
| F1d | Panel More + tes | §2.5 di tes |
| F1e | Kaca §4.3, reduced motion, aksesibilitas §4.4; QA di Expo Go pada iOS 26 dan Android, termasuk VoiceOver/TalkBack | Dicek user di HP |

## 7. Sumber

- docs.expo.dev/router/advanced/native-tabs — batasan NativeTabs; import `expo-router/native-tabs` mulai SDK 58.
- docs.expo.dev/router/advanced/custom-tabs — `expo-router/ui` berlabel *experimental*.
- docs.expo.dev/versions/v58.0.0/sdk/glass-effect — `GlassView`, `GlassContainer`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`, caveat opacity, reduce transparency.
- `expo/expo` branch `sdk-58`, `packages/expo/bundledNativeModules.json` — versi paket SDK 58.
- Types terpasang di `mobile/node_modules`:
  - `expo-router` 58.0.26: `build/native-tabs/*`, `build/react-navigation/bottom-tabs/types.d.ts` (`tabBar`, `tabPress` canPreventDefault, `popToTopOnBlur`), `build/ui/*`
  - `react-native-gesture-handler` 3.3.0: `lib/typescript/v3` (hooks), `jestUtils`
  - `react-native-reanimated` 4.7.1: `useReducedMotion`, `setUpTests`, `withReanimatedTimer`, CSS `cubicBezier`
  - `react-native-worklets` 0.13.0: `scheduleOnRN`
  - `react-native-screens` 4.30.0: `sheetAllowedDetents: 'fitToContents'`, `sheetCornerRadius`, `sheetGrabberVisible`
- Prototipe: berkas yang disebut di awal §2.
